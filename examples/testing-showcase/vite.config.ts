import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/testing-showcase/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3011,
  },
  build: {
    target: 'esnext',
  },
});
