# Cliffy Examples

## Status

All examples are currently archived pending the completion of the WASM-first architecture rebuild.

The core framework (cliffy-core, cliffy-wasm) is functional, but the TypeScript integration layer has been archived for reconsideration.

## Archived Examples

Previous examples have been moved to `archive/`. See `archive/MIGRATION.md` for details.

| Example | Description | Status |
|---------|-------------|--------|
| counter-101 | Foundation rebuild reference | Archived (depends on cliffy-typescript) |
| basic-counter | Simple counter | Archived |
| form-validation | Multi-field validation | Archived |
| todo-app | TodoMVC implementation | Archived |
| geometric-animations | Animation showcase | Archived |
| algebraic-tsx-test | Vite plugin testing | Archived |
| dashboard | Dashboard UI | Archived |
| collaborative-editor | Real-time CRDT editor | Archived |
| geometric-visualization | 3D Three.js demos | Archived |

## Using the WASM Directly

The cliffy-wasm package can be used directly with wasm-bindgen generated bindings:

```bash
# Build WASM
wasm-pack build cliffy-wasm --target web --out-dir pkg

# The pkg/ directory contains:
# - cliffy_wasm.js      (JS bindings)
# - cliffy_wasm.d.ts    (TypeScript types)
# - cliffy_wasm_bg.wasm (WASM binary)
```

```javascript
import init, { behavior, when, combine } from './pkg/cliffy_wasm.js';

await init();

const count = behavior(0);
count.subscribe(n => console.log('Count:', n));
count.update(n => n + 1);
```

## Future Direction

New examples will be created once the architecture stabilizes. The current focus is on:

1. Completing the Rust FRP core (cliffy-core)
2. Stabilizing WASM bindings (cliffy-wasm)
3. Determining the best approach for JavaScript/TypeScript integration
