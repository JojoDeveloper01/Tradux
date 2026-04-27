import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { logger } from "../utils/logger.js";
import { printSummary } from "../utils/ui.js";
import { availableLanguages as allLanguagesList } from "../utils/languages.js";
import { validateAndFixConfig } from "../utils/config.js";
import { fileManager } from "./file-manager.js";
import { PROVIDER_ENV_MAP } from "../utils/providers.js";

/**
 * translator.js — AI Translation Engine
 *
 * Sends JSON content to a translation proxy for translation.
 * Supports multiple providers (OpenRouter, OpenAI, Anthropic, Google, Cloudflare, Custom)
 * with automatic fallback if the primary provider fails.
 *
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

const DEFAULT_WORKER_URL =
  "https://worker-proxy.seth-eb4.workers.dev/api/translate-json";

/**
 * Resolves the worker proxy URL.
 * Priority: TRADUX_WORKER_URL env var → config.workerUrl → localhost fallback.
 */
function getWorkerUrl(config) {
  return (
    process.env.TRADUX_WORKER_URL || config?.workerUrl || DEFAULT_WORKER_URL
  );
}

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
 * Reads .env file and loads all known credential env vars into process.env.
 */
function loadEnvFile() {
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
}

// PROVIDER_ENV_MAP — imported from ../utils/providers.js (single source of truth)

/**
 * Resolves the translation config from tradux.config.json.
 * Supports both the new `translation` block and legacy flat keys.
 *
 * Returns: { provider, model, credentials, fallback? }
 */
function resolveTranslationConfig(config) {
  loadEnvFile();

  const t = config.translation || {};
  const def = t.default || {};

  let provider =
    def.provider || t.provider || config.translationProvider || "provider_code";
  let model = def.model || t.model || config.translationModel || "model_code";
  let baseURL = def.baseURL || t.baseURL;

  // Build fallback FIRST to avoid initialization error
  let fallback = null;
  if (
    t.fallback &&
    t.fallback.provider &&
    t.fallback.provider !== "provider_code"
  ) {
    const fb = t.fallback;
    fallback = {
      provider: fb.provider,
      model: fb.model || "model_code",
      baseURL: fb.baseURL,
      credentials: getCredentials(fb.provider),
    };
  }

  // If the primary provider doesn't exist, try to use the fallback
  if (provider === "provider_code") {
    if (fallback) {
      provider = fallback.provider;
      model = fallback.model;
      baseURL = fallback.baseURL;
      fallback = null; // Clear the fallback as it has been promoted to primary
    } else {
      logger.error("\nTradux is not fully configured yet.");
      logger.info(
        "Please run 'npx tradux init' to set up your AI provider and model.\n",
      );
      process.exit(1);
    }
  }

  const credentials = getCredentials(provider);
  const workerUrl = getWorkerUrl(config);

  const review = t.review?.enabled
    ? {
        enabled: true,
        provider: t.review.provider || provider,
        model: t.review.model || model,
        baseURL: t.review.baseURL,
      }
    : null;

  return { provider, model, baseURL, credentials, fallback, review, workerUrl };
}

function getCredentials(provider) {
  const map = PROVIDER_ENV_MAP[provider];
  if (!map) return {};
  const creds = {};
  for (const [field, envVar] of Object.entries(map)) {
    creds[field] = process.env[envVar] || null;
  }
  return creds;
}

function hasValidCredentials(credentials) {
  return Object.values(credentials).every((v) => v != null);
}

function warnMissingCredentials(provider, credentials) {
  const map = PROVIDER_ENV_MAP[provider];
  if (!map) return;
  const missing = Object.entries(map)
    .filter(([field]) => !credentials[field])
    .map(([, envVar]) => envVar);
  if (missing.length > 0) {
    logger.warn(
      `\nNo credentials found for "${provider}". Set ${missing.join(" and ")} in your .env file.\n`,
    );
  }
}

/**
 * Calls the review step — sends original + translated data to the worker
 * with a quality-review prompt to improve the translation.
 */
