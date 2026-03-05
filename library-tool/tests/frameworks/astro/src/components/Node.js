import { getAvailableLanguages, initTradux } from 'tradux';

export async function test() {
    const availableLanguages = getAvailableLanguages();

    // Create isolated instances for each language test
    // This is the safe way for SSR/server environments

    const ptInstance = await initTradux('pt');
    const nav_pt = {
        home: ptInstance.t.navigation.home,
        about: ptInstance.t.navigation.about,
        services: ptInstance.t.navigation.services
    };
    const navigationPT = nav_pt;

    const jaInstance = await initTradux('ja');
    const nav_ja = {
        home: jaInstance.t.navigation.home,
        about: jaInstance.t.navigation.about,
        services: jaInstance.t.navigation.services
    };
    const navigationJA = nav_ja;

    // Get the last instance's current language
    const currentLanguage = jaInstance.currentLanguage;

    return { availableLanguages, currentLanguage, navigationPT, navigationJA }
}