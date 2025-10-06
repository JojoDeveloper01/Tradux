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
    assert.ok(clientModule.currentLanguage !== undefined, 'currentLanguage should be available');
    assert.ok(clientModule.availableLanguages, 'availableLanguages should be available');
    assert.strictEqual(typeof clientModule.t, 'object', 't should be a proxy object');
    assert.strictEqual(typeof clientModule.setLanguage, 'function', 'setLanguage should be a function');
    assert.strictEqual(typeof clientModule.currentLanguage, 'string', 'currentLanguage should be a string');
    assert.ok(Array.isArray(clientModule.availableLanguages), 'availableLanguages should be an array');
  });

  it('should have translation functionality', async () => {
    const { t, currentLanguage, availableLanguages } = await import('../../src/client.js');
    assert.strictEqual(typeof t, 'object', 'Should have t proxy object');
    assert.strictEqual(typeof currentLanguage, 'string', 'Should have currentLanguage as string');
    assert.ok(Array.isArray(availableLanguages), 'Should have availableLanguages as array');

    assert.ok(t, 'Translation proxy should exist');
  });
});
