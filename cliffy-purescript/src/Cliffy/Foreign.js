// Foreign JavaScript bindings for Cliffy WASM module
import init, * as CliffyWasm from '../../cliffy-wasm/pkg/cliffy_wasm.js';

let wasmInitialized = false;
let wasmModule = null;

async function ensureWasmInitialized() {
  if (!wasmInitialized) {
    wasmModule = await init();
    wasmInitialized = true;
  }
  return wasmModule;
}

// Multivector operations
export const multivectorFromCoeffs = (coeffs) => {
  ensureWasmInitialized();
  return CliffyWasm.MultivectorJs.fromCoeffs(coeffs);
};

export const multivectorToCoeffs = (mv) => {
  return mv.getCoeffs();
};

export const geometricProductWasm = (mv1) => (mv2) => {
  return mv1.geometricProduct(mv2);
};

export const addWasm = (mv1) => (mv2) => {
  return mv1.add(mv2);
};

export const subtractWasm = (mv1) => (mv2) => {
  return mv1.subtract(mv2);
};

export const scaleWasm = (scalar) => (mv) => {
  return mv.scale(scalar);
};

export const magnitudeWasm = (mv) => {
  return mv.magnitude();
};

export const normalizeWasm = (mv) => {
  return mv.normalize();
};

export const expWasm = (mv) => {
  return mv.exp();
};

export const logWasm = (mv) => {
  return mv.log();
};

export const sandwichWasm = (rotor) => (vector) => {
  return rotor.sandwich(vector);
};

export const conjugateWasm = (mv) => {
  // Implement conjugate operation
  const coeffs = mv.getCoeffs();
  const conjugated = [...coeffs];
  
  // For Cl(3,0): negate e12, e13, e23 (indices 3, 5, 6)
  conjugated[3] = -conjugated[3];  // e12
  conjugated[5] = -conjugated[5];  // e13  
  conjugated[6] = -conjugated[6];  // e23
  
  return CliffyWasm.MultivectorJs.fromCoeffs(conjugated);
};

export const gradeProjectionWasm = (grade) => (mv) => {
  return mv.gradeProjection(grade);
};

// Geometric behavior operations
export const createBehaviorWasm = (initialValue) => {
  ensureWasmInitialized();
  return new CliffyWasm.GeometricBehaviorJs(initialValue);
};

export const updateBehaviorWasm = (behavior) => (newValue) => () => {
  behavior.update(newValue);
};

export const sampleBehaviorWasm = (behavior) => {
  return behavior.sample();
};

export const transformBehaviorWasm = (behavior) => (transformer) => {
  return behavior.transformWith(transformer);
};

// Utility functions
export const createRotorWasm = (angle) => (bivector) => {
  ensureWasmInitialized();
  return CliffyWasm.create_rotor(angle, bivector);
};

export const benchmarkGeometricProduct = (size) => (iterations) => {
  ensureWasmInitialized();
  return CliffyWasm.benchmark_geometric_product(size, iterations);
};

// Performance monitoring
export const getPerformanceMetrics = () => {
  return {
    timestamp: performance.now(),
    memory: performance.memory ? performance.memory.usedJSHeapSize : 0
  };
};

// ============================================================================
// FRP Primitives - User-friendly Behavior<a> type
// ============================================================================

// Create a new Behavior with an initial value
export const createBehaviorImpl = (initial) => () => {
  const subscribers = [];
  let currentValue = initial;

  return {
    _value: () => currentValue,
    _subscribers: subscribers,
    sample: () => currentValue,
    set: (newValue) => {
      currentValue = newValue;
      for (const sub of subscribers) {
        sub(newValue);
      }
    },
    update: (fn) => {
      currentValue = fn(currentValue);
      for (const sub of subscribers) {
        sub(currentValue);
      }
    },
    subscribe: (callback) => {
      subscribers.push(callback);
      // Call immediately with current value
      callback(currentValue);
      // Return unsubscribe function
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },
    map: (fn) => {
      // Create a derived behavior
      const derived = createBehaviorImpl(fn(currentValue))();
      // Subscribe to source changes
      subscribers.push((val) => {
        derived.set(fn(val));
      });
      return derived;
    }
  };
};

// Sample the current value of a Behavior
export const sampleImpl = (behavior) => () => {
  return behavior.sample();
};

// Set a new value on a Behavior
export const setImpl = (behavior) => (value) => () => {
  behavior.set(value);
};

// Update a Behavior with a function
export const updateImpl = (fn) => (behavior) => () => {
  behavior.update(fn);
};

// Subscribe to a Behavior's changes
export const subscribeImpl = (callback) => (behavior) => () => {
  const unsub = behavior.subscribe((val) => callback(val)());
  // Return Effect Unit for unsubscribe
  return () => unsub();
};

// Map over a Behavior
export const mapBehaviorImpl = (fn) => (behavior) => () => {
  return behavior.map(fn);
};

// ============================================================================
// Event Primitives
// ============================================================================

// Create a new Event
export const createEventImpl = () => {
  const subscribers = [];

  return {
    _subscribers: subscribers,
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

// Emit a value on an Event
export const emitImpl = (event) => (value) => () => {
  event.emit(value);
};

// Subscribe to an Event
export const subscribeEventImpl = (callback) => (event) => () => {
  const unsub = event.subscribe((val) => callback(val)());
  return () => unsub();
};

// Fold an Event into a Behavior
export const foldImpl = (initial) => (fn) => (event) => () => {
  const behavior = createBehaviorImpl(initial)();
  event.subscribe((val) => {
    const current = behavior.sample();
    behavior.set(fn(current)(val));
  });
  return behavior;
};