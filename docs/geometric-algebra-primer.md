# Geometric Algebra Primer for Cliffy

This guide introduces geometric algebra (GA) concepts as they relate to Cliffy. You don't need to understand GA to use Cliffy—the framework handles it internally—but understanding the basics can help you appreciate the design decisions and unlock advanced use cases.

## Why Geometric Algebra?

Traditional programming represents state with numbers, strings, and structures. When that state needs to change, we write imperative code: `count = count + 1`. This works fine for simple cases, but distributed systems face a fundamental problem: **what happens when two users change the same state simultaneously?**

Geometric algebra provides a mathematical framework where:

- **State changes are geometric transformations** (rotations, translations, scaling)
- **Conflicts have a natural resolution**: the geometric mean always exists and converges
- **Operations compose associatively**: (A then B) then C = A then (B then C)

This isn't just mathematical elegance—it enables coordination-free distributed systems where conflicts resolve automatically.

## The Key Insight: Everything is Geometry

Consider a simple counter. In traditional programming:

```
State: 42 (just a number)
Update: 42 + 1 = 43 (arithmetic)
```

In geometric algebra:

```
State: 42.0 (scalar component of a multivector)
Update: Transform via rotor (geometric rotation/translation)
```

The second approach seems more complex, but it gives us something crucial: **a universal language for all transformations**. Rotations, translations, scaling, and even abstract state changes all become the same kind of operation.

## Basic Concepts

### Multivectors: Generalized Numbers

A multivector is like a number with multiple parts. In Cliffy's 3D algebra (GA3), a multivector has 8 components:

| Grade | Basis Elements | Geometric Meaning |
|-------|---------------|-------------------|
| 0 | 1 (scalar) | Magnitude, count, value |
| 1 | e₁, e₂, e₃ | Direction in 3D space |
| 2 | e₁₂, e₁₃, e₂₃ | Planes, rotation axes |
| 3 | e₁₂₃ | Volume, orientation |

You can think of it as a Swiss Army knife number that can represent scalars, vectors, planes, and volumes all at once.

### The Geometric Product

The geometric product (⊗) is the fundamental operation. Unlike regular multiplication, it captures both:

- **Inner product**: How much two things point in the same direction
- **Outer product**: The plane/volume they span together

```
a ⊗ b = a · b + a ∧ b
        ↑       ↑
     scalar   bivector
     (dot)    (wedge)
```

This single operation unifies dot products, cross products, and rotations.

### Rotors: The Key to Transformations

A rotor is a multivector that represents rotation. Unlike rotation matrices (9 numbers) or quaternions (4 numbers), rotors in GA emerge naturally from the geometry.

To rotate vector **v** by rotor **R**:

```
v' = R v R⁻¹   (sandwich product)
```

The beautiful part: **any transformation** (rotation, translation, reflection, scaling) can be expressed as a rotor. This uniformity is why Cliffy uses GA for all state changes.

## How Cliffy Uses GA (Behind the Scenes)

### User Values Become Multivectors

When you create a Behavior with a value, Cliffy converts it to a multivector:

```typescript
// What you write:
const count = behavior(42);

// What Cliffy stores internally:
// GA3 multivector with scalar component = 42.0
// [42.0, 0, 0, 0, 0, 0, 0, 0]
//   ↑
// scalar
```

Different types use different components:

| Type | GA3 Storage |
|------|-------------|
| Number | Scalar (grade 0) |
| Boolean | Scalar (0.0 = false, 1.0 = true) |
| 2D Point | e₁ = x, e₂ = y |
| Color (RGB) | e₁ = r, e₂ = g, e₃ = b |
| String | Hash in scalar, length in e₁ |

### Updates Are Geometric Transforms

When you update a Behavior, Cliffy applies a geometric transformation:

```typescript
// What you write:
count.update(n => n + 1);

// What happens geometrically:
// Previous state: scalar = 42.0
// Transformation: translate along scalar axis by 1.0
// New state: scalar = 43.0
```

For more complex updates (like rotating a point), the transformation is a proper rotor.

### Conflicts Resolve Geometrically

When two users edit simultaneously:

```
User A: count = 5 → 6 (adds 1)
User B: count = 5 → 8 (adds 3)
```

