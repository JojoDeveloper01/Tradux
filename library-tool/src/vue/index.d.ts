import { TranslationProxy, LanguageOption } from '../client.js';
import type { Ref } from 'vue';

export const traduxState: {
    t: TranslationProxy;
    currentLanguage: string;
    isReady: boolean;
};

export function initVueTradux(): Promise<void>;
export function setLanguage(language: string, serverContext?: any): Promise<boolean>;
export function getAvailableLanguages(): LanguageOption[];

export function useTradux(): {
    t: Ref<TranslationProxy>;
    currentLanguage: Ref<string>;
    isReady: Ref<boolean>;
    setLanguage: typeof setLanguage;
    getAvailableLanguages: typeof getAvailableLanguages;
};