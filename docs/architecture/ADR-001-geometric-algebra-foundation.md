# ADR-001: Geometric Algebra as Foundation

**Status:** Accepted
**Date:** 2024-01-15
**Authors:** Cliffy Team

## Context

Cliffy aims to build collaborative applications at Google Docs scale (10,000+ concurrent users). Traditional distributed systems face fundamental challenges:

1. **Conflict resolution** requires application-specific logic
2. **State synchronization** needs complex consensus protocols
3. **Merge operations** may not converge or may produce unexpected results
4. **Composition** of state transformations is often ad-hoc

We needed a mathematical foundation that addresses these challenges systematically.

## Decision

**Use Geometric Algebra (Clifford Algebra) as the internal representation for all state in Cliffy.**

Specifically:

- Store all user values as GA3 (3D Euclidean) multivectors internally
- Represent state changes as geometric transformations (rotors, versors)
- Resolve conflicts using geometric mean
- Hide this complexity from users behind familiar APIs

## Rationale

### Why Geometric Algebra?

1. **Universal transformation language**: Rotations, translations, reflections, and scaling all become the same kind of operation (versors). This uniformity simplifies the system architecture.

2. **Closed-form conflict resolution**: The geometric mean of two multivectors always exists and is unique. Unlike ad-hoc merge strategies, this provides guaranteed convergence.

3. **Associative composition**: Geometric product is associative: (A ⊗ B) ⊗ C = A ⊗ (B ⊗ C). This enables correct operation batching and reordering.

4. **Natural interpolation**: Smooth animations come for free via SLERP (spherical linear interpolation) in the rotor representation.

5. **Mathematical soundness**: GA has rigorous foundations going back to Clifford and Grassmann. We're not inventing new math—we're applying proven algebra.

### How State Maps to Multivectors

| User Type | GA3 Representation |
|-----------|-------------------|
| Number | Scalar (grade 0) |
| Boolean | Scalar (0.0 or 1.0) |
| 2D Point | Vector (e₁, e₂ components) |
| 3D Point | Vector (e₁, e₂, e₃ components) |
| Color RGB | Vector (r=e₁, g=e₂, b=e₃) |
| String | Hash in scalar, length in e₁ |
| Complex | e₁=real, e₂=imaginary |

### Conflict Resolution via Geometric Mean

When two users make concurrent changes:

```
User A: state → state_A (transformation T_A)
User B: state → state_B (transformation T_B)
```

Traditional CRDT approaches require per-type merge functions. With GA:

```
Merged = geometric_mean(state_A, state_B)
       = exp((log(state_A) + log(state_B)) / 2)
```

This:
- Always exists (unlike set union which may be undefined for ordered sets)
- Always converges (unlike LWW which depends on clock accuracy)
- Preserves geometric structure (unlike arbitrary merging)

## Consequences

### Positive

- **Simpler distributed systems**: No application-specific conflict resolution
- **Guaranteed convergence**: Mathematical proof, not empirical testing
- **Unified model**: Same approach works for counters, text, graphics, 3D objects
- **Future-proof**: More complex state (8D for UI) uses same principles

### Negative

- **Learning curve**: GA is unfamiliar to most developers (mitigated by hiding it)
- **Overhead**: Extra conversion between user types and multivectors
- **Precision**: Floating-point representation may lose precision for large integers
- **Complexity**: Implementation is more sophisticated than simple state management

### Neutral

- **Performance**: Multivector operations are fast, but there's conversion overhead
- **Debugging**: Geometric state is harder to inspect (mitigated by devtools)
- **Library size**: WASM binary includes GA operations

## Alternatives Considered

### 1. Traditional CRDTs

- **Pro**: Well-understood, many implementations
- **Con**: Requires per-type design, no universal conflict resolution
- **Con**: Composition is tricky

### 2. Operational Transformation (OT)

- **Pro**: Works for text editing
- **Con**: Complex server requirements
- **Con**: Doesn't generalize beyond text

### 3. Last-Write-Wins (LWW)

- **Pro**: Simple to implement
- **Con**: Loses information (one write is discarded)
- **Con**: Requires accurate clocks

### 4. Delta-State CRDTs

- **Pro**: Efficient synchronization
- **Con**: Still requires per-type design
- **Con**: No geometric interpretation

## Implementation Notes

- GA implementation provided by `amari-core` crate
- Conversions implemented via `IntoGeometric` and `FromGeometric` traits
- User types cached alongside GA representation for reconstruction
- 8D algebra (GA8) planned for rich UI state

## References

- Dorst, Fontijne, Mann: "Geometric Algebra for Computer Science"
- Hestenes, Sobczyk: "Clifford Algebra to Geometric Calculus"
- Elliott, Hudak: "Functional Reactive Animation" (for FRP foundation)
- Shapiro et al.: "A Comprehensive Study of CRDTs" (for CRDT comparison)
