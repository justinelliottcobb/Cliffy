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
cliffy-gpu = { version = "0.1", features = ["wasm"] }
```

## Benchmarks

Run benchmarks to compare GPU vs SIMD performance:

```bash
cargo bench --package cliffy-gpu
```

## License

MIT
