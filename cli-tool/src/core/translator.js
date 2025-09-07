import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { fileManager } from './file-manager.js';
import dotenv from 'dotenv';

const WORKER_URL = 'https://worker-proxy.seth-eb4.workers.dev/api/translate-json';

export async function translateFiles(languages, config) {
    // Load and validate environment variables
    const credentials = await loadCredentials();

    try {
        const languagesArray = parseLanguages(languages);
        const uniqueLanguages = [...new Set(languagesArray)];

        logger.info(`\nStarting translation process for: ${uniqueLanguages.join(', ')}`);

        const sourceFile = await loadSourceFile(config);

        for (const lang of uniqueLanguages) {
            await translateLanguage(lang, sourceFile, config, credentials);
        }

        logger.success('\n \u2606 Translation process completed \u2606');
    } catch (error) {
        logger.error(`Translation failed: ${error.message}`);
        process.exit(1);
    }
}

async function loadCredentials() {
    const envResult = dotenv.config();
    if (envResult.error) {
        logger.error('Missing Cloudflare credentials');
        logger.error('Please create a .env file with:');
        logger.error('CLOUDFLARE_API_TOKEN=your_token');
        logger.error('CLOUDFLARE_ACCOUNT_ID=your_account_id\n');
        process.exit(1);
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
        logger.error('Missing Cloudflare credentials.');
        logger.error('Required environment variables:');
        logger.error('- CLOUDFLARE_API_TOKEN');
        logger.error('- CLOUDFLARE_ACCOUNT_ID');
        logger.error('\nMake sure your .env file contains these variables and is located at:');
        logger.error(path.join(process.cwd(), '.env'));
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
    const sourcePath = path.join(i18nAbsolutePath, `${config.defaultLanguage}.js`);

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
    const targetFile = path.join(i18nAbsolutePath, `${lang}.js`);

    if (fileManager.exists(targetFile)) {
        logger.warn(`Skipping existing translation: ${lang}`);
        return;
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

        // Write as JavaScript module
        const jsContent = `export const language = ${JSON.stringify(result.translatedData, null, 2)};`;
        await fs.writeFile(targetFile, jsContent);
        logger.success(`Translation completed: ${lang}`);
    } catch (error) {
        logger.error(`Failed to translate ${lang}: ${error.message}`);
    }
}

export async function updateLanguageFiles(languages, config) {
    // Load and validate environment variables
    const credentials = await loadCredentials();

    try {
        const languagesArray = parseLanguages(languages);
        const uniqueLanguages = [...new Set(languagesArray)];

        logger.info(`\nStarting update process for: ${uniqueLanguages.join(', ')}`);
        logger.info(`Base language: ${config.defaultLanguage}`);

        const sourceFile = await loadSourceFile(config);

        for (const lang of uniqueLanguages) {
            // Skip if trying to update the default language itself
            if (lang === config.defaultLanguage) {
                logger.warn(`Skipping ${lang} - cannot update the default language`);
                continue;
            }

            await updateLanguage(lang, sourceFile, config, credentials);
        }

        logger.success('\n \u2606 Language update process completed \u2606');
    } catch (error) {
        logger.error(`Update failed: ${error.message}`);
        process.exit(1);
    }
}

async function updateLanguage(lang, sourceData, config, credentials) {
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);
    const targetFile = path.join(i18nAbsolutePath, `${lang}.js`);

    if (!fileManager.exists(targetFile)) {
        logger.info(`Target file doesn't exist for ${lang}, creating new translation...`);
        await translateLanguage(lang, sourceData, config, credentials);
        return;
    }

    try {
        logger.info(`\nChecking updates for ${lang}...`);

        // Load existing target language data
        const existingData = await fileManager.loadLanguageFile(i18nAbsolutePath, lang);

        if (!existingData) {
            logger.warn(`Failed to load existing data for ${lang}, recreating file...`);
            await translateLanguage(lang, sourceData, config, credentials);
            return;
        }

        // Find missing keys by comparing structures
        const missingContent = findMissingContent(sourceData, existingData);

        // Find obsolete keys that exist in target but not in source
        const obsoleteKeys = findObsoleteContent(sourceData, existingData);

        // Check if there are any changes needed
        const hasMissingContent = Object.keys(missingContent).length > 0;
        const hasObsoleteContent = obsoleteKeys.length > 0;

        if (!hasMissingContent && !hasObsoleteContent) {
            logger.success(`${lang} is already up to date`);
            return;
        }

        let updatedData = { ...existingData };

        // Remove obsolete keys first
        if (hasObsoleteContent) {
            logger.info(`Removing obsolete content from ${lang}...`);
            updatedData = removeObsoleteKeys(updatedData, obsoleteKeys);
            logger.info(`Removed obsolete keys: ${obsoleteKeys.join(', ')}`);
        }

        // Add missing content if any
        if (hasMissingContent) {
            logger.info(`Found missing content in ${lang}, translating...`);

            // Translate only the missing content
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

            // Merge the translated missing content with existing data
            updatedData = deepMerge(updatedData, result.translatedData);
        }

        // Write as JavaScript module
        const jsContent = `export const language = ${JSON.stringify(updatedData, null, 2)};`;
        await fs.writeFile(targetFile, jsContent);

        const changes = [];
        if (hasMissingContent) changes.push('added missing content');
        if (hasObsoleteContent) changes.push('removed obsolete content');

        logger.success(`\nUpdated ${lang} (${changes.join(' and ')})`);
    } catch (error) {
        logger.error(`Failed to update ${lang}: ${error.message}`);
    }
}

function findMissingContent(source, target, path = '') {
    const missing = {};

    for (const key in source) {
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in target)) {
            // Key is completely missing
            missing[key] = source[key];
        } else if (typeof source[key] === 'object' && source[key] !== null) {
            if (typeof target[key] === 'object' && target[key] !== null) {
                // Both are objects, recurse
                const nestedMissing = findMissingContent(source[key], target[key], currentPath);
                if (Object.keys(nestedMissing).length > 0) {
                    missing[key] = nestedMissing;
                }
            } else {
                // Source is object but target is not, replace entirely
                missing[key] = source[key];
            }
        }
        // If both are primitive values and key exists, don't add to missing
        // This preserves existing translations
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
            // Key exists in target but not in source - it's obsolete
            obsoleteKeys.push(currentPath);
        } else if (typeof target[key] === 'object' && target[key] !== null) {
            if (typeof source[key] === 'object' && source[key] !== null) {
                // Both are objects, recurse
                const nestedObsolete = findObsoleteContent(source[key], target[key], currentPath);
                obsoleteKeys.push(...nestedObsolete);
            } else {
                // Target is object but source is not, the whole object is obsolete
                obsoleteKeys.push(currentPath);
            }
        }
    }

    return obsoleteKeys;
}

function removeObsoleteKeys(data, obsoleteKeys) {
    const result = JSON.parse(JSON.stringify(data)); // Deep clone

    for (const keyPath of obsoleteKeys) {
        const keys = keyPath.split('.');
        let current = result;

        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] && typeof current[keys[i]] === 'object') {
                current = current[keys[i]];
            } else {
                // Path doesn't exist, skip
                break;
            }
        }

        // Remove the final key
        const finalKey = keys[keys.length - 1];
        if (current && current.hasOwnProperty(finalKey)) {
            delete current[finalKey];
        }
    }

    return result;
}