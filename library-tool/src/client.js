let config = {
    i18nPath: './i18n',
    defaultLanguage: 'en',
    availableLanguages: []
};

let currentLanguage = '';
let translations = {};

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

let languageDefinitions = [];
try {
    const { availableLanguages: langDefs } = await import('./utils/languages.js');
    languageDefinitions = langDefs;
} catch {
    languageDefinitions = [];
}

async function loadConfig() {
    try {
        const configModule = await import('/tradux.config.json');
        config = { ...config, ...configModule };
    } catch {
    }
}

async function loadLanguage(lang) {
    try {
        const path = config.i18nPath.replace(/^\.\//, '');
        const response = await fetch(`/${path}/${lang}.json`);
        return response.ok ? await response.json() : null;
    } catch {
        return null;
    }
}

async function initialize() {
    await loadConfig();

    const savedLang = isBrowser ? localStorage.getItem('tradux-language') : null;
    currentLanguage = savedLang || config.defaultLanguage;

    translations = await loadLanguage(currentLanguage)
        || await loadLanguage('en')
        || {};
}

async function setLanguage(lang) {
    const newTranslations = await loadLanguage(lang);
    if (!newTranslations) return false;

    Object.keys(translations).forEach(key => delete translations[key]);
    Object.assign(translations, newTranslations);

    currentLanguage = lang;
    if (isBrowser) {
        localStorage.setItem('tradux-language', lang);
    }
    return true;
}

await initialize();

const t = new Proxy(translations, {
    get: (target, prop) => target[prop]
});

const availableLanguages = config.availableLanguages
    .filter(Boolean)
    .map(langCode => {
        const langDef = languageDefinitions.find(lang => lang.value === langCode);
        return langDef ? {
            name: langDef.name,
            value: langCode
        } : {
            name: langCode,
            value: langCode
        };
    });

export {
    t,
    setLanguage,
    currentLanguage,
    availableLanguages,
    config
};