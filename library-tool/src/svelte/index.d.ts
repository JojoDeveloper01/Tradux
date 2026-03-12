import { TranslationProxy, LanguageOption } from '../client.js';
import type { Writable } from 'svelte/store';

export const t: Writable<TranslationProxy>;
export const currentLanguage: Writable<string>;
export const isReady: Writable<boolean>;

export function initSvelteTradux(): Promise<void>;
export function setLanguage(language: string, serverContext?: any): Promise<boolean>;
export function getAvailableLanguages(): LanguageOption[];

export function useTradux(): {
    t: Writable<TranslationProxy>;
    currentLanguage: Writable<string>;
    isReady: Writable<boolean>;
    setLanguage: typeof setLanguage;
    getAvailableLanguages: typeof getAvailableLanguages;
};