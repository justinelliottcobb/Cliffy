import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Build allowedHosts from environment
  const allowedHosts: string[] = [];
  if (env.VITE_ALLOWED_HOST) {
    allowedHosts.push(env.VITE_ALLOWED_HOST);
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: false,
      allowedHosts,
      // Watch for WASM changes in the pkg directory
      watch: {
        // Watch the cliffy-typescript pkg directory for WASM rebuilds
        ignored: ['!**/node_modules/@cliffy/core/pkg/**'],
      },
    },
    build: {
      target: 'esnext',
    },
    optimizeDeps: {
      // Don't pre-bundle @cliffy/core - we want fresh WASM on reload
      exclude: ['@cliffy/core'],
    },
    resolve: {
      alias: {
        // Ensure we're using the local cliffy package
        '@cliffy/core': resolve(__dirname, '../../cliffy-typescript'),
      },
    },
  };
});
