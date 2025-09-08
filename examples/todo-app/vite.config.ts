import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@cliffy/typescript': path.resolve(__dirname, '../../cliffy-typescript/src')
    }
  },
  esbuild: {
    jsx: 'preserve',
    jsxFactory: 'jsx',
    jsxFragment: 'Fragment'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});