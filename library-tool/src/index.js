#!/usr/bin/env node
import { logger } from './utils/logger.js';
import { loadConfig } from './utils/config.js';
import { availableLanguages } from './utils/languages.js';
import { translateFiles, updateLanguageFiles } from './core/translator.js';

import { program } from 'commander';
import prompts from 'prompts';
import fs from 'fs';
import path from 'path';

// Cache config to avoid multiple loads
let cachedConfig = null;

async function getConfig() {
    if (!cachedConfig) {
        cachedConfig = await loadConfig();
    }
    return cachedConfig;
}

// Configure commander
program
    .name('tradux')
    .description('A CLI tool for automated translation')

// Init command
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

// Default command (translate)
program
    .option('-t, --languages [languages]')
    .option('-u, --update [languages]')
    .action(async (options) => {
        try {
            if (options.update !== undefined) {
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

// Override help command to show custom help
program
    .configureHelp({
        formatHelp: () => {
            showHelp();
            return '';
        }
    });

// Parse arguments
program.parse();

async function getLanguages(options) {
    try {
        // If no -t option provided at all, show help
        if (!options.languages && !process.argv.includes('-t') && !process.argv.includes('--languages')) {
            showHelp();
            return null;
        }

        // Check if config exists before allowing translation operations
        const config = await getConfig();
        if (!config) {
            logger.error('\n Configuration file not found!');
            logger.info('   Tradux needs to be initialized in this project.');
            logger.info('   Run the following command to get started:');
            logger.success('\n   npx tradux init\n');
            process.exit(1);
        }

        // If -t provided without value (undefined), start interactive mode
        if (options.languages === undefined && (process.argv.includes('-t') || process.argv.includes('--languages'))) {
            return await promptLanguages();
        }

        // If -t with empty string or true, start interactive mode
        if (options.languages === true || options.languages === '') {
            return await promptLanguages();
        }

        // If languages specified, process them
        if (options.languages) {
            // Capture all remaining arguments after -t to handle cases like "es, fr"
            const tIndex = process.argv.findIndex(arg => arg === '-t' || arg === '--languages');
            if (tIndex !== -1) {
                const remainingArgs = process.argv.slice(tIndex + 1);
                const languageArgs = [];

                // Collect all arguments until we hit another flag or end
                for (const arg of remainingArgs) {
                    if (arg.startsWith('-')) break;
                    languageArgs.push(arg);
                }

                if (languageArgs.length > 0) {
                    // Join all arguments and clean up spaces around commas
                    const allLanguages = languageArgs.join(' ')
                        .replace(/\s*,\s*/g, ',') // Remove spaces around commas
                        .replace(/\s+/g, ',')     // Replace multiple spaces with commas
                        .replace(/,+/g, ',')      // Remove duplicate commas
                        .replace(/^,|,$/g, '');   // Remove leading/trailing commas

                    return allLanguages;
                }
            }

            return options.languages;
        }

        // Default to interactive mode
        return await promptLanguages();
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

async function getUpdateLanguages(options) {
    try {
        // If no -u option provided at all, this shouldn't be called
        if (!options.update && !process.argv.includes('-u') && !process.argv.includes('--update')) {
            return null;
        }

        // Check if config exists before allowing update operations
        const config = await getConfig();
        if (!config) {
            logger.error('\n Configuration file not found!');
            logger.info('   Tradux needs to be initialized in this project.');
            logger.info('   Run the following command to get started:');
            logger.success('\n   npx tradux init\n');
            process.exit(1);
        }

        // If -u provided without value (undefined), start interactive mode with confirmation
        if (options.update === undefined && (process.argv.includes('-u') || process.argv.includes('--update'))) {
            return await promptUpdateAllLanguages();
        }

        // If -u with empty string or true, start interactive mode with confirmation
        if (options.update === true || options.update === '') {
            return await promptUpdateAllLanguages();
        }

        // If languages specified, process them
        if (options.update) {
            // Capture all remaining arguments after -u to handle cases like "es, fr"
            const uIndex = process.argv.findIndex(arg => arg === '-u' || arg === '--update');
            if (uIndex !== -1) {
                const remainingArgs = process.argv.slice(uIndex + 1);
                const languageArgs = [];

                // Collect all arguments until we hit another flag or end
                for (const arg of remainingArgs) {
                    if (arg.startsWith('-')) break;
                    languageArgs.push(arg);
                }

                if (languageArgs.length > 0) {
                    // Join all arguments and clean up spaces around commas
                    const allLanguages = languageArgs.join(' ')
                        .replace(/\s*,\s*/g, ',') // Remove spaces around commas
                        .replace(/\s+/g, ',')     // Replace multiple spaces with commas
                        .replace(/,+/g, ',')      // Remove duplicate commas
                        .replace(/^,|,$/g, '');   // Remove leading/trailing commas

                    return allLanguages;
                }
            }

            return options.update;
        }

        // Default to interactive mode with confirmation
        return await promptUpdateAllLanguages();
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

async function getExistingLanguages(config) {
    try {
        const { fileManager } = await import('./core/file-manager.js');
        const i18nAbsolutePath = fileManager.getAbsoluteI18nPath(config.i18nPath);

        if (!fs.existsSync(i18nAbsolutePath)) {
            logger.error(`i18n directory not found: ${i18nAbsolutePath}`);
            process.exit(1);
        }

        // Read all .json files in the i18n directory
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

        // Get the config to know the i18n path and default language
        const config = await getConfig();

        // Get existing language files from i18n directory
        const existingLanguages = await getExistingLanguages(config);

        // Filter out the default language from the update list
        const languagesToUpdate = existingLanguages.filter(lang => lang !== config.defaultLanguage);

        if (languagesToUpdate.length === 0) {
            logger.warn('No languages to update. Only default language file exists or no language files found.');
            process.exit(0);
        }

        // Show which languages will be updated
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
        // Handle user cancellation (Ctrl+C)
        logger.info('\nOperation cancelled by user.');
        process.exit(0);
    }
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
`);

    // Check if config exists and show warning if not
    const configPath = path.join(process.cwd(), 'tradux.config.js');

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

        // Show confirmation
        const selectedNames = availableLanguages
            .filter(lang => response.selectedLanguages.includes(lang.value))
            .map(lang => lang.name)
            .join(', ');

        logger.success(`\nSelected languages: ${selectedNames}\n`);

        return response.selectedLanguages.join(',');
    } catch (error) {
        // Handle user cancellation (Ctrl+C)
        logger.info('\nOperation cancelled by user.');
        process.exit(0);
    }
}