import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const allowedHosts = env.VITE_ALLOWED_HOST ? [env.VITE_ALLOWED_HOST] : [];

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts,
    },

    build: {
      target: 'esnext',
      outDir: 'dist',
    },

    resolve: {
      alias: {
        '@cliffy-ga/core': resolve(__dirname, '../../cliffy-wasm/pkg'),
        '@cliffy/shared': resolve(__dirname, '../shared/src'),
      },
    },

    esbuild: {
      supported: {
        'top-level-await': true,
      },
    },
  };
});
