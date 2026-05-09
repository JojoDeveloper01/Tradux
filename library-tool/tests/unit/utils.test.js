import { describe, it } from "node:test";
import assert from "node:assert";

/**
 * CONTRACT TESTS for Tradux utility modules.
 *
 * Tests the *shape* and *invariants* of exported data,
 * derived from the actual source — not hardcoded copies.
 */

describe("Languages module — Contract", () => {
  it("should export an availableLanguages array", async () => {
    const { availableLanguages } = await import("../../src/utils/languages.js");
    assert.ok(Array.isArray(availableLanguages), "Should export an array");
    assert.ok(
      availableLanguages.length > 0,
      "Should contain at least one language",
    );
  });

  it("every entry should have { name: string, value: string }", async () => {
    const { availableLanguages } = await import("../../src/utils/languages.js");

    for (const lang of availableLanguages) {
      assert.strictEqual(
        typeof lang.name,
        "string",
        `name should be string, got ${typeof lang.name}`,
      );
      assert.strictEqual(
        typeof lang.value,
        "string",
        `value should be string, got ${typeof lang.value}`,
      );
      assert.ok(lang.name.length > 0, "name should not be empty");
      assert.ok(lang.value.length > 0, "value should not be empty");
    }
  });

  it("language values should be unique", async () => {
    const { availableLanguages } = await import("../../src/utils/languages.js");
    const values = availableLanguages.map((l) => l.value);
    const unique = new Set(values);
    assert.strictEqual(
      unique.size,
      values.length,
      "All language codes should be unique",
    );
  });

  it("should include English (en)", async () => {
    const { availableLanguages } = await import("../../src/utils/languages.js");
    const en = availableLanguages.find((l) => l.value === "en");
    assert.ok(en, "English should be in the list");
    assert.strictEqual(en.name, "English");
  });

  it("should include common languages (es, fr, pt, de, ja)", async () => {
    const { availableLanguages } = await import("../../src/utils/languages.js");
    const codes = availableLanguages.map((l) => l.value);
    for (const expected of ["es", "fr", "pt", "de", "ja"]) {
      assert.ok(codes.includes(expected), `Should include "${expected}"`);
    }
  });
});

describe("Logger module — Contract", () => {
  it("should export a logger with standard methods", async () => {
    const { logger } = await import("../../src/utils/logger.js");
    const requiredMethods = ["info", "warn", "error", "success"];
    for (const method of requiredMethods) {
      assert.strictEqual(
        typeof logger[method],
        "function",
        `logger.${method} should be a function`,
      );
    }
  });

  it("logger methods should not throw when called with a string", async () => {
    const { logger } = await import("../../src/utils/logger.js");
    // Redirect stdout temporarily to avoid noise
    const original = console.log;
    console.log = () => {};
    try {
      for (const method of ["info", "warn", "error", "success"]) {
        assert.doesNotThrow(() => logger[method]("test message"));
      }
    } finally {
      console.log = original;
    }
  });
});
