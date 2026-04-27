# 🌐 Tradux - Intelligent Translation Library

Tradux is a developer-friendly translation library designed to automate multilingual content management. It uses your choice of AI provider (OpenRouter, OpenAI, Anthropic, Google, etc.) to translate your JSON files and provides lightweight, reactive hooks to handle language switching in modern JavaScript frameworks. 

Whether you are building a simple single-page app or an SEO-focused server-rendered website, Tradux aims to reduce the manual friction of managing translations.

## ⚡ Key Features

* **AI-Powered CLI:** Automates JSON translation using any AI provider you prefer.
* **Differential Updates:** Tradux remembers your previous translations. If you change a specific English string, it only updates that string, saving API calls and tokens.
* **Redundancy (Fallback):** Automatically swaps to a backup provider if your primary API fails or runs out of credits.
* **Native Framework Hooks:** Ready-to-use hooks for React, Vue, Svelte, and Vanilla JS.
* **Cross-Component Reactivity:** Change the language in one component, and the rest of the app updates instantly without a page reload.
* **Auto-Syncing Config:** The CLI automatically manages your `availableLanguages` list based on the actual files in your folder.

<br/>

## Quick Start

### 🚀 Installation

For npm and yarn:
```bash
npm install tradux
# or
yarn add tradux
```

For pnpm and bun:
```bash
pnpm install tradux && pnpm tradux init
# or
bun install tradux && bunx tradux init
```

### 📋 Setup Requirements

* **AI Provider:** Choose an AI provider (e.g., OpenRouter, OpenAI, Anthropic). OpenRouter is recommended as it offers many free models.
* **Environment Variables:** Create a `.env` file at the root of your project and add your API keys. Example for OpenRouter:

```env
OPENROUTER_API_KEY=sk-or-...
```

### ⚙️ Configuration

After installation, run `npx tradux init` to interactively create or update your `tradux.config.json` file. The structure looks like this:

```json
{
  "i18nPath": "./i18n",
  "defaultLanguage": "en",
  "availableLanguages": ["en", "es", "pt"],
  "translation": {
    "default": {
       "provider": "openrouter",
       "model": "google/gemini-2.0-flash-001"
    },
    "fallback": {
       "provider": "openrouter",
       "model": "@google/gemini-2.0-flash-lite-001"
    }
  }
}
```

**Configuration Options:**
* `defaultLanguage` - Your base language (default: `'en'`)
* `i18nPath` - Path to translation files (default: `'./i18n'`)
* `availableLanguages` - Auto-managed list of available language files
* `translation.default` - Your primary AI provider and model
* `translation.fallback` - (Optional) A backup provider if the primary fails

### 🤖 Translation Providers

Tradux supports multiple providers out of the box. Just set the correct provider in your config and the corresponding key in your `.env`.

