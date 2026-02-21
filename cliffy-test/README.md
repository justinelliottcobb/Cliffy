# cliffy-test

Algebraic testing framework for geometric algebra applications.

## Overview

`cliffy-test` provides property-based testing with geometric algebra semantics. Tests are expressed as geometric invariants with probabilistic guarantees.

## Invariant Categories

### Impossible (P = 0)
Properties that must **never** fail:

```rust
use cliffy_test::invariant_impossible;

invariant_impossible!(
    "Rotor normalization preserves unit magnitude",
    || {
        let r = random_rotor();
        let normalized = r.normalize();
        (normalized.magnitude() - 1.0).abs() < 1e-10
    }
);
```

### Rare (0 < P << 1)
Properties with bounded failure probability:

```rust
use cliffy_test::invariant_rare;

invariant_rare!(
    "Hash collision rate",
    probability = 0.001,  // Must fail less than 0.1% of the time
    || {
        let a = random_state();
        let b = random_state();
        a.hash() != b.hash()  // Different states should have different hashes
    }
);
```

### Emergent (P > 0)
Valid but unpredicted behaviors worth tracking:

```rust
use cliffy_test::emergent;

emergent!(
    "Convergence happens in fewer than 10 iterations",
    || {
        let iterations = run_consensus();
        iterations < 10
    }
);
```

## Manifold Testing

Test that states lie on expected geometric manifolds:

```rust
use cliffy_test::{Manifold, unit_sphere, rotor_manifold};

// Unit sphere: pure vectors with magnitude 1
let sphere = unit_sphere();
assert!(sphere.contains(&unit_vector));

// Rotor manifold: unit magnitude elements
let rotor_m = rotor_manifold();
let result = rotor_m.verify(&rotor.coefficients());
assert!(result.is_pass());

// Custom manifolds
let custom = Manifold::new("MyManifold")
    .with_magnitude(2.0)
    .with_pure_vector()
    .with_tolerance(1e-8);
```

## Random Generators

Generate random geometric objects for property testing:

```rust
use cliffy_test::{random_ga3, random_rotor, random_unit_vector};

let mv = random_ga3();           // Random multivector
let r = random_rotor();          // Random unit rotor
let v = random_unit_vector();    // Random unit vector
```

## Geometric Assertions

```rust
use cliffy_test::{assert_ga3_equal, assert_magnitude, assert_zero};

// Compare multivectors within tolerance
let result = assert_ga3_equal(&a, &b, 1e-10);
assert!(result.is_pass());

// Check magnitude
let result = assert_magnitude(&rotor, 1.0, 1e-10);
assert!(result.is_pass());

// Check if approximately zero
let result = assert_zero(&difference, 1e-10);
assert!(result.is_pass());
```

## Test Results

Results include geometric error information:

```rust
use cliffy_test::TestResult;

let result = manifold.verify(&point);
if result.is_fail() {
    let error = result.error().unwrap();
    println!("Distance from manifold: {}", error.distance);
    println!("Correction gradient: {:?}", error.gradient);
}
```

## Integration with QuickCheck

Works with standard property testing:

```rust
use quickcheck_macros::quickcheck;
use cliffy_test::ArbitraryRotor;

#[quickcheck]
fn rotor_composition_is_associative(a: ArbitraryRotor, b: ArbitraryRotor, c: ArbitraryRotor) -> bool {
    let left = (a.0 * b.0) * c.0;
    let right = a.0 * (b.0 * c.0);
    (left - right).magnitude() < 1e-10
}
```

## License

MIT
