import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/lib/index.js',
      name: 'RepoMD',
      fileName: 'repo-md'
    },
    rollupOptions: {
      external: ['quick-lru'],
      output: {
        exports: 'named',
        globals: {
          'quick-lru': 'QuickLRU'
        }
      }
    },
    // Disable minification for standard builds - the minified version will be created separately
    minify: false
  }
});