# Testing Guide

Cliffy provides an algebraic testing framework where **tests are geometric invariants** and **failures are geometric distances**. This guide covers `cliffy-test`.

## Philosophy

Traditional testing asks: "Does this assertion pass?"

Cliffy testing asks: "Does this state lie on the expected manifold?"

### Three Categories of Test Events

| Category | Probability | Meaning | Example |
|----------|-------------|---------|---------|
| **Impossible** | P = 0 | Must NEVER fail | Magnitude is non-negative |
| **Rare** | 0 < P << 1 | Statistically bounded | CRDT converges in 100 iterations |
| **Emergent** | P > 0 | Valid but unexpected | Novel merge trajectory |

## Quick Start

```rust
use cliffy_test::prelude::*;

// Test that magnitude is always non-negative
let result = invariant_impossible! {
    name: "Magnitude is non-negative",
    check: || {
        let v = vector(1.0, 2.0, 3.0);
        if v.magnitude() >= 0.0 {
            TestResult::Pass
        } else {
            TestResult::fail_with_distance(v.magnitude(), "Negative magnitude")
        }
    }
};

// Run the invariant
match result.verify() {
    TestResult::Pass => println!("Invariant holds"),
    TestResult::Fail(error) => {
        println!("Failed! Distance from manifold: {}", error.distance);
    }
}
```

## Invariant Types

### Impossible Invariants

For properties that must **never** fail. Violations indicate bugs.

```rust
use cliffy_test::prelude::*;

// Define the invariant
invariant_impossible! {
    name: "Rotor preserves magnitude",
    check: || {
        let v = vector(1.0, 2.0, 3.0);
        let r = arbitrary_rotor();  // Random unit rotor
        let rotated = sandwich(&r, &v);

        let diff = (v.magnitude() - rotated.magnitude()).abs();
        if diff < 1e-10 {
            TestResult::Pass
        } else {
            TestResult::fail_with_distance(diff, "Magnitude changed after rotation")
        }
    }
}
```

### Rare Invariants

For properties with bounded failure probability. Used for statistical tests.

```rust
use cliffy_test::prelude::*;

invariant_rare! {
    name: "CRDT converges within 100 iterations",
    probability_bound: 1e-6,  // Must fail less than 1 in a million
    samples: 10_000,
    check: |rng| {
        let mut crdt_a = create_random_crdt(rng);
        let mut crdt_b = create_random_crdt(rng);

        // Simulate concurrent operations
        for _ in 0..100 {
            // Random operations on both
        }

        // Merge
        crdt_a.merge(&crdt_b);
        crdt_b.merge(&crdt_a);

        // Check convergence
        let divergence = (crdt_a.state() - crdt_b.state()).magnitude();
        if divergence < 1e-10 {
            TestResult::Pass
        } else {
            TestResult::fail_with_distance(divergence, "Did not converge")
        }
    }
}
```

### Emergent Behaviors

Track valid but unexpected behaviors for analysis.

```rust
use cliffy_test::prelude::*;

emergent! {
    name: "Novel merge trajectory",
    description: "Merge paths we didn't anticipate but are valid",
    check: |trajectory| {
        // Analyze the trajectory
        if is_known_pattern(trajectory) {
            EmergentResult::Known
        } else {
            // Log for analysis
            log::info!("New pattern: {:?}", trajectory);
            EmergentResult::Novel(trajectory.clone())
        }
    }
}
```

## Test Results

### TestResult Enum

```rust
pub enum TestResult {
    /// Test passed
    Pass,
    /// Test failed with geometric error information
    Fail(GeometricError),
}

impl TestResult {
    /// Create a passing result
    pub fn pass() -> Self { TestResult::Pass }

    /// Create a failure with distance from expected manifold
    pub fn fail_with_distance(distance: f64, message: &str) -> Self {
        TestResult::Fail(GeometricError::new(distance, message))
    }

    /// Create from a boolean
    pub fn from_bool(passed: bool, message: &str) -> Self {
        if passed {
            TestResult::Pass
        } else {
            TestResult::fail_with_distance(1.0, message)
        }
    }
}
```

### GeometricError

Errors include geometric information:

```rust
pub struct GeometricError {
    /// Distance from expected manifold
    pub distance: f64,
    /// Gradient pointing toward valid states
    pub gradient: Option<GA3>,
    /// Projected correction to nearest valid state
    pub correction: Option<GA3>,
    /// Human-readable message
    pub message: String,
}
```

## Manifold Testing

Valid states form geometric manifolds. Tests verify states lie on the manifold.

### Defining a Manifold

```rust
use cliffy_test::manifold::{Manifold, ManifoldConstraint};

// Define a manifold where magnitude is bounded
let manifold = Manifold::new("Bounded state")
    .with_constraint(ManifoldConstraint::MaxMagnitude(100.0))
    .with_constraint(ManifoldConstraint::MinMagnitude(0.1))
    .with_constraint(ManifoldConstraint::Custom(Box::new(|state| {
        // Custom constraint: scalar must be positive
        state.get(0) > 0.0
    })));
```

