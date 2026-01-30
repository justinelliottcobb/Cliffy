import { createExampleConfig } from '../vite.config.shared';

export default createExampleConfig(__dirname, {
  port: 3002,
  aliases: {
    '@cliffy-ga/core/html': new URL('../../cliffy-wasm/pkg/html.ts', import.meta.url).pathname,
  },
});
