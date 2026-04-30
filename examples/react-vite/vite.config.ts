import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/react-vite/',
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [react()],
})
