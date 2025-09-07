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
     * Load language file with proper error handling
     */
    async loadLanguageFile(i18nPath, language) {
        const languageFile = path.join(i18nPath, `${language}.js`);
        const module = await this.loadModule(languageFile);
        return module?.language || null;
    }

    /**
     * Load and cache config
     */
    async loadConfig() {
        if (this.configCache) {
            return this.configCache;
        }

        const configPath = path.join(process.cwd(), 'tradux.config.js');
        const configModule = await this.loadModule(configPath);

        if (!configModule) {
            return null;
        }

        if (!configModule.i18nPath || !configModule.defaultLanguage) {
            throw new Error('Invalid configuration: missing required values');
        }

        this.configCache = {
            i18nPath: configModule.i18nPath,
            defaultLanguage: configModule.defaultLanguage
        };

        return this.configCache;
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

// Export singleton instance
export const fileManager = new FileManager();
