import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/tsx-forms/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3003,
  },
  build: {
    target: 'esnext',
  },
});