### Testing Against Manifold

```rust
use cliffy_test::manifold::Manifold;

let manifold = Manifold::new("Valid counter state")
    .with_constraint(ManifoldConstraint::NonNegativeScalar);

let state = GA3::scalar(42.0);

// Check if state is on manifold
if manifold.contains(&state) {
    println!("State is valid");
}

// Get distance to manifold
let distance = manifold.distance_to(&state);

// Project invalid state onto manifold
let projected = manifold.project(&state);

// Verify with test result
let result = manifold.verify(&state);
match result {
    TestResult::Pass => println!("On manifold"),
    TestResult::Fail(e) => println!("Off manifold by {}", e.distance),
}
```

### Built-in Constraints

| Constraint | Description |
|------------|-------------|
| `MaxMagnitude(f64)` | State magnitude ≤ bound |
| `MinMagnitude(f64)` | State magnitude ≥ bound |
| `NonNegativeScalar` | Scalar component ≥ 0 |
| `UnitMagnitude` | Magnitude = 1 (for rotors) |
| `Custom(Box<dyn Fn>)` | Custom predicate |

## Generators

Generate random geometric values for property testing.

### Vector Generators

```rust
use cliffy_test::generators::{arbitrary_vector, arbitrary_unit_vector};

// Random vector with components in [-10, 10]
let v = arbitrary_vector();

// Random unit vector (magnitude = 1)
let u = arbitrary_unit_vector();
```

### Rotor Generators

```rust
use cliffy_test::generators::arbitrary_rotor;

// Random unit rotor (valid rotation)
let r = arbitrary_rotor();

// Verify it's a valid rotor
assert!((r.magnitude() - 1.0).abs() < 1e-10);
```

### GA3 Generators

```rust
use cliffy_test::generators::arbitrary_ga3;

// Random multivector with all grades
let mv = arbitrary_ga3();
```

### QuickCheck Integration

```rust
use cliffy_test::generators::ArbitraryGA3;
use quickcheck::{quickcheck, TestResult as QCResult};

quickcheck! {
    fn rotor_preserves_magnitude(v: ArbitraryGA3, r: ArbitraryRotor) -> QCResult {
        let v = v.0;
        let r = r.0;

        let rotated = sandwich(&r, &v);
        let diff = (v.magnitude() - rotated.magnitude()).abs();

        if diff < 1e-9 {
            QCResult::passed()
        } else {
            QCResult::failed()
        }
    }
}
```

## Macros

### invariant_impossible!

```rust
invariant_impossible! {
    name: "Description of invariant",
    check: || {
        // Test logic returning TestResult
        TestResult::Pass
    }
}

// With setup
invariant_impossible! {
    name: "Complex invariant",
    setup: || {
        // Return setup data
        (create_crdt(), create_operations())
    },
    check: |(crdt, ops)| {
        // Use setup data
        TestResult::Pass
    }
}
```

### invariant_rare!

```rust
invariant_rare! {
    name: "Statistical property",
    probability_bound: 1e-6,
    samples: 10_000,
    check: |rng| {
        // Randomized test
        TestResult::Pass
    }
}
```

### emergent!

```rust
emergent! {
    name: "Emergent behavior tracker",
    description: "What we're looking for",
    on_observe: |behavior| {
        // Called when novel behavior observed
        log::info!("Novel: {:?}", behavior);
    },
    check: |data| {
        EmergentResult::Known  // or EmergentResult::Novel(data)
    }
}
```

### geometric_test!

General-purpose geometric test:

```rust
geometric_test! {
    name: "Sandwich product is linear",
    check: || {
        let r = arbitrary_rotor();
        let a = arbitrary_vector();
        let b = arbitrary_vector();

        let sum_then_sandwich = sandwich(&r, &(&a + &b));
        let sandwich_then_sum = &sandwich(&r, &a) + &sandwich(&r, &b);

        let diff = (sum_then_sandwich - sandwich_then_sum).magnitude();
        TestResult::from_bool(diff < 1e-10, "Sandwich not linear")
    }
}
```

### verify_invariant!

Run and assert an invariant in a test:

```rust
#[test]
fn test_rotor_properties() {
    verify_invariant! {
        name: "Rotor magnitude is 1",
        check: || {
            let r = arbitrary_rotor();
            let diff = (r.magnitude() - 1.0).abs();
            TestResult::from_bool(diff < 1e-10, "Rotor not unit magnitude")
        }
    }
}
```

## Convenience Functions

### Creating Vectors and Bivectors

```rust
use cliffy_test::prelude::*;

// Create a 3D vector
let v = vector(1.0, 2.0, 3.0);

// Create a bivector (represents a plane)
let b = bivector(1.0, 0.0, 0.0);  // XY plane

// Create from raw coefficients
let mv = from_coeffs([1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
```

