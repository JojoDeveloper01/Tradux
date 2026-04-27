/**
 * auth.js — Environment Variables and Authentication Management
 */
import fs from "fs";
import path from "path";
import * as p from "@clack/prompts";
import { color } from "./logger.js";
import { BACK_SYMBOL } from "./prompt-helpers.js";

// Load .env from the project root (where the user runs tradux) into process.env.
// Uses Node's built-in fs — no dotenv dependency needed.
// Variables already set in the shell take precedence (we don't overwrite them).
export function initEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx < 1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {}
}

/**
 * GitHub Copilot Device Flow — opens browser authorization, polls until approved,
 * then saves the resulting token to .env automatically.
 */
async function githubCopilotDeviceAuth() {
  const CLIENT_ID = "Iv1.b507a08c87ecfe98";
  const envFilePath = path.join(process.cwd(), ".env");

  const codeRes = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: "copilot" }),
  });
  if (!codeRes.ok)
    throw new Error(`GitHub device request failed: ${codeRes.status}`);

  const { device_code, user_code, verification_uri, expires_in, interval } =
    await codeRes.json();

  p.note(
    `Visit:  ${color.primary(verification_uri)}\nCode:   ${color.warn(user_code)}`,
    "GitHub Copilot Auth",
  );

  const s = p.spinner();
  s.start("Waiting for authorization…");

  const pollMs = Math.max((interval || 5) * 1000, 5000);
  const expiresAt = Date.now() + (expires_in || 900) * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((r) => setTimeout(r, pollMs));
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      },
    );
    const data = await tokenRes.json();

    if (data.access_token) {
      process.env["GITHUB_TOKEN"] = data.access_token;
      const line = `GITHUB_TOKEN=${data.access_token}`;
      if (fs.existsSync(envFilePath)) {
        const content = fs.readFileSync(envFilePath, "utf8");
        if (/^GITHUB_TOKEN=/m.test(content))
          fs.writeFileSync(
            envFilePath,
            content.replace(/^GITHUB_TOKEN=.*/m, line),
          );
        else fs.appendFileSync(envFilePath, `\n${line}`);
      } else fs.writeFileSync(envFilePath, `${line}\n`);

      s.stop("Authorized! Token saved to .env");
      return;
    }
    if (data.error === "authorization_pending" || data.error === "slow_down")
      continue;
    s.stop(color.error("Authorization failed"));
    throw new Error(data.error_description || "GitHub auth failed");
  }
  s.stop(color.error("Authorization timed out"));
  throw new Error("GitHub auth timed out. Try again.");
}

/**
 * If `envVar` isn't in process.env yet (or is invalid for Copilot), prompts to set it.
 * For Copilot: always runs Device Flow — no token validation, no questions asked.
 * For others: asks for the key directly and offers to save it to .env.
 */
export async function promptMissingKey(envVar, provider, ocHelper) {
  if (!envVar || process.env[envVar]) return;

  if (provider === "copilot") return await githubCopilotDeviceAuth();

  p.log.warn(color.error(`${envVar} not found in .env`));
  const key = ocHelper(
    await p.password({
      message: color.secondary(`Enter ${envVar} (Enter to skip):`),
    }),
    true,
  );

  if (key === BACK_SYMBOL) return BACK_SYMBOL;
  if (!key) return;

  process.env[envVar] = key;
  const envFilePath = path.join(process.cwd(), ".env");

  const save = ocHelper(
    await p.confirm({
      message: color.secondary(`Save ${envVar} to .env?`),
      initialValue: true,
    }),
    true,
  );

  if (save === BACK_SYMBOL) return BACK_SYMBOL;

  if (save) {
    const line = `${envVar}=${key}`;
    fs.existsSync(envFilePath)
      ? fs.appendFileSync(envFilePath, `\n${line}`)
      : fs.writeFileSync(envFilePath, `${line}\n`);
    p.log.success(color.success(`${envVar} saved to .env`));
  }
}
