import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.TRADUX_EXAMPLES_BASE ?? '/',
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [react()],
})
