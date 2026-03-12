# 🌐 Tradux - Intelligent Translation Library

**Tradux** is a developer-friendly translation library designed to automate multilingual content management. It uses Cloudflare Workers AI to translate your JSON files and provides lightweight, reactive hooks to handle language switching in modern JavaScript frameworks.

Whether you are building a simple single-page app or an SEO-focused server-rendered website, Tradux aims to reduce the manual friction of managing translations.

## ⚡ Key Features

- **AI-Powered CLI:** Automates JSON translation using Cloudflare's `m2m100-1.2b` model.
- **Differential Updates:** Tradux remembers your previous translations. If you change a specific English string, it only updates that string, saving API calls.
- **Native Framework Hooks:** Ready-to-use hooks for React, Vue, Svelte, and Vanilla JS.
- **Cross-Component Reactivity:** Change the language in one component, and the rest of the app updates instantly without a page reload.
- **Auto-Syncing Config:** The CLI automatically manages your `availableLanguages` list based on the actual files in your folder.

---

# Quick Start

## 🚀 Installation

### For npm and yarn:
```bash
npm install tradux
# or
yarn add tradux
```

### For pnpm and bun (requires extra step):
```bash
pnpm install tradux && pnpm tradux init
# or
bun install tradux && bunx tradux init
```

## 📋 Setup Requirements

1. **Cloudflare Account:** You need Cloudflare API credentials to run the CLI translator.
2. **Environment Variables:** Create a `.env` file at the root of your project:
    ```env
    CLOUDFLARE_ACCOUNT_ID=your_account_id
    CLOUDFLARE_API_TOKEN=your_api_token
    ```
    > ⚠️ **Important Note:** The `CLOUDFLARE_API_TOKEN` must specifically be a **Workers AI** token, not a standard global API key. You can generate this in your Cloudflare dashboard under API Tokens.

<br>

## ⚙️ Configuration

After installation, Tradux automatically creates a `tradux.config.json` file:

```json
{
    "i18nPath": "./i18n",
    "defaultLanguage": "en",
    "availableLanguages": ["en"]
}
```

**Configuration Options:**
- `defaultLanguage` - Your base language (default: 'en')
- `i18nPath` - Path to translation files (default: './i18n')
- `availableLanguages` - Auto-managed list of available language files

---

<br>

## 🛠️ CLI Usage

Once your default language file (`en.json`) is ready, use the CLI to manage your translations:

1. **Translate (`-t`):** Create *new* language files based on your default language.

```bash
# Single language
npx tradux -t es

# Multiple languages
npx tradux -t es,pt,fr

# Interactive mode
npx tradux -t
```

2. **Update (`-u`):** Sync existing languages. If you add new keys or *change* existing English text, this command smartly updates the translations without overwriting your manual adjustments.

```bash
# Update all existing languages
npx tradux -u

# Update specific languages
npx tradux -u es,pt
```

3. **Remove (`-r`):** Safely delete language files and auto-sync your configuration.

```bash
# Interactive removal
npx tradux -r

# Remove specific languages
npx tradux -r es,pt
```

---

<br>

## 🧰 Core API & Functions


Import Tradux functions in your application:


```javascript
const { t, currentLanguage, isReady, setLanguage, getAvailableLanguages } = useTradux();
```

Whether you use `useTradux()` in a framework or `initTradux()` in Vanilla JS/SSR, Tradux exposes a standard set of variables and functions:

<br>

---

## Core API

| Function / Variable       | Purpose                                             | Use Case                         |
| ------------------------- | --------------------------------------------------- | -------------------------------- |
| `t`                       | Access translations safely (with fallback behavior) | `t.homepage.hero.title`          |
| `currentLanguage`         | Get the currently active language code              | Conditional UI, debugging        |
| `isReady`                 | Check if translations finished loading *(frontend)* | Prevent UI flash, loading states |
| `setLanguage(lang)`       | Switch active language globally                     | Language switchers, preferences  |
| `getAvailableLanguages()` | Retrieve configured language list                   | Build language selectors         |

---

