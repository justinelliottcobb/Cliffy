import { defineConfig } from 'vite';
import { resolve } from 'path';

const base = process.env.NETLIFY ? '/design-tool/' : '/';

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@cliffy-ga/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
    },
  },
  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },
  server: {
    port: 3005,
  },
  build: {
    target: 'esnext',
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
});
