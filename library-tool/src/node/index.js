import { readFile } from "fs/promises";
import { join } from "path";
import { createCookieHeader, createTraduxRuntime } from "../runtime-core.js";

const runtime = createTraduxRuntime({
  singleton: false,
  loadConfig: async () => {
    const configPath = join(process.cwd(), "tradux.config.json");
    return JSON.parse(await readFile(configPath, "utf8"));
  },
  loadLanguageDefinitions: async () => {
    try {
      const { availableLanguages } = await import("../utils/languages.js");
      return availableLanguages;
    } catch {
      return [];
    }
  },
  loadLanguage: async (lang, config) => {
    const i18nPath = config.i18nPath.replace(/^\.\//, "");
    const possiblePaths = [
      join(process.cwd(), "public", i18nPath, `${lang}.json`),
      join(process.cwd(), i18nPath, `${lang}.json`),
      join(process.cwd(), "src", i18nPath, `${lang}.json`),
      join(process.cwd(), "public", "i18n", `${lang}.json`),
      join(process.cwd(), "i18n", `${lang}.json`),
    ];

    for (const filePath of possiblePaths) {
      try {
        return JSON.parse(await readFile(filePath, "utf8"));
      } catch {}
    }
    return null;
  },
  persistLanguage: (lang, serverContext = {}) => {
    if (serverContext.setCookieHeader) serverContext.setCookieHeader(createCookieHeader(lang));
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
