import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { logger } from "../utils/logger.js";
import { availableLanguages as allLanguagesList } from "../utils/languages.js";
import { validateAndFixConfig } from "../utils/config.js";
import { fileManager } from "./file-manager.js";

/**
 * translator.js — AI Translation Engine
 *
 * Sends JSON content to a Cloudflare Workers AI proxy for translation.
 * Supports two workflows:
 *   1. translateFiles  — Full translation: creates new language files from scratch.
 *   2. updateLanguageFiles — Differential update: only re-translates keys that
 *      changed since the last run (tracked via .tradux-state.json).
 *
 * The differential system works by:
 *   - Saving a snapshot of the source file after each operation (.tradux-state.json)
 *   - On update, comparing the current source against that snapshot
 *   - Only sending changed/new keys to the API, then merging the result
 *   - Also removing keys from target files that no longer exist in the source
 */

const WORKER_URL =
  "https://worker-proxy.seth-eb4.workers.dev/api/translate-json";

// --- State Persistence ---
// .tradux-state.json stores a copy of the source file from the last translation.
// This lets the update command detect what changed since then.

async function loadState(i18nAbsolutePath) {
  const statePath = path.join(i18nAbsolutePath, ".tradux-state.json");
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(await fs.readFile(statePath, "utf8"));
    } catch (e) {}
  }
  return { sourceCache: {} };
}

async function saveState(i18nAbsolutePath, sourceData) {
  const statePath = path.join(i18nAbsolutePath, ".tradux-state.json");
  await fs.writeFile(
    statePath,
    JSON.stringify({ sourceCache: sourceData }, null, 2),
  );
}

/**
 * Reads .env file and loads CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
 * into process.env. Falls back to "mock" values which the worker proxy
 * accepts for the free tier.
 */
async function loadCredentials() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) return;
      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex === -1) return;
      const key = trimmedLine.substring(0, separatorIndex).trim();
      let value = trimmedLine.substring(separatorIndex + 1).trim();
      value = value.replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }

  const apiToken = process.env.CLOUDFLARE_API_TOKEN || "mock";
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "mock";
  return { apiToken, accountId };
}

/** Splits a comma-separated language string into a clean array. */
function parseLanguages(languages) {
  return languages
    .split(",")
    .map((lang) => lang.trim())
    .filter(Boolean);
}

/** Loads the default language JSON file (the "source of truth" for translations). */
async function loadSourceFile(config) {
  const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
  const sourcePath = path.join(
    i18nAbsolutePath,
    `${config.defaultLanguage}.json`,
  );
  if (!fileManager.exists(sourcePath)) {
    logger.error(`Source file not found: ${sourcePath}`);
    process.exit(1);
  }
  return await fileManager.loadLanguageFile(
    i18nAbsolutePath,
    config.defaultLanguage,
  );
}

// --- Full Translation Flow ---

/**
 * Translates the source file into each requested language.
 * Skips languages that already have a file (use -u to update those).
 * After completion, saves state and re-syncs the config.
 */
export async function translateFiles(languages, config) {
  const credentials = await loadCredentials();
  try {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const languagesArray = parseLanguages(languages);
    const uniqueLanguages = [...new Set(languagesArray)];

    const sourceFile = await loadSourceFile(config);
    let filesCreated = false;

    for (const lang of uniqueLanguages) {
      const isValid = allLanguagesList.some((l) => l.value === lang);
      if (!isValid) {
        logger.error(
          `\nThe language code "${lang}" doesn't exist in Tradux. Skipping...`,
        );
        continue;
      }

      const created = await translateLanguage(
        lang,
        sourceFile,
        config,
        credentials,
      );
      if (created) filesCreated = true;
    }

    await saveState(i18nAbsolutePath, sourceFile);
    if (filesCreated) await validateAndFixConfig(process.cwd(), true);

    if (filesCreated)
      logger.success("\n \u2606 Translation process completed \u2606");
  } catch (error) {
    logger.error(`Translation failed: ${error.message}`);
    process.exit(1);
  }
}

/** Sends the full source JSON to the worker proxy and writes the translated result. */
async function translateLanguage(lang, sourceData, config, credentials) {
  const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
  const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

  if (fileManager.exists(targetFile)) {
    logger.warn(`Skipping existing translation: ${lang}`);
    return false;
  }

  try {
    logger.info(`\nTranslating ${lang}...`);
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: sourceData,
        targetLanguage: lang,
        ...credentials,
      }),
    });

    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const result = await response.json();

    await fs.writeFile(
      targetFile,
      JSON.stringify(result.translatedData, null, 2),
    );
    logger.success(`\nTranslated ${lang}`);
    return true;
  } catch (error) {
    logger.error(`Failed to translate ${lang}: ${error.message}`);
    return false;
  }
}

// --- Differential Update Flow ---

/**
 * Updates existing translations by only re-translating changed/new keys.
 * If a target language file doesn't exist, offers to create it from scratch.
 * After completion, saves state and re-syncs the config.
 */
