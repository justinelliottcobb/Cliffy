# Distributed State Guide

Cliffy provides coordination-free distributed state using geometric algebra. This guide covers `cliffy-protocols`: CRDTs, lattices, synchronization, and persistence.

## Why Geometric CRDTs?

Traditional CRDTs require designing merge functions for each data type. Cliffy's geometric approach provides:

| Traditional CRDT | Geometric CRDT |
|------------------|----------------|
| Per-type merge logic | Universal geometric mean |
| Application-specific | Works for any representable state |
| May not compose | Algebraic composition |
| Convergence by design | Convergence by mathematics |

## Core Components

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
│  Delta computation, P2P protocol, storage                       │
└─────────────────────────────────────────────────────────────────┘
```

## GeometricCRDT

The core CRDT implementation with geometric operations.

### Creating a CRDT

```rust
use cliffy_protocols::{GeometricCRDT, OperationType};
use cliffy_core::GA3;
use uuid::Uuid;

// Each node needs a unique ID
let node_id = Uuid::new_v4();

// Create CRDT with initial state
let mut crdt = GeometricCRDT::new(node_id, GA3::scalar(0.0));

// Access current state
let state = crdt.state();
println!("Current state: {:?}", state);
```

### Operations

Operations are geometric transformations applied to state:

```rust
use cliffy_protocols::{GeometricCRDT, OperationType};
use cliffy_core::GA3;

let mut crdt = GeometricCRDT::new(node_id, GA3::scalar(0.0));

// Addition: state = state + operand
let add_op = crdt.create_operation(GA3::scalar(5.0), OperationType::Addition);
crdt.apply_operation(add_op);

// Multiplication: state = state * operand (geometric product)
let mul_op = crdt.create_operation(GA3::scalar(2.0), OperationType::Multiplication);
crdt.apply_operation(mul_op);

// Sandwich: state = operand * state * reverse(operand)
// This is how rotations work in geometric algebra
let rotor = /* create rotor */;
let rot_op = crdt.create_operation(rotor, OperationType::Sandwich);
crdt.apply_operation(rot_op);

// Exponential: state = exp(operand)
let exp_op = crdt.create_operation(GA3::scalar(1.0), OperationType::Exponential);
crdt.apply_operation(exp_op);
```

### Operation Types

| Type | Formula | Use Case |
|------|---------|----------|
| `Addition` | `state + operand` | Counters, positions |
| `Multiplication` | `state * operand` | Scaling, composition |
| `Sandwich` | `op * state * reverse(op)` | Rotations, reflections |
| `Exponential` | `exp(operand)` | Interpolation setup |

### Merging CRDTs

When two nodes have diverged, merge them:

```rust
// Node A and Node B have different states
let mut crdt_a = GeometricCRDT::new(node_a_id, GA3::scalar(0.0));
let mut crdt_b = GeometricCRDT::new(node_b_id, GA3::scalar(0.0));

// A adds 5
crdt_a.apply_operation(crdt_a.create_operation(GA3::scalar(5.0), OperationType::Addition));

// B adds 3
crdt_b.apply_operation(crdt_b.create_operation(GA3::scalar(3.0), OperationType::Addition));

// Merge: uses geometric mean for conflict resolution
crdt_a.merge(&crdt_b);

// Both nodes converge to same state
assert_eq!(crdt_a.state(), crdt_b.state());
```

## Vector Clocks

Vector clocks track causality in distributed operations.

```rust
use cliffy_protocols::VectorClock;
use uuid::Uuid;

let node_a = Uuid::new_v4();
let node_b = Uuid::new_v4();

let mut clock_a = VectorClock::new();
let mut clock_b = VectorClock::new();

// Node A performs operation
clock_a.increment(node_a);

// Node B performs operation
clock_b.increment(node_b);

// Check ordering
match clock_a.partial_cmp(&clock_b) {
    Some(Ordering::Less) => println!("A happened before B"),
    Some(Ordering::Greater) => println!("B happened before A"),
    Some(Ordering::Equal) => println!("Same logical time"),
    None => println!("Concurrent - no causal relationship"),
}

