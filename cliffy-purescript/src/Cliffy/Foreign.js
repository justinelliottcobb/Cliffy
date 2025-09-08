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