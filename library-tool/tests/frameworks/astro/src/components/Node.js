import { setLanguage, t, getAvailableLanguages, getCurrentLanguage } from 'tradux';

export async function test() {
    const availableLanguages = getAvailableLanguages();
    await setLanguage('pt');

    let nav = {
        home: t.navigation.home,
        about: t.navigation.about,
        services: t.navigation.services
    };

    //navigation with pt translate
    const navigationPT = nav

    await setLanguage('ja');

    nav = {
        home: t.navigation.home,
        about: t.navigation.about,
        services: t.navigation.services
    };

    //navigation with ja translate
    const navigationJA = nav

    const currentLanguage = await getCurrentLanguage();
    return { availableLanguages, currentLanguage, navigationPT, navigationJA }
}