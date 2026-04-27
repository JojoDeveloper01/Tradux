/**
 * postinstall.js — Auto-setup hook
 *
 * Runs after `npm install tradux` / `pnpm add tradux` in the consumer's project.
 * Validates (or creates) tradux.config.json so the library is ready to use
 * immediately without requiring a manual `npx tradux init`.
 *
 * On first install, prints a welcome message with setup instructions.
 *
 * Skipped in CI/CD environments (GitHub Actions, Vercel, Netlify) where
 * config generation would dirty the working tree and break deploys.
 */

import { validateAndFixConfig } from "./src/utils/config.js";
import { existsSync } from "fs";
import { join } from "path";

async function runPostInstall() {
  if (process.env.CI || process.env.VERCEL || process.env.NETLIFY) return;

  // INIT_CWD points to the consumer's project root (where they ran `npm install`),
  // not the node_modules/tradux directory where this script lives.
  const PROJECT_ROOT = process.env.INIT_CWD || process.cwd();

  // Detect first install before validateAndFixConfig creates the file
  const configPath = join(PROJECT_ROOT, "tradux.config.json");
  const isFirstInstall = !existsSync(configPath);

  await validateAndFixConfig(PROJECT_ROOT, true);

  if (isFirstInstall) {
    console.log("\n🎉 Welcome to Tradux!");
    console.log(
      "   Your i18n directory and a starter tradux.config.json have been created.",
    );
    console.log(
      "   Next step: run  npx tradux init  to configure your translation provider.",
    );
    console.log("   Docs: https://github.com/JojoDeveloper01/Tradux\n");
  }
}

runPostInstall().catch(() => {});
