import { defineConfig } from 'vite';

export default defineConfig({
  // Base URL for GitHub Pages deployment
  base: '/sound-visualizer/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'esnext'
  }
});
