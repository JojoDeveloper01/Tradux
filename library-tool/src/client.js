let config = {
    i18nPath: './i18n',
    defaultLanguage: 'en',
    availableLanguages: []
};

let translations = {};

const isBrowser = typeof window !== 'undefined';

let languageDefinitions = [];
try {
    const { availableLanguages: langDefs } = await import('./utils/languages.js');
    languageDefinitions = langDefs;
} catch {
    languageDefinitions = [];
}

async function loadConfig() {
    try {
        if (isBrowser) {
            const configModule = await import('/tradux.config.json');
            config = { ...config, ...configModule };
        } else {
            const { readFile } = await import('fs/promises');
            const { join } = await import('path');

            const configPath = join(process.cwd(), 'tradux.config.json');
            const configData = await readFile(configPath, 'utf8');
            const configJson = JSON.parse(configData);
            config = { ...config, ...configJson };
        }
    } catch {
    }
}

async function loadLanguage(lang) {
    try {
        if (isBrowser) {
            const path = config.i18nPath.replace(/^\.\//, '');
            const response = await fetch(`/${path}/${lang}.json`);
            return response.ok ? await response.json() : null;
        } else {
            const { readFile } = await import('fs/promises');
            const { join } = await import('path');

            const possiblePaths = [
                join(process.cwd(), 'public', config.i18nPath.replace(/^\.\//, ''), `${lang}.json`),
                join(process.cwd(), config.i18nPath.replace(/^\.\//, ''), `${lang}.json`),
                join(process.cwd(), 'src', config.i18nPath.replace(/^\.\//, ''), `${lang}.json`),
                join(process.cwd(), 'public', 'i18n', `${lang}.json`),
                join(process.cwd(), 'i18n', `${lang}.json`)
            ];

            for (const filePath of possiblePaths) {
                try {
                    const data = await readFile(filePath, 'utf8');
                    return JSON.parse(data);
                } catch { }
            }
            return null;
        }
    } catch {
        return null;
    }
}

function getLanguageFromCookie(cookieValue = '') {
    try {
        if (isBrowser) {
            const match = document.cookie.match(/(?:^|;\s*)tradux_lang=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : config.defaultLanguage;
        }
        if (cookieValue) {
            return decodeURIComponent(cookieValue);
        }
    } catch { }
    return config.defaultLanguage;
}

function setLanguageCookie(lang) {
    if (!lang) return;
    if (isBrowser) {
        document.cookie = `tradux_lang=${encodeURIComponent(lang)}; path=/; max-age=31536000`;
    }
}

function getLanguageFromConfig(traduxCookie = '') {
    const lang = getLanguageFromCookie(traduxCookie);
    if (config.availableLanguages.length && !config.availableLanguages.includes(lang)) {
        return config.defaultLanguage;
    }
    return lang;
}

// ---------------- SET LANGUAGE ----------------
async function setLanguage(lang, serverContext = {}) {
    if (!lang) return false;

    const newTranslations = await loadLanguage(lang);
    if (!newTranslations) return false;

    Object.keys(translations).forEach(key => delete translations[key]);
    Object.assign(translations, newTranslations);

    // Update cookie
    setLanguageCookie(lang);

    // Server-side Set-Cookie (optional)
    if (!isBrowser && serverContext.setCookieHeader) {
        serverContext.setCookieHeader(`tradux_lang=${encodeURIComponent(lang)}; Path=/; Max-Age=31536000`);
    }

    return true;
}

// ---------------- REINITIALIZE FOR CONTEXT ----------------
async function initializeForLanguage(langOrCookies = null) {
    await loadConfig();

    let targetLang;

    if (isBrowser) {
        // Browser: langOrCookies is the desired language code (or null for auto-detect)
        targetLang = langOrCookies || getLanguageFromConfig();
    } else {
        // Server: langOrCookies is the cookie string (or null for no cookies)
        const traduxCookie = typeof langOrCookies === 'string' ? langOrCookies : '';
        targetLang = getLanguageFromConfig(traduxCookie);
    }

    // Load translations for the target language
    const newTranslations = await loadLanguage(targetLang) || await loadLanguage('en') || {};

    // Replace current translations
    Object.keys(translations).forEach(key => delete translations[key]);
    Object.assign(translations, newTranslations);

    return targetLang;
}

// ---------------- TRANSLATION PROXY ----------------
function isInternalProperty(prop) {
    if (typeof prop !== 'string') return true;
    if (prop.startsWith('__v_') || prop.startsWith('_') || prop === 'toJSON') return true;
    if (prop.startsWith('$$') || prop === '$$typeof' || prop === '_owner' || prop === '_store') return true;
    if (prop === 'constructor' || prop === 'prototype' || prop === 'valueOf' || prop === 'toString') return true;
    if (prop === 'then' || prop === 'catch' || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return true;
    return false;
}

function createTranslationProxy(pathArray = []) {
    return new Proxy({}, {
        get: (target, prop) => {
            if (isInternalProperty(prop)) return undefined;

            const currentPath = [...pathArray, prop];
            let value = translations;
            for (const key of currentPath) {
                if (value && typeof value === 'object') value = value[key];
                else { value = undefined; break; }
            }

            if (value !== undefined) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return createTranslationProxy(currentPath);
                }
                return value;
            }

            if (typeof prop === 'string') {
                console.warn(`Translation missing for key: ${currentPath.join('.')}`);
                return prop;
            }

            return undefined;
        }
    });
}

const t = createTranslationProxy();

function getAvailableLanguages() {
    return (config.availableLanguages || [])
        .filter(Boolean)
        .map(langCode => {
            const langDef = languageDefinitions.find(lang => lang.value === langCode);
            return langDef ? { name: langDef.name, value: langCode } : { name: langCode, value: langCode };
        });
}

// ---------------- EXPORTS ----------------
export {
    t,
    config,
    setLanguage,
    initializeForLanguage as getCurrentLanguage,
    getAvailableLanguages
};

await loadConfig();
const initialLanguage = getLanguageFromConfig();
const initialTranslations = await loadLanguage(initialLanguage) || await loadLanguage('en') || {};
Object.assign(translations, initialTranslations);
