# Cliffy

An experimental web framework exploring Clifford/Geometric Algebra as a mathematical foundation for reactive user interfaces.

## Overview

Cliffy is a hobby project investigating whether geometric algebra can provide a more mathematical approach to web development. Instead of traditional virtual DOM reconciliation, it uses algebraic transformations and compile-time graph optimization.

### Core Concepts

- **Algebraic TSX**: TSX expressions compile to geometric dataflow graphs rather than virtual DOM
- **Geometric Behaviors**: Reactive state management using multivector mathematics
- **Direct Transformations**: Mathematical operations map directly to DOM updates
- **WASM Core**: Performance-critical geometric operations implemented in Rust

## Architecture

The framework consists of several layers:

### Rust/WASM Core
- `cliffy-core`: Clifford algebra implementation supporting Cl(3,0), Cl(4,1), Cl(4,4)
- `cliffy-wasm`: WebAssembly bindings with SIMD optimization
- `cliffy-frp`: Functional reactive programming primitives
- `cliffy-protocols`: Distributed systems and CRDT implementations

### TypeScript Framework
- `cliffy-typescript`: Primary development interface
- `cliffy-dom`: Geometric virtual DOM implementation
- `cliffy-components`: Reusable algebraic components

### Build Tools
- `vite-plugin-algebraic-tsx`: Transforms TSX syntax to jsx() function calls

### Language Bindings
- TypeScript (primary interface)
- PureScript (functional programming approach)

## Algebraic TSX Support

The framework now supports true TSX syntax through a Vite plugin:

```tsx
// Write beautiful TSX with algebraic combinators:
<div>
  <When condition={isVisible$}>
    <h1>Hello Cliffy!</h1>
  </When>
  
  <For each={items$} key={item => item.id}>
    {(item$) => <div>{item$.map(i => i.name)}</div>}
  </For>
</div>
```

This gets transformed at build time into geometric dataflow graphs.

## Build System

The project uses a multi-language build pipeline:

```bash
# Full build (Rust → WASM → TypeScript → Examples)
npm run build

# Individual builds
npm run build:rust          # Rust to WASM with SIMD
npm run build:typescript    # TypeScript compilation
npm run build:purescript    # PureScript bindings

# Development
npm run dev                 # Concurrent development server
npm run watch:rust          # Watch Rust changes
```

### Testing

```bash
# Run all tests
npm test

# Individual test suites
cargo test --workspace      # Rust tests
npm run test:typescript     # TypeScript tests
```

## Examples

### Basic Counter (TypeScript + Algebraic TSX)
Demonstrates fundamental concepts with the new TSX syntax:

```bash
cd examples/algebraic-tsx-test
npm run dev
```

### Todo App (TypeScript)
Classic TodoMVC with geometric behaviors:

```bash
cd examples/todo-app
npm run dev
```

### Form Validation
Complex state management and validation:

```bash
cd examples/form-validation
npm run dev
```

### Geometric Animations
Showcases Clifford algebra transformations:

```bash
cd examples/geometric-animations
npm run dev
```

### Collaborative Editor
Real-time collaborative text editor using geometric algebra for conflict resolution:

```bash
cd examples/collaborative-editor
npm run dev
```

## Development Status

This is an experimental project exploring novel approaches to UI frameworks. The geometric algebra implementation is under active development and may not compile successfully.

### Current Focus
- ✅ Core Clifford algebra operations
- ✅ Algebraic control flow combinators
- ✅ Vite plugin for TSX transformation
- 🚧 WASM performance optimization with SIMD
- 🚧 Example applications

## CI/CD Pipeline

The project includes comprehensive automation:

- **Continuous Integration**: Rust compilation, TypeScript builds, testing
- **Security Auditing**: Dependency vulnerability scanning
- **Performance Monitoring**: Geometric algebra operation benchmarks
- **Automated Releases**: NPM package publishing
- **Dependency Management**: Automated updates via Dependabot

## Mathematical Foundation

### Algebraic Control Flow
Traditional JavaScript control structures are replaced with mathematical operations:

```tsx
// Instead of: {condition ? <Component /> : null}
<When condition={condition$}>
  <Component />
</When>

// Instead of: {items.map(item => <Item key={item.id} {...item} />)}
<For each={items$} key={item => item.id}>
  {item => <Item {...item} />}
</For>
```

### Geometric Behaviors
State management uses `GeometricBehavior<T>` with Clifford algebra operations:

```tsx
const position$ = createGeometricBehavior(Vector3.zero());
const rotation$ = createGeometricBehavior(Rotor.identity());

// Updates use geometric transformations
const translate = (delta: Vector3) => {
  position$.update(pos => pos.add(delta));
};
```

## Contributing

This is a personal exploration project, but contributions and discussions are welcome. Please note that the codebase is experimental and may undergo significant changes.

## License

MIT