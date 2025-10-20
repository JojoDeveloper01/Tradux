import { describe, it } from 'node:test';
import assert from 'node:assert';

const originalConsoleError = console.error;
console.error = (message) => {
  if (!message.includes('Error loading language')) {
    originalConsoleError(message);
  }
};

describe('Tradux Client', () => {
  it('should export required functions', async () => {
    const clientModule = await import('../../src/client.js');
    assert.ok(clientModule.t, 't should be available');
    assert.ok(clientModule.setLanguage, 'setLanguage function should be available');
    assert.ok(await clientModule.getCurrentLanguage() !== undefined, 'currentLanguage should be available');
    assert.ok(clientModule.getAvailableLanguages() !== undefined, 'availableLanguages should be available');
    assert.strictEqual(typeof clientModule.t, 'object', 't should be a proxy object');
    assert.strictEqual(typeof clientModule.setLanguage, 'function', 'setLanguage should be a function');
    assert.strictEqual(typeof clientModule.getCurrentLanguage, 'function', 'getCurrentLanguage should be a function');
    assert.ok(Array.isArray(clientModule.getAvailableLanguages()), 'availableLanguages should be an array');
  });

  it('should have translation functionality', async () => {
    const { t, getCurrentLanguage, getAvailableLanguages } = await import('../../src/client.js');
    assert.strictEqual(typeof t, 'object', 'Should have t proxy object');
    assert.strictEqual(typeof await getCurrentLanguage(), 'string', 'Should have currentLanguage as string');
    assert.ok(Array.isArray(getAvailableLanguages()), 'Should have availableLanguages as array');

    assert.ok(t, 'Translation proxy should exist');
  });
});
