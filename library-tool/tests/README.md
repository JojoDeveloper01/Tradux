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
npm test
```

### Run specific tests
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:cli          # CLI tests only
npm run test:performance  # Performance tests only
```

### Run fast (without coverage)
```bash
npm run test:fast
```

### Quick execution (unit + integration)
```bash
npm run test:quick
```

## 📋 Test Types

### 🧪 Unit Tests
- **`client.test.js`**: Tests main Tradux client functions
  - `loadLanguage()` - Language loading
  - `setLanguage()` - Language switching
  - Translation structure validation
  - Error handling

- **`utils.test.js`**: Tests utility functions
  - Language code validation
  - Configuration structure validation
  - Path resolution
  - Translation object validation

### 🔗 Integration Tests
- **`config.test.js`**: Tests configuration and environment
  - Configuration file loading
  - Environment variable validation
  - Language file structure
  - Component integration

- **`core.test.js`**: Tests core functionality
  - File management
  - Core structure validation
  - Error handling
  - Data integrity

### 💻 CLI Tests
- **`commands.test.js`**: Tests command-line commands
  - `init` command - Project initialization
  - `help` command - Help display
  - `version` command - Version display
  - Invalid command handling
  - Argument validation

### ⚡ Performance Tests
- **`load-times.test.js`**: Tests performance and loading times
  - Large translation file loading
  - Multiple language loading
  - Repeated loading
  - Memory usage
  - Concurrent operations

## 🎯 Test Coverage

The tests cover:

- ✅ **Client Functionality** - All main functions
- ✅ **CLI Interface** - All commands and arguments
- ✅ **Configuration** - Loading and validation
- ✅ **Error Handling** - Failure scenarios
- ✅ **Performance** - Response times and memory usage
- ✅ **Integration** - Component interactions

## 📊 Reports

### Typical Test Output
```
🚀 Starting Tradux Test Suite
Testing library functionality, CLI commands, and performance

🧪 Running Unit Tests...
Testing individual components and functions
✅ Unit Tests passed (0.45s)

🔗 Running Integration Tests...
Testing component interactions and workflows
✅ Integration Tests passed (0.67s)

💻 Running CLI Tests...
Testing command-line interface functionality
✅ CLI Tests passed (1.23s)

⚡ Running Performance Tests...
Testing performance and load times
✅ Performance Tests passed (2.10s)

📊 Generating coverage report...
✅ Coverage report generated

🎉 All tests passed! Your Tradux library is ready for production! 🚀
```

### Coverage Report
The `npm run test:coverage` command generates a detailed report showing:
- Percentage of lines covered
- Percentage of functions tested
- Percentage of branches covered
- Untested files

## 🔧 Test Configuration

### Test Environment Variables
```env
CLOUDFLARE_ACCOUNT_ID=test_account_id
CLOUDFLARE_API_TOKEN=test_token
```

### Test Directory Structure
Tests create temporary directories during execution:
- `tests/temp-unit/` - For unit tests
- `tests/temp-cli/` - For CLI tests
- `tests/temp-integration/` - For integration tests
- `tests/temp-core/` - For core tests
- `tests/temp-perf/` - For performance tests

These directories are automatically cleaned after each execution.

## 🐛 Test Debugging

### Run a specific test
```bash
node --test tests/unit/client.test.js
```

### Run with detailed output
```bash
node --test --verbose tests/unit/client.test.js
```

### Debug with Node.js
```bash
node --test --inspect tests/unit/client.test.js
```

## � Adding New Tests

### To create a new unit test:
1. Create a `.test.js` file in `tests/unit/`
2. Use the standard structure:
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('Your Feature', () => {
  it('should do something', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### For tests requiring temporary files:
```javascript
before(async () => {
  await mkdir(testDir, { recursive: true });
  // Setup files
});

after(async () => {
  await rm(testDir, { recursive: true, force: true });
});
```

## 🚀 CI/CD Integration

Tests are automatically executed in GitHub Actions when:
- There's a push to the `main` branch
- There are changes in the `library-tool/` folder

The workflow executes:
1. Unit tests
2. Integration tests  
3. CLI tests
4. Performance tests
5. Coverage report

Only if all tests pass, the library is published to NPM.

## 📞 Support

If you encounter issues with the tests:

1. **Check dependencies**: `npm install`
2. **Run individual tests** to isolate problems
3. **Check logs** for specific error messages
4. **Verify environment variables** if needed

## 📚 Learning Resources

- **[Testing Guide for Beginners](./TESTING_GUIDE.md)** - Complete guide to understanding testing
- **[Main Tradux Documentation](../README.md)** - General library documentation

## 🤝 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests still pass
3. Add tests for new functionality
4. Update this documentation if needed

For more information about testing philosophy and best practices, see our [Testing Guide](./TESTING_GUIDE.md).

