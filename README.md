# Cliffy

A WASM-first reactive framework with classical FRP semantics, powered by geometric algebra.

## Status

Cliffy is in active development. The core Rust implementation is functional, with WASM bindings available via wasm-bindgen.

## Architecture

```
cliffy-wasm (WASM bindings)
    ↓
cliffy-core (Rust FRP + GA)
    ↓
amari-core (Geometric Algebra)
```

The geometric algebra is an implementation detail. The public API exposes familiar FRP primitives.

## Core Concepts

### Behaviors (Time-Varying Values)

```rust
use cliffy_core::{behavior, Behavior};

// Create reactive state
let count = behavior(0);
assert_eq!(count.sample(), 0);

// Update via transformation
count.update(|n| n + 1);
assert_eq!(count.sample(), 1);

// Derive computed values
let doubled = count.map(|n| n * 2);
assert_eq!(doubled.sample(), 2);
```

### Events (Discrete Occurrences)

```rust
use cliffy_core::{event, Event};

let clicks = event::<()>();

clicks.subscribe(|_| {
    println!("Clicked!");
});

clicks.emit(());
```

### Combinators

```rust
use cliffy_core::{behavior, when, combine};

let show = behavior(true);
let message = when(&show, || "Visible!");

let width = behavior(10);
let height = behavior(5);
let area = combine(&width, &height, |w, h| w * h);
```

## Building

### Prerequisites

- Rust (stable)
- wasm-pack (`cargo install wasm-pack`)

### Build WASM

```bash
# Development build
wasm-pack build cliffy-wasm --target web --out-dir pkg

# Release build (optimized)
wasm-pack build cliffy-wasm --target web --release --out-dir pkg
```

### Run Tests

```bash
cargo test --workspace
```

## Using from JavaScript

```javascript
import init, { behavior, when, combine } from './cliffy-wasm/pkg/cliffy_wasm.js';

await init();

const count = behavior(0);
count.subscribe(n => console.log('Count:', n));
count.update(n => n + 1);
```

## Project Structure

```
cliffy/
├── cliffy-core/           # Rust FRP implementation
│   └── src/
│       ├── behavior.rs    # Behavior<T>
│       ├── event.rs       # Event<T>
│       ├── combinators.rs # when, ifElse, combine
│       └── geometric.rs   # GA conversion traits
├── cliffy-wasm/           # WASM bindings (wasm-bindgen)
├── examples/              # Examples (currently archived)
└── archive/               # Previous implementations
```

## Why Geometric Algebra?

Cliffy uses [Clifford Algebra](https://en.wikipedia.org/wiki/Clifford_algebra) (GA3 = Cl(3,0)) internally to represent state. This provides:

- **Unified representation**: Scalars, vectors, and higher-grade elements in one structure
- **Natural transformations**: Rotations, translations, scaling as algebraic operations
- **Mathematical elegance**: Clean composition of transformations

However, **you never need to know this**. The GA is purely an implementation detail.

## License

MIT
