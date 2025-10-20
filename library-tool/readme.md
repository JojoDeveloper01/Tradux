# 🌐 Tradux - Intelligent Translation Library

**Tradux** is a developer-friendly translation library that automates the process of managing multilingual content in your projects. It seamlessly integrates with Cloudflare Workers to provide AI-powered translations using language models.

## 🌍 SEO & Internationalization: Dynamic Meta Tags

Tradux makes it easy to dynamically update meta tags such as `<html lang="...">` and `<title>` based on the user's selected language.

You can update meta tags dynamically in client-side apps (React, Vue, Svelte, Vanilla JS) using JavaScript, or on the server using SSR (Server-Side Rendering) with frameworks like Express or Vite SSR. See the examples below for implementation details.


## 🎯 Purpose

Tradux solves the common problem of managing translations in modern applications by:

- **Automating translation workflows** - No more manual translation files
- **Providing intelligent updates** - Sync translations when your base language changes
- **Offering simple integration** - Works with any JavaScript framework
- **Maintaining consistency** - Ensures all languages stay in sync with your default language
- **Auto-syncing config** - Automatically updates `availableLanguages` when files are added/removed

## ⚡ Key Features

- **AI-Powered Translations** via Cloudflare Workers API
- **Automatic Language Synchronization** - Add/remove content across all languages
- **Smart Update System** - Only translates missing content, preserves existing translations
- **Auto Config Management** - Automatically syncs `availableLanguages` with actual files
- **Framework Agnostic** - Works with React, Vue, Vanilla JS, Node.js, and more
- **Local Storage Integration** - Remembers user language preferences
- **Simple CLI Interface** - Easy-to-use command line tools
- **Intelligent Path Resolution** - Automatically finds i18n folders in public directories

---

## 🚀 Installation

### For npm and yarn:
```bash
npm install tradux
# or
yarn add tradux
```

### For pnpm and bun (requires extra step):
```bash
pnpm install tradux && pnpx tradux init
# or
bun install tradux && bunx tradux init
```

## 📋 Setup Requirements

1. **Cloudflare Account** - You need Cloudflare API credentials
2. **Environment Variables** - Create a `.env` file with:
   ```env
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_API_TOKEN=your_api_token
   ```

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

## 🛠️ CLI Usage

### View all available commands:
```bash
npx tradux
```

### Initialize Tradux in your project:
```bash
npx tradux init
```

### Translate to specific languages:
```bash
# Single language
npx tradux -t es

# Multiple languages
npx tradux -t es,pt,fr

# Interactive mode
npx tradux -t
```

### Update existing translations:
```bash
# Update all existing languages
npx tradux -u

# Update specific languages
npx tradux -u es,pt
```

### Remove language files:
```bash
# Interactive removal
npx tradux -r

# Remove specific languages
npx tradux -r es,pt
```

> **Update vs Translate**: Update (`-u`) syncs existing language files with your default language, adding missing content and removing obsolete keys. Translate (`-t`) creates new translation files. Remove (`-r`) deletes language files and automatically updates the config.

---

## 💻 JavaScript API


Import Tradux functions in your application:

```javascript
import { t, setLanguage, getAvailableLanguages, getCurrentLanguage, config } from 'tradux';
```

### Core Functions

| Function/Variable                   | Purpose                                       | Use Case                |
| ----------------------------------- | --------------------------------------------- | ----------------------- |
| `t`                                 | Access translations                           | `t.navigation.home`     |
| `setLanguage(lang)`                 | Switch active language                        | User language selection |
| `getCurrentLanguage([cookieValue])` | Get current language (optionally from cookie) | SSR, browser, server    |
| `getAvailableLanguages()`           | Available language list                       | Language selector lists |
| `config`                            | Access configuration                          | View current settings   |

### Function Details

**`setLanguage(lang)`**
- Changes the active language system-wide
- Updates the global `t` object
- Saves preference to cookie (browser) or sets cookie header (server)
- Use for: Language switchers, user preferences

