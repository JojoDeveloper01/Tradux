# 🧪 Tradux Test Suite

This directory contains the complete test suite for the Tradux library.

## 📁 Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── client.test.js    # Tests client functions
│   └── utils.test.js     # Tests utilities and validations
├── integration/       # Integration tests
│   ├── config.test.js    # Tests configuration and environment
│   └── core.test.js      # Tests core functionality
├── cli/              # Command-line interface tests
│   └── commands.test.js  # Tests CLI commands
├── performance/      # Performance tests
│   └── load-times.test.js # Tests loading times
└── run-tests.js      # Main execution script
```

## 🚀 How to Run Tests

### Run all tests
```bash
pnpm test
```

### Run specific tests
```bash
pnpm run test:unit          # Unit tests only
pnpm run test:integration   # Integration tests only
pnpm run test:cli          # CLI tests only
pnpm run test:performance  # Performance tests only
```

### Run fast (without coverage)
```bash
pnpm run test:fast
```

### Quick execution (unit + integration)
```bash
pnpm run test:quick
```

## 📋 Test Types

### 🧪 Unit Tests
- **`client.test.js`**: Tests main Tradux client proxy API
  - Client module exports (t proxy, setLanguage, getCurrentLanguage)
  - Translation proxy object functionality
  - Language switching capabilities
  - Error handling with console suppression

- **`utils.test.js`**: Tests utility functions
  - Path resolution across different OS formats
  - Language code validation (ISO standards)
  - Configuration structure validation
  - Translation object structure validation

### 🔗 Integration Tests
- **`config.test.js`**: Tests configuration and environment management
  - JSON configuration file loading and validation
  - Environment variable handling
  - Language file structure validation
  - Project directory structure
  - Component integration workflows

- **`core.test.js`**: Tests core functionality
  - File manager operations
  - Core structure validation
  - Environment configuration handling
  - Language structure consistency
  - Comprehensive error handling scenarios

### 💻 CLI Tests
- **`commands.test.js`**: Tests command-line interface
  - `help` command - Displays usage information
  - `init` command - Project initialization and setup
  - `--version/-v` command - Version information display
  - Error handling for invalid commands
  - Graceful handling of missing environment variables
  - Command execution without crashes

### ⚡ Performance Tests
- **`load-times.test.js`**: Tests performance metrics and optimization
  - Client initialization performance (target: <100ms)
  - Configuration loading speed (target: <50ms)
  - Real-time performance measurement and reporting
  - Memory usage monitoring
  - Performance regression detection
  - Console error suppression for clean metrics

## 🎯 Test Coverage

The tests cover:

- ✅ **Client Functionality** - Proxy-based translation API
- ✅ **CLI Interface** - All commands including version support
- ✅ **Configuration** - JSON config loading and validation
- ✅ **Error Handling** - Graceful failure scenarios with suppression
- ✅ **Performance** - Real-time metrics and benchmarking
- ✅ **Integration** - Component interactions and workflows
- ✅ **Environment** - Cross-platform compatibility (Windows/Unix)
- ✅ **Modern Standards** - ES modules and JSON configuration format

## 🌐 Framework Integration Tests

The `frameworks/` directory contains full runnable app projects that test Tradux end-to-end in real framework environments. These are manual/visual tests — run them with `pnpm dev` to verify behavior in the browser.

```
tests/frameworks/
├── astro/             # Astro SSR app with all 4 integrations on one page
│   └── src/components/
│       ├── Astro.astro      # Native Astro SSR usage
│       ├── ReactApp.jsx     # React island via tradux/react
│       ├── SvelteApp.svelte # Svelte island via tradux/svelte
│       └── VueApp.vue       # Vue island via tradux/vue
├── astro_page/        # Minimal Astro page-level SSR test
└── vite/
    ├── react/         # React + Vite SPA (useTradux hook)
    ├── svelte/        # Svelte + Vite SPA (useTradux stores)
    ├── vue/           # Vue + Vite SPA (useTradux composable)
    └── vanilla/       # Vanilla JS + Vite (initTradux direct API)
```

### Running Framework Tests

Install all dependencies from the library root first:
```bash
# From library-tool/
pnpm install
```

Then run any individual framework:
```bash
cd tests/frameworks/vite/react && pnpm dev
cd tests/frameworks/vite/vue && pnpm dev
cd tests/frameworks/vite/svelte && pnpm dev
cd tests/frameworks/vite/vanilla && pnpm dev
cd tests/frameworks/astro && pnpm dev
cd tests/frameworks/astro_page && pnpm dev
```

### What Each Framework Test Covers

| Framework   | Import Path     | Key Test                                                |
| ----------- | --------------- | ------------------------------------------------------- |
| React       | `tradux/react`  | `useTradux()` hook, language switching, re-render       |
| Vue 3       | `tradux/vue`    | `useTradux()` composable, reactive state update         |
| Svelte      | `tradux/svelte` | `useTradux()` stores, `$t` / `$isReady` reactivity      |
| Vanilla JS  | `tradux`        | `initTradux()` direct API, DOM update without reload    |
| Astro (SSR) | `tradux`        | `initTradux(cookie)` server-side, cookie-based language |

## 📊 Reports

### Typical Test Output
```
🚀 Starting Tradux Test Suite
Testing library functionality, CLI commands, and performance

============================================================

🧪 Running Unit Tests...
Testing individual components and functions
✅ Unit Tests passed (0.42s)

🔗 Running Integration Tests...
Testing component interactions and workflows
✅ Integration Tests passed (0.62s)

💻 Running CLI Tests...
Testing command-line interface functionality
✅ CLI Tests passed (3.02s)

