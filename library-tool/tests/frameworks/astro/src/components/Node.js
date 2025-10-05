import { setLanguage, t, getAvailableLanguages, getCurrentLanguage } from 'tradux';

export async function test() {
    const availAbleLanguages = await getAvailableLanguages()
    const currentLanguage = getCurrentLanguage()

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

    return { availAbleLanguages, currentLanguage, navigationPT, navigationJA }
}