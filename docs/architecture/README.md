# Cliffy Architecture

This directory contains architecture documentation for Cliffy, including Architecture Decision Records (ADRs) that document key design decisions.

## Overview

Cliffy is a reactive UI framework where state changes are geometric algebra operations. This architectural approach enables:

- **Automatic conflict resolution** in distributed systems
- **Composable state transformations** via geometric product
- **Coordination-free synchronization** using geometric mean

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Applications                              │
│  (Collaborative Docs, Games, Design Tools, Whiteboards)         │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      JavaScript/TypeScript                       │
│  User-facing API: behavior(), event(), combine()                │
└─────────────────────────────────────────────────────────────────┘
                              │ WASM boundary
┌─────────────────────────────────────────────────────────────────┐
│                         cliffy-wasm                              │
│  wasm-bindgen exports, JS↔Rust type conversion                  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         cliffy-core                              │
│  Behavior<T>, Event<T>, combinators, geometric conversions      │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         amari-core                               │
│  Multivector<P,Q,R>, geometric product, rotors, versors         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### cliffy-core

The Rust core library providing:

- **Behavior<T>**: Time-varying values with automatic dependency tracking
- **Event<T>**: Discrete event streams
- **Combinators**: `map`, `combine`, `when`, `if_else`, `fold`
- **Geometric conversion**: Transparent conversion between user types and GA3 multivectors

### cliffy-wasm

WebAssembly bindings via wasm-bindgen:

- JavaScript class wrappers for Behavior and Event
- Type conversion between JS and Rust
- Memory management for reactive subscriptions

### amari-core

External geometric algebra library providing:

- Multivector representation with configurable signature
- Geometric, inner, and outer products
- Rotor and versor operations
- Exponential and logarithm maps

## Data Flow

```
User Code                    Cliffy                         Storage
─────────                    ──────                         ───────

behavior(42)  ──────────►  GA3 multivector  ◄─────────►  [42.0, 0, ...]
     │                     (scalar=42.0)
     │
     ▼
count.update(+1)  ────►  Geometric transform  ────►  [43.0, 0, ...]
     │                   (translation rotor)
     │
     ▼
count.map(×2)  ───────►  Derived behavior  ────────►  86
     │                   (auto-updates)
     │
     ▼
count.subscribe()  ───►  Callback invoked on change
```

## Architecture Decision Records

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](./ADR-001-geometric-algebra-foundation.md) | Geometric Algebra as Foundation | Accepted |
| [ADR-002](./ADR-002-classical-frp.md) | Classical FRP over React Hooks | Accepted |
| [ADR-003](./ADR-003-wasm-first.md) | WASM-First Architecture | Accepted |
| [ADR-004](./ADR-004-hidden-complexity.md) | Hidden Geometric Complexity | Accepted |

## Design Principles

### 1. Simple API, Elegant Internals

Users interact with familiar JavaScript APIs. The geometric algebra complexity is entirely hidden:

```typescript
// Users write this:
const count = behavior(0);
count.update(n => n + 1);

// They never see this:
// GA3 multivector storage, rotor transformations, geometric mean
```

### 2. Classical FRP Semantics

Following Conal Elliott's original FRP formulation:

- `Behavior<T>` = `Time → T` (continuous, always has value)
- `Event<T>` = `[(Time, T)]` (discrete occurrences)

No React-style hooks, no dependency arrays, no rules.

### 3. Composition via Algebra

All operations compose algebraically:

- Behaviors compose via `combine()`
- Transformations compose via geometric product
- Conflicts resolve via geometric mean

### 4. Distributed by Design

The geometric foundation enables coordination-free distributed systems:

- State is a point in geometric space
- Changes are geometric transformations (rotors)
- Merging is geometric mean (always converges)

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| `behavior(value)` | O(1) | Single allocation |
| `behavior.sample()` | O(1) | Read current value |
| `behavior.set(value)` | O(n) | n = subscriber count |
| `behavior.map(fn)` | O(1) | Lazy evaluation |
| `combine(a, b, fn)` | O(1) | Lazy evaluation |
| `event.emit(value)` | O(n) | n = subscriber count |

## Memory Model

- Behaviors hold strong references to dependencies
- Subscribers are stored in Rc<RefCell<Vec<...>>>
- WASM memory is managed by wasm-bindgen
- JavaScript values crossing the boundary are copied

## Thread Safety

The current implementation is single-threaded (typical for browser WASM). Future versions may support:

- Web Workers via message passing
- SharedArrayBuffer for shared state
- Atomics for lock-free updates

## Further Reading

- [Getting Started Guide](../getting-started.md) - Installation and first app
- [FRP Guide](../frp-guide.md) - Behavior, Event, and reactive patterns
- [DOM Projection Guide](../dom-projection-guide.md) - Efficient DOM rendering without virtual DOM
- [Geometric Algebra Primer](../geometric-algebra-primer.md) - GA concepts for developers
- [Algebraic TSX Architecture](../algebraic-tsx-guide.md) - Internal component model and dataflow
- [Distributed State (Roadmap)](../distributed-state-guide.md) - CRDT and synchronization (future)
- [Testing (Roadmap)](../testing-guide.md) - Geometric invariant testing (future)
- [ROADMAP.md](../../ROADMAP.md) - Development roadmap
