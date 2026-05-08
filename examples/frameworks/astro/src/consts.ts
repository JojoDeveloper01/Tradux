import { createTraduxFromGlob } from "tradux/astro";
import { availableLanguages as languageDefinitions } from "tradux/languages";
import type { LanguageOption } from "tradux";

export const translationFiles = import.meta.glob("/public/i18n/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Record<string, unknown>>;

export const availableLanguageCodes = Object.keys(translationFiles).map((filePath) => {
  const fileName = filePath.split("/").pop() || "";
  return fileName.replace(/\.json$/i, "");
});

export function getAstroAvailableLanguages(): LanguageOption[] {
  return availableLanguageCodes.map((code) => {
    const definition = languageDefinitions.find(
      (language) => language.value === code,
    );
    return definition
      ? { name: definition.name, value: code }
      : { name: code, value: code };
  });
}

const { t } = await createTraduxFromGlob({
  files: translationFiles,
  defaultLanguage: "en",
  availableLanguages: availableLanguageCodes,
  languageDefinitions: [...languageDefinitions],
});

// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = t.site.title;
export const SITE_DESCRIPTION = t.site.description;
