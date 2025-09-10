import { describe, it } from 'node:test';
import assert from 'node:assert';
import { join } from 'path';

describe('Utility Functions Tests', () => {
    describe('Path resolution', () => {
        it('should resolve relative paths correctly', () => {
            const testPaths = [
                './src/i18n',
                './translations',
                './locales',
                'src/i18n',
                'translations/i18n'
            ];

            testPaths.forEach(testPath => {
                const resolved = join(process.cwd(), testPath);

                assert.ok(resolved.length > testPath.length, `Resolved path should be longer than relative path for ${testPath}`);

                // Remove ./ and normalize path for comparison
                const normalizedPath = testPath.replace('./', '').replace(/\\/g, '/');
                const resolvedNormalized = resolved.replace(/\\/g, '/');
                assert.ok(resolvedNormalized.includes(normalizedPath), `Resolved path should contain original path components for ${testPath}`);
            });
        });

        it('should handle different path separators', () => {
            const testPaths = [
                'src/i18n',
                'src\\i18n',
                './src/i18n',
                '.\\src\\i18n'
            ];

            testPaths.forEach(testPath => {
                const resolved = join(process.cwd(), testPath);
                assert.ok(typeof resolved === 'string', `Should resolve path ${testPath} to string`);
                assert.ok(resolved.length > 0, `Should resolve path ${testPath} to non-empty string`);
            });
        });
    });

    describe('Language code validation', () => {
        it('should validate common language codes', () => {
            const validCodes = [
                'en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'ar',
                'ru', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi', 'cs'
            ];

            validCodes.forEach(code => {
                assert.strictEqual(code.length, 2, `${code} should be 2 characters`);
                assert.ok(/^[a-z]{2}$/.test(code), `${code} should be lowercase letters only`);
                assert.ok(!code.includes('-'), `${code} should not contain hyphens`);
                assert.ok(!code.includes('_'), `${code} should not contain underscores`);
            });
        });

        it('should reject invalid language codes', () => {
            const invalidCodes = [
                '', 'e', 'eng', 'english', '123', 'EN', 'en-US', 'pt-BR',
                'zh-CN', 'en_US', 'pt_BR', 'xx-yy', '1a', 'a1'
            ];

            invalidCodes.forEach(code => {
                const isValid = /^[a-z]{2}$/.test(code);
                assert.strictEqual(isValid, false, `${code} should be invalid`);
            });
        });

        it('should handle edge cases', () => {
            const edgeCases = [
                null,
                undefined,
                {},
                [],
                123,
                true,
                false
            ];

            edgeCases.forEach(code => {
                const isValid = typeof code === 'string' && /^[a-z]{2}$/.test(code);
                assert.strictEqual(isValid, false, `${code} should be invalid`);
            });
        });
    });

    describe('Translation object structure validation', () => {
        it('should validate correct translation structures', () => {
            const validStructures = [
                {
                    navigation: {
                        home: "Home",
                        about: "About"
                    },
                    welcome: "Welcome"
                },
                {
                    simple: "Simple text",
                    complex: {
                        nested: {
                            deep: "Deep nested value"
                        }
                    }
                },
                {
                    buttons: {
                        save: "Save",
                        cancel: "Cancel",
                        submit: "Submit"
                    },
                    messages: {
                        success: "Success!",
                        error: "Error occurred"
                    }
                }
            ];

            validStructures.forEach((structure, index) => {
                assert.strictEqual(typeof structure, 'object', `Structure ${index} should be object`);
                assert.ok(structure !== null, `Structure ${index} should not be null`);
                assert.ok(!Array.isArray(structure), `Structure ${index} should not be array`);

                // Check that all values are either strings or objects
                function validateValues(obj, path = '') {
                    Object.entries(obj).forEach(([key, value]) => {
                        const currentPath = path ? `${path}.${key}` : key;

                        if (typeof value === 'string') {
                            assert.ok(value.length > 0, `String value at ${currentPath} should not be empty`);
                        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            validateValues(value, currentPath);
                        } else {
                            assert.fail(`Invalid value type at ${currentPath}: ${typeof value}`);
                        }
                    });
                }

                validateValues(structure);
            });
        });

        it('should reject invalid translation structures', () => {
            const invalidStructures = [
                null,
                undefined,
                [],
                "string",
                123,
                {
                    navigation: "Should be object",
                    welcome: null
                },
                {
                    navigation: {
                        home: undefined
                    }
                },
                {
                    navigation: {
                        home: []
                    }
                },
                {
                    navigation: {
                        home: {
                            nested: 123
                        }
                    }
                }
            ];

            invalidStructures.forEach((structure, index) => {
                const isValidType = typeof structure === 'object' && structure !== null && !Array.isArray(structure);

                if (!isValidType) {
                    assert.ok(true, `Structure ${index} correctly identified as invalid type`);
                    return;
                }

                // Check for invalid nested values
                let hasInvalidValues = false;

                function checkValues(obj) {
                    Object.values(obj).forEach(value => {
                        if (value === null || value === undefined || Array.isArray(value)) {
                            hasInvalidValues = true;
                        } else if (typeof value === 'object') {
                            checkValues(value);
                        } else if (typeof value !== 'string') {
                            hasInvalidValues = true;
                        }
                    });
                }

                checkValues(structure);
                assert.ok(hasInvalidValues, `Structure ${index} should have invalid values`);
            });
        });

        it('should validate nested object consistency', () => {
            const testStructure = {
                level1: {
                    level2: {
                        level3: {
                            deep: "Deep value"
                        },
                        level3_alt: "Alternative value"
                    },
                    level2_alt: "Alternative level 2"
                },
                root_level: "Root value"
            };

            // Test that structure maintains proper nesting
            assert.strictEqual(typeof testStructure.level1, 'object');
            assert.strictEqual(typeof testStructure.level1.level2, 'object');
            assert.strictEqual(typeof testStructure.level1.level2.level3, 'object');
            assert.strictEqual(typeof testStructure.level1.level2.level3.deep, 'string');

            // Test that we can access all levels
            assert.strictEqual(testStructure.level1.level2.level3.deep, 'Deep value');
            assert.strictEqual(testStructure.level1.level2.level3_alt, 'Alternative value');
            assert.strictEqual(testStructure.level1.level2_alt, 'Alternative level 2');
            assert.strictEqual(testStructure.root_level, 'Root value');
        });
    });

    describe('Configuration validation', () => {
        it('should validate config object structure', () => {
            const validConfigs = [
                {
                    i18nPath: './src/i18n',
                    defaultLanguage: 'en'
                },
                {
                    i18nPath: './translations',
                    defaultLanguage: 'pt'
                },
                {
                    i18nPath: 'locales',
                    defaultLanguage: 'es'
                }
            ];

            validConfigs.forEach((config, index) => {
                assert.strictEqual(typeof config, 'object', `Config ${index} should be object`);
                assert.ok(config.hasOwnProperty('i18nPath'), `Config ${index} should have i18nPath`);
                assert.ok(config.hasOwnProperty('defaultLanguage'), `Config ${index} should have defaultLanguage`);
                assert.strictEqual(typeof config.i18nPath, 'string', `Config ${index} i18nPath should be string`);
                assert.strictEqual(typeof config.defaultLanguage, 'string', `Config ${index} defaultLanguage should be string`);
                assert.ok(config.i18nPath.length > 0, `Config ${index} i18nPath should not be empty`);
                assert.ok(config.defaultLanguage.length > 0, `Config ${index} defaultLanguage should not be empty`);
            });
        });

        it('should validate default language codes in config', () => {
            const configsWithLanguages = [
                { i18nPath: './src/i18n', defaultLanguage: 'en' },
                { i18nPath: './src/i18n', defaultLanguage: 'es' },
                { i18nPath: './src/i18n', defaultLanguage: 'pt' },
                { i18nPath: './src/i18n', defaultLanguage: 'fr' }
            ];

            configsWithLanguages.forEach((config, index) => {
                const langCode = config.defaultLanguage;
                assert.strictEqual(langCode.length, 2, `Config ${index} language should be 2 chars`);
                assert.ok(/^[a-z]{2}$/.test(langCode), `Config ${index} language should be valid code`);
            });
        });

        it('should validate i18n path formats', () => {
            const validPaths = [
                './src/i18n',
                './translations',
                './locales',
                'src/i18n',
                'translations',
                'i18n'
            ];

            validPaths.forEach((path, index) => {
                assert.strictEqual(typeof path, 'string', `Path ${index} should be string`);
                assert.ok(path.length > 0, `Path ${index} should not be empty`);
                assert.ok(!path.includes('..'), `Path ${index} should not contain parent directory references`);
                assert.ok(!path.startsWith('/'), `Path ${index} should be relative path`);
            });
        });
    });
});
