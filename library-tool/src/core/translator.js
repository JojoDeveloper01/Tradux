import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { logger } from "../utils/logger.js";
import { availableLanguages as allLanguagesList } from "../utils/languages.js";
import { validateAndFixConfig } from "../utils/config.js";
import { fileManager } from "./file-manager.js";

const WORKER_URL =
  "https://worker-proxy.seth-eb4.workers.dev/api/translate-json";

// --- STATE MANAGEMENT ---
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

function parseLanguages(languages) {
  return languages
    .split(",")
    .map((lang) => lang.trim())
    .filter(Boolean);
}

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

export async function translateFiles(languages, config) {
  const credentials = await loadCredentials();
  try {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const languagesArray = parseLanguages(languages);
    const uniqueLanguages = [...new Set(languagesArray)];

    const sourceFile = await loadSourceFile(config);
    let filesCreated = false;

    for (const lang of uniqueLanguages) {
      // 1. FAKE LANGUAGE BLOCKER!
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
      // REVERTED: Now uses the exact payload from the working version
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
        // REVERTED: Now uses the exact payload from the working version
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
