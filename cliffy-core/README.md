# cliffy-core

Reactive UI framework with geometric algebra state management.

## Overview

cliffy-core provides the foundational FRP (Functional Reactive Programming) primitives for the Cliffy framework:

- **`Behavior<T>`** - Continuous, time-varying values
- **`Event<T>`** - Discrete occurrences over time
- **Combinators** - `map`, `combine`, `when`, `if_else`
- **Geometric State** - State transformations using rotors and versors

## Usage

```rust
use cliffy_core::{Behavior, Event, combine};

// Create reactive values
let count = Behavior::new(0);
let label = count.map(|n| format!("Count: {}", n));

// Subscribe to changes
label.subscribe(|text| println!("{}", text));

// Update state
count.set(1);  // Prints: "Count: 1"
```

## Features

- Classical FRP semantics (Conal Elliott style)
- Geometric algebra internals via [amari-core](https://crates.io/crates/amari-core)
- No virtual DOM - direct reactive subscriptions
- Composable state transformations

## License

MIT
