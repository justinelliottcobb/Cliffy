# Cliffy

A WASM-first reactive framework with classical FRP semantics, powered by geometric algebra.

## Overview

Cliffy provides a clean, familiar API for building reactive web applications. Under the hood, it uses Clifford/Geometric Algebra for state representation, but this complexity is completely hidden from users.

```typescript
import { init, behavior, bindText, fromClick } from '@cliffy/core';

await init();

// Create reactive state
const count = behavior(0);
const doubled = count.map(n => n * 2);

// Bind to DOM
bindText(document.getElementById('count')!, count);
bindText(document.getElementById('doubled')!, doubled);

// Handle events
fromClick(document.getElementById('increment')!)
  .subscribe(() => count.update(n => n + 1));
```

## Key Features

- **Classical FRP**: Based on Conal Elliott's original formulation
  - `Behavior<T>`: Time-varying values (always have a current value)
  - `Event<T>`: Discrete occurrences (streams of values)
- **WASM Performance**: Core logic runs in Rust/WebAssembly
- **Declarative DOM Bindings**: `bindText()`, `bindClass()`, `bindValue()`, etc.
- **Type-Safe**: Full TypeScript support
- **No Virtual DOM**: Direct reactive updates

## Architecture

```
User Code (TypeScript)
    ↓
@cliffy/core (thin wrapper)
    ↓
cliffy-wasm (WASM bindings)
    ↓
cliffy-core (Rust FRP + GA)
    ↓
amari-core (Geometric Algebra)
```

The geometric algebra is an implementation detail. What you write is simple and familiar.

## Installation

```bash
npm install @cliffy/core
```

## Quick Start

```typescript
import {
  init,
  behavior,
  event,
  combine,
  ifElse,
  bindText,
  bindClass,
  bindValue,
  fromClick,
  fromInput,
  BindingGroup,
} from '@cliffy/core';

// Initialize WASM (required once at startup)
await init();

// Create a binding group to manage subscriptions
const bindings = new BindingGroup();

// Reactive state
const name = behavior('');
const greeting = name.map(n => n ? `Hello, ${n}!` : 'Enter your name');

// Two-way input binding
bindings.addCleanup(bindValue(nameInput, name));

// One-way text binding
bindings.add(bindText(greetingEl, greeting));

// Cleanup when done
// bindings.dispose();
```

## API Reference

### Behaviors (Time-Varying Values)

```typescript
// Create
const count = behavior(0);
const name = behavior('Alice');

// Read
count.sample();  // Get current value

// Update
count.set(10);              // Set directly
count.update(n => n + 1);   // Transform

// Derive
const doubled = count.map(n => n * 2);
const area = combine(width, height, (w, h) => w * h);

// Subscribe
count.subscribe(value => console.log(value));
```

### Events (Discrete Occurrences)

```typescript
// Create from DOM
const clicks = fromClick(button);
const inputs = fromInput(textField);
const submits = fromSubmit(form);
const keys = fromKeyboard(document.body, 'keydown');

// Transform
const positions = clicks.map(e => ({ x: e.clientX, y: e.clientY }));
const enters = keys.filter(e => e.key === 'Enter');
const allClicks = clicks1.merge(clicks2);

// Accumulate into Behavior
const clickCount = clicks.fold(0, (acc, _) => acc + 1);
```

### DOM Bindings

```typescript
// One-way (Behavior → DOM)
bindText(element, textBehavior);
bindAttr(element, 'href', urlBehavior);
bindClass(element, 'active', boolBehavior);
bindStyle(element, 'opacity', opacityBehavior);
bindVisible(element, visibleBehavior);
bindDisabled(button, disabledBehavior);

// Two-way (Behavior ↔ DOM)
bindValue(input, stringBehavior);      // text inputs
bindChecked(checkbox, boolBehavior);   // checkboxes
bindNumber(slider, numberBehavior);    // number/range inputs
```

### Combinators

```typescript
// Conditional
const theme = ifElse(isDarkMode, () => 'dark', () => 'light');
const content = when(isVisible, () => 'Visible!');  // null when false

// Combine multiple
const fullName = combine(first, last, (f, l) => `${f} ${l}`);

// Constant
const pi = constant(3.14159);
```

## Development

### Prerequisites

- Rust (with `wasm-pack`)
- Node.js 18+
- cargo-watch (for hot reload)

### Setup

```bash
git clone https://github.com/justinelliottcobb/Cliffy.git
cd cliffy
npm install
```

### Development Server

```bash
# Run counter-101 example with hot reload
npm run dev

# Or run a specific example
npm run example counter-101
```

### Build

```bash
# Full build (Rust → WASM → TypeScript)
npm run build

# Individual builds
npm run build:wasm   # WASM only
npm run build:ts     # TypeScript only
```

### Test

```bash
# Run all Rust tests
npm test

# Run with cargo directly
cargo test --workspace
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
├── cliffy-wasm/           # WASM bindings
├── cliffy-typescript/     # @cliffy/core npm package
│   └── src/
│       ├── index.ts       # Main exports
│       └── dom.ts         # DOM binding helpers
├── examples/
│   └── counter-101/       # Reference implementation
└── archive/               # Previous implementations
```

## Examples

### counter-101 (Reference)

The minimal example demonstrating all core concepts:

```bash
cd examples/counter-101
npm install
npm run dev
```

See [examples/README.md](examples/README.md) for more details.

## Why Geometric Algebra?

Cliffy uses [Clifford Algebra](https://en.wikipedia.org/wiki/Clifford_algebra) (specifically GA3 = Cl(3,0)) internally to represent state. This provides:

- **Unified representation**: Scalars, vectors, and higher-grade elements in one structure
- **Natural transformations**: Rotations, translations, scaling as algebraic operations
- **Mathematical elegance**: Clean composition of transformations

However, **you never need to know this**. The GA is purely an implementation detail. Your code uses familiar types like numbers, strings, and objects.

## Contributing

Contributions welcome! Please see the [examples](examples/) for the current API patterns.

## License

MIT
