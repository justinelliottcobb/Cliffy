# Distributed State (Roadmap)

> **Status**: `cliffy-protocols` is a Rust crate for distributed state synchronization. WASM bindings are planned for Phase 3 of the roadmap.

This document describes the architecture and Rust API. TypeScript bindings will be added in a future release.

## Overview

Cliffy's distributed state uses geometric algebra for coordination-free synchronization:

- **State** is a point in geometric space (multivector)
- **Changes** are geometric transformations (rotors/versors)
- **Conflicts** resolve via geometric mean (always converges)
- **No coordination** required - local-first, sync when connected

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Node A    │     │   Node B    │     │   Node C    │
│  State: 5   │     │  State: 3   │     │  State: 7   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    Geometric Mean
                           │
                           ▼
                    Converged: ~4.7
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application State                             │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    GeometricCRDT                                 │
│  Operations, VectorClock, causal ordering                       │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    GeometricLattice                              │
│  Join, meet, dominance, divergence                              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Sync Layer                                    │
│  Delta computation, storage, persistence                        │
└─────────────────────────────────────────────────────────────────┘
```

## Rust API (cliffy-protocols)

### GeometricCRDT

```rust
use cliffy_protocols::{GeometricCRDT, OperationType};
use cliffy_core::GA3;
use uuid::Uuid;

// Each node needs a unique ID
let node_id = Uuid::new_v4();

// Create CRDT with initial state
let mut crdt = GeometricCRDT::new(node_id, GA3::scalar(0.0));

// Create and apply operations
let op = crdt.create_operation(GA3::scalar(5.0), OperationType::Addition);
crdt.apply_operation(op);

// Merge with another node
crdt.merge(&other_crdt);
```

### Operation Types

| Type | Formula | Use Case |
|------|---------|----------|
| `Addition` | `state + operand` | Counters, positions |
| `Multiplication` | `state * operand` | Scaling, composition |
| `Sandwich` | `op * state * reverse(op)` | Rotations, reflections |
| `Exponential` | `exp(operand)` | Interpolation setup |

### Vector Clock

```rust
use cliffy_protocols::VectorClock;

let mut clock = VectorClock::new();
clock.increment(node_id);

// Compare for causal ordering
match clock_a.partial_cmp(&clock_b) {
    Some(Ordering::Less) => println!("A happened before B"),
    Some(Ordering::Greater) => println!("B happened before A"),
    None => println!("Concurrent - no causal relationship"),
}
```

### Geometric Lattice

```rust
use cliffy_protocols::lattice::{GeometricLattice, GA3Lattice};

let a = GA3::scalar(5.0);
let b = GA3::scalar(3.0);

// Join: geometric mean (always converges)
let joined = GA3Lattice::join(&a, &b);

// Check dominance (partial order)
let dominates = GA3Lattice::dominates(&a, &b);

// Measure divergence
let divergence = GA3Lattice::divergence(&a, &b);
```

## Future: TypeScript API (Phase 3)

When WASM bindings are added, the API will look like:

```typescript
// Future API - not yet implemented
import { GeometricCRDT, OperationType } from '@cliffy/protocols';

const crdt = new GeometricCRDT(nodeId, initialState);

crdt.apply({
    type: OperationType.Addition,
    operand: 5.0
});

// Auto-sync with peers
crdt.connect(signalingServer);

crdt.onSync((delta, peerId) => {
    console.log(`Synced with ${peerId}`);
});
```

## Roadmap

| Phase | Feature |
|-------|---------|
| Phase 2 | Revive cliffy-protocols, update to amari-core 0.17+ |
| Phase 3 | WebRTC sync, WASM bindings, TypeScript API |
| Phase 6 | Scale testing (10,000+ concurrent users) |

## Why Geometric CRDTs?

Traditional CRDTs require designing merge functions for each data type. Cliffy's geometric approach provides:

| Traditional CRDT | Geometric CRDT |
|------------------|----------------|
| Per-type merge logic | Universal geometric mean |
| Application-specific | Works for any representable state |
| May not compose | Algebraic composition |
| Convergence by design | Convergence by mathematics |

## Next Steps

- [Getting Started](./getting-started.md) - Core concepts
- [FRP Guide](./frp-guide.md) - Reactive patterns
- [Architecture](./architecture/) - Design decisions
- [ROADMAP.md](../ROADMAP.md) - Full development roadmap
