# Archived Examples - Migration Guide

These examples were built with an earlier Cliffy architecture and need to be migrated to the new foundation-first approach demonstrated in `counter-101`.

## New Architecture (January 2026)

The new Cliffy architecture follows classical FRP semantics:
- **Behavior<T>**: Time-varying values (always have a current value)
- **Event<T>**: Discrete occurrences (streams of values)
- **DOM Bindings**: Declarative `bindText()`, `bindClass()`, `fromClick()`, etc.
- **WASM Core**: All FRP logic runs in Rust/WASM with geometric algebra hidden from users

See `../counter-101/` for the reference implementation.

---

## Migration Summary

| Example | Old Approach | Complexity | Status |
|---------|--------------|------------|--------|
| algebraic-tsx-test | Algebraic JSX + custom state | Simple | Pending |
| basic-counter | Algebraic JSX + geometric transforms | Simple | Pending |
| form-validation | Algebraic JSX + When/Map combinators | Simple | Pending |
| geometric-animations | Algebraic JSX + animation loop | Simple | Pending |
| todo-app | Algebraic JSX + For/When/Map | Medium | Pending |
| dashboard | Empty/incomplete | Unknown | Investigate |
| collaborative-editor | React + old WASM API | Complex | Pending |
| geometric-visualization | React + Three.js + old WASM | Complex | Pending |

---

## Group 1: Algebraic JSX Examples (Simple Migration)

These examples use custom `jsx()` calls and `createGeometricBehavior()`. Migration involves:

1. Replace `createGeometricBehavior()` → `behavior()`
2. Replace `jsx()` calls → standard DOM + `bindText()`, `bindClass()`, etc.
3. Replace `When`/`For`/`Map` combinators → `when()`/`ifElse()` + native JS
4. Replace manual event wiring → `fromClick()`, `fromInput()`, etc.

### algebraic-tsx-test
**Features**: TSX syntax testing, Vite plugin integration
**Migration**:
- Convert TSX to standard HTML + DOM bindings
- Remove dependency on vite-plugin-algebraic-tsx
- Use `behavior()` + `bindText()` pattern

### basic-counter
**Features**: Counter with increment/decrement, geometric transformations
**Migration**:
- Almost identical to counter-101, minimal changes needed
- Replace `createGeometricBehavior()` → `behavior()`
- Replace `jsx()` → DOM bindings

### form-validation
**Features**: Multi-field validation, derived behaviors, error display
**Migration**:
- Use `behavior()` for each field
- Use `bindValue()` for two-way input binding
- Use `bindClass()` for validation state styling
- Derive validation state with `.map()` and `combine()`

### geometric-animations
**Features**: Animation loop, time-based state, geometric transforms
**Migration**:
- Use `behavior()` for animation state
- Use `requestAnimationFrame` with `.set()` for updates
- Use `bindStyle()` for animated properties

### todo-app
**Features**: CRUD operations, filtering, list rendering
**Migration**:
- Use `behavior()` for todos array and filter state
- Use `bindValue()` for input binding
- Render list with native JS (no `For` combinator needed)
- Re-render list in `.subscribe()` callback

---

## Group 2: React Examples (Complex Migration)

These examples use React and need to either:
- A) Convert to pure Cliffy (recommended for consistency)
- B) Create React bindings for new Cliffy API

### collaborative-editor
**Features**: Real-time collaboration, WebSocket sync, CRDT operations
**Current Stack**: React hooks, old `Multivector<T, N>` API
**Migration**:
- Option A: Convert to vanilla JS + Cliffy behaviors
- Option B: Wait for Cliffy React bindings
- WebSocket logic can remain similar
- CRDT operations need update to new Amari API

### geometric-visualization
**Features**: 3D visualization, Three.js integration, interactive controls
**Current Stack**: React, react-three-fiber, Leva, old WASM API
**Migration**:
- This is a specialized visualization example
- May be better to keep as React + Three.js
- Update WASM bindings to new API
- Consider making this a separate "advanced" example

---

## Group 3: Unknown Status

### dashboard
**Status**: Empty `src/` directory - appears incomplete
**Action**: Investigate original intent, either complete or remove

---

## Migration Checklist

For each example migration:

- [ ] Update `package.json` dependencies
- [ ] Update imports to `@cliffy/core`
- [ ] Replace state creation with `behavior()`
- [ ] Replace event handling with `fromClick()`, `fromInput()`, etc.
- [ ] Replace DOM updates with `bindText()`, `bindClass()`, etc.
- [ ] Add `.env` with `VITE_ALLOWED_HOST` if needed
- [ ] Update `vite.config.ts` to match counter-101 pattern
- [ ] Test build with `npm run build`
- [ ] Test dev server with `npm run dev`
- [ ] Update README.md with new approach documentation

---

## Priority Order

1. **basic-counter** - Nearly identical to counter-101
2. **form-validation** - Good showcase of two-way bindings
3. **todo-app** - Classic example, good for documentation
4. **geometric-animations** - Shows animation patterns
5. **algebraic-tsx-test** - Low priority, was for plugin testing
6. **dashboard** - Investigate/remove
7. **collaborative-editor** - Complex, defer
8. **geometric-visualization** - Complex, defer
