# cliffy-gpu

WebGPU compute shaders for geometric algebra operations.

## Overview

`cliffy-gpu` accelerates geometric algebra computations using WebGPU compute shaders with SIMD fallback for CPU. Ideal for batch operations on large state arrays.

## Features

- **WebGPU Compute**: Parallel GA3 operations on GPU
- **SIMD Fallback**: CPU acceleration via `wide` crate when GPU unavailable
- **Automatic Dispatch**: Chooses GPU or SIMD based on workload size
- **WASM Support**: Works in browsers via WebGL backend

## Usage

```rust
use cliffy_gpu::{GpuMultivector, batch_geometric_product};

// Single operations
let a = GpuMultivector::from_vector(1.0, 2.0, 3.0);
let b = GpuMultivector::from_scalar(2.0);
let result = a.geometric_product(&b);

// Batch operations (automatically dispatched to GPU)
let states: Vec<GpuMultivector> = load_states();
let rotors: Vec<GpuMultivector> = load_rotors();
let rotated = batch_sandwich_product(&states, &rotors);
```

## SIMD Operations

CPU fallback with SIMD vectorization:

```rust
use cliffy_gpu::simd::{add_simd, geometric_product_simd, sandwich_simd};

let a = [1.0, 2.0, 3.0, 0.0, 4.0, 0.0, 0.0, 0.0];
let b = [2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

let sum = add_simd(&a, &b);
let product = geometric_product_simd(&a, &b);
```

## Dispatch Threshold

Operations automatically use GPU when beneficial:

```rust
use cliffy_gpu::set_dispatch_threshold;

// Use GPU for batches larger than 1000 elements
set_dispatch_threshold(1000);
```

## WASM Support

Enable the `wasm` feature for browser usage:

```toml
[dependencies]
cliffy-gpu = { version = "0.2", features = ["wasm"] }
```

## Integration with Leptos

Accelerate animations and physics in Leptos:

```rust
use leptos::*;
use cliffy_gpu::{GpuMultivector, batch_sandwich_product};
use cliffy_core::Rotor;

#[component]
fn ParticleSystem() -> impl IntoView {
    let (particles, set_particles) = create_signal(vec![
        GpuMultivector::from_vector(0.0, 0.0, 0.0); 1000
    ]);

    // GPU-accelerated rotation of all particles
    let rotate_all = move |angle: f64| {
        let rotor = GpuMultivector::from_rotor(&Rotor::xy(angle));
        let rotors = vec![rotor; 1000];

        set_particles.update(|p| {
            // Batch operation - automatically uses GPU for 1000+ particles
            *p = batch_sandwich_product(p, &rotors);
        });
    };

    // Animation frame
    use_interval(move || rotate_all(0.01), 16); // ~60fps

    view! {
        <canvas id="particles">
            // Render particles...
        </canvas>
    }
}
```

## Integration with Yew

GPU-accelerated state updates in Yew:

```rust
use yew::prelude::*;
use cliffy_gpu::{GpuMultivector, simd};
use gloo_timers::callback::Interval;

#[function_component]
fn PhysicsSimulation() -> Html {
    let states = use_state(|| {
        (0..500).map(|i| {
            GpuMultivector::from_vector(
                i as f64 * 0.1,
                (i as f64 * 0.1).sin(),
                0.0,
            )
        }).collect::<Vec<_>>()
    });

    let velocities = use_state(|| {
        vec![GpuMultivector::from_vector(0.01, 0.0, 0.0); 500]
    });

    // Physics update using SIMD
    use_effect_with((), {
        let states = states.clone();
        let velocities = velocities.clone();
        move |_| {
            let interval = Interval::new(16, move || {
                // SIMD-accelerated position update
                let new_states: Vec<_> = states.iter()
                    .zip(velocities.iter())
                    .map(|(pos, vel)| {
                        let pos_arr = pos.to_array();
                        let vel_arr = vel.to_array();
                        GpuMultivector::from_array(simd::add_simd(&pos_arr, &vel_arr))
                    })
                    .collect();
                states.set(new_states);
            });
            || drop(interval)
        }
    });

    html! {
        <div class="simulation">
            <p>{ format!("Simulating {} particles with SIMD", states.len()) }</p>
            // Render visualization...
        </div>
    }
}
```

## Benchmarks

Run benchmarks to compare GPU vs SIMD performance:

```bash
cargo bench --package cliffy-gpu
```

## License

MIT
