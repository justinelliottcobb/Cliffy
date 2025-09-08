import { defineConfig } from 'vite';
import algebraicTSX from 'vite-plugin-algebraic-tsx';

export default defineConfig({
  plugins: [
    algebraicTSX({
      debug: true,
      jsxFactory: 'jsx',
      jsxFragment: 'Fragment',
      jsxImportSource: '../../../cliffy-typescript/src/index'
    })
  ],
  server: {
    port: 3000
  },
  build: {
    target: 'esnext'
  }
});