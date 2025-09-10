import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { performance } from 'perf_hooks';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testDir = join(__dirname, '../temp-perf');

describe('Performance Tests', () => {
    before(async () => {
        await mkdir(join(testDir, 'src/i18n'), { recursive: true });

        // Create config
        await writeFile(join(testDir, 'tradux.config.js'), `
export const i18nPath = './src/i18n';
export const defaultLanguage = 'en';
    `);

        // Create large translation file (1000+ keys)
        const largeTranslations = {
            navigation: {},
            content: {},
            forms: {},
            buttons: {},
            messages: {},
            errors: {}
        };

        // Generate many translation keys
        for (let i = 0; i < 200; i++) {
            largeTranslations.navigation[`nav_item_${i}`] = `Navigation Item ${i}`;
            largeTranslations.content[`content_${i}`] = `This is content item number ${i} with some longer text to simulate real-world usage.`;
            largeTranslations.forms[`form_field_${i}`] = `Form Field ${i}`;
            largeTranslations.buttons[`button_${i}`] = `Button ${i}`;
            largeTranslations.messages[`message_${i}`] = `Message ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
            largeTranslations.errors[`error_${i}`] = `Error ${i}: Something went wrong with operation ${i}.`;
        }

        await writeFile(join(testDir, 'src/i18n/en.js'), `
export const language = ${JSON.stringify(largeTranslations, null, 2)};
    `);

        // Create medium-sized Spanish translations
        const mediumTranslations = {};
        for (let i = 0; i < 100; i++) {
            mediumTranslations[`key_${i}`] = `Traducción ${i}`;
        }

        await writeFile(join(testDir, 'src/i18n/es.js'), `
export const language = ${JSON.stringify(mediumTranslations, null, 2)};
    `);

        // Create small Portuguese translations
        const smallTranslations = {
            home: 'Início',
            about: 'Sobre',
            contact: 'Contato'
        };

        await writeFile(join(testDir, 'src/i18n/pt.js'), `
export const language = ${JSON.stringify(smallTranslations, null, 2)};
    `);
    });

    after(async () => {
        // Cleanup with retry for Windows
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

    describe('Language Loading Performance', () => {
        it('should load large translation files quickly', async () => {
            process.chdir(testDir);

            const startTime = performance.now();

            try {
                const langPath = `file://${join(testDir, 'src/i18n/en.js').replace(/\\/g, '/')}`;
                const languageModule = await import(langPath);
                const translations = languageModule.language;

                const endTime = performance.now();
                const loadTime = endTime - startTime;

                // Should load within reasonable time (100ms)
                assert.ok(loadTime < 100, `Load time should be under 100ms, was ${loadTime.toFixed(2)}ms`);

                // Verify data integrity
                assert.ok(Object.keys(translations).length >= 6, 'Should load all translation categories');
                assert.ok(Object.keys(translations.navigation).length >= 200, 'Should load all navigation items');

            } catch (error) {
                assert.fail(`Should load successfully: ${error.message}`);
            }
        });

        it('should handle multiple language loads efficiently', async () => {
            process.chdir(testDir);

            const startTime = performance.now();

            try {
                // Load multiple languages
                const enPath = `file://${join(testDir, 'src/i18n/en.js').replace(/\\/g, '/')}`;
                const esPath = `file://${join(testDir, 'src/i18n/es.js').replace(/\\/g, '/')}`;
                const ptPath = `file://${join(testDir, 'src/i18n/pt.js').replace(/\\/g, '/')}`;

                const [enModule, esModule, ptModule] = await Promise.all([
                    import(enPath),
                    import(esPath),
                    import(ptPath)
                ]);

                const endTime = performance.now();
                const loadTime = endTime - startTime;

                // Should load all languages within reasonable time (200ms)
                assert.ok(loadTime < 200, `Multiple language load time should be under 200ms, was ${loadTime.toFixed(2)}ms`);

                // Verify all languages loaded
                assert.ok(enModule.language, 'English should load');
                assert.ok(esModule.language, 'Spanish should load');
                assert.ok(ptModule.language, 'Portuguese should load');

            } catch (error) {
                assert.fail(`Should load all languages successfully: ${error.message}`);
            }
        });

        it('should handle repeated loads efficiently', async () => {
            process.chdir(testDir);

            const loadTimes = [];
            const iterations = 10;

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();

                try {
                    // Add cache-busting parameter to force fresh import
                    const langPath = `file://${join(testDir, 'src/i18n/en.js').replace(/\\/g, '/')}?v=${i}`;
                    const languageModule = await import(langPath);
                    const translations = languageModule.language;

                    const endTime = performance.now();
                    loadTimes.push(endTime - startTime);

                    // Verify data integrity on each load
                    assert.ok(translations, `Load ${i} should return translations`);

                } catch (error) {
                    assert.fail(`Load ${i} should succeed: ${error.message}`);
                }
            }

            const averageTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
            const maxTime = Math.max(...loadTimes);

            console.log(`Average load time: ${averageTime.toFixed(2)}ms`);
            console.log(`Max load time: ${maxTime.toFixed(2)}ms`);

            // Average should be reasonable
            assert.ok(averageTime < 50, `Average load time should be under 50ms, was ${averageTime.toFixed(2)}ms`);
            assert.ok(maxTime < 150, `Max load time should be under 150ms, was ${maxTime.toFixed(2)}ms`);
        });
    });

    describe('Memory Usage', () => {
        it('should not cause memory leaks on repeated loads', async () => {
            process.chdir(testDir);

            // Get initial memory usage
            const initialMemory = process.memoryUsage();

            // Perform many loads
            for (let i = 0; i < 50; i++) {
                try {
                    const langPath = `file://${join(testDir, 'src/i18n/en.js').replace(/\\/g, '/')}?mem=${i}`;
                    const languageModule = await import(langPath);

                    // Don't store references to allow garbage collection
                    const translations = languageModule.language;
                    assert.ok(translations, `Load ${i} should succeed`);

                } catch (error) {
                    assert.fail(`Memory test load ${i} failed: ${error.message}`);
                }
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

            // Memory increase should be reasonable (less than 50MB for this test)
            const maxMemoryIncrease = 50 * 1024 * 1024; // 50MB in bytes
            assert.ok(memoryIncrease < maxMemoryIncrease,
                `Memory increase should be under 50MB, was ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent language loads', async () => {
            process.chdir(testDir);

            const startTime = performance.now();

            // Create many concurrent load operations
            const concurrentLoads = [];
            const languages = ['en', 'es', 'pt'];

            for (let i = 0; i < 20; i++) {
                const lang = languages[i % languages.length];
                const langPath = `file://${join(testDir, `src/i18n/${lang}.js`).replace(/\\/g, '/')}?concurrent=${i}`;

                concurrentLoads.push(
                    import(langPath).then(module => ({
                        index: i,
                        language: lang,
                        success: !!module.language
                    }))
                );
            }

            try {
                const results = await Promise.all(concurrentLoads);
                const endTime = performance.now();
                const totalTime = endTime - startTime;

                console.log(`Concurrent loads completed in: ${totalTime.toFixed(2)}ms`);

                // All loads should succeed
                assert.strictEqual(results.length, 20, 'All concurrent loads should complete');

                const failures = results.filter(r => !r.success);
                assert.strictEqual(failures.length, 0, 'No concurrent loads should fail');

                // Should complete in reasonable time
                assert.ok(totalTime < 1000, `Concurrent loads should complete under 1000ms, took ${totalTime.toFixed(2)}ms`);

            } catch (error) {
                assert.fail(`Concurrent loads should succeed: ${error.message}`);
            }
        });
    });
});
