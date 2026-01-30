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

- [ ] **Export `html.ts` from `@cliffy/core` package**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: The `html` tagged template function exists in `cliffy-wasm/src/html.ts` but isn't bundled with the WASM package. Templates must include it locally.
  - Fix: Add html.ts to wasm-pack build output or create a separate `@cliffy/html` package

- [ ] **Create main `Cliffy.purs` module**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: PureScript FFI files exist (`Cliffy.Html`, `Cliffy.Html.Attributes`, `Cliffy.Html.Events`) but there's no main `Cliffy` module that re-exports `behavior`, `event`, `update`, `subscribe`, etc.
  - Fix: Create `cliffy-purescript/src/Cliffy.purs` with FRP primitive re-exports

- [ ] **Wire up PureScript package dependencies**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 4 (Algebraic TSX)
  - Issue: `spago.dhall` template doesn't reference `cliffy-purescript` package
  - Fix: Either publish to package set or add as local/git dependency in `packages.dhall`

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

- [ ] **Document Behavior.map() vs Array.map() distinction**
  - Origin: Phase 7 (Documentation)
  - Status: ✅ Added note in getting-started.md
  - Related: Phase 7

- [ ] **Create Algebraic TSX migration guide**
  - Origin: Phase 7 (Documentation)
  - Related: Phase 7
  - Issue: No guide for migrating from React/Vue to Algebraic TSX patterns
  - Fix: Write dedicated migration guide

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

## Planned Examples (Phase 6 Completion)

### Phase 6 Planned Applications

From ROADMAP.md Phase 6.3, these example applications need to be built:

| Application | Status | Demonstrates |
|-------------|--------|--------------|
| Collaborative Whiteboard | ✅ Exists | Real-time drawing with geometric transforms |
| Multiplayer Game | ❌ Not started | High-frequency state sync, interpolation |
| Shared Document Editor | ❌ Not started | CRDT text, presence indicators |
| Design Tool | ❌ Not started | Complex geometric operations, undo/redo |

#### Multiplayer Game Example

- [ ] **Create `examples/multiplayer-game/`**
  - Demonstrates: High-frequency state sync, geometric interpolation, distributed compute
  - Features:
    - Player position as GeometricState
    - Interpolated movement (SLERP)
    - Collision detection via geometric distance
    - Latency compensation
  - Stack: TypeScript + Vite + @cliffy/core

#### Shared Document Editor Example

- [ ] **Create `examples/document-editor/`**
  - Demonstrates: CRDT text, operational transforms, presence
  - Features:
    - Text as geometric state (character positions)
    - Cursor positions as Behaviors
    - User presence indicators
    - Conflict-free concurrent editing
  - Stack: TypeScript + Vite + @cliffy/core

#### Design Tool Example

- [ ] **Create `examples/design-tool/`**
  - Demonstrates: Complex geometric operations, undo/redo, transform composition
  - Features:
    - Shape manipulation via rotors
    - Undo/redo as geometric inverse operations
    - Snap-to-grid via projection
    - Multi-select with combined transforms
  - Stack: TypeScript + Vite + @cliffy/core

### Algebraic TSX Showcase Examples

These examples specifically demonstrate the Algebraic TSX rendering approach:

#### TypeScript html`` Template Examples

- [ ] **Create `examples/tsx-counter/`**
  - Demonstrates: Basic `html` tagged template usage
  - Features:
    - Behavior in text content
    - Event handlers
    - Conditional rendering
  - Minimal, focused example

- [ ] **Create `examples/tsx-todo/`**
  - Demonstrates: List rendering, component composition
  - Features:
    - Dynamic lists with Behavior<Array>
    - Nested html`` templates
    - Form handling with Events
  - TodoMVC-style implementation

- [ ] **Create `examples/tsx-forms/`**
  - Demonstrates: Form validation, two-way binding patterns
  - Features:
    - Input value binding
    - Validation state as Behavior
    - Submit handling
    - Error display

#### PureScript DSL Examples

- [ ] **Create `examples/purescript-counter/`**
  - Demonstrates: Basic Cliffy.Html DSL usage
  - Features:
    - Type-safe element construction
    - Behavior-reactive content
    - Event handling with Effect
  - Minimal, focused example

- [ ] **Create `examples/purescript-todo/`**
  - Demonstrates: ADTs for state, list rendering
  - Features:
    - Todo items as ADT
    - Pattern matching in render
    - Type-safe event handling

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

- [ ] **Create `examples/geometric-transforms/`**
  - Demonstrates: Explicit geometric operations
  - Features:
    - Rotor rotations visualized
    - Transform composition
    - Projection from multivector to UI
    - SLERP interpolation

#### Phase 2: Distributed State

- [ ] **Create `examples/crdt-playground/`**
  - Demonstrates: Geometric CRDT operations
  - Features:
    - Multiple "peers" in same browser
    - Concurrent operations
    - Merge visualization
    - Convergence demonstration

#### Phase 3: Synchronization

- [ ] **Create `examples/p2p-sync/`**
  - Demonstrates: WebRTC state synchronization
  - Features:
    - Peer discovery
    - Real-time sync across tabs/browsers
    - Delta compression visualization
    - Network partition handling

#### Phase 5: Edge Computing

- [ ] **Create `examples/gpu-benchmark/`**
  - Demonstrates: WebGPU acceleration
  - Features:
    - CPU vs GPU toggle
    - Real-time performance metrics
    - Batch size threshold visualization
    - Operation throughput comparison

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

### In Progress

- Phase 7 Documentation continues

### Blocked

- PureScript examples blocked on Cliffy.purs module creation
- Distributed examples blocked on cliffy-protocols revival (Phase 2)
- GPU examples blocked on WebGPU integration (Phase 5)

---

## References

- [ROADMAP.md](./ROADMAP.md) - Full development roadmap
- [CLAUDE.md](./CLAUDE.md) - Development standards and architecture
- [examples/README.md](./examples/README.md) - Example documentation
