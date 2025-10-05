import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = join(__dirname, '../temp-core');

describe('Core Functionality Tests', () => {
    before(async () => {
        await mkdir(join(testDir, 'src/i18n'), { recursive: true });

        await writeFile(join(testDir, 'tradux.config.js'), `
export const i18nPath = './src/i18n';
export const defaultLanguage = 'en';
    `);

        await writeFile(join(testDir, '.env'), `
CLOUDFLARE_ACCOUNT_ID=test_account_id
CLOUDFLARE_API_TOKEN=test_api_token
    `);

        await writeFile(join(testDir, 'src/i18n/en.js'), `
export const language = {
  "app": {
    "title": "Test Application",
    "subtitle": "Testing Tradux functionality"
  },
  "navigation": {
    "home": "Home",
    "about": "About",
    "contact": "Contact Us"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  }
};
    `);
    });

    after(async () => {
        try {
            await rm(testDir, { recursive: true, force: true });
        } catch (error) {
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

    describe('File Manager Core', () => {
        it('should validate file structure requirements', async () => {
            process.chdir(testDir);

            try {
                const { access } = await import('fs/promises');

                await access(join(testDir, 'tradux.config.js'));
                await access(join(testDir, '.env'));
                await access(join(testDir, 'src/i18n/en.js'));

                assert.ok(true, 'All required files should exist');

            } catch (error) {
                assert.fail(`Required files should be accessible: ${error.message}`);
            }
        });

        it('should load configuration correctly', async () => {
            process.chdir(testDir);

            try {
                const configPath = `file://${join(testDir, 'tradux.config.js').replace(/\\/g, '/')}`;
                const config = await import(configPath);

                assert.strictEqual(config.i18nPath, './src/i18n', 'Should load correct i18n path');
                assert.strictEqual(config.defaultLanguage, 'en', 'Should load correct default language');

            } catch (error) {
                assert.fail(`Should load configuration: ${error.message}`);
            }
        });

        it('should validate language file format', async () => {
            process.chdir(testDir);

            try {
                const langPath = `file://${join(testDir, 'src/i18n/en.js').replace(/\\/g, '/')}`;
                const langModule = await import(langPath);
                const language = langModule.language;

                assert.strictEqual(typeof language, 'object', 'Language should be an object');
                assert.ok(language.app, 'Should have app section');
                assert.ok(language.navigation, 'Should have navigation section');
                assert.ok(language.actions, 'Should have actions section');

                assert.strictEqual(typeof language.app.title, 'string', 'App title should be string');
                assert.strictEqual(typeof language.navigation.home, 'string', 'Navigation items should be strings');
                assert.strictEqual(typeof language.actions.save, 'string', 'Action labels should be strings');

                assert.ok(language.app.title.length > 0, 'App title should not be empty');
                assert.ok(language.navigation.home.length > 0, 'Navigation items should not be empty');
                assert.ok(language.actions.save.length > 0, 'Action labels should not be empty');

            } catch (error) {
                assert.fail(`Should validate language file format: ${error.message}`);
            }
        });
    });

    describe('Environment Configuration', () => {
        it('should validate environment variables format', async () => {
            process.chdir(testDir);

            try {
                const { readFile } = await import('fs/promises');
                const envContent = await readFile(join(testDir, '.env'), 'utf8');

                const envVars = {};
                envContent.split('\n').forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const [key, ...valueParts] = trimmed.split('=');
                        if (key && valueParts.length > 0) {
                            envVars[key.trim()] = valueParts.join('=').trim();
                        }
                    }
                });

                assert.ok(envVars.CLOUDFLARE_ACCOUNT_ID, 'Should have CLOUDFLARE_ACCOUNT_ID');
                assert.ok(envVars.CLOUDFLARE_API_TOKEN, 'Should have CLOUDFLARE_API_TOKEN');

                assert.ok(envVars.CLOUDFLARE_ACCOUNT_ID.length > 0, 'CLOUDFLARE_ACCOUNT_ID should not be empty');
                assert.ok(envVars.CLOUDFLARE_API_TOKEN.length > 0, 'CLOUDFLARE_API_TOKEN should not be empty');

            } catch (error) {
                assert.fail(`Should validate environment variables: ${error.message}`);
            }
        });

        it('should handle missing environment variables gracefully', async () => {
            process.chdir(testDir);

            const { writeFile: writeFileAsync } = await import('fs/promises');
            await writeFileAsync(join(testDir, '.env.test'), '# Empty environment file\n');

            try {
                const { readFile } = await import('fs/promises');
                const envContent = await readFile(join(testDir, '.env.test'), 'utf8');

                assert.strictEqual(typeof envContent, 'string', 'Should read env file as string');
                assert.ok(envContent.includes('#'), 'Should contain comment');

            } catch (error) {
                assert.fail(`Should handle empty environment file: ${error.message}`);
            }
        });
    });

    describe('Language Structure Validation', () => {
        it('should validate translation key consistency', async () => {
            process.chdir(testDir);

            try {
                const langPath = `file://${join(testDir, 'src/i18n/en.js').replace(/\\/g, '/')}`;
                const langModule = await import(langPath);
                const language = langModule.language;

                function getAllKeys(obj, prefix = '') {
                    const keys = [];
                    for (const [key, value] of Object.entries(obj)) {
                        const fullKey = prefix ? `${prefix}.${key}` : key;
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            keys.push(...getAllKeys(value, fullKey));
                        } else {
                            keys.push(fullKey);
                        }
                    }
                    return keys;
                }

                const allKeys = getAllKeys(language);
                assert.ok(allKeys.length >= 8, `Should have at least 8 translation keys, found ${allKeys.length}`);

                allKeys.forEach(key => {
                    assert.ok(!key.includes('..'), `Key should not have double dots: ${key}`);
                    assert.ok(!key.startsWith('.'), `Key should not start with dot: ${key}`);
                    assert.ok(!key.endsWith('.'), `Key should not end with dot: ${key}`);
                });

                const expectedKeys = [
                    'app.title',
                    'app.subtitle',
                    'navigation.home',
                    'navigation.about',
                    'actions.save',
                    'actions.cancel'
                ];

                expectedKeys.forEach(expectedKey => {
                    assert.ok(allKeys.includes(expectedKey), `Should contain key: ${expectedKey}`);
                });
            } catch (error) {
                assert.fail(`Should validate translation keys: ${error.message}`);
            }
        });

        it('should validate translation value types', async () => {
            process.chdir(testDir);

            try {
                const langPath = `file://${join(testDir, 'src/i18n/en.js').replace(/\\/g, '/')}`;
                const langModule = await import(langPath);
                const language = langModule.language;

                function validateValues(obj, path = '') {
                    for (const [key, value] of Object.entries(obj)) {
                        const currentPath = path ? `${path}.${key}` : key;

                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            validateValues(value, currentPath);
                        } else {
                            assert.strictEqual(typeof value, 'string', `Value at ${currentPath} should be string, got ${typeof value}`);
                            assert.ok(value.length > 0, `Value at ${currentPath} should not be empty`);
                            assert.ok(!value.includes('\n'), `Value at ${currentPath} should not contain newlines`);
                        }
                    }
                }
                validateValues(language);

            } catch (error) {
                assert.fail(`Should validate translation values: ${error.message}`);
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle corrupt language files', async () => {
            process.chdir(testDir);

            const { writeFile: writeFileAsync } = await import('fs/promises');
            await writeFileAsync(join(testDir, 'src/i18n/corrupt.js'), 'export const language = { invalid syntax without quotes }}}');

            try {
                const corruptPath = `file://${join(testDir, 'src/i18n/corrupt.js').replace(/\\/g, '/')}`;
                await import(corruptPath);
                assert.fail('Should throw error for corrupt file');
            } catch (error) {
                const errorMessage = error.message.toLowerCase();
                const hasError = errorMessage.includes('syntaxerror') ||
                    errorMessage.includes('syntax') ||
                    errorMessage.includes('unexpected') ||
                    errorMessage.includes('token') ||
                    error.name === 'SyntaxError';
                assert.ok(hasError, `Should detect syntax error, got: ${error.message}`);
            }
        });

        it('should handle missing configuration gracefully', async () => {
            const tempTestDir = join(testDir, 'no-config');
            await mkdir(tempTestDir, { recursive: true });

            process.chdir(tempTestDir);

            try {
                const nonExistentConfig = `file://${join(tempTestDir, 'tradux.config.js').replace(/\\/g, '/')}`;
                await import(nonExistentConfig);
                assert.fail('Should throw error for missing config');
            } catch (error) {
                assert.ok(error.code === 'ERR_MODULE_NOT_FOUND' || error.message.includes('Cannot resolve'), 'Should detect missing config file');
            }
        });
    });
});
