// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",
  integrations: [sitemap()],

  output: "server",
  server: {
    host: "0.0.0.0",
  },
  adapter: node({
    mode: "standalone",
  }),
});
