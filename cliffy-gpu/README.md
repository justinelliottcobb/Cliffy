# cliffy-gpu

WebGPU compute shaders for geometric algebra operations.

## Overview

cliffy-gpu provides GPU-accelerated geometric algebra operations:

- **WebGPU compute shaders** - Parallel GA operations on GPU
- **SIMD fallback** - Optimized CPU path when GPU unavailable
- **Batch operations** - Efficient processing of multivector arrays
- **Automatic dispatch** - Chooses optimal backend based on workload

## Usage

```rust
use cliffy_gpu::{GpuMultivector, dispatch_threshold};

// Create GPU-backed multivectors
let mv = GpuMultivector::from_vector(1.0, 2.0, 3.0);

// Batch geometric products (auto-dispatches to GPU for large batches)
let results = batch_geometric_product(&vectors_a, &vectors_b);

// Check dispatch threshold
let threshold = dispatch_threshold(); // Elements needed for GPU dispatch
```

## Features

- WebGPU via [wgpu](https://crates.io/crates/wgpu)
- SIMD via [wide](https://crates.io/crates/wide)
- Automatic GPU/CPU dispatch based on workload size
- WASM-compatible with WebGL fallback

## Performance

GPU dispatch activates for batches larger than the threshold (typically 1000+ elements). Below this threshold, SIMD-optimized CPU code is faster due to dispatch overhead.

## License

MIT
