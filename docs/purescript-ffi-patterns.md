# PureScript FFI Patterns in Cliffy

This document explains how the FFI (Foreign Function Interface) bridge works between PureScript and JavaScript in `cliffy-purescript`.

## Overview

The FFI bridge connects PureScript's type system to JavaScript runtime implementations:

```
┌─────────────────────────────────────────┐
│            PureScript                    │
│  Cliffy.purs (type declarations)        │
│  - foreign import data Behavior :: Type │
│  - foreign import createBehaviorImpl    │
└──────────────────┬──────────────────────┘
                   │ FFI
┌──────────────────▼──────────────────────┐
│            JavaScript                    │
│  Cliffy/Foreign.js (implementations)    │
│  - export const createBehaviorImpl = ...│
└─────────────────────────────────────────┘
```

## Key Patterns

### 1. Foreign Data Types

PureScript uses `foreign import data` for types implemented in JavaScript:

```purescript
-- Cliffy.purs
foreign import data Behavior :: Type -> Type
foreign import data Event :: Type -> Type
```

These types are **opaque** in PureScript - you can't pattern match on them or see their structure. They're just handles to JavaScript objects.

### 2. Effect-Returning Functions

JavaScript functions that have side effects return `Effect`:

```purescript
-- PureScript declaration
foreign import createBehaviorImpl :: forall a. a -> Effect (Behavior a)
```

```javascript
// JavaScript implementation
export const createBehaviorImpl = (initial) => () => {
  // The outer function takes the argument
  // The inner () => { ... } is the Effect "thunk"
  const subscribers = [];
  let currentValue = initial;

  return {
    sample: () => currentValue,
    set: (newValue) => { ... },
    ...
  };
};
```

**Why the double arrow?**
- `(initial) =>` receives the argument
- `() =>` is the Effect thunk - PureScript delays execution until the Effect is run

### 3. Currying for Multi-Argument Functions

PureScript functions are curried. Multi-argument JS functions need nested arrows:

```purescript
-- PureScript: (a -> a) -> Behavior a -> Effect Unit
foreign import updateImpl :: forall a. (a -> a) -> Behavior a -> Effect Unit
```

```javascript
// JavaScript: fn => behavior => () => { ... }
export const updateImpl = (fn) => (behavior) => () => {
  behavior.update(fn);
};
```

### 4. Callbacks with Effects

When PureScript passes a callback that returns `Effect`, the JS side must invoke it:

```purescript
-- PureScript: Callback returns Effect Unit
foreign import subscribeImpl :: forall a. (a -> Effect Unit) -> Behavior a -> Effect (Effect Unit)
```

```javascript
// JavaScript: Call callback(val)() to run the Effect
export const subscribeImpl = (callback) => (behavior) => () => {
  const unsub = behavior.subscribe((val) => callback(val)());
  //                                               ^^^^^^
  //                                     Run the Effect!
  return () => unsub();
};
```

The extra `()` at `callback(val)()` is crucial - it runs the Effect.

### 5. Returning Unsubscribe Functions

Subscriptions return an unsubscribe `Effect`:

```purescript
-- Returns Effect (Effect Unit) - an Effect that produces an unsubscribe Effect
subscribe :: forall a. (a -> Effect Unit) -> Behavior a -> Effect (Effect Unit)
```

```javascript
// Return a thunk that can be called to unsubscribe
export const subscribeImpl = (callback) => (behavior) => () => {
  const unsub = behavior.subscribe((val) => callback(val)());
  return () => unsub();  // This is the unsubscribe Effect
};
```

In PureScript:
```purescript
unsub <- subscribe myCallback myBehavior  -- Get unsubscribe Effect
-- ... later ...
unsub  -- Run Effect to unsubscribe
```

## Implementation Structure

### Foreign.js Structure

```javascript
// 1. WASM initialization (for geometric algebra)
import init, * as CliffyWasm from '../../cliffy-wasm/pkg/cliffy_wasm.js';

async function ensureWasmInitialized() { ... }

// 2. Geometric Algebra operations (Advanced API)
export const multivectorFromCoeffs = (coeffs) => { ... };
export const geometricProductWasm = (mv1) => (mv2) => { ... };

// 3. FRP Primitives (Primary API)
export const createBehaviorImpl = (initial) => () => { ... };
export const sampleImpl = (behavior) => () => { ... };
export const updateImpl = (fn) => (behavior) => () => { ... };

// 4. Event Primitives
export const createEventImpl = () => { ... };
export const emitImpl = (event) => (value) => () => { ... };
export const foldImpl = (initial) => (fn) => (event) => () => { ... };
```