## Function Details

### `setLanguage(lang)`

* Changes the active language system-wide
* Updates the global `t` object reactively
* Persists preference via cookie
* Triggers UI updates automatically

**Use for:**
Language switchers, user preferences, dynamic locale changes

---

### `getAvailableLanguages()`

* Returns an array of language objects:

  ```ts
  { name: string; value: string }
  ```
* Derived directly from your config file

**Use for:**
Building selectors, validation, dynamic UI generation

---

### `currentLanguage`

* A string representing the active language
* Always reflects the current global state

**Use for:**
Conditional rendering, displaying selected language

---

### `isReady`

* Boolean flag indicating translation loading status
* Prevents rendering before translations are available

**Use for:**
Loading states, SSR hydration control, avoiding flicker

---

<br>

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

```html
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

```html
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

---

<br>
<br>

# Advanced Usage

## 🏗️ Global State & Reusability

Tradux uses a shared memory cache. If you have multiple translated components on a single page, you do not need to manage loading states for all of them.

Initialize Tradux *once* at the root of your app. Child components will instantly receive translations with zero network requests or loading flicker.

**1. The Root Component (`App.jsx`):**

```jsx
import { useTradux } from "tradux/react";
import Navbar from "./Navbar";

export default function App() {
    const { isReady } = useTradux(); 
    // Block the whole app until translations arrive once
    if (!isReady) return <div>Loading...</div>;
    return <Navbar />;
}

```

**2. The Child Component (`Navbar.jsx`):**

```jsx
import { useTradux } from "tradux/react";

export default function Navbar() {
    // Instantly ready! No loading checks needed.
    const { t } = useTradux(); 
    return <nav>{t.navigation?.home}</nav>;
}

```

## 🌍 SEO & Server-Side Routing (SSR)

For search engines (like Google) to index your translated content, languages should be tied to the URL (e.g., `mysite.com/es/about`). Search engines ignore local storage and cookies.

Tradux supports this natively. Instead of using `setLanguage()` (which relies on cookies), use your framework's router to extract the language from the URL and pass it directly to Tradux.

**Astro SSR Example (`src/pages/[lang]/index.astro`):**

```jsx
---
import { initTradux } from "tradux";

// 1. Extract 'es' from the URL ([mysite.com/es/](https://mysite.com/es/))
const { lang } = Astro.params; 

// 2. Pass 'es' directly to Tradux (bypasses cookies)
const { t } = await initTradux(lang);
---
<html lang={lang}>
  <body>
    <h1>{t.welcome}</h1>
  </body>
</html>

```

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

  // 1️⃣ Vite dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);

  // 2️⃣ Catch-all route for HTML pages
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

      // Use isolated instance per request - safe for concurrent users
      const { t, currentLanguage } = await initTradux(traduxLang);
      const title = t.navigation?.home || "My Website";

      // Dynamically inject SEO tags!
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
    console.log("Server running at http://localhost:3000");
  });
}

createServer();

```

<br>
<br>

## 🤖 How the CLI Works Under the Hood

### 1. The Auto-Healer

Whenever you run a Tradux CLI command, the system validates your setup. If you manually delete a language file like `pt.json` from your folder, Tradux automatically removes it from your `tradux.config.json` array. If your folder paths get misconfigured, the CLI attempts to correct them safely.

### 2. Differential Translation (`.tradux-state.json`)

When you translate files, Tradux leaves a hidden `.tradux-state.json` file in your `i18n` folder to act as a state snapshot.
When you run `npx tradux -u`, Tradux compares your current `en.json` against this snapshot. It calculates exactly which existing strings were modified and which were newly added, sending only the differences to the Cloudflare API.

## 📁 File Structure

After setup, your project will look similar to this:

```text
your-project/
├── .env                        # Cloudflare credentials
├── tradux.config.json          # Auto-managed config
└── public/
    └── i18n/
        ├── .tradux-state.json  # Hidden tracker for differential updates
        ├── en.json             # Default language
        ├── es.json             # AI generated translation
        └── pt.json             # AI generated translation

```