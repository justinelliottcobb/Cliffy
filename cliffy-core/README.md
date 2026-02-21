# cliffy-core

Reactive UI framework with geometric algebra state management.

## Overview

`cliffy-core` provides the foundational FRP (Functional Reactive Programming) primitives for building reactive applications. It follows Conal Elliott's original FRP semantics with geometric algebra internals.

## Core Primitives

### Behavior<T>
A continuous, time-varying value (`Time -> T`):

```rust
use cliffy_core::{Behavior, combine};

let count = Behavior::new(0);
let doubled = count.map(|n| n * 2);

count.set(5);
assert_eq!(doubled.sample(), 10);

// Combine multiple behaviors
let a = Behavior::new(10);
let b = Behavior::new(20);
let sum = combine(&a, &b, |x, y| x + y);
```

### Event<T>
Discrete occurrences over time (`[(Time, T)]`):

```rust
use cliffy_core::Event;

let clicks = Event::new();
let click_count = clicks.fold(0, |acc, _| acc + 1);

clicks.emit(());
clicks.emit(());
assert_eq!(click_count.sample(), 2);
```

### Combinators

```rust
use cliffy_core::{Behavior, when, if_else};

let show_message = Behavior::new(true);

// Project through condition
let message = when(&show_message, || "Hello!".to_string());

// Select between alternatives
let theme = if_else(&is_dark_mode, || "dark", || "light");
```

## Geometric State

State is represented using geometric algebra (GA3), enabling:
- Smooth interpolation via rotors
- Geometric transformations
- Conflict resolution via geometric mean

```rust
use cliffy_core::{GeometricState, Rotor};

let state = GeometricState::from_vector(1.0, 0.0, 0.0);
let rotated = state.apply_rotor(&Rotor::xy(std::f64::consts::FRAC_PI_2));
```

## Features

- **Classical FRP**: Behavior and Event with automatic dependency tracking
- **Geometric Algebra**: State as GA3 multivectors for smooth interpolation
- **Composable**: Map, combine, fold, filter operations
- **Zero-cost abstractions**: Compiles to efficient code

## Usage with Other Frameworks

`cliffy-core` is framework-agnostic and can be used with:
- **Yew**: Reactive state for Yew components
- **Leptos**: Signal-like reactivity
- **Dioxus**: State management layer
- **WASM**: Via `cliffy-wasm` bindings

## License

MIT
