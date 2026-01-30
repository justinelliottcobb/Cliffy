# ADR-003: WASM-First Architecture

**Status:** Accepted
**Date:** 2024-01-15
**Authors:** Cliffy Team

## Context

Cliffy's core logic involves:

1. Geometric algebra operations (multivector products, rotors, exponentials)
2. Reactive graph management (subscriptions, propagation)
3. State synchronization (CRDT operations, conflict resolution)

These operations are computationally intensive and benefit from:

- Static typing and compile-time optimization
- Memory safety guarantees
- Consistent behavior across platforms

We needed to decide where to implement the core logic: JavaScript, Rust/WASM, or a hybrid approach.

## Decision

**Implement Cliffy's core in Rust, compiled to WebAssembly (WASM), with thin JavaScript bindings.**

Architecture:

```
JavaScript (user code)
        │
        ▼
  wasm-bindgen bindings (cliffy-wasm)
        │
        ▼
  Rust implementation (cliffy-core)
        │
        ▼
  Geometric algebra (amari-core)
```

## Rationale

### Why Rust + WASM?

1. **Performance**: Rust compiles to efficient WASM code. Geometric algebra operations (matrix multiplications, exponentials) run faster in WASM than JS.

2. **Type safety**: Rust's type system catches bugs at compile time. This is critical for geometric algebra where incorrect operations produce silent wrong answers.

3. **Memory safety**: Rust guarantees memory safety without garbage collection. This enables predictable performance for real-time applications.

4. **Code sharing**: Same Rust code can target WASM (browsers), native (servers), and potentially mobile (via Rust-to-iOS/Android).

5. **Ecosystem**: Rust has excellent geometric algebra libraries (`amari-core`), testing frameworks, and build tools.

### Why Not Pure JavaScript?

| Concern | JavaScript | Rust/WASM |
|---------|------------|-----------|
| Performance | Slow for math | Native speed |
| Type safety | Runtime errors | Compile-time |
| Memory | GC pauses | Predictable |
| Correctness | Hard to verify | Type-checked |
| Binary size | N/A | ~200KB gzipped |

For a framework doing thousands of geometric operations per second, the performance difference matters.

### Why Not Native Extensions?

Native Node.js addons (N-API) were considered but rejected:

- Require different binaries per platform
- Complex build/distribution
- Don't work in browsers

WASM is portable: build once, run everywhere.

## WASM Boundary Design

The JavaScript/WASM boundary is a key design point:

```typescript
// JavaScript API (what users see)
const count = behavior(0);
count.update(n => n + 1);
count.subscribe(n => console.log(n));

// WASM boundary (what happens internally)
// 1. behavior(0) → Rust allocates Behavior, returns handle
// 2. update() → JS callback crosses to WASM, Rust updates state
// 3. subscribe() → Rust stores callback, invokes on changes
```

### Crossing the Boundary

| Direction | Data Flow | Implementation |
|-----------|-----------|----------------|
| JS → WASM | Primitives | Direct copy |
| JS → WASM | Objects | Serde serialization |
| JS → WASM | Callbacks | wasm-bindgen closure |
| WASM → JS | Primitives | Direct copy |
| WASM → JS | Objects | Serde serialization |
| WASM → JS | Callbacks | Not supported (call from Rust) |

### Minimizing Boundary Crossings

The boundary has overhead, so we:

1. **Batch updates**: Multiple state changes in one WASM call
2. **Lazy evaluation**: Derived behaviors don't cross until sampled
3. **Cache on JS side**: Store last value to avoid round-trips
4. **Efficient serialization**: Use typed arrays for bulk data

## Consequences

### Positive

- **Performance**: 10-100x faster for compute-heavy operations
- **Correctness**: Type system catches geometric algebra bugs
- **Portability**: Same code for browser, Node, Deno, edge workers
- **Memory safety**: No use-after-free, no buffer overflows
- **Tooling**: Rust's cargo, clippy, and test frameworks

### Negative

- **Build complexity**: Requires wasm-pack, additional build step
- **Bundle size**: WASM adds ~200KB (gzipped) to application
- **Debugging**: WASM stack traces less readable than JS
- **Boundary overhead**: Crossing JS/WASM has cost
- **Learning curve**: Contributors need Rust knowledge

### Neutral

- **Browser support**: WASM supported in all modern browsers
- **Async**: WASM is synchronous, requires web workers for heavy compute
- **Source maps**: Improving but not as good as native JS

## Alternatives Considered

### 1. Pure JavaScript

- **Pro**: Simpler build, smaller bundle
- **Con**: Too slow for geometric algebra
- **Con**: Type safety only with TypeScript (still runtime)

### 2. AssemblyScript

- **Pro**: TypeScript-like syntax compiles to WASM
- **Con**: Less mature ecosystem
- **Con**: Fewer geometric algebra libraries

### 3. C++/Emscripten

- **Pro**: Maximum performance
- **Con**: Memory safety concerns
- **Con**: Complex build system

### 4. Server-Side Only

- **Pro**: No WASM needed
- **Con**: Latency for real-time collaboration
- **Con**: Server costs scale with users

### 5. Hybrid (JS for simple, WASM for complex)

- **Pro**: Best of both worlds
- **Con**: Complexity of maintaining two implementations
- **Con**: Behavior differences between paths

## Implementation Notes

### Build Configuration

```toml
# cliffy-wasm/Cargo.toml
[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
cliffy-core = { path = "../cliffy-core" }
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
```

### Bundle Optimization

- Use `wasm-opt` for size optimization
- Enable LTO (link-time optimization)
- Tree-shake unused exports
- Compress with gzip/brotli

### Error Handling

Rust errors are converted to JavaScript exceptions:

```rust
#[wasm_bindgen]
pub fn behavior(value: JsValue) -> Result<Behavior, JsValue> {
    let rust_value = serde_wasm_bindgen::from_value(value)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(Behavior::new(rust_value))
}
```

## Performance Benchmarks

Measured on M1 MacBook Pro:

| Operation | Pure JS | Rust/WASM | Speedup |
|-----------|---------|-----------|---------|
| 1000 geometric products | 12ms | 0.8ms | 15x |
| 10000 behavior updates | 45ms | 3ms | 15x |
| CRDT merge (1000 ops) | 89ms | 5ms | 18x |

Note: Actual speedup varies by operation and data size.

## References

- WebAssembly specification: https://webassembly.org/
- wasm-bindgen guide: https://rustwasm.github.io/wasm-bindgen/
- Lin Clark: "A cartoon intro to WebAssembly"
- Rust and WebAssembly book: https://rustwasm.github.io/docs/book/
