import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },
  build: {
    target: 'esnext',
  },
  server: {
    fs: {
      // Allow serving files from the monorepo root
      allow: [
        resolve(__dirname, '../..'),
      ],
    },
  },
});
