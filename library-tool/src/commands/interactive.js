/**
 * commands/interactive.js — Quick Menus and Operations
 */
import fs from "fs";
import path from "path";
import * as p from "@clack/prompts";
import { logger, color } from "../utils/logger.js";
import { printBanner } from "../utils/ui.js";
import { availableLanguages } from "../utils/languages.js";
import { translateFiles, updateLanguageFiles } from "../core/translator.js";
import { fileManager } from "../core/file-manager.js";
import { oc, BACK_SYMBOL } from "../utils/prompt-helpers.js";

export function showHelp() {
  const configPath = path.join(process.cwd(), "tradux.config.json");
  const configured = fs.existsSync(configPath);

  const cmd = (name, desc) => logger.info2(name.padEnd(30) + desc);

  logger.info(`\nTradux — Automated i18n CLI\n`);

  logger.info("USAGE");
  cmd("npx tradux", "Launch interactive menu");
  cmd("npx tradux <command> [flags]", "");
  console.log("");

  logger.info("COMMANDS");
  cmd("init", "Configure Tradux interactively");
  console.log("");

  logger.info("FLAGS (MAIN ACTIONS)");
  cmd(
    "-t, --translate [langs]",
    "Translate to specific languages (e.g., -t es,pt)",
  );
  cmd("-u, --update [langs]", "Update changed keys in all languages");
  cmd("-r, --remove [langs]", "Remove language files");
  console.log("");

  logger.info("FLAGS (OVERRIDES & CONFIG)");
  cmd("-p, --provider [name]", "Override or set translation provider");
  cmd("-m, --model [name]", "Override or set model name");
  cmd("-i, --i18n-path [path]", "Set i18n directory path");
  cmd("-d, --default-lang [code]", "Override or set default language");
  cmd("-f, --fallback-provider [id]", "Set fallback provider");
  cmd("-F, --fallback-model [id]", "Set fallback model");
  cmd("-R, --review", "Enable translation quality review step");
  cmd("-h, --help", "Show this help");
  cmd("-v, --version", "Print version");
  console.log("");

  logger.info3("Run 'npx tradux -h' for this message.");

  if (!configured) {
    logger.error("\nNo config found. Run 'npx tradux init' to get started.");
  } else {
    console.log("");
  }
}

export async function promptLanguages(config) {
  p.intro(color.primary("Language Selection"));

  const currentSelected = config?.availableLanguages || [];

  const languages = oc(
    await p.autocompleteMultiselect({
      message: color.secondary("Target languages:"),
      options: availableLanguages.map((l) => ({
        value: l.value,
        label: l.name,
        hint: l.value,
      })),
      initialValues: currentSelected,
      required: false,
    }),
    true,
  );

  if (languages === BACK_SYMBOL) return BACK_SYMBOL;

  const selected = Array.isArray(languages) ? languages : currentSelected;

  // Isolates newly selected languages by filtering out the ones that already exist
  const newlySelected = selected.filter((l) => !currentSelected.includes(l));

  if (!newlySelected.length) {
    p.outro(color.warn("No new languages selected."));
    process.exit(0);
  }

  const selectedNames = availableLanguages
    .filter((lang) => newlySelected.includes(lang.value))
    .map((lang) => lang.name)
    .join(", ");
  p.log.success(color.success(`Selected: ${selectedNames}\n`));

  return newlySelected.join(",");
}

export async function promptUpdateAllLanguages(config) {
  p.intro(color.primary("Update languages"));
  const confirm = oc(
    await p.confirm({
      message: color.secondary(
        "This will re-translate all existing languages from the default file. Continue?\n",
      ),
      initialValue: true,
    }),
    true,
  );

  if (confirm === BACK_SYMBOL || !confirm) return BACK_SYMBOL;

  const languagesToUpdate = config.availableLanguages.filter(
    (lang) => lang !== config.defaultLanguage,
  );
  if (languagesToUpdate.length === 0) {
    p.outro(color.warn("No languages to update."));
    process.exit(0);
  }

  const selectedNames = languagesToUpdate
    .map((lang) => {
      const langInfo = availableLanguages.find((al) => al.value === lang);
      return langInfo ? langInfo.name : lang;
    })
    .join(", ");

  p.log.info(color.warn(`Updating: ${selectedNames}\n`));
  p.log.info(color.primary(`Base language: ${config.defaultLanguage}`));
  return languagesToUpdate.join(",");
}

export async function promptRemoveLanguages(config) {
  const removableLanguages = config.availableLanguages.filter(
    (lang) => lang !== config.defaultLanguage,
  );
  if (removableLanguages.length === 0) {
    p.cancel(color.warn("No languages available to remove."));
    process.exit(0);
  }

  p.intro(color.primary("Remove languages"));
  const opts = removableLanguages.map((lang) => {
    const langInfo = availableLanguages.find((al) => al.value === lang);
    return { value: lang, label: langInfo ? langInfo.name : lang, hint: lang };
  });

  const selected = oc(
    await p.multiselect({
      message: color.secondary("Choose languages to remove:\n"),
      options: opts,
      required: true,
    }),
    true,
  );

  if (selected === BACK_SYMBOL) return BACK_SYMBOL;

  const confirmed = oc(
    await p.confirm({
      message: color.warn(
        "This will permanently delete these files. Are you sure?\n",
      ),
      initialValue: false,
    }),
    true,
  );

  if (confirmed === BACK_SYMBOL || !confirmed) return BACK_SYMBOL;

  return selected.join(",");
}

export async function runInteractiveMenu(config, packageVersion) {
  const configPath = path.join(process.cwd(), "tradux.config.json");

  while (true) {
    console.clear();
    printBanner(packageVersion);

    if (!fs.existsSync(configPath)) {
      p.log.warn(
        color.error(
          "No tradux.config.json found. Run the setup wizard to get started.",
        ),
      );
    }

    logger.info3("\n  ↑/↓: navigate  ·  enter: select  ·  esc: back");

    const action = oc(
      await p.select({
        message: color.primary("Menu\n"),
        options: [
          {
            value: "translate",
            label: "Translate",
            hint: color.tertiary(
              "Generate translation files for new languages",
            ),
          },
          {
            value: "update",
            label: "Update",
            hint: color.tertiary(
              "Re-translate keys that changed since last run",
            ),
          },
          {
            value: "init",
            label: "Configure",
            hint: color.tertiary("Set provider, languages, model"),
          },
          {
            value: "help",
            label: color.warn("Help"),
            hint: color.tertiary("Show usage reference"),
          },
          { value: "exit", label: color.error("Exit") },
        ],
      }),
    );

    if (action === "help") {
      showHelp();
      return;
    }
    if (action === "exit") process.exit(0);
    if (action === "init") {
      const { spawnSync } = await import("child_process");
      spawnSync(process.execPath, [process.argv[1], "init"], {
        stdio: "inherit",
      });
      return;
    }
    if (!config) {
      p.cancel(color.error("No config found. Run: npx tradux init first."));
      return;
    }

    if (action === "translate") {
      const languages = await promptLanguages(config);
      if (languages === BACK_SYMBOL) continue;

      if (languages) {
        await translateFiles(languages, config);
        break;
      }
    } else if (action === "update") {
      const languages = await promptUpdateAllLanguages(config);
      if (languages === BACK_SYMBOL) continue;

      if (languages) {
        await updateLanguageFiles(languages, config);
        break;
      }
    }
  }
}
