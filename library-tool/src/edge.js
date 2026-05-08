import { createCookieHeader, createTraduxRuntime } from "./runtime-core.js";

export function createTradux(options = {}) {
  const translations = options.translations || {};
  const runtime = createTraduxRuntime({
    singleton: false,
    config: {
      defaultLanguage: options.defaultLanguage || options.lang || "en",
      availableLanguages: options.availableLanguages || Object.keys(translations),
      i18nPath: options.i18nPath || "./i18n",
    },
    loadLanguageDefinitions: () => options.languageDefinitions || [],
    loadLanguage: (lang) => translations[lang] || null,
    getInitialLanguage: (langOrCookies, config) => langOrCookies || options.lang || config.defaultLanguage,
    persistLanguage: (lang, serverContext = {}) => {
      if (serverContext.setCookieHeader) serverContext.setCookieHeader(createCookieHeader(lang));
    },
  });
  return runtime.initTradux(options.lang || options.defaultLanguage);
}

export const initTradux = createTradux;
