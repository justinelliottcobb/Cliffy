/**
 * Cliffy - TypeScript API for Geometric Algebra Web Framework
 * Provides high-level abstractions over the Rust/WASM core
 */

// Re-export all types and classes
export * from './cliffy';
export * from './multivector';
export * from './behavior';
export * from './types';

// Algebraic JSX System
export * from './algebraic-jsx';
export * from './algebraic-combinators';
export * from './geometric-runtime';

// Legacy JSX (for compatibility)
export * from './jsx';
export * from './hooks';
export * from './components';

// Main API
export { Cliffy } from './cliffy';
export { MultivectorBuilder } from './multivector';
export { GeometricBehavior } from './behavior';

// Algebraic JSX and Component API (Primary)
export { jsx, jsxs, Fragment } from './algebraic-jsx';
export { 
  When, Else, Switch, Case, Default,
  For, Map, FlatMap, Combine, Filter, Memoize,
  createStaticBehavior, createLazyBehavior
} from './algebraic-combinators';
export { geometricRuntime, mountApp, unmountApp } from './geometric-runtime';

// Legacy JSX API (Secondary)
export { jsx as legacyJsx, jsxs as legacyJsxs, Fragment as LegacyFragment } from './jsx';
export { 
  useGeometric, 
  useGeometricTransform, 
  useGeometricAnimation, 
  useGeometricSpring 
} from './hooks';
export { GeometricComponent, ComponentBuilder } from './components';

// Type definitions
export type { 
  CliffySignature,
  Cl30,
  Cl41, 
  Cl44,
  MultivectorData,
  BehaviorTransform,
  GeometricOperation,
  GeometricProps,
  GeometricComponent,
  AlgebraicElement,
  GeometricDataflowGraph,
  GeometricEvent,
  VNode,
  CSSProperties,
  ComponentFunction,
  JSXElement // Legacy
} from './types';