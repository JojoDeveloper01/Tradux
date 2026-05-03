// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: process.env.TRADUX_EXAMPLES_SITE ?? "http://localhost:4173",
  base: process.env.TRADUX_EXAMPLES_BASE ?? "/",
  integrations: [sitemap(), react(), vue(), svelte()],

  output: "server",
  server: {
    host: "0.0.0.0",
  },
  adapter: node({
    mode: "standalone",
  }),
});