| Provider       | Config Name  | Required .env Variable(s)                       |
| :------------- | :----------- | :---------------------------------------------- |
| **OpenRouter** | `openrouter` | `OPENROUTER_API_KEY`                            |
| **OpenAI**     | `openai`     | `OPENAI_API_KEY`                                |
| **Anthropic**  | `anthropic`  | `ANTHROPIC_API_KEY`                             |
| **Google AI**  | `google`     | `GOOGLE_AI_API_KEY`                             |
| **Cloudflare** | `cloudflare` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` |
| **Custom API** | `custom`     | `CUSTOM_API_KEY` (requires `baseURL` in config) |

### 🛠️ CLI Usage

Once your default language file (`en.json`) is ready, use the CLI to manage your translations:

```
npx tradux init               Interactive setup wizard — configure path, languages, provider
npx tradux -t                 Interactive language selection, then translate
npx tradux -t es,pt,fr        Translate to specific languages from the default language
npx tradux -u                 Update ALL languages (only re-translates what changed)
npx tradux -u es,pt           Update specific languages
npx tradux -r                 Interactive removal of language files
npx tradux -r es,pt           Remove specific language files
npx tradux -v                 Show version
```

The `-u` (update) command is **differential**: it compares the current source JSON against the last snapshot (`.tradux-state.json`) and only sends changed or new keys to the AI. This keeps updates fast and API-cost-efficient.

---

## 🏷️ Special Markers

Add markers to key names in your source JSON (`en.json`) to control how Tradux handles specific values.

* `===` **(No Translate):** Copies the value exactly as-is. Useful for image paths or URLs.
```json
{ "===heroImage": "/images/hero.jpg" }
```

* `+++` **(Force Translate):** Forces re-translation on every `-u` run, even if the English value hasn't changed.
```json
{ "+++tagline": "The best product ever made" }
```

* `---` **(Ignore):** Completely ignores the key. It won't be translated or added to the target files.
```json
{ "---devNote": "TODO: revisit this copy before launch" }
```

<br/>

## 🧰 Core API & Functions

Import Tradux functions in your application:

```javascript
const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } = useTradux();
```

Whether you use `useTradux()` in a framework or `initTradux()` in Vanilla JS/SSR, Tradux exposes a standard set of variables and functions:

### Core API

| Function / Variable       | Purpose                                             | Use Case                         |
| :------------------------ | :-------------------------------------------------- | :------------------------------- |
| `t`                       | Access translations safely (with fallback behavior) | `t.homepage.hero.title`          |
| `currentLanguage`         | Get the currently active language code              | Conditional UI, debugging        |
| `isReady`                 | Check if translations finished loading              | Prevent UI flash, loading states |
| `setLanguage(lang)`       | Switch active language globally                     | Language switchers, preferences  |
| `getAvailableLanguages()` | Retrieve configured language list                   | Build language selectors         |

### Function Details

**`setLanguage(lang)`**
* Changes the active language system-wide.
* Updates the global `t` object reactively.
* Persists preference via cookie.
* Triggers UI updates automatically.
* *Use for:* Language switchers, user preferences, dynamic locale changes.

**`getAvailableLanguages()`**
* Returns an array of language objects: `{ name: string; value: string }`
* Derived directly from your config file.
* *Use for:* Building selectors, validation, dynamic UI generation.

**`currentLanguage`**
* A string representing the active language.
* Always reflects the current global state.

**`isReady`**
* Boolean flag indicating translation loading status.
* Prevents rendering before translations are available.

<br/>

## 📄 Examples

Tradux provides sub-path exports for your favorite frameworks. These hooks automatically fetch translations and provide a reactive state.

### ⚛️ React
```jsx
import { useTradux } from "tradux/react";

export default function App() {
    const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } = useTradux();

    if (!isReady) return <p>Loading...</p>;

    return (
        <div>
            <h2>{t.welcome}</h2>
            <select value={currentLanguage} onChange={(e) => setLanguage(e.target.value)}>
                {getAvailableLanguages().map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.name}</option>
                ))}
            </select>
        </div>
    );
}
```

### 🟢 Vue 3
```JSX
<script setup>
import { useTradux } from "tradux/vue";

const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } = useTradux();
</script>

<template>
  <div v-if="isReady">
    <h2>{{ t.welcome }}</h2>
    <select :value="currentLanguage" @change="(e) => setLanguage(e.target.value)">
      <option v-for="lang in getAvailableLanguages()" :key="lang.value" :value="lang.value">
        {{ lang.name }}
      </option>
    </select>
  </div>
</template>
```

### 🟠 Svelte
```JSX
<script>
  import { useTradux } from "tradux/svelte";

  const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } = useTradux();
</script>

