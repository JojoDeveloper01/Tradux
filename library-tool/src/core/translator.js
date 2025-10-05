import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { fileManager } from './file-manager.js';

const WORKER_URL = 'https://worker-proxy.seth-eb4.workers.dev/api/translate-json';

async function updateConfigAvailableLanguages() {
    try {
        const configPath = path.join(process.cwd(), 'tradux.config.json');

        if (!fs.existsSync(configPath)) {
            return;
        }

        const configContent = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);

        const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);

        if (fs.existsSync(i18nAbsolutePath)) {
            const files = fs.readdirSync(i18nAbsolutePath);
            const existingLanguages = files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''))
                .sort();

            config.availableLanguages = existingLanguages;

            await fs.writeFile(configPath, JSON.stringify(config, null, 4));
        }
    } catch (error) {
        logger.warn(`Failed to update config: ${error.message}`);
    }
}

export async function translateFiles(languages, config) {
    const credentials = await loadCredentials();

    try {
        const languagesArray = parseLanguages(languages);
        const uniqueLanguages = [...new Set(languagesArray)];

        logger.info(`\nStarting translation process for: ${uniqueLanguages.join(', ')}`);

        const sourceFile = await loadSourceFile(config);
        let filesCreated = false;

        for (const lang of uniqueLanguages) {
            const created = await translateLanguage(lang, sourceFile, config, credentials);
            if (created) filesCreated = true;
        }

        if (filesCreated) {
            await updateConfigAvailableLanguages();
        }

        logger.success('\n \u2606 Translation process completed \u2606');
    } catch (error) {
        logger.error(`Translation failed: ${error.message}`);
        process.exit(1);
    }
}

async function loadCredentials() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');

            envContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    if (!process.env[key.trim()]) {
                        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
                    }
                }
            });
        }
    } catch (error) {
        logger.debug(`Could not parse .env file: ${error.message}`);
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
        logger.error('Missing Cloudflare credentials.');
        logger.error('Required environment variables:');
        logger.error('- CLOUDFLARE_API_TOKEN');
        logger.error('- CLOUDFLARE_ACCOUNT_ID');
        logger.error('\nYou can set them either:');
        logger.error('1. In a .env file at project root:');
        logger.error('   CLOUDFLARE_API_TOKEN=your_token');
        logger.error('   CLOUDFLARE_ACCOUNT_ID=your_account_id');
        logger.error('2. As environment variables in your shell');
        logger.error(`\nChecked location: ${path.join(process.cwd(), '.env')}`);
        process.exit(1);
    }

    return { apiToken, accountId };
}

function parseLanguages(languages) {
    return languages
        .split(',')
        .map(lang => lang.trim())
        .filter(Boolean);
}

async function loadSourceFile(config) {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const sourcePath = path.join(i18nAbsolutePath, `${config.defaultLanguage}.json`);

    if (!fileManager.exists(sourcePath)) {
        logger.error(`Source file not found: ${sourcePath}`);
        process.exit(1);
    }

    try {
        const sourceData = await fileManager.loadLanguageFile(i18nAbsolutePath, config.defaultLanguage);

        if (!sourceData) {
            throw new Error('Failed to load source language data');
        }

        return sourceData;
    } catch (error) {
        logger.error(`Failed to load source file: ${error.message}`);
        logger.debug(`Attempted to load: ${sourcePath}`);
        process.exit(1);
    }
}

async function translateLanguage(lang, sourceData, config, credentials) {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

    if (fileManager.exists(targetFile)) {
        logger.warn(`Skipping existing translation: ${lang}`);
        return false;
    }

    try {
        logger.info(`\nTranslating to ${lang}...`);

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: sourceData,
                targetLanguage: lang,
                ...credentials
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        await fs.writeFile(targetFile, JSON.stringify(result.translatedData, null, 2));
        logger.success(`Translation completed: ${lang}`);
        return true;
    } catch (error) {
        logger.error(`Failed to translate ${lang}: ${error.message}`);
        return false;
    }
}

