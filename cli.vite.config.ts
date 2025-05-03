import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'npm/cli',
    lib: {
      entry: resolve(__dirname, 'src/cli/index.ts'),
      formats: ['es'],
      fileName: () => 'repo-md-cli.js'
    },
    rollupOptions: {
      external: [
        'fs',
        'path',
        'child_process',
        'readline',
        'commander'
      ]
    }
  }
});