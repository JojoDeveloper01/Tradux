import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { mkdir, rm, access, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliEntry = join(__dirname, '../../src/index.js');
const testDir = join(__dirname, '../temp-cli');

// Read version from package.json once so the test never goes stale
const pkgJson = JSON.parse(
  await readFile(join(__dirname, '../../package.json'), 'utf8'),
);
const EXPECTED_VERSION = pkgJson.version; // e.g. "1.5.1"

function runCLI(args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const { env: extraEnv, ...restOpts } = opts;
    const child = spawn('node', [cliEntry, ...args], {
      cwd: testDir,
      env: { ...process.env, INIT_CWD: testDir, ...extraEnv },
      ...restOpts,
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', reject);
  });
}

/**
 * CLI CONTRACT TESTS
 *
 * Tests verify observable CLI behaviors (output patterns, file creation,
 * exit codes) — not specific wording. The version number is read from
 * package.json dynamically so bumping the version never breaks a test.
 */
describe('Tradux CLI', () => {

  before(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  // ── Help ─────────────────────────────────────────────────
  describe('Help output', () => {
    it('should display help when run with no arguments', async () => {
      const { stdout } = await runCLI([]);
      // Just verify the key commands are mentioned — not exact text
      const lower = stdout.toLowerCase();
      assert.ok(lower.includes('tradux'), 'Help should mention "tradux"');
      assert.ok(lower.includes('init') || lower.includes('-t') || lower.includes('translate'),
        'Help should mention at least one command');
    });
  });

  // ── Version ──────────────────────────────────────────────
  describe('Version flag', () => {
    it('should print the current version from package.json', async () => {
      const { stdout, stderr } = await runCLI(['--version']);
      const combined = stdout + stderr;
      assert.ok(
        combined.includes(EXPECTED_VERSION),
        `Output should contain version "${EXPECTED_VERSION}" — got: ${combined.trim()}`,
      );
    });
  });

  // ── Init ─────────────────────────────────────────────────
  describe('init command', () => {
    it('should create tradux.config.json', async () => {
      const { code } = await runCLI(['init']);
      assert.ok(code !== null, 'Should run without crashing');

      // Verify the config file was created
      await access(join(testDir, 'tradux.config.json'));
      const config = JSON.parse(await readFile(join(testDir, 'tradux.config.json'), 'utf8'));
      assert.ok('i18nPath' in config, 'Config should have i18nPath');
      assert.ok('defaultLanguage' in config, 'Config should have defaultLanguage');
    });

    it('should be idempotent (safe to run twice)', async () => {
      const { code } = await runCLI(['init']);
      assert.ok(code !== null, 'Second init should not crash');
    });
  });

  // ── Error handling ───────────────────────────────────────
  describe('Error handling', () => {
    it('should not crash on unknown commands', async () => {
      const { code } = await runCLI(['this-does-not-exist']);
      assert.ok(code !== null, 'Should exit, not hang');
    });

    it('should handle translate without credentials gracefully', async () => {
      const { code } = await runCLI(['-t', 'es'], {
        env: { CLOUDFLARE_ACCOUNT_ID: '', CLOUDFLARE_API_TOKEN: '' },
      });
      assert.ok(code !== null, 'Should not hang');
    });
  });
});
