# Project Structure

## Repository Organization

This is a monorepo containing two main components:

```
tradux/
├── library-tool/          # Main npm package (tradux)
├── worker-proxy/          # Cloudflare Workers API
├── readme.md             # Main project documentation
└── .kiro/                # Kiro AI assistant configuration
```

## Library Tool Structure (`library-tool/`)

The main npm package follows standard Node.js conventions:

```
library-tool/
├── src/
│   ├── core/             # Core translation logic
│   ├── utils/            # Utility functions
│   ├── client.js         # Main client API exports
│   └── index.js          # CLI entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── cli/              # CLI command tests
│   ├── performance/      # Performance tests
│   └── run-tests.js      # Test runner
├── public/               # Static assets
├── i18n/                 # Translation files (generated)
├── package.json          # Package configuration
├── tradux.config.json    # Library configuration
├── postinstall.js        # Post-install setup script
└── .env                  # Environment variables (not committed)
```

## Worker Proxy Structure (`worker-proxy/`)

Cloudflare Workers application with minimal structure:

```
worker-proxy/
├── src/
│   └── index.js          # Worker entry point
├── test/                 # Worker tests
├── public/               # Static assets served by worker
├── wrangler.jsonc        # Cloudflare Workers config
├── tsconfig.json         # TypeScript configuration
├── vitest.config.mts     # Test configuration
└── worker-configuration.d.ts  # Type definitions
```

## Key Architectural Patterns

### Module System
- **ES6 modules** throughout (`"type": "module"`)
- Named exports for public APIs
- Dynamic imports for language loading

### Configuration Management
- `tradux.config.json` for library settings
- `.env` files for sensitive credentials
- `wrangler.jsonc` for Workers deployment

### File Naming Conventions
- **kebab-case** for directories and config files
- **camelCase** for JavaScript files and functions
- **lowercase** for translation files (e.g., `en.js`, `es.js`)

### Testing Structure
- Separate directories for different test types
- Custom test runner for comprehensive coverage
- Integration tests for CLI commands
- Performance tests for load times

### Translation File Organization
- Language files in `i18n/` directory
- ES6 module format with named exports
- Nested object structure for organized translations
- Automatic generation and synchronization

## Development Workflow

1. **Library changes** go in `library-tool/`
2. **API changes** go in `worker-proxy/`
3. **Tests** should be added for both unit and integration coverage
4. **Documentation** updates in respective README files
5. **Configuration** changes require updates to relevant config files