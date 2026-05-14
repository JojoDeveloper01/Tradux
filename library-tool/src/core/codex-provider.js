import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

function runCodex(args, { input, timeoutMs = 30_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: process.cwd(),
      stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`Codex command timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        finish(reject, new Error('OpenAI Codex CLI is not installed. Install it with: npm install -g @openai/codex'));
        return;
      }
      finish(reject, error);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        finish(reject, new Error(stderr.trim() || `Codex exited with code ${code}. Run "codex login" and try again.`));
        return;
      }
      finish(resolve, { stdout, stderr });
    });

    if (input) child.stdin.end(input);
  });
}

function extractJSON(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenceMatch ? fenceMatch[1] : text).trim();
}

function buildCodexPrompt(data, sourceLanguage, targetLanguage, reviewMode) {
  const task = reviewMode
    ? `Review and improve the JSON translation from "${sourceLanguage}" to "${targetLanguage}".`
    : `Translate the JSON values from "${sourceLanguage}" to "${targetLanguage}".`;

  const payload = data;

  return [
    task,
    "",
    "Rules:",
    "- Keep ALL JSON keys exactly the same. Never translate, rename, add, or remove keys.",
    "- Only translate string values.",
    "- Preserve arrays, nested objects, placeholders like {{variable}}, numbers, booleans, nulls, and emojis.",
    reviewMode
      ? '- The input has { original, translation }. Return ONLY the improved translation object, not the wrapper.'
      : "- Return ONLY the translated JSON object.",
    "- Do not include explanations, markdown fences, or extra text.",
    "",
    "Input JSON:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

async function runCodexExec(prompt, { model, timeoutMs } = {}) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "tradux-codex-"));
  const outputFile = path.join(tempDir, "last-message.txt");
  const args = [
    "exec",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "--output-last-message",
    outputFile,
    "-c",
    'approval_policy="never"',
  ];

  if (model && model !== "model_code") args.push("--model", model);
  args.push("-");

  try {
    await runCodex(args, { input: prompt, timeoutMs });
    return await readFile(outputFile, "utf8");
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function fetchCodexModels() {
  const { stdout } = await runCodex(["debug", "models"], { timeoutMs: 30_000 });
  const catalog = JSON.parse(stdout);
  const models = Array.isArray(catalog.models) ? catalog.models : [];

  return models
    .filter((model) => model?.slug && model.visibility !== "hidden")
    .map((model) => ({
      id: model.slug,
      name: model.display_name || model.slug,
    }));
}

export async function translateViaCodex(data, sourceLanguage, targetLanguage, model, reviewMode = false) {
  const timeoutMs = Number(process.env.TRADUX_CODEX_TIMEOUT_MS || 120_000);
  const prompt = buildCodexPrompt(data, sourceLanguage, targetLanguage, reviewMode);
  const output = await runCodexExec(prompt, { model, timeoutMs });

  try {
    return JSON.parse(extractJSON(output));
  } catch {
    throw new Error("Codex returned a non-JSON response. Try again or use a direct API-key provider.");
  }
}
