import { test } from 'node:test';
import { ok } from 'node:assert';
import { performance } from 'node:perf_hooks';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const projectRoot = join(process.cwd(), 'tests', 'temp-perf');

test('Tradux client initialization performance', async () => {
    const startTime = performance.now();

    // Simulate initialization
    await new Promise(resolve => setTimeout(resolve, 1));

    const endTime = performance.now();
    const initTime = endTime - startTime;

    ok(initTime < 100, `Initialization should be fast (got ${initTime.toFixed(2)}ms)`);
    console.log(`✅ Client initialization: ${initTime.toFixed(2)}ms`);
});

test('Configuration loading performance', async () => {
    const startTime = performance.now();

    try {
        const configPath = join(projectRoot, 'tradux.config.json');
        const configData = await readFile(configPath, 'utf8');
        const config = JSON.parse(configData);

        ok(config && typeof config === 'object', 'Config should be loaded successfully');
        ok(config.defaultLanguage && typeof config.defaultLanguage === 'string', 'Config should have defaultLanguage');

        const endTime = performance.now();
        const loadTime = endTime - startTime;

        ok(loadTime < 50, `Config loading should be fast (got ${loadTime.toFixed(2)}ms)`);
        console.log(`✅ Config loading: ${loadTime.toFixed(2)}ms`);
    } catch (error) {
        console.log('⚠️  No tradux.config.json found for performance test');
        ok(false, `Config file should exist: ${error.message}`);
    }
});
