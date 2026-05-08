const defaultConfig = {
  i18nPath: "./i18n",
  defaultLanguage: "en",
  availableLanguages: [],
};

class DummyEventTarget {
  addEventListener() {}
  dispatchEvent() {}
  removeEventListener() {}
}

function createEvents() {
  return typeof EventTarget !== "undefined"
    ? new EventTarget()
    : new DummyEventTarget();
}

export function createCookieHeader(lang) {
  return `tradux_lang=${encodeURIComponent(lang)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readLanguageFromCookie(cookieValue = "", fallback = "en") {
  try {
    const match = String(cookieValue).match(/(?:^|;\s*)tradux_lang=([^;]+)/);
    return decodeURIComponent(match ? match[1] : cookieValue) || fallback;
  } catch {
    return fallback;
  }
}

function isInternalProperty(prop) {
  if (typeof prop !== "string") return true;
  if (prop.startsWith("__v_") || prop.startsWith("_") || prop === "toJSON") return true;
  if (prop.startsWith("$$") || prop === "$$typeof" || prop === "_owner" || prop === "_store") return true;
  if (prop === "constructor" || prop === "prototype" || prop === "valueOf" || prop === "toString") return true;
  if (prop === "then" || prop === "catch" || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return true;
  return false;
}

export function createTranslationProxy(getTranslations, pathArray = []) {
  const resolvePathValue = (parts) => {
    let value = getTranslations() || {};
    for (const key of parts) {
      if (value && typeof value === "object") value = value[key];
      else return undefined;
    }
    return value;
  };

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
                ? createTranslationProxy(getTranslations, [...currentPath, i])
                : item,
            );
          }
          if (typeof value === "object" && value !== null) {
            return createTranslationProxy(getTranslations, currentPath);
          }
          return value;
        }

        if (typeof prop === "string") {
          console.warn(`Tradux: Translation missing for key: "${currentPath.join(".")}"`);
          return "";
        }
        return undefined;
      },
      ownKeys: () => {
        const value = resolvePathValue(pathArray);
        return value && typeof value === "object" && !Array.isArray(value)
          ? Object.keys(value)
          : [];
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
      has: (target, prop) => {
        const value = resolvePathValue(pathArray);
        return Boolean(value && typeof value === "object" && prop in value);
      },
    },
  );
}

function createMissingTranslationProxy() {
  const dummy = new Proxy(
    function () {
      return "";
    },
    {
      get: (target, prop) => {
        if (typeof prop !== "string") return undefined;
        if (prop === "toString" || prop === "valueOf") return () => "";
        if (isInternalProperty(prop)) return undefined;
        return dummy;
      },
    },
  );
  return dummy;
}

export function createTraduxRuntime(options = {}) {
  let config = { ...defaultConfig, ...(options.config || {}) };
  let languageDefinitions = [];
  let configLoaded = Boolean(options.config);
  let singletonInstance = null;
  let singletonPromise = null;
  const events = options.events || createEvents();
  const useSingleton = options.singleton !== false;

  const loadConfig = async () => {
    if (configLoaded) return;
    try {
      const loadedConfig = options.loadConfig ? await options.loadConfig() : null;
      if (loadedConfig) Object.assign(config, loadedConfig);
    } catch {}
    try {
      if (options.loadLanguageDefinitions) {
        languageDefinitions = (await options.loadLanguageDefinitions()) || [];
      }
    } catch {}
    configLoaded = true;
  };

  const getLanguageFromConfig = (langOrCookies = "") => {
    const lang = options.getInitialLanguage
      ? options.getInitialLanguage(langOrCookies, config)
      : readLanguageFromCookie(langOrCookies || "", config.defaultLanguage);
    if (config.availableLanguages.length && !config.availableLanguages.includes(lang)) {
      return config.defaultLanguage;
    }
    return lang || config.defaultLanguage;
  };

  const createInstance = async (langOrCookies = null) => {
    await loadConfig();
    let targetLang = getLanguageFromConfig(langOrCookies || "");
    let translations =
      (await options.loadLanguage?.(targetLang, config)) ||
      (await options.loadLanguage?.(config.defaultLanguage, config)) ||
      (await options.loadLanguage?.("en", config)) ||
      {};

    const t = createTranslationProxy(() => translations);

    async function setLanguage(newLang, serverContext = {}) {
      if (!newLang) return false;
      const newTranslations = await options.loadLanguage?.(newLang, config);
      if (!newTranslations) return false;
      translations = newTranslations;
      targetLang = newLang;
      options.persistLanguage?.(newLang, serverContext);
      return true;
    }

    return {
      t,
      get currentLanguage() {
        return targetLang;
      },
      setLanguage,
    };
  };

  async function initTradux(langOrCookies = null) {
    if (!useSingleton) return createInstance(langOrCookies);
    if (!singletonInstance) {
      if (!singletonPromise) singletonPromise = createInstance(langOrCookies);
      singletonInstance = await singletonPromise;
    }
    return singletonInstance;
  }

  async function setLanguage(lang, serverContext = {}) {
    const instance = await initTradux();
    const result = await instance.setLanguage(lang, serverContext);
    if (result) events.dispatchEvent(new Event("change"));
    return result;
  }

  function onLanguageChange(callback) {
    events.addEventListener("change", callback);
  }

  function getAvailableLanguages() {
    return (config.availableLanguages || []).filter(Boolean).map((langCode) => {
      const langDef = languageDefinitions.find((lang) => lang.value === langCode);
      return langDef ? { name: langDef.name, value: langCode } : { name: langCode, value: langCode };
    });
  }

  let tProxy = null;
  function getTProxy() {
    if (!tProxy) {
      tProxy = new Proxy(
        {},
        {
          get: (target, prop) => {
            if (isInternalProperty(prop)) return undefined;
            if (!singletonInstance) return createMissingTranslationProxy();
            const value = singletonInstance.t[prop];
            return value === "" ? createMissingTranslationProxy() : value;
          },
        },
      );
    }
    return tProxy;
  }

  return {
    config,
    getAvailableLanguages,
    getCurrentLanguage: async (langOrCookies = null) => (await initTradux(langOrCookies)).currentLanguage,
    initTradux,
    onLanguageChange,
    setLanguage,
    t: getTProxy(),
    traduxEvents: events,
  };
}
