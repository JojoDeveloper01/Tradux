import path from "path";
import fs from "fs-extra";

/**
 * file-manager.js — Centralized File I/O
 *
 * Singleton that handles all filesystem access for the CLI.
 * Caches config and dynamic imports to avoid redundant reads.
 * Also resolves i18n paths across multiple common project layouts
 * (public/i18n, src/i18n, ./i18n, etc.) so the library works
 * regardless of how the user's project is structured.
 */
class FileManager {
  constructor() {
    this.moduleCache = new Map();
    this.configCache = null;
  }

  /** Converts a filesystem path to a file:// URL for dynamic import(). */
  pathToUrl(filePath) {
    const absolutePath = path.resolve(filePath);
    return `file:///${absolutePath.replace(/\\/g, "/")}`;
  }

  exists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Dynamically imports a module from the filesystem.
   * When useCache is true, subsequent calls return the cached module
   * instead of re-importing (avoids Node's duplicate module instances).
   */
  async loadModule(filePath, useCache = false) {
    const absolutePath = path.resolve(filePath);
    if (!this.exists(absolutePath)) return null;

    const cacheKey = absolutePath;
    if (useCache && this.moduleCache.has(cacheKey)) {
      return this.moduleCache.get(cacheKey);
    }

    try {
      const moduleUrl = this.pathToUrl(absolutePath);
      const module = await import(moduleUrl);

      if (useCache) this.moduleCache.set(cacheKey, module);
      return module;
    } catch (error) {
      console.error(`Failed to load module: ${absolutePath}`);
      return null;
    }
  }

  /**
   * Tries several common directory structures to find where the i18n
   * JSON files live. Returns the first path that exists on disk,
   * or falls back to the config value as-is.
   */
  resolveI18nPath(configI18nPath) {
    const possiblePaths = [
      configI18nPath,
      configI18nPath.replace("./i18n", "./public/i18n"),
      "./public/i18n",
      "./i18n",
    ];

    for (const testPath of possiblePaths) {
      const absolutePath = path.resolve(testPath);
      if (this.exists(absolutePath)) {
        return testPath;
      }
    }

    return configI18nPath;
  }

  /** Reads and parses a single language JSON file (e.g. "es.json"). */
  async loadLanguageFile(i18nPath, language) {
    const resolvedPath = this.resolveI18nPath(i18nPath);
    const languageFile = path.join(resolvedPath, `${language}.json`);

    if (!this.exists(languageFile)) {
      return null;
    }

    try {
      const fileContent = await fs.readFile(languageFile, "utf8");
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Failed to load language file: ${languageFile}`);
      return null;
    }
  }

  /**
   * Reads tradux.config.json, validates required fields, resolves the
   * i18n path, and caches the result for the rest of the session.
   */
  async loadConfig() {
    if (this.configCache) {
      return this.configCache;
    }

    const configPath = path.join(process.cwd(), "tradux.config.json");

    if (!this.exists(configPath)) {
      return null;
    }

    try {
      const fileContent = await fs.readFile(configPath, "utf8");
      const config = JSON.parse(fileContent);

      if (!config.i18nPath || !config.defaultLanguage) {
        throw new Error("Invalid configuration: missing required values");
      }

      const resolvedI18nPath = this.resolveI18nPath(config.i18nPath);

      this.configCache = {
        i18nPath: resolvedI18nPath,
        defaultLanguage: config.defaultLanguage,
        availableLanguages: config.availableLanguages || [],
      };

      return this.configCache;
    } catch (error) {
      console.error(`Failed to load config file: ${configPath}`);
      return null;
    }
  }

  getAbsoluteI18nPath(relativePath) {
    const resolvedPath = this.resolveI18nPath(relativePath);
    return path.resolve(resolvedPath);
  }

  clearCache() {
    this.moduleCache.clear();
    this.configCache = null;
  }
}

/** Exported as a singleton — all CLI code shares one instance. */
export const fileManager = new FileManager();
