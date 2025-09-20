// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';
import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import angular from '@analogjs/astro-angular';

// https://astro.build/config
export default defineConfig({
  integrations: [vue(), react(), svelte(),
  angular({
    vite: {
      inlineStylesExtension: 'scss|sass|less',
    },
  }),
  ]
});