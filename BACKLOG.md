# Technical Backlog

This document tracks technical debt, integration gaps, and planned work items discovered during development—particularly during documentation phases where gaps become visible.

## Organization

Items are categorized by:
- **Priority**: High (blocks user experience), Medium (developer experience), Low (polish)
- **Origin**: Which phase revealed the issue
- **Related Phase**: Which phase should address it

---

## High Priority (Blocks User Experience)

### Export/Packaging Issues

- [x] **Export `html.ts` from `cliffy-wasm` package** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: The `html` tagged template function exists in `cliffy-wasm/src/html.ts` but isn't bundled with the WASM package. Templates must include it locally.
  - Fix: Created post-build script that copies html.ts to pkg/ and updates package.json exports
  - Status: Completed - Import via `import { html, mount } from 'cliffy-wasm/html'`

- [x] **Create main `Cliffy.purs` module** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: PureScript FFI files exist (`Cliffy.Html`, `Cliffy.Html.Attributes`, `Cliffy.Html.Events`) but there's no main `Cliffy` module that re-exports `behavior`, `event`, `update`, `subscribe`, etc.
  - Fix: Created `cliffy-purescript/src/Cliffy.purs` with FRP primitive re-exports
  - Status: Completed - Added Behavior/Event types and FFI bindings

- [x] **Wire up PureScript package dependencies** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: `spago.dhall` template doesn't reference `cliffy-purescript` package
  - Fix: Added git dependency with subdir to `packages.dhall.template`
  - Status: Completed - Template now references cliffy-purescript from Cliffy monorepo

### API Completeness

- [ ] **Implement `initHtml()` integration**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: `html.ts` requires `initHtml(DOMProjection)` call but `DOMProjection` isn't exported from WASM
  - Fix: Export `DOMProjection` from cliffy-wasm or remove dependency

---

## Medium Priority (Developer Experience)

### Consistency Issues

- [ ] **Unify TypeScript/PureScript API naming**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4, Phase 8
  - Issue: Some naming inconsistencies between TS and PS APIs
  - Examples:
    - TS: `count.update(n => n + 1)` vs PS: `update (_ + 1) count`
    - TS: `className` vs PS: `className` (this one is consistent)
  - Fix: Document intentional differences, fix unintentional ones

- [ ] **Add TypeScript type definitions for html.ts**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: `html.ts` uses `any` casts and lacks strict typing in some places
  - Fix: Add proper generic types and remove `any` usage

### Documentation Gaps

- [x] **Document Behavior.map() vs Array.map() distinction** ✅
  - Origin: Phase 7 (Documentation)
  - Status: Added note in getting-started.md
  - Related: Phase 7

- [x] **Create Algebraic TSX migration guide** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 7
  - Issue: No guide for migrating from React/Vue to Algebraic TSX patterns
  - Fix: Created docs/migration-guide.md with React/Vue comparison patterns

---

## Low Priority (Polish)

### Code Quality

- [ ] **Remove `any` types from Foreign.js**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4
  - Issue: PureScript FFI uses untyped JavaScript
  - Fix: Add JSDoc types or convert to TypeScript

- [ ] **Add cleanup for orphaned subscriptions**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4
  - Issue: Potential memory leaks if components unmount without proper cleanup
  - Fix: Add WeakRef-based cleanup or explicit disposal pattern

---

## Documentation Updates (Algebraic TSX)

These tasks update existing documentation and code snippets to use the new Algebraic TSX patterns.

### Core Documentation

- [x] **Update CLAUDE.md code examples** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: CLAUDE.md examples show raw `behavior`/`subscribe` usage without Algebraic TSX
  - Fix: Added Algebraic TSX section with TypeScript and PureScript examples

- [x] **Update getting-started.md with Algebraic TSX** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 7
  - Issue: Getting started guide may not reflect new UI patterns
  - Fix: Added Quick Start section with Algebraic TSX examples

- [x] **Update API reference with rendering examples** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 7
  - Issue: API docs show FRP primitives but not how to render them
  - Fix: Created comprehensive API reference with FRP primitives and Algebraic TSX rendering

### Code Snippet Updates

- [x] **Audit existing examples for Algebraic TSX** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 6
  - Issue: Existing examples (whiteboard, etc.) may use older patterns
  - Decision: Whiteboard example is appropriate as-is because:
    - Canvas rendering is inherently imperative (not declarative DOM)
    - Example focuses on geometric strokes and GPU acceleration
    - Toolbar interactions are minimal and work well with vanilla JS
  - Future Algebraic TSX examples will be created separately (tsx-counter, tsx-todo)

