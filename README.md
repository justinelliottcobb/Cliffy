# Cliffy

A WASM-first reactive framework with classical FRP semantics, powered by geometric algebra.

## Quick Start

```bash
# Create a new Cliffy project
npx create-cliffy my-app

# Or specify a template
npx create-cliffy my-app --template typescript-vite  # TypeScript + Vite (default)
npx create-cliffy my-app --template bun              # Bun runtime
npx create-cliffy my-app --template purescript       # PureScript + type-safe DSL

cd my-app
npm install
npm run dev
```

## Algebraic TSX

Cliffy uses **Algebraic TSX** for rendering - a declarative approach where Behaviors automatically update the DOM:

### TypeScript (html tagged template)

```typescript
import { behavior } from 'cliffy-wasm';
import { html, mount } from 'cliffy-wasm/html';

// Create reactive state
const count = behavior(0);

// Behaviors in templates automatically update the DOM
const app = html`
  <div class="counter">
    <h1>Count: ${count}</h1>
    <button onclick=${() => count.update(n => n + 1)}>+</button>
    <button onclick=${() => count.update(n => n - 1)}>-</button>
  </div>
`;

mount(app, '#app');
```

### PureScript (type-safe Html DSL)

```purescript
import Cliffy (behavior, update)
import Cliffy.Html (div, h1_, button, text, behaviorText, mount)
import Cliffy.Html.Attributes (className)
import Cliffy.Html.Events (onClick)

counter :: Effect Html
counter = do
  count <- behavior 0

  pure $ div [ className "counter" ]
    [ h1_ [ text "Count: ", behaviorText count ]
    , button [ onClick \_ -> update (_ + 1) count ] [ text "+" ]
    , button [ onClick \_ -> update (_ - 1) count ] [ text "-" ]
    ]
```

## Architecture

```
cliffy-wasm (WASM bindings + Algebraic TSX)
    ↓
cliffy-core (Rust FRP + GA)
    ↓
amari-core (Geometric Algebra)
```

The geometric algebra is an implementation detail. The public API exposes familiar FRP primitives.

## Core Concepts

### Behaviors (Time-Varying Values)

A `Behavior<T>` represents a value that changes over time - like a spreadsheet cell that updates automatically.

```typescript
// TypeScript
const count = behavior(0);
count.sample();              // Get current value: 0
count.update(n => n + 1);    // Transform the value
count.subscribe(n => console.log(n));  // React to changes

// Derived behaviors update automatically
const doubled = count.map(n => n * 2);
```

```rust
// Rust
let count = behavior(0);
assert_eq!(count.sample(), 0);
count.update(|n| n + 1);
let doubled = count.map(|n| n * 2);
```

### Events (Discrete Occurrences)

An `Event<T>` represents discrete occurrences over time - like button clicks or network responses.

```typescript
// TypeScript
const clicks = event<MouseEvent>();
clicks.subscribe(e => console.log('Clicked at', e.clientX));
clicks.emit(mouseEvent);

// Fold events into a behavior
const clickCount = clicks.fold(0, (count, _) => count + 1);
```

### Combinators

```typescript
// Combine multiple behaviors
const width = behavior(10);
const height = behavior(5);
const area = combine(width, height, (w, h) => w * h);

// Conditional rendering
const show = behavior(true);
const message = when(show, () => 'Visible!');
```

## Building from Source

### Prerequisites

- Rust (stable)
- wasm-pack (`cargo install wasm-pack`)
- Node.js 18+

### Build

```bash
npm run build          # Build WASM + post-process
npm run build:release  # Optimized release build
npm run dev            # Watch mode for development
```

### Test

```bash
cargo test --workspace  # 179 tests
npm test               # Run all tests
```

## Project Structure

```
cliffy/
├── cliffy-core/           # Rust FRP implementation
│   └── src/
│       ├── behavior.rs    # Behavior<T>
│       ├── event.rs       # Event<T>
│       ├── combinators.rs # when, if_else, combine
│       └── geometric.rs   # GA conversion traits
├── cliffy-wasm/           # WASM bindings + html.ts
│   ├── src/
│   │   ├── lib.rs         # WASM exports
│   │   └── html.ts        # Algebraic TSX tagged template
│   └── pkg/               # Built package (after npm run build)
├── cliffy-purescript/     # PureScript bindings
│   └── src/
│       ├── Cliffy.purs    # FRP primitives (Behavior, Event)
│       └── Cliffy/
│           ├── Html.purs  # Type-safe Html DSL
│           └── Foreign.js # FFI bridge
├── cliffy-protocols/      # Distributed state (CRDT, sync)
├── cliffy-test/           # Geometric testing framework
├── tools/
│   └── create-cliffy/     # Project scaffolding CLI
└── examples/
    └── whiteboard/        # Collaborative drawing demo
```

## Why Geometric Algebra?

Cliffy uses [Clifford Algebra](https://en.wikipedia.org/wiki/Clifford_algebra) (GA3 = Cl(3,0)) internally to represent state. This provides:

- **Unified representation**: Scalars, vectors, and higher-grade elements in one structure
- **Natural transformations**: Rotations, translations, scaling as algebraic operations
- **Distributed convergence**: Geometric mean for conflict-free merging

However, **you never need to know this**. The GA is purely an implementation detail - you work with familiar `Behavior` and `Event` types.

## Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [ROADMAP](./ROADMAP.md) - Development phases
- [CLAUDE.md](./CLAUDE.md) - Architecture and standards

## License

MIT
