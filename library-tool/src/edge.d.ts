import type { TranslationProxy } from "./client.js";

export interface EdgeTraduxOptions {
  translations: Record<string, Record<string, unknown>>;
  lang?: string;
  defaultLanguage?: string;
  availableLanguages?: string[];
  i18nPath?: string;
  languageDefinitions?: Array<{ name: string; value: string }>;
}

export function createTradux(options: EdgeTraduxOptions): Promise<{
  t: TranslationProxy;
  currentLanguage: string;
  setLanguage: (language: string, serverContext?: { setCookieHeader?: (value: string) => void }) => Promise<boolean>;
}>;

export const initTradux: typeof createTradux;
