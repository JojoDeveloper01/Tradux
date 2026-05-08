import { createTraduxRuntime, readLanguageFromCookie } from "./runtime-core.js";

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";
const translationCache = {};

function normalizeBrowserBasePath(basePath = "/") {
  if (!basePath || basePath === ".") return "/";
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function getBrowserBasePath() {
  try {
    const viteBase = import.meta.env?.BASE_URL;
    if (typeof viteBase === "string") return normalizeBrowserBasePath(viteBase);
  } catch {}
  try {
    const moduleUrl = new URL(import.meta.url);
    const assetsIndex = moduleUrl.pathname.lastIndexOf("/assets/");
    if (assetsIndex !== -1) return normalizeBrowserBasePath(moduleUrl.pathname.slice(0, assetsIndex + 1));
  } catch {}
  return "/";
}

function getBrowserAssetCandidates(relativePath) {
  const cleanPath = relativePath.replace(/^\/+/, "");
  const basePath = getBrowserBasePath();
  return [...new Set([`${basePath}${cleanPath}`, `/${cleanPath}`])];
}

async function fetchFirstJson(candidates) {
  if (typeof fetch !== "function") return null;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (response.ok) return await response.json();
    } catch {}
  }
  return null;
}

function browserCookieString() {
  return isBrowser ? document.cookie : "";
}

function browserCookieAttributes() {
  const secure = isBrowser && window.location?.protocol === "https:" ? "; Secure" : "";
  return `; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

const runtime = createTraduxRuntime({
  singleton: true,
  loadConfig: () => fetchFirstJson(getBrowserAssetCandidates("tradux.config.json")),
  loadLanguageDefinitions: async () => {
    try {
      const { availableLanguages } = await import("./utils/languages.js");
      return availableLanguages;
    } catch {
      return [];
    }
  },
  getInitialLanguage: (langOrCookies, config) =>
    langOrCookies || readLanguageFromCookie(browserCookieString(), config.defaultLanguage),
  loadLanguage: async (lang, config) => {
    if (translationCache[lang]) return translationCache[lang];
    const path = config.i18nPath.replace(/^\.\//, "").replace(/^public\//, "");
    const result = await fetchFirstJson(getBrowserAssetCandidates(`${path}/${lang}.json`));
    if (result) translationCache[lang] = result;
    return result;
  },
  persistLanguage: (lang) => {
    if (isBrowser && lang) {
      document.cookie = `tradux_lang=${encodeURIComponent(lang)}${browserCookieAttributes()}`;
    }
  },
});

export const config = runtime.config;
export const getAvailableLanguages = runtime.getAvailableLanguages;
export const getCurrentLanguage = runtime.getCurrentLanguage;
export const initTradux = runtime.initTradux;
export const onLanguageChange = runtime.onLanguageChange;
export const setLanguage = runtime.setLanguage;
export const t = runtime.t;
export const traduxEvents = runtime.traduxEvents;
