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
- **⚠️ Note**: Originally intended to use `amari-wasm` for geometric functions. Current `cliffy-core` implementation may be redundant and subject to refactoring.

#### 2. TypeScript Framework (`cliffy-typescript`)
- **`algebraic-jsx.ts`**: JSX factory that creates geometric dataflow graphs
- **`algebraic-combinators.ts`**: Control flow (`When`, `For`, `Map`) replacing JS conditionals
- **`geometric-runtime.ts`**: Direct graph-to-DOM projection (no virtual DOM)
- **`behavior.ts`**: Geometric behaviors using multivector mathematics

#### 3. Living UI System (`cliffy-alive`)
- **Revolutionary Paradigm**: UI components are living cells in 8-dimensional geometric space
- **Cellular Automata**: Each UI element is a cell with DNA, energy, and lifecycle
- **Evolutionary Adaptation**: Real-time evolution based on user interaction fitness
- **8D Geometric Space**: Position (x,y), size (width,height), visual properties (z-index, opacity, rotation, scale)
- **Genetic Algorithm**: DNA-based behavior with traits, affinities, mutation, and crossover
- **Autonomous Organization**: Cells self-organize spatially based on genetic affinities

**⚠️ Status**: Implementation complete but currently non-functional due to missing external dependencies:
- **External Dependencies**:
  - `amari-core` (path: ../../amari/amari-core) - Cellular automata foundation
  - `amari-fusion` (path: ../../amari/amari-fusion) - Geometric product operations
- **Impact**: Cannot compile; blocks workspace-level cargo commands
- **Source Files**: Complete implementation with 7 modules (~164KB of Rust code)
  - `ui_cell.rs` (30,910 bytes), `ui_organism.rs` (24,003 bytes), `evolution.rs` (23,896 bytes)
  - `metabolism.rs` (18,699 bytes), `nervous_system.rs` (29,179 bytes), `physics.rs` (27,603 bytes)
- **Test Suite**: Complete test coverage (4 test files, ~35KB)

#### 4. State Management Approach
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
cargo test --workspace      # ⚠️ Currently blocked by cliffy-alive dependencies
npm run test:typescript     # TypeScript/Vitest tests

# Individual crate tests (workaround)
cargo test -p cliffy-core
cargo test -p cliffy-wasm
# cargo test -p cliffy-alive   # ⚠️ Blocked by missing amari dependencies

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

# Basic counter (fundamental patterns)
cd examples/basic-counter && npm run dev

# Form validation (complex state management)
cd examples/form-validation && npm run dev

# Geometric animations (transformation showcase)
cd examples/geometric-animations && npm run dev

# Geometric visualization (3D interactive demos with Three.js)
cd examples/geometric-visualization && npm run dev

# ⚠️ Living UI playground - Not yet created (planned)
# cd examples/living-ui && npm run dev
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

### Living UI Cellular Automata
- **Biological UI**: Components are living cells with DNA, energy, age, and fitness
- **8D Geometric Space**: Each cell exists in position(x,y) + size(w,h) + visual(z,opacity,rotation,scale)
- **Evolutionary Pressure**: User interactions provide fitness feedback for natural selection
- **Genetic System**: Cells have DNA with traits (energy_efficiency, cooperation) and affinities to other cell types
- **Autonomous Organization**: Spatial forces organize cells based on genetic affinities and energy sources
- **Real-time Evolution**: Population evolves through selection, crossover, and mutation based on user behavior

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

### Working with Living UI
1. **Cell Creation**: Use `UICell::new(cell_type)` to create living UI components
2. **DNA Programming**: Define cell behavior through genetic traits and affinities
3. **Energy Sources**: Position energy sources to guide cell organization and survival
4. **Evolution Config**: Set selection pressures and mutation rates for desired adaptation
5. **Organism Management**: Use `UIOrganismField` to manage cell populations and evolution

