# cliffy-test

Algebraic testing framework for Cliffy - tests as geometric invariants.

## Overview

cliffy-test provides probabilistic testing primitives based on geometric algebra:

- **Impossible invariants** - Properties that must never fail (P=0)
- **Rare invariants** - Properties with bounded failure probability
- **Emergent invariants** - Properties that emerge over time
- **Manifold constraints** - Geometric boundaries for valid states

## Usage

```rust
use cliffy_test::{test_impossible, test_rare, InvariantCategory};

// Test an invariant that should never fail
let report = test_impossible(
    "Addition is commutative",
    || {
        let a = rand::random::<i32>();
        let b = rand::random::<i32>();
        a.wrapping_add(b) == b.wrapping_add(a)
    },
    1000,  // iterations
);

assert!(report.verified);
assert_eq!(report.category, InvariantCategory::Impossible);

// Test a rare invariant (bounded probability)
let report = test_rare(
    "Hash collision",
    || check_for_collision(),
    0.001,  // max acceptable probability
    10000,  // iterations
);

assert!(report.verified);
```

## Features

- Probabilistic contracts via [amari-flynn](https://crates.io/crates/amari-flynn)
- Property-based testing via [quickcheck](https://crates.io/crates/quickcheck)
- Geometric invariant verification
- Parallel test execution via [rayon](https://crates.io/crates/rayon)

## License

MIT
