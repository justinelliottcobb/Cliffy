# Testing Guide (Roadmap)

> **Status**: `cliffy-test` is a Rust crate for algebraic testing. WASM bindings are planned for Phase 0 of the roadmap.

This document describes the testing philosophy and Rust API. TypeScript bindings will be added in a future release.

## Philosophy

Traditional testing asks: "Does this assertion pass?"

Cliffy testing asks: "Does this state lie on the expected manifold?"

### Three Categories of Test Events

| Category | Probability | Meaning | Example |
|----------|-------------|---------|---------|
| **Impossible** | P = 0 | Must NEVER fail | Magnitude is non-negative |
| **Rare** | 0 < P << 1 | Statistically bounded | CRDT converges in 100 iterations |
| **Emergent** | P > 0 | Valid but unexpected | Novel merge trajectory |

## Rust API (cliffy-test)

### Impossible Invariants

For properties that must **never** fail. Violations indicate bugs.

```rust
use cliffy_test::prelude::*;

invariant_impossible! {
    name: "Rotor preserves magnitude",
    check: || {
        let v = arbitrary_vector();
        let r = arbitrary_rotor();
        let rotated = sandwich(&r, &v);

        let diff = (v.magnitude() - rotated.magnitude()).abs();
        if diff < 1e-10 {
            TestResult::Pass
        } else {
            TestResult::fail_with_distance(diff, "Magnitude changed")
        }
    }
}
```

### Rare Invariants

For properties with bounded failure probability:

```rust
invariant_rare! {
    name: "CRDT converges within 100 iterations",
    probability_bound: 1e-6,
    samples: 10_000,
    check: |rng| {
        let mut crdt_a = create_random_crdt(rng);
        let mut crdt_b = create_random_crdt(rng);

        // Simulate concurrent operations
        for _ in 0..100 {
            apply_random_op(&mut crdt_a, rng);
            apply_random_op(&mut crdt_b, rng);
        }

        // Merge
        crdt_a.merge(&crdt_b);
        crdt_b.merge(&crdt_a);

        // Check convergence
        let divergence = (crdt_a.state() - crdt_b.state()).magnitude();
        TestResult::from_bool(divergence < 1e-10, "Did not converge")
    }
}
```

### Emergent Behaviors

Track valid but unexpected behaviors:

```rust
emergent! {
    name: "Novel merge trajectory",
    description: "Merge paths we didn't anticipate but are valid",
    check: |trajectory| {
        if is_known_pattern(trajectory) {
            EmergentResult::Known
        } else {
            log::info!("New pattern: {:?}", trajectory);
            EmergentResult::Novel(trajectory.clone())
        }
    }
}
```

### Test Results

```rust
pub enum TestResult {
    Pass,
    Fail(GeometricError),
}

pub struct GeometricError {
    /// Distance from expected manifold
    pub distance: f64,
    /// Gradient pointing toward valid states
    pub gradient: Option<GA3>,
    /// Human-readable message
    pub message: String,
}
```

### Manifold Testing

Valid states form geometric manifolds:

```rust
use cliffy_test::manifold::{Manifold, ManifoldConstraint};

let manifold = Manifold::new("Valid state")
    .with_constraint(ManifoldConstraint::MaxMagnitude(100.0))
    .with_constraint(ManifoldConstraint::NonNegativeScalar);

// Check if state is on manifold
if manifold.contains(&state) {
    println!("State is valid");
}

// Get distance to manifold
let distance = manifold.distance_to(&state);

// Verify with test result
let result = manifold.verify(&state);
```

### Generators

Generate random geometric values for property testing:

```rust
use cliffy_test::generators::*;

// Random vector with components in [-10, 10]
let v = arbitrary_vector();

// Random unit vector (magnitude = 1)
let u = arbitrary_unit_vector();

// Random unit rotor (valid rotation)
let r = arbitrary_rotor();

// Random multivector with all grades
let mv = arbitrary_ga3();
```

## Future: TypeScript API (Phase 0)

When WASM bindings are added, the API will look like:

```typescript
// Future API - not yet implemented
import { invariant, TestResult, Manifold } from '@cliffy/test';

// Define an invariant
const magnitudePositive = invariant({
    name: 'Magnitude is non-negative',
    check: (state) => {
        const mag = state.magnitude();
        return mag >= 0
            ? TestResult.pass()
            : TestResult.fail(mag, 'Negative magnitude');
    }
});

// Run the test
const result = magnitudePositive.verify(someState);

// Manifold testing
const validStates = new Manifold('Valid counter')
    .maxMagnitude(100)
    .nonNegativeScalar();

console.log(validStates.contains(state));
```

## Roadmap

| Phase | Feature |
|-------|---------|
| Phase 0 | Create cliffy-test crate, invariant macros |
| Phase 0 | Integrate amari-flynn for probabilistic contracts |
| Future | WASM bindings, TypeScript API |

## Integration with cargo test

```rust
#[cfg(test)]
mod tests {
    use cliffy_test::prelude::*;

    #[test]
    fn test_rotor_unit() {
        verify_invariant! {
            name: "Generated rotors are unit",
            check: || {
                let r = arbitrary_rotor();
                let diff = (r.magnitude() - 1.0).abs();
                TestResult::from_bool(diff < 1e-10, "Rotor not unit")
            }
        }
    }
}
```

## Why Geometric Testing?

| Traditional Testing | Geometric Testing |
|--------------------|-------------------|
| Boolean assertions | Distance from manifold |
| Pass/fail binary | Gradient toward valid state |
| Manual test cases | Property-based generation |
| Flaky tests | Probabilistic categories |

Geometric testing transforms "flaky tests" into properly categorized probabilistic properties.

## Next Steps

- [Getting Started](./getting-started.md) - Core concepts
- [FRP Guide](./frp-guide.md) - Reactive patterns
- [Architecture](./architecture/) - Design decisions
- [ROADMAP.md](../ROADMAP.md) - Full development roadmap
