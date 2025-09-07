# 🌐 Tradux - Intelligent Translation Library

**Tradux** is a powerful, developer-friendly translation library that automates the process of managing multilingual content in your projects. It seamlessly integrates with Cloudflare Workers to provide AI-powered translations using advanced language models.

## 🎯 Purpose

Tradux solves the common problem of managing translations in modern applications by:

- **Automating translation workflows** - No more manual translation files
- **Providing intelligent updates** - Sync translations when your base language changes
- **Offering simple integration** - Works with any JavaScript framework
- **Maintaining consistency** - Ensures all languages stay in sync with your default language

## ⚡ Key Features

- **AI-Powered Translations** via Cloudflare Workers API
- **Automatic Language Synchronization** - Add/remove content across all languages
- **Smart Update System** - Only translates missing content, preserves existing translations
- **Framework Agnostic** - Works with React, Vue, Vanilla JS, Node.js, and more
- **Local Storage Integration** - Remembers user language preferences
- **Simple CLI Interface** - Easy-to-use command line tools

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

> **Note**: pnpm and bun require manual initialization due to postinstall script restrictions.

## 📋 Setup Requirements

1. **Cloudflare Account** - You need Cloudflare API credentials
2. **Environment Variables** - Create a `.env` file with:
   ```env
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_API_TOKEN=your_api_token
   ```

## ⚙️ Configuration

After installation, Tradux automatically creates a `tradux.config.js` file:

```javascript
export const i18nPath = './src/i18n';
export const defaultLanguage = 'en';
```

**Configuration Options:**
- `defaultLanguage` - Your base language (default: 'en')
- `i18nPath` - Path to translation files (default: './src/i18n')

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

> **Update vs Translate**: Update (`-u`) syncs existing language files with your default language, adding missing content and removing obsolete keys. Translate (`-t`) creates new translation files.

---

## 💻 JavaScript API

Import Tradux functions in your application:

```javascript
import { t, setLanguage, currentLanguage, loadLanguage, config } from 'tradux';
```

### Core Functions

| Function             | Purpose                     | Use Case                 |
| -------------------- | --------------------------- | ------------------------ |
| `t`                  | Access translations         | `t.navigation.home`      |
| `setLanguage(lang)`  | Switch active language      | User language selection  |
| `currentLanguage`    | Get current language        | Display current language |
| `loadLanguage(lang)` | Load specific language data | Pre-loading, validation  |
| `config`             | Access configuration        | View current settings    |

### Function Details

**`setLanguage(lang)`**
- Changes the active language system-wide
- Updates the global `t` object
- Saves preference to localStorage (browser)
- Use for: Language switchers, user preferences

**`loadLanguage(lang)`**
- Loads and returns translations without changing active language
- Doesn't affect global state
- Use for: Pre-loading, validation, comparison

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

// Change language
await setLanguage('es');
console.log(t.welcome); // "¡Bienvenido!"
```

### React Application
```jsx
import { t, setLanguage, currentLanguage } from 'tradux';
import { useState } from 'react';

function App() {
  const [renderKey, setRenderKey] = useState(0);

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' }
  ];

  const handleLanguageChange = async (lang) => {
    await setLanguage(lang);
    setRenderKey(prev => prev + 1); // Force re-render
  };

  return (
    <div key={renderKey}>
      <h1>{t.title}</h1>
      
      <div className="language-selector">
        {languages.map(({ code, label, flag }) => (
          <button
            key={code}
            onClick={() => handleLanguageChange(code)}
            className={currentLanguage === code ? 'active' : ''}
          >
            {flag} {label}
          </button>
        ))}
      </div>

      <nav>
        <a href="/">{t.navigation.home}</a>
        <a href="/about">{t.navigation.about}</a>
        <a href="/services">{t.navigation.services}</a>
      </nav>

      <main>
        <p>{t.welcome}</p>
        <p>{t.description}</p>
      </main>
    </div>
  );
}

export default App;
```

### Node.js Server
```javascript
import { loadLanguage, config } from 'tradux';

