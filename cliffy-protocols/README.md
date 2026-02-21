# cliffy-protocols

Distributed consensus protocols using geometric algebra.

## Overview

cliffy-protocols provides distributed state synchronization primitives:

- **Geometric CRDTs** - Conflict-free replicated data types with GA merge
- **Lattice operations** - Join/meet for state convergence
- **Delta sync** - Efficient state delta encoding and application
- **Vector clocks** - Causality tracking for distributed events

## Usage

```rust
use cliffy_protocols::{GeometricCrdt, VectorClock, lattice_join};

// Create a distributed state
let mut crdt = GeometricCrdt::new("node-1");

// Apply local operations
crdt.apply_local(operation);

// Merge with remote state (always converges)
crdt.merge(&remote_crdt);

// Lattice operations for conflict resolution
let merged = lattice_join(&state_a, &state_b);
```

## Key Concepts

All state transformations are geometric operations:
- **State changes** = rotors/versors (geometric transformations)
- **Conflicts** = geometric distance from expected manifold
- **Resolution** = geometric mean (closed-form, always converges)
- **Composition** = geometric product (associative)

## Features

- Guaranteed convergence via geometric algebra
- Efficient delta encoding for network sync
- Causality tracking with vector clocks
- Designed for 10,000+ concurrent users

## License

MIT
