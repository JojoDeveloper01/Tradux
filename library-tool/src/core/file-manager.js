import path from 'path';
import fs from 'fs-extra';

/**
 * Centralized file and module management
 */
class FileManager {
    constructor() {
        this.moduleCache = new Map();
        this.configCache = null;
    }

    /**
     * Convert file path to proper URL for dynamic imports
     */
    pathToUrl(filePath) {
        const absolutePath = path.resolve(filePath);
        return `file:///${absolutePath.replace(/\\/g, '/')}`;
    }

    /**
     * Check if file exists
     */
    exists(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * Load module with caching and timestamp to avoid cache issues
     */
    async loadModule(filePath, useCache = false) {
        const absolutePath = path.resolve(filePath);

        if (!this.exists(absolutePath)) {
            return null;
        }

        const cacheKey = absolutePath;

        if (useCache && this.moduleCache.has(cacheKey)) {
            return this.moduleCache.get(cacheKey);
        }

        try {
            const moduleUrl = `${this.pathToUrl(absolutePath)}?t=${Date.now()}`;
            const module = await import(moduleUrl);

            if (useCache) {
                this.moduleCache.set(cacheKey, module);
            }

            return module;
        } catch (error) {
            console.error(`Failed to load module: ${absolutePath}`);
            return null;
        }
    }

    /**
     * Resolve i18n path by trying multiple locations
     */
    resolveI18nPath(configI18nPath) {
        const possiblePaths = [
            configI18nPath,
            configI18nPath.replace('./i18n', './public/i18n'),
            './public/i18n',
            './i18n'
        ];

        for (const testPath of possiblePaths) {
            const absolutePath = path.resolve(testPath);
            if (this.exists(absolutePath)) {
                return testPath;
            }
        }

        return configI18nPath;
    }

    /**
     * Load language file with proper error handling
     */
    async loadLanguageFile(i18nPath, language) {
        const resolvedPath = this.resolveI18nPath(i18nPath);
        const languageFile = path.join(resolvedPath, `${language}.json`);

        if (!this.exists(languageFile)) {
            return null;
        }

        try {
            const fileContent = await fs.readFile(languageFile, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            console.error(`Failed to load language file: ${languageFile}`);
            return null;
        }
    }

    /**
     * Load and cache config
     */
    async loadConfig() {
        if (this.configCache) {
            return this.configCache;
        }

        const configPath = path.join(process.cwd(), 'tradux.config.json');

        if (!this.exists(configPath)) {
            return null;
        }

        try {
            const fileContent = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(fileContent);

            if (!config.i18nPath || !config.defaultLanguage) {
                throw new Error('Invalid configuration: missing required values');
            }

            const resolvedI18nPath = this.resolveI18nPath(config.i18nPath);

            this.configCache = {
                i18nPath: resolvedI18nPath,
                defaultLanguage: config.defaultLanguage
            };

            return this.configCache;
        } catch (error) {
            console.error(`Failed to load config file: ${configPath}`);
            return null;
        }
    }

    /**
     * Get absolute i18n path
     */
    getAbsoluteI18nPath(relativePath) {
        return path.resolve(relativePath);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.moduleCache.clear();
        this.configCache = null;
    }
}

export const fileManager = new FileManager();