export async function updateLanguageFiles(languages, config) {
  const credentials = await loadCredentials();
  try {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const languagesArray = parseLanguages(languages);
    const uniqueLanguages = [...new Set(languagesArray)];

    logger.info(`\nStarting update process for: ${uniqueLanguages.join(", ")}`);
    const sourceFile = await loadSourceFile(config);
    const state = await loadState(i18nAbsolutePath);
    let filesCreatedOrUpdated = false;

    for (const lang of uniqueLanguages) {
      if (lang === config.defaultLanguage) continue;

      const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

      // Language file doesn't exist yet — offer to create it
      if (!fileManager.exists(targetFile)) {
        const isValid = allLanguagesList.some((l) => l.value === lang);
        if (!isValid) {
          logger.error(`The language code "${lang}" doesn't exist in Tradux.`);
          continue;
        }

        logger.warn(`\nYou don't have "${lang}" translated yet.`);
        logger.info(`The -u command is for updating existing languages.`);
        const response = await prompts({
          type: "confirm",
          name: "translate",
          message: `Do you want to translate your content to ${lang} now?`,
        });

        if (response.translate) {
          const created = await translateLanguage(
            lang,
            sourceFile,
            config,
            credentials,
          );
          if (created) filesCreatedOrUpdated = true;
        }
        continue;
      }

      const updated = await updateLanguage(
        lang,
        sourceFile,
        config,
        credentials,
        state,
      );
      if (updated) filesCreatedOrUpdated = true;
    }

    await saveState(i18nAbsolutePath, sourceFile);
    if (filesCreatedOrUpdated) await validateAndFixConfig(process.cwd(), true);

    logger.success("\n \u2606 Language update process completed \u2606");
  } catch (error) {
    logger.error(`Update failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Compares the current source against the cached state to find changes,
 * sends only those changes to the API, then merges them back into
 * the existing target file. Also removes obsolete keys.
 */
async function updateLanguage(lang, sourceData, config, credentials, state) {
  const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
  const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

  try {
    logger.info(`\nChecking updates for ${lang}...`);
    const existingData = await fileManager.loadLanguageFile(
      i18nAbsolutePath,
      lang,
    );

    const missingContent = findMissingContent(
      sourceData,
      existingData,
      state.sourceCache,
    );
    const obsoleteKeys = findObsoleteContent(sourceData, existingData);

    const hasMissingContent = Object.keys(missingContent).length > 0;
    const hasObsoleteContent = obsoleteKeys.length > 0;

    if (!hasMissingContent && !hasObsoleteContent) {
      logger.success(`\n${lang} is already up to date`);
      return false;
    }

    let updatedData = { ...existingData };

    if (hasObsoleteContent) {
      updatedData = removeObsoleteKeys(updatedData, obsoleteKeys);
    }

    if (hasMissingContent) {
      logger.info(`Found missing/changed content in ${lang}, translating...`);
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: missingContent,
          targetLanguage: lang,
          ...credentials,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      updatedData = deepMerge(updatedData, result.translatedData);
    }

    await fs.writeFile(targetFile, JSON.stringify(updatedData, null, 2));
    logger.success(`\nUpdated ${lang}`);
    return true;
  } catch (error) {
    logger.error(`Failed to update ${lang}: ${error.message}`);
    return false;
  }
}

// --- Diff Utilities ---

/**
 * Recursively finds keys in source that are either:
 *   - Missing from the target (new keys)
 *   - Changed since the last cached state (modified values)
 * Returns a partial object containing only what needs to be translated.
 */
function findMissingContent(source, target, cachedSource, path = "") {
  const missing = {};
  for (const key in source) {
    const currentPath = path ? `${path}.${key}` : key;

    if (!(key in target)) {
      missing[key] = source[key];
    } else if (typeof source[key] === "object" && source[key] !== null) {
      const nestedCached =
        cachedSource && typeof cachedSource[key] === "object"
          ? cachedSource[key]
          : {};
      const nestedMissing = findMissingContent(
        source[key],
        target[key],
        nestedCached,
        currentPath,
      );
      if (Object.keys(nestedMissing).length > 0) {
        missing[key] = nestedMissing;
      }
    } else {
      // Value exists in both — only re-translate if the source changed
      if (
        cachedSource &&
        cachedSource[key] !== undefined &&
        cachedSource[key] !== source[key]
      ) {
        missing[key] = source[key];
      }
    }
  }
  return missing;
}

/** Recursively merges source into target, preserving existing keys. */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      if (typeof result[key] === "object" && result[key] !== null) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Finds keys in the target that no longer exist in the source.
 * Returns an array of dot-paths like ["nav.oldLink", "footer.removed"].
 */
function findObsoleteContent(source, target, path = "") {
  const obsoleteKeys = [];
  for (const key in target) {
    const currentPath = path ? `${path}.${key}` : key;
    if (!(key in source)) {
      obsoleteKeys.push(currentPath);
    } else if (typeof target[key] === "object" && target[key] !== null) {
      if (typeof source[key] === "object" && source[key] !== null) {
        const nestedObsolete = findObsoleteContent(
          source[key],
          target[key],
          currentPath,
        );
        obsoleteKeys.push(...nestedObsolete);
      } else {
        obsoleteKeys.push(currentPath);
      }
    }
  }
  return obsoleteKeys;
}

/** Deletes the given dot-path keys from a deep-cloned copy of the data. */
function removeObsoleteKeys(data, obsoleteKeys) {
  const result = JSON.parse(JSON.stringify(data));
  for (const keyPath of obsoleteKeys) {
    const keys = keyPath.split(".");
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] && typeof current[keys[i]] === "object") {
        current = current[keys[i]];
      } else {
        break;
      }
    }
    const finalKey = keys[keys.length - 1];
    if (current && current.hasOwnProperty(finalKey)) {
      delete current[finalKey];
    }
  }
  return result;
}
