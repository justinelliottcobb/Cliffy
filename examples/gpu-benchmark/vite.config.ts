import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/gpu-benchmark/' : '/';

export default defineConfig({
  base,
  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },
  server: {
    port: 3006,
  },
  build: {
    target: 'esnext',
  },
});
