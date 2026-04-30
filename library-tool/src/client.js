/**
 * client.js — Tradux Runtime Client
 *
 * This is the core runtime that powers translations on both browser and server.
 *
 * Architecture:
 *   - Browser: A singleton instance is created once and shared across all
 *     components. Framework adapters (React/Vue/Svelte) consume this singleton
 *     and react to language changes via the event system.
 *   - Server (SSR): Each request gets a fresh, isolated instance to avoid
 *     leaking state between concurrent users.
 *
 * Translation access uses a Proxy so you can write `t.nav.home` and get either
 * the translated string, a nested proxy for deeper access, or a fallback
 * dot-path string (e.g. "nav.home") if the key is missing.
 */

let config = {
  i18nPath: "./i18n",
  defaultLanguage: "en",
  availableLanguages: [],
};

const isBrowser = typeof window !== "undefined";

let languageDefinitions = [];
let configLoaded = false;
const translationCache = {};

function normalizeBrowserBasePath(basePath = "/") {
  if (!basePath || basePath === ".") return "/";

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function getBrowserBasePath() {
  if (!isBrowser) return "/";

  try {
    const viteBase = import.meta.env?.BASE_URL;
    if (typeof viteBase === "string") {
      return normalizeBrowserBasePath(viteBase);
    }
  } catch {}

  try {
    const moduleUrl = new URL(import.meta.url);
    const assetsIndex = moduleUrl.pathname.lastIndexOf("/assets/");

    if (assetsIndex !== -1) {
      return normalizeBrowserBasePath(moduleUrl.pathname.slice(0, assetsIndex + 1));
    }
  } catch {}

  return "/";
}

function getBrowserAssetCandidates(relativePath) {
  const cleanPath = relativePath.replace(/^\/+/, "");
  const basePath = getBrowserBasePath();
  return [...new Set([`${basePath}${cleanPath}`, `/${cleanPath}`])];
}

async function fetchFirstJson(candidates) {
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (response.ok) {
        return await response.json();
      }
    } catch {}
  }

  return null;
}

// --- Event System ---
// Frameworks subscribe to "change" events to re-render when the language switches.
// DummyEventTarget is a no-op fallback for environments without EventTarget (old Node, edge runtimes).

class DummyEventTarget {
  addEventListener() {}
  dispatchEvent() {}
  removeEventListener() {}
}

export const traduxEvents =
  typeof EventTarget !== "undefined"
    ? new EventTarget()
    : new DummyEventTarget();

export function onLanguageChange(callback) {
  traduxEvents.addEventListener("change", callback);
}

// --- Config & Language Loading ---

async function loadLanguageDefinitions() {
  try {
    const { availableLanguages: langDefs } =
      await import("./utils/languages.js");
    languageDefinitions = langDefs;
  } catch {}
}

/**
 * Loads tradux.config.json from the project root.
 * Browser: fetches it as a module from the web server root.
 * Server: reads it from the filesystem via process.cwd().
 */
async function loadConfig() {
  try {
    if (isBrowser) {
      const configJson = await fetchFirstJson(
        getBrowserAssetCandidates("tradux.config.json"),
      );

      if (configJson) {
        config = { ...config, ...configJson };
      }
    } else {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");

      const configPath = join(process.cwd(), "tradux.config.json");
      const configData = await readFile(configPath, "utf8");
      const configJson = JSON.parse(configData);
      config = { ...config, ...configJson };
    }
  } catch {}
  configLoaded = true;
}

/**
 * Loads a language JSON file and caches the result.
 * Browser: fetches from the public directory via HTTP.
 * Server: tries multiple common directory layouts (public/i18n, src/i18n, etc.)
 * to be compatible with different project structures.
 */
async function loadLanguage(lang) {
  if (isBrowser && translationCache[lang]) {
    return translationCache[lang];
  }

  try {
    let result = null;

    if (isBrowser) {
      const path = config.i18nPath
        .replace(/^\.\//, "")
        .replace(/^public\//, "");
      result = await fetchFirstJson(
        getBrowserAssetCandidates(`${path}/${lang}.json`),
      );
    } else {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");

      const possiblePaths = [
        join(
          process.cwd(),
          "public",
          config.i18nPath.replace(/^\.\//, ""),
          `${lang}.json`,
        ),
        join(
          process.cwd(),
          config.i18nPath.replace(/^\.\//, ""),
          `${lang}.json`,
        ),
        join(
          process.cwd(),
          "src",
          config.i18nPath.replace(/^\.\//, ""),
          `${lang}.json`,
        ),
        join(process.cwd(), "public", "i18n", `${lang}.json`),
        join(process.cwd(), "i18n", `${lang}.json`),
      ];

      for (const filePath of possiblePaths) {
        try {
          const data = await readFile(filePath, "utf8");
          result = JSON.parse(data);
          break;
        } catch {}
      }
    }

    if (result && isBrowser) {
      translationCache[lang] = result;
    }
    return result;
  } catch {
    return null;
  }
}

// --- Cookie helpers ---
// The "tradux_lang" cookie persists the user's language choice across page loads.

function getLanguageFromCookie(cookieValue = "") {
  try {
    if (isBrowser) {
      const match = document.cookie.match(/(?:^|;\s*)tradux_lang=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : config.defaultLanguage;
    }
    if (cookieValue) {
      return decodeURIComponent(cookieValue);
    }
  } catch {}
  return config.defaultLanguage;
}

function setLanguageCookie(lang) {
  if (!lang) return;
  if (isBrowser) {
    document.cookie = `tradux_lang=${encodeURIComponent(lang)}; path=/; max-age=31536000`;
  }
}

/**
 * Resolves the active language: reads from cookie, then validates
 * against availableLanguages. Falls back to defaultLanguage if invalid.
 */
function getLanguageFromConfig(traduxCookie = "") {
  const lang = getLanguageFromCookie(traduxCookie);
  if (
    config.availableLanguages.length &&
    !config.availableLanguages.includes(lang)
  ) {
    return config.defaultLanguage;
  }
  return lang;
}

// --- Translation Instance Factory ---

/**
 * Checks if a property name is a framework-internal access (React $$typeof,
 * Vue __v_, Svelte $$, Promise .then, etc.) that the Proxy should ignore.
 * Without this, frameworks would trigger false "missing translation" warnings.
 */
function isInternalProperty(prop) {
  if (typeof prop !== "string") return true;
  if (prop.startsWith("__v_") || prop.startsWith("_") || prop === "toJSON")
    return true;
  if (
    prop.startsWith("$$") ||
    prop === "$$typeof" ||
    prop === "_owner" ||
    prop === "_store"
  )
    return true;
  if (
    prop === "constructor" ||
    prop === "prototype" ||
    prop === "valueOf" ||
    prop === "toString"
  )
    return true;
  if (
    prop === "then" ||
    prop === "catch" ||
    prop === Symbol.toPrimitive ||
    prop === Symbol.toStringTag
  )
    return true;
  return false;
}

/**
 * Creates an isolated Tradux instance with its own translations and language.
 * On the server, each SSR request should get its own instance so users
 * don't share language state. On the browser, a single instance is reused.
 */
async function createInstance(langOrCookies = null) {
  if (!configLoaded) {
    await loadConfig();
    await loadLanguageDefinitions();
  }

  let targetLang;

  if (isBrowser) {
    targetLang = langOrCookies || getLanguageFromConfig();
  } else {
    const traduxCookie = typeof langOrCookies === "string" ? langOrCookies : "";
    targetLang = getLanguageFromConfig(traduxCookie);
  }

  // Fall back to English, then to an empty object if nothing loads
  let translations =
    (await loadLanguage(targetLang)) || (await loadLanguage("en")) || {};

  /**
   * Recursive Proxy that allows `t.nav.home` style access.
   * - If the key resolves to a string, returns it directly.
   * - If it resolves to a nested object, returns another proxy.
   * - If the key is missing, logs a warning and returns the dot-path as a string fallback.
   */
  function resolvePathValue(pathArray) {
    let value = translations;
    for (const key of pathArray) {
      if (value && typeof value === "object") value = value[key];
      else return undefined;
    }
    return value;
  }

  function createTranslationProxy(pathArray = []) {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (isInternalProperty(prop)) return undefined;

          const currentPath = [...pathArray, prop];
          const value = resolvePathValue(currentPath);

          if (value !== undefined) {
            if (Array.isArray(value)) {
              return value.map((item, i) =>
                item && typeof item === "object"
                  ? createTranslationProxy([...currentPath, i])
                  : item,
              );
            }
            if (typeof value === "object" && value !== null) {
              return createTranslationProxy(currentPath);
            }
            return value;
          }

          if (typeof prop === "string") {
            const missingPath = currentPath.join(".");
            console.warn(
              `Tradux: Translation missing for key: "${missingPath}"`,
            );
            return "";
          }
          return undefined;
        },
        ownKeys: () => {
          const value = resolvePathValue(pathArray);
          if (value && typeof value === "object" && !Array.isArray(value)) {
            return Object.keys(value);
          }
          return [];
        },
        getOwnPropertyDescriptor: (target, prop) => {
          const value = resolvePathValue(pathArray);
          if (value && typeof value === "object" && prop in value) {
            return {
              configurable: true,
              enumerable: true,
              writable: true,
              value: value[prop],
            };
          }
          return undefined;
        },
      },
    );
  }

  const t = createTranslationProxy();

  /**
   * Switches the language for this instance. Loads the new JSON,
   * replaces the internal translations reference, and persists the
   * choice via cookie. On the server, can also set a response header.
   */
  async function setLanguage(newLang, serverContext = {}) {
    if (!newLang) return false;
    const newTranslations = await loadLanguage(newLang);
    if (!newTranslations) return false;

    translations = newTranslations;
    targetLang = newLang;

    setLanguageCookie(newLang);
    if (!isBrowser && serverContext.setCookieHeader) {
      serverContext.setCookieHeader(
        `tradux_lang=${encodeURIComponent(newLang)}; Path=/; Max-Age=31536000`,
      );
    }
    return true;
  }

  return {
    t,
    get currentLanguage() {
      return targetLang;
    },
    setLanguage,
  };
}

// --- Browser Singleton ---
// In the browser, all components share one instance to avoid redundant fetches.

let browserInstance = null;
let browserInstancePromise = null;

/**
 * Main entry point. Initializes Tradux and returns a translation instance.
 * - Browser: creates/reuses a global singleton (safe to call from many components).
 * - Server: always returns a fresh isolated instance (safe for concurrent requests).
 */
export async function initTradux(langOrCookies = null) {
  if (isBrowser) {
    if (!browserInstance) {
      if (!browserInstancePromise) {
        browserInstancePromise = createInstance(langOrCookies);
      }
      browserInstance = await browserInstancePromise;
    }
    return browserInstance;
  } else {
    return createInstance(langOrCookies);
  }
}

/**
 * Maps language codes from config into { name, value } objects
 * using the full language definitions list for display names.
 */
function getAvailableLanguages() {
  return (config.availableLanguages || []).filter(Boolean).map((langCode) => {
    const langDef = languageDefinitions.find((lang) => lang.value === langCode);
    return langDef
      ? { name: langDef.name, value: langCode }
      : { name: langCode, value: langCode };
  });
}

export { config, getAvailableLanguages };

/**
 * Browser-only: switches language on the singleton and emits a "change" event
 * so all framework adapters re-render automatically.
 * Throws on the server — use instance.setLanguage() there instead.
 */
export async function setLanguage(lang, serverContext = {}) {
  if (isBrowser) {
    const instance = await initTradux();
    const result = await instance.setLanguage(lang, serverContext);
    traduxEvents.dispatchEvent(new Event("change"));
    return result;
  } else {
    throw new Error("Use instance.setLanguage() for server-side rendering.");
  }
}

/**
 * Lazy proxy for `t` — allows importing `t` at the top of a file
 * before Tradux is initialized. Delegates to the browser singleton
 * once it's ready; returns a safe dummy proxy in the meantime
 * to prevent "cannot read property" crashes during initial render.
 */
let _t_proxy = null;

export function getTProxy() {
  if (!_t_proxy) {
    _t_proxy = new Proxy(
      {},
      {
        get: (target, prop) => {
          if (
            typeof prop !== "string" ||
            prop === "render" ||
            prop === "name" ||
            prop.startsWith("__v_") ||
            prop.startsWith("$$") ||
            prop === "toJSON"
          ) {
            return undefined;
          }

          if (!browserInstance) {
            // Returns a chainable dummy that resolves to "" for any depth,
            // preventing crashes when templates render before init completes.
            const dummyProxy = new Proxy(
              function () {
                return "";
              },
              {
                get: (dTarget, dProp) => {
                  if (typeof dProp !== "string") return undefined;
                  if (dProp === "toString" || dProp === "valueOf")
                    return () => "";
                  if (
                    dProp === "render" ||
                    dProp === "name" ||
                    dProp.startsWith("__") ||
                    dProp.startsWith("$$") ||
                    dProp === "toJSON"
                  ) {
                    return undefined;
                  }
                  return dummyProxy;
                },
              },
            );
            return dummyProxy;
          }

          return browserInstance.t[prop];
        },
      },
    );
  }
  return _t_proxy;
}

export const t = getTProxy();

/** Resolves the current language. Initializes Tradux if needed. */
export async function getCurrentLanguage(langOrCookies = null) {
  const instance = await initTradux(langOrCookies);
  return instance.currentLanguage;
}
