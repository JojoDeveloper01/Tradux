import * as p from "@clack/prompts";
import { color } from "./logger.js";
import {
  PROVIDERS,
  PROVIDER_ENV_MAP,
  getDefaultModel,
  getRequiredEnvVars,
} from "./providers.js";
import { promptMissingKey } from "./auth.js";
import { selectModel } from "./model-picker.js";
import { availableLanguages } from "./languages.js";

export const BACK_SYMBOL = Symbol("BACK");

export function oc(value, allowBack = false) {
  if (p.isCancel(value)) {
    if (allowBack) return BACK_SYMBOL;
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  return value;
}

export async function promptForProviderAndModel(
  initialProvider,
  initialModel,
  ocHelper,
  isFallback = false,
  mode = "both",
) {
  let step = mode === "model" ? 2 : 1;
  let provider =
    initialProvider === "provider_code" ? undefined : initialProvider;
  let model = initialModel === "model_code" ? undefined : initialModel;

  while (step > 0 && step <= 2) {
    if (step === 1) {
      const providerChoices = Object.entries(PROVIDERS).map(
        ([value, info]) => ({
          value,
          label: info.name,
          hint: info.description,
        }),
      );
      const label = isFallback ? "Fallback provider" : "Translation provider";

      const res = ocHelper(
        await p.autocomplete({
          message: color.secondary(`${label}:`),
          options: providerChoices,
          initialValue: provider,
        }),
        true,
      );

      if (res === BACK_SYMBOL) return BACK_SYMBOL;
      provider = res;
      step = mode === "provider" ? 3 : 2;
    } else if (step === 2) {
      if (!provider) {
        p.log.error(
          color.error(
            "A provider must be configured before selecting a model.",
          ),
        );
        process.exit(1);
      }

      // Automatically requests all required environment variables for the chosen provider
      const requiredKeys = getRequiredEnvVars(provider);
      let canceled = false;
      for (const envVar of requiredKeys) {
        const keyRes = await promptMissingKey(envVar, provider, ocHelper);
        if (keyRes === BACK_SYMBOL) {
          canceled = true;
          break;
        }
      }

      if (canceled) {
        if (mode === "model") return BACK_SYMBOL;
        step--;
        continue;
      }

      const res = await selectModel(provider, model, ocHelper);
      if (res === BACK_SYMBOL) {
        if (mode === "model") return BACK_SYMBOL;
        step--;
        continue;
      }

      model = res;
      step++;
    }
  }
  return { provider, model: model || getDefaultModel(provider) };
}

export async function promptReviewSettings(currentReviewConfig) {
  let config = currentReviewConfig || {};

  while (true) {
    const reviewEnabled = !!config.enabled;
    const rvProvName = config.provider
      ? PROVIDERS[config.provider]?.name || config.provider
      : null;

    const rvChoice = oc(
      await p.select({
        message: color.secondary("Translation review:\n"),
        options: [
          {
            value: "toggle",
            label: reviewEnabled ? "Disable review step" : "Enable review step",
            hint: reviewEnabled
              ? "Removes the extra quality-check pass"
              : "Adds a second pass — uses more tokens",
          },
          ...(reviewEnabled
            ? [
                {
                  value: "configure",
                  label: "Change review provider/model",
                  hint: rvProvName
                    ? `${rvProvName} / ${config.model || "same"}`
                    : "same as primary",
                },
              ]
            : []),
          { value: "back", label: color.warn("Back") },
        ],
      }),
      true,
    );

    if (rvChoice === BACK_SYMBOL || rvChoice === "back") return BACK_SYMBOL;

    if (rvChoice === "toggle") {
      return reviewEnabled ? undefined : { enabled: true };
    } else if (rvChoice === "configure") {
      const newSettings = await promptForProviderAndModel(
        config.provider,
        config.model,
        oc,
        false,
        "both",
      );
      if (newSettings === BACK_SYMBOL) continue;

      if (newSettings) return { enabled: true, ...newSettings };
    }
  }
}

export async function promptForLanguages(currentSelected = []) {
  const preSelected = Array.isArray(currentSelected) ? currentSelected : [];

  const languages = oc(
    await p.autocompleteMultiselect({
      message: color.secondary("Target languages:"),
      options: availableLanguages.map((l) => ({
        value: l.value,
        label: l.name,
        hint: l.value,
      })),
      initialValues: preSelected,
      required: false,
    }),
    true,
  );

  if (languages === BACK_SYMBOL) return BACK_SYMBOL;

  return Array.isArray(languages) ? languages : preSelected;
}
