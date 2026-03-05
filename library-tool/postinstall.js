import { validateAndFixConfig } from "./src/utils/config.js";

export async function runPostInstall() {
  // Prevent running in CI/CD environments (Vercel, GitHub Actions, etc.)
  if (process.env.CI || process.env.VERCEL || process.env.NETLIFY) return;

  const PROJECT_ROOT = process.env.INIT_CWD || process.cwd();
  await validateAndFixConfig(PROJECT_ROOT, true);
}
