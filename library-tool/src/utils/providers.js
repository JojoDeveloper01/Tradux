/**
 * providers.js — Translation Provider Registry
 *
 * Single source of truth for all supported AI translation providers.
 * Imported by translator.js and config.js to eliminate duplication.
 *
 * Supported providers:
 *   openrouter — Access hundreds of models via a unified API (default)
 *   openai     — GPT-4o and other OpenAI models
 *   anthropic  — Claude models
 *   google     — Gemini models
 *   cloudflare — Cloudflare Workers AI (legacy, basic quality)
 *   custom     — Any OpenAI-compatible endpoint (set baseURL in config)
 */

/**
 * Maps each provider to the credential fields it requires and their env var names.
 * Object format (field → env var) lets translator.js build the request payload dynamically.
 *
 * e.g. PROVIDER_ENV_MAP.cloudflare = { apiToken: "CLOUDFLARE_API_TOKEN", accountId: "CLOUDFLARE_ACCOUNT_ID" }
 */
export const PROVIDER_ENV_MAP = {
  openrouter: { apiKey: "OPENROUTER_API_KEY" },
  openai: { apiKey: "OPENAI_API_KEY" },
  anthropic: { apiKey: "ANTHROPIC_API_KEY" },
  google: { apiKey: "GOOGLE_AI_API_KEY" },
  cloudflare: {
    apiToken: "CLOUDFLARE_API_TOKEN",
    accountId: "CLOUDFLARE_ACCOUNT_ID",
  },
  copilot: { apiKey: "GITHUB_TOKEN" },
  custom: { apiKey: "CUSTOM_API_KEY" },
};

/**
 * Full metadata for each provider.
 *
 * `modelsFetch` — when present, the init wizard fetches the live model list.
 *   url:       the endpoint to call
 *   authStyle: how to attach the API key:
 *              "bearer"   → Authorization: Bearer <key>
 *              "x-api-key"→ x-api-key header (Anthropic)
 *              "query"    → appended as ?key=... (Google)
 *              "none"     → no auth (public)
 *   headers:   extra static headers (e.g. anthropic-version)
 *   transform: function(json) → [{id, name}] — normalises each provider's response
 *
 * `models` — hardcoded fallback shown when the live fetch fails or no key is available yet.
 */
export const PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    defaultModel: "stepfun/step-3.5-flash:free",
    description: "Hundreds of models via one API — includes free options",
    modelsFetch: {
      url: "https://openrouter.ai/api/v1/models",
      authStyle: "bearer",
      transform: (json) =>
        (json.data || []).map((m) => ({ id: m.id, name: m.name })),
    },
    models: [],
  },
  openai: {
    name: "OpenAI",
    defaultModel: "gpt-4o-mini",
    description: "GPT models from OpenAI",
    modelsFetch: {
      url: "https://api.openai.com/v1/models",
      authStyle: "bearer",
      transform: (json) =>
        (json.data || [])
          .filter(
            (m) =>
              m.id.startsWith("gpt-") ||
              m.id.startsWith("o") ||
              m.id.startsWith("chatgpt"),
          )
          .map((m) => ({ id: m.id, name: m.id })),
    },
    models: [],
  },
  anthropic: {
    name: "Anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    description: "Claude models — excellent quality",
    modelsFetch: {
      url: "https://api.anthropic.com/v1/models",
      authStyle: "x-api-key",
      headers: { "anthropic-version": "2023-06-01" },
      transform: (json) =>
        (json.data || []).map((m) => ({
          id: m.id,
          name: m.display_name || m.id,
        })),
    },
    models: [],
  },
  google: {
    name: "Google AI",
    defaultModel: "gemini-2.0-flash",
    description: "Gemini models by Google",
    modelsFetch: {
      url: "https://generativelanguage.googleapis.com/v1beta/models",
      authStyle: "query",
      transform: (json) =>
        (json.models || [])
          .filter((m) =>
            (m.supportedGenerationMethods || []).includes("generateContent"),
          )
          .map((m) => ({
            id: m.baseModelId || m.name.replace("models/", ""),
            name: m.displayName || m.name,
          })),
    },
    models: [],
  },
  cloudflare: {
    name: "Cloudflare Workers AI",
    defaultModel: "@cf/minimax/m2.7",
    description: "Run models on Cloudflare's global network",
    modelsFetch: {
      url: "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/models/search",
      authStyle: "cloudflare",
      transform: (json) =>
        (json.result || [])
          .filter((m) => {
            if (!m.task) return false;

            const taskName = (m.task.name || "").toLowerCase();
            const taskId = (m.task.id || "").toLowerCase();

            return (
              taskName.includes("text generation") ||
              taskId.includes("text-generation") ||
              taskId === "text-generation"
            );
          })
          .map((m) => ({
            id: m.name,
            name: m.description || m.name,
          })),
    },
    models: [],
  },
  copilot: {
    name: "GitHub Copilot",
    defaultModel: "gpt-4o",
    description: "Use your GitHub Copilot subscription",
    modelsFetch: {
      url: "https://api.githubcopilot.com/models",
      authStyle: "bearer",
      transform: (json) =>
        (json.data || []).map((m) => ({ id: m.id, name: m.name || m.id })),
    },
    models: [],
  },
  custom: {
    name: "Custom (OpenAI-compatible)",
    defaultModel: "",
    description: "Any OpenAI-compatible endpoint",
    models: [],
  },
};

/** Returns the human-readable display name for a provider code. */
export function getProviderDisplayName(provider) {
  return PROVIDERS[provider]?.name ?? provider;
}

/**
 * Returns a flat array of env var names required by the given provider.
 * e.g. "cloudflare" → ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]
 * Falls back to openrouter vars for unknown providers.
 */
export function getRequiredEnvVars(provider) {
  const map = PROVIDER_ENV_MAP[provider];
  return map ? Object.values(map) : [];
}

/** Returns the recommended default model name for a provider. */
export function getDefaultModel(provider) {
  return PROVIDERS[provider]?.defaultModel ?? "";
}

/** Returns true if the provider name is one of the six recognized providers. */
export function isValidProvider(provider) {
  return provider in PROVIDERS;
}
