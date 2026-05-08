# Changelog

All notable changes to **Tradux** are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com)

---

## [1.5.9]

### Added

- Cloudflare/Astro-safe runtime entrypoints: `tradux/browser`, `tradux/node`, `tradux/edge`, and `tradux/astro`.
- Astro `createTraduxFromGlob()` adapter for eager `import.meta.glob('/public/i18n/*.json', { eager: true, import: 'default' })` translation maps.

### Changed

- Default `tradux` runtime now points at the browser-safe entrypoint so browser and edge bundles are not contaminated by Node `fs`/`path` imports.
- Language cookies now include `Path=/`, `Max-Age=31536000`, and `SameSite=Lax`, with `Secure` added automatically on HTTPS.

### Fixed

- Translation proxies now support `Object.entries()`, property descriptors, and the `in` operator for template iteration and enumeration.

---

## [1.5.8] — 2026-04-26

### Added

- **True Provider Redundancy (Fallback swapping)**  
  The fallback provider now acts as a true safety net. If the primary provider is misconfigured or missing credentials, Tradux automatically switches and continues execution.

- **Double-Barrier Credential Validation**  
  `checkEnvCredentials()` validates both primary and fallback providers.

- **Hard-Fail on Corrupt JSON**  
  `loadSourceFile()` now aborts immediately on invalid JSON syntax.

- **Sequential Multi-Key Prompting**  
  Init wizard supports providers requiring multiple environment variables.

- **Interactive Update Command**  
  Run update directly inside `npx tradux init`.

- **Provider Registry (`src/utils/providers.js`)**
  - `PROVIDER_ENV_MAP`
  - `PROVIDERS`
  - Helpers:
    - `getProviderDisplayName()`
    - `getRequiredEnvVars()`
    - `getDefaultModel()`
    - `isValidProvider()`

- **Multi-provider Worker Proxy Support**
  - `openrouter`
  - `openai`
  - `anthropic`
  - `google`
  - `cloudflare`
  - `custom`

- **Fallback Provider Support**
  Automatic retry using `translation.fallback`.

- **Environment Config**
  - `TRADUX_WORKER_URL`
  - `workerUrl` override in config

- **Interactive Init Wizard (`npx tradux init`)**
  - i18n path
  - languages
  - default language
  - provider + model
  - fallback config

- **Config Validation Improvements**
  Detects missing `translation.provider` and `translation.model`.

- **Post-install Onboarding Message**

- **Config Fix**
  `translation` and `workerUrl` now correctly passed via `fileManager.loadConfig()`.

- **New UI Module (`src/utils/ui.js`)**
  - `printBanner()`
  - `printLegend()`
  - `printSummary()`
  - Consistent theme colors

- **Improved Language Selector**
  Native multiselect replaces autocomplete loop.

- **Auto-translate on Language Add**

- **Discard & Exit Options**
  - Delete files + remove from config
  - Keep files
  - Cancel

- **Non-interactive Init Flags**
  - `-p`, `--provider`
  - `-m`, `--model`
  - `-d`, `--default-lang`
  - `-l`, `--languages`
  - `-i`, `--i18n-path`

- **Interactive CLI Menu**
  Default `tradux` command shows menu.

- **Translation Summary Table**

- **Review Diff Count**
  Tracks changes between translation passes.

- **`tx` CLI Alias**

---

### Changed

- **Config Restructure**
  `translation.default` introduced. Legacy configs auto-migrated.

- **Smarter CLI Flags**
  Missing values now prompt interactively instead of failing.

- **Config Re-ordering**
  Translation block prioritized.

- **Cleaner Removals**
  Reduced console noise.

- **`tradux init`**
  Now a full wizard:
  - asks to reconfigure if config exists
  - validates env credentials after save

- **Worker URL Handling**
  Passed through translation pipeline.

- **Package Metadata**
  - Updated description
  - Expanded keywords

- **README Rewritten**
  - Quick Start
  - Providers
  - CLI Reference
  - Framework integrations
  - TypeScript exports
  - Env variables

---

### Fixed

- **Copy-Paste Token Crash**
  Removed keypress listener that intercepted `q`.

- **Menu Flash Bug**
  Added pauses to prevent log disappearance.

- **Ghost OpenRouter Prompts**
  Removed hardcoded fallback behavior.

- **Discard & Exit State Bug**
  Config now properly restored.

- **Deselection Drift**
  Language removal syncs instantly.

- **Invisible Default Language**
  Now visible in selector.

- **HTTP 500 Translation Bug**
  Root cause: missing `translation` in cached config.

- **Provider-agnostic Warnings**
  Now provider-specific via `getRequiredEnvVars()`.

- **Placeholder Provider Handling**
  Clear error message for `provider_code`.

- **postinstall.js Execution**
  Now properly runs.

---

### Internal

- Removed duplicated `PROVIDER_ENV_MAP`
- Centralized provider logic in `providers.js`
- `checkEnvCredentials()` now uses shared helpers

---

## [1.5.7] and earlier

Legacy **Cloudflare Workers AI** single-provider era.  
No changelog maintained.
