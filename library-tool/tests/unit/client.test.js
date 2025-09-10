import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test directory setup
const testDir = join(__dirname, '../temp-unit');
const testI18nDir = join(testDir, 'src', 'i18n');

describe('Tradux Client Functions', () => {
  before(async () => {
    // Setup test environment
    await mkdir(testI18nDir, { recursive: true });

    // Create test configuration
    await writeFile(join(testDir, 'tradux.config.js'), `
export const i18nPath = './src/i18n';
export const defaultLanguage = 'en';
    `);

    // Create test language files
    await writeFile(join(testI18nDir, 'en.js'), `
export const language = {
  "navigation": {
    "home": "Home",
    "about": "About Us",
    "contact": "Contact"
  },
  "messages": {
    "welcome": "Welcome to our website!",
    "goodbye": "Thank you for visiting!"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "submit": "Submit"
  }
};
    `);

    await writeFile(join(testI18nDir, 'es.js'), `
export const language = {
  "navigation": {
    "home": "Inicio",
    "about": "Acerca de",
    "contact": "Contacto"
  },
  "messages": {
    "welcome": "¡Bienvenido a nuestro sitio web!",
    "goodbye": "¡Gracias por visitarnos!"
  },
  "buttons": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "submit": "Enviar"
  }
};
    `);

    await writeFile(join(testI18nDir, 'pt.js'), `
export const language = {
  "navigation": {
    "home": "Início",
    "about": "Sobre nós",
    "contact": "Contato"
  },
  "messages": {
    "welcome": "Bem-vindo ao nosso site!",
    "goodbye": "Obrigado pela visita!"
  },
  "buttons": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "submit": "Enviar"
  }
};
    `);
  });

  after(async () => {
    // Cleanup with retry for Windows
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Retry after a short delay on Windows
      if (error.code === 'EBUSY') {
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          await rm(testDir, { recursive: true, force: true });
        } catch (retryError) {
          console.warn(`Warning: Could not clean up test directory: ${retryError.message}`);
        }
      }
    }
  });

  beforeEach(() => {
    // Change to test directory for each test
    process.chdir(testDir);
  });

  describe('loadLanguage function', () => {
    it('should load English translations successfully', async () => {
      // Dynamic import to avoid module caching issues
      const clientModule = await import('../../src/client.js');
      const { loadLanguage } = clientModule;

      const result = await loadLanguage('en');

      assert.strictEqual(typeof result, 'object', 'Should return an object');
      assert.strictEqual(result.navigation.home, 'Home', 'Should load home translation');
      assert.strictEqual(result.messages.welcome, 'Welcome to our website!', 'Should load welcome message');
      assert.strictEqual(result.buttons.save, 'Save', 'Should load button text');
    });

    it('should load Spanish translations successfully', async () => {
      const clientModule = await import('../../src/client.js');
      const { loadLanguage } = clientModule;

      const result = await loadLanguage('es');

      assert.strictEqual(typeof result, 'object', 'Should return an object');
      assert.strictEqual(result.navigation.home, 'Inicio', 'Should load Spanish home translation');
      assert.strictEqual(result.messages.welcome, '¡Bienvenido a nuestro sitio web!', 'Should load Spanish welcome');
      assert.strictEqual(result.buttons.save, 'Guardar', 'Should load Spanish button text');
    });

    it('should load Portuguese translations successfully', async () => {
      const clientModule = await import('../../src/client.js');
      const { loadLanguage } = clientModule;

      const result = await loadLanguage('pt');

      assert.strictEqual(typeof result, 'object', 'Should return an object');
      assert.strictEqual(result.navigation.home, 'Início', 'Should load Portuguese home translation');
      assert.strictEqual(result.messages.welcome, 'Bem-vindo ao nosso site!', 'Should load Portuguese welcome');
      assert.strictEqual(result.buttons.save, 'Salvar', 'Should load Portuguese button text');
    });

    it('should return null for non-existent language', async () => {
      const clientModule = await import('../../src/client.js');
      const { loadLanguage } = clientModule;

      const result = await loadLanguage('fr');

      assert.strictEqual(result, null, 'Should return null for non-existent language');
    });

    it('should handle nested object structures correctly', async () => {
      const clientModule = await import('../../src/client.js');
      const { loadLanguage } = clientModule;

      const result = await loadLanguage('en');

      assert.strictEqual(typeof result.navigation, 'object', 'Navigation should be an object');
      assert.strictEqual(typeof result.messages, 'object', 'Messages should be an object');
      assert.strictEqual(typeof result.buttons, 'object', 'Buttons should be an object');

      // Check nested values
      assert.ok(result.navigation.hasOwnProperty('home'), 'Should have home in navigation');
      assert.ok(result.navigation.hasOwnProperty('about'), 'Should have about in navigation');
      assert.ok(result.navigation.hasOwnProperty('contact'), 'Should have contact in navigation');
    });
  });

  describe('Config loading', () => {
    it('should load configuration correctly', async () => {
      const clientModule = await import('../../src/client.js');
      const { config } = clientModule;

      assert.strictEqual(config.i18nPath, './src/i18n', 'Should load correct i18n path');
      assert.strictEqual(config.defaultLanguage, 'en', 'Should load correct default language');
    });
  });

  describe('Translation structure validation', () => {
    it('should maintain consistent structure across languages', async () => {
      const clientModule = await import('../../src/client.js');
      const { loadLanguage } = clientModule;

      const enTranslations = await loadLanguage('en');
      const esTranslations = await loadLanguage('es');
      const ptTranslations = await loadLanguage('pt');

      // Check that all languages have the same structure
      const enKeys = Object.keys(enTranslations);
      const esKeys = Object.keys(esTranslations);
      const ptKeys = Object.keys(ptTranslations);

      assert.deepStrictEqual(enKeys.sort(), esKeys.sort(), 'English and Spanish should have same top-level keys');
      assert.deepStrictEqual(enKeys.sort(), ptKeys.sort(), 'English and Portuguese should have same top-level keys');

      // Check nested keys
      const enNavKeys = Object.keys(enTranslations.navigation);
      const esNavKeys = Object.keys(esTranslations.navigation);
      const ptNavKeys = Object.keys(ptTranslations.navigation);

      assert.deepStrictEqual(enNavKeys.sort(), esNavKeys.sort(), 'Navigation keys should match');
      assert.deepStrictEqual(enNavKeys.sort(), ptNavKeys.sort(), 'Navigation keys should match');
    });
  });
});
