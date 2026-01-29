import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
  },

  resolve: {
    alias: {
      '@cliffy/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
      '@cliffy/shared': resolve(__dirname, '../shared/src'),
    },
  },

  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
});
