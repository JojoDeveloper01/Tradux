// TypeScript declarations for Tradux library

export interface LanguageOption {
    name: string;
    value: string;
}

export interface TraduxConfig {
    i18nPath: string;
    defaultLanguage: string;
    availableLanguages: string[];
}

// Recursive type for nested translation objects
export type TranslationValue = string | { [key: string]: TranslationValue };

// Proxy type that provides both string access and nested object access
export type TranslationProxy = {
    readonly [key: string]: TranslationProxy;
} & string;

// Main translation object - provides type-safe access with fallback to string
export declare const t: TranslationProxy;

// Language management
export function setLanguage(language: string): Promise<boolean>;
export function getCurrentLanguage(traduxLangCookieValue?: string | null): Promise<string>;
export function getAvailableLanguages(): LanguageOption[];
export const config: Readonly<TraduxConfig>;

declare module 'tradux/languages' {
    export interface LanguageOption {
        name: string;
        value: string;
    }

    export const availableLanguages: readonly LanguageOption[];
}