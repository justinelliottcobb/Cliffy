import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/geometric-transforms/' : '/';

export default defineConfig({
  base,
  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },
  server: {
    port: 3004,
  },
  build: {
    target: 'esnext',
  },
});