export async function updateLanguageFiles(languages, config) {
    const credentials = await loadCredentials();

    try {
        const languagesArray = parseLanguages(languages);
        const uniqueLanguages = [...new Set(languagesArray)];

        logger.info(`\nStarting update process for: ${uniqueLanguages.join(', ')}`);
        logger.info(`Base language: ${config.defaultLanguage}`);

        const sourceFile = await loadSourceFile(config);
        let filesCreated = false;

        for (const lang of uniqueLanguages) {
            if (lang === config.defaultLanguage) {
                logger.warn(`Skipping ${lang} - cannot update the default language`);
                continue;
            }

            const created = await updateLanguage(lang, sourceFile, config, credentials);
            if (created) filesCreated = true;
        }

        if (filesCreated) {
            await updateConfigAvailableLanguages();
        }

        logger.success('\n \u2606 Language update process completed \u2606');
    } catch (error) {
        logger.error(`Update failed: ${error.message}`);
        process.exit(1);
    }
}

async function updateLanguage(lang, sourceData, config, credentials) {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const targetFile = path.join(i18nAbsolutePath, `${lang}.json`);

    if (!fileManager.exists(targetFile)) {
        logger.info(`Target file doesn't exist for ${lang}, creating new translation...`);
        return await translateLanguage(lang, sourceData, config, credentials);
    }

    try {
        logger.info(`\nChecking updates for ${lang}...`);

        const existingData = await fileManager.loadLanguageFile(i18nAbsolutePath, lang);

        if (!existingData) {
            logger.warn(`Failed to load existing data for ${lang}, recreating file...`);
            return await translateLanguage(lang, sourceData, config, credentials);
        }

        const missingContent = findMissingContent(sourceData, existingData);

        const obsoleteKeys = findObsoleteContent(sourceData, existingData);

        const hasMissingContent = Object.keys(missingContent).length > 0;
        const hasObsoleteContent = obsoleteKeys.length > 0;

        if (!hasMissingContent && !hasObsoleteContent) {
            logger.success(`${lang} is already up to date`);
            return false;
        }

        let updatedData = { ...existingData };

        if (hasObsoleteContent) {
            logger.info(`Removing obsolete content from ${lang}...`);
            updatedData = removeObsoleteKeys(updatedData, obsoleteKeys);
            logger.info(`Removed obsolete keys: ${obsoleteKeys.join(', ')}`);
        }

        if (hasMissingContent) {
            logger.info(`Found missing content in ${lang}, translating...`);

            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: missingContent,
                    targetLanguage: lang,
                    ...credentials
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            updatedData = deepMerge(updatedData, result.translatedData);
        }

        await fs.writeFile(targetFile, JSON.stringify(updatedData, null, 2));

        const changes = [];
        if (hasMissingContent) changes.push('added missing content');
        if (hasObsoleteContent) changes.push('removed obsolete content');

        logger.success(`\nUpdated ${lang} (${changes.join(' and ')})`);
        return false;
    } catch (error) {
        logger.error(`Failed to update ${lang}: ${error.message}`);
        return false;
    }
}

function findMissingContent(source, target, path = '') {
    const missing = {};

    for (const key in source) {
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in target)) {
            missing[key] = source[key];
        } else if (typeof source[key] === 'object' && source[key] !== null) {
            if (typeof target[key] === 'object' && target[key] !== null) {
                const nestedMissing = findMissingContent(source[key], target[key], currentPath);
                if (Object.keys(nestedMissing).length > 0) {
                    missing[key] = nestedMissing;
                }
            } else {
                missing[key] = source[key];
            }
        }
    }

    return missing;
}

function deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (typeof result[key] === 'object' && result[key] !== null) {
                result[key] = deepMerge(result[key], source[key]);
            } else {
                result[key] = source[key];
            }
        } else {
            result[key] = source[key];
        }
    }

    return result;
}

function findObsoleteContent(source, target, path = '') {
    const obsoleteKeys = [];

    for (const key in target) {
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in source)) {
            obsoleteKeys.push(currentPath);
        } else if (typeof target[key] === 'object' && target[key] !== null) {
            if (typeof source[key] === 'object' && source[key] !== null) {
                const nestedObsolete = findObsoleteContent(source[key], target[key], currentPath);
                obsoleteKeys.push(...nestedObsolete);
            } else {
                obsoleteKeys.push(currentPath);
            }
        }
    }

    return obsoleteKeys;
}

function removeObsoleteKeys(data, obsoleteKeys) {
    const result = JSON.parse(JSON.stringify(data));

    for (const keyPath of obsoleteKeys) {
        const keys = keyPath.split('.');
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] && typeof current[keys[i]] === 'object') {
                current = current[keys[i]];
            } else {
                break;
            }
        }

        const finalKey = keys[keys.length - 1];
        if (current && current.hasOwnProperty(finalKey)) {
            delete current[finalKey];
        }
    }

    return result;
}