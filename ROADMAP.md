# Cliffy Roadmap

## Vision

Build collaborative applications at Google Docs scale (10,000+ concurrent users) where distributed systems problems become geometric algebra problems with closed-form solutions and guaranteed convergence.

```
Traditional approach:          Cliffy approach:
───────────────────            ─────────────────
Complex consensus protocols    Geometric algebra operations
Conflict resolution heuristics Geometric mean (always converges)
Coordination overhead          No coordination needed
State reconciliation           State as multivector projections
```

### Core Insight

All state transformations are geometric operations in Clifford algebra:
- State changes = rotors/versors (geometric transformations)
- Conflicts = geometric distance from expected manifold
- Resolution = geometric mean (closed-form, always converges)
- Composition = geometric product (associative)

## Current State

### Working Crates

| Crate | Status | Description |
|-------|--------|-------------|
| `cliffy-core` | ✅ Active | FRP primitives (Behavior, Event) with GA3 internally |
| `cliffy-wasm` | ✅ Active | WASM bindings via wasm-bindgen |
| `amari-core` | ✅ External | Geometric algebra library (dependency) |

### Archived (to be revived)

| Crate | Status | Description |
|-------|--------|-------------|
| `cliffy-protocols` | 📦 Archived | CRDT + consensus with geometric operations |
| `cliffy-alive` | 📦 Archived | Living UI / cellular automata (experimental) |
| `cliffy-frp` | 📦 Archived | Additional FRP utilities |

### Not Yet Built

| Component | Description |
|-----------|-------------|
| `cliffy-test` | Algebraic testing framework (tests as geometric invariants) |
| Geometric State Layer | Rotors/versors for state transforms |
| Lattice Operations | Join-semilattice with geometric join |
| P2P Sync | WebRTC-based state synchronization |
| Algebraic TSX | Dataflow graph specification (not VDOM) |
| WebGPU Acceleration | Parallel geometric operations |

---

## Phase 0: Algebraic Testing Framework (cliffy-test)

**Goal**: Tests are geometric invariants. Failures are geometric distances. Test composition uses geometric product.

The testing framework itself must embody the geometric algebra principles - this ensures correctness from the foundation up.

### 0.1 Core Testing Primitives

```rust
/// Tests as geometric constraints, not boolean assertions
pub trait GeometricTest {
    type State: Multivector;

    /// Verify state lies on expected manifold
    fn verify(&self, state: &Self::State) -> TestResult;

    /// Compose tests via geometric product
    fn compose(&self, other: &impl GeometricTest) -> ComposedTest;
}

/// Test results include geometric error information
pub enum TestResult {
    Pass,
    Fail(GeometricError),
}

pub struct GeometricError {
    /// Distance from expected manifold
    distance: f64,
    /// Gradient pointing toward valid states
    gradient: GA3,
    /// Projected correction to nearest valid state
    correction: GA3,
}
```

### 0.2 Invariant Testing

Instead of `assert!(a == b)`, define invariants that must be preserved:

```rust
invariant! {
    name: "Rotor preserves magnitude",
    forall: (v: Vector, r: Rotor),
    property: magnitude(v) == magnitude(sandwich(r, v, reverse(r)))
}

invariant! {
    name: "CRDT merge lies in join lattice",
    forall: (a: State, b: State),
    property: merge(a, b) ∈ span(a, b)
}
```

### 0.3 Manifold Testing

Valid states form geometric manifolds:

```rust
/// Define the manifold of valid document states
pub struct DocumentManifold {
    dimension: usize,
    constraints: Vec<ManifoldConstraint>,
}

impl DocumentManifold {
    pub fn contains(&self, state: &GA3) -> bool { ... }
    pub fn distance_to(&self, state: &GA3) -> f64 { ... }
    pub fn project(&self, state: &GA3) -> GA3 { ... }
}

#[test]
fn document_remains_on_manifold() {
    let initial = create_document();
    let transformed = apply_operations(initial, ops);

    // Test verifies state lies on manifold
    assert!(DocumentManifold.contains(&transformed));
}
```

### 0.4 Test Composition via Geometric Product

```rust
// Tests compose like multivectors
let test_suite = test1 ⊗ test2 ⊗ test3;

// Composition semantics:
// - All pass → positive scalar result
// - Failures → non-scalar components indicate failure direction
// - Partial failures → mixed-grade result

impl GeometricProduct for Test {
    fn geometric_product(&self, other: &Test) -> ComposedTest {
        ComposedTest {
            // Grade 0: both pass
            // Grade 1: one fails, direction indicates which
            // Grade 2: interaction failures (both fail together)
            ...
        }
    }
}
```

### 0.5 Proof-Carrying Tests

Tests that construct geometric proofs:

```rust
proof! {
    name: "All rotors form a group",

    // Identity exists
    identity: {
        let e = scalar(1.0);
        verify sandwich(e, v, e) == v
    },

    // Closure under composition
    closure: forall (r1: Rotor, r2: Rotor) => {
        is_rotor(geometric_product(r1, r2))
    },

    // Inverse exists
    inverse: forall (r: Rotor) => {
        exists reverse(r) where geometric_product(r, reverse(r)) == identity
    },

    // Associativity (inherited from geometric product)
    associativity: inherited_from(GeometricProduct)
}
```

### 0.6 Cross-Layer Differential Testing

```rust
/// Verify WASM preserves geometric structure
homomorphism_test! {
    name: "WASM preserves geometric structure",
    morphism: RustImpl -> WASMImpl,

    preserves: [
        geometric_product,
        inner_product,
        outer_product,
        sandwich_product,
    ],

    // morphism(a ⊗ b) == morphism(a) ⊗ morphism(b)
}
```

### 0.7 Visual Test Debugging

When tests fail, visualize the geometric error:

```rust
#[visual_test]
fn state_evolution() {
    let states = evolve_system(initial, operations);

    // Render 3D visualization of:
    // - State trajectory
    // - Expected manifold
    // - Error distances
    // - Gradient field

    assert!(states.remain_within(ExpectedManifold.tube(epsilon)));
}
```

**Tasks**:
- [ ] Create `cliffy-test` crate
- [ ] Implement `GeometricTest` trait
- [ ] Add `invariant!` macro for property testing
- [ ] Implement manifold types and distance calculations
- [ ] Create test composition via geometric product
- [ ] Add `proof!` macro for geometric proofs
- [ ] Implement cross-layer homomorphism testing
- [ ] Create visual debugging for test failures
- [ ] Integrate with `cargo test` runner

---

## Phase 1: Geometric State Foundation

**Goal**: State transformations as explicit geometric operations, not hidden implementation detail.

### 1.1 Enrich cliffy-core with Geometric Primitives

Current `Behavior<T>` uses GA3 internally but hides it. We need to expose geometric operations for:

```rust
// Current (hidden GA)
let count = behavior(0);
count.update(|n| n + 1);

// Phase 1 (explicit geometric transforms)
let state = GeometricState::new(initial);
state.apply(Rotor::translation(1.0, 0.0, 0.0)); // Translation along e1
state.apply(Rotor::rotation(angle, plane));     // Rotation in bivector plane
```

**Tasks**:
- [ ] Add `GeometricState<T>` type that exposes geometric operations
- [ ] Implement `Rotor` and `Versor` types for state transformations
- [ ] Add geometric interpolation (SLERP for smooth transitions)
- [ ] Create projection functions: multivector → user types
- [ ] Add tests for geometric operation composition

### 1.2 State as Multivector with Projections

```rust
/// State lives in geometric space, projects to user types
pub struct GeometricState {
    multivector: GA3,
    projections: Vec<Box<dyn Projection>>,
}

pub trait Projection {
    type Output;
    fn project(&self, mv: &GA3) -> Self::Output;
}

// Example: Counter as scalar projection
impl Projection for CounterProjection {
    type Output = i32;
    fn project(&self, mv: &GA3) -> i32 {
        mv.scalar() as i32
    }
}
```

**Tasks**:
- [ ] Define `Projection` trait
- [ ] Implement common projections (scalar, vector, position, color)
- [ ] Add reactive projections that auto-update
- [ ] Create derive macro for custom projections

### 1.3 WASM Bindings for Geometric Operations

Expose geometric primitives to JavaScript:

```javascript
import { GeometricState, Rotor } from '@cliffy/core';

const state = new GeometricState(initial);

// Apply geometric transformation
state.apply(Rotor.translation(1, 0, 0));

// Subscribe to projected values
state.project('counter').subscribe(n => {
    console.log('Count:', n);
});
```

**Tasks**:
- [ ] Add `GeometricState` to cliffy-wasm
- [ ] Expose `Rotor` and `Versor` constructors
- [ ] Add projection subscription API
- [ ] Create TypeScript type definitions

---

## Phase 2: Distributed State (CRDT Revival)

**Goal**: Revive and modernize cliffy-protocols for lattice-based distributed state.

### 2.1 Migrate cliffy-protocols to Current API

The archived `cliffy-protocols` already has:
- `GeometricCRDT` with vector clocks
- Geometric operations (product, addition, sandwich, exponential)
- Merge with causal ordering
- `geometric_mean` for conflict resolution

**Tasks**:
- [ ] Move cliffy-protocols back to workspace
- [ ] Update to amari-core 0.17+ API
- [ ] Fix compilation errors
- [ ] Add comprehensive tests
- [ ] Document the geometric CRDT model

### 2.2 Lattice-Based Conflict Resolution

Implement join-semilattice operations with geometric algebra:

```rust
pub trait GeometricLattice {
    /// Lattice join - always converges, no coordination needed
    fn join(&self, other: &Self) -> Self;

    /// Check if this state dominates another
    fn dominates(&self, other: &Self) -> bool;

    /// Compute distance from lattice manifold
    fn divergence(&self, other: &Self) -> f64;
}

impl GeometricLattice for GA3 {
    fn join(&self, other: &GA3) -> GA3 {
        // Geometric mean - always converges
        geometric_mean(&[self.clone(), other.clone()])
    }

    fn dominates(&self, other: &GA3) -> bool {
        self.magnitude() >= other.magnitude()
    }

    fn divergence(&self, other: &GA3) -> f64 {
        (self - other).magnitude()
    }
}
```

**Tasks**:
- [ ] Define `GeometricLattice` trait
- [ ] Implement for GA3 multivectors
- [ ] Add lattice property tests (idempotent, commutative, associative)
- [ ] Create specialized lattices (counter, set, register, sequence)
- [ ] Benchmark convergence under concurrent operations

### 2.3 Operation-Based CRDT with Geometric Transforms

```rust
/// Operations are geometric transformations
pub enum GeometricOp {
    /// Translation: move state along an axis
    Translate { axis: Vector3, distance: f64 },

    /// Rotation: rotate state in a plane
    Rotate { plane: Bivector, angle: f64 },

    /// Scale: uniform or non-uniform scaling
    Scale { factors: Vector3 },

    /// Reflection: reflect across a plane
    Reflect { plane: Bivector },

    /// Arbitrary versor transformation
    Versor { versor: GA3 },
}

impl GeometricOp {
    /// Convert to rotor/versor for application
    pub fn to_versor(&self) -> GA3 { ... }

    /// Compose operations via geometric product
    pub fn compose(&self, other: &GeometricOp) -> GeometricOp { ... }
}
```

**Tasks**:
- [ ] Define `GeometricOp` enum
- [ ] Implement conversion to versors
- [ ] Add operation composition
- [ ] Create operation log with causal ordering
- [ ] Implement operation-based merge

---

## Phase 3: Synchronization Layer

**Goal**: P2P synchronization with WebRTC and efficient state deltas.

### 3.1 State Delta Computation

```rust
/// Compute minimal delta between states
pub fn compute_delta(from: &GA3, to: &GA3) -> GA3 {
    // The versor that transforms 'from' into 'to'
    // to = delta * from * delta^(-1)  (sandwich product)
    // Solve for delta
    ...
}

/// Apply delta to catch up
pub fn apply_delta(state: &mut GA3, delta: &GA3) {
    let rev = delta.reverse();
    *state = delta.geometric_product(state).geometric_product(&rev);
}
```

**Tasks**:
- [ ] Implement delta computation
- [ ] Add delta compression (log representation)
- [ ] Create delta batching for efficiency
- [ ] Benchmark delta sizes vs full state

### 3.2 WebRTC Sync Protocol

```javascript
// JavaScript API
const doc = new CollaborativeDocument(initialState);

// Connect to peers
doc.connect(signalingServer);

// Local changes automatically sync
doc.state.apply(Rotor.translation(1, 0, 0));

// Remote changes automatically merge
doc.onSync((delta, peerId) => {
    console.log(`Synced with ${peerId}`);
});
```

**Tasks**:
- [ ] Design sync protocol message format
- [ ] Implement WebRTC data channel wrapper
- [ ] Add signaling server integration
- [ ] Create peer discovery mechanism
- [ ] Handle network partitions gracefully

### 3.3 Persistence Layer

```rust
/// Persist geometric state with operation history
pub trait GeometricStore {
    fn save_snapshot(&mut self, state: &GA3, clock: &VectorClock);
    fn load_snapshot(&self) -> Option<(GA3, VectorClock)>;
    fn append_operation(&mut self, op: &GeometricOp);
    fn replay_from(&self, clock: &VectorClock) -> Vec<GeometricOp>;
}
```

**Tasks**:
- [ ] Define storage trait
- [ ] Implement IndexedDB backend for browser
- [ ] Add operation log with compaction
- [ ] Create snapshot + incremental strategy

---

## Phase 4: Algebraic TSX

**Goal**: TSX as geometric dataflow graph specification, not virtual DOM. Components compose naturally via geometric product.

### 4.0 Composable Component Model

Components are the primary abstraction. They must feel familiar to React/Vue/Svelte developers while being geometrically grounded.

```tsx
// Familiar component syntax
function Counter() {
    const count = useGeometricState(0);

    return (
        <div>
            <span>{count}</span>
            <button onClick={() => count.translate(1)}>+</button>
        </div>
    );
}

// Composition works as expected
function App() {
    return (
        <div>
            <Counter />
            <Counter />
            <TodoList />
        </div>
    );
}
```

**Component = Geometric Morphism**

Under the hood, each component is a morphism from geometric state to DOM:

```
Component: GeometricState → DOM
Composition: (A → B) ∘ (B → C) = (A → C)
```

```rust
pub trait Component {
    /// Component's local geometric state
    type State: Multivector;

    /// Project state to renderable output
    fn render(&self, state: &Self::State) -> Element;

    /// Compose with child components
    fn compose<C: Component>(self, child: C) -> ComposedComponent<Self, C>;
}

/// Components compose via geometric product of their state spaces
impl<A: Component, B: Component> Component for ComposedComponent<A, B> {
    type State = GeometricProduct<A::State, B::State>;

    fn render(&self, state: &Self::State) -> Element {
        // Project combined state to both components
        let (a_state, b_state) = state.decompose();
        Element::compose(
            self.a.render(&a_state),
            self.b.render(&b_state)
        )
    }
}
```

**Hooks as Geometric Projections**

```tsx
// Familiar hooks API
function useGeometricState<T>(initial: T): GeometricBehavior<T>;
function useProjection<T, U>(state: GeometricState, proj: Projection<T, U>): U;
function useTransform(state: GeometricState, transform: Rotor): void;

// Example usage
function ColorPicker() {
    const color = useGeometricState({ h: 0, s: 100, l: 50 });

    // Derive values via projection
    const hue = useProjection(color, mv => mv.grade(1).component(0));
    const saturation = useProjection(color, mv => mv.grade(1).component(1));

    return (
        <div style={{ background: color.toCSS() }}>
            <Slider value={hue} onChange={h => color.rotateIn(e12, h)} />
            <Slider value={saturation} onChange={s => color.scaleAlong(e2, s)} />
        </div>
    );
}
```

**Props as Geometric Constraints**

```tsx
interface ButtonProps {
    // Props constrain the component's geometric state space
    disabled?: Behavior<boolean>;
    onClick?: Event<void>;
    children?: Element;
}

function Button({ disabled, onClick, children }: ButtonProps) {
    // Props flow into component's geometric state
    const state = useGeometricState({ pressed: false });

    // Conditional rendering via geometric projection
    const opacity = useProjection(
        combine(state, disabled),
        (s, d) => d ? 0.5 : 1.0
    );

    return (
        <button
            style={{ opacity }}
            onClick={when(not(disabled), onClick)}
        >
            {children}
        </button>
    );
}
```

**Tasks**:
- [ ] Design component trait/interface
- [ ] Implement hooks API (`useGeometricState`, `useProjection`, etc.)
- [ ] Create component composition via geometric product
- [ ] Add props as geometric constraints
- [ ] Ensure familiar JSX/TSX syntax works
- [ ] Support children composition
- [ ] Add component lifecycle (mount, unmount) as geometric events

### 4.1 Dataflow Graph Model

```
TSX Expression                    Geometric Dataflow
──────────────                    ──────────────────
<div>{count$}</div>       →       Projection node: state → DOM text
<div style={style$}>      →       Projection node: state → CSS
<button onClick={click$}> →       Event source: DOM → state transform
```

**Tasks**:
- [ ] Define dataflow graph IR
- [ ] Create graph node types (source, projection, transform, sink)
- [ ] Implement graph optimization passes
- [ ] Add cycle detection and resolution

### 4.2 Compile-Time Graph Generation

```rust
// Build-time: TSX → Graph
#[algebraic_tsx]
fn Counter() -> Graph {
    let count = GeometricState::new(0);

    tsx! {
        <div>
            <span>{count.project(scalar)}</span>
            <button onClick={count.translate(1, 0, 0)}>+</button>
        </div>
    }
}
```

**Tasks**:
- [ ] Create proc-macro for algebraic TSX
- [ ] Generate optimized dataflow graphs
- [ ] Emit efficient WASM code
- [ ] Add source maps for debugging

### 4.3 Direct DOM Projection

No virtual DOM - project directly from geometric state to DOM:

```rust
/// Direct projection from multivector to DOM
pub struct DOMProjection {
    element: web_sys::Element,
    projection: Box<dyn Fn(&GA3) -> DOMUpdate>,
}

impl DOMProjection {
    fn update(&self, state: &GA3) {
        match (self.projection)(state) {
            DOMUpdate::Text(s) => self.element.set_text_content(Some(&s)),
            DOMUpdate::Style(k, v) => self.element.style().set_property(&k, &v),
            DOMUpdate::Attribute(k, v) => self.element.set_attribute(&k, &v),
        }
    }
}
```

**Tasks**:
- [ ] Implement `DOMProjection` type
- [ ] Create efficient batch updates
- [ ] Add animation frame scheduling
- [ ] Benchmark vs virtual DOM approaches

---

## Phase 5: Edge Computing

**Goal**: Every browser is a compute node with WebGPU acceleration.

### 5.1 WebGPU Geometric Operations

```rust
/// GPU-accelerated geometric algebra
pub struct GPUMultivector {
    buffer: wgpu::Buffer,
    pipeline: wgpu::ComputePipeline,
}

impl GPUMultivector {
    /// Batch geometric product on GPU
    pub async fn batch_product(&self, others: &[GA3]) -> Vec<GA3> {
        // Run compute shader
        ...
    }
}
```

**Tasks**:
- [ ] Create WebGPU compute shaders for GA operations
- [ ] Implement GPU buffer management
- [ ] Add automatic CPU/GPU dispatch based on batch size
- [ ] Benchmark GPU vs CPU for various workloads

### 5.2 Distributed Compute

```javascript
// Each browser contributes compute
const cluster = new ComputeCluster();

// Share geometric computation across peers
const result = await cluster.compute(
    operations,  // Array of geometric operations
    strategy: 'distribute'  // or 'replicate' for fault tolerance
);
```

**Tasks**:
- [ ] Design work distribution protocol
- [ ] Implement task scheduling
- [ ] Add fault tolerance (replication, retry)
- [ ] Create load balancing algorithm

### 5.3 Performance Optimization

**Tasks**:
- [ ] Profile critical paths
- [ ] Implement SIMD operations in Rust
- [ ] Add operation batching
- [ ] Create performance regression tests
- [ ] Target: 60fps with 1000+ active behaviors

---

## Phase 6: Production Readiness

**Goal**: Ready for production collaborative applications.

### 6.1 Scale Testing

**Tasks**:
- [ ] Create load testing framework
- [ ] Test with 100, 1000, 10000 simulated users
- [ ] Measure convergence time under load
- [ ] Identify and fix bottlenecks

### 6.2 Developer Experience

**Tasks**:
- [ ] Create comprehensive documentation
- [ ] Build interactive tutorials
- [ ] Add debugging tools (state inspector, operation log viewer)
- [ ] Create migration guides from React/Redux

### 6.3 Example Applications

| Application | Demonstrates |
|-------------|--------------|
| Collaborative Whiteboard | Real-time drawing with geometric transforms |
| Multiplayer Game | High-frequency state sync, interpolation |
| Shared Document Editor | CRDT text, presence indicators |
| Design Tool | Complex geometric operations, undo/redo |

**Tasks**:
- [ ] Build whiteboard example
- [ ] Build multiplayer game example
- [ ] Build document editor example
- [ ] Build design tool example

---

## Success Criteria

### Phase 0
- [ ] `cliffy-test` crate compiles
- [ ] `invariant!` macro generates property tests
- [ ] Test failures include geometric error information
- [ ] Tests compose via geometric product
- [ ] Cross-layer homomorphism tests work

### Phase 1
- [ ] Geometric operations exposed in API
- [ ] Projections from multivector to user types
- [ ] WASM bindings work in browser

### Phase 2
- [ ] cliffy-protocols compiles and tests pass
- [ ] Lattice operations with proven convergence
- [ ] CRDT merge is correct and efficient

### Phase 3
- [ ] P2P sync works across browsers
- [ ] Delta compression reduces bandwidth
- [ ] Persistence survives page reload

### Phase 4
- [ ] TSX compiles to dataflow graphs
- [ ] Direct DOM updates (no VDOM)
- [ ] Build-time optimization works

### Phase 5
- [ ] WebGPU acceleration functional
- [ ] Distributed compute across peers
- [ ] 60fps with complex state

### Phase 6
- [ ] 10,000 concurrent users tested
- [ ] Documentation complete
- [ ] Example applications functional

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        Applications                              │
│  (Collaborative Docs, Games, Design Tools, Whiteboards)         │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Algebraic TSX                               │
│  (Dataflow graphs, compile-time optimization, direct DOM)       │
└─────────────────────────────────────────────────────────────────┘
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
│  (Behavior, Event, combinators)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Geometric Algebra                             │
│  (amari-core: GA3, rotors, exponentials, products)              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Acceleration                                │
│  (WASM, WebGPU, SIMD)                                           │
└─────────────────────────────────────────────────────────────────┘


                    CROSS-CUTTING CONCERNS
                    ──────────────────────

┌─────────────────────────────────────────────────────────────────┐
│                    cliffy-test                                   │
│  Algebraic Testing Framework                                    │
│                                                                 │
│  • Tests as geometric invariants (not boolean assertions)       │
│  • Failures as geometric distances from manifolds               │
│  • Test composition via geometric product                       │
│  • Proof-carrying tests for algebraic laws                      │
│  • Cross-layer homomorphism verification                        │
│  • Visual debugging with geometric error visualization          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

To begin Phase 1 development:

```bash
# Current working state
cargo test -p cliffy-core
cargo test -p cliffy-wasm

# Build WASM
wasm-pack build cliffy-wasm --target web --out-dir pkg

# Next: Add geometric state primitives
# See Phase 1.1 tasks above
```