Traditional conflict resolution requires choosing a winner or merging manually. With GA:

```
Geometric mean of transformations:
  Transform A: +1 (rotor)
  Transform B: +3 (rotor)

  Mean = exp((log(A) + log(B)) / 2)
       = exp((+1 + +3) / 2)
       = +2

Result: count = 5 → 7 (compromise)
```

The geometric mean **always exists** and **always converges**, even with complex nested data structures. This is why Cliffy can build coordination-free distributed systems.

## Intuitive Examples

### Counter as Geometric Translation

```
Number line:    0 ─── 1 ─── 2 ─── 3 ─── ...
                          ↑
                    current state

Increment (+1):  Move right by 1 unit
                 This is a translation rotor
```

### 2D Position as Vector

```
2D plane:       ↑ y
                │
                │   • (3, 4)  ← state lives here
                │
                └───────→ x

Movement:       Rotor translates the point
Rotation:       Rotor rotates around origin
Scaling:        Rotor scales distance from origin
```

### Boolean as Reflection

```
False (0.0)  ──────────────  True (1.0)
              ← reflection →

Toggle:      Reflect across 0.5
             R = reflection rotor
```

## The 8-Dimensional UI Space

For rich UI state, Cliffy uses an 8D algebra where each dimension maps to a CSS property:

| Dimension | GA8 Basis | UI Property |
|-----------|-----------|-------------|
| 1 | e₁ | x position |
| 2 | e₂ | y position |
| 3 | e₃ | width |
| 4 | e₄ | height |
| 5 | e₅ | z-index |
| 6 | e₆ | opacity |
| 7 | e₇ | rotation |
| 8 | e₈ | scale |

A UI animation is simply a smooth path through this 8D space, and the geometric algebra handles interpolation naturally via spherical linear interpolation (SLERP).

## Benefits for Distributed Systems

### 1. Conflict Resolution is Automatic

The geometric mean provides a mathematically sound way to merge conflicting changes. No application-specific conflict resolution code needed.

### 2. Operations Commute (When They Should)

Geometric algebra captures when operations are independent (commutative) vs dependent (non-commutative). This enables smart batching and reordering of operations.

### 3. Convergence is Guaranteed

Unlike ad-hoc CRDTs that require careful design per data type, the geometric approach guarantees convergence for any representable state.

### 4. Composition is Natural

Transformations compose via geometric product. Complex operations are just products of simpler ones, and the algebra handles the details.

## You Don't Need to Know This

The entire point of Cliffy's design is that you can use familiar APIs:

```typescript
// This is all you need to write:
const count = behavior(0);
count.update(n => n + 1);
count.subscribe(n => console.log(n));
```

The geometric algebra is hidden inside the Rust/WASM implementation. But knowing it's there helps explain:

- Why Cliffy can build distributed apps without coordination
- Why state changes are called "transformations"
- Why the API emphasizes `update` over direct assignment

## Going Deeper

For advanced use cases, Cliffy exposes geometric primitives:

```typescript
import { GeometricState, Rotor } from '@cliffy/core';

// Create state with explicit geometric representation
const state = new GeometricState([1.0, 0.0, 0.0]);

// Apply a rotation (90 degrees in XY plane)
state.apply(Rotor.xy(Math.PI / 2));

// Read the transformed coordinates
const [x, y, z] = state.asVector();
// x ≈ 0, y ≈ 1, z = 0
```

This is useful for:

- Physics simulations
- 3D graphics
- Animation systems
- Custom CRDT implementations

## Further Reading

- **"Geometric Algebra for Computer Science"** by Dorst, Fontijne, Mann — Comprehensive introduction
- **"A Survey of Geometric Algebra"** by Hitzer — Academic overview
- **Cliffy ROADMAP.md** — How GA fits into Cliffy's architecture
- **amari-core documentation** — The underlying GA library

## Summary

| Concept | Traditional | Geometric Algebra |
|---------|------------|-------------------|
| State | Numbers, objects | Multivectors |
| Changes | Assignment, mutation | Geometric transformations |
| Conflicts | Manual resolution | Geometric mean |
| Composition | Function calls | Geometric product |

Geometric algebra isn't just a different representation—it's a framework that makes hard distributed systems problems tractable. Cliffy hides the complexity while giving you the benefits.
