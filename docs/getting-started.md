# Getting Started with Cliffy

Cliffy is a reactive UI framework built on geometric algebra. This guide will get you up and running with your first Cliffy application.

## Prerequisites

- Rust 1.70+ with the `wasm32-unknown-unknown` target
- Node.js 18+ (for web development)
- wasm-pack (`cargo install wasm-pack`)

## Installation

### Rust Project

Add Cliffy to your `Cargo.toml`:

```toml
[dependencies]
cliffy-core = { path = "../cliffy-core" }  # or version when published
```

### Web Project (TypeScript/JavaScript)

Use the scaffolding tool to create a new project:

```bash
npx create-cliffy my-app --template typescript-vite
cd my-app
npm install
npm run dev
```

Or add to an existing project:

```bash
npm install @cliffy/core
```

## Core Concepts

Cliffy uses **Functional Reactive Programming (FRP)** with two fundamental primitives:

### Behavior: Time-Varying Values

A `Behavior<T>` represents a value that changes over time. Think of it as a cell in a spreadsheet that can update.

```rust
use cliffy_core::{behavior, Behavior};

// Create a behavior with initial value
let count = behavior(0);

// Read the current value
assert_eq!(count.sample(), 0);

// Update the value
count.update(|n| n + 1);
assert_eq!(count.sample(), 1);

// Set directly
count.set(100);
assert_eq!(count.sample(), 100);
```

### Event: Discrete Occurrences

An `Event<T>` represents discrete happenings like clicks or key presses.

```rust
use cliffy_core::{event, Event};

// Create an event stream
let clicks = event::<()>();

// Subscribe to events
clicks.subscribe(|_| {
    println!("Clicked!");
});

// Emit an event
clicks.emit(());
```

### Reactive Subscriptions

Behaviors notify subscribers when they change:

```rust
let count = behavior(0);

// Subscribe to changes
count.subscribe(|value| {
    println!("Count is now: {}", value);
});

count.set(1);  // Prints: "Count is now: 1"
count.set(2);  // Prints: "Count is now: 2"
```

### Derived Behaviors with `map`

Create new behaviors that automatically update:

```rust
let count = behavior(5);
let doubled = count.map(|n| n * 2);

assert_eq!(doubled.sample(), 10);

count.set(10);
assert_eq!(doubled.sample(), 20);  // Automatically updated!
```

### Combining Behaviors

Combine multiple behaviors into one:

```rust
use cliffy_core::{behavior, combine};

let width = behavior(10);
let height = behavior(20);
let area = combine(&width, &height, |w, h| w * h);

assert_eq!(area.sample(), 200);

width.set(15);
assert_eq!(area.sample(), 300);  // Automatically recalculated!
```

## Your First App: Counter

Here's a complete counter example:

### Rust (Native)

```rust
use cliffy_core::{behavior, event};

fn main() {
    // State
    let count = behavior(0i32);

    // Events
    let increment = event::<()>();
    let decrement = event::<()>();

    // Wire events to state
    let count_inc = count.clone();
    increment.subscribe(move |_| {
        count_inc.update(|n| n + 1);
    });

    let count_dec = count.clone();
    decrement.subscribe(move |_| {
        count_dec.update(|n| n - 1);
    });

    // React to state changes
    count.subscribe(|value| {
        println!("Count: {}", value);
    });

    // Simulate button clicks
    increment.emit(());  // Count: 1
    increment.emit(());  // Count: 2
    decrement.emit(());  // Count: 1
}
```

### TypeScript (Browser)

```typescript
import { behavior, event } from '@cliffy/core';

// State
const count = behavior(0);

// Derived state
const displayText = count.map(n => `Count: ${n}`);

// Subscribe to render
displayText.subscribe(text => {
    document.getElementById('display')!.textContent = text;
});

// Events
const increment = event<void>();
const decrement = event<void>();

// Wire events to state
increment.subscribe(() => count.update(n => n + 1));
decrement.subscribe(() => count.update(n => n - 1));

// Connect to DOM
document.getElementById('inc')!.onclick = () => increment.emit();
document.getElementById('dec')!.onclick = () => decrement.emit();
```