### Sandwich Product

```rust
use cliffy_test::prelude::*;

// Sandwich product: r * v * reverse(r)
// This is how geometric transformations work
let r = arbitrary_rotor();
let v = vector(1.0, 0.0, 0.0);
let rotated = sandwich(&r, &v);

// Magnitude is preserved
assert!((v.magnitude() - rotated.magnitude()).abs() < 1e-10);
```

## Complete Example: Testing a CRDT

```rust
use cliffy_test::prelude::*;
use cliffy_protocols::{GeometricCRDT, OperationType};

// Impossible: CRDT operations are deterministic
invariant_impossible! {
    name: "Same operations produce same state",
    check: || {
        let node_id = uuid::Uuid::new_v4();
        let mut crdt1 = GeometricCRDT::new(node_id, GA3::scalar(0.0));
        let mut crdt2 = GeometricCRDT::new(node_id, GA3::scalar(0.0));

        let op = crdt1.create_operation(GA3::scalar(5.0), OperationType::Addition);

        crdt1.apply_operation(op.clone());
        crdt2.apply_operation(op);

        let diff = (crdt1.state() - crdt2.state()).magnitude();
        TestResult::from_bool(diff < 1e-10, "Operations not deterministic")
    }
}

// Impossible: Merge is commutative
invariant_impossible! {
    name: "Merge is commutative",
    check: || {
        let mut a1 = create_random_crdt();
        let mut b1 = create_random_crdt();
        let mut a2 = a1.clone();
        let mut b2 = b1.clone();

        // Merge in different orders
        a1.merge(&b1);
        b2.merge(&a2);

        let diff = (a1.state() - b2.state()).magnitude();
        TestResult::from_bool(diff < 1e-10, "Merge not commutative")
    }
}

// Rare: Convergence time
invariant_rare! {
    name: "Convergence within 50 operations",
    probability_bound: 1e-4,
    samples: 1000,
    check: |rng| {
        let mut nodes = create_random_network(10, rng);

        // Apply 50 random operations
        for _ in 0..50 {
            let node_idx = rng.gen_range(0..10);
            apply_random_op(&mut nodes[node_idx], rng);
        }

        // Sync all
        sync_all(&mut nodes);

        // Check convergence
        let max_divergence = compute_max_divergence(&nodes);
        TestResult::from_bool(max_divergence < 1e-6, "Did not converge")
    }
}

// Emergent: Track unusual merge patterns
emergent! {
    name: "Merge trajectory patterns",
    description: "Track how states evolve during merge",
    check: |trajectory: &[GA3]| {
        // Classify the trajectory
        if is_monotonic(trajectory) {
            EmergentResult::Known
        } else if has_oscillation(trajectory) {
            EmergentResult::Novel("Oscillating merge".into())
        } else {
            EmergentResult::Known
        }
    }
}
```

## Integration with cargo test

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_test::prelude::*;

    #[test]
    fn test_magnitude_positive() {
        verify_invariant! {
            name: "Magnitude is non-negative",
            check: || {
                let v = arbitrary_vector();
                TestResult::from_bool(v.magnitude() >= 0.0, "Negative magnitude")
            }
        }
    }

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

## Best Practices

### 1. Categorize Tests Correctly

```rust
// Impossible: Mathematical truths
invariant_impossible! { /* Magnitude ≥ 0 */ }

// Rare: Statistical properties
invariant_rare! { /* CRDT convergence */ }

// Emergent: Exploratory tracking
emergent! { /* Novel patterns */ }
```

### 2. Include Geometric Error Information

```rust
// Good: Include distance and context
TestResult::Fail(GeometricError {
    distance: diff,
    gradient: Some(compute_gradient(&state)),
    correction: Some(manifold.project(&state)),
    message: format!("State {} off manifold by {}", state, diff),
})

// Bad: Just a boolean
TestResult::from_bool(false, "Failed")
```

### 3. Use Manifolds for Complex Constraints

```rust
// Good: Define manifold of valid states
let valid_states = Manifold::new("Valid")
    .with_constraint(ManifoldConstraint::MaxMagnitude(100.0))
    .with_constraint(ManifoldConstraint::NonNegativeScalar);

valid_states.verify(&state)

// Bad: Ad-hoc checks
if state.magnitude() <= 100.0 && state.get(0) >= 0.0 { ... }
```

### 4. Generate Representative Test Data

```rust
// Good: Use geometric generators
let r = arbitrary_rotor();  // Guaranteed unit rotor
let v = arbitrary_unit_vector();  // Guaranteed unit vector

// Bad: Manual construction may be invalid
let r = GA3::from_coefficients(vec![...]);  // Might not be unit
```

## Next Steps

- [FRP Guide](./frp-guide.md) - Behavior and Event patterns
- [Distributed State Guide](./distributed-state-guide.md) - CRDT testing
- [Architecture ADRs](./architecture/) - Design decisions
