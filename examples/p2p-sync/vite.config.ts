import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Check if local WASM build exists
const localWasmPkg = resolve(__dirname, '../../cliffy-wasm/pkg/cliffy_wasm.js');
const hasLocalWasm = existsSync(localWasmPkg);

// Use npm package on Netlify, CI, or if local WASM build doesn't exist
const useNpmPackage = !!process.env.NETLIFY || !!process.env.CI || !hasLocalWasm;

// Only set base path for Netlify builds, not for CI dev servers (E2E tests)
const base = process.env.NETLIFY ? '/p2p-sync/' : '/';

export default defineConfig({
  base,
  resolve: useNpmPackage ? {} : {
    alias: {
      '@cliffy-ga/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
    },
  },
  server: {
    port: 3010,
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
