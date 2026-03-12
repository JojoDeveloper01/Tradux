import { TranslationProxy, LanguageOption } from '../client.js';

export function useTradux(): {
    t: TranslationProxy;
    currentLanguage: string;
    isReady: boolean;
    setLanguage: (language: string, serverContext?: any) => Promise<boolean>;
    getAvailableLanguages: () => LanguageOption[];
};