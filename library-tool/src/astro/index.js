import { createTradux } from "../edge/index.js";

function languageFromPath(filePath) {
  const fileName = String(filePath).split("/").pop() || "";
  return fileName.replace(/\.json$/i, "");
}

export function createTraduxFromGlob({ files, lang, defaultLanguage = "en", availableLanguages, ...rest } = {}) {
  const translations = {};
  for (const [filePath, value] of Object.entries(files || {})) {
    const language = languageFromPath(filePath);
    translations[language] = value?.default || value;
  }

  return createTradux({
    ...rest,
    translations,
    lang: lang || defaultLanguage,
    defaultLanguage,
    availableLanguages: availableLanguages || Object.keys(translations),
  });
}
