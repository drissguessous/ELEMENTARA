import { defineConfig } from 'vite';

// Relative base so the same build works on GitHub Pages and inside Capacitor (Android/iOS).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true, port: 5173 },
});
