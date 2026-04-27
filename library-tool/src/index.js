#!/usr/bin/env node

/**
 * index.js — Tradux CLI Router
 * Entry point for the `npx tradux` command.
 */

import fs from "fs";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { program } from "commander";
import * as p from "@clack/prompts";

import { logger, color } from "./utils/logger.js";
import { initEnv } from "./utils/auth.js";
import {
  loadConfig,
  validateAndFixConfig,
  executeRemoveLanguages,
} from "./utils/config.js";
import { translateFiles, updateLanguageFiles } from "./core/translator.js";
import { availableLanguages } from "./utils/languages.js";
import { fileManager } from "./core/file-manager.js";

import { runInitCommand } from "./commands/init.js";
import {
  runInteractiveMenu,
  promptLanguages,
  promptUpdateAllLanguages,
  promptRemoveLanguages,
  showHelp,
} from "./commands/interactive.js";

import {
  oc,
  promptReviewSettings,
  promptForProviderAndModel,
  BACK_SYMBOL,
} from "./utils/prompt-helpers.js";

initEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
);

let cachedConfig = null;

// Provides a centralized state ensuring the project config is auto-healed
// and synced before CLI operations requiring a valid structure are executed.
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
  .description("Configure Tradux interactively")
  .option("-p, --provider <name>", "Translation provider (non-interactive)")
  .option("-m, --model <name>", "Model name (non-interactive)")
  .option("-d, --default-lang <code>", "Default (source) language code")
  .option("-l, --languages <codes>", "Comma-separated target language codes")
  .option("-i, --i18n-path <path>", "Path to i18n JSON directory")
  .action((opts) => runInitCommand(opts, packageJson.version));