// Load specific language for server-side rendering
app.get('/api/content/:lang', async (req, res) => {
  const { lang } = req.params;
  const translations = await loadLanguage(lang);
  
  if (translations) {
    res.json({ content: translations, language: lang });
  } else {
    res.status(404).json({ error: 'Language not found' });
  }
});
```

---

## 📁 File Structure

After setup, your project will have:

```
your-project/
├── .env                    # Cloudflare credentials
├── tradux.config.js        # Tradux configuration
└── src/
    └── i18n/
        ├── en.js          # Default language (created automatically)
        ├── es.js          # Generated after translation
        ├── pt.js          # Generated after translation
        └── fr.js          # Generated after translation
```

### Translation File Format
```javascript
export const language = {
  "navigation": {
    "home": "Home",
    "about": "About Us",
    "services": "Our Services"
  },
  "welcome": "Welcome to our website!",
  "title": "My Application"
};
```

---

## 🔄 How Tradux Works - Technical Deep Dive

### 1. **Initialization Process**
When you install Tradux or run `tradux init`:

1. **Configuration Creation**: Generates `tradux.config.js` with default settings
2. **Directory Setup**: Creates the i18n directory structure
3. **Sample File**: Creates a sample `en.js` file with basic structure
4. **Environment Check**: Validates that required directories exist

### 2. **Translation Workflow**
When you run `npx tradux -t languages`:

1. **Config Loading**: Reads `tradux.config.js` to get default language and i18n path
2. **Credential Validation**: Checks `.env` file for Cloudflare API credentials
3. **Source File Loading**: Loads the default language file (e.g., `en.js`)
4. **API Communication**: Sends translation request to Cloudflare Workers endpoint
5. **Response Processing**: Receives translated JSON object from the AI model
6. **File Generation**: Creates new language files with translated content
7. **Validation**: Ensures all files are properly formatted as JavaScript modules

### 3. **Update System Intelligence**
When you run `npx tradux -u`:

1. **File Scanning**: Scans i18n directory to find existing language files
2. **Structure Comparison**: Compares default language structure with target languages
3. **Missing Content Detection**: Identifies new keys in default language not present in targets
4. **Obsolete Content Detection**: Finds keys in target languages that no longer exist in default
5. **Selective Translation**: Only translates missing content, preserving existing translations
6. **Content Removal**: Removes obsolete keys from target languages
7. **File Reconstruction**: Rebuilds language files with synchronized content

### 4. **Client-Side Loading System**
When your application imports Tradux:

1. **Configuration Resolution**: Automatically loads `tradux.config.js`
2. **Environment Detection**: Determines if running in browser or Node.js
3. **Language Detection**: 
   - Browser: Checks localStorage for saved preference
   - Server: Uses default language from config
4. **File Loading Strategy**:
   - Browser: Dynamic imports with relative paths
   - Node.js: File system access with absolute paths
5. **Fallback Chain**: Default language → 'en' → empty object
6. **Global State Management**: Populates the `t` object with translations

### 5. **Language Switching Mechanism**
When `setLanguage()` is called:

1. **File Resolution**: Constructs correct path for target language
2. **Dynamic Loading**: Uses ES6 dynamic imports for file loading
3. **Validation**: Ensures language file exists and is properly formatted
4. **State Update**: Clears existing `t` object and repopulates with new translations
5. **Persistence**: Saves language choice to localStorage (browser only)
6. **Error Handling**: Falls back to default language if target fails to load

### 6. **AI Translation Integration**
The Cloudflare Workers API process:

1. **Request Formation**: Structures translation request with source data and target language
2. **Authentication**: Uses provided Cloudflare credentials for API access
3. **Model Processing**: Leverages Cloudflare's `m2m100-1.2b` translation model
4. **Context Preservation**: Maintains JSON structure and nested object relationships
5. **Response Formatting**: Returns translated content in identical structure
6. **Error Recovery**: Provides detailed error messages for debugging

### 7. **File System Management**
Tradux handles files intelligently:

1. **Path Resolution**: Converts relative paths to absolute paths across different environments
2. **Module Format**: Always outputs ES6 modules with named exports
3. **JSON Formatting**: Pretty-prints JSON with proper indentation
4. **Backup Strategy**: Preserves existing translations during updates
5. **Cross-Platform**: Works on Windows, macOS, and Linux