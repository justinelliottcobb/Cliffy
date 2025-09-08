# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Architecture

Cliffy is an experimental web framework that uses **Clifford/Geometric Algebra** as its mathematical foundation, exploring alternatives to traditional virtual DOM with **Algebraic TSX** - a compile-time graph specification language.

### Key Paradigm Shift
- **Traditional React**: JSX → Virtual DOM → Reconciliation → DOM Updates
- **Cliffy**: TSX → Geometric Dataflow Graphs → Direct Mathematical Transformations → DOM

### TSX as Algebraic Graph Specification
TSX expressions in Cliffy do NOT create virtual DOM. Instead:
```tsx
<div onClick={clicks$} style={style$}>{count$}</div>
```
Creates a **geometric dataflow graph** where:
- `clicks$` is a `GeometricEvent<MouseEvent>`
- `style$` is a `GeometricBehavior<CSSProperties>`
- `count$` is a reactive projection `GeometricBehavior<VNode[]>`

### Framework Layers

#### 1. Rust/WASM Core (`cliffy-core`, `cliffy-wasm`)
- **Clifford Algebra Implementation**: Supports Cl(3,0), Cl(4,1), Cl(4,4) algebras
- **High-Performance Math**: SIMD-optimized geometric operations
- **WASM Bindings**: Direct integration with TypeScript layer

#### 2. TypeScript Framework (`cliffy-typescript`)
- **`algebraic-jsx.ts`**: JSX factory that creates geometric dataflow graphs
- **`algebraic-combinators.ts`**: Control flow (`When`, `For`, `Map`) replacing JS conditionals
- **`geometric-runtime.ts`**: Direct graph-to-DOM projection (no virtual DOM)
- **`behavior.ts`**: Geometric behaviors using multivector mathematics

#### 3. State Management Approach
All state uses **GeometricBehavior<T>** with Clifford algebra operations:
```tsx
const todosState = createGeometricBehavior<Todo[]>([]);
// Updates use geometric transformations
const addTodo = () => {
  const translation = cliffy.translator(1, 0, 0); // e1 axis translation
  todosState.setValue(todos => [...todos, newTodo]);
};
```

## Build System & Commands

### Primary Build Commands
```bash
# Build entire framework (Rust → WASM → TypeScript → Examples)
npm run build

# Individual component builds
npm run build:rust          # Compile Rust to WASM with SIMD optimization
npm run build:typescript    # TypeScript compilation + WASM integration
npm run build:purescript    # PureScript bindings

# Development
npm run dev                 # Concurrent development with file watching
npm run watch:rust          # Cargo watch for Rust changes
```

### Testing & Quality
```bash
# Run all tests (Rust + TypeScript)
npm test

# Individual test suites
cargo test --workspace      # Rust unit/integration tests
npm run test:typescript     # TypeScript/Vitest tests

# Linting and type checking
npm run lint                # ESLint for TypeScript
npm run type-check          # TypeScript compiler checks
```

### Example Development
```bash
# TodoApp (primary algebraic TSX example)
cd examples/todo-app && npm run dev

# Collaborative editor (distributed CRDT example)
cd examples/collaborative-editor && npm run dev
```

## Critical Architecture Concepts

### Algebraic Control Flow Combinators
Replace JavaScript control structures with mathematical operations:
- **`<When condition={bool$}>`** instead of `{bool ? <A/> : null}`
- **`<For each={items$} key={...}>`** instead of `{items.map(...)}`
- **`<Map from={data$} to={transform}>`** for functional transformations

### Geometric Behaviors vs Traditional State
- **Traditional**: `useState(value)` → imperative updates
- **Cliffy**: `createGeometricBehavior<T>(value)` → geometric transformations
- Updates use Clifford algebra: translations, rotations, scaling operations
- Reactive system based on multivector mathematics

### Direct Graph Projection (No Virtual DOM)
- TSX compiles at **build-time** to optimized geometric dataflow graphs
- **Runtime**: Only data flows through pre-compiled graph structure
- **DOM Updates**: Direct mathematical transformations, no reconciliation needed
- **Performance**: Eliminates virtual DOM overhead entirely

## Development Workflow

### Working with Algebraic TSX
1. **State**: Use `createGeometricBehavior<T>()` for all reactive state
2. **Control Flow**: Use combinators (`When`, `For`, `Map`) not JS conditionals
3. **Updates**: Apply geometric transformations using Clifford algebra operations
4. **Components**: Return `AlgebraicElement` structures, not virtual DOM

### WASM Integration Points
- **`cliffy-wasm/src/lib.rs`**: Rust-WASM boundary definitions
- **Build Process**: `wasm-pack` generates TypeScript bindings automatically
- **Performance**: SIMD-optimized geometric operations in Rust core

### Multi-Language Bindings
- **TypeScript**: Primary development interface (`cliffy-typescript/`)
- **PureScript**: Functional programming interface (`cliffy-purescript/`)
- **Rust**: Core mathematical operations (`cliffy-core/`)

## Framework Extension Points

### Custom Geometric Behaviors
Extend the behavior system by implementing the `GeometricBehavior<T>` interface with `sample()`, `map()`, `flatMap()`, and `combine()` methods.

### New Algebraic Combinators
Add to `algebraic-combinators.ts` following the pattern of existing combinators like `When` and `For`.

### Clifford Algebra Extensions
Extend geometric operations in `cliffy-core/src/lib.rs` for new mathematical transformations.

## Performance Characteristics

### Compile-Time Optimizations
- **Graph Optimization**: Uses geometric algebra properties (associativity, commutativity)
- **Dead Code Elimination**: Unused dataflow paths removed at build time
- **SIMD Vectorization**: Geometric operations use WASM SIMD instructions

### Runtime Performance
- **Zero Virtual DOM**: Direct mathematical transformations to DOM
- **Minimal JavaScript**: Core logic in optimized WASM
- **Incremental Updates**: Only changed behaviors trigger DOM updates

The framework explores an alternative approach to UI development, using mathematical/algebraic specification with Clifford algebra as the foundation.