// Internal state
let currentLanguage = 'en';
let translations = {};
let isInitialized = false;
let initPromise = null;

// Configuration with defaults
let config = {
    i18nPath: './i18n',
    defaultLanguage: 'en',
    availableLanguages: []
};

// Event listeners for reactivity
const languageChangeListeners = new Set();

async function loadConfig() {
    try {
        let configData;

        if (typeof window !== 'undefined') {
            // Browser environment - try both .js and .json config files
            configData = await import('/tradux.config.json');
        } else {
            // Node.js environment - try both .json and .js
            const { readFile } = await import('fs/promises');
            const projectRoot = process.cwd();

            // Try .json first
            try {
                const jsonPath = `${projectRoot}/tradux.config.json`;
                const jsonContent = await readFile(jsonPath, 'utf8');
                configData = JSON.parse(jsonContent);
            } catch (jsonError) {
                // Fallback to .js
                const configPath = `${projectRoot}/tradux.config.js`.replace(/\\/g, '/');
                const configUrl = `file://${configPath}`;
                const configModule = await import(/* @vite-ignore */ configUrl);
                configData = configModule;
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
        // Silently fall back to defaults
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
            // Browser environment - only use .json format
            const cleanPath = config.i18nPath.replace(/^\.\//, '');
            const jsonPath = `/${cleanPath}/${lang}.json`;
            const res = await fetch(jsonPath);
            if (!res.ok) throw new Error(`Language ${lang} not found`);
            return await res.json();
        } else {
            // Node.js environment - only use .json format
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

// Initialize the library
async function initialize() {
    if (isInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            await loadConfig();

            // Determine initial language
            const saved = getSavedLanguage();
            currentLanguage = saved || config.defaultLanguage;

            // Load initial translations
            translations = await loadLanguage(currentLanguage);

            if (!translations) {
                // Try default language if different
                if (currentLanguage !== config.defaultLanguage) {
                    translations = await loadLanguage(config.defaultLanguage);
                    currentLanguage = config.defaultLanguage;
                }

                // Try 'en' as final fallback
                if (!translations && config.defaultLanguage !== 'en') {
                    translations = await loadLanguage('en');
                    currentLanguage = 'en';
                }

                if (!translations) {
                    translations = {};
                }
            }

            // Update the t object
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

// Create a reactive translation object that works with all frameworks
const translationTarget = {};

// Create a simple reactive store for frameworks
const createReactiveStore = () => {
    const subscribers = new Set();
    let value = {};

    return {
        subscribe(callback) {
            subscribers.add(callback);
            callback(value); // Call immediately with current value
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
            // Return empty proxy for nested access during loading
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
    // Update the proxy target to trigger reactivity
    Object.keys(translationTarget).forEach(key => delete translationTarget[key]);
    Object.assign(translationTarget, translations);

    // Update the reactive store
    tStore.set({ ...translations });
}

// Get available languages from config
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

            // Notify listeners for framework reactivity
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

// Framework integration helpers
function onLanguageChange(callback) {
    languageChangeListeners.add(callback);
    return () => languageChangeListeners.delete(callback);
}

function getCurrentLanguage() {
    return currentLanguage;
}

// Auto-initialize when module loads (but don't block)
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