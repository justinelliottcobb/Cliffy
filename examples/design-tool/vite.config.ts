import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/design-tool/' : '/';

export default defineConfig({
  base,
  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },
  server: {
    port: 3005,
  },
  build: {
    target: 'esnext',
  },
});
