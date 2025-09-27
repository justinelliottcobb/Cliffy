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

#### 3. Living UI System (`cliffy-alive`)
- **Revolutionary Paradigm**: UI components are living cells in 8-dimensional geometric space
- **Cellular Automata**: Each UI element is a cell with DNA, energy, and lifecycle
- **Evolutionary Adaptation**: Real-time evolution based on user interaction fitness
- **8D Geometric Space**: Position (x,y), size (width,height), visual properties (z-index, opacity, rotation, scale)
- **Genetic Algorithm**: DNA-based behavior with traits, affinities, mutation, and crossover
- **Autonomous Organization**: Cells self-organize spatially based on genetic affinities

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
cargo test --workspace      # Rust unit/integration tests
npm run test:typescript     # TypeScript/Vitest tests

# Living UI system tests
cargo test -p cliffy-alive   # Cellular automata and evolution tests

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

# Living UI playground (cellular automata demo)
cd examples/living-ui && npm run dev
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
- **`cliffy-core`**: Complete Clifford algebra implementation with SIMD optimization
- **`cliffy-wasm`**: WASM bindings for browser integration
- **`cliffy-typescript`**: Algebraic TSX framework with geometric behaviors
- **`cliffy-alive`**: Revolutionary living UI system with cellular automata and evolutionary algorithms

### Recent Development
- **Living UI System**: Just completed comprehensive implementation of cellular automata-based UI
- **8D Geometric Space**: UI cells exist in 8-dimensional space for complete visual control
- **Genetic Algorithms**: Full DNA system with traits, affinities, selection, crossover, and mutation
- **Test Suite**: Comprehensive test coverage for cell behavior, organism management, evolution, and WASM integration
- **Branch Status**: Code is on `cliffy-alive-living-ui` branch, ready for merge

### Next Development Priorities
1. **Living UI Examples**: Create interactive demos showcasing evolutionary UI adaptation
2. **Performance Optimization**: Profile and optimize cellular automata for real-world applications
3. **Integration Layer**: Bridge between Algebraic TSX and Living UI for hybrid applications
4. **Documentation**: Complete API documentation for the living UI system

The framework explores revolutionary approaches to UI development, using mathematical/algebraic specification with Clifford algebra as the foundation, and now includes living cellular automata that evolve based on user interactions.