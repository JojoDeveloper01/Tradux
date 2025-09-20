// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import angular from '@analogjs/astro-angular';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [vue(), react(), svelte(),
  angular({
    vite: {
      inlineStylesExtension: 'scss|sass|less',
    },
  }),
  ],

  output: 'server',
  server: {
    host: '0.0.0.0'
  },
  adapter: node({
    mode: 'standalone',
  }),
});