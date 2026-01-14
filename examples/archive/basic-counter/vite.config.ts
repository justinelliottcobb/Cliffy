import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/main.ts',
      formats: ['es']
    }
  }
});