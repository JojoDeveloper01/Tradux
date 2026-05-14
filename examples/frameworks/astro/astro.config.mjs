// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: process.env.TRADUX_EXAMPLES_SITE ?? "http://localhost:4173",
  base: process.env.TRADUX_EXAMPLES_BASE ?? "/",
  integrations: [sitemap(), react(), vue(), svelte()],
});
