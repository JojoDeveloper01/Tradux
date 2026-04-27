import fs from "fs-extra";
import path from "path";
import { logger } from "./logger.js";
import { fileManager } from "../core/file-manager.js";
import { PROVIDERS, getRequiredEnvVars, isValidProvider } from "./providers.js";

const CONFIG_FILENAME = "tradux.config.json";

const SAMPLE_CONTENT = {
  navigation: {
    home: "Home",
    about: "About Us",
    services: "Our Services",
  },
  welcome: "Welcome to my website!",
};

function findI18nPathSync(dir) {
  const possiblePaths = ["public/i18n", "src/i18n", "app/i18n", "i18n"];
  for (const p of possiblePaths) {
    const fullPath = path.join(dir, p);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

export async function validateAndFixConfig(projectRoot, silent = false) {
  const configPath = path.join(projectRoot, CONFIG_FILENAME);
  let config = {};
  let configChanged = false;

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(await fs.readFile(configPath, "utf8"));
    } catch (e) {
      if (!silent)
        logger.warn("tradux.config.json is corrupted. Recreating...");
      configChanged = true;
    }
  } else {
    configChanged = true;
  }

  if (!config.i18nPath) {
    let foundPath = findI18nPathSync(projectRoot);
    if (!foundPath) {
      const publicI18n = path.join(projectRoot, "public", "i18n");
      await fs.ensureDir(publicI18n);
      await fs.writeFile(
        path.join(publicI18n, "en.json"),
        JSON.stringify(SAMPLE_CONTENT, null, 2),
      );
      if (!silent)
        logger.info("Created missing i18n directory at ./public/i18n");
    }
    config.i18nPath = "./i18n";
    configChanged = true;
  }

  if (
    config.i18nPath === "./public/i18n" ||
    config.i18nPath === "public/i18n"
  ) {
    config.i18nPath = "./i18n";
    if (!silent)
      logger.warn(
        'Fixed i18nPath from "./public/i18n" to "./i18n" to prevent Vite warnings.',
      );
    configChanged = true;
  }

  let actualI18nPath = path.resolve(projectRoot, config.i18nPath);
  if (!fs.existsSync(actualI18nPath) && config.i18nPath === "./i18n") {
    if (fs.existsSync(path.resolve(projectRoot, "public/i18n"))) {
      actualI18nPath = path.resolve(projectRoot, "public/i18n");
    } else {
      if (!silent)
        logger.warn(`i18n directory missing! Recreating at ./public/i18n...`);
      actualI18nPath = path.resolve(projectRoot, "public/i18n");
      await fs.ensureDir(actualI18nPath);
      await fs.writeFile(
        path.join(actualI18nPath, "en.json"),
        JSON.stringify(SAMPLE_CONTENT, null, 2),
      );
    }
  }

  let existingFiles = [];
  if (fs.existsSync(actualI18nPath)) {
    existingFiles = fs
      .readdirSync(actualI18nPath)
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .map((f) => f.replace(".json", ""));
  }

  if (
    !config.availableLanguages ||
    JSON.stringify(config.availableLanguages) !== JSON.stringify(existingFiles)
  ) {
    config.availableLanguages =
      existingFiles.length > 0 ? existingFiles : ["en"];
    configChanged = true;
  }

  if (
    !config.defaultLanguage ||
    !existingFiles.includes(config.defaultLanguage)
  ) {
    if (existingFiles.includes("en")) config.defaultLanguage = "en";
    else if (existingFiles.length > 0)
      config.defaultLanguage = existingFiles[0];
    else config.defaultLanguage = "en";
    configChanged = true;
  }

  if (!config.translation || typeof config.translation !== "object") {
    if (!silent) {
      logger.warn("\n  No 'translation' block found in tradux.config.json.");
      logger.info(
        '   Run "npx tradux init" to configure your provider and model.',
      );
    }
    config.translation = {
      default: { provider: "provider_code", model: "model_code" },
    };
    configChanged = true;
  } else {
    // Migrates older flat config structure to the new nested 'default' object
    if (config.translation.provider && !config.translation.default) {
      config.translation.default = {
        provider: config.translation.provider,
        model: config.translation.model || "model_code",
      };
      delete config.translation.provider;
      delete config.translation.model;
      configChanged = true;
    }

    if (!config.translation.default) {
      config.translation.default = {
        provider: "provider_code",
        model: "model_code",
      };
      configChanged = true;
    }

    const validProviders = Object.keys(PROVIDERS);

    if (
      !config.translation.default.provider ||
      config.translation.default.provider === "provider_code"
    ) {
      if (!silent)
        logger.warn(
          `\n  translation.default.provider is required. Set it to one of: ${validProviders.join(", ")}`,
        );
      if (!config.translation.default.provider) {
        config.translation.default.provider = "provider_code";
        configChanged = true;
      }
    } else if (!isValidProvider(config.translation.default.provider)) {
      if (!silent)
        logger.warn(
          `\n  Unknown provider "${config.translation.default.provider}". Valid options: ${validProviders.join(", ")}`,
        );
    }

    if (
      !config.translation.default.model ||
      config.translation.default.model === "model_code"
    ) {
      if (!silent)
        logger.warn(
          `\n  translation.default.model is required. Set it to your chosen model name.`,
        );
      if (!config.translation.default.model) {
        config.translation.default.model = "model_code";
        configChanged = true;
      }
    }
  }

  if (configChanged) {
    // Reorders the object keys to prioritize the translation block at the top
    const reorderedConfig = {
      i18nPath: config.i18nPath,
      defaultLanguage: config.defaultLanguage,
      availableLanguages: config.availableLanguages,
      translation: config.translation,
      ...config,
    };

    await fs.writeFile(configPath, JSON.stringify(reorderedConfig, null, 4));
    if (!silent)
      logger.success(
        `\n Tradux configuration generated/updated at ${CONFIG_FILENAME}`,
      );
  } else {
    if (!silent)
      logger.success(
        "\n Tradux configuration is complete and perfectly synced.",
      );
  }
}

