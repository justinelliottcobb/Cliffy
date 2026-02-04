import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@cliffy-ga/core']
  },
  server: {
    port: 3004
  }
});
