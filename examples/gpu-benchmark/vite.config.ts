import { resolve } from 'path';
import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/gpu-benchmark/' : '/';

export default defineConfig({
  base,
  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },
  resolve: {
    alias: {
      '@cliffy-ga/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
    },
  },
  server: {
    port: 3006,
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