**`getCurrentLanguage([cookieValue])`**
- Returns the currently active language code as a string
- On the server, pass the value of the `tradux_lang` cookie (not the whole cookie string)
- On the browser, call with no arguments for auto-detection
- Use for: Displaying current language, SSR, conditional logic

**`getAvailableLanguages()`**
- Returns array of available language objects `{ name, value }` from config
- Use for: Building language selectors, validation

---

## 📄 Examples

### React Application
```jsx
import { t, setLanguage, getAvailableLanguages, getCurrentLanguage } from "tradux"

const currentLang = await getCurrentLanguage();

function App() {
	const changeLanguage = async (e) => {
		await setLanguage(e.target.value);
		location.reload();
	};

	return (
		<div>
			<h1>React</h1>
			<h2>{t.welcome}</h2>
			<p>{t.navigation.home}</p>
			<p>{t.navigation.about}</p>
			<p>{t.navigation.services}</p>

			<select value={currentLang} onChange={changeLanguage}>
				{getAvailableLanguages().map(({ name, value }) => (
					<option key={value} value={value}>
						{name}
					</option>
				))}
			</select>
		</div>
	);
}
export default App;
```


### Vue Application
```jsx
<script setup>
import { ref, onMounted } from 'vue'
import { t, setLanguage, getAvailableLanguages, getCurrentLanguage } from "tradux"

const selectedLanguage = ref('')

onMounted(async () => {
  selectedLanguage.value = await getCurrentLanguage()
})

const changeLanguage = async (e) => {
  const newLang = e.target.value
  if (await setLanguage(newLang)) {
    selectedLanguage.value = newLang
    window.location.reload()
  }
}
</script>

<template>
  <h1>Vue</h1>
  <h2>{{ t.welcome }}</h2>
  <p>{{ t.navigation.home }}</p>
  <p>{{ t.navigation.about }}</p>
  <p>{{ t.navigation.services }}</p>
  <select v-model="selectedLanguage" @change="changeLanguage">
    <option v-for="lang in getAvailableLanguages()" :key="lang.value" :value="lang.value">
      {{ lang.name }}
    </option>
  </select>
</template>
```


### Svelte Application
```jsx
<script>
  import { t, setLanguage, getCurrentLanguage, getAvailableLanguages } from "tradux";

  let currentLanguage = "";

  async function init() {
    currentLanguage = await getCurrentLanguage();
  }
  init();

  async function changeLanguage(event) {
    const lang = event.target.value;
    if (await setLanguage(lang)) {
      currentLanguage = lang;
      location.reload();
    }
  }
</script>

<div>
  <h1>Svelte</h1>
  <h2>{t.welcome}</h2>
  <p>{t.navigation.home}</p>
  <p>{t.navigation.about}</p>
  <p>{t.navigation.services}</p>
  <select bind:value={currentLanguage} on:change={changeLanguage}>
    {#each getAvailableLanguages() as { name, value }}
      <option {value}>{name}</option>
    {/each}
  </select>
</div>
```

### AstroJS
```jsx
---
import { t, setLanguage getAvailableLanguages, getCurrentLanguage } from "tradux";

const traduxCookie = Astro.cookies.get("tradux_lang")?.value;
const currentLang = await getCurrentLanguage(traduxCookie);
---
<section>
  <h1>Astro</h1>
  <h2>{t.welcome}</h2>
  <p>{t.navigation.home}</p>
  <p>{t.navigation.about}</p>
  <p>{t.navigation.services}</p>
  <select id="lang-select">
    {getAvailableLanguages().map(lang => (
      <option value={lang.value} selected={lang.value === currentLang}>{lang.name}</option>
    ))}
  </select>
</section>

<script>
      import { setLanguage } from "tradux";
      const langSelect = document.getElementById("lang-select");
      langSelect.addEventListener("change", async (e) => {
        await setLanguage(e.target.value);
        location.reload();
      });
</script>
```

