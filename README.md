# Cliffy

A WASM-first reactive framework with classical FRP semantics, powered by geometric algebra.

Build collaborative applications at scale where **distributed systems problems become geometric algebra problems** with closed-form solutions and guaranteed convergence.

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

## Features

- **Classical FRP** - `Behavior<T>` (continuous) and `Event<T>` (discrete) following Conal Elliott's original semantics
- **Algebraic TSX** - Declarative UI with `html` tagged templates that auto-update when Behaviors change
- **WASM-First** - Core logic in Rust, runs anywhere via WebAssembly
- **Geometric Foundation** - State transformations as geometric operations (hidden from users)
- **Multi-Language** - TypeScript, JavaScript, and PureScript examples

## Algebraic TSX

Cliffy uses **Algebraic TSX** for rendering - a declarative approach where Behaviors automatically update the DOM:

### TypeScript (html tagged template)

```typescript
import init, { behavior, combine } from '@cliffy-ga/core';
import { html, mount } from '@cliffy-ga/core/html';

async function main() {
  await init();

  // Create reactive state
  const count = behavior(0);
  const doubled = count.map(n => n * 2);

  // Event handlers
  const increment = () => count.update(n => n + 1);
  const decrement = () => count.update(n => n - 1);

  // Behaviors in templates automatically update the DOM
  const app = html`
    <div class="counter">
      <h1>Count: ${count}</h1>
      <button onclick=${decrement}>-</button>
      <button onclick=${increment}>+</button>
      <p>Doubled: ${doubled}</p>
    </div>
  `;

  mount(app, '#app');
}

main();
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

### Vanilla JavaScript

```javascript
import init, { behavior, event } from '@cliffy-ga/core';

await init();

const count = behavior(0);
count.subscribe(n => {
  document.getElementById('count').textContent = n;
});

document.getElementById('increment').onclick = () => {
  count.update(n => n + 1);
};
```

## Core Concepts

### Behaviors (Time-Varying Values)

A `Behavior<T>` represents a value that changes over time - like a spreadsheet cell that updates automatically.

```typescript
const count = behavior(0);
count.sample();              // Get current value: 0
count.set(10);               // Set directly
count.update(n => n + 1);    // Transform: 11

// Derived behaviors update automatically
const doubled = count.map(n => n * 2);  // 22

// Combine multiple behaviors
const sum = combine(a, b, (x, y) => x + y);
```

### Events (Discrete Occurrences)

An `Event<T>` represents discrete occurrences over time - like button clicks or network responses.

```typescript
const clicks = event<MouseEvent>();

clicks.subscribe(e => console.log('Clicked at', e.clientX));
clicks.emit(mouseEvent);

// Transform events
const xPositions = clicks.map(e => e.clientX);
const leftClicks = clicks.filter(e => e.button === 0);

// Accumulate into Behavior
const clickCount = clicks.fold(0, (acc, _) => acc + 1);
```

### Combinators

```typescript
// Combine multiple behaviors
const width = behavior(10);
const height = behavior(5);
const area = combine(width, height, (w, h) => w * h);
const volume = combine3(w, h, d, (w, h, d) => w * h * d);

// Conditional rendering
const show = behavior(true);
const message = when(show, () => 'Visible!');

// if/else for behaviors
const text = ifElse(isLoading, () => "Loading...", () => "Ready");
```

## Examples

| Example | Description | Run |
|---------|-------------|-----|
| [tsx-counter](examples/tsx-counter) | Basic counter with derived state | `cd examples/tsx-counter && npm run dev` |
| [tsx-todo](examples/tsx-todo) | Todo list with filtering | `cd examples/tsx-todo && npm run dev` |
| [tsx-forms](examples/tsx-forms) | Form validation patterns | `cd examples/tsx-forms && npm run dev` |
| [purescript-counter](examples/purescript-counter) | Counter in PureScript | `cd examples/purescript-counter && npm run dev` |
| [purescript-todo](examples/purescript-todo) | Todo list in PureScript | `cd examples/purescript-todo && npm run dev` |
| [whiteboard](examples/whiteboard) | Collaborative drawing canvas | `cd examples/whiteboard && npm run dev` |

## Project Structure

```
cliffy/
├── cliffy-core/           # Rust FRP implementation
│   └── src/
│       ├── behavior.rs    # Behavior<T> - continuous signals
│       ├── event.rs       # Event<T> - discrete occurrences
│       ├── combinators.rs # when, ifElse, combine
│       ├── component.rs   # Component model
│       ├── dataflow.rs    # Dataflow graph IR
│       └── geometric.rs   # GA conversion (internal)
├── cliffy-wasm/           # WASM bindings
│   ├── src/lib.rs         # WASM exports
│   └── pkg/
│       ├── html.ts        # Algebraic TSX implementation
│       └── cliffy_wasm.js
├── cliffy-purescript/     # PureScript bindings
│   └── src/
│       ├── Cliffy.purs    # FRP primitives (Behavior, Event)
│       └── Cliffy/
│           ├── Html.purs  # Type-safe Html DSL
│           └── Foreign.js # FFI bridge
├── cliffy-protocols/      # CRDT and sync protocols
├── cliffy-gpu/            # WebGPU/SIMD acceleration
├── cliffy-test/           # Algebraic testing framework
├── tools/
│   └── create-cliffy/     # Project scaffolding CLI
├── examples/              # Example applications
│   ├── tsx-counter/       # TypeScript counter
│   ├── tsx-todo/          # TypeScript todo list
│   ├── tsx-forms/         # Form validation
│   ├── purescript-counter/
│   ├── purescript-todo/
│   └── whiteboard/        # Collaborative whiteboard
└── docs/                  # Documentation
    ├── getting-started.md
    ├── api-reference.md
    └── migration-guide.md
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
# Run all tests
cargo test --workspace  # 179 tests

# Run specific crate tests
cargo test -p cliffy-core
cargo test -p cliffy-protocols
```

### Development Server

```bash
# Run an example
cd examples/tsx-counter
npm install
npm run dev
```

## Why Geometric Algebra?

Cliffy uses [Clifford Algebra](https://en.wikipedia.org/wiki/Clifford_algebra) (GA3 = Cl(3,0)) internally to represent state. This provides:

- **Unified representation**: Scalars, vectors, and higher-grade elements in one structure
- **Natural transformations**: Rotations, translations, scaling as algebraic operations
- **Conflict resolution**: Geometric mean provides coordination-free CRDT merging
- **Mathematical elegance**: Clean composition of transformations

**You never need to know this.** The geometric algebra is purely an implementation detail. The public API exposes familiar FRP primitives.

## Documentation

- [Getting Started](docs/getting-started.md) - Installation and first app
- [API Reference](docs/api-reference.md) - Complete API documentation
- [Migration Guide](docs/migration-guide.md) - Coming from React/Vue
- [PureScript FFI Patterns](docs/purescript-ffi-patterns.md) - PureScript integration

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan.

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | Done | Algebraic Testing Framework |
| Phase 1 | Done | Geometric State Foundation |
| Phase 2 | Done | Distributed State (CRDT) |
| Phase 4 | Done | Algebraic TSX Components |
| Phase 5 | Done | Edge Computing (WebGPU) |
| Phase 6 | Active | Production Readiness |
| Phase 7 | Active | Documentation |

## License

MIT
