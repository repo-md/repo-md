import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/lib/index.js',
      name: 'RepoMD',
      fileName: (format, entryName) => {
        // For UMD build, create both minified and non-minified versions
        if (format === 'umd') {
          return `${entryName}.${format}${entryName.includes('.min') ? '' : '.cjs'}`;
        }
        // For ES build, keep as is
        return `${entryName}.js`;
      },
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['quick-lru'],
      output: {
        exports: 'named',
        globals: {
          'quick-lru': 'QuickLRU'
        },
        // Add minified version
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name.includes('min') 
            ? '[name].[format].js' 
            : '[name].[format]';
        }
      }
    },
    // Enable minification for all builds
    minify: true,
  }
});