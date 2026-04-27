/**
 * model-picker.js — Fetching and selecting AI models interactively
 */
import * as p from "@clack/prompts";
import { PROVIDERS, PROVIDER_ENV_MAP, getDefaultModel } from "./providers.js";
import { color } from "./logger.js";

/** Per-provider model cache — keyed by provider id. */
const _modelCache = new Map();

/**
 * Returns autocomplete choices for a provider's model list.
 * If the provider has `modelsFetch`, it calls the live API (with proper auth/headers).
 * Falls back to the hardcoded `models` list, then null (free-text input).
 */
export async function fetchModelChoices(provider) {
  const info = PROVIDERS[provider];
  if (!info) return null;

  if (info.modelsFetch) {
    if (_modelCache.has(provider)) return _modelCache.get(provider);

    const {
      url,
      authStyle,
      headers: extraHeaders = {},
      transform,
    } = info.modelsFetch;
    const envMap = PROVIDER_ENV_MAP[provider];
    const apiKey = envMap?.apiKey ? process.env[envMap.apiKey] : null;

    const headers = { ...extraHeaders };
    if (apiKey) {
      if (authStyle === "bearer") headers["Authorization"] = `Bearer ${apiKey}`;
      if (authStyle === "x-api-key") headers["x-api-key"] = apiKey;
    }

    let fetchUrl =
      authStyle === "query" && apiKey ? `${url}?key=${apiKey}` : url;

    if (authStyle === "cloudflare") {
      const cfMap = PROVIDER_ENV_MAP.cloudflare;
      const accountId = cfMap?.accountId ? process.env[cfMap.accountId] : null;
      const apiToken = cfMap?.apiToken ? process.env[cfMap.apiToken] : null;
      if (!accountId || !apiToken)
        throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or API_TOKEN");
      fetchUrl = url.replace("{accountId}", accountId);
      headers["Authorization"] = `Bearer ${apiToken}`;
    }

    const s = p.spinner();
    s.start(`Fetching models from ${info.name}…`);
    try {
      const res = await fetch(fetchUrl, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const models = transform(json)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((m) => ({
          value: m.id,
          label: m.id,
          hint: m.name && m.name !== m.id ? m.name : undefined,
        }));

      if (models.length > 0) {
        s.stop(`${models.length} models loaded`);
        _modelCache.set(provider, models);
        return models;
      }
      s.stop("No models returned, using defaults");
    } catch (err) {
      s.stop(`Model fetch failed: ${err.message}`);
    }
  }

  if (info.models?.length)
    return info.models.map((m) => ({ value: m, label: m }));
  return null;
}

/**
 * Model picker: autocomplete search when models are available, text input otherwise.
 */
export async function selectModel(provider, currentModel, ocHelper) {
  const choices = await fetchModelChoices(provider);

  if (!choices || choices.length === 0) {
    return ocHelper(
      await p.text({
        message: "Model name:",
        placeholder: getDefaultModel(provider) || "e.g. gpt-4o",
        initialValue: currentModel || "",
      }),
      true,
    );
  }

  return ocHelper(
    await p.autocomplete({
      message: color.secondary("Select a model:"),
      options: choices,
      initialValue: currentModel || choices[0]?.value,
    }),
    true,
  );
}
