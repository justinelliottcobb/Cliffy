import { createExampleConfig } from '../vite.config.shared';

export default createExampleConfig(__dirname, {
  port: 3001,
  aliases: {
    // Add html.ts alias for Algebraic TSX
    '@cliffy/html': new URL('../../cliffy-wasm/pkg/html.ts', import.meta.url).pathname,
  },
});
