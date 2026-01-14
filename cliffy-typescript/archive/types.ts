/**
 * Type definitions for Cliffy geometric algebra framework
 */

// Clifford algebra signatures
export type CliffySignature = 'Cl(3,0)' | 'Cl(4,1)' | 'Cl(4,4)';

// Specific signature types
export interface Cl30 {
  readonly signature: 'Cl(3,0)';
  readonly dimension: 8;
  readonly basis: readonly ['1', 'e1', 'e2', 'e12', 'e3', 'e13', 'e23', 'e123'];
}

export interface Cl41 {
  readonly signature: 'Cl(4,1)';
  readonly dimension: 32;
  readonly basis: readonly string[];
}

export interface Cl44 {
  readonly signature: 'Cl(4,4)';
  readonly dimension: 256;
  readonly basis: readonly string[];
}

// Multivector data representation
export interface MultivectorData {
  readonly coefficients: readonly number[];
  readonly signature: CliffySignature;
}

// Geometric operations
export type GeometricOperation = 
  | 'geometricProduct'
  | 'addition'
  | 'sandwich'
  | 'exponential'
  | 'logarithm'
  | 'conjugate'
  | 'reverse'
  | 'gradeProjection';

// Behavior transformation function
export type BehaviorTransform<T extends MultivectorData> = (input: T) => T;

// React hook state
export interface GeometricState<T extends MultivectorData> {
  readonly value: T;
  readonly transform: (operation: GeometricOperation, ...args: unknown[]) => void;
  readonly reset: () => void;
  readonly subscribe: (callback: (value: T) => void) => () => void;
}

// WebRTC peer connection options
export interface P2POptions {
  readonly iceServers?: RTCIceServer[];
  readonly maxRetries?: number;
  readonly timeout?: number;
}

// CRDT operation
export interface CRDTOperation {
  readonly id: string;
  readonly nodeId: string;
  readonly timestamp: number;
  readonly operation: GeometricOperation;
  readonly transform: MultivectorData;
}

// Consensus configuration
export interface ConsensusConfig {
  readonly threshold: number;
  readonly timeout: number;
  readonly maxRounds: number;
}

// Performance metrics
export interface PerformanceMetrics {
  readonly operationsPerSecond: number;
  readonly latency: number;
  readonly memoryUsage: number;
  readonly gpuUtilization?: number;
}

// Forward declarations for algebraic types
export interface GeometricBehavior<T = MultivectorData> {
  sample(): T;
  map<U>(fn: (value: T) => U): GeometricBehavior<U>;
  flatMap<U>(fn: (value: T) => GeometricBehavior<U>): GeometricBehavior<U>;
  combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V): GeometricBehavior<V>;
  isActive(): boolean;
}

export interface GeometricEvent<T = MultivectorData> {
  subscribe(fn: (value: T) => void): () => void;
  map<U>(fn: (value: T) => U): GeometricEvent<U>;
  filter(predicate: (value: T) => boolean): GeometricEvent<T>;
}

// Algebraic Element structure - JSX compiles to this
export interface AlgebraicElement {
  type: string | GeometricComponent;
  tag: string;
  props: GeometricProps | Map<string, GeometricBehavior<any> | any>;
  children: AlgebraicElement[] | GeometricBehavior<AlgebraicElement[]>;
  key: string | null;
  nodeId: string;
  graph: GeometricDataflowGraph;
}

// Geometric Dataflow Graph
export interface GeometricDataflowGraph {
  nodes: Map<string, GeometricDataflowNode>;
  edges: Map<string, GeometricDataflowEdge>;
  roots: string[];
}

export interface GeometricDataflowNode {
  id: string;
  type: 'behavior' | 'event' | 'component' | 'combinator';
  tag?: string;
  transform: (input: any) => any;
  dependencies: string[];
  outputs: string[];
}

export interface GeometricDataflowEdge {
  from: string;
  to: string;
  transform?: MultivectorData;
}

// Geometric Component Interface
export interface GeometricComponent {
  (props: GeometricProps): AlgebraicElement;
}

// Geometric Props - can contain reactive behaviors or static values
export interface GeometricProps {
  [key: string]: any | GeometricBehavior<any> | GeometricEvent<any>;
  children?: AlgebraicElement[] | GeometricBehavior<AlgebraicElement[]>;
  className?: string | GeometricBehavior<string>;
  style?: CSSProperties | GeometricBehavior<CSSProperties>;
  onClick?: GeometricEvent<MouseEvent>;
  transform?: MultivectorData | GeometricBehavior<MultivectorData>;
}

// CSS Properties interface
export interface CSSProperties {
  [property: string]: string | number | undefined;
  transform?: string;
  opacity?: number;
  color?: string;
  backgroundColor?: string;
  width?: string | number;
  height?: string | number;
  fontSize?: string | number;
}

// Component Function type
export type ComponentFunction = (props: GeometricProps) => AlgebraicElement;

// Legacy JSX Element structure (for compatibility during transition)
export interface JSXElement {
  type: string | ComponentFunction;
  props: GeometricProps;
  children: JSXElement[];
  key: string | null;
  geometric: {
    transform: MultivectorData;
    behaviors: Map<string, GeometricBehavior>;
    animations: Map<string, any>;
  };
}

// Virtual DOM Node for runtime projection
export interface VNode {
  tag: string;
  props: Record<string, any>;
  children: VNode[] | string;
  key?: string | number;
}