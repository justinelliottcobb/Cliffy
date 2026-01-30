import { createExampleConfig } from '../vite.config.shared';

export default createExampleConfig(__dirname, {
  port: 3003,
  aliases: {
    '@cliffy/html': new URL('../../cliffy-wasm/pkg/html.ts', import.meta.url).pathname,
  },
});
