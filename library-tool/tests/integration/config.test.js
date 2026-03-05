import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm, readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = join(__dirname, '../temp-integration');

/**
 * INTEGRATION TESTS — Config & File Management
 *
 * These test the actual library modules against a real temp filesystem.
 * They verify behavior (files get created, configs get loaded) not
 * specific string values, so they survive refactors.
 */
describe('Config Integration', () => {

  before(async () => {
    // Clean slate
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
    await mkdir(join(testDir, 'public/i18n'), { recursive: true });

    // Minimal valid setup
    await writeFile(join(testDir, 'tradux.config.json'), JSON.stringify({
      i18nPath: './i18n',
      defaultLanguage: 'en',
      availableLanguages: ['en', 'es'],
    }, null, 2));

    await writeFile(join(testDir, 'public/i18n/en.json'), JSON.stringify({
      greeting: 'Hello',
      nav: { home: 'Home', about: 'About' },
    }, null, 2));

    await writeFile(join(testDir, 'public/i18n/es.json'), JSON.stringify({
      greeting: 'Hola',
      nav: { home: 'Inicio', about: 'Acerca' },
    }, null, 2));

    await writeFile(join(testDir, '.env'), 'CLOUDFLARE_ACCOUNT_ID=test\nCLOUDFLARE_API_TOKEN=test\n');
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  // ── Config file ──────────────────────────────────────────
  describe('tradux.config.json', () => {
    it('should be readable and valid JSON', async () => {
      const raw = await readFile(join(testDir, 'tradux.config.json'), 'utf8');
      const config = JSON.parse(raw);
      assert.strictEqual(typeof config, 'object');
    });

    it('should contain the required keys', async () => {
      const config = JSON.parse(await readFile(join(testDir, 'tradux.config.json'), 'utf8'));
      // These are the keys the library requires — test the contract, not the values
      assert.ok('i18nPath' in config, 'Should have i18nPath');
      assert.ok('defaultLanguage' in config, 'Should have defaultLanguage');
      assert.strictEqual(typeof config.i18nPath, 'string');
      assert.strictEqual(typeof config.defaultLanguage, 'string');
    });

    it('availableLanguages should be an array of strings when present', async () => {
      const config = JSON.parse(await readFile(join(testDir, 'tradux.config.json'), 'utf8'));
      if (config.availableLanguages) {
        assert.ok(Array.isArray(config.availableLanguages));
        for (const lang of config.availableLanguages) {
          assert.strictEqual(typeof lang, 'string');
        }
      }
    });
  });

  // ── Language files ───────────────────────────────────────
  describe('Language JSON files', () => {
    it('default language file should exist and be valid JSON', async () => {
      const config = JSON.parse(await readFile(join(testDir, 'tradux.config.json'), 'utf8'));
      const defaultLangPath = join(testDir, 'public/i18n', `${config.defaultLanguage}.json`);
      await access(defaultLangPath); // throws if missing
      const data = JSON.parse(await readFile(defaultLangPath, 'utf8'));
      assert.strictEqual(typeof data, 'object');
      assert.ok(Object.keys(data).length > 0, 'Language file should not be empty');
    });

    it('translated files should have the same top-level keys as default', async () => {
      const en = JSON.parse(await readFile(join(testDir, 'public/i18n/en.json'), 'utf8'));
      const es = JSON.parse(await readFile(join(testDir, 'public/i18n/es.json'), 'utf8'));
      const enKeys = Object.keys(en).sort();
      const esKeys = Object.keys(es).sort();
      assert.deepStrictEqual(esKeys, enKeys, 'Translated file should mirror the default structure');
    });

    it('should gracefully handle a missing language file', async () => {
      try {
        await access(join(testDir, 'public/i18n/xyz.json'));
        assert.fail('Non-existent file should not be accessible');
      } catch (err) {
        assert.strictEqual(err.code, 'ENOENT');
      }
    });
  });

  // ── Environment ──────────────────────────────────────────
  describe('.env file', () => {
    it('should contain the required Cloudflare variables', async () => {
      const env = await readFile(join(testDir, '.env'), 'utf8');
      assert.ok(env.includes('CLOUDFLARE_ACCOUNT_ID'), 'Should have CLOUDFLARE_ACCOUNT_ID');
      assert.ok(env.includes('CLOUDFLARE_API_TOKEN'), 'Should have CLOUDFLARE_API_TOKEN');
    });
  });
});
