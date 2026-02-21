# cliffy-protocols

Distributed consensus protocols using geometric algebra.

## Overview

`cliffy-protocols` provides distributed systems primitives where conflicts are resolved geometrically. State transformations become geometric operations with closed-form solutions and guaranteed convergence.

## Modules

### Vector Clock
Causal ordering for distributed events:

```rust
use cliffy_protocols::VectorClock;

let mut clock = VectorClock::new();
clock.tick("node-1");
clock.tick("node-1");

let mut other = VectorClock::new();
other.tick("node-2");

// Causal ordering
assert!(clock.concurrent(&other));

// Merge clocks
let merged = clock.merge(&other);
```

### Geometric CRDT
Conflict-free replicated data types with geometric merge:

```rust
use cliffy_protocols::{GeometricCRDT, OperationType};

let mut crdt = GeometricCRDT::new("node-1", initial_state);

// Apply operations
crdt.apply_operation(value, OperationType::Addition);
crdt.apply_operation(factor, OperationType::Multiplication);

// Merge with another replica
let merged = crdt.merge(&other_crdt);
// Conflicts resolved via geometric mean - always converges!
```

### Lattice Operations
Join-semilattice for monotonic state:

```rust
use cliffy_protocols::{lattice_join, lattice_meet};

// Component-wise maximum (join)
let joined = lattice_join(&state_a, &state_b);

// Component-wise minimum (meet)
let met = lattice_meet(&state_a, &state_b);

// Lattice laws hold:
// - Commutative: join(a, b) = join(b, a)
// - Associative: join(join(a, b), c) = join(a, join(b, c))
// - Idempotent: join(a, a) = a
```

### Delta Synchronization
Efficient state sync with minimal bandwidth:

```rust
use cliffy_protocols::{compute_delta, apply_delta, DeltaBatch};

// Compute difference between states
let delta = compute_delta(&old_state, &new_state);

// Apply delta to reconstruct state
let reconstructed = apply_delta(&old_state, &delta);

// Batch multiple deltas
let mut batch = DeltaBatch::new();
batch.push(delta1);
batch.push(delta2);
let combined = batch.combine_additive();
```

### Storage
Snapshot + operation log persistence:

```rust
use cliffy_protocols::MemoryStore;

let store = MemoryStore::new();

// Save snapshots
store.save_snapshot(&state, &clock).await;

// Load latest
let snapshot = store.load_latest_snapshot().await;

// Recovery from operation log
let recovered = store.recover().await;
```

### Sync Protocol
P2P synchronization messages:

```rust
use cliffy_protocols::SyncState;

let mut sync = SyncState::new("node-1");

// Peer discovery
sync.register_peer("node-2", clock);

// Message handling
let hello = sync.create_hello("My Node");
let response = sync.handle_message(incoming_msg);

// Delta requests
let request = sync.create_delta_request(&since_clock);
```

### Geometric Consensus
Distributed agreement via geometric mean:

```rust
use cliffy_protocols::GeometricConsensus;

let mut consensus = GeometricConsensus::new("node-1", initial_state);

// Propose value
let round = consensus.propose(my_value);

// Receive proposals from others
consensus.receive_proposal("node-2", their_value, round);

// Vote
consensus.vote(round, true, preferred_value);

// Commit when majority reached
if let Some(value) = consensus.try_commit(round, num_participants) {
    // Consensus reached!
}
```

## The Geometric Insight

All conflict resolution uses geometric algebra:
- **State changes** = rotors/versors (geometric transformations)
- **Conflicts** = geometric distance from expected manifold
- **Resolution** = geometric mean (closed-form, always converges)
- **Composition** = geometric product (associative)

This means no ad-hoc conflict resolution logic - just geometry.

## Integration with Leptos

Build collaborative apps with Leptos and geometric CRDTs:

```rust
use leptos::*;
use cliffy_protocols::{GeometricCRDT, VectorClock};

#[component]
fn CollaborativeCounter() -> impl IntoView {
    let node_id = "browser-1";
    let (crdt, set_crdt) = create_signal(GeometricCRDT::new(node_id, 0.0));
    let (count, set_count) = create_signal(0.0);

    // Simulate receiving updates from other nodes
    let merge_remote = move |remote_state: GeometricCRDT| {
        set_crdt.update(|local| {
            let merged = local.merge(&remote_state);
            set_count.set(merged.value());
            *local = merged;
        });
    };

    let increment = move |_| {
        set_crdt.update(|crdt| {
            crdt.add(1.0);
            set_count.set(crdt.value());
        });
    };

    view! {
        <div>
            <p>"Collaborative count: " {count}</p>
            <button on:click=increment>"+"</button>
            <p class="hint">"Changes sync automatically with other users"</p>
        </div>
    }
}
```

## Integration with Yew

Real-time sync in Yew applications:

```rust
use yew::prelude::*;
use cliffy_protocols::{SyncState, VectorClock, GeometricCRDT};
use gloo_timers::callback::Interval;

#[function_component]
fn SyncedEditor() -> Html {
    let node_id = "yew-client";
    let sync = use_state(|| SyncState::new(node_id));
    let document = use_state(|| GeometricCRDT::new(node_id, 0.0));

    // Periodic sync with server
    use_effect_with((), {
        let sync = sync.clone();
        let document = document.clone();
        move |_| {
            let interval = Interval::new(1000, move || {
                // Create delta request for changes since last sync
                let request = sync.create_delta_request(&sync.local_clock());

                // In real app: send request via WebSocket
                // On response: merge incoming state
            });

            || drop(interval)
        }
    });

    let on_edit = {
        let document = document.clone();
        Callback::from(move |value: f64| {
            document.borrow_mut().add(value);
        })
    };

    html! {
        <div class="editor">
            <p>{ format!("Document state: {:.2}", document.value()) }</p>
            <button onclick={on_edit.reform(|_| 1.0)}>{ "Add 1" }</button>
            <span class="sync-status">{ "● Synced" }</span>
        </div>
    }
}
```

## License

MIT
