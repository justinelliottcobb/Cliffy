import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3010,
  },
  build: {
    target: 'esnext',
  },
});
