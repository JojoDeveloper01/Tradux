// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import vue from '@astrojs/vue';

import svelte from '@astrojs/svelte';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  server: {
    host: '0.0.0.0'
  },
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [react(), vue(), svelte()]
});