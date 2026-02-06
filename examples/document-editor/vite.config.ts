import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/document-editor/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3009,
  },
  build: {
    target: 'esnext',
  },
});
