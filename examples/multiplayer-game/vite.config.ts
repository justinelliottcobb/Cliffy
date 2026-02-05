import { defineConfig } from 'vite';

const base = process.env.NETLIFY ? '/multiplayer-game/' : '/';

export default defineConfig({
  base,
  server: {
    port: 3008,
  },
  build: {
    target: 'esnext',
  },
});
