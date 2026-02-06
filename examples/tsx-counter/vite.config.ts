import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/tsx-counter/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3001,
  },
  build: {
    target: 'esnext',
  },
});
