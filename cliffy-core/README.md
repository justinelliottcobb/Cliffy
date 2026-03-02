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

## Integration with Leptos

Use Cliffy's geometric state with Leptos signals:

```rust
use leptos::*;
use cliffy_core::{Behavior, GeometricState, Rotor};

#[component]
fn RotatingBox() -> impl IntoView {
    // Cliffy behavior for smooth rotation
    let rotation = Behavior::new(0.0_f64);

    // Bridge to Leptos signal
    let (angle, set_angle) = create_signal(0.0);

    // Subscribe Cliffy behavior to update Leptos
    rotation.subscribe(move |value| set_angle.set(value));

    // Geometric interpolation for smooth animation
    let animate = move |_| {
        let current = rotation.sample();
        let target = current + std::f64::consts::FRAC_PI_4;

        // Use rotor for smooth rotation
        let rotor = Rotor::xy(target - current);
        rotation.set(target);
    };

    view! {
        <div
            style:transform=move || format!("rotate({}rad)", angle.get())
            on:click=animate
        >
            "Click to rotate"
        </div>
    }
}
```

## Integration with Yew

Use Cliffy behaviors as Yew component state:

```rust
use yew::prelude::*;
use cliffy_core::{Behavior, combine};

#[function_component]
fn Counter() -> Html {
    // Cliffy behaviors for state
    let count_a = use_state(|| Behavior::new(0));
    let count_b = use_state(|| Behavior::new(0));

    // Derive combined state
    let sum = combine(&*count_a, &*count_b, |a, b| a + b);

    // Force re-render on changes
    let trigger = use_force_update();

    let on_click_a = {
        let count = count_a.clone();
        let trigger = trigger.clone();
        Callback::from(move |_| {
            count.update(|n| n + 1);
            trigger.force_update();
        })
    };

    let on_click_b = {
        let count = count_b.clone();
        let trigger = trigger.clone();
        Callback::from(move |_| {
            count.update(|n| n + 1);
            trigger.force_update();
        })
    };

    html! {
        <div>
            <p>{ format!("A: {} + B: {} = {}", count_a.sample(), count_b.sample(), sum.sample()) }</p>
            <button onclick={on_click_a}>{ "Increment A" }</button>
            <button onclick={on_click_b}>{ "Increment B" }</button>
        </div>
    }
}
```

## License

MIT
