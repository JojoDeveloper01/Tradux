import { describe, it } from 'node:test';
import assert from 'node:assert';

// Silence expected warnings during tests
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (msg) => { if (typeof msg === 'string' && !msg.includes('Tradux')) originalWarn(msg); };
console.error = (msg) => { if (typeof msg === 'string' && !msg.includes('Error loading')) originalError(msg); };

/**
 * CONTRACT TESTS for the Tradux Client Public API.
 *
 * These tests verify the *shape* and *behavior* of exports,
 * NOT internal implementation details. You can refactor freely
 * without breaking these tests as long as the public API contract holds.
 */
describe('Tradux Client — Public API Contract', () => {

  // ── Export Shape ──────────────────────────────────────────
  describe('Module exports', () => {
    it('should export all documented public symbols', async () => {
      const client = await import('../../src/client.js');

      const requiredExports = [
        ['t',                     'object'],
        ['setLanguage',           'function'],
        ['getCurrentLanguage',    'function'],
        ['getAvailableLanguages', 'function'],
        ['initTradux',            'function'],
        ['config',                'object'],
        ['onLanguageChange',      'function'],
        ['traduxEvents',          'object'],
      ];

      for (const [name, expectedType] of requiredExports) {
        assert.ok(name in client, `"${name}" should be exported`);
        assert.strictEqual(typeof client[name], expectedType, `"${name}" should be a ${expectedType}`);
      }
    });
  });

  // ── getAvailableLanguages() ───────────────────────────────
  describe('getAvailableLanguages()', () => {
    it('should return an array', async () => {
      const { getAvailableLanguages } = await import('../../src/client.js');
      const langs = getAvailableLanguages();
      assert.ok(Array.isArray(langs), 'Should return an array');
    });

    it('each item should have { name: string, value: string }', async () => {
      const { getAvailableLanguages } = await import('../../src/client.js');
      const langs = getAvailableLanguages();
      for (const lang of langs) {
        assert.strictEqual(typeof lang.name, 'string', 'name should be a string');
        assert.strictEqual(typeof lang.value, 'string', 'value should be a string');
        assert.ok(lang.name.length > 0, 'name should not be empty');
        assert.ok(lang.value.length > 0, 'value should not be empty');
      }
    });
  });

  // ── getCurrentLanguage() ──────────────────────────────────
  describe('getCurrentLanguage()', () => {
    it('should return a non-empty string', async () => {
      const { getCurrentLanguage } = await import('../../src/client.js');
      const lang = await getCurrentLanguage();
      assert.strictEqual(typeof lang, 'string');
      assert.ok(lang.length > 0, 'Language code should not be empty');
    });
  });

  // ── initTradux() ─────────────────────────────────────────
  describe('initTradux()', () => {
    it('should return an instance with { t, currentLanguage, setLanguage }', async () => {
      const { initTradux } = await import('../../src/client.js');
      const instance = await initTradux();

      assert.strictEqual(typeof instance.t, 'object', 'instance.t should be an object');
      assert.strictEqual(typeof instance.currentLanguage, 'string', 'instance.currentLanguage should be a string');
      assert.strictEqual(typeof instance.setLanguage, 'function', 'instance.setLanguage should be a function');
    });

    it('should accept a language/cookie argument without crashing', async () => {
      const { initTradux } = await import('../../src/client.js');
      // Should not throw regardless of value
      await assert.doesNotReject(() => initTradux('en'));
      await assert.doesNotReject(() => initTradux(null));
      await assert.doesNotReject(() => initTradux(''));
    });
  });

  // ── Translation Proxy (t) ────────────────────────────────
  describe('Translation proxy (t)', () => {
    it('should be an object that does not throw on arbitrary key access', async () => {
      const { t } = await import('../../src/client.js');
      // Accessing any key should return something without crashing
      assert.doesNotThrow(() => { const _ = t.some; });
      assert.doesNotThrow(() => { const _ = t.deeply.nested.key; });
    });
  });

  // ── onLanguageChange() ────────────────────────────────────
  describe('onLanguageChange()', () => {
    it('should accept a callback without throwing', async () => {
      const { onLanguageChange } = await import('../../src/client.js');
      assert.doesNotThrow(() => onLanguageChange(() => {}));
    });
  });
});
