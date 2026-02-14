import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },
  build: {
    target: 'esnext',
  },
});
