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

**✅ Status**: Fully functional with comprehensive test coverage (66 tests passing)
- **Source Files**: Complete implementation with 7 modules (~164KB of Rust code)
  - `ui_cell.rs` (30,910 bytes), `ui_organism.rs` (24,003 bytes), `evolution.rs` (23,896 bytes)
  - `metabolism.rs` (18,699 bytes), `nervous_system.rs` (29,179 bytes), `physics.rs` (27,603 bytes)
- **Test Suite**: 66 tests passing (39 unit + 27 integration across 4 test files)

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
cargo test --workspace      # ⚠️ Blocked by unmigrated crates (protocols, dom, gpu)
npm run test:typescript     # TypeScript/Vitest tests

# Working crate tests
cargo test -p cliffy-core   # 2 tests
cargo test -p cliffy-alive  # 66 tests
cargo test -p cliffy-frp    # 4 tests

# Blocked crates (need Amari 0.9.8 migration)
# cargo test -p cliffy-protocols  # ⚠️ 47+ compile errors
# cargo test -p cliffy-dom        # ⚠️ 16+ errors, also missing modules
# cargo test -p cliffy-gpu        # ⚠️ 31+ compile errors
# cargo test -p cliffy-wasm       # ⚠️ Blocked by cliffy-protocols
# cargo test -p cliffy-components # ⚠️ Blocked by cliffy-dom

# Linting and type checking
npm run lint                # ESLint for TypeScript
npm run type-check          # TypeScript compiler checks
```

### Git Hooks

The project includes automated git hooks to ensure code quality:

**Pre-Commit Hook** (`.git/hooks/pre-commit`):
- Runs `cargo fmt --check` to verify code formatting
- Runs `cargo clippy --all-targets` to check for common mistakes
- Runs `cargo test --lib` to execute unit tests
- **Policy**: Allows warnings but fails on errors for practical development

**Pre-Push Hook** (`.git/hooks/pre-push`):
- Runs `cargo test` for complete test suite (unit + integration)
- Runs `cargo test --doc` to verify documentation examples
- Runs `cargo build` to ensure clean compilation
- **Purpose**: Comprehensive validation before pushing to remote

**Configuration**:
```bash
# Hooks are located in .git/hooks/ and auto-execute on git operations
# To bypass hooks (not recommended):
git commit --no-verify
git push --no-verify
```

**Known Issues**:
- WASM integration tests (integration_test.rs) disabled pending wasm_bindgen_test configuration
- See tests/integration_test.rs.disabled for details

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

**Working Crates** ✅:
- **`cliffy-core`**: Clifford algebra implementation with type aliases (GA3, GA4_1, STA) - 2 tests
- **`cliffy-alive`**: Living UI with cellular automata and evolution - 66 tests
- **`cliffy-frp`**: Functional reactive programming with geometric behaviors - 4 tests
- **`cliffy-typescript`**: Algebraic TSX framework with geometric behaviors
  - All documented files present: `algebraic-jsx.ts`, `algebraic-combinators.ts`, `geometric-runtime.ts`, `behavior.ts`, etc.

**Blocked Crates** (need Amari 0.9.8 migration) ⚠️:
- **`cliffy-protocols`**: Consensus and CRDT protocols - uses old `Multivector<T, N>` API
- **`cliffy-dom`**: DOM manipulation layer - uses old API + missing module files (vnode, reconciler, renderer, events)
- **`cliffy-gpu`**: GPU acceleration - uses old `Multivector<f32, 8>` API
- **`cliffy-wasm`**: WASM bindings - blocked by cliffy-protocols dependency
- **`cliffy-components`**: Component library - blocked by cliffy-dom dependency

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

### Recent Development (December 2024)
- **Core Crates Fully Working** ✅:
  - `cliffy-core`: 2 tests passing - type aliases (GA3, GA4_1, STA) for Amari 0.9.8
  - `cliffy-alive`: 66 tests passing - Living UI fully functional
  - `cliffy-frp`: 4 tests passing - Reactive geometric behaviors working
- **Living UI System**: Fully functional with comprehensive test coverage
  - 7 core modules: ui_cell, ui_organism, evolution, metabolism, nervous_system, physics, renderer
  - 66 tests passing (39 unit + 27 integration)
  - 8D geometric space for complete visual control
  - DNA-based genetic algorithms with traits, affinities, mutation, and crossover
- **Blocking Issues Identified**:
  - `cliffy-protocols`: 47+ errors, needs Amari API migration
  - `cliffy-dom`: 16+ errors, needs migration + missing module files
  - `cliffy-gpu`: 31+ errors, needs Amari API migration
  - These block: `cliffy-wasm`, `cliffy-components`, and workspace-level builds
- **Git Hooks Setup**: Automated quality checks
  - Pre-commit: cargo fmt, clippy, unit tests
  - Pre-push: full test suite, doctests, build verification
- **CI/CD Simplified**: Reduced from 11 to 2 checks for focused development
- **Branch Status**: Code on `cliffy-alive-api-rewrite` branch

### Known Issues & Blockers

#### 1. Amari 0.9.8 Migration Status

**Completed Migrations** ✅:
- ✅ **`cliffy-core`**: Added type aliases (GA3, GA4_1, STA) for Amari 0.9.8 compatibility
- ✅ **`cliffy-alive`**: Fully migrated to Amari 0.9.8 API (66/66 tests passing)
  - Complete test suite refactored for new API
  - All compilation errors resolved
  - Living UI system functional with cellular automata and evolution
- ✅ **`cliffy-frp`**: Migrated from generic `Multivector<T,N>` to concrete `GA3` (4/4 tests passing)
  - Simplified to 3D Euclidean algebra (Cl(3,0))
  - Reactive geometric behaviors working

**Pending Migrations** ⚠️:
- ⚠️ **`cliffy-protocols`**: Needs migration to Amari 0.9.8+ API
  - Still uses old `Multivector<T, N>` generic parameters (47+ compile errors)
  - Contains consensus and CRDT protocols using geometric algebra
  - Blocks: `cliffy-wasm` (has cliffy-protocols dependency)
- ⚠️ **`cliffy-dom`**: Needs migration + completion
  - Uses old `cliffy_core::cl3_0::Multivector3D` API (16+ compile errors)
  - Missing module files: `vnode.rs`, `reconciler.rs`, `renderer.rs`, `events.rs`
  - Blocks: `cliffy-components` (has cliffy-dom dependency)
- ⚠️ **`cliffy-gpu`**: Needs migration to Amari 0.9.8+ API
  - Uses old `Multivector<f32, 8>` API (31+ compile errors)
  - Standalone crate, no downstream dependencies

**Amari API Changes**:
```rust
// Amari 0.9.8 changed from:
Multivector<T, N>  // Old: generic scalar type T, dimension N

// To:
Multivector<P, Q, R>  // New: signature (P,Q,R) with fixed f64 scalars
// Example: Multivector<3, 0, 0> = 3D Euclidean (Cl(3,0))
```

**Type Aliases Provided** (cliffy-core):
```rust
pub type GA3 = Multivector<3, 0, 0>;    // 3D Euclidean
pub type GA4_1 = Multivector<4, 1, 0>;  // Conformal GA
pub type STA = Multivector<1, 3, 0>;    // Spacetime algebra
```

### Next Development Priorities
1. **Complete Amari 0.9.8 Migration** (unblock workspace builds):
   - Migrate `cliffy-protocols` to new Amari API → unblocks `cliffy-wasm`
   - Migrate `cliffy-gpu` to new Amari API (standalone)
   - Complete `cliffy-dom` migration + add missing module files → unblocks `cliffy-components`
2. **Living UI Examples**: Create interactive demos showcasing evolutionary UI adaptation
   - Build `examples/living-ui` demo application
   - Demonstrate cellular automata, genetic algorithms, and spatial organization
   - Show real-time evolution based on user interaction patterns
3. **Performance Optimization**: Profile and optimize cellular automata for production
   - Spatial indexing optimizations for collision detection
   - Parallel processing for evolution algorithms
   - WASM integration for browser performance
4. **Integration Layer**: Bridge between Algebraic TSX and Living UI
   - Enable hybrid applications using both paradigms
   - Reactive bindings between TSX components and living cells
5. **Documentation & Examples**: Comprehensive documentation
   - Living UI API reference
   - API migration guide
   - Best practices for evolutionary UI design

## Workspace Structure

### Rust Workspace (`Cargo.toml`)
Current workspace members:
- ✅ `cliffy-core` - Geometric algebra core with type aliases (2 tests)
- ✅ `cliffy-frp` - Functional reactive programming (4 tests)
- ✅ `cliffy-alive` - Living UI with cellular automata (66 tests)
- ⚠️ `cliffy-wasm` - WASM bindings (blocked by cliffy-protocols)
- ⚠️ `cliffy-protocols` - Communication protocols (needs migration)
- ⚠️ `cliffy-gpu` - GPU acceleration (needs migration)
- ⚠️ `cliffy-dom` - DOM manipulation (needs migration + incomplete)
- ⚠️ `cliffy-components` - Component library (blocked by cliffy-dom)
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