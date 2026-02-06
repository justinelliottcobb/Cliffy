import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/p2p-sync/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3010,
  },
  build: {
    target: 'esnext',
  },
});
