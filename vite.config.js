import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build runs from any subpath (e.g. GitHub Pages).
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
