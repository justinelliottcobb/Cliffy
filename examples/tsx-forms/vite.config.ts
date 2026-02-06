import { defineConfig } from 'vite';
import { resolve } from 'path';

const isNetlify = !!process.env.NETLIFY;
const base = isNetlify ? '/tsx-forms/' : '/';

export default defineConfig({
  base,
  // Only use local WASM pkg for local dev, use npm package on Netlify
  resolve: isNetlify ? {} : {
    alias: {
      '@cliffy-ga/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
    },
  },
  server: {
    port: 3003,
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