program
  .option("-t, --translate [languages]")
  .option("-u, --update [languages]")
  .option("-r, --remove [languages]")
  .option("-i, --i18n-path [path]", "Configure i18n directory path")
  .option("-p, --provider [name]", "Configure or override translation provider")
  .option("-m, --model [name]", "Configure or override model name")
  .option("-d, --default-lang [code]", "Configure or override default language")
  .option("-f, --fallback-provider [name]", "Set fallback provider")
  .option("-F, --fallback-model [name]", "Set fallback model")
  .option("-R, --review", "Enable translation review step")
  .action(async (options) => {
    try {
      const args = process.argv.slice(2);
      for (const arg of args) {
        if (/^-[a-zA-Z].+/.test(arg)) {
          const flag = arg.slice(0, 2);
          const value = arg.slice(2);
          p.log.error(color.error(`Invalid format: ${arg}`));
          p.log.warn(
            color.warn(`To set a value, use a space: ${flag} ${value}`),
          );
          process.exit(1);
        }
      }

      const hasAction =
        options.translate !== undefined ||
        options.update !== undefined ||
        options.remove !== undefined;
      const hasConfigFlags =
        options.i18nPath !== undefined ||
        options.provider !== undefined ||
        options.model !== undefined ||
        options.defaultLang !== undefined ||
        options.fallbackProvider !== undefined ||
        options.fallbackModel !== undefined ||
        options.review === true;

      // Evaluates flags without an action to persist configuration changes directly
      if (!hasAction && hasConfigFlags) {
        await validateAndFixConfig(process.cwd(), true);
        const configPath = path.join(process.cwd(), "tradux.config.json");

        // Reads raw data from disk to prevent writing fileManager runtime properties
        let rawConfig = {};
        if (fs.existsSync(configPath)) {
          try {
            rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
          } catch (e) {}
        }

        let draft = {
          i18nPath: rawConfig.i18nPath || "./i18n",
          defaultLanguage: rawConfig.defaultLanguage || "",
          availableLanguages: rawConfig.availableLanguages || [],
          translation: rawConfig.translation || { provider: "", model: "" },
        };

        if (options.i18nPath !== undefined) {
          draft.i18nPath =
            typeof options.i18nPath === "string"
              ? options.i18nPath
              : oc(
                  await p.text({
                    message: color.secondary(
                      "Relative path to i18n JSON files:\n",
                    ),
                    initialValue: draft.i18nPath,
                  }),
                );
        }

        if (options.defaultLang !== undefined) {
          if (typeof options.defaultLang === "string")
            draft.defaultLanguage = options.defaultLang;
          else {
            const langs = draft.availableLanguages?.length
              ? draft.availableLanguages
              : availableLanguages.map((l) => l.value);
            const opts = langs.map((v) => {
              const info = availableLanguages.find((al) => al.value === v);
              return { value: v, label: info ? info.name : v, hint: v };
            });
            draft.defaultLanguage = oc(
              await p.select({
                message: color.secondary("Source (default) language:\n"),
                options: opts,
                initialValue: draft.defaultLanguage || opts[0]?.value,
              }),
            );
          }
        }

        if (options.provider !== undefined || options.model !== undefined) {
          let mode = null;
          if (options.provider === true && options.model === true)
            mode = "both";
          else if (options.provider === true) mode = "provider";
          else if (options.model === true) mode = "model";

          if (typeof options.provider === "string")
            draft.translation.default.provider = options.provider;
          if (typeof options.model === "string")
            draft.translation.default.model = options.model;

          if (mode) {
            const res = await promptForProviderAndModel(
              draft.translation.default.provider,
              draft.translation.default.model,
              oc,
              false,
              mode,
            );
            if (res === BACK_SYMBOL) process.exit(0);
            draft.translation.default.provider = res.provider;
            if (mode === "both" || mode === "model")
              draft.translation.default.model = res.model;
          }
        }

        if (
          options.fallbackProvider !== undefined ||
          options.fallbackModel !== undefined
        ) {
          draft.translation.fallback = draft.translation.fallback || {};

          let mode = null;
          if (
            options.fallbackProvider === true &&
            options.fallbackModel === true
          )
            mode = "both";
          else if (options.fallbackProvider === true) mode = "provider";
          else if (options.fallbackModel === true) mode = "model";

          if (typeof options.fallbackProvider === "string")
            draft.translation.fallback.provider = options.fallbackProvider;
          if (typeof options.fallbackModel === "string")
            draft.translation.fallback.model = options.fallbackModel;

          if (mode) {
            const res = await promptForProviderAndModel(
              draft.translation.fallback.provider,
              draft.translation.fallback.model,
              oc,
              true,
              mode,
            );
            if (res === BACK_SYMBOL) process.exit(0);
            draft.translation.fallback.provider = res.provider;
            if (mode === "both" || mode === "model")
              draft.translation.fallback.model = res.model;
          }
        }

        if (options.review) {
          const newReview = await promptReviewSettings(
            draft.translation.review,
          );
          if (newReview === BACK_SYMBOL) process.exit(0);
          if (newReview === undefined) delete draft.translation.review;
          else draft.translation.review = newReview;
        }

        const finalConfig = { ...rawConfig, ...draft };
        fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 4));
        p.outro(color.success("Configuration successfully updated!"));
        return;
      }

      if (hasAction && options.i18nPath !== undefined) {
        p.log.error(
          color.error(
            "The -i option cannot be used alongside translation commands.",
          ),
        );
        process.exit(1);
      }

      // Processes temporary configuration overrides for a single CLI execution
      const applyOverrides = async (cfg) => {
        if (!cfg) return cfg;
        if (typeof options.defaultLang === "string")
          cfg.defaultLanguage = options.defaultLang;

        const hasTranslationOverride =
          options.provider !== undefined ||
          options.model !== undefined ||
          options.fallbackProvider !== undefined ||
          options.fallbackModel !== undefined ||
          options.review !== undefined;

        if (hasTranslationOverride) {
          cfg.translation = cfg.translation || {};
          cfg.translation.default = cfg.translation.default || {};

          if (options.provider === true || options.model === true) {
            let mode = null;
            if (options.provider === true && options.model === true)
              mode = "both";
            else if (options.provider === true) mode = "provider";
            else if (options.model === true) mode = "model";

            const res = await promptForProviderAndModel(
              cfg.translation.default.provider,
              cfg.translation.default.model,
              oc,
              false,
              mode,
            );
            if (res === BACK_SYMBOL) process.exit(0);
            cfg.translation.default = res;
          } else if (
            typeof options.provider === "string" ||
            typeof options.model === "string"
          ) {
            if (typeof options.provider === "string") {
              cfg.translation.default.provider = options.provider;

              if (options.model === undefined) {
                cfg.translation.default.model = undefined;
              }
            }
            if (typeof options.model === "string") {
              cfg.translation.default.model = options.model;
            }

            const { getRequiredEnvVars } = await import("./utils/providers.js");
            const { promptMissingKey } = await import("./utils/auth.js");
            const requiredKeys = getRequiredEnvVars(
              cfg.translation.default.provider,
            );

            for (const envVar of requiredKeys) {
              const keyRes = await promptMissingKey(
                envVar,
                cfg.translation.default.provider,
                oc,
              );
              if (keyRes === BACK_SYMBOL) process.exit(0);
            }

            if (
              !cfg.translation.default.model ||
              cfg.translation.default.model === "model_code"
            ) {
              const { selectModel } = await import("./utils/model-picker.js");
              const modRes = await selectModel(
                cfg.translation.default.provider,
                undefined,
                oc,
              );
              if (modRes === BACK_SYMBOL) process.exit(0);
              cfg.translation.default.model = modRes;
            }
          }

          if (
            options.fallbackProvider !== undefined ||
            options.fallbackModel !== undefined
          ) {
            cfg.translation.fallback = cfg.translation.fallback || {};
            if (typeof options.fallbackProvider === "string")
              cfg.translation.fallback.provider = options.fallbackProvider;
            if (typeof options.fallbackModel === "string")
              cfg.translation.fallback.model = options.fallbackModel;
          }

          if (options.review) {
            const newReview = await promptReviewSettings(
              cfg.translation.review,
            );
            if (newReview !== BACK_SYMBOL && newReview !== undefined) {
              cfg.translation.review = newReview;
            }
          }
        }
        return cfg;
      };

      const parseArgs = (flagS, flagL) => {
        const idx = process.argv.findIndex((a) => a === flagS || a === flagL);
        if (idx === -1) return null;
        const rem = process.argv.slice(idx + 1);
        const vals = [];
        for (const a of rem) {
          if (a.startsWith("-")) break;
          vals.push(a);
        }
        if (vals.length === 0) return null;
        return vals
          .join(" ")
          .replace(/\s*,\s*/g, ",")
          .replace(/\s+/g, ",")
          .replace(/,+/g, ",")
          .replace(/^,|,$/g, "");
      };

      const getLangs = async (optVal, flagS, flagL, promptFn, forceAction) => {
        if (
          !forceAction &&
          !optVal &&
          !process.argv.includes(flagS) &&
          !process.argv.includes(flagL)
        )
          return null;
        const config = await getConfig();
        if (!config || config.translation?.provider === "provider_code") {
          p.cancel("Tradux is not yet configured. Run: npx tradux init");
          process.exit(1);
        }
        if (optVal === undefined || optVal === true || optVal === "")
          return await promptFn(config);
        const parsed = parseArgs(flagS, flagL);
        return parsed || optVal;
      };

      if (options.remove !== undefined) {
        const languages = await getLangs(
          options.remove,
          "-r",
          "--remove",
          promptRemoveLanguages,
        );
        if (languages === BACK_SYMBOL) process.exit(0);
        if (languages) {
          const config = await getConfig();
          await executeRemoveLanguages(languages, config);
          p.outro(color.success("Language files removed successfully."));
        }
      } else if (options.update !== undefined) {
        const languages = await getLangs(
          options.update,
          "-u",
          "--update",
          promptUpdateAllLanguages,
        );
        if (languages === BACK_SYMBOL) process.exit(0);
        if (languages) {
          let config = await getConfig();
          config = await applyOverrides(config);
          await updateLanguageFiles(languages, config);
        }
      } else if (options.translate !== undefined) {
        const languages = await getLangs(
          options.translate,
          "-t",
          "--translate",
          promptLanguages,
          true,
        );
        if (languages === BACK_SYMBOL) process.exit(0);
        if (languages) {
          let config = await getConfig();
          config = await applyOverrides(config);

          // Prevents the "Skipping existing translation" warning by excluding files that already exist,
          // but only if the user utilized the interactive prompt where existing files are pre-selected.
          const isInteractive =
            options.translate === true || options.translate === undefined;
          let finalLangs = languages;

          if (isInteractive) {
            const i18nAbsPath = fileManager.getAbsoluteI18nPath(
              config.i18nPath,
            );
            finalLangs = languages
              .split(",")
              .filter(
                (l) => !fs.existsSync(path.join(i18nAbsPath, `${l}.json`)),
              )
              .join(",");
          }

          if (finalLangs) {
            await translateFiles(finalLangs, config);
          }
        }
      } else {
        showHelp();
      }
    } catch (error) {
      logger.error(`\nError: ${error.message}\n`);
      process.exit(1);
    }
  });

program.configureHelp({
  formatHelp: () => {
    showHelp();
    return "";
  },
});

if (process.argv.length === 2) {
  (async () => {
    const config = await getConfig();
    await runInteractiveMenu(config, packageJson.version);
  })();
} else {
  program.parse();
}