### WASM Integration Points
- **`cliffy-wasm/src/lib.rs`**: Rust-WASM boundary definitions
- **Build Process**: `wasm-pack` generates TypeScript bindings automatically
- **Performance**: SIMD-optimized geometric operations in Rust core

### Multi-Language Bindings
- **TypeScript**: Primary development interface (`cliffy-typescript/`)
- **PureScript**: Functional programming interface (`cliffy-purescript/`)
- **Rust**: Core mathematical operations (`cliffy-core/`, `cliffy-alive/`)

## Framework Extension Points

### Custom Geometric Behaviors
Extend the behavior system by implementing the `GeometricBehavior<T>` interface with `sample()`, `map()`, `flatMap()`, and `combine()` methods.

### New Algebraic Combinators
Add to `algebraic-combinators.ts` following the pattern of existing combinators like `When` and `For`.

### Clifford Algebra Extensions
Extend geometric operations in `cliffy-core/src/lib.rs` for new mathematical transformations.

### Living UI Cell Types
Add new cell types in `cliffy-alive/src/ui_cell.rs` by extending the `UICellType` enum and implementing their specific behaviors.

### Evolution Strategies
Implement custom evolution strategies in `cliffy-alive/src/evolution.rs` by extending the `EvolutionStrategy` enum.

## Performance Characteristics

### Compile-Time Optimizations
- **Graph Optimization**: Uses geometric algebra properties (associativity, commutativity)
- **Dead Code Elimination**: Unused dataflow paths removed at build time
- **SIMD Vectorization**: Geometric operations use WASM SIMD instructions

### Runtime Performance
- **Zero Virtual DOM**: Direct mathematical transformations to DOM
- **Minimal JavaScript**: Core logic in optimized WASM
- **Incremental Updates**: Only changed behaviors trigger DOM updates
- **Living UI Optimization**: Cellular automata run in separate threads, spatial indexing for collision detection

## Current Project State

### Implemented Modules
- **`cliffy-core`**: Clifford algebra implementation (⚠️ may be redundant with amari)
- **`cliffy-wasm`**: WASM bindings for browser integration
- **`cliffy-typescript`**: Algebraic TSX framework with geometric behaviors
  - All documented files present: `algebraic-jsx.ts`, `algebraic-combinators.ts`, `geometric-runtime.ts`, `behavior.ts`, etc.
- **`cliffy-frp`**: Functional reactive programming primitives
- **`cliffy-dom`**: DOM manipulation layer
- **`cliffy-protocols`**: Communication protocols
- **`cliffy-gpu`**: GPU acceleration support
- **`cliffy-components`**: Reusable component library
- **`cliffy-alive`**: Living UI implementation (⚠️ non-functional due to missing dependencies)

### Working Examples
All examples are implemented and contain source code:
- ✅ `basic-counter` - Fundamental Cliffy patterns
- ✅ `todo-app` - Complete TodoMVC with algebraic TSX
- ✅ `form-validation` - Complex state management and validation
- ✅ `geometric-animations` - Transformation showcase
- ✅ `geometric-visualization` - 3D interactive demos with Three.js
- ✅ `collaborative-editor` - Real-time CRDT editor
- ✅ `algebraic-tsx-test` - Vite plugin testing
- ✅ `dashboard` - Dashboard example
- ❌ `living-ui` - Planned but not yet created

### Recent Development
- **Living UI System**: Source implementation complete with comprehensive modules:
  - 7 core modules: ui_cell, ui_organism, evolution, metabolism, nervous_system, physics, renderer
  - 4 test files: ui_cell_test, organism_test, evolution_test, integration_test
  - Total: ~164KB of Rust source + ~35KB of tests
- **8D Geometric Space**: Fully implemented in ui_cell.rs
- **Genetic Algorithms**: Complete DNA system with traits, affinities, selection, crossover, and mutation
- **Branch Status**: Code on `cliffy-alive-living-ui` branch

### Known Issues & Blockers