⚡ Running Performance Tests...
Testing performance and load times
✅ Client initialization: 11.81ms
✅ Config loading: 4.62ms
✅ Performance Tests passed (0.36s)

============================================================
� Test Results Summary

✅ Unit Tests (0.42s)
✅ Integration Tests (0.62s) 
✅ CLI Tests (3.02s)
✅ Performance Tests (0.36s)

Total: 4 suites, 4 passed, 0 failed
Duration: 4.42s

🎉 All tests passed! Running coverage analysis...
✅ Coverage report generated

All tests completed successfully!
Your Tradux library is ready for production!
```

### Coverage Report
The `pnpm test` command automatically generates a detailed coverage report showing:
- Percentage of statements covered
- Percentage of functions tested
- Percentage of branches covered
- Line-by-line coverage details
- Uncovered code segments for improvement

## 🔧 Test Configuration

### Modern JSON Configuration
Tests now use the modern JSON configuration format:
```json
{
  "defaultLanguage": "en",
  "languages": ["en", "es", "fr", "pt"],
  "i18nPath": "./src/i18n",
  "outputPath": "./public/i18n"
}
```

### Console Error Suppression
Tests implement selective error suppression to maintain clean output:
```javascript
// Only suppress language loading errors, keep other errors visible
console.error = (message) => {
  if (!message.includes('Error loading language')) {
    originalConsoleError(message);
  }
};
```

### Test Directory Structure
Tests create temporary directories during execution that are automatically cleaned:
- `tests/temp-unit/` - For unit test isolation
- `tests/temp-cli/` - For CLI command testing
- `tests/temp-integration/` - For integration test workflows
- `tests/temp-core/` - For core functionality testing
- `tests/temp-perf/` - For performance benchmarking

**Note**: Cleanup warnings on Windows are suppressed as they're non-critical file locking issues.

## 🐛 Test Debugging

### Run a specific test suite
```bash
pnpm run test:unit         # Just unit tests
pnpm run test:performance  # Just performance tests
```

### Run individual test files
```bash
node --test tests/unit/client.test.js
node --test tests/cli/commands.test.js
```

### Run with detailed output
```bash
node --test --verbose tests/unit/client.test.js
```

### Debug with Node.js
```bash
node --test --inspect tests/unit/client.test.js
```

### Test specific CLI commands
```bash
node src/index.js --version    # Test version command
node src/index.js --help       # Test help command
```

## ➕ Adding New Tests

### To create a new unit test:
1. Create a `.test.js` file in the appropriate `tests/` subdirectory
2. Use the modern ES modules structure:
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

// Add console error suppression if needed
const originalConsoleError = console.error;
console.error = (message) => {
  if (!message.includes('Error loading language')) {
    originalConsoleError(message);
  }
};

describe('Your Feature', () => {
  it('should do something', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### For tests requiring JSON configuration:
```javascript
import { readFile } from 'node:fs/promises';

// Load JSON config instead of importing JS modules
const configData = await readFile('tradux.config.json', 'utf8');
const config = JSON.parse(configData);
```

### For tests requiring temporary files:
```javascript
import { mkdir, rm } from 'node:fs/promises';

before(async () => {
  await mkdir(testDir, { recursive: true });
  // Setup files and JSON configurations
});

after(async () => {
  // Cleanup with Windows compatibility
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Suppress cleanup warnings on Windows
    if (error.code !== 'EBUSY') {
      console.warn(`Cleanup warning: ${error.message}`);
    }
  }
});
```

## 🚀 CI/CD Integration

Tests are automatically executed in CI/CD pipelines when:
- There's a push to the `main` branch
- There are changes in the `src/` or `tests/` directories
- Pull requests are opened

The workflow executes:
1. **Unit tests** - Individual component validation
2. **Integration tests** - Component interaction workflows  
3. **CLI tests** - Command-line interface validation
4. **Performance tests** - Speed and efficiency benchmarks
5. **Coverage analysis** - Code coverage reporting

**Quality Gates**: All tests must pass with 0 failures before deployment.

## 📞 Support

If you encounter issues with the tests:

1. **Check dependencies**: `pnpm install`
2. **Update pnpm**: `pnpm --version` (ensure latest version)
3. **Run individual test suites** to isolate problems
4. **Check Node.js version**: Tests require Node.js 18+ for ES modules
5. **Verify JSON configuration** format if adding new configs
6. **Check console output** - errors are selectively suppressed but important ones still show

## 📚 Learning Resources

- **[Testing Guide for Beginners](./TESTING_GUIDE.md)** - Complete guide to understanding testing
- **[Main Tradux Documentation](../README.md)** - General library documentation

## 🤝 Contributing

When adding new features to Tradux:

1. **Write tests first** (TDD approach recommended)
2. **Use modern ES modules** and JSON configuration format
3. **Ensure all existing tests pass** (40/40 target)
4. **Add performance benchmarks** for new functionality
5. **Include error suppression** for non-critical console output
6. **Update test documentation** when adding new test categories
7. **Test cross-platform compatibility** (Windows/Unix paths)

### Testing Best Practices:
- **Isolation**: Each test should be independent
- **Performance**: Keep test execution under 5 seconds total
- **Coverage**: Aim for comprehensive feature coverage
- **Clarity**: Use descriptive test names and error messages
- **Cleanup**: Always clean temporary files and directories

For more information about testing philosophy and best practices, see our [Testing Guide](./TESTING_GUIDE.md).

---

**Current Test Status**: ✅ 40/40 tests passing | ⚡ 4.42s execution time | 🎯 Production ready