### Behavior Implementation

The JS Behavior object tracks state and subscribers:

```javascript
export const createBehaviorImpl = (initial) => () => {
  const subscribers = [];
  let currentValue = initial;

  return {
    // Internal: access current value
    _value: () => currentValue,
    _subscribers: subscribers,

    // API: sample current value
    sample: () => currentValue,

    // API: set new value and notify
    set: (newValue) => {
      currentValue = newValue;
      for (const sub of subscribers) {
        sub(newValue);
      }
    },

    // API: transform value with function
    update: (fn) => {
      currentValue = fn(currentValue);
      for (const sub of subscribers) {
        sub(currentValue);
      }
    },

    // API: subscribe (returns unsubscribe)
    subscribe: (callback) => {
      subscribers.push(callback);
      callback(currentValue);  // Call immediately
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },

    // API: derive new behavior
    map: (fn) => {
      const derived = createBehaviorImpl(fn(currentValue))();
      subscribers.push((val) => {
        derived.set(fn(val));
      });
      return derived;
    }
  };
};
```

### Event Implementation

Events are simpler - no current value, just subscribers:

```javascript
export const createEventImpl = () => {
  const subscribers = [];

  return {
    emit: (value) => {
      for (const sub of subscribers) {
        sub(value);
      }
    },

    subscribe: (callback) => {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },

    map: (fn) => {
      const mapped = createEventImpl();
      subscribers.push((val) => {
        mapped.emit(fn(val));
      });
      return mapped;
    },

    filter: (pred) => {
      const filtered = createEventImpl();
      subscribers.push((val) => {
        if (pred(val)) {
          filtered.emit(val);
        }
      });
      return filtered;
    }
  };
};
```

### Fold: Event to Behavior

The `fold` function accumulates Events into a Behavior:

```javascript
export const foldImpl = (initial) => (fn) => (event) => () => {
  const behavior = createBehaviorImpl(initial)();

  event.subscribe((val) => {
    const current = behavior.sample();
    behavior.set(fn(current)(val));  // fn is curried!
  });

  return behavior;
};
```

Note: `fn(current)(val)` - the PureScript function is curried.

## PureScript Wrapper Functions

The Cliffy.purs module wraps FFI functions with friendlier signatures:

```purescript
-- FFI has Behavior first for efficiency
foreign import setImpl :: forall a. Behavior a -> a -> Effect Unit

-- Wrapper puts value first (more natural for PureScript)
set :: forall a. a -> Behavior a -> Effect Unit
set value b = setImpl b value
```

This enables point-free style:
```purescript
-- Point-free increment
increment :: Behavior Int -> Effect Unit
increment = update (_ + 1)
```

## Type Safety

PureScript's type system provides safety that JavaScript lacks:

| Guarantee | Mechanism |
|-----------|-----------|
| Behaviors are typed | `Behavior Int` vs `Behavior String` |
| Effects are explicit | Can't mix pure/effectful code |
| Callbacks return Effects | `a -> Effect Unit` enforced |
| Unsubscribe is Effect | `Effect (Effect Unit)` pattern |

## Testing FFI

Test FFI bindings by verifying round-trips:

```purescript
testBehaviorRoundtrip :: Effect Unit
testBehaviorRoundtrip = do
  b <- behavior 42
  n <- sample b
  assert (n == 42)

  update (_ + 1) b
  m <- sample b
  assert (m == 43)
```

## Common Pitfalls

1. **Forgetting to run Effects**: `callback(val)` vs `callback(val)()`
2. **Currying mismatch**: JS must use `(a) => (b) =>` not `(a, b) =>`
3. **Effect thunks**: Return `() => { ... }` not `{ ... }`
4. **Subscriber cleanup**: Always return unsubscribe functions

## See Also

- [Cliffy.purs](../cliffy-purescript/src/Cliffy.purs) - PureScript declarations
- [Foreign.js](../cliffy-purescript/src/Cliffy/Foreign.js) - JavaScript implementations
- [cliffy-purescript README](../cliffy-purescript/README.md) - Usage guide
- [PureScript FFI Guide](https://github.com/purescript/documentation/blob/master/guides/FFI.md)
