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
    assert.ok(clientModule.getCurrentLanguage, 'getCurrentLanguage function should be available');
    assert.strictEqual(typeof clientModule.t, 'object', 't should be a proxy object');
    assert.strictEqual(typeof clientModule.setLanguage, 'function', 'setLanguage should be a function');
  });

  it('should have translation functionality', async () => {
    const { t, getCurrentLanguage } = await import('../../src/client.js');
    assert.strictEqual(typeof t, 'object', 'Should have t proxy object');
    assert.strictEqual(typeof getCurrentLanguage, 'function', 'Should have getCurrentLanguage function');

    assert.ok(t, 'Translation proxy should exist');
  });
});
