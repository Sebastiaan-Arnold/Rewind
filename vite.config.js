import { defineConfig } from 'vite';

export default defineConfig({
  // './' makes every file path relative, so the built game works from any
  // folder - including GitHub Pages, which serves it from /<repo-name>/.
  base: './',
  build: {
    // Phaser is one big library; tell Vite that's expected.
    chunkSizeWarningLimit: 2000,
  },
});