- [x] **Update README.md quick start** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 7
  - Issue: Root README may show outdated usage patterns
  - Fix: Added Quick Start with `npx create-cliffy` and Algebraic TSX examples

- [x] **Add Algebraic TSX section to ROADMAP.md** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4, Phase 7
  - Issue: ROADMAP mentions Algebraic TSX but details are sparse
  - Fix: Added Phase 7.0 documenting implementation, design decisions, and relationship to Phase 4

### PureScript-Specific

- [x] **Create cliffy-purescript README** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4
  - Issue: No README explaining PureScript package usage
  - Fix: Created comprehensive README with module structure, examples, API comparison

- [x] **Document PureScript FFI patterns** ✅
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4
  - Issue: Foreign.js lacks documentation on how FFI bindings work
  - Fix: Created docs/purescript-ffi-patterns.md explaining Effect thunks, currying, and implementation structure

---

## Planned Examples (Phase 6 Completion)

### Phase 6 Planned Applications

From ROADMAP.md Phase 6.3, these example applications need to be built:

| Application | Status | Demonstrates |
|-------------|--------|--------------|
| Collaborative Whiteboard | ✅ Exists | Real-time drawing with geometric transforms |
| Multiplayer Game | ✅ Complete | High-frequency state sync, interpolation |
| Shared Document Editor | ✅ Complete | CRDT text, presence indicators |
| Design Tool | ✅ Complete | Complex geometric operations, undo/redo |

#### Multiplayer Game Example

- [x] **Create `examples/multiplayer-game/`** ✅
  - Demonstrates: High-frequency state sync, geometric interpolation, distributed compute
  - Features:
    - Player position as GeometricState
    - Interpolated movement using .blend() (SLERP/LERP)
    - Collision detection via geometric distance
    - Latency compensation with simulated network delay
  - Stack: TypeScript + Vite + @cliffy-ga/core
  - Status: Complete

#### Shared Document Editor Example

- [x] **Create `examples/document-editor/`** ✅
  - Demonstrates: CRDT text, operational transforms, presence
  - Features:
    - Text operations as GeometricCRDT entries
    - Cursor positions as FRP Behaviors
    - User presence indicators with typing status
    - Conflict-free concurrent editing with simulated peers
    - Real-time operation log visualization
  - Stack: TypeScript + Vite + @cliffy-ga/core
  - Status: Complete

#### Design Tool Example

- [x] **Create `examples/design-tool/`** ✅
  - Demonstrates: Complex geometric operations, undo/redo, transform composition
  - Features:
    - Shape manipulation via rotors
    - Undo/redo via history management
    - Properties panel with real-time binding
    - Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Shift+Z)
  - Stack: TypeScript + Vite + @cliffy-ga/core
  - Status: Complete

### Algebraic TSX Showcase Examples

These examples specifically demonstrate the Algebraic TSX rendering approach:

#### TypeScript html`` Template Examples

- [x] **Create `examples/tsx-counter/`** ✅
  - Demonstrates: Basic `html` tagged template usage
  - Features:
    - Behavior in text content
    - Event handlers
    - Conditional CSS classes
  - Status: Complete, tested with @cliffy-ga/core@0.1.0-alpha

- [x] **Create `examples/tsx-todo/`** ✅
  - Demonstrates: List rendering, component composition
  - Features:
    - Dynamic lists with Behavior<Array>
    - Nested html`` templates
    - Form handling with Events
    - Filter buttons with derived state
  - Status: Complete, TodoMVC-style implementation

- [x] **Create `examples/tsx-forms/`** ✅
  - Demonstrates: Form validation, two-way binding patterns
  - Features:
    - Input value binding
    - Validation state as Behavior
    - Password strength indicator
    - Uses `wedge()` for combining validations
  - Status: Complete, demonstrates new GA-inspired API

#### PureScript DSL Examples

- [x] **Create `examples/purescript-counter/`** ✅
  - Demonstrates: Basic Cliffy.Html DSL usage
  - Features:
    - Type-safe element construction
    - Behavior-reactive content
    - Event handling with Effect
  - Status: Complete

- [x] **Create `examples/purescript-todo/`** ✅
  - Demonstrates: ADTs for state, list rendering
  - Features:
    - Todo items as ADT
    - Pattern matching in render
    - Type-safe event handling
  - Status: Complete

### Phase-Specific Showcase Examples

