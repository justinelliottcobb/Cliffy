# ADR-002: Classical FRP over React Hooks

**Status:** Accepted
**Date:** 2024-01-15
**Authors:** Cliffy Team

## Context

Modern UI frameworks have converged on React-style hooks as the dominant paradigm for managing state and effects. However, hooks have known issues:

1. **Dependency arrays**: Manual specification leads to bugs (missing dependencies, stale closures)
2. **Rules of hooks**: Arbitrary constraints (no conditionals, consistent order)
3. **Mental model**: Hooks run on every render, causing confusion about when effects fire
4. **Composition**: Hooks don't compose algebraically—can't easily combine two hooks into one

Cliffy needed a reactivity model that avoids these issues while feeling familiar.

## Decision

**Implement Classical Functional Reactive Programming (FRP) as defined by Conal Elliott and Paul Hudak, with two core primitives: Behavior and Event.**

- `Behavior<T>`: A value that varies continuously over time (`Time → T`)
- `Event<T>`: Discrete occurrences at specific moments (`[(Time, T)]`)

No hooks. No dependency arrays. No rules.

## Rationale

### The Original FRP Model

Conal Elliott's FRP from 1997 provides a clean semantic model:

```
Behavior a = Time → a
Event a    = [(Time, a)]
```

This captures reactivity mathematically:

- **Behaviors always have a value**: Call `sample()` at any time
- **Events happen discretely**: Subscribe to receive occurrences
- **Composition is algebraic**: `map`, `combine`, `fold` follow laws

### Problems with Hooks (Avoided by FRP)

| Hook Problem | FRP Solution |
|--------------|--------------|
| Missing dependencies | Automatic tracking via dataflow graph |
| Stale closures | Always sample latest value |
| Conditional hooks | Behaviors exist unconditionally |
| Hook order rules | No render cycle, no ordering |
| Re-render overhead | Only affected values update |

### Example: The Stale Closure Bug

In React:

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // Always logs initial value! (stale closure)
    }, 1000);
    return () => clearInterval(id);
  }, []); // Empty deps = captures initial count forever

  return <button onClick={() => setCount(c => c + 1)}>+</button>;
}
```

In Cliffy FRP:

```typescript
const count = behavior(0);

setInterval(() => {
  console.log(count.sample()); // Always gets current value!
}, 1000);
```

No closure capture problem—`sample()` always returns the current value.

### Automatic Dependency Tracking

React requires explicit dependencies:

```typescript
// React - must list all dependencies manually
const total = useMemo(() => price * quantity, [price, quantity]);
```

FRP tracks dependencies automatically:

```typescript
// Cliffy - dependencies tracked by the graph
const total = combine(price, quantity, (p, q) => p * q);
```

The dataflow graph knows that `total` depends on `price` and `quantity` because `combine` explicitly receives them. No arrays, no bugs.

### Composability

FRP primitives compose algebraically:

```typescript
// Combine two behaviors into one
const a = behavior(1);
const b = behavior(2);
const c = combine(a, b, (x, y) => x + y);

// Combine three behaviors (compose combine)
const d = behavior(3);
const e = combine(c, d, (sum, z) => sum * z);

// Transform behaviors
const doubled = a.map(x => x * 2);

// Fold events into behavior
const clicks = event<void>();
const clickCount = clicks.fold(0, (n, _) => n + 1);
```

These compositions follow algebraic laws (functor, applicative) ensuring predictable behavior.

## Consequences

### Positive

- **No dependency bugs**: Dependencies are structural, not manually specified
- **No stale closures**: `sample()` always returns current value
- **No arbitrary rules**: Use Behaviors and Events anywhere, in any order
- **Algebraic composition**: Behaviors compose like mathematical functions
- **Better testing**: Pure functions with clear inputs and outputs

### Negative

- **Less familiar**: Developers know hooks, not FRP
- **Different mental model**: Must understand Behavior vs Event distinction
- **No ecosystem**: Can't use existing React hook libraries

### Neutral

- **Learning curve**: Similar to learning any new paradigm
- **Documentation needed**: Must explain FRP concepts clearly

## Alternatives Considered

### 1. React Hooks

- **Pro**: Industry standard, familiar
- **Con**: Known bugs with dependencies, closures
- **Con**: Doesn't compose algebraically

### 2. Vue Composition API

- **Pro**: Better reactivity than hooks
- **Con**: Still has some closure issues
- **Con**: Tied to Vue ecosystem

### 3. Svelte Stores

- **Pro**: Simple reactivity model
- **Con**: Less powerful than FRP
- **Con**: Tied to Svelte compiler

### 4. MobX Observables

- **Pro**: Automatic tracking
- **Con**: Mutable state model
- **Con**: Class-based API

### 5. RxJS

- **Pro**: Powerful reactive streams
- **Con**: Steep learning curve
- **Con**: Focused on events, not continuous values

## Mapping Hooks to FRP

For developers familiar with hooks:

| React Hook | Cliffy FRP |
|------------|------------|
| `useState(init)` | `behavior(init)` |
| `useMemo(fn, deps)` | `behavior.map(fn)` or `combine(...)` |
| `useCallback(fn, deps)` | Not needed (no closure issues) |
| `useEffect(fn, deps)` | `behavior.subscribe(fn)` |
| `useReducer(reducer, init)` | `event.fold(init, reducer)` |
| `useContext(ctx)` | Pass behavior explicitly |

## Implementation Notes

- Behaviors store value + GA3 representation
- Subscriptions managed via Rc<RefCell<Vec<Callback>>>
- Map/combine create derived behaviors (lazy evaluation)
- Events store list of subscribers only (no current value)

## References

- Elliott, Hudak: "Functional Reactive Animation" (ICFP 1997)
- Elliott: "Push-Pull Functional Reactive Programming" (Haskell 2009)
- Czaplicki: "Elm: Concurrent FRP for Functional GUIs" (thesis)
- React documentation on hooks and their limitations
