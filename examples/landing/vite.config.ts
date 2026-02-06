import { resolve } from 'path';
import { defineConfig } from 'vite';

const isNetlify = process.env.NETLIFY === 'true';

export default defineConfig({
  base: isNetlify ? '/' : '/',

  server: {
    port: 3100,
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
  },

  optimizeDeps: {
    exclude: ['@cliffy-ga/core'],
  },

  resolve: {
    alias: {
      '@cliffy-ga/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
    },
  },

  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
});
