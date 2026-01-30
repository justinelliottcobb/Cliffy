# Algebraic TSX Guide

Algebraic TSX is Cliffy's approach to UI components. Unlike virtual DOM frameworks, Cliffy represents UI as a **dataflow graph** that projects geometric state directly to DOM operations.

## Core Concepts

### Traditional Virtual DOM vs Algebraic TSX

| Virtual DOM | Algebraic TSX |
|-------------|---------------|
| Components return virtual nodes | Components are geometric morphisms |
| Diff and patch on each render | Static dataflow graph, direct updates |
| Re-render entire subtrees | Update only affected DOM properties |
| Runtime reconciliation | Compile-time optimization possible |

### The Three Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Component Layer                               │
│  Component trait, Element tree, Props, Composition              │
│  (cliffy-core/src/component.rs)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Dataflow Layer                                │
│  DataflowGraph, Node, NodeKind, GraphBuilder                    │
│  (cliffy-core/src/dataflow.rs)                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DOM Projection Layer                          │
│  DOMProjection, ProjectionScheduler, ElementProjections         │
│  (cliffy-wasm/src/dom.rs)                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Component Layer

### The Component Trait

A component is a **geometric morphism** from state to renderable elements:

```rust
use cliffy_core::component::{Component, Element, ElementKind};
use cliffy_core::GA3;

pub trait Component: Send + Sync {
    /// Render the component given geometric state
    fn render(&self, state: &GA3) -> Element;

    /// Initial state when component mounts
    fn initial_state(&self) -> GA3 {
        GA3::zero()
    }
}
```

### Elements

Elements are nodes in the render tree (not virtual DOM nodes):

```rust
use cliffy_core::component::{Element, ElementKind, PropValue};

// Create a div with a class and child
let elem = Element::tag("div")
    .attr("class", "container")
    .child(Element::text("Hello, World!"));

// Create a fragment (multiple elements without wrapper)
let frag = Element::fragment(vec![
    Element::tag("span").child(Element::text("A")),
    Element::tag("span").child(Element::text("B")),
]);

// Empty element (renders nothing)
let empty = Element::empty();
```

### Element Kinds

| Kind | Description | Example |
|------|-------------|---------|
| `Tag(String)` | HTML element | `<div>`, `<span>`, `<button>` |
| `Text(String)` | Text content | `"Hello"` |
| `Fragment` | Multiple children, no wrapper | `<><A/><B/></>` |
| `ComponentRef` | Nested component | `<Counter />` |
| `Empty` | Renders nothing | Conditional false branch |

### Props

Props are typed attributes for elements:

```rust
use cliffy_core::component::{Props, PropValue};

let mut props = Props::new();
props.set("name", PropValue::String("test".into()));
props.set("count", PropValue::Number(42.0));
props.set("enabled", PropValue::Bool(true));
props.set("items", PropValue::Array(vec![
    PropValue::Number(1.0),
    PropValue::Number(2.0),
]));

// Fluent API on Element
let elem = Element::tag("input")
    .attr("type", "text")
    .attr("placeholder", "Enter name")
    .num("tabindex", 1.0)
    .bool("disabled", false);
```

### Function Components

For simple components, use `FnComponent`:

```rust
use cliffy_core::component::{component, Element, ElementKind};
use cliffy_core::GA3;

let counter = component(|state: &GA3| {
    let count = state.get(0) as i32;
    Element::tag("div")
        .child(Element::text(format!("Count: {}", count)))
        .child(Element::tag("button").child(Element::text("+")))
});

// Render with state
let elem = counter.render(&GA3::scalar(42.0));
```

### Component Composition

Components compose via **geometric product** of their state spaces:

```rust
use cliffy_core::component::{compose, component, ComposedComponent, StateSplit};

let header = component(|state| {
    Element::tag("header").child(Element::text("Header"))
});

let content = component(|state| {
    Element::tag("main").child(Element::text("Content"))
});

// Compose with shared state
let page = compose(header, content);

// Or with explicit state split
let page = ComposedComponent::with_split(
    header,
    content,
    StateSplit::ByGrade  // Header gets grades 0-1, Content gets grades 2-3
);
```

### State Split Strategies

| Strategy | Description |
|----------|-------------|
| `Shared` | Both components see same state |
| `ByGrade` | A gets scalar+vector, B gets bivector+pseudoscalar |
| `ByCoefficient` | A gets first 4 coefficients, B gets last 4 |

## Dataflow Layer

The dataflow graph represents the static structure of data transformations.

### Graph Structure

```
GeometricState ──┬── Projection ──► DOM Text
                 │
                 ├── Transform ───► Projection ──► DOM Style
                 │
                 └── Sink ────────► Event Handler
```

### Creating a Dataflow Graph

```rust
use cliffy_core::dataflow::{DataflowGraph, Node, NodeKind, TransformType};

let mut graph = DataflowGraph::new();

// Add source (geometric state input)
let state_id = graph.add_node(Node::source("counter_state"));

// Add projection (extract scalar as string)
let proj_id = graph.add_node(Node::projection("count_text", "scalar_to_string"));
graph.connect(state_id, proj_id);

// Add sink (DOM text content)
let sink_id = graph.add_node(Node::sink("span_text", "textContent"));
graph.connect(proj_id, sink_id);
```

### Node Kinds

| Kind | Purpose | Example |
|------|---------|---------|
| `Source` | Geometric state input | User counter state |
| `Projection` | Extract value from state | Scalar → string |
| `Transform` | Geometric operation | Rotation, translation |
| `Sink` | DOM output | textContent, style |
| `Combine` | Merge multiple inputs | Sum, product, average |
| `Conditional` | Switch between inputs | Show/hide |
| `Constant` | Fixed value | π, default colors |

### Transform Types

```rust
use cliffy_core::dataflow::{TransformType, RotationPlane};

// Translation
let trans = TransformType::Translation { x: 10.0, y: 0.0, z: 0.0 };

// Rotation in XY plane (around Z axis)
let rot = TransformType::Rotation {
    angle: std::f64::consts::PI / 2.0,
    plane: RotationPlane::XY
};

// Uniform scaling
let scale = TransformType::Scale { factor: 2.0 };

// Linear interpolation
let lerp = TransformType::Lerp { t: 0.5 };

// Arbitrary rotor
let rotor = TransformType::Rotor {
    coefficients: [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
};
```

### Fluent Graph Builder

```rust
use cliffy_core::dataflow::GraphBuilder;

let graph = GraphBuilder::new()
    .source("state")
    .project("count", "scalar")
    .sink("display", "textContent")
    // Branch from state for second output
    .from("state")
    .project("color", "to_hsl")
    .sink("bg", "style.backgroundColor")
    .build();

// Graph now has:
// state → count → display
// state → color → bg
```

### Graph Analysis

```rust
// Topological sort (returns None if cycles)
let order = graph.topological_sort();

// Check for cycles
if graph.has_cycles() {
    panic!("Dataflow graph has cycles!");
}

// Find all sources and sinks
let sources = graph.sources();
let sinks = graph.sinks();

// Find nodes reachable from a given node
let reachable = graph.reachable_from(state_id);
```

## DOM Projection Layer

DOM projections connect the dataflow graph to actual DOM updates.

### Creating Projections

```typescript
import { DOMProjection, GeometricState } from '@cliffy/core';

const element = document.getElementById('counter')!;

// Text content projection
const textProj = DOMProjection.text(element, (state) => {
    return `Count: ${state[0]}`;  // state is Float64Array
});

// Style projection
const colorProj = DOMProjection.style(element, 'color', (state) => {
    const hue = (state[0] * 10) % 360;
    return `hsl(${hue}, 70%, 50%)`;
});

// Attribute projection
const attrProj = DOMProjection.attribute(element, 'data-count', (state) => {
    return String(Math.floor(state[0]));
});

// Class toggle projection
const classProj = DOMProjection.classToggle(element, 'active', (state) => {
    return state[0] > 0;  // Returns boolean
});
```

### Projection Scheduler

Batch updates to animation frames for performance:

```typescript
import { ProjectionScheduler, DOMProjection, GeometricState } from '@cliffy/core';

const scheduler = new ProjectionScheduler();

// Schedule updates (batched to next animation frame)
scheduler.schedule(textProj, "Count: 42");
scheduler.schedule(colorProj, "hsl(120, 70%, 50%)");

// Or flush immediately
scheduler.flush();

// Check pending count
console.log(`${scheduler.pendingCount} updates pending`);
```

### Element Projections Builder

Set up multiple projections on one element:

```typescript
import { ElementProjections, GeometricState } from '@cliffy/core';

const state = GeometricState.fromScalar(0);

const projections = new ElementProjections(element)
    .text((s) => `Value: ${s[0]}`)
    .style('opacity', (s) => String(Math.min(1, s[0] / 100)))
    .classToggle('highlight', (s) => s[0] > 50);

// Apply all projections at once
projections.applyAll(state);
```

### Helper Functions

```typescript
import { stateToTransform, stateToColor } from '@cliffy/core';

// Create CSS transform string
const transform = stateToTransform(
    100,  // x
    50,   // y
    0,    // z
    45,   // rotation (degrees)
    1.5   // scale
);
// Returns: "translate3d(100px, 50px, 0px) rotate(45deg) scale(1.5)"

// Create RGBA color string
const color = stateToColor(
    1.0,  // r (0-1)
    0.5,  // g (0-1)
    0.0,  // b (0-1)
    0.8   // a (0-1)
);
// Returns: "rgba(255, 127, 0, 0.8)"
```

## Complete Example: Counter Component

```rust
// Rust: Define component
use cliffy_core::component::{Component, Element, component};
use cliffy_core::dataflow::GraphBuilder;
use cliffy_core::GA3;

// Component definition
let counter = component(|state: &GA3| {
    let count = state.get(0) as i32;

    Element::tag("div")
        .attr("class", "counter")
        .child(
            Element::tag("span")
                .attr("id", "count-display")
                .child(Element::text(format!("{}", count)))
        )
        .child(
            Element::tag("button")
                .attr("id", "increment")
                .child(Element::text("+"))
        )
        .child(
            Element::tag("button")
                .attr("id", "decrement")
                .child(Element::text("-"))
        )
});

// Dataflow graph
let graph = GraphBuilder::new()
    .source("count_state")
    .project("count_text", "int_to_string")
    .sink("count_display", "textContent")
    .build();
```

```typescript
// TypeScript: Wire up DOM
import {
    Behavior,
    DOMProjection,
    ProjectionScheduler
} from '@cliffy/core';

const count = new Behavior(0);
const display = document.getElementById('count-display')!;
const incBtn = document.getElementById('increment')!;
const decBtn = document.getElementById('decrement')!;

// Create projection
const textProj = DOMProjection.text(display, (state) => String(state));

// Subscribe behavior to projection
count.subscribe((value) => {
    textProj.update(String(value));
});

// Wire up events
incBtn.onclick = () => count.update(n => n + 1);
decBtn.onclick = () => count.update(n => n - 1);
```

## Best Practices

### 1. Keep Components Pure

Components should be pure functions of their state:

```rust
// Good: Pure function of state
let counter = component(|state: &GA3| {
    Element::text(format!("Count: {}", state.get(0) as i32))
});

// Bad: Side effects in render
let counter = component(|state: &GA3| {
    println!("Rendering!");  // Side effect!
    Element::text(format!("Count: {}", state.get(0) as i32))
});
```

### 2. Use Appropriate State Split

Choose the right split strategy for composed components:

```rust
// Shared: Both components react to same changes
let shared = ComposedComponent::with_split(a, b, StateSplit::Shared);

// ByGrade: Components have independent state spaces
let split = ComposedComponent::with_split(a, b, StateSplit::ByGrade);
```

### 3. Batch DOM Updates

Always use the scheduler for multiple updates:

```typescript
// Good: Batched updates
const scheduler = new ProjectionScheduler();
scheduler.schedule(proj1, value1);
scheduler.schedule(proj2, value2);
// Both applied in same animation frame

// Bad: Individual updates
proj1.update(value1);  // Triggers layout
proj2.update(value2);  // Triggers layout again
```

### 4. Prefer Static Dataflow Graphs

Build graphs once, update state many times:

```rust
// Good: Build graph once
let graph = GraphBuilder::new()
    .source("state")
    .project("display", "to_string")
    .sink("output", "textContent")
    .build();

// Update state, graph handles propagation
state.set(new_value);
```

## Next Steps

- [FRP Guide](./frp-guide.md) - Behavior and Event patterns
- [Geometric Algebra Primer](./geometric-algebra-primer.md) - Understanding GA3
- [Distributed State Guide](./distributed-state-guide.md) - CRDT and sync