// Merge clocks (take component-wise max)
clock_a.merge(&clock_b);
```

## Geometric Lattice

The lattice provides mathematical guarantees for convergence.

### Lattice Properties

A lattice provides `join` (least upper bound) and `meet` (greatest lower bound) operations that satisfy:

- **Commutative**: `join(a, b) = join(b, a)`
- **Associative**: `join(join(a, b), c) = join(a, join(b, c))`
- **Idempotent**: `join(a, a) = a`

### Using the Lattice Trait

```rust
use cliffy_protocols::lattice::{GeometricLattice, GA3Lattice};
use cliffy_core::GA3;

let a = GA3::scalar(5.0);
let b = GA3::scalar(3.0);

// Join: geometric mean (always converges)
let joined = GA3Lattice::join(&a, &b);

// Meet: geometric meet
let met = GA3Lattice::meet(&a, &b);

// Check dominance (partial order)
let dominates = GA3Lattice::dominates(&a, &b);

// Measure divergence (geometric distance)
let divergence = GA3Lattice::divergence(&a, &b);
```

### Component Lattice

For multi-component state, use component-wise operations:

```rust
use cliffy_protocols::lattice::ComponentLattice;

// Component-wise join (max of each coefficient)
let joined = ComponentLattice::join(&a, &b);

// Component-wise meet (min of each coefficient)
let met = ComponentLattice::meet(&a, &b);
```

## Delta Synchronization

Efficient state sync using deltas instead of full state.

### Computing Deltas

```rust
use cliffy_protocols::delta::{compute_delta, apply_delta, DeltaEncoding};
use cliffy_core::GA3;

let old_state = GA3::scalar(5.0);
let new_state = GA3::scalar(8.0);

// Compute minimal delta
let delta = compute_delta(&old_state, &new_state, DeltaEncoding::Additive);

// Apply delta to catch up
let recovered = apply_delta(&old_state, &delta);
assert_eq!(recovered, new_state);
```

### Delta Encoding Types

| Encoding | Formula | Best For |
|----------|---------|----------|
| `Additive` | `new - old` | Counters, positions |
| `Multiplicative` | `new * inverse(old)` | Rotations, scales |
| `Compressed` | Automatic selection | Unknown patterns |

### Delta Batching

Combine multiple deltas for efficiency:

```rust
use cliffy_protocols::delta::DeltaBatch;

let mut batch = DeltaBatch::new();

// Accumulate deltas
batch.add(delta1);
batch.add(delta2);
batch.add(delta3);

// Combine into single delta
let combined = batch.combine();

// Apply once instead of three times
let final_state = apply_delta(&initial_state, &combined);
```

## Sync Protocol

P2P synchronization between nodes.

### Sync State

```rust
use cliffy_protocols::sync::{SyncState, SyncConfig, PeerInfo};
use uuid::Uuid;

let node_id = Uuid::new_v4();
let config = SyncConfig::default();

let mut sync = SyncState::new(node_id, config);

// Register a peer
let peer_id = Uuid::new_v4();
sync.register_peer(peer_id, PeerInfo {
    capabilities: PeerCapabilities::default(),
    // ...
});
```

### Sync Messages

```rust
use cliffy_protocols::sync::{SyncMessage, SyncPayload};

// Hello message (initial handshake)
let hello = SyncMessage::Hello {
    node_id,
    clock: current_clock.clone(),
    capabilities: my_capabilities,
};

// Delta request
let request = SyncMessage::DeltaRequest {
    since_clock: last_known_clock,
};

// Delta response
let response = SyncMessage::DeltaResponse {
    deltas: vec![delta1, delta2],
    clock: current_clock,
};

// Handle incoming message
match sync.handle_message(peer_id, message) {
    Ok(Some(response)) => send_to_peer(peer_id, response),
    Ok(None) => { /* No response needed */ },
    Err(e) => handle_error(e),
}
```

### Peer Connection States

```rust
use cliffy_protocols::sync::PeerConnectionState;

match peer.connection_state {
    PeerConnectionState::Disconnected => { /* Not connected */ },
    PeerConnectionState::Connecting => { /* Handshake in progress */ },
    PeerConnectionState::Connected => { /* Ready for sync */ },
    PeerConnectionState::Syncing => { /* Actively syncing */ },
    PeerConnectionState::Error(msg) => { /* Connection error */ },
}
```

## Storage

Persist state with snapshots and operation logs.

### Memory Store

```rust
use cliffy_protocols::storage::{MemoryStore, GeometricStore};
use cliffy_core::GA3;

