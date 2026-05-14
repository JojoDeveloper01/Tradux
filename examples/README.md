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

## Cloudflare Pages deploy

The public showcase is deployed as a static Cloudflare Pages site:

- https://ex-tradux.100aiprojects.dev/
- https://ex-tradux.pages.dev/

Pull requests that touch `examples/**` run the same static showcase build used for deploy:

```bash
pnpm --dir examples install:showcase
pnpm --dir examples/showcase build:static
```

Pushes to `main` deploy `examples/showcase/dist` through `.github/workflows/deploy-ex-tradux.yml`.

The showcase intentionally uses the published `tradux` package version declared in `examples/showcase/package.json`. Changes to `library-tool/src/**` do not automatically redeploy the showcase until a new package version is published and the examples dependency is updated.

## Legacy Railway deploy

Railway can still use `examples/` as the root directory if server/proxy hosting is needed.

The deploy config lives in:

- `railway.json`
- `nixpacks.toml`

The build command enters `showcase/`, installs dependencies, builds every framework, and starts the aggregated server.

## Static export notes

`pnpm --dir examples/showcase build:static` builds each framework app, then exports the aggregate showcase to plain files for Cloudflare Pages.

The Astro example is served statically under `/astro/`. Its root compatibility routes use HTML meta-refresh pages to forward to localized routes like `/astro/en/`; that is intentional for static hosting and replaces server-side redirect behavior.

## If something fails

Use this order:

1. `pnpm install:showcase`
2. `pnpm build`
3. `pnpm start`

If a standalone framework behaves differently, delete its local `dist/` and rebuild it from that framework folder. The Vite examples use different base paths when built through the aggregate showcase versus standalone mode.
