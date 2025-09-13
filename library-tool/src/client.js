let currentLanguage = 'en';
let translations = {};

let config = {
    i18nPath: './i18n',
    defaultLanguage: 'en'
};

async function loadConfig() {
    try {
        let configModule;

        if (typeof window !== 'undefined') {
            configModule = await import('/tradux.config.js');
        } else {
            // Browser-compatible path joining
            const projectRoot = process.cwd ? process.cwd() : '';
            const configPath = `${projectRoot}/tradux.config.js`.replace(/\/+/g, '/');
            const configUrl = `file://${configPath.replace(/\\/g, '/')}`;
            configModule = await import(configUrl);
        }

        config = {
            i18nPath: configModule.i18nPath || './i18n',
            defaultLanguage: configModule.defaultLanguage || 'en'
        };

        return config;
    } catch (error) {
        return config;
    }
}

await loadConfig();

if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tradux-language');
    currentLanguage = saved || config.defaultLanguage;
} else {
    currentLanguage = config.defaultLanguage;
}

function saveLanguage(lang) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('tradux-language', lang);
    }
}



async function loadLanguage(lang) {
    try {
        if (typeof window !== 'undefined') {
            // Browser → usa fetch
            const cleanPath = config.i18nPath.replace(/^\.\//, '');
            const languagePath = `/${cleanPath}/${lang}.json`;
            const res = await fetch(languagePath);
            if (!res.ok) throw new Error(`Language ${lang} not found`);
            return await res.json();
        }

        const { readFile } = await import('fs/promises');
        const { resolve } = await import('path');

        const cleanPath = config.i18nPath.replace(/^(\.\/|public\/)/, '');
        const filePath = resolve(process.cwd(), "public", cleanPath, `${lang}.json`);

        const fileContent = await readFile(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error loading language '${lang}': ${error.message}`);
        return null;
    }
}

try {
    translations = await loadLanguage(currentLanguage);
    if (!translations) {
        // Only try default language if it's different from current language
        if (currentLanguage !== config.defaultLanguage) {
            translations = await loadLanguage(config.defaultLanguage);
            currentLanguage = config.defaultLanguage;
        }

        // If still no translations, try 'en' as final fallback
        if (!translations && config.defaultLanguage !== 'en') {
            translations = await loadLanguage('en');
            currentLanguage = 'en';
        }

        if (!translations) {
            translations = {};
        }
    }
} catch (error) {
    translations = {};
}

const t = { ...translations };

async function setLanguage(lang) {
    try {
        const newTranslations = await loadLanguage(lang);

        if (newTranslations) {
            Object.keys(t).forEach(key => delete t[key]);
            Object.assign(t, newTranslations);
            currentLanguage = lang;
            saveLanguage(lang);
        }
    } catch (error) {
        console.error(`Error loading language ${lang}: ${error.message}`);
    }
}

export { t, setLanguage, currentLanguage, loadLanguage, config };