/**
 * color.js — Shared UI utilities for the Tradux CLI
 */

import * as p from "@clack/prompts";
import { logger, color } from "./logger.js";

/**
 * Prints the Tradux ASCII banner: logo + version + tagline.
 * @param {string} version — package version string, e.g. "1.5.8"
 */
export function printBanner(version = "") {
  const ver = version ? ` v${version}` : "";
  logger.info3(`\n\n   Tradux${ver} — Automated i18n. Any framework. Any AI.`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Legend — keyboard hint bar shown below prompts
// ---------------------------------------------------------------------------

/**
 * Prints the post-translation summary inside a clack note box.
 *
 * @param {Array<{lang:string, status:"ok"|"skipped"|"error", duration:number, reviewFixes?:number, error?:string}>} results
 * @param {number} totalMs — total wall-clock time in ms
 */
export function printSummary(results, totalMs = 0) {
  if (!results || results.length === 0) return;

  const lines = results.map((r) => {
    const icon =
      r.status === "ok"
        ? color.success("✔")
        : r.status === "skipped"
          ? color.tertiary("–")
          : color.error("✗");
    const lang = color.tertiary(r.lang.padEnd(8));
    const time =
      r.duration != null
        ? color.tertiary(`${(r.duration / 1000).toFixed(1)}s`.padEnd(7))
        : color.tertiary("–      ");
    const review =
      r.reviewFixes != null && r.reviewFixes > 0
        ? color.secondary(
            ` · ${r.reviewFixes} fix${r.reviewFixes !== 1 ? "es" : ""}`,
          )
        : "";
    const err = r.error ? `\n   ${color.error(r.error)}` : "";
    return `${icon}  ${lang}  ${time}${review}${err}`;
  });

  const okCount = results.filter((r) => r.status === "ok").length;
  if (totalMs) {
    lines.push("");
    lines.push(
      color.tertiary(
        `${okCount} language${okCount !== 1 ? "s" : ""} · ${(totalMs / 1000).toFixed(1)}s total`,
      ),
    );
  }

  p.note(lines.join("\n"), color.success("Translation complete"));
}
