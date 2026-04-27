/**
 * commands/init.js — Interactive Configuration
 */
import fs from "fs";
import path from "path";
import * as p from "@clack/prompts";
import { color, logger } from "../utils/logger.js";
import { printBanner } from "../utils/ui.js";
import {
  loadConfig,
  validateAndFixConfig,
  checkEnvCredentials,
} from "../utils/config.js";
import { availableLanguages } from "../utils/languages.js";
import { translateFiles } from "../core/translator.js";
import { fileManager } from "../core/file-manager.js";
import { PROVIDERS } from "../utils/providers.js";

import {
  promptReviewSettings,
  oc,
  promptForProviderAndModel,
  promptForLanguages,
  BACK_SYMBOL,
} from "../utils/prompt-helpers.js";

export async function runInitCommand(opts, packageVersion) {
  const configPath = path.join(process.cwd(), "tradux.config.json");
  const hasFlags =
    opts.provider ||
    opts.model ||
    opts.defaultLang ||
    opts.languages ||
    opts.i18nPath;

  await validateAndFixConfig(process.cwd(), true);

  if (hasFlags) {
    fileManager.clearCache();
    const existing = (await loadConfig()) || {};

    const langs = opts.languages
      ? opts.languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
      : existing.availableLanguages;

    const newConfig = {
      translation: {
        ...(existing.translation || {}),
        default: {
          ...(existing.translation?.default || {}),
          ...(opts.provider && { provider: opts.provider }),
          ...(opts.model && { model: opts.model }),
        },
      },
      ...existing,
      ...(opts.i18nPath && { i18nPath: opts.i18nPath }),
      ...(langs && { availableLanguages: langs }),
      ...(opts.defaultLang && { defaultLanguage: opts.defaultLang }),
    };

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));
    await validateAndFixConfig(process.cwd(), true);

    p.log.success(
      color.success("\n  tradux.config.json saved (non-interactive).\n"),
    );
    return;
  }

  try {
    printBanner(packageVersion);

    await validateAndFixConfig(process.cwd(), true);
    fileManager.clearCache();

    let rawConfig = {};
    if (fs.existsSync(configPath)) {
      try {
        rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch (e) {}
    }

    // Positions translation at the top of the draft state for immediate persistence structure
    let draft = {
      i18nPath: rawConfig.i18nPath || "./i18n",
      defaultLanguage: rawConfig.defaultLanguage || "",
      availableLanguages: rawConfig.availableLanguages || [],
      translation: rawConfig.translation || {
        default: { provider: "", model: "" },
      },
    };

    const {
      i18nPath,
      defaultLanguage,
      availableLanguages: al,
      translation,
      ...extraKeys
    } = rawConfig;

    const originalLanguages = [...(draft.availableLanguages || [])];

    const fmt = (v) => (v ? v : "not set");
    const fmtLs = (arr) => (arr?.length ? arr.join(", ") : "not set");

    const buildConfigNote = () => {
      const provName = draft.translation?.default?.provider
        ? PROVIDERS[draft.translation.default.provider]?.name ||
          draft.translation.default.provider
        : null;
      const provModel = draft.translation?.default?.model;
      const fb = draft.translation?.fallback;
      const fbName = fb?.provider
        ? PROVIDERS[fb.provider]?.name || fb.provider
        : null;
      const rv = draft.translation?.review;
      const rvName = rv?.provider
        ? PROVIDERS[rv.provider]?.name || rv.provider
        : null;

      return [
        color.tertiary(`i18n path - ${fmt(draft.i18nPath)}`),
        color.tertiary(`Languages - ${fmtLs(draft.availableLanguages)}`),
        color.tertiary(`Default   - ${fmt(draft.defaultLanguage)}`),
        color.tertiary(
          `Provider  - ${fmt(provName)} ${provName && provModel ? " / " + provModel : ""}`,
        ),
        color.tertiary(
          `Fallback  - ` + (fbName ? fbName + " / " + fb.model : "none"),
        ),
        color.tertiary(
          `Review    - ${rv?.enabled ? "enabled" + (rvName ? ` (${rvName} / ${rv.model || "same"})` : "") : "off"}`,
        ),
      ].join("\n");
    };

    while (true) {
      console.clear();
      printBanner(packageVersion);
      p.note(buildConfigNote(), color.secondary("Current settings"));

      logger.info3("  ↑/↓: navigate  ·  enter: select  ·  esc: back");

      const action = oc(
        await p.select({
          message: color.primary("Menu Config\n"),
          options: [
            {
              value: "path",
              label: "i18n path",
              hint: color.tertiary(draft.i18nPath || "not set"),
            },
            {
              value: "translate",
              label: "Translate",
              hint: color.tertiary(
                draft.availableLanguages?.join(", ") || "not set",
              ),
            },
            {
              value: "update",
              label: "Update",
              hint: color.tertiary("Re-translate changed keys"),
            },
            {
              value: "default",
              label: "Default language",
              hint: color.tertiary(draft.defaultLanguage || "not set"),
            },
            {
              value: "provider",
              label: "Provider & model",
              hint: color.tertiary(
                draft.translation?.default?.provider
                  ? `${draft.translation.default.provider} / ${draft.translation.default.model}`
                  : "not set",
              ),
            },
            {
              value: "fallback",
              label: "Fallback provider",
              hint: color.tertiary(
                draft.translation?.fallback
                  ? `${draft.translation.fallback.provider} / ${draft.translation.fallback.model}`
                  : "none",
              ),
            },
            {
              value: "review",
              label: "Translation review",
              hint: color.tertiary(
                draft.translation?.review?.enabled ? "enabled" : "off",
              ),
            },
            { value: "save", label: color.success("Save & exit") },
            { value: "exit", label: color.error("Discard & exit") },
          ],
        }),
      );

      if (action === "exit") {
        const addedLangs = (draft.availableLanguages || []).filter(
          (l) => !originalLanguages.includes(l),
        );
        const i18nAbsPath = fileManager.getAbsoluteI18nPath(draft.i18nPath);
        const langsWithFiles = addedLangs.filter((l) =>
          fs.existsSync(path.join(i18nAbsPath, `${l}.json`)),
        );

        if (langsWithFiles.length > 0) {
          const discardChoice = oc(
            await p.select({
              message: color.warn(
                `Languages added this session: ${langsWithFiles.join(", ")}. What should happen to their files?`,
              ),
              options: [
                {
                  value: "delete",
                  label: color.error("Delete files + revert config"),
                },
                {
                  value: "keep",
                  label: color.success("Keep files, discard config changes"),
                },
                { value: "back", label: color.warn("Cancel (go back)") },
              ],
            }),
          );
          if (discardChoice === "back") continue;
          if (discardChoice === "delete") {
            for (const l of langsWithFiles) {
              const fp = path.join(i18nAbsPath, `${l}.json`);
              if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
          }
        }

        fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 4));
        await validateAndFixConfig(process.cwd(), true);

        p.outro(color.warn("Changes discarded and configuration reverted."));
        process.exit(0);
      }

      if (action === "save") {
        const newConfig = {
          ...extraKeys,
          i18nPath: draft.i18nPath,
          defaultLanguage: draft.defaultLanguage,
          availableLanguages: draft.availableLanguages,
          translation: draft.translation,
        };
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));

        await validateAndFixConfig(process.cwd(), true);
        fileManager.clearCache();
        const cfg = await loadConfig();

        if (cfg) {
          const hasDefault =
            cfg.translation?.default?.provider &&
            cfg.translation.default.provider !== "provider_code";
          const hasFallback =
            cfg.translation?.fallback?.provider &&
            cfg.translation.fallback.provider !== "provider_code";

          if (!hasDefault && !hasFallback) {
            p.outro(
              color.warn(
                "Config saved! Note: You must configure at least one Translation Provider to use Tradux.",
              ),
            );
          } else if (!checkEnvCredentials(cfg)) {
            p.outro(
              color.warn(
                "Config saved! Add the required API key(s) to your .env, then run: npx tradux -t lang",
              ),
            );
          } else {
            const i18nAbsPath = fileManager.getAbsoluteI18nPath(cfg.i18nPath);
            const nonDefaultLangs = (cfg.availableLanguages || []).filter(
              (l) => l !== cfg.defaultLanguage,
            );
            const missingLangs = nonDefaultLangs.filter(
              (l) => !fs.existsSync(path.join(i18nAbsPath, `${l}.json`)),
            );

            if (missingLangs.length > 0) {
              const translate = oc(
                await p.confirm({
                  message: color.secondary(
                    `Translate to ${missingLangs.join(", ")} now?`,
                  ),
                  initialValue: true,
                }),
              );
              if (translate) {
                console.log("");
                await translateFiles(missingLangs.join(","), cfg);
              }
            }
            p.outro(
              color.success(
                "Tradux is ready! Run: npx tradux -t lang to translate.",
              ),
            );
          }
        }
        break;
      }

      if (action === "path") {
        const i18nPath = oc(
          await p.text({
            message: color.secondary(
              "Relative path to your i18n JSON files:\n",
            ),
            initialValue: draft.i18nPath || "./i18n",
          }),
          true,
        );
        if (i18nPath === BACK_SYMBOL) continue;
        if (i18nPath !== undefined) draft.i18nPath = i18nPath;
      }

      if (action === "translate") {
        const result = await promptForLanguages(draft.availableLanguages);
        if (result === BACK_SYMBOL) continue;

        let finalResultLangs = [...result];
        const removedLangs = draft.availableLanguages.filter(
          (l) => !finalResultLangs.includes(l),
        );
        const newLangs = finalResultLangs.filter(
          (l) => !originalLanguages.includes(l) && l !== draft.defaultLanguage,
        );

        if (removedLangs.length > 0) {
          const i18nAbsPath = fileManager.getAbsoluteI18nPath(draft.i18nPath);
          const langsWithFiles = removedLangs.filter((l) =>
            fs.existsSync(path.join(i18nAbsPath, `${l}.json`)),
          );

          if (langsWithFiles.length > 0) {
            const confirmDelete = oc(
              await p.confirm({
                message: color.warn(
                  `Deselecting will permanently delete files for: ${langsWithFiles.join(", ")}. Are you sure?`,
                ),
                initialValue: false,
              }),
              true,
            );
            if (confirmDelete === BACK_SYMBOL || !confirmDelete) continue;

            for (const l of langsWithFiles) {
              const fp = path.join(i18nAbsPath, `${l}.json`);
              if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
            p.log.success(
              color.success(`Deleted files for: ${langsWithFiles.join(", ")}`),
            );
            await p.text({
              message: color.secondary("Press Enter to continue..."),
            });
          }
        }

        let willTranslate = false;
        if (newLangs.length > 0) {
          const hasDefault =
            draft.translation?.default?.provider &&
            draft.translation.default.provider !== "provider_code";
          const hasFallback =
            draft.translation?.fallback?.provider &&
            draft.translation.fallback.provider !== "provider_code";
          const isConfigured =
            (hasDefault || hasFallback) && draft.defaultLanguage;

          if (!isConfigured) {
            p.log.error(
              color.error(
                "You must configure at least one Translation Provider (Primary or Fallback) and a Default Language before translating.",
              ),
            );
            await p.text({
              message: color.secondary("Press Enter to continue..."),
            });

            finalResultLangs = finalResultLangs.filter(
              (l) => !newLangs.includes(l),
            );
          } else {
            willTranslate = true;
          }
        }

        draft.availableLanguages = finalResultLangs;
        if (!finalResultLangs.includes(draft.defaultLanguage))
          draft.defaultLanguage = "";

        const interimConfig = {
          ...extraKeys,
          i18nPath: draft.i18nPath,
          defaultLanguage: draft.defaultLanguage,
          availableLanguages: draft.availableLanguages,
          translation: draft.translation,
        };

        fs.writeFileSync(configPath, JSON.stringify(interimConfig, null, 4));
        await validateAndFixConfig(process.cwd(), false);
        fileManager.clearCache();

        if (willTranslate) {
          const cfg = await loadConfig();
          if (cfg) {
            if (!checkEnvCredentials(cfg)) {
              await p.text({
                message: color.secondary("Press Enter to continue..."),
              });
              continue;
            }

            const doTranslate = oc(
              await p.confirm({
                message: color.secondary(
                  `Translate to ${newLangs.join(", ")} now?`,
                ),
                initialValue: true,
              }),
              true,
            );

            if (doTranslate !== BACK_SYMBOL && doTranslate) {
              console.log("");
              await translateFiles(newLangs.join(","), cfg);
              await p.text({
                message: color.secondary("Press Enter to continue..."),
              });
            }
          }
        }
      }

      if (action === "update") {
        const hasDefault =
          draft.translation?.default?.provider &&
          draft.translation.default.provider !== "provider_code";
        const hasFallback =
          draft.translation?.fallback?.provider &&
          draft.translation.fallback.provider !== "provider_code";
        const isConfigured =
          (hasDefault || hasFallback) && draft.defaultLanguage;

        if (!isConfigured) {
          p.log.error(
            color.error(
              "You must configure at least one Translation Provider and a Default Language before updating.",
            ),
          );
          await p.text({
            message: color.secondary("Press Enter to continue..."),
          });
          continue;
        }

        // Usa Dynamic Import para não criar ciclos infinitos de dependências com o router
        const { promptUpdateAllLanguages } = await import("./interactive.js");
        const langsToUpdate = await promptUpdateAllLanguages(draft);

        if (langsToUpdate === BACK_SYMBOL || !langsToUpdate) continue;

        // Guarda as configurações atuais para que o motor use exatamente o que está no ecrã
        const interimConfig = {
          translation: draft.translation,
          ...extraKeys,
          i18nPath: draft.i18nPath,
          availableLanguages: draft.availableLanguages,
          defaultLanguage: draft.defaultLanguage,
        };
        fs.writeFileSync(configPath, JSON.stringify(interimConfig, null, 4));
        await validateAndFixConfig(process.cwd(), false);
        fileManager.clearCache();

        const cfg = await loadConfig();
        if (cfg) {
          if (!checkEnvCredentials(cfg)) {
            await p.text({
              message: color.secondary("Press Enter to continue..."),
            });
            continue;
          }
          console.log("");
          const { updateLanguageFiles } = await import("../core/translator.js");
          await updateLanguageFiles(langsToUpdate, cfg);
          await p.text({
            message: color.secondary("Press Enter to continue..."),
          });
        }
      }

      if (action === "default") {
        const langs = draft.availableLanguages?.length
          ? draft.availableLanguages
          : availableLanguages.map((l) => l.value);
        const opts = langs.map((v) => {
          const info = availableLanguages.find((al) => al.value === v);
          return { value: v, label: info ? info.name : v, hint: v };
        });
        const defaultLanguage = oc(
          await p.select({
            message: color.secondary("Source (default) language:\n"),
            options: opts,
            initialValue: draft.defaultLanguage || opts[0]?.value,
          }),
          true,
        );
        if (defaultLanguage === BACK_SYMBOL) continue;
        if (defaultLanguage !== undefined)
          draft.defaultLanguage = defaultLanguage;
      }

      if (action === "provider") {
        draft.translation.default = draft.translation.default || {};
        const res = await promptForProviderAndModel(
          draft.translation.default.provider,
          draft.translation.default.model,
          oc,
          false,
        );
        if (res !== BACK_SYMBOL) {
          draft.translation.default = res;
        }
      }

      if (action === "fallback") {
        while (true) {
          const hasFallback = !!draft.translation?.fallback;
          const choice = oc(
            await p.select({
              message: color.secondary("Fallback provider:\n"),
              options: [
                {
                  value: "configure",
                  label: hasFallback ? "Change fallback" : "Add fallback",
                },
                ...(hasFallback
                  ? [{ value: "remove", label: color.error("Remove fallback") }]
                  : []),
                { value: "back", label: color.warn("Back") },
              ],
            }),
            true,
          );

          if (choice === BACK_SYMBOL || choice === "back") break;

          if (choice === "configure") {
            const res = await promptForProviderAndModel(
              draft.translation.fallback?.provider,
              draft.translation.fallback?.model,
              oc,
              true,
            );
            if (res === BACK_SYMBOL) continue;

            draft.translation.fallback = res;
            break;
          } else if (choice === "remove") {
            delete draft.translation.fallback;
            break;
          }
        }
      }

      if (action === "review") {
        const newReview = await promptReviewSettings(draft.translation?.review);
        if (newReview === BACK_SYMBOL) continue;

        if (newReview === undefined) {
          delete draft.translation.review;
        } else {
          draft.translation.review = newReview;
        }
      }
    }
  } catch (error) {
    p.log.error(
      color.error("Failed to initialize tradux: " + error.message, "\n"),
    );
    process.exit(1);
  }
}