```html
<div id="display">Count: 0</div>
<button id="inc">+</button>
<button id="dec">-</button>
```

## Combinators

Cliffy provides combinators for common patterns:

### `when` - Conditional Values

```rust
use cliffy_core::{behavior, when};

let show_message = behavior(true);
let message = when(&show_message, || "Hello!".to_string());

assert_eq!(message.sample(), Some("Hello!".to_string()));

show_message.set(false);
assert_eq!(message.sample(), None);
```

### `if_else` - Conditional Selection

```rust
use cliffy_core::{behavior, combinators::if_else};

let is_dark_mode = behavior(false);
let theme = if_else(
    &is_dark_mode,
    || "dark".to_string(),
    || "light".to_string(),
);

assert_eq!(theme.sample(), "light");

is_dark_mode.set(true);
assert_eq!(theme.sample(), "dark");
```

### `fold` - Accumulate Events

```rust
use cliffy_core::event;

let clicks = event::<()>();
let click_count = clicks.fold(0i32, |n, _| n + 1);

assert_eq!(click_count.sample(), 0);

clicks.emit(());
clicks.emit(());
assert_eq!(click_count.sample(), 2);
```

## Event Transformations

### `map` - Transform Event Values

```rust
let numbers = event::<i32>();
let doubled = numbers.map(|n| n * 2);

doubled.subscribe(|n| println!("Got: {}", n));

numbers.emit(5);  // Prints: "Got: 10"
```

### `filter` - Select Events

```rust
let numbers = event::<i32>();
let evens = numbers.filter(|n| n % 2 == 0);

evens.subscribe(|n| println!("Even: {}", n));

numbers.emit(1);  // Nothing
numbers.emit(2);  // Prints: "Even: 2"
numbers.emit(3);  // Nothing
numbers.emit(4);  // Prints: "Even: 4"
```

### `merge` - Combine Event Streams

```rust
let clicks = event::<&str>();
let keys = event::<&str>();
let inputs = clicks.merge(&keys);

inputs.subscribe(|s| println!("Input: {}", s));

clicks.emit("click");  // Prints: "Input: click"
keys.emit("key");      // Prints: "Input: key"
```

## Geometric State (Advanced)

For explicit geometric control, use `GeometricState`:

```rust
use cliffy_core::{GeometricState, Rotor, Translation};
use std::f64::consts::PI;

// Create state from a 3D position
let pos = GeometricState::from_vector(1.0, 0.0, 0.0);

// Apply a 90-degree rotation in the XY plane
let rotated = pos.apply_rotor(&Rotor::xy(PI / 2.0));

// Apply a translation
let translated = rotated.apply_translation(&Translation::new(1.0, 0.0, 0.0));

// Read the result
let (x, y, z) = translated.as_vector();
// x ≈ 1.0, y ≈ 1.0, z ≈ 0.0
```

## Next Steps

- Read the [FRP Guide](./frp-guide.md) for reactive patterns
- Explore the [Geometric Algebra Primer](./geometric-algebra-primer.md)
- Learn the [Algebraic TSX Guide](./algebraic-tsx-guide.md) for component model
- Understand [Distributed State](./distributed-state-guide.md) for CRDTs
- Write tests with the [Testing Guide](./testing-guide.md)
- Check out the [examples](../examples/) for complete applications
- See the [Architecture docs](./architecture/) for design decisions

## Key Differences from React/Redux

| Concept | React/Redux | Cliffy |
|---------|------------|--------|
| State | `useState`, Redux store | `Behavior<T>` |
| Derived state | `useMemo`, selectors | `behavior.map()` |
| Events | Callbacks, actions | `Event<T>` |
| Side effects | `useEffect` | `subscribe()` |
| Combining state | Multiple hooks | `combine()` |

Cliffy's approach is more declarative: you describe the relationships between values, and updates propagate automatically.
