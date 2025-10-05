import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm, readFile, access, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = join(__dirname, '../temp-integration');

describe('Translation Integration Tests', () => {
    before(async () => {
        await mkdir(testDir, { recursive: true });
        await mkdir(join(testDir, 'src/i18n'), { recursive: true });

        await writeFile(join(testDir, '.env'), `
CLOUDFLARE_ACCOUNT_ID=test_account_id_12345
CLOUDFLARE_API_TOKEN=test_api_token_67890
    `);

        await writeFile(join(testDir, 'tradux.config.json'), JSON.stringify({
            "inputDir": "./src/i18n",
            "outputDir": "./public/i18n",
            "supportedLanguages": ["en", "es", "pt"],
            "defaultLanguage": "en",
            "fileFormat": "json"
        }, null, 2));

        await writeFile(join(testDir, 'src/i18n/en.json'), JSON.stringify({
            "navigation": {
                "home": "Home",
                "about": "About Us",
                "services": "Services",
                "contact": "Contact",
                "blog": "Blog"
            },
            "content": {
                "welcome": "Welcome to our website!",
                "description": "We provide excellent services for our customers.",
                "cta": "Get started today",
                "testimonial": "This service changed my life!"
            },
            "forms": {
                "name": "Full Name",
                "email": "Email Address",
                "message": "Your Message",
                "submit": "Send Message",
                "cancel": "Cancel"
            },
            "errors": {
                "required": "This field is required",
                "invalid_email": "Please enter a valid email address",
                "generic": "An error occurred. Please try again."
            }
        }, null, 2));
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

    describe('Configuration Management', () => {
        it('should validate configuration files exist', async () => {
            process.chdir(testDir);

            try {
                const configPath = join(testDir, 'tradux.config.json');
                await access(configPath);

                const configContent = await readFile(configPath, 'utf8');
                const config = JSON.parse(configContent);
                assert.ok(config.inputDir, 'Config should contain inputDir');
                assert.ok(config.defaultLanguage, 'Config should contain defaultLanguage');
                assert.ok(config.supportedLanguages, 'Config should contain supportedLanguages');

            } catch (error) {
                assert.fail(`Config should be accessible: ${error.message}`);
            }
        });

        it('should validate environment variables', async () => {
            process.chdir(testDir);

            const envContent = await readFile(join(testDir, '.env'), 'utf8');

            assert.ok(envContent.includes('CLOUDFLARE_ACCOUNT_ID'), 'Should have Cloudflare account ID');
            assert.ok(envContent.includes('CLOUDFLARE_API_TOKEN'), 'Should have Cloudflare API token');
            assert.ok(envContent.includes('test_account_id'), 'Should have test account ID value');
            assert.ok(envContent.includes('test_api_token'), 'Should have test API token value');
        });

        it('should validate default language file structure', async () => {
            process.chdir(testDir);

            const langPath = join(testDir, 'src/i18n/en.json');
            await access(langPath);

            const langContent = await readFile(langPath, 'utf8');
            const translations = JSON.parse(langContent);
            assert.ok(translations.navigation, 'Should contain navigation section');
            assert.ok(translations.content, 'Should contain content section');
            assert.ok(translations.forms, 'Should contain forms section');
            assert.ok(translations.errors, 'Should contain errors section');
        });
    });

    describe('Language File Integration', () => {
        it('should load and validate language structure', async () => {
            process.chdir(testDir);

            const langPath = join(testDir, 'src/i18n/en.json');
            const langContent = await readFile(langPath, 'utf8');
            const translations = JSON.parse(langContent);

            assert.strictEqual(typeof translations, 'object', 'Language should be an object');
            assert.strictEqual(typeof translations.navigation, 'object', 'Navigation should be an object');
            assert.strictEqual(typeof translations.content, 'object', 'Content should be an object');
            assert.strictEqual(typeof translations.forms, 'object', 'Forms should be an object');
            assert.strictEqual(typeof translations.errors, 'object', 'Errors should be an object');

            assert.strictEqual(translations.navigation.home, 'Home', 'Should have correct home translation');
            assert.strictEqual(translations.content.welcome, 'Welcome to our website!', 'Should have correct welcome message');
            assert.strictEqual(translations.forms.submit, 'Send Message', 'Should have correct submit button text');
        });

        it('should handle missing language files gracefully', async () => {
            process.chdir(testDir);

            try {
                const nonExistentPath = join(testDir, 'src/i18n/xyz.json');
                await access(nonExistentPath);
                assert.fail('Should not find non-existent language file');
            } catch (error) {
                assert.ok(error.code === 'ENOENT', 'Should properly handle missing files');
            }
        });
    });

    describe('Project Structure Validation', () => {
        it('should validate i18n directory structure', async () => {
            process.chdir(testDir);

            const i18nPath = join(testDir, 'src/i18n');
            await access(i18nPath);

            const stats = await stat(i18nPath);
            assert.ok(stats.isDirectory(), 'i18n path should be a directory');
        });

        it('should validate config file accessibility', async () => {
            process.chdir(testDir);

            const configPath = join(testDir, 'tradux.config.json');

            try {
                const configContent = await readFile(configPath, 'utf8');
                const config = JSON.parse(configContent);

                assert.ok(config.inputDir, 'Config should have inputDir');
                assert.ok(config.defaultLanguage, 'Config should have defaultLanguage');
                assert.strictEqual(config.defaultLanguage, 'en', 'Default language should be en');
                assert.strictEqual(config.inputDir, './src/i18n', 'Input dir should be ./src/i18n');

            } catch (error) {
                assert.fail(`Config should be readable: ${error.message}`);
            }
        });
    });

    describe('Environment Integration', () => {
        it('should validate environment file format', async () => {
            process.chdir(testDir);

            const envContent = await readFile(join(testDir, '.env'), 'utf8');
            const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

            for (const line of lines) {
                if (line.trim()) {
                    assert.ok(line.includes('='), `Environment variable line should contain '=': ${line}`);
                    const [key, value] = line.split('=');
                    assert.ok(key.trim(), `Environment variable should have a key: ${line}`);
                    assert.ok(value.trim(), `Environment variable should have a value: ${line}`);
                }
            }
        });

        it('should validate required environment variables', async () => {
            process.chdir(testDir);

            const envContent = await readFile(join(testDir, '.env'), 'utf8');

            const requiredVars = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];

            for (const varName of requiredVars) {
                assert.ok(envContent.includes(varName), `Should contain ${varName}`);

                const regex = new RegExp(`${varName}=.+`);
                assert.ok(regex.test(envContent), `${varName} should have a value`);
            }
        });
    });
});
