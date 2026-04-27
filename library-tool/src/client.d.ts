/** TypeScript declarations for the Tradux runtime client (client.js). */

export interface LanguageOption {
    name: string;
    value: string;
}

export interface TraduxConfig {
    i18nPath: string;
    defaultLanguage: string;
    availableLanguages: string[];
}

/** Recursive type: translation values can be strings or nested objects. */
export type TranslationValue = string | { [key: string]: TranslationValue };

/**
 * Proxy type that allows both `t.key` (returns string) and
 * `t.section.nested` (returns another proxy for deeper access).
 */
export type TranslationProxy = {
    readonly [key: string]: TranslationProxy;
} & string;

/** Lazy proxy — safe to import before initTradux() is called. */
export declare const t: TranslationProxy;

export function onLanguageChange(callback: () => void): void;
export function setLanguage(language: string): Promise<boolean>;
export function getCurrentLanguage(traduxLangCookieValue?: string | null): Promise<string>;
export function getAvailableLanguages(): LanguageOption[];
export function initTradux(langOrCookies?: string | null): Promise<{ t: TranslationProxy; currentLanguage: string; setLanguage: (language: string) => Promise<boolean> }>;
export const config: Readonly<TraduxConfig>;

declare module 'tradux/languages' {
    export interface LanguageOption {
        name: string;
        value: string;
    }

    export const availableLanguages: readonly LanguageOption[];
}