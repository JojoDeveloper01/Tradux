import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.TRADUX_EXAMPLES_BASE ?? '/',
})