Examples that demonstrate specific phase capabilities:

#### Phase 0: Testing Framework

- [ ] **Create `examples/testing-showcase/`**
  - Demonstrates: cliffy-test geometric invariants
  - Features:
    - Invariant definitions
    - Manifold testing
    - Visual test debugging
    - Probabilistic tests (amari-flynn)

#### Phase 1: Geometric State

- [x] **Create `examples/geometric-transforms/`** ✅
  - Demonstrates: Explicit geometric operations
  - Features:
    - Rotor rotations in XY, XZ, YZ planes
    - Transform composition (rotation + translation)
    - .blend() interpolation (SLERP)
    - GeometricState transformations
  - Stack: TypeScript + Vite + @cliffy-ga/core
  - Status: Complete

#### Phase 2: Distributed State

- [x] **Create `examples/crdt-playground/`** ✅
  - Demonstrates: Geometric CRDT operations
  - Features:
    - Multiple simulated peers with independent state
    - Vector clocks for causal ordering
    - Concurrent operations and merge visualization
    - Convergence demonstration with geometric mean
  - Stack: TypeScript + Vite (simulates cliffy-protocols CRDT)
  - Status: Complete

#### Phase 3: Synchronization

- [ ] **Create `examples/p2p-sync/`**
  - Demonstrates: WebRTC state synchronization
  - Features:
    - Peer discovery
    - Real-time sync across tabs/browsers
    - Delta compression visualization
    - Network partition handling

#### Phase 5: Edge Computing

- [x] **Create `examples/gpu-benchmark/`** ✅
  - Demonstrates: WebGPU/WASM performance testing
  - Features:
    - WebGPU, SIMD, SharedArrayBuffer detection
    - Geometric algebra operation benchmarks
    - Real-time performance metrics (ops/sec)
    - Visual performance comparison bars
  - Stack: TypeScript + Vite + @cliffy-ga/core
  - Status: Complete

---

## Example Infrastructure

### Shared Setup

- [ ] **Update `examples/vite.config.shared.ts`**
  - Add html.ts resolution
  - Configure for all template types

- [ ] **Create example template generator script**
  - `scripts/create-example.ts`
  - Scaffolds new example with correct structure
  - Options for TS/PS, with/without html template

### Testing Infrastructure

- [ ] **Expand Playwright E2E tests**
  - Add tests for each example
  - Cross-browser verification
  - Performance regression tests

- [ ] **Add example CI workflow**
  - Build all examples
  - Run example-specific tests
  - Deploy to GitHub Pages for demos

---

## Tracking

### Completed Items

- [x] Add note clarifying Behavior.map() vs Array.map() (Phase 7)
- [x] Create html`` tagged template implementation (Phase 7)
- [x] Create PureScript Html DSL (Phase 7)
- [x] Update scaffolding templates to use Algebraic TSX (Phase 7)
- [x] Create main Cliffy.purs module with FRP primitives (Phase 7)
- [x] Wire up PureScript package dependencies (Phase 7)
- [x] Export html.ts from cliffy-wasm package (Phase 7)
- [x] Update README.md quick start with Algebraic TSX (Phase 7)
- [x] Update CLAUDE.md code examples (Phase 7)
- [x] Create cliffy-purescript README (Phase 7)
- [x] Update getting-started.md with Algebraic TSX (Phase 7)
- [x] Create API reference with rendering examples (Phase 7)
- [x] Add Algebraic TSX section to ROADMAP.md (Phase 7)
- [x] Audit existing examples for Algebraic TSX (Phase 7)
- [x] Document PureScript FFI patterns (Phase 7)
- [x] Create Algebraic TSX migration guide (Phase 7)
- [x] Create geometric-transforms example (Phase 6)
- [x] Create design-tool example (Phase 6)
- [x] Create gpu-benchmark example (Phase 6)
- [x] Create crdt-playground example (Phase 2)

### In Progress

- Phase 7 Documentation continues

### Ready to Implement

- Distributed examples now unblocked (Phase 2 completed in PR #138):
  - multiplayer-game - High-frequency state sync, geometric interpolation
  - document-editor - CRDT text, operational transforms, presence
  - p2p-sync - WebRTC state synchronization
  - testing-showcase - cliffy-test geometric invariants

---

## References

- [ROADMAP.md](./ROADMAP.md) - Full development roadmap
- [CLAUDE.md](./CLAUDE.md) - Development standards and architecture
- [examples/README.md](./examples/README.md) - Example documentation
