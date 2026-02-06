import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/crdt-playground/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3007,
  },
  build: {
    target: 'esnext',
  },
});