export async function executeRemoveLanguages(languages, config) {
  const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
  const languageList = languages
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  let filesRemoved = false;

  for (const lang of languageList) {
    if (lang === config.defaultLanguage) {
      continue;
    }
    const fp = path.join(i18nAbsolutePath, `${lang}.json`);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      filesRemoved = true;
    }
  }
  if (filesRemoved) await validateAndFixConfig(process.cwd(), true);
}

export function checkEnvCredentials(config) {
  const t = config?.translation || {};
  const defaultProv =
    t.default?.provider || config?.translationProvider || "provider_code";
  const fallbackProv = t.fallback?.provider || "provider_code";

  if (defaultProv === "provider_code" && fallbackProv === "provider_code") {
    logger.warn(
      '\n  Translation providers are not configured yet. Run "npx tradux init" to set them up.',
    );
    return false;
  }

  let defaultOk = false;
  let fallbackOk = false;

  const envPath = path.join(process.cwd(), ".env");
  const envExists = fs.existsSync(envPath);
  const envContent = envExists ? fs.readFileSync(envPath, "utf8") : "";

  const validateKeys = (providerId, label, muteWarning = false) => {
    if (providerId === "provider_code") return false;
    const requiredVars = getRequiredEnvVars(providerId);
    if (requiredVars.length === 0) return true;

    if (!envExists) {
      if (!muteWarning)
        logger.warn(
          `\n  No .env file found. Create one with ${requiredVars.join(" and ")} to enable ${label} translations.`,
        );
      return false;
    }

    const missing = requiredVars.filter(
      (v) => !new RegExp(`${v}=.+`).test(envContent),
    );
    if (missing.length > 0) {
      if (!muteWarning)
        logger.warn(
          `\n  .env is missing ${missing.join(" and ")} for ${label} provider "${providerId}".`,
        );
      return false;
    }
    return true;
  };

  if (defaultProv !== "provider_code") {
    defaultOk = validateKeys(defaultProv, "primary");
  }

  if (fallbackProv !== "provider_code") {
    // Silencia o aviso do fallback se o principal já estiver funcional
    fallbackOk = validateKeys(fallbackProv, "fallback", defaultOk);
  }

  if (defaultOk && fallbackProv !== "provider_code" && !fallbackOk) {
    logger.info(
      `\nℹ️  Note: Primary provider is ready, but Fallback is missing credentials.`,
    );
    return true;
  }

  if (!defaultOk && fallbackOk) {
    logger.info(
      `\nℹ️  Primary provider is unconfigured or missing keys. Tradux will proceed using the Fallback.`,
    );
    return true;
  }

  if (!defaultOk && !fallbackOk) {
    logger.error(
      `\nNo valid credentials found for any configured provider. Translations will not work.`,
    );
    return false;
  }

  return true;
}

export async function loadConfig() {
  try {
    const config = await fileManager.loadConfig();
    if (!config) return null;
    return config;
  } catch (e) {
    logger.error(`Error loading config: ${e.message}`);
    process.exit(1);
  }
}