### Vanilla JS Example
```js
<section>
  <h1>Vanilla JS</h1>
  <h2 data-key="welcome"></h2>
  <p data-key="navigation.home"></p>
  <p data-key="navigation.about"></p>
  <p data-key="navigation.services"></p>
  <select id="lang-select"></select>
</section>

<script>
    import { t, setLanguage, getAvailableLanguages, getCurrentLanguage } from "tradux";

    (async () => {
      const select = document.getElementById("lang-select");
      const currentLanguage = await getCurrentLanguage();
      const availableLanguages = getAvailableLanguages();
      availableLanguages.forEach(({ name, value }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = name;
        if (value === currentLanguage) option.selected = true;
        select.appendChild(option);
      });
      select.onchange = async (e) => {
        const selectedLang = e.target.value;
        if (selectedLang !== currentLanguage) {
          await setLanguage(selectedLang);
          window.location.reload();
        }
      };
      document.querySelectorAll("[data-key]").forEach((el) => {
        const key = el.dataset.key;
        const value = key.split(".").reduce((acc, k) => acc && acc[k], t);
        el.textContent = typeof value === "string" ? value : "";
      });
    })();
</script>
```
---

## 📁 File Structure

After setup, your project will have:

```
your-project/
├── .env                    # Cloudflare credentials
├── tradux.config.json      # Tradux configuration
└── public/                 # or src/ depending on your setup
    └── i18n/
        ├── en.json        # Default language (created automatically)
        ├── es.json        # Generated after translation
        ├── pt.json        # Generated after translation
        └── fr.json        # Generated after translation
```

1. **Safety Checks**: Prevents deletion of default language files
2. **Interactive Selection**: Shows available languages for removal
3. **Confirmation Prompts**: Requires user confirmation before deletion
4. **File Deletion**: Removes selected language files from filesystem
5. **Config Sync**: Automatically updates `availableLanguages` array in config

### 5. **Client-Side Loading System**
When your application imports Tradux:

1. **Configuration Resolution**: Automatically loads `tradux.config.json`
2. **Environment Detection**: Determines if running in browser or Node.js
3. **Path Resolution**: Automatically resolves i18n paths for different environments
4. **Language Detection**:
  - Browser: Tradux looks for the "tradux_lang" cookie to determine the user's preferred language.
  - Serve: Tradux uses the value of the "tradux_lang" cookie provided by the user (from the request) to set the language.
5. **File Loading Strategy**:
   - Browser: Dynamic imports with relative paths
   - Node.js: File system access with absolute paths
6. **Fallback Chain**: Default language → 'en' → empty object
7. **Global State Management**: Populates the `t` object with translations

### 6. **Language Switching Mechanism**
When `setLanguage()` is called:

1. **File Resolution**: Constructs correct path for target language
2. **Dynamic Loading**: Uses appropriate loading method for environment
3. **Validation**: Ensures language file exists and is properly formatted
4. **State Update**: Clears existing `t` object and repopulates with new translations
5. **Persistence**: Saves language choice to a cookie ("tradux_lang") in the browser, or sets the cookie header on the server
6. **Error Handling**: Falls back to default language if target fails to load

### 7. **AI Translation Integration**
The Cloudflare Workers API process:

1. **Request Formation**: Structures translation request with source data and target language
2. **Authentication**: Uses provided Cloudflare credentials for API access
3. **Model Processing**: Leverages Cloudflare's `m2m100-1.2b` translation model
4. **Context Preservation**: Maintains JSON structure and nested object relationships
5. **Response Formatting**: Returns translated content in identical structure
6. **Error Recovery**: Provides detailed error messages for debugging

### 8. **File System Management**
Tradux handles files intelligently:

1. **Path Resolution**: Converts relative paths to absolute paths across different environments
2. **Auto-Discovery**: Automatically finds i18n folders in common locations (public, src)
3. **JSON Format**: Uses JSON format for better compatibility and performance
4. **Pretty Formatting**: JSON files are formatted with proper indentation
5. **Config Synchronization**: Automatically keeps `availableLanguages` in sync with actual files
6. **Cross-Platform**: Works on Windows, macOS, and Linux
7. **Environment Adaptation**: Handles different project structures (Vite, React, etc.)