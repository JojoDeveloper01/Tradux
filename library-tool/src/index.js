#!/usr/bin/env node
import { logger } from "./utils/logger.js";
import { loadConfig, validateAndFixConfig } from "./utils/config.js";
import { availableLanguages } from "./utils/languages.js";
import { translateFiles, updateLanguageFiles } from "./core/translator.js";

import { program } from "commander";
import prompts from "prompts";
import fs from "fs";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

let cachedConfig = null;

async function getConfig() {
  if (!cachedConfig) {
    await validateAndFixConfig(process.cwd(), true);
    cachedConfig = await loadConfig();
  }
  return cachedConfig;
}

program
  .name("tradux")
  .description("A CLI tool for automated translation")
  .version(packageJson.version, "-v, --version", "output the version number");

program
  .command("init")
  .description("Initialize or fix tradux configuration")
  .action(async () => {
    try {
      await validateAndFixConfig(process.cwd(), false);
    } catch (error) {
      logger.error("Failed to initialize tradux:");
      logger.error(error.message);
      process.exit(1);
    }
  });

program
  .option("-t, --languages [languages]")
  .option("-u, --update [languages]")
  .option("-r, --remove [languages]")
  .action(async (options) => {
    try {
      if (options.remove !== undefined) {
        const languages = await getRemoveLanguages(options);
        if (languages) await removeLanguageFiles(languages);
      } else if (options.update !== undefined) {
        const languages = await getUpdateLanguages(options);
        if (languages) {
          const config = await getConfig();
          await updateLanguageFiles(languages, config);
        }
      } else {
        const languages = await getLanguages(options);
        if (languages) {
          const config = await getConfig();
          await translateFiles(languages, config);
        }
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.configureHelp({
  formatHelp: () => {
    showHelp();
    return "";
  },
});
program.parse();

async function getLanguages(options) {
  if (
    !options.languages &&
    !process.argv.includes("-t") &&
    !process.argv.includes("--languages")
  ) {
    showHelp();
    return null;
  }
  const config = await getConfig();
  if (!config) {
    logger.error("\n Configuration file not found!");
    process.exit(1);
  }
  if (
    options.languages === undefined ||
    options.languages === true ||
    options.languages === ""
  ) {
    return await promptLanguages();
  }
  if (options.languages) {
    const tIndex = process.argv.findIndex(
      (arg) => arg === "-t" || arg === "--languages",
    );
    if (tIndex !== -1) {
      const remainingArgs = process.argv.slice(tIndex + 1);
      const languageArgs = [];
      for (const arg of remainingArgs) {
        if (arg.startsWith("-")) break;
        languageArgs.push(arg);
      }
      if (languageArgs.length > 0) {
        return languageArgs
          .join(" ")
          .replace(/\s*,\s*/g, ",")
          .replace(/\s+/g, ",")
          .replace(/,+/g, ",")
          .replace(/^,|,$/g, "");
      }
    }
    return options.languages;
  }
  return await promptLanguages();
}

async function getUpdateLanguages(options) {
  if (
    !options.update &&
    !process.argv.includes("-u") &&
    !process.argv.includes("--update")
  )
    return null;
  const config = await getConfig();
  if (!config) {
    logger.error("\n Configuration file not found!");
    process.exit(1);
  }
  if (
    options.update === undefined ||
    options.update === true ||
    options.update === ""
  ) {
    return await promptUpdateAllLanguages();
  }
  if (options.update) {
    const uIndex = process.argv.findIndex(
      (arg) => arg === "-u" || arg === "--update",
    );
    if (uIndex !== -1) {
      const remainingArgs = process.argv.slice(uIndex + 1);
      const languageArgs = [];
      for (const arg of remainingArgs) {
        if (arg.startsWith("-")) break;
        languageArgs.push(arg);
      }
      if (languageArgs.length > 0) {
        return languageArgs
          .join(" ")
          .replace(/\s*,\s*/g, ",")
          .replace(/\s+/g, ",")
          .replace(/,+/g, ",")
          .replace(/^,|,$/g, "");
      }
    }
    return options.update;
  }
  return await promptUpdateAllLanguages();
}

async function getRemoveLanguages(options) {
  if (
    !options.remove &&
    !process.argv.includes("-r") &&
    !process.argv.includes("--remove")
  )
    return null;
  const config = await getConfig();
  if (!config) {
    logger.error("\n Configuration file not found!");
    process.exit(1);
  }
  if (
    options.remove === undefined ||
    options.remove === true ||
    options.remove === ""
  ) {
    return await promptRemoveLanguages();
  }
  if (options.remove) {
    const rIndex = process.argv.findIndex(
      (arg) => arg === "-r" || arg === "--remove",
    );
    if (rIndex !== -1) {
      const remainingArgs = process.argv.slice(rIndex + 1);
      const languageArgs = [];
      for (const arg of remainingArgs) {
        if (arg.startsWith("-")) break;
        languageArgs.push(arg);
      }
      if (languageArgs.length > 0) {
        return languageArgs
          .join(" ")
          .replace(/\s*,\s*/g, ",")
          .replace(/\s+/g, ",")
          .replace(/,+/g, ",")
          .replace(/^,|,$/g, "");
      }
    }
    return options.remove;
  }
  return await promptRemoveLanguages();
}

async function removeLanguageFiles(languages) {
  const config = await getConfig();
  const { fileManager } = await import("./core/file-manager.js");

  // DELETED the bad dynamic import that was pointing to postinstall.js!

  const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);

  // The filter(Boolean) MAGIC FIX prevents the empty ".json" bug!
  const languageList = languages
    .split(",")
    .map((lang) => lang.trim())
    .filter(Boolean);
  let filesRemoved = false;

  logger.info(`\nStarting removal process for: ${languageList.join(", ")}`);

  for (const lang of languageList) {
    if (lang === config.defaultLanguage) {
      logger.warn(`\nSkipping ${lang} - cannot remove the default language`);
      continue;
    }

    logger.info(`\nChecking removal for ${lang}...`);
    const filePath = path.join(i18nAbsolutePath, `${lang}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.success(`\nRemoved ${lang}`);
      filesRemoved = true;
    } else {
      logger.warn(`\nFile not found: ${lang}.json`);
    }
  }

  if (filesRemoved) {
    // This uses the global validateAndFixConfig we imported at the top of index.js!
    await validateAndFixConfig(process.cwd(), true);
  }

  logger.success("\n \u2606 Language removal process completed \u2606");
}

async function promptUpdateAllLanguages() {
  try {
    logger.info("\nTradux Language Update");
    logger.warn(
      "\nThis will update all existing languages based on your default language configuration.",
    );
    const confirmResponse = await prompts({
      type: "confirm",
      name: "confirmUpdate",
      message: "Do you want to update all existing languages?",
      initial: true,
    });
    if (!confirmResponse.confirmUpdate) {
      logger.info("Update operation cancelled.");
      process.exit(0);
    }

    const config = await getConfig();
    // Since config is auto-healed, config.availableLanguages is 100% accurate!
    const languagesToUpdate = config.availableLanguages.filter(
      (lang) => lang !== config.defaultLanguage,
    );

    if (languagesToUpdate.length === 0) {
      logger.warn(
        "No languages to update. Only default language file exists or no language files found.",
      );
      process.exit(0);
    }

    const selectedNames = languagesToUpdate
      .map((lang) => {
        const langInfo = availableLanguages.find((al) => al.value === lang);
        return langInfo ? langInfo.name : lang;
      })
      .join(", ");

    logger.success(`\nWill update existing languages: ${selectedNames}`);
    logger.info(`Base language: ${config.defaultLanguage}\n`);

    return languagesToUpdate.join(",");
  } catch (error) {
    logger.info("\nOperation cancelled by user.");
    process.exit(0);
  }
}

async function promptRemoveLanguages() {
  const config = await getConfig();
  // Since config is auto-healed, config.availableLanguages is 100% accurate!
  const removableLanguages = config.availableLanguages.filter(
    (lang) => lang !== config.defaultLanguage,
  );

  if (removableLanguages.length === 0) {
    logger.warn("No languages available to remove.");
    process.exit(0);
  }

  const choices = removableLanguages.map((lang) => {
    const langInfo = availableLanguages.find((al) => al.value === lang);
    return { title: langInfo ? langInfo.name : lang, value: lang };
  });

  const response = await prompts({
    type: "multiselect",
    name: "selectedLanguages",
    message: "Choose languages to remove:",
    choices: choices,
    min: 1,
  });

  if (!response.selectedLanguages?.length) {
    logger.info("No languages selected.");
    process.exit(0);
  }

  const confirmResponse = await prompts({
    type: "confirm",
    name: "confirmRemove",
    message: "Are you sure? This will permanently delete these files.",
    initial: false,
  });

  if (!confirmResponse.confirmRemove) {
    logger.info("Operation cancelled.");
    process.exit(0);
  }
  return response.selectedLanguages.join(",");
}

function showHelp() {
  logger.info(`
Tradux - Translation Tool

Usage:
  npx tradux                    Shows this help message
  npx tradux init               Initialize Tradux in your project
  npx tradux -t                 Interactive language selection
  npx tradux -t es,pt,lang...   Translate to other languages based on default language
  npx tradux -u                 Update all languages based on default language
  npx tradux -u es,pt,lang...   Update specific languages based on default language
  npx tradux -r                 Interactive removal of language files
  npx tradux -r es,pt,lang...   Remove specific language files
`);
  const configPath = path.join(process.cwd(), "tradux.config.json");
  if (!fs.existsSync(configPath)) {
    logger.warn("   Configuration file not found.");
    logger.success(
      '   Run "npx tradux init" to initialize Tradux in this project.\n',
    );
  } else {
    logger.success("Tradux is configured and ready to use!");
  }
}

async function promptLanguages() {
  try {
    logger.info("\nTradux Language Selection");
    logger.info(
      "Select the languages you want to translate your content to:\n",
    );
    const response = await prompts({
      type: "multiselect",
      name: "selectedLanguages",
      message: "Choose target languages:",
      choices: availableLanguages.map((lang) => ({
        title: lang.name,
        value: lang.value,
      })),
      min: 1,
      hint: "Space to select, Enter to confirm",
    });

    if (
      !response.selectedLanguages ||
      response.selectedLanguages.length === 0
    ) {
      logger.warn("No languages selected. Exiting...");
      process.exit(0);
    }

    const selectedNames = availableLanguages
      .filter((lang) => response.selectedLanguages.includes(lang.value))
      .map((lang) => lang.name)
      .join(", ");

    logger.success(`\nSelected languages: ${selectedNames}\n`);
    return response.selectedLanguages.join(",");
  } catch (error) {
    logger.info("\nOperation cancelled by user.");
    process.exit(0);
  }
}
