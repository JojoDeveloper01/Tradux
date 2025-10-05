# 🌐 Tradux - Intelligent Translation Library

**Tradux** is a developer-friendly translation library that automates the process of managing multilingual content in your projects. It seamlessly integrates with Cloudflare Workers to provide AI-powered translations using language models.

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
import { t, setLanguage, getCurrentLanguage, getAvailableLanguages, config } from 'tradux';
```

### Core Functions

| Function                  | Purpose                 | Use Case                 |
| ------------------------- | ----------------------- | ------------------------ |
| `t`                       | Access translations     | `t.navigation.home`      |
| `setLanguage(lang)`       | Switch active language  | User language selection  |
| `getCurrentLanguage()`    | Get current language    | Display current language |
| `getAvailableLanguages()` | Get available languages | Language selector lists  |
| `config`                  | Access configuration    | View current settings    |

### Function Details

**`setLanguage(lang)`**
- Changes the active language system-wide
- Updates the global `t` object
- Saves preference to localStorage (browser)
- Use for: Language switchers, user preferences

**`getCurrentLanguage()`**
- Returns the currently active language code
- Use for: Displaying current language, conditional logic

**`getAvailableLanguages()`**
- Returns array of available language codes from config
- Use for: Building language selectors, validation

---

## 📄 Examples

### Vanilla JavaScript
```javascript
import { t, setLanguage } from 'tradux';

// Display current translations
console.log({
  home: t.navigation.home,
  about: t.navigation.about,
  welcome: t.welcome
});
//Shows content in default language

// Change language
await setLanguage('es');
console.log(t.welcome); // "¡Bienvenido!"
```

### React Application
```jsx
import { useState, useEffect } from "react";

import { setLanguage, tStore, getAvailableLanguages, getCurrentLanguage } from "tradux"

function App() {
	const [t, setT] = useState({});
	const [languages, setLanguages] = useState([]);
	const [currentLanguage, setCurrentLanguage] = useState("");

	useEffect(() => {
		getAvailableLanguages().then(setLanguages);
		setCurrentLanguage(getCurrentLanguage());

		return tStore.subscribe(setT);
	}, []);

	const changeLanguage = async (e) => {
		await setLanguage(e.target.value);
		setCurrentLanguage(getCurrentLanguage());
	};

	return (
		<div>
			<h1>React</h1>
			<h2>{t.welcome}</h2>
			<p>{t.navigation?.home}</p>
			<p>{t.navigation?.about}</p>
			<p>{t.navigation?.services}</p>

			<select value={currentLanguage} onChange={changeLanguage}>
				{languages.map(lang => (
					<option key={lang} value={lang}>
						{lang}
					</option>
				))}
			</select>
		</div>
	);
}

export default App;
```

### Vue Application
```vue
<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { tStore, setLanguage, getCurrentLanguage, getAvailableLanguages } from "tradux"

const availableLanguages = ref([])
const currentLanguage = ref('') 
const isLoading = ref(false)
const t = reactive({})

let unsubscribe

onMounted(async () => {
  availableLanguages.value = await getAvailableLanguages()
  currentLanguage.value = getCurrentLanguage()
  unsubscribe = tStore.subscribe(newTranslations => {
    Object.keys(t).forEach(key => delete t[key])
    Object.assign(t, newTranslations)
  })
})

onUnmounted(() => unsubscribe?.())

