import fs from 'fs-extra';
import path from 'path';
import { logger } from './src/utils/logger.js';

const CONFIG_FILENAME = 'tradux.config.js';
const DEFAULT_LANG = 'en';

// I18n path search configuration - prioritize public paths for production compatibility
const COMMON_I18N_PATHS = [
    'public/i18n',
    'i18n',
    'src/i18n',
    'app/i18n'
];

/**
 * Searches for an existing i18n folder in common locations
 */
function findI18nPathSync(dir) {
    // Check common paths first
    for (const p of COMMON_I18N_PATHS) {
        const fullPath = path.join(dir, p);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }

    // Search in subdirectories
    const subdirs = fs.readdirSync(dir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    for (const subdir of subdirs) {
        const subI18nPath = path.join(dir, subdir, 'i18n');
        if (fs.existsSync(subI18nPath)) {
            return subI18nPath;
        }
    }

    return null;
}

/**
 * Creates the configuration file with the specified i18n path
 */
async function createConfigFile(configPath, i18nPath, projectRoot) {
    const relativePath = path.relative(projectRoot, i18nPath);
    const sanitizedPath = `./${relativePath}`.replace(/\\/g, '/');

    const configContent = `
export const i18nPath = '${sanitizedPath}';
export const defaultLanguage = '${DEFAULT_LANG}';`;

    await fs.writeFile(configPath, configContent);
    logger.success(`\n Configuration file created at './${CONFIG_FILENAME}'`);
}

/**
 * Creates a sample translation file
 */
async function createSampleTranslation(i18nPath) {
    const sampleContent = {
        navigation: {
            home: "Home",
            about: "About Us",
            services: "Our Services"
        },
        welcome: "Welcome to my website!"
    };

    const filePath = path.join(i18nPath, 'en.js');
    await fs.writeFile(filePath, `export const language = ${JSON.stringify(sampleContent, null, 2)};`);
    logger.info('Created sample en.js translation file');
}

/**
 * Main installation script
 */
export async function runPostInstall() {
    try {
        // Initialize project root here
        const PROJECT_ROOT = process.env.INIT_CWD || process.cwd();
        const configPath = path.join(PROJECT_ROOT, CONFIG_FILENAME);

        // Check if config already exists
        if (fs.existsSync(configPath)) {
            logger.info(`Configuration file already exists at './${CONFIG_FILENAME}'`);
            return;
        }

        // Find or create i18n directory using the local PROJECT_ROOT
        let i18nPath = findI18nPathSync(PROJECT_ROOT);
        if (!i18nPath) {
            logger.info("\nNo 'i18n' folder found. Creating a new one at 'public/i18n' for production compatibility");
            i18nPath = path.join(PROJECT_ROOT, 'public', 'i18n');
            await fs.ensureDir(i18nPath);
            await createSampleTranslation(i18nPath);
        }

        // Create config file with the local PROJECT_ROOT
        await createConfigFile(configPath, i18nPath, PROJECT_ROOT);

        logger.success('\n Installation completed successfully');
        logger.info('\nYou can now use the tradux CLI!');

    } catch (error) {
        logger.error('Failed to run tradux postinstall script:');
        logger.error(error.message);
        process.exit(1);
    }
}