async function callReviewWorker(
  originalData,
  translatedData,
  sourceLang,
  targetLang,
  txConfig,
) {
  const { review, workerUrl } = txConfig;
  const provider = review?.provider || txConfig.provider;
  const model = review?.model || txConfig.model;
  const baseURL = review?.baseURL || txConfig.baseURL;
  const credentials =
    review?.provider && review.provider !== txConfig.provider
      ? getCredentials(review.provider)
      : txConfig.credentials;

  const url = workerUrl || DEFAULT_WORKER_URL;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: { original: originalData, translation: translatedData },
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      reviewMode: true,
      provider,
      model,
      baseURL,
      ...credentials,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Review HTTP ${response.status}`);
  }
  const result = await response.json();
  if (!result.success) throw new Error(result.error || "Review failed");
  return result;
}

/**
 * Calls the worker proxy with the given translation config.
 * If the primary provider fails and a fallback is configured, retries with it.
 */
async function callWorker(data, sourceLang, targetLang, txConfig) {
  const { provider, model, baseURL, credentials, fallback, workerUrl } =
    txConfig;

  // Try primary provider
  try {
    const result = await doWorkerCall(
      data,
      sourceLang,
      targetLang,
      provider,
      model,
      baseURL,
      credentials,
      workerUrl,
    );
    return result;
  } catch (primaryError) {
    if (!fallback) throw primaryError;

    // Try fallback
    logger.warn(
      `\nPrimary provider "${provider}" failed: ${primaryError.message}`,
    );
    logger.info(
      `\nRetrying with fallback provider "${fallback.provider}"...\n`,
    );

    if (!hasValidCredentials(fallback.credentials)) {
      warnMissingCredentials(fallback.provider, fallback.credentials);
      throw primaryError;
    }

    return doWorkerCall(
      data,
      sourceLang,
      targetLang,
      fallback.provider,
      fallback.model,
      fallback.baseURL,
      fallback.credentials,
      workerUrl,
    );
  }
}

async function doWorkerCall(
  data,
  sourceLang,
  targetLang,
  provider,
  model,
  baseURL,
  credentials,
  workerUrl,
) {
  const url = workerUrl || DEFAULT_WORKER_URL;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        provider,
        model,
        baseURL,
        ...credentials,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMsg =
        errorBody.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`${errorMsg} (provider: ${provider}, model: ${model})`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Translation failed");
    }
    return result;
  } catch (error) {
    // Re-throw with enhanced context if not already enhanced
    if (!error.message.includes("provider:")) {
      throw new Error(
        `${error.message} (provider: ${provider}, model: ${model})`,
      );
    }
    throw error;
  }
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

  const data = await fileManager.loadLanguageFile(
    i18nAbsolutePath,
    config.defaultLanguage,
  );

  if (!data) {
    logger.error(
      `\nFATAL ERROR: Could not parse ${config.defaultLanguage}.json`,
    );
    logger.info(
      "\nThe file contains invalid JSON syntax (e.g., missing quotes or trailing commas).",
    );
    logger.info("Please fix the syntax errors in your file and try again.\n");
    process.exit(1);
  }

  return data;
}

// --- Marker Helpers ---
// Users annotate key names in the source JSON with special prefixes or suffixes:
//   "===keyName" or "keyName==="  → no-translate: copy the value as-is to every target file, never send to API
//   "+++keyName" or "keyName+++"  → force-translate: always re-translate on every -u run, even if it already exists
//   "---keyName" or "keyName---"  → ignore: never translate, never add to target files
// Target files always use clean (unmarked) key names.

const NO_TRANSLATE = "===";
const FORCE_TRANSLATE = "+++";
const IGNORE = "---";

/** Returns true if the key name carries a marker prefix or suffix. */
const isNoTranslateKey = (k) =>
  k.startsWith(NO_TRANSLATE) || k.endsWith(NO_TRANSLATE);
const isForceTranslateKey = (k) =>
  k.startsWith(FORCE_TRANSLATE) || k.endsWith(FORCE_TRANSLATE);
const isIgnoreKey = (k) => k.startsWith(IGNORE) || k.endsWith(IGNORE);

/** Strips a marker prefix or suffix from a key name (e.g. "===heading" or "heading===" → "heading"). */
const cleanKey = (k) => {
  if (
    k.startsWith(NO_TRANSLATE) ||
    k.startsWith(FORCE_TRANSLATE) ||
    k.startsWith(IGNORE)
  )
    return k.slice(3);
  if (
    k.endsWith(NO_TRANSLATE) ||
    k.endsWith(FORCE_TRANSLATE) ||
    k.endsWith(IGNORE)
  )
    return k.slice(0, -3);
  return k;
};

/**
 * Recursively splits source data into two parts:
 *   - forTranslation: everything except === and --- keys, with +++ markers stripped
 *   - noTranslate: only the === keys, with markers stripped (to be directly copied)
 * Keys marked with --- are dropped entirely — not sent to API, not added to target.
 */
function separateTranslatables(data) {
  if (Array.isArray(data)) {
    return { forTranslation: data, noTranslate: null };
  }
  if (data && typeof data === "object") {
    const forTranslation = {};
    const noTranslate = {};
    for (const key in data) {
      const val = data[key];
      const ck = cleanKey(key);

      if (isIgnoreKey(key)) continue; // --- key: drop entirely

      if (isNoTranslateKey(key)) {
        noTranslate[ck] = val; // === key: copy value as-is
        continue;
      }

      // +++ key and plain keys both go into forTranslation (cleanKey strips the prefix)
      if (typeof val === "string" || Array.isArray(val)) {
        forTranslation[ck] = val;
      } else if (val && typeof val === "object") {
        const { forTranslation: ft, noTranslate: nt } =
          separateTranslatables(val);
        forTranslation[ck] = ft;
        if (nt && Object.keys(nt).length > 0) noTranslate[ck] = nt;
      } else {
        forTranslation[ck] = val;
      }
    }
    return {
      forTranslation,
      noTranslate: Object.keys(noTranslate).length > 0 ? noTranslate : null,
    };
  }
  return { forTranslation: data, noTranslate: null };
}

/**
 * Finds === values in noTranslateData that are missing or outdated in the target.
 * Returns a partial object of values that need to be directly copied/updated.
 */
function findDirectCopyUpdates(noTranslateData, existingData) {
  const updates = {};
  for (const key in noTranslateData) {
    const val = noTranslateData[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = findDirectCopyUpdates(val, existingData?.[key] ?? {});
      if (Object.keys(nested).length > 0) updates[key] = nested;
    } else if (existingData?.[key] !== val) {
      updates[key] = val;
    }
  }
  return updates;
}

// --- Full Translation Flow ---

/**
 * Translates the source file into each requested language.
 * Skips languages that already have a file (use -u to update those).
 * After completion, saves state and re-syncs the config.
 */
export async function translateFiles(languages, config) {
  const txConfig = resolveTranslationConfig(config);

  if (!hasValidCredentials(txConfig.credentials)) {
    if (
      txConfig.fallback &&
      hasValidCredentials(txConfig.fallback.credentials)
    ) {
      logger.warn(
        `\nPrimary provider "${txConfig.provider}" is missing credentials. Auto-switching to fallback "${txConfig.fallback.provider}".`,
      );
      txConfig.provider = txConfig.fallback.provider;
      txConfig.model = txConfig.fallback.model;
      txConfig.baseURL = txConfig.fallback.baseURL;
      txConfig.credentials = txConfig.fallback.credentials;
      txConfig.fallback = null;
    } else {
      warnMissingCredentials(txConfig.provider, txConfig.credentials);
      return;
    }
  }

  try {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const languagesArray = parseLanguages(languages);
    const uniqueLanguages = [...new Set(languagesArray)];

    const sourceFile = await loadSourceFile(config);
    let filesCreated = false;
    const summaryResults = [];
    const wallStart = Date.now();

    for (const lang of uniqueLanguages) {
      const isValid = allLanguagesList.some((l) => l.value === lang);
      if (!isValid) {
        logger.error(
          `\nThe language code "${lang}" doesn't exist in Tradux. Skipping...`,
        );
        summaryResults.push({
          lang,
          status: "error",
          duration: 0,
          error: "unknown language code",
        });
        continue;
      }

      const langStart = Date.now();
      const result = await translateLanguage(
        lang,
        sourceFile,
        config,
        txConfig,
      );
      const duration = Date.now() - langStart;

      if (result === false) {
        summaryResults.push({ lang, status: "error", duration });
      } else if (result === "skipped") {
        summaryResults.push({ lang, status: "skipped", duration });
      } else {
        filesCreated = true;
        summaryResults.push({
          lang,
          status: "ok",
          duration,
          reviewFixes: result?.reviewFixes ?? null,
        });
      }
    }

    const totalMs = Date.now() - wallStart;
    await saveState(i18nAbsolutePath, sourceFile);
    if (filesCreated) await validateAndFixConfig(process.cwd(), true);

    printSummary(summaryResults, totalMs);
  } catch (error) {
    logger.error(`Translation failed: ${error.message}`);
    process.exit(1);
  }
}

/** Sends the full source JSON to the worker proxy and writes the translated result. */
async function translateLanguage(lang, sourceData, config, txConfig) {
  const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
  const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

  if (fileManager.exists(targetFile)) {
    logger.warn(`\nSkipping existing translation: ${lang}`);
    return "skipped";
  }

  try {
    logger.info(`\nTranslating ${lang}...`);

    // Split === (no-translate) values from the payload — they get copied directly
    const { forTranslation, noTranslate } = separateTranslatables(sourceData);
    const sourceLang = config.defaultLanguage;

    const result = await callWorker(forTranslation, sourceLang, lang, txConfig);

    // Optional quality review step — second pass with a review prompt
    let translatedContent = result.translatedData;
    let reviewFixes = null;
    if (txConfig.review?.enabled) {
      logger.info(`  Reviewing ${lang} translation quality...`);
      try {
        const reviewed = await callReviewWorker(
          forTranslation,
          translatedContent,
          sourceLang,
          lang,
          txConfig,
        );
        // Count number of keys that changed during review
        reviewFixes = countDiffKeys(translatedContent, reviewed.translatedData);
        translatedContent = reviewed.translatedData;
      } catch (err) {
        logger.warn(`  Review step skipped: ${err.message}`);
      }
    }

    if (JSON.stringify(translatedContent) === JSON.stringify(forTranslation)) {
      logger.error(
        `\nTranslation for ${lang} returned the same content as the source — the API call likely failed (invalid credentials or quota exceeded). File not created.`,
      );
      return false;
    }

    // Merge === values back in (direct copy, no translation)
    const finalData = noTranslate
      ? deepMerge(translatedContent, noTranslate)
      : translatedContent;

    await fs.writeFile(targetFile, JSON.stringify(finalData, null, 2));
    logger.success(`\nTranslated ${lang}`);
    return { ok: true, reviewFixes };
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
  const txConfig = resolveTranslationConfig(config);

  if (!hasValidCredentials(txConfig.credentials)) {
    if (
      txConfig.fallback &&
      hasValidCredentials(txConfig.fallback.credentials)
    ) {
      logger.warn(
        `\nPrimary provider "${txConfig.provider}" is missing credentials. Auto-switching to fallback "${txConfig.fallback.provider}".`,
      );
      txConfig.provider = txConfig.fallback.provider;
      txConfig.model = txConfig.fallback.model;
      txConfig.baseURL = txConfig.fallback.baseURL;
      txConfig.credentials = txConfig.fallback.credentials;
      txConfig.fallback = null;
    } else {
      warnMissingCredentials(txConfig.provider, txConfig.credentials);
      return;
    }
  }

  try {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const languagesArray = parseLanguages(languages);
    const uniqueLanguages = [...new Set(languagesArray)];

    logger.info(`\nStarting update process for: ${uniqueLanguages.join(", ")}`);
    const sourceFile = await loadSourceFile(config);
    const state = await loadState(i18nAbsolutePath);
    let filesCreatedOrUpdated = false;
    const summaryResults = [];
    const wallStart = Date.now();

    for (const lang of uniqueLanguages) {
      if (lang === config.defaultLanguage) continue;

      const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

      // Language file doesn't exist yet — offer to create it
      if (!fileManager.exists(targetFile)) {
        const isValid = allLanguagesList.some((l) => l.value === lang);
        if (!isValid) {
          logger.error(`The language code "${lang}" doesn't exist in Tradux.`);
          summaryResults.push({
            lang,
            status: "error",
            duration: 0,
            error: "unknown language code",
          });
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
          const langStart = Date.now();
          const created = await translateLanguage(
            lang,
            sourceFile,
            config,
            txConfig,
          );
          const duration = Date.now() - langStart;
          if (created && created !== false && created !== "skipped") {
            filesCreatedOrUpdated = true;
            summaryResults.push({
              lang,
              status: "ok",
              duration,
              reviewFixes: created?.reviewFixes ?? null,
            });
          } else {
            summaryResults.push({
              lang,
              status: created === "skipped" ? "skipped" : "error",
              duration,
            });
          }
        } else {
          summaryResults.push({ lang, status: "skipped", duration: 0 });
        }
        continue;
      }

      const langStart = Date.now();
      const updated = await updateLanguage(
        lang,
        sourceFile,
        config,
        txConfig,
        state,
      );
      const duration = Date.now() - langStart;
      if (updated) {
        filesCreatedOrUpdated = true;
        summaryResults.push({ lang, status: "ok", duration });
      } else {
        summaryResults.push({ lang, status: "skipped", duration });
      }
    }

    const totalMs = Date.now() - wallStart;
    await saveState(i18nAbsolutePath, sourceFile);
    if (filesCreatedOrUpdated) await validateAndFixConfig(process.cwd(), true);

    printSummary(summaryResults, totalMs);
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
async function updateLanguage(lang, sourceData, config, txConfig, state) {
  const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
  const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

  try {
    logger.info(`\nChecking updates for ${lang}...`);
    const existingData = await fileManager.loadLanguageFile(
      i18nAbsolutePath,
      lang,
    );

    // Separate === (no-translate) values — they get directly copied, not sent to API
    const { noTranslate } = separateTranslatables(sourceData);
    const directCopyUpdates = noTranslate
      ? findDirectCopyUpdates(noTranslate, existingData)
      : null;

    const missingContent = findMissingContent(
      sourceData,
      existingData,
      state.sourceCache,
    );
    const obsoleteKeys = findObsoleteContent(sourceData, existingData);

    const hasMissingContent = Object.keys(missingContent).length > 0;
    const hasObsoleteContent = obsoleteKeys.length > 0;
    const hasDirectCopy =
      directCopyUpdates && Object.keys(directCopyUpdates).length > 0;

    if (!hasMissingContent && !hasObsoleteContent && !hasDirectCopy) {
      logger.success(`\n${lang} is already up to date`);
      return false;
    }

    let updatedData = { ...existingData };

    if (hasObsoleteContent) {
      updatedData = removeObsoleteKeys(updatedData, obsoleteKeys);
    }

    if (hasMissingContent) {
      logger.info(`Found missing/changed content in ${lang}, translating...`);

      const sourceLang = config.defaultLanguage;
      const result = await callWorker(
        missingContent,
        sourceLang,
        lang,
        txConfig,
      );

      // Optional quality review step
      let translatedContent = result.translatedData;
      if (txConfig.review?.enabled) {
        logger.info(`  Reviewing ${lang} translation quality...`);
        try {
          const reviewed = await callReviewWorker(
            missingContent,
            translatedContent,
            sourceLang,
            lang,
            txConfig,
          );
          translatedContent = reviewed.translatedData;
        } catch (err) {
          logger.warn(`  Review step skipped: ${err.message}`);
        }
      }

      if (
        JSON.stringify(translatedContent) === JSON.stringify(missingContent)
      ) {
        logger.error(
          `\nTranslation for ${lang} returned the same content as the source — the API call likely failed (invalid credentials or quota exceeded). Changes not applied.`,
        );
        return false;
      }

      updatedData = deepMerge(updatedData, translatedContent);
    }

    // Apply === direct-copy values (no translation needed)
    if (hasDirectCopy) {
      updatedData = deepMerge(updatedData, directCopyUpdates);
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
 *   - Marked with +++ (always force re-translate)
 * Skips === keys entirely (they belong in the direct-copy path, not translation).
 * Skips --- keys entirely (they are ignored and never appear in target files).
 * Returns a partial object containing only what needs to be translated.
 */
function findMissingContent(source, target, cachedSource, path = "") {
  const missing = {};
  for (const key in source) {
    const ck = cleanKey(key);
    const currentPath = path ? `${path}.${ck}` : ck;
    const sourceVal = source[key];

    if (isIgnoreKey(key)) continue; // --- key: skip entirely
    if (isNoTranslateKey(key)) continue; // === key: handled via direct copy path

    // +++ key: always force re-translate
    if (isForceTranslateKey(key)) {
      missing[ck] = sourceVal;
      continue;
    }

    if (!(ck in target)) {
      missing[ck] = sourceVal;
    } else if (typeof sourceVal === "object" && sourceVal !== null) {
      const cachedEntry = cachedSource?.[key] ?? cachedSource?.[ck];
      const nestedCached = typeof cachedEntry === "object" ? cachedEntry : {};
      const nestedMissing = findMissingContent(
        sourceVal,
        target[ck],
        nestedCached,
        currentPath,
      );
      if (Object.keys(nestedMissing).length > 0) {
        missing[ck] = nestedMissing;
      }
    } else {
      // Only re-translate if the source value changed since last run
      const cachedVal = cachedSource?.[key] ?? cachedSource?.[ck];
      if (cachedVal !== undefined && cachedVal !== sourceVal) {
        missing[ck] = sourceVal;
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

/** Counts leaf keys whose value changed between two objects (used for review diff). */
function countDiffKeys(before, after, prefix = "") {
  if (!before || !after) return 0;
  let count = 0;
  for (const key of Object.keys(after)) {
    const bVal = before[key];
    const aVal = after[key];
    if (typeof aVal === "object" && aVal !== null) {
      count += countDiffKeys(bVal, aVal, `${prefix}${key}.`);
    } else if (bVal !== aVal) {
      count++;
    }
  }
  return count;
}

/**
 * Finds keys in the target that no longer exist in the source,
 * OR whose source value is marked with --- (ignored — should not appear in targets).
 * Returns an array of dot-paths like ["nav.oldLink", "footer.removed"].
 */
function findObsoleteContent(source, target, path = "") {
  // Build a map from clean key → original (possibly marked) key in source
  const sourceKeyMap = {};
  for (const k in source) sourceKeyMap[cleanKey(k)] = k;

  const obsoleteKeys = [];
  for (const key in target) {
    const currentPath = path ? `${path}.${key}` : key;
    const sourceOrigKey = sourceKeyMap[key];

    if (!sourceOrigKey) {
      obsoleteKeys.push(currentPath);
    } else if (isIgnoreKey(sourceOrigKey)) {
      // --- key in source → remove from target
      obsoleteKeys.push(currentPath);
    } else if (typeof target[key] === "object" && target[key] !== null) {
      const srcVal = source[sourceOrigKey];
      if (srcVal && typeof srcVal === "object") {
        obsoleteKeys.push(
          ...findObsoleteContent(srcVal, target[key], currentPath),
        );
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
