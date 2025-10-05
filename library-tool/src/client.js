let currentLanguage = 'en';
let translations = {};
let isInitialized = false;
let initPromise = null;

let config = {
    i18nPath: './i18n',
    defaultLanguage: 'en',
    availableLanguages: []
};

const languageChangeListeners = new Set();

async function loadConfig() {
    try {
        let configData;

        if (typeof window !== 'undefined') {
            configData = await import('/tradux.config.json');
        } else {
            const { readFile } = await import('fs/promises');
            const projectRoot = process.cwd();

            try {
                const jsonPath = `${projectRoot}/tradux.config.json`;
                const jsonContent = await readFile(jsonPath, 'utf8');
                configData = JSON.parse(jsonContent);
            } catch (jsonError) {
                console
            }
        }

        if (configData) {
            config = {
                i18nPath: configData.i18nPath || './i18n',
                defaultLanguage: configData.defaultLanguage || 'en',
                availableLanguages: configData.availableLanguages || []
            };
        }

        return config;
    } catch (error) {
        return config;
    }
}

function saveLanguage(lang) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('tradux-language', lang);
    }
}

function getSavedLanguage() {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('tradux-language');
    }
    return null;
}

async function loadLanguage(lang) {
    try {
        if (typeof window !== 'undefined') {
            const cleanPath = config.i18nPath.replace(/^\.\//, '');
            const jsonPath = `/${cleanPath}/${lang}.json`;
            const res = await fetch(jsonPath);
            if (!res.ok) throw new Error(`Language ${lang} not found`);
            return await res.json();
        } else {
            const { readFile } = await import('fs/promises');
            const { resolve } = await import('path');

            const cleanPath = config.i18nPath.replace(/^(\.\/|public\/)/, '');
            const jsonPath = resolve(process.cwd(), "public", cleanPath, `${lang}.json`);
            const fileContent = await readFile(jsonPath, 'utf8');
            return JSON.parse(fileContent);
        }
    } catch (error) {
        console.error(`Error loading language '${lang}': ${error.message}`);
        return null;
    }
}

async function initialize() {
    if (isInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            await loadConfig();

            const saved = getSavedLanguage();
            currentLanguage = saved || config.defaultLanguage;

            translations = await loadLanguage(currentLanguage);

            if (!translations) {
                if (currentLanguage !== config.defaultLanguage) {
                    translations = await loadLanguage(config.defaultLanguage);
                    currentLanguage = config.defaultLanguage;
                }

                if (!translations && config.defaultLanguage !== 'en') {
                    translations = await loadLanguage('en');
                    currentLanguage = 'en';
                }

                if (!translations) {
                    translations = {};
                }
            }

            updateTranslationObject();
            isInitialized = true;
        } catch (error) {
            console.error('Tradux initialization error:', error);
            translations = {};
            updateTranslationObject();
            isInitialized = true;
        }
    })();

    return initPromise;
}

const translationTarget = {};

const createReactiveStore = () => {
    const subscribers = new Set();
    let value = {};

    return {
        subscribe(callback) {
            subscribers.add(callback);
            callback(value);
            return () => subscribers.delete(callback);
        },
        set(newValue) {
            value = newValue;
            subscribers.forEach(callback => callback(value));
        },
        get() {
            return value;
        }
    };
};

const tStore = createReactiveStore();

const t = new Proxy(translationTarget, {
    get(target, prop) {
        if (!isInitialized || !translations) {
            return new Proxy({}, {
                get() { return ''; }
            });
        }
        return translations[prop] || '';
    },
    ownKeys(target) {
        return Object.keys(translations);
    },
    has(target, prop) {
        return prop in translations;
    }
});

function updateTranslationObject() {
    Object.keys(translationTarget).forEach(key => delete translationTarget[key]);
    Object.assign(translationTarget, translations);

    tStore.set({ ...translations });
}

async function getAvailableLanguages() {
    await initialize();
    return (config.availableLanguages || []).filter(lang => lang && typeof lang === 'string');
}

async function setLanguage(lang) {
    await initialize();

    try {
        const newTranslations = await loadLanguage(lang);

        if (newTranslations) {
            translations = newTranslations;
            currentLanguage = lang;
            saveLanguage(lang);
            updateTranslationObject();

            languageChangeListeners.forEach(callback => {
                try {
                    callback(lang, translations);
                } catch (error) {
                    console.error('Error in language change listener:', error);
                }
            });
        }
    } catch (error) {
        console.error(`Error loading language ${lang}: ${error.message}`);
    }
}

function onLanguageChange(callback) {
    languageChangeListeners.add(callback);
    return () => languageChangeListeners.delete(callback);
}

function getCurrentLanguage() {
    return currentLanguage;
}

initialize().catch(error => {
    console.error('Failed to auto-initialize Tradux:', error);
});

export {
    t,
    tStore,
    setLanguage,
    getCurrentLanguage,
    loadLanguage,
    config,
    getAvailableLanguages,
    onLanguageChange
};