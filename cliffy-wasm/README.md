# cliffy-wasm

WebAssembly bindings for Cliffy reactive framework.

## Overview

cliffy-wasm provides WASM bindings for using Cliffy in web applications:

- **Behavior/Event exports** - FRP primitives accessible from JavaScript
- **html`` tagged template** - Algebraic TSX for reactive DOM
- **Protocol bindings** - Distributed state for collaborative apps
- **Test bindings** - Algebraic testing from JavaScript

## Installation

```bash
npm install @cliffy-ga/core
```

## Usage

```typescript
import { behavior } from '@cliffy-ga/core';
import { html, mount } from '@cliffy-ga/core/html';

const count = behavior(0);

const app = html`
  <div class="counter">
    <span>Count: ${count}</span>
    <button onclick=${() => count.update(n => n + 1)}>+</button>
  </div>
`;

mount(app, '#app');
```

## Features

- Classical FRP (Behavior, Event, combinators)
- Automatic DOM updates via subscriptions (no virtual DOM)
- Distributed state primitives (CRDT, sync)
- Algebraic testing (testImpossible, testRare)

## Related Packages

- [@cliffy-ga/tsukoshi](https://www.npmjs.com/package/@cliffy-ga/tsukoshi) - Semantic layer for forms

## License

MIT