let mut store = MemoryStore::new();

// Save snapshot
let clock = VectorClock::new();
store.save_snapshot(GA3::scalar(42.0), &clock);

// Load snapshot
if let Some((state, clock)) = store.load_snapshot() {
    println!("Restored state: {:?}", state);
}

// Append operation
store.append_operation(&operation);

// Replay from a point
let ops = store.replay_from(&some_clock);
for op in ops {
    crdt.apply_operation(op);
}
```

### Compaction

Prevent unbounded log growth:

```rust
// Compact: create snapshot, prune old operations
store.compact();

// Or manually control
let stats = store.stats();
if stats.operation_count > 1000 {
    store.compact();
}
```

### Storage Stats

```rust
let stats = store.stats();
println!("Snapshots: {}", stats.snapshot_count);
println!("Operations: {}", stats.operation_count);
println!("Total size: {} bytes", stats.total_size);
```

## Consensus

For operations requiring agreement across nodes.

```rust
use cliffy_protocols::consensus::GeometricConsensus;

// Consensus uses geometric mean to find agreement
let proposals = vec![
    GA3::scalar(5.0),
    GA3::scalar(7.0),
    GA3::scalar(6.0),
];

let consensus = GeometricConsensus::compute(&proposals);
// Result: geometric mean of all proposals
```

## Complete Example: Collaborative Counter

```rust
use cliffy_protocols::{
    GeometricCRDT, OperationType,
    delta::{compute_delta, apply_delta, DeltaEncoding},
    storage::{MemoryStore, GeometricStore},
    sync::{SyncState, SyncConfig, SyncMessage},
};
use cliffy_core::GA3;
use uuid::Uuid;

// Two users: Alice and Bob
let alice_id = Uuid::new_v4();
let bob_id = Uuid::new_v4();

// Each has their own CRDT
let mut alice_crdt = GeometricCRDT::new(alice_id, GA3::scalar(0.0));
let mut bob_crdt = GeometricCRDT::new(bob_id, GA3::scalar(0.0));

// Alice increments by 5
let alice_op = alice_crdt.create_operation(GA3::scalar(5.0), OperationType::Addition);
alice_crdt.apply_operation(alice_op.clone());

// Bob increments by 3 (concurrently)
let bob_op = bob_crdt.create_operation(GA3::scalar(3.0), OperationType::Addition);
bob_crdt.apply_operation(bob_op.clone());

// Now: Alice has 5, Bob has 3

// Sync via deltas
let alice_state = alice_crdt.state();
let bob_state = bob_crdt.state();

// Merge (geometric mean resolves conflict)
alice_crdt.merge(&bob_crdt);
bob_crdt.merge(&alice_crdt);

// Both converge to same value
assert_eq!(alice_crdt.state(), bob_crdt.state());
println!("Converged state: {:?}", alice_crdt.state());
```

## Best Practices

### 1. Use Appropriate Operation Types

```rust
// Counters: Addition
crdt.create_operation(GA3::scalar(1.0), OperationType::Addition);

// Rotations: Sandwich
crdt.create_operation(rotor, OperationType::Sandwich);

// Scaling: Multiplication
crdt.create_operation(GA3::scalar(2.0), OperationType::Multiplication);
```

### 2. Batch Operations for Efficiency

```rust
// Bad: Send after every operation
for change in changes {
    crdt.apply_operation(change);
    sync.broadcast(change);  // N messages
}

// Good: Batch and send delta
for change in changes {
    crdt.apply_operation(change);
}
let delta = compute_delta(&old_state, &crdt.state(), DeltaEncoding::Compressed);
sync.broadcast_delta(delta);  // 1 message
```

### 3. Compact Storage Periodically

```rust
// Check and compact when needed
if store.stats().operation_count > MAX_OPS {
    store.compact();
}
```

### 4. Handle Network Partitions

```rust
// Operations continue during partition
crdt.apply_operation(local_op);

// When reconnected, merge
crdt.merge(&remote_crdt);
// Geometric mean ensures convergence
```

## Next Steps

- [Algebraic TSX Guide](./algebraic-tsx-guide.md) - Component model
- [Testing Guide](./testing-guide.md) - Geometric invariant testing
- [Architecture ADRs](./architecture/) - Design decisions
