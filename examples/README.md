# Tradux examples

This folder has two jobs:

- `showcase/` runs the aggregated examples site used by Railway.
- `frameworks/` contains standalone examples that users can clone and run independently.

## Quick start: aggregated showcase

Run these from `examples/`:

```bash
pnpm install:showcase
pnpm build
pnpm start
```

Then open:

```text
http://localhost:4173/
```

Useful routes:

| Route | Example |
|-------|---------|
| `/react-vite/` | React + Vite |
| `/vue-vite/` | Vue + Vite |
| `/svelte-vite/` | Svelte + Vite |
| `/vanilla-vite/` | Vanilla + Vite |
| `/astro/` | Astro |

## Development mode

From `examples/`:

```bash
pnpm install:showcase
pnpm dev
```

This starts the showcase proxy and the individual framework dev servers.

## Standalone framework checks

Each framework can be tested on its own:

```bash
cd examples/frameworks/react-vite
pnpm install
pnpm build
pnpm preview
```

Repeat the same flow for:

- `examples/frameworks/vue-vite`
- `examples/frameworks/svelte-vite`
- `examples/frameworks/vanilla-vite`
- `examples/frameworks/astro`

For Astro, `pnpm start` also works after `pnpm build` because it serves `dist/server/entry.mjs`.

## Railway deploy

Railway should use `examples/` as the root directory.

The deploy config lives in:

- `railway.json`
- `nixpacks.toml`

The build command enters `showcase/`, installs dependencies, builds every framework, and starts the aggregated server.

## If something fails

Use this order:

1. `pnpm install:showcase`
2. `pnpm build`
3. `pnpm start`

If a standalone framework behaves differently, delete its local `dist/` and rebuild it from that framework folder. The Vite examples use different base paths when built through the aggregate showcase versus standalone mode.
