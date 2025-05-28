import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Serve from root path
  build: {
    outDir: '../../demo'
  },
  server: {
    port: 5174
  }
})