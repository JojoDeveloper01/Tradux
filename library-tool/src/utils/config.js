import fs from "fs-extra";
import path from "path";
import { logger } from "./logger.js";
import { fileManager } from "../core/file-manager.js";

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

  if (configChanged) {
    await fs.writeFile(configPath, JSON.stringify(config, null, 4));
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
