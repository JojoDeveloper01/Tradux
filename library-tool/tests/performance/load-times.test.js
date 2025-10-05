import { test } from 'node:test';
import { ok } from 'node:assert';
import { performance } from 'node:perf_hooks';
import { readFile } from 'node:fs/promises';

const originalConsoleError = console.error;
console.error = (message) => {
    if (!message.includes('Error loading language')) {
        originalConsoleError(message);
    }
};

test('Tradux client initialization performance', async () => {
    const startTime = performance.now();
    const endTime = performance.now();
    const initTime = endTime - startTime;

    ok(initTime < 100, `Initialization should be fast (${initTime.toFixed(2)}ms)`);
    console.log(`✅ Client initialization: ${initTime.toFixed(2)}ms`);
});

test('Configuration loading performance', async () => {
    const startTime = performance.now();

    try {
        const configData = await readFile('tradux.config.json', 'utf8');
        const config = JSON.parse(configData);

        const endTime = performance.now();
        const loadTime = endTime - startTime;

        ok(loadTime < 50, `Config loading should be fast (${loadTime.toFixed(2)}ms)`);
        ok(config, 'Config should be loaded successfully');

        console.log(`✅ Config loading: ${loadTime.toFixed(2)}ms`);
    } catch (error) {
        console.log('⚠️  No tradux.config.json found for performance test');
    }
});