#### 1. Missing External Dependencies (Critical)
`cliffy-alive` depends on external `amari` project that is not present:
- `amari-core` (../../amari/amari-core) - Cellular automata foundation
- `amari-fusion` (../../amari/amari-fusion) - Geometric product operations

**Impact**:
- ❌ Cannot compile `cliffy-alive`
- ❌ Blocks all workspace-level cargo commands (`cargo test --workspace`, `cargo build --workspace`)
- ❌ Prevents Living UI functionality

**Workarounds**:
- Build individual crates: `cargo build -p cliffy-core`, `cargo build -p cliffy-wasm`
- Temporarily remove `cliffy-alive` from workspace members in `Cargo.toml`

#### 2. Dependency Strategy Resolved ✅
**Decision Made**: Complete migration to Amari for all geometric operations.

**Implementation Status**:
- ✅ `cliffy-core` now depends on `amari-core = "0.9.8"`
- ✅ `cliffy-alive` now depends on `amari-core = "0.9.8"` and `amari-fusion = "0.9.8"`
- ✅ Redundant geometric algebra code removed from cliffy-core (299 lines → 104 lines)
- ✅ `cliffy-core` now provides ONLY `ReactiveMultivector<T>` wrapper
- ⚠️  API mismatch: cliffy-alive code expects `GA3`/`GA4_1` type aliases that don't exist in Amari 0.9.8

**Amari API Reality**:
```rust
// Amari 0.9.8 provides:
pub struct Multivector<const P: usize, const Q: usize, const R: usize>

// cliffy-alive expects (doesn't exist):
use amari_core::{GA3, GA4_1, scalar_traits::Float};
```

**Next Step**: Add type alias compatibility layer or rewrite cliffy-alive to use actual Amari API

### Next Development Priorities
1. **API Compatibility Layer**: Add type aliases to cliffy-core to bridge Amari API mismatch
   - Create `GA3<T>` → `Multivector<3,0,0>` alias
   - Create `GA4_1<T>` → `Multivector<4,1,0>` alias
   - Re-export `scalar_traits` module
2. **Fix cliffy-alive Compilation Issues**:
   - Create missing `renderer` module
   - Fix syntax error in `ui_cell.rs` (literal `\n` in imports)
   - Resolve `amari-automata` dependency (commented out, not published)
3. **Living UI Examples**: Create `examples/living-ui` demo once cliffy-alive compiles
4. **Integration Testing**: Verify end-to-end compilation and functionality
5. **Documentation**: Complete API documentation for the living UI system

## Workspace Structure

### Rust Workspace (`Cargo.toml`)
Current workspace members:
- `cliffy-core` - Geometric algebra core (may be redundant)
- `cliffy-frp` - Functional reactive programming
- `cliffy-wasm` - WASM bindings
- `cliffy-protocols` - Communication protocols
- `cliffy-gpu` - GPU acceleration
- `cliffy-dom` - DOM manipulation
- `cliffy-components` - Component library
- `cliffy-alive` - Living UI (⚠️ broken dependencies)
- `examples/collaborative-editor` - CRDT example with Rust backend

### NPM Workspace (`package.json`)
Current npm workspaces:
- `cliffy-typescript` - Main TypeScript framework
- `cliffy-purescript` - PureScript bindings
- `vite-plugin-algebraic-tsx` - Build-time TSX transformation plugin
- `examples/*` - All example applications (8 total)

### Build Tooling
- **Vite Plugin**: `vite-plugin-algebraic-tsx` transforms TSX at build time into geometric dataflow graphs
- **WASM Integration**: `wasm-pack` builds Rust → WASM with TypeScript bindings
- **Multi-Language**: TypeScript (primary), PureScript (functional), Rust (core math)

The framework explores revolutionary approaches to UI development, using mathematical/algebraic specification with Clifford algebra as the foundation, and now includes living cellular automata that evolve based on user interactions.