# ADR-004: Hidden Geometric Complexity

**Status:** Accepted
**Date:** 2024-01-15
**Authors:** Cliffy Team

## Context

Cliffy uses geometric algebra internally for powerful mathematical properties (see ADR-001). However, geometric algebra is unfamiliar to most developers:

- **Multivectors** with grades 0-3 and 8 components
- **Geometric product** combining inner and outer products
- **Rotors** for representing transformations
- **Exponential/logarithm maps** for interpolation

Exposing this complexity would create a steep learning curve and limit adoption.

## Decision

**Hide geometric algebra from the public API. Provide a familiar, JavaScript-friendly interface that maps to geometric operations internally.**

Users write:

```typescript
const count = behavior(0);
count.update(n => n + 1);
count.subscribe(n => console.log(n));
```

They never see:

```
GA3 multivector [42.0, 0, 0, 0, 0, 0, 0, 0]
Translation rotor in scalar direction
Geometric mean for conflict resolution
```

## Rationale

### The Iceberg Principle

```
      User API (visible)
    ┌─────────────────────┐
    │  behavior(value)    │  ← Simple, familiar
    │  .update(fn)        │
    │  .subscribe(fn)     │
    └─────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  API boundary
    ┌─────────────────────┐
    │  GA3 multivectors   │
    │  Rotor transforms   │  ← Complex, powerful
    │  Geometric mean     │
    │  Clifford algebra   │
    └─────────────────────┘
      Implementation (hidden)
```

### Familiar APIs Enable Adoption

Developers already know:

```typescript
// React
const [count, setCount] = useState(0);
setCount(count + 1);

// Vue
const count = ref(0);
count.value++;

// Cliffy (feels similar)
const count = behavior(0);
count.update(n => n + 1);
```

The Cliffy API feels familiar despite the radically different implementation.

### When to Expose Geometry

Geometric operations ARE exposed for advanced users who need them:

```typescript
import { GeometricState, Rotor } from '@cliffy/core';

// Explicit geometric state
const position = new GeometricState([1.0, 0.0, 0.0]);

// Apply geometric transformation
position.apply(Rotor.xy(Math.PI / 2)); // Rotate 90° in XY plane

// Read result
const [x, y, z] = position.asVector();
```

This is opt-in: users who don't need it never see it.

## API Design Principles

### 1. Concepts Map to Familiar Abstractions

| User Concept | Familiar Term | Geometric Reality |
|--------------|---------------|-------------------|
| Value | Variable | Multivector |
| Change | Assignment | Rotor transformation |
| Derive | Computed | Projection |
| Combine | Merge | Geometric product |
| Sync | Merge | Geometric mean |

### 2. Types Hide Implementation

```typescript
// TypeScript interface (what users see)
interface Behavior<T> {
    sample(): T;
    set(value: T): void;
    update(fn: (value: T) => T): void;
    subscribe(callback: (value: T) => void): void;
    map<U>(fn: (value: T) => U): Behavior<U>;
}

// Rust implementation (hidden)
pub struct Behavior<T> {
    value: T,                           // User's type
    geometric: GA3,                     // Multivector representation
    subscribers: Rc<RefCell<Vec<...>>>, // Reactive subscriptions
}
```

Users work with `Behavior<number>`, not `Behavior<GA3>`.

### 3. Conversions Are Transparent

```typescript
// This just works:
const count = behavior(42);        // number → GA3 scalar
const name = behavior('Alice');    // string → GA3 hash
const pos = behavior({x: 1, y: 2}); // object → GA3 vector

// Users don't know or care about the conversion
```

The `IntoGeometric` and `FromGeometric` traits handle this automatically.

### 4. Error Messages Are User-Friendly

```typescript
// Bad: "Multivector dimension mismatch in grade-2 component"
// Good: "Cannot combine behaviors of incompatible types"
```

Geometric errors are translated to user-understandable messages.

## Consequences

### Positive

- **Low barrier to entry**: No GA knowledge required
- **Familiar API**: Feels like other reactive frameworks
- **Progressive disclosure**: Advanced users can access geometry
- **Documentation simplicity**: Basic docs don't mention GA

### Negative

- **Debugging complexity**: Internal state is geometric
- **Performance opacity**: Users don't know what operations cost
- **Magic feeling**: System does things users don't understand

### Mitigations

| Concern | Mitigation |
|---------|------------|
| Debugging | DevTools show both user value and geometric state |
| Performance | Documentation includes performance characteristics |
| Magic | "How it works" guide explains concepts optionally |

### Neutral

- **Bundle size**: GA code is included whether used or not
- **Learning path**: Users who want to understand can learn GA

## Escape Hatches

For users who need direct geometric access:

### 1. GeometricState Class

```typescript
import { GeometricState } from '@cliffy/core';

const state = new GeometricState([1.0, 2.0, 3.0]);
state.apply(Rotor.rotation(angle, plane));
```

### 2. Raw Multivector Access

```typescript
const count = behavior(42);
const mv = count.toMultivector(); // Returns GA3 representation
```

### 3. Custom Projections

```typescript
import { Projection } from '@cliffy/core';

const colorProjection = new Projection({
    toGeometric: (color) => [color.r, color.g, color.b],
    fromGeometric: (mv) => ({ r: mv[0], g: mv[1], b: mv[2] })
});
```

## Alternatives Considered

### 1. Expose Everything

- **Pro**: Full power available
- **Con**: Overwhelming for most users
- **Con**: Steep learning curve

### 2. Two Separate APIs

- **Pro**: Clean separation
- **Con**: Maintenance burden
- **Con**: Confusing which to use

### 3. GA-Only API

- **Pro**: Consistent, powerful
- **Con**: No adoption outside GA enthusiasts
- **Con**: Requires GA knowledge for "hello world"

### 4. Compile-Time Abstraction

- **Pro**: Zero runtime cost
- **Con**: Complex macros
- **Con**: Harder to debug

## Implementation Notes

### Type Conversion Traits

```rust
pub trait IntoGeometric {
    fn into_geometric(self) -> GA3;
}

pub trait FromGeometric: Sized {
    fn from_geometric(mv: &GA3) -> Self;
}

// Implementations for common types
impl IntoGeometric for i32 { ... }
impl IntoGeometric for f64 { ... }
impl IntoGeometric for String { ... }
impl<T: IntoGeometric> IntoGeometric for Option<T> { ... }
```

### Caching User Values

For types that can't be perfectly reconstructed from GA (like `String`), we cache the original:

```rust
pub struct Behavior<T> {
    user_value: T,      // Original user value (for return)
    geometric: GA3,     // Geometric representation (for ops)
    // ...
}
```

### WASM Binding Layer

The wasm-bindgen layer presents JavaScript-friendly types:

```rust
#[wasm_bindgen]
impl Behavior {
    #[wasm_bindgen(constructor)]
    pub fn new(value: JsValue) -> Result<Behavior, JsValue> {
        // Convert JsValue → Rust type → GA3
    }

    pub fn sample(&self) -> JsValue {
        // Convert GA3 → Rust type → JsValue
    }
}
```

## References

- "Don't Make Me Think" by Steve Krug (UX principle)
- "Simple Made Easy" by Rich Hickey (simplicity vs familiarity)
- React's design philosophy (hide reconciliation complexity)
- Redux's design philosophy (hide normalization complexity)
