import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/repo-client/', // Base path for GitHub Pages
  build: {
    outDir: '../../demo'
  },
  server: {
    port: 5174
  }
})