/**
 * postinstall.js — Auto-setup hook
 *
 * Runs after `npm install tradux` / `pnpm add tradux` in the consumer's project.
 * Validates (or creates) tradux.config.json so the library is ready to use
 * immediately without requiring a manual `npx tradux init`.
 *
 * Skipped in CI/CD environments (GitHub Actions, Vercel, Netlify) where
 * config generation would dirty the working tree and break deploys.
 */

import { validateAndFixConfig } from "./src/utils/config.js";

export async function runPostInstall() {
  if (process.env.CI || process.env.VERCEL || process.env.NETLIFY) return;

  // INIT_CWD points to the consumer's project root (where they ran `npm install`),
  // not the node_modules/tradux directory where this script lives.
  const PROJECT_ROOT = process.env.INIT_CWD || process.cwd();
  await validateAndFixConfig(PROJECT_ROOT, true);
}
