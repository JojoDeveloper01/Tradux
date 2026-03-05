let config = {
  i18nPath: "./i18n",
  defaultLanguage: "en",
  availableLanguages: [],
};

const isBrowser = typeof window !== "undefined";

let languageDefinitions = [];
let configLoaded = false;
const translationCache = {};

// ---------------- EVENT SYSTEM ----------------
// Safe EventTarget fallback for older Node.js versions and strict Edge runtimes
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
// ----------------------------------------------

async function loadLanguageDefinitions() {
  try {
    const { availableLanguages: langDefs } =
      await import("./utils/languages.js");
    languageDefinitions = langDefs;
  } catch {}
}

async function loadConfig() {
  try {
    if (isBrowser) {
      const configModule = await import("/tradux.config.json");
      config = { ...config, ...configModule };
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

async function loadLanguage(lang) {
  // 1. QUICK EXIT: Check if we already loaded it
  if (translationCache[lang]) {
    return translationCache[lang];
  }

  try {
    let result = null; // Declare result so it can be used across blocks

    if (isBrowser) {
      const path = config.i18nPath
        .replace(/^\.\//, "")
        .replace(/^public\//, "");
      const response = await fetch(`/${path}/${lang}.json`);
      result = response.ok ? await response.json() : null;
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
          break; // Stop looking once we find it!
        } catch {}
      }
    }

    // 2. SAVE: Save it to the cache before returning
    if (result) {
      translationCache[lang] = result;
    }
    return result;
  } catch {
    return null;
  }
}

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

// ---------------- INTERNAL FACTORY ----------------

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

// This creates the actual isolated instances for the Server
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

  let translations =
    (await loadLanguage(targetLang)) || (await loadLanguage("en")) || {};

  function createTranslationProxy(pathArray = []) {
    return new Proxy(
      {},
      {
        get: (target, prop) => {
          if (isInternalProperty(prop)) return undefined;

          const currentPath = [...pathArray, prop];
          let value = translations;
          for (const key of currentPath) {
            if (value && typeof value === "object") value = value[key];
            else {
              value = undefined;
              break;
            }
          }

          if (value !== undefined) {
            if (
              typeof value === "object" &&
              value !== null &&
              !Array.isArray(value)
            ) {
              return createTranslationProxy(currentPath);
            }
            return value;
          }

          if (typeof prop === "string") {
            const missingPath = currentPath.join(".");
            console.warn(
              `Tradux: Translation missing for key: "${missingPath}"`,
            );
            return missingPath;
          }
          return undefined;
        },
      },
    );
  }

  const t = createTranslationProxy();

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

// ---------------- BROWSER SINGLETON STATE ----------------
let browserInstance = null;
let browserInstancePromise = null;

// ---------------- PUBLIC API: SMART INIT ----------------
export async function initTradux(langOrCookies = null) {
  if (isBrowser) {
    // If in the browser, always create/reuse the global singleton
    if (!browserInstance) {
      if (!browserInstancePromise) {
        browserInstancePromise = createInstance(langOrCookies);
      }
      browserInstance = await browserInstancePromise;
    }
    return browserInstance;
  } else {
    // If on the server (Astro/Node), ALWAYS return a fresh, isolated instance
    return createInstance(langOrCookies);
  }
}

function getAvailableLanguages() {
  return (config.availableLanguages || []).filter(Boolean).map((langCode) => {
    const langDef = languageDefinitions.find((lang) => lang.value === langCode);
    return langDef
      ? { name: langDef.name, value: langCode }
      : { name: langCode, value: langCode };
  });
}

// ---------------- EXPORTS & PUBLIC API ----------------
export { config, getAvailableLanguages };

// Browser-friendly setLanguage that uses the singleton safely
export async function setLanguage(lang, serverContext = {}) {
  if (isBrowser) {
    const instance = await initTradux();
    const result = await instance.setLanguage(lang, serverContext);

    // TELL EVERY FRAMEWORK TO UPDATE!
    traduxEvents.dispatchEvent(new Event("change"));

    return result;
  } else {
    throw new Error("Use instance.setLanguage() for server-side rendering.");
  }
}

// Browser-friendly t object - access via getter to ensure singleton is initialized
let _t_proxy = null;

export function getTProxy() {
  if (!_t_proxy) {
    _t_proxy = new Proxy(
      {},
      {
        get: (target, prop) => {
          // 1. Silently ignore framework internal checks, including Astro's "render"
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

          // 2. Check if instance exists
          if (!browserInstance) {
            console.warn(
              `Tradux not initialized yet. Attempted to read: ${prop}`,
            );

            // 3. Safe dummy proxy: Target is a function so it can't cause "not a function" errors
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

          // 3. Return the actual translation
          return browserInstance.t[prop];
        },
      },
    );
  }
  return _t_proxy;
}

// For backward compatibility, export t as the proxy
export const t = getTProxy();

// Deprecated exports for backward compatibility (browser-only usage)
export async function getCurrentLanguage(langOrCookies = null) {
  const instance = await initTradux(langOrCookies);
  return instance.currentLanguage;
}
