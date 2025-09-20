# Technology Stack

## Core Technologies

- **JavaScript/Node.js** - ES6 modules with modern syntax
- **Cloudflare Workers** - Serverless runtime for AI translation API
- **TypeScript** - Used in worker-proxy for type safety

## Build Systems & Tools

### Library Tool (tradux)
- **Package Manager**: npm/yarn/pnpm/bun support
- **Module System**: ES6 modules (`"type": "module"`)
- **Testing**: Node.js built-in test runner with custom test suite
- **CLI Framework**: Commander.js for command-line interface

### Worker Proxy
- **Runtime**: Cloudflare Workers
- **Build Tool**: Wrangler CLI
- **Testing**: Vitest with Cloudflare Workers pool
- **TypeScript**: Configured for ES2021 target

## Key Dependencies

### Library Dependencies
- `chalk` - Terminal styling
- `commander` - CLI framework
- `dotenv` - Environment variable management
- `fs-extra` - Enhanced file system operations
- `prompts` - Interactive CLI prompts

### Development Tools
- `c8` - Code coverage
- `wrangler` - Cloudflare Workers deployment
- `vitest` - Testing framework for Workers

## Common Commands

### Library Development
```bash
# Install and initialize
npm install tradux && npx tradux init

# Run tests
npm test                    # Full test suite with coverage
npm run test:fast          # Tests without coverage
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:quick         # Unit + integration tests

# CLI usage
npx tradux -t es,pt,fr     # Translate to languages
npx tradux -u              # Update existing translations
```

### Worker Development
```bash
# Development
npm run dev                # Start local development server
npm start                  # Alias for dev

# Deployment
npm run deploy             # Deploy to Cloudflare Workers

# Testing
npm test                   # Run Vitest tests

# Type generation
npm run cf-typegen         # Generate Cloudflare types
```

## Configuration Files

- `tradux.config.json` - Translation configuration (i18nPath, defaultLanguage, availableLanguages)
- `wrangler.jsonc` - Cloudflare Workers configuration
- `tsconfig.json` - TypeScript configuration for Workers
- `.env` - Cloudflare API credentials (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN)