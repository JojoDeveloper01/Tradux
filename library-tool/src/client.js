let currentLanguage = 'en';
let translations = {};

let config = {
    i18nPath: './src/i18n',
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
            i18nPath: configModule.i18nPath || './src/i18n',
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
        let languagePath;

        if (typeof window !== 'undefined') {
            if (config.i18nPath.startsWith('./')) {
                languagePath = `/${config.i18nPath.substring(2)}/${lang}.js`;
            } else if (config.i18nPath.startsWith('src/')) {
                languagePath = `/${config.i18nPath}/${lang}.js`;
            } else {
                languagePath = `/${config.i18nPath}/${lang}.js`;
            }
        } else {
            // Browser-compatible path joining and file checking
            const projectRoot = process.cwd ? process.cwd() : '';
            const filePath = `${projectRoot}/${config.i18nPath}/${lang}.js`.replace(/\/+/g, '/');

            // Browser-compatible file existence check
            try {
                const testResponse = await fetch(`file://${filePath.replace(/\\/g, '/')}`, { method: 'HEAD' });
                if (!testResponse.ok) {
                    console.error(`Language '${lang}' not found. Run 'npx tradux -t ${lang}' to create it.`);
                    return null;
                }
            } catch (error) {
                // If fetch fails, continue anyway as file might exist
                console.warn(`Could not verify existence of language file: ${filePath}`);
            }

            languagePath = `file://${filePath.replace(/\\/g, '/')}`;
        }

        const module = await import(/* @vite-ignore */languagePath);
        return module.language;
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