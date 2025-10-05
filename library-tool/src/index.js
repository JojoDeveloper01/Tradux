#!/usr/bin/env node
import { logger } from './utils/logger.js';
import { loadConfig } from './utils/config.js';
import { availableLanguages } from './utils/languages.js';
import { translateFiles, updateLanguageFiles } from './core/translator.js';

import { program } from 'commander';
import prompts from 'prompts';
import fs from 'fs';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

let cachedConfig = null;

async function getConfig() {
    if (!cachedConfig) {
        cachedConfig = await loadConfig();
    }
    return cachedConfig;
}

program
    .name('tradux')
    .description('A CLI tool for automated translation')
    .version(packageJson.version, '-v, --version', 'output the version number')

program
    .command('init')
    .description('Initialize tradux configuration')
    .action(async () => {
        try {
            const { runPostInstall } = await import('../postinstall.js');
            await runPostInstall();
        } catch (error) {
            logger.error('Failed to initialize tradux:');
            logger.error(error.message);
            process.exit(1);
        }
    });

program
    .option('-t, --languages [languages]')
    .option('-u, --update [languages]')
    .option('-r, --remove [languages]')
    .action(async (options) => {
        try {
            if (options.remove !== undefined) {
                const languages = await getRemoveLanguages(options);
                if (languages) {
                    await removeLanguageFiles(languages);
                }
            } else if (options.update !== undefined) {
                const languages = await getUpdateLanguages(options);
                if (languages) {
                    const config = await getConfig();
                    await updateLanguageFiles(languages, config);
                }
            } else {
                const languages = await getLanguages(options);
                if (languages) {
                    const config = await getConfig();
                    await translateFiles(languages, config);
                }
            }
        } catch (error) {
            logger.error(`Error: ${error.message}`);
            process.exit(1);
        }
    });

program
    .configureHelp({
        formatHelp: () => {
            showHelp();
            return '';
        }
    });

program.parse();

async function getLanguages(options) {
    try {
        if (!options.languages && !process.argv.includes('-t') && !process.argv.includes('--languages')) {
            showHelp();
            return null;
        }

        const config = await getConfig();
        if (!config) {
            logger.error('\n Configuration file not found!');
            logger.info('   Tradux needs to be initialized in this project.');
            logger.info('   Run the following command to get started:');
            logger.success('\n   npx tradux init\n');
            process.exit(1);
        }

        if (options.languages === undefined && (process.argv.includes('-t') || process.argv.includes('--languages'))) {
            return await promptLanguages();
        }

        if (options.languages === true || options.languages === '') {
            return await promptLanguages();
        }

        if (options.languages) {
            const tIndex = process.argv.findIndex(arg => arg === '-t' || arg === '--languages');
            if (tIndex !== -1) {
                const remainingArgs = process.argv.slice(tIndex + 1);
                const languageArgs = [];

                for (const arg of remainingArgs) {
                    if (arg.startsWith('-')) break;
                    languageArgs.push(arg);
                }

                if (languageArgs.length > 0) {
                    const allLanguages = languageArgs.join(' ')
                        .replace(/\s*,\s*/g, ',')
                        .replace(/\s+/g, ',')
                        .replace(/,+/g, ',')
                        .replace(/^,|,$/g, '');

                    return allLanguages;
                }
            }

            return options.languages;
        }

        return await promptLanguages();
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

async function getUpdateLanguages(options) {
    try {
        if (!options.update && !process.argv.includes('-u') && !process.argv.includes('--update')) {
            return null;
        }

        const config = await getConfig();
        if (!config) {
            logger.error('\n Configuration file not found!');
            logger.info('   Tradux needs to be initialized in this project.');
            logger.info('   Run the following command to get started:');
            logger.success('\n   npx tradux init\n');
            process.exit(1);
        }

        if (options.update === undefined && (process.argv.includes('-u') || process.argv.includes('--update'))) {
            return await promptUpdateAllLanguages();
        }

        if (options.update === true || options.update === '') {
            return await promptUpdateAllLanguages();
        }

        if (options.update) {
            const uIndex = process.argv.findIndex(arg => arg === '-u' || arg === '--update');
            if (uIndex !== -1) {
                const remainingArgs = process.argv.slice(uIndex + 1);
                const languageArgs = [];

                for (const arg of remainingArgs) {
                    if (arg.startsWith('-')) break;
                    languageArgs.push(arg);
                }

                if (languageArgs.length > 0) {
                    const allLanguages = languageArgs.join(' ')
                        .replace(/\s*,\s*/g, ',')
                        .replace(/\s+/g, ',')
                        .replace(/,+/g, ',')
                        .replace(/^,|,$/g, '');

                    return allLanguages;
                }
            }

            return options.update;
        }

        return await promptUpdateAllLanguages();
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

async function getRemoveLanguages(options) {
    const config = await getConfig();
    if (!config) {
        logger.error('Configuration file not found! Run "npx tradux init" first.');
        process.exit(1);
    }

    if (options.remove && typeof options.remove === 'string') {
        return options.remove;
    }

    return await promptRemoveLanguages();
}

async function getExistingLanguages(config) {
    try {
        const { fileManager } = await import('./core/file-manager.js');
        const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);

        if (!fs.existsSync(i18nAbsolutePath)) {
            logger.error(`i18n directory not found: ${i18nAbsolutePath}`);
            process.exit(1);
        }

        const files = fs.readdirSync(i18nAbsolutePath);
        const languageFiles = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));

        return languageFiles;
    } catch (error) {
        logger.error(`Error reading i18n directory: ${error.message}`);
        process.exit(1);
    }
}

async function updateConfigAvailableLanguages() {
    try {
        const configPath = path.join(process.cwd(), 'tradux.config.json');

        if (!fs.existsSync(configPath)) {
            return;
        }

        const configContent = await fs.promises.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);

        const existingLanguages = await getExistingLanguages(config);

        config.availableLanguages = existingLanguages.sort();

        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 4));

        logger.info(`Updated availableLanguages: [${existingLanguages.join(', ')}]`);
    } catch (error) {
        logger.warn(`Failed to update config: ${error.message}`);
    }
}

async function removeLanguageFiles(languages) {
    const config = await getConfig();
    const { fileManager } = await import('./core/file-manager.js');
    const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);

    const languageList = languages.split(',').map(lang => lang.trim());
    let filesRemoved = false;

    for (const lang of languageList) {
        if (lang === config.defaultLanguage) {
            logger.warn(`Skipping default language: ${lang}`);
            continue;
        }

        const filePath = path.join(i18nAbsolutePath, `${lang}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.success(`Removed ${lang}.json`);
            filesRemoved = true;
        } else {
            logger.warn(`File not found: ${lang}.json`);
        }
    }

    if (filesRemoved) {
        await updateConfigAvailableLanguages();
    }
}

async function promptUpdateAllLanguages() {
    try {
        logger.info('\nTradux Language Update');
        logger.warn('\nThis will update all existing languages based on your default language configuration.');

        const confirmResponse = await prompts({
            type: 'confirm',
            name: 'confirmUpdate',
            message: 'Do you want to update all existing languages?',
            initial: true
        });

        if (!confirmResponse.confirmUpdate) {
            logger.info('Update operation cancelled.');
            process.exit(0);
        }

        const config = await getConfig();

        const existingLanguages = await getExistingLanguages(config);

        const languagesToUpdate = existingLanguages.filter(lang => lang !== config.defaultLanguage);

        if (languagesToUpdate.length === 0) {
            logger.warn('No languages to update. Only default language file exists or no language files found.');
            process.exit(0);
        }

        const selectedNames = languagesToUpdate
            .map(lang => {
                const langInfo = availableLanguages.find(al => al.value === lang);
                return langInfo ? langInfo.name : lang;
            })
            .join(', ');

        logger.success(`\nWill update existing languages: ${selectedNames}`);
        logger.info(`Base language: ${config.defaultLanguage}\n`);

        return languagesToUpdate.join(',');
    } catch (error) {
        logger.info('\nOperation cancelled by user.');
        process.exit(0);
    }
}

async function promptRemoveLanguages() {
    const config = await getConfig();
    const existingLanguages = await getExistingLanguages(config);

    const removableLanguages = existingLanguages.filter(lang => lang !== config.defaultLanguage);

    if (removableLanguages.length === 0) {
        logger.warn('No languages available to remove.');
        process.exit(0);
    }

    const choices = removableLanguages.map(lang => {
        const langInfo = availableLanguages.find(al => al.value === lang);
        return {
            title: langInfo ? langInfo.name : lang,
            value: lang
        };
    });

    const response = await prompts({
        type: 'multiselect',
        name: 'selectedLanguages',
        message: 'Choose languages to remove:',
        choices: choices,
        min: 1
    });

    if (!response.selectedLanguages?.length) {
        logger.info('No languages selected.');
        process.exit(0);
    }

    const confirmResponse = await prompts({
        type: 'confirm',
        name: 'confirmRemove',
        message: 'Are you sure? This will permanently delete these files.',
        initial: false
    });

    if (!confirmResponse.confirmRemove) {
        logger.info('Operation cancelled.');
        process.exit(0);
    }

    return response.selectedLanguages.join(',');
}

function showHelp() {
    logger.info(`
Tradux - Translation Tool

Usage:
  npx tradux                    Shows this help message
  npx tradux init               Initialize Tradux in your project
  npx tradux -t                 Interactive language selection
  npx tradux -t es,pt,lang...   Translate to other languages based on default language
  npx tradux -u                 Update all languages based on default language
  npx tradux -u es,pt,lang...   Update specific languages based on default language
  npx tradux -r                 Interactive removal of language files
  npx tradux -r es,pt,lang...   Remove specific language files
`);

    const configPath = path.join(process.cwd(), 'tradux.config.json');

    if (!fs.existsSync(configPath)) {
        logger.warn('   Configuration file not found.');
        logger.success('   Run "npx tradux init" to initialize Tradux in this project.\n');
    } else {
        logger.success('Tradux is configured and ready to use!');
    }
}

async function promptLanguages() {
    try {
        logger.info('\nTradux Language Selection');
        logger.info('Select the languages you want to translate your content to:\n');

        const response = await prompts({
            type: 'multiselect',
            name: 'selectedLanguages',
            message: 'Choose target languages:',
            choices: availableLanguages.map(lang => ({
                title: lang.name,
                value: lang.value
            })),
            min: 1,
            hint: 'Space to select, Enter to confirm'
        });

        if (!response.selectedLanguages || response.selectedLanguages.length === 0) {
            logger.warn('No languages selected. Exiting...');
            process.exit(0);
        }

        const selectedNames = availableLanguages
            .filter(lang => response.selectedLanguages.includes(lang.value))
            .map(lang => lang.name)
            .join(', ');

        logger.success(`\nSelected languages: ${selectedNames}\n`);

        return response.selectedLanguages.join(',');
    } catch (error) {
        logger.info('\nOperation cancelled by user.');
        process.exit(0);
    }
}