import { defineConfig } from 'vite';
import { resolve } from 'path';

const base = process.env.NETLIFY ? '/tsx-counter/' : '/';

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@cliffy-ga/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
    },
  },
  server: {
    port: 3001,
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
