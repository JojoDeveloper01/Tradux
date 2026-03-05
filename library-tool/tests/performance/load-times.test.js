import { describe, it } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';

/**
 * PERFORMANCE SMOKE TESTS
 *
 * Verifies that core imports and initialization stay within
 * reasonable time budgets. Thresholds are generous on purpose
 * so they don't fail on slow CI runners — the goal is to catch
 * regressions, not enforce absolute times.
 */
const MAX_IMPORT_MS = 500;   // generous budget for cold import
const MAX_INIT_MS = 500;     // generous budget for initTradux()

describe('Performance — import & init times', () => {

  it(`client.js import should complete within ${MAX_IMPORT_MS}ms`, async () => {
    const start = performance.now();
    await import('../../src/client.js');
    const elapsed = performance.now() - start;
    console.log(`  ⏱  client.js import: ${elapsed.toFixed(1)}ms`);
    assert.ok(elapsed < MAX_IMPORT_MS, `Import took ${elapsed.toFixed(1)}ms (limit: ${MAX_IMPORT_MS}ms)`);
  });

  it(`initTradux() should resolve within ${MAX_INIT_MS}ms`, async () => {
    const { initTradux } = await import('../../src/client.js');
    const start = performance.now();
    await initTradux();
    const elapsed = performance.now() - start;
    console.log(`  ⏱  initTradux(): ${elapsed.toFixed(1)}ms`);
    assert.ok(elapsed < MAX_INIT_MS, `Init took ${elapsed.toFixed(1)}ms (limit: ${MAX_INIT_MS}ms)`);
  });

  it('languages.js import should be fast', async () => {
    const start = performance.now();
    const { availableLanguages } = await import('../../src/utils/languages.js');
    const elapsed = performance.now() - start;
    console.log(`  ⏱  languages.js import: ${elapsed.toFixed(1)}ms`);
    assert.ok(elapsed < 200, `Languages import took ${elapsed.toFixed(1)}ms`);
    assert.ok(availableLanguages.length > 0, 'Should have loaded languages');
  });
});
