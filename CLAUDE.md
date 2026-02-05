# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vision

Cliffy enables building collaborative applications at Google Docs scale (10,000+ concurrent users) where **distributed systems problems become geometric algebra problems** with closed-form solutions and guaranteed convergence.

### The Core Insight

All state transformations are geometric operations in Clifford algebra:
- **State changes** = rotors/versors (geometric transformations)
- **Conflicts** = geometric distance from expected manifold
- **Resolution** = geometric mean (closed-form, always converges)
- **Composition** = geometric product (associative)

### What Developers See vs What Happens

```typescript
// What developers write (Algebraic TSX):
import { behavior } from 'cliffy-wasm';
import { html, mount } from 'cliffy-wasm/html';

const count = behavior(0);

const app = html`
  <div class="counter">
    <span>Count: ${count}</span>
    <button onclick=${() => count.update(n => n + 1)}>+</button>
  </div>
`;

mount(app, '#app');

// What actually happens (hidden from users):
// - Value stored as GA3 multivector in Rust/WASM
// - Updates are geometric transformations
// - DOM updates via subscription (no virtual DOM)
// - Conflicts resolve via geometric mean
// - Distributed sync uses lattice join
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Applications                              │
│  (Collaborative Docs, Games, Design Tools, Whiteboards)         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────────────────┐     ┌───────────────────────────────┐
│        Algebraic TSX          │     │      Trebek (Mobile)          │
│  (Web: dataflow → DOM)        │     │  (RN/Lynx: machines → native) │
└───────────────────────────────┘     └───────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Synchronization Layer                         │
│  (WebRTC, deltas, persistence, peer discovery)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Distributed State                             │
│  (Geometric CRDT, lattice join, vector clocks, merge)           │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  Geometric State Layer                           │
│  (Rotors, versors, projections, transformations)                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        FRP Core                                  │
│  cliffy-core: Behavior<T>, Event<T>, combinators                │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Geometric Algebra                             │
│  amari-core: GA3, rotors, exponentials, products                │
└─────────────────────────────────────────────────────────────────┘
```

## Current State

### Active Crates

| Crate | Tests | Description |
|-------|-------|-------------|
| `cliffy-core` | 79 | FRP primitives (Behavior, Event) with GA3 internally |
| `cliffy-wasm` | - | WASM bindings + html.ts (Algebraic TSX) |
| `cliffy-purescript` | - | PureScript bindings with type-safe Html DSL |
| `cliffy-protocols` | 42 | Distributed state (CRDT, sync, storage) |
| `cliffy-test` | 25 | Geometric testing framework |
| `cliffy-gpu` | 18 | WebGPU acceleration (SIMD fallback) |
| `cliffy-loadtest` | 15 | Scale testing simulator |

### Scaffolding

- `tools/create-cliffy` — CLI to scaffold new projects (`npx create-cliffy`)

### Archived

- `cliffy-alive` — Living UI / cellular automata
- `cliffy-typescript` — Deprecated by WASM-first approach

## Development Standards

Cliffy follows Industrial Algebra project conventions:

### Idiomatic Rust
- Leverage the type system fully (enums, traits, generics)
- Prefer `Result`/`Option` over exceptions/nulls
- Use iterators and combinators over manual loops
- Follow Rust API guidelines

### Phantom Types for Type-Level Safety
```rust
use std::marker::PhantomData;

pub struct Document<S: DocumentState> {
    content: String,
    _state: PhantomData<S>,
}

pub struct Draft;
pub struct Published;

impl Document<Draft> {
    pub fn publish(self) -> Document<Published> { ... }
}
// Can't publish a Published document - doesn't compile
```

### Contracts via amari-flynn
```rust
use amari_flynn::prelude::*;

#[requires(probability > 0.0 && probability < 1.0)]
#[ensures(result.probability() == probability)]
pub fn create_rare_event(probability: f64) -> RareEvent<()> {
    RareEvent::new(probability, "event")
}
```

### Rayon for Parallelism
```rust
use rayon::prelude::*;

pub fn parallel_geometric_mean(states: &[GA3]) -> GA3 {
    states.par_iter()
        .map(|s| s.log())
        .reduce(GA3::zero, |a, b| &a + &b)
        .exp()
}
```

## Build Commands

```bash
# Build WASM package (includes html.ts)
npm run build                   # wasm-pack + post-build
npm run build:release           # Optimized release build

# Test
cargo test --workspace          # 179 tests
cargo test --doc                # 30 doctests

# Development
npm run dev                     # cargo watch + rebuild WASM

# Scaffold new project
npx create-cliffy my-app --template typescript-vite
```

## Classical FRP (Not React Hooks)

Cliffy follows Conal Elliott's original FRP semantics:

- **`Behavior<T>`** = `Time → T` — A continuous, time-varying value
- **`Event<T>`** = `[(Time, T)]` — Discrete occurrences over time

| Concept | React Hooks | Cliffy FRP |
|---------|-------------|------------|
| State | `useState` | `Behavior<T>` (continuous signal) |
| Effects | `useEffect` + deps | `subscribe`/`map` (automatic) |
| Derived | `useMemo` + deps | `behavior.map()` (automatic) |
| Combined | Multiple hooks | `combine(a, b, f)` (declarative) |

