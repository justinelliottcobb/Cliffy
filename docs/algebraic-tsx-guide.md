# Algebraic TSX Architecture

> **Note**: This document describes the internal architecture of Cliffy's rendering system. For the user-facing API, see the [DOM Projection Guide](./dom-projection-guide.md).

## Overview

Algebraic TSX is Cliffy's approach to UI rendering. Unlike virtual DOM frameworks, Cliffy projects geometric state directly to DOM operations without reconciliation.

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Code (TypeScript)                        │
│  Behavior, Event, DOMProjection, GeometricState                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                        WASM boundary
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Internal (Rust)                               │
│  Component trait, DataflowGraph, Element tree                   │
│  (Not exposed via WASM - implementation detail)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Architecture?

### Traditional Virtual DOM

```
State Change → Render → Virtual Tree → Diff → Patch → DOM
```

Problems:
- Full render on every state change
- O(n) diffing algorithm
- Memory allocation for virtual nodes
- Reconciliation overhead

### Cliffy's Direct Projection

```
State Change → Projection → DOM Property
```

Benefits:
- Only update affected properties
- O(1) targeted updates
- No virtual nodes allocated
- No reconciliation

## User-Facing API

The TypeScript API provides:

- **`DOMProjection`** - Connect state to a DOM property
- **`ProjectionScheduler`** - Batch updates to animation frames
- **`ElementProjections`** - Multiple projections on one element
- **`stateToTransform`** - Create CSS transform strings
- **`stateToColor`** - Create CSS color strings

See [DOM Projection Guide](./dom-projection-guide.md) for usage.

## Internal Architecture (Rust)

These types exist in `cliffy-core` but are not exposed via WASM:

### Component Trait

Components are geometric morphisms from state to renderable elements:

```rust
pub trait Component: Send + Sync {
    fn render(&self, state: &GA3) -> Element;
    fn initial_state(&self) -> GA3;
}
```

### DataflowGraph

Static representation of data transformations:

```rust
pub struct DataflowGraph {
    nodes: HashMap<NodeId, Node>,
    edges: Vec<Edge>,
}

pub enum NodeKind {
    Source { name: String },
    Projection { name: String, projection_type: String },
    Transform { transform_type: TransformType },
    Sink { name: String, dom_property: String },
    Combine { combiner: String },
    Conditional { condition: String },
    Constant { value: f64 },
}
```

### Element Tree

Render output structure (not virtual DOM):

```rust
pub enum ElementKind {
    Tag(String),
    Text(String),
    Fragment,
    ComponentRef(Box<dyn Component>),
    Empty,
}
```

## Future Work

The roadmap includes exposing more of the component model to TypeScript:

- **Phase 4**: Algebraic TSX macros for Rust
- **Phase 8+**: Component composition in TypeScript

For now, use the `DOMProjection` API for reactive rendering.

## Next Steps

- [DOM Projection Guide](./dom-projection-guide.md) - User-facing rendering API
- [FRP Guide](./frp-guide.md) - Behavior and Event patterns
- [Architecture](./architecture/) - Design decisions