const changeLanguage = async () => {
  isLoading.value = true
  try {
    await setLanguage(currentLanguage.value)
    currentLanguage.value = getCurrentLanguage()
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <h1>Vue</h1>
    <h2>{{ t.welcome }}</h2>
    <p>{{ t.navigation?.home }}</p>
    <p>{{ t.navigation?.about }}</p>
    <p>{{ t.navigation?.services }}</p>

    <select v-model="currentLanguage" @change="changeLanguage" :disabled="isLoading">
      <option v-for="lang in availableLanguages" :key="lang" :value="lang">
        {{ lang }}
      </option>
    </select>
  </div>
</template>
```

### Svelte Application
```svelte
<script>
  import { onMount } from "svelte";
  import {
    tStore,
    setLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
  } from "tradux";

  let availableLanguages = [];
  let currentLanguage = "";
  let t = {};
  let unsubscribe = null;

  onMount(async () => {
    availableLanguages = await getAvailableLanguages();
    currentLanguage = getCurrentLanguage();

    unsubscribe = tStore.subscribe((newTranslations) => {
      t = { ...newTranslations };
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

  function changeLanguage(event) {
    setLanguage(event.target.value);
    currentLanguage = getCurrentLanguage();
  }
</script>

<div>
  <h1>Svelte</h1>
  <h2>{t.welcome}</h2>
  <p>{t.navigation?.home}</p>
  <p>{t.navigation?.about}</p>
  <p>{t.navigation?.services}</p>

  <select value={currentLanguage} on:change={changeLanguage}>
    {#each availableLanguages as lang}
      {#if lang && typeof lang === "string"}
        <option value={lang}>{lang}</option>
      {/if}
    {/each}
  </select>
</div>
```

### Vanilla Application
```html
<section>
    <h1>Astro</h1>

    <h2 data-key="welcome"></h2>

    <p data-key="navigation.home"></p>
    <p data-key="navigation.about"></p>
    <p data-key="navigation.services"></p>

    <select id="lang-select"></select>
</section>

<script>
    import {
        tStore,
        setLanguage,
        getAvailableLanguages,
        getCurrentLanguage,
    } from "tradux";

    const select = document.getElementById("lang-select") as HTMLSelectElement;
    const languages = await getAvailableLanguages();

    languages.forEach((lang: string) => {
        const option = document.createElement("option");
        option.value = lang;
        option.textContent = lang;
        option.selected = lang === getCurrentLanguage();
        select.appendChild(option);
    });

    select.onchange = (e: Event) =>
        setLanguage((e.target as HTMLSelectElement).value);

    tStore.subscribe((t: Record<string, any>) => {
        document.querySelectorAll("[data-key]").forEach((el: Element) => {
            const key = el instanceof HTMLElement ? el.dataset.key : undefined;
            const keys = key?.split(".") ?? [];
            let value = t;
            keys.forEach((k) => (value = value?.[k]));
            if (el instanceof HTMLElement) {
                el.textContent = typeof value === "string" ? value : "";
            }
        });
    });
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

### Translation File Format
```json
{
  "navigation": {
    "home": "Home",
    "about": "About Us",
    "services": "Our Services"
  },
  "welcome": "Welcome to our website!",
  "title": "My Application"
}
```

---

## 🔄 How Tradux Works - Technical Deep Dive

### 1. **Initialization Process**
When you install Tradux or run `tradux init`:

1. **Configuration Creation**: Generates `tradux.config.json` with default settings
2. **Directory Setup**: Creates the i18n directory structure (prioritizes public folder)
3. **Sample File**: Creates a sample `en.json` file with basic structure
4. **Environment Check**: Validates that required directories exist
5. **Auto Path Resolution**: Automatically detects common i18n folder locations

### 2. **Translation Workflow**
When you run `npx tradux -t languages`:

1. **Config Loading**: Reads `tradux.config.json` to get default language and i18n path
2. **Path Resolution**: Automatically resolves i18n path (tries public/i18n, then fallbacks)
3. **Credential Validation**: Checks `.env` file for Cloudflare API credentials
4. **Source File Loading**: Loads the default language file (e.g., `en.json`)
5. **API Communication**: Sends translation request to Cloudflare Workers endpoint
6. **Response Processing**: Receives translated JSON object from the AI model
7. **File Generation**: Creates new language files with translated content
8. **Config Update**: Automatically updates `availableLanguages` array in config

### 3. **Update System Intelligence**
When you run `npx tradux -u`:

1. **File Scanning**: Scans i18n directory to find existing language files
2. **Structure Comparison**: Compares default language structure with target languages
3. **Missing Content Detection**: Identifies new keys in default language not present in targets
4. **Obsolete Content Detection**: Finds keys in target languages that no longer exist in default
5. **Selective Translation**: Only translates missing content, preserving existing translations
6. **Content Removal**: Removes obsolete keys from target languages
7. **File Reconstruction**: Rebuilds language files with synchronized content
8. **Config Sync**: Updates `availableLanguages` if new files were created

### 4. **Removal System**
When you run `npx tradux -r`:

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
   - Browser: Checks localStorage for saved preference
   - Server: Uses default language from config
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
5. **Persistence**: Saves language choice to localStorage (browser only)
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