import { resolve } from 'path';
import { defineConfig } from 'vite';

const isNetlify = process.env.NETLIFY === 'true';

export default defineConfig({
  base: '/',

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

  // Only use local WASM pkg for local dev, use npm package on Netlify
  resolve: isNetlify ? {} : {
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