**Never implement React-style hooks. The reactive graph handles everything.**

## API Reference

### Behavior<T>
```typescript
const count = behavior(0);
count.sample();                              // Get current value
count.set(10);                               // Set directly
count.update(n => n + 1);                    // Transform
count.subscribe(n => console.log(n));        // React to changes
count.map(n => n * 2);                       // Derive new behavior
combine(a, b, (x, y) => x + y);              // Combine behaviors
```

### Event<T>
```typescript
const clicks = event<MouseEvent>();
clicks.emit(mouseEvent);                     // Fire event
clicks.subscribe(e => handle(e));            // Listen
clicks.map(e => e.clientX);                  // Transform
clicks.filter(e => e.button === 0);          // Filter
clicks.fold(0, (acc, _) => acc + 1);         // Accumulate into Behavior
```

## Algebraic TSX (Rendering)

Cliffy uses **Algebraic TSX** for rendering - Behaviors in templates automatically update the DOM without virtual DOM diffing.

### TypeScript: html`` Tagged Template

```typescript
import { behavior } from 'cliffy-wasm';
import { html, mount } from 'cliffy-wasm/html';

const count = behavior(0);
const label = behavior('Clicks');

// Behaviors in ${} automatically subscribe and update DOM
const app = html`
  <div class="counter">
    <h1>${label}: ${count}</h1>
    <button onclick=${() => count.update(n => n + 1)}>+</button>
    <button onclick=${() => count.update(n => n - 1)}>-</button>
  </div>
`;

// Returns cleanup function
const cleanup = mount(app, '#app');
```

### PureScript: Type-Safe Html DSL

```purescript
import Cliffy (behavior, update)
import Cliffy.Html (div, h1_, button, text, behaviorText, mount)
import Cliffy.Html.Attributes (className)
import Cliffy.Html.Events (onClick)

counter :: Effect Html
counter = do
  count <- behavior 0

  pure $ div [ className "counter" ]
    [ h1_ [ text "Clicks: ", behaviorText count ]
    , button [ onClick \_ -> update (_ + 1) count ] [ text "+" ]
    , button [ onClick \_ -> update (_ - 1) count ] [ text "-" ]
    ]
```

### Key Principles

- **No Virtual DOM**: Behaviors subscribe directly to DOM nodes
- **Automatic Cleanup**: `mount()` returns cleanup function for subscriptions
- **Composable**: Nest `html` templates or create component functions
- **Type-Safe**: PureScript DSL catches attribute/event errors at compile time

## Roadmap

See `ROADMAP.md` for full details. Summary:

| Phase | Focus |
|-------|-------|
| **0** | Algebraic Testing (cliffy-test + amari-flynn) |
| **1** | Geometric State (rotors, versors, projections) |
| **2** | Distributed State (CRDT revival, lattice join) |
| **3** | Synchronization (WebRTC, deltas, persistence) |
| **4** | Algebraic TSX (composable components, dataflow graphs) |
| **5** | Edge Computing (WebGPU, distributed compute) |
| **6** | Production (scale testing, docs, examples) |
| **7** | Native Mobile (Trebek: RN + Lynx middleware) |

## Key Principles

### DO
- Hide geometric algebra from users
- Use classical FRP patterns (Behavior, Event, combinators)
- Work bottom-up: cliffy-core → cliffy-wasm → user code
- Use phantom types for compile-time guarantees
- Use amari-flynn contracts for verification
- Use rayon for data parallelism

### DON'T
- Expose GA types to users (GA3, Multivector, etc.)
- Implement React-style hooks
- Add functionality in JS that belongs in Rust
- Create virtual DOM or reconciliation

## Git Workflow

```
main (stable)
  └── develop (integration)
        └── feature/xyz (feature branches)
```

**Pre-commit**: fmt, clippy, unit tests
**Pre-push**: full tests, doctests, build, WASM build

## Key Files

| File | Purpose |
|------|---------|
| `cliffy-core/src/behavior.rs` | Behavior<T> implementation |
| `cliffy-core/src/event.rs` | Event<T> implementation |
| `cliffy-core/src/combinators.rs` | when, combine, if_else |
| `cliffy-core/src/geometric.rs` | GA conversion (internal) |
| `cliffy-wasm/src/lib.rs` | WASM exports |
| `cliffy-wasm/src/html.ts` | Algebraic TSX tagged template |
| `cliffy-purescript/src/Cliffy.purs` | PureScript FRP primitives |
| `cliffy-purescript/src/Cliffy/Html.purs` | Type-safe Html DSL |
| `tools/create-cliffy/` | Project scaffolding CLI |
| `ROADMAP.md` | Full development roadmap |
| `BACKLOG.md` | Technical debt and planned work |

## Remember

> **Simple API. Elegant internals. Classical FRP. Geometric algebra. No React patterns.**

When in doubt: "Would Conal Elliott approve? Does it compose geometrically?"