{#if $isReady}
  <div>
    <h2>{$t.welcome}</h2>
    <select value={$currentLanguage} on:change={(e) => setLanguage(e.target.value)}>
      {#each getAvailableLanguages() as { name, value }}
        <option {value}>{name}</option>
      {/each}
    </select>
  </div>
{/if}
```

### 🟣 Astro
Because Astro heavily utilizes Server-Side Rendering (SSR), you need to collect the Tradux cookie from the incoming request and pass it to `initTradux` to ensure the server renders the correct language before sending it to the client.

```jsx
---
import { initTradux, getAvailableLanguages } from "tradux";

const traduxCookie = Astro.cookies.get("tradux_lang")?.value;
const { t, currentLanguage } = await initTradux(traduxCookie);
---

<section>
  <h1>{t.welcome}</h1>
  <select id="lang-select">
    {getAvailableLanguages().map((lang) => (
        <option value={lang.value} selected={lang.value === currentLanguage}>
          {lang.name}
        </option>
      ))}
  </select>
</section>

<script>
  import { setLanguage } from "tradux";
  const langSelect = document.getElementById("lang-select") as HTMLElement;
  langSelect.addEventListener("change", async (e: Event) => {
    await setLanguage((e.target as HTMLSelectElement).value);
    location.reload();
  });
</script>
```

### 🟡 Vanilla JS
```html
<section>
  <h1>Vanilla JS + Vite</h1>
  <h2 data-key="welcome"></h2>
  <p data-key="navigation.home"></p>
  <p data-key="navigation.about"></p>
  <p data-key="navigation.services"></p>
  <select id="lang-select"></select>
</section>
  
<script type="module">
  import { initTradux, setLanguage, getAvailableLanguages, onLanguageChange } from "tradux";

  const { t, currentLanguage } = await initTradux();
  const select = document.getElementById("lang-select");

  const render = () =>
    document.querySelectorAll("[data-key]").forEach((el) => {
      const value = el.dataset.key.split(".").reduce((acc, k) => acc?.[k], t);
      el.textContent = typeof value === "string" ? value : "";
    });

  getAvailableLanguages().forEach(({ name, value }) => {
    select.add(new Option(name, value, false, value === currentLanguage));
  });

  render();
  onLanguageChange(render);
  select.onchange = async (e) => { await setLanguage(e.target.value); render(); };
</script>
```

<br/>

## Advanced Usage

### 🏗️ Global State & Reusability
Tradux uses a shared memory cache. If you have multiple translated components on a single page, you do not need to manage loading states for all of them. Initialize Tradux once at the root of your app. Child components will instantly receive translations with zero network requests or loading flicker.

**1. The Root Component (`App.jsx`):**
```jsx
import { useTradux } from "tradux/react";
import Navbar from "./Navbar";

export default function App() {
    const { isReady } = useTradux(); 
    if (!isReady) return <div>Loading...</div>;
    return <Navbar />;
}
```

**2. The Child Component (`Navbar.jsx`):**
```jsx
import { useTradux } from "tradux/react";

export default function Navbar() {
    const { t } = useTradux(); 
    return <nav>{t.navigation?.home}</nav>;
}
```

### 🌍 SEO & Server-Side Routing (SSR)
For search engines (like Google) to index your translated content, languages should be tied to the URL (e.g., `mysite.com/es/about`). Search engines ignore local storage and cookies. Tradux supports this natively. Instead of using `setLanguage()` (which relies on cookies), use your framework's router to extract the language from the URL and pass it directly to Tradux.

**Astro SSR Example (`src/pages/[lang]/index.astro`):**
```jsx
---
import { initTradux } from "tradux";

const { lang } = Astro.params; 

const { t } = await initTradux(lang);
---
<html lang={lang}>
  <body>
    <h1>{t.welcome}</h1>
  </body>
</html>
```

<br/>

### Dynamically Updating `<head>` Tags in SSR (Express & Vite)
When using Custom SSR setups, you can use Tradux isolated instances to intercept requests, read the translation file on the server, and inject the correct `<html lang="x">` and `<title>` tags into your raw HTML before serving it to the client.

**Example using Vite SSR & Express:**
```javascript
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { initTradux } from "tradux";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  app.use(/.*/, async (req, res, next) => {
    try {
      const url = req.originalUrl;

      let template = await fs.readFile(
        path.resolve(__dirname, "index.html"),
        "utf-8",
      );
      template = await vite.transformIndexHtml(url, template);

      const traduxLang =
        req.headers.cookie
          ?.split("; ")
          .find((c) => c.startsWith("tradux_lang="))
          ?.split("=")[1] || "en";

      const { t, currentLanguage } = await initTradux(traduxLang);
      const title = t.navigation?.home || "My Website";

      const html = template
        .replace(/<html lang=".*?">/, `<html lang="${currentLanguage}">`)
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(3000, () => {
    console.log("Server running at http://  localhost:3000");
  });
}

createServer();
```

<br/>

## 🤖 How the CLI Works Under the Hood

1.  **The Auto-Healer:** Whenever you run a Tradux CLI command, the system validates your setup. If you manually delete a language file like `pt.json` from your folder, Tradux automatically removes it from your `tradux.config.json` array. If your folder paths get misconfigured, the CLI attempts to correct them safely.
2.  **Differential Translation (`.tradux-state.json`):** When you translate files, Tradux leaves a hidden `.tradux-state.json` file in your `i18n` folder to act as a state snapshot. When you run `npx tradux -u`, Tradux compares your current `en.json` against this snapshot. It calculates exactly which existing strings were modified and which were newly added, sending only the differences to the API.

## 📁 File Structure

After setup, your project will look similar to this:

```text
your-project/
├── .env                        # AI Provider credentials
├── tradux.config.json          # Auto-managed config
└── public/
    └── i18n/
        ├── .tradux-state.json  # Hidden tracker for differential updates
        ├── en.json             # Default language
        ├── es.json             # AI generated translation
        └── pt.json             # AI generated translation
```