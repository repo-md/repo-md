import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/lib/index.js',
      name: 'RepoMD',
      fileName: 'repomd'
    },
    rollupOptions: {
      external: ['quick-lru'],
      output: {
        exports: 'named',
        globals: {
          'quick-lru': 'QuickLRU'
        }
      }
    }
  }
});