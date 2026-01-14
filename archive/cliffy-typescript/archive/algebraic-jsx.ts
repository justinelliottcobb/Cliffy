/**
 * Algebraic JSX Runtime for Cliffy Framework
 * TSX compiles to geometric dataflow graphs, not virtual DOM
 */

import { Multivector } from './multivector';
import { GeometricBehavior } from './behavior';
import { Cliffy } from './cliffy';
import type { 
  AlgebraicElement, 
  GeometricDataflowGraph, 
  GeometricDataflowNode,
  GeometricDataflowEdge,
  GeometricComponent, 
  GeometricProps,
  GeometricEvent,
  VNode,
  MultivectorData
} from './types';

// Global graph builder state
let currentGraph: GeometricDataflowGraph | null = null;
let nodeCounter = 0;
let cliffyInstance: Cliffy | null = null;

export function setCliffyInstance(instance: Cliffy) {
  cliffyInstance = instance;
}

// Generate unique node IDs
function generateNodeId(prefix: string = 'node'): string {
  return `${prefix}-${++nodeCounter}`;
}

// Create a new geometric dataflow graph
export function createGeometricGraph(): GeometricDataflowGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    roots: []
  };
}

// Set the current graph context for building
export function withGraph<T>(graph: GeometricDataflowGraph, fn: () => T): T {
  const prevGraph = currentGraph;
  currentGraph = graph;
  try {
    return fn();
  } finally {
    currentGraph = prevGraph;
  }
}

// Create a geometric dataflow node
function createGeometricNode(
  id: string,
  type: GeometricDataflowNode['type'],
  transform: (input: any) => any,
  tag?: string
): GeometricDataflowNode {
  return {
    id,
    type,
    tag,
    transform,
    dependencies: [],
    outputs: []
  };
}

// Add a node to the current graph
function addNodeToGraph(node: GeometricDataflowNode): void {
  if (!currentGraph) {
    throw new Error('No current graph context. Use withGraph() to set context.');
  }
  currentGraph.nodes.set(node.id, node);
}

// Add an edge to the current graph
function addEdgeToGraph(from: string, to: string, transform?: MultivectorData): void {
  if (!currentGraph) return;
  
  const edgeId = `${from}->${to}`;
  const edge: GeometricDataflowEdge = { from, to, transform };
  currentGraph.edges.set(edgeId, edge);
  
  // Update node dependencies and outputs
  const fromNode = currentGraph.nodes.get(from);
  const toNode = currentGraph.nodes.get(to);
  
  if (fromNode && !fromNode.outputs.includes(to)) {
    fromNode.outputs.push(to);
  }
  
  if (toNode && !toNode.dependencies.includes(from)) {
    toNode.dependencies.push(from);
  }
}

// Main JSX factory function - creates algebraic elements, not VDOM
export function jsx(
  type: string | GeometricComponent,
  props: GeometricProps | null,
  key?: string
): AlgebraicElement {
  return createGeometricElement(type, props || {}, [], key);
}

// JSX factory for elements with children
export function jsxs(
  type: string | GeometricComponent,
  props: GeometricProps & { children?: any } | null,
  key?: string
): AlgebraicElement {
  const { children, ...otherProps } = props || {};
  const childArray = Array.isArray(children) ? children : children ? [children] : [];
  return createGeometricElement(type, otherProps, childArray, key);
}

// Create an algebraic element (the core of the algebraic TSX system)
function createGeometricElement(
  type: string | GeometricComponent,
  props: GeometricProps,
  children: any[],
  key?: string
): AlgebraicElement {
  const nodeId = generateNodeId(typeof type === 'string' ? type : 'component');
  const graph = currentGraph || createGeometricGraph();
  
  // Process props into reactive behaviors and static values
  const processedProps = processGeometricProps(props, nodeId, graph);
  
  // Process children into algebraic elements or behaviors
  const processedChildren = processChildren(children, nodeId, graph);
  
  // Create the algebraic element
  const element: AlgebraicElement = {
    type,
    tag: typeof type === 'string' ? type : 'component',
    props: processedProps,
    children: processedChildren,
    key: key || null,
    nodeId,
    graph
  };
  
  // Create and add the corresponding dataflow node
  const dataflowNode = createGeometricNode(
    nodeId,
    typeof type === 'function' ? 'component' : 'behavior',
    createElementTransform(element),
    typeof type === 'string' ? type : undefined
  );
  
  addNodeToGraph(dataflowNode);
  
  return element;
}

// Process props to separate reactive behaviors from static values
function processGeometricProps(
  props: GeometricProps,
  parentNodeId: string,
  graph: GeometricDataflowGraph
): Map<string, GeometricBehavior<any> | any> {
  const processedProps = new Map<string, GeometricBehavior<any> | any>();
  
  for (const [key, value] of Object.entries(props)) {
    if (value && typeof value === 'object' && 'sample' in value) {
      // It's a GeometricBehavior
      const behavior = value as GeometricBehavior<any>;
      processedProps.set(key, behavior);
      
      // Create a behavior node in the graph
      const behaviorNodeId = generateNodeId(`${key}-behavior`);
      const behaviorNode = createGeometricNode(
        behaviorNodeId,
        'behavior',
        () => behavior.sample()
      );
      
      withGraph(graph, () => {
        addNodeToGraph(behaviorNode);
        addEdgeToGraph(behaviorNodeId, parentNodeId);
      });
      
    } else if (value && typeof value === 'object' && 'subscribe' in value) {
      // It's a GeometricEvent
      const event = value as GeometricEvent<any>;
      processedProps.set(key, event);
      
      // Create an event node in the graph
      const eventNodeId = generateNodeId(`${key}-event`);
      const eventNode = createGeometricNode(
        eventNodeId,
        'event',
        (callback: (value: any) => void) => event.subscribe(callback)
      );
      
      withGraph(graph, () => {
        addNodeToGraph(eventNode);
        addEdgeToGraph(eventNodeId, parentNodeId);
      });
      
    } else {
      // Static value
      processedProps.set(key, value);
    }
  }
  
  return processedProps;
}

// Process children into algebraic elements or behaviors
function processChildren(
  children: any[],
  parentNodeId: string,
  graph: GeometricDataflowGraph
): AlgebraicElement[] | GeometricBehavior<AlgebraicElement[]> {
  if (children.length === 0) {
    return [];
  }
  
  // Check if any children are behaviors
  const hasBehaviorChildren = children.some(child => 
    child && typeof child === 'object' && 'sample' in child
  );
  
  if (hasBehaviorChildren) {
    // Return a behavior that combines all children
    return createChildrenBehavior(children, parentNodeId, graph);
  }
  
  // Process static children
  return children.map((child, index) => {
    if (typeof child === 'string') {
      return createTextElement(child, `${parentNodeId}-text-${index}`, graph);
    } else if (child && typeof child === 'object' && 'type' in child) {
      return child as AlgebraicElement;
    } else {
      return createTextElement(String(child), `${parentNodeId}-text-${index}`, graph);
    }
  });
}

// Create a behavior that manages dynamic children
function createChildrenBehavior(
  children: any[],
  parentNodeId: string,
  graph: GeometricDataflowGraph
): GeometricBehavior<AlgebraicElement[]> {
  const childrenNodeId = generateNodeId(`${parentNodeId}-children-behavior`);
  
  const childrenBehavior: GeometricBehavior<AlgebraicElement[]> = {
    sample(): AlgebraicElement[] {
      return children.map((child, index) => {
        if (typeof child === 'string') {
          return createTextElement(child, `${childrenNodeId}-text-${index}`, graph);
        } else if (child && typeof child === 'object' && 'sample' in child) {
          const sampledChild = child.sample();
          if (typeof sampledChild === 'string') {
            return createTextElement(sampledChild, `${childrenNodeId}-dynamic-${index}`, graph);
          }
          return sampledChild;
        } else if (child && typeof child === 'object' && 'type' in child) {
          return child as AlgebraicElement;
        } else {
          return createTextElement(String(child), `${childrenNodeId}-text-${index}`, graph);
        }
      });
    },
    
    map<U>(fn: (value: AlgebraicElement[]) => U): GeometricBehavior<U> {
      return createMappedBehavior(this, fn);
    },
    
    flatMap<U>(fn: (value: AlgebraicElement[]) => GeometricBehavior<U>): GeometricBehavior<U> {
      return createFlatMappedBehavior(this, fn);
    },
    
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: AlgebraicElement[], b: U) => V): GeometricBehavior<V> {
      return createCombinedBehavior(this, other, fn);
    },
    
    isActive(): boolean {
      return children.some(child => child && typeof child === 'object' && 'isActive' in child && child.isActive());
    }
  };
  
  // Create behavior node in graph
  const behaviorNode = createGeometricNode(
    childrenNodeId,
    'behavior',
    () => childrenBehavior.sample()
  );
  
  withGraph(graph, () => {
    addNodeToGraph(behaviorNode);
    addEdgeToGraph(childrenNodeId, parentNodeId);
  });
  
  return childrenBehavior;
}

// Create a text element
function createTextElement(
  text: string,
  nodeId: string,
  graph: GeometricDataflowGraph
): AlgebraicElement {
  const element: AlgebraicElement = {
    type: 'text',
    tag: 'text',
    props: new Map([['content', text]]),
    children: [],
    key: null,
    nodeId,
    graph
  };
  
  const textNode = createGeometricNode(
    nodeId,
    'behavior',
    () => text
  );
  
  withGraph(graph, () => {
    addNodeToGraph(textNode);
  });
  
  return element;
}

// Create element transform function
function createElementTransform(element: AlgebraicElement): (input: any) => any {
  return (input: any) => {
    // This transform function defines how the element processes inputs
    // In a full implementation, this would handle geometric transformations
    // and combine them with the element's props and children
    return {
      tag: element.tag,
      props: extractStaticProps(element.props),
      children: Array.isArray(element.children) 
        ? element.children 
        : element.children.sample(),
      key: element.key
    };
  };
}

// Extract static props from the props map
function extractStaticProps(props: Map<string, GeometricBehavior<any> | any>): Record<string, any> {
  const staticProps: Record<string, any> = {};
  
  for (const [key, value] of props) {
    if (value && typeof value === 'object' && 'sample' in value) {
      staticProps[key] = value.sample();
    } else {
      staticProps[key] = value;
    }
  }
  
  return staticProps;
}

// Helper functions for creating mapped behaviors
function createMappedBehavior<T, U>(
  source: GeometricBehavior<T>,
  fn: (value: T) => U
): GeometricBehavior<U> {
  return {
    sample(): U {
      return fn(source.sample());
    },
    map<V>(mapFn: (value: U) => V): GeometricBehavior<V> {
      return createMappedBehavior(this, mapFn);
    },
    flatMap<V>(mapFn: (value: U) => GeometricBehavior<V>): GeometricBehavior<V> {
      return createFlatMappedBehavior(this, mapFn);
    },
    combine<V, W>(other: GeometricBehavior<V>, combineFn: (a: U, b: V) => W): GeometricBehavior<W> {
      return createCombinedBehavior(this, other, combineFn);
    },
    isActive(): boolean {
      return source.isActive();
    }
  };
}

function createFlatMappedBehavior<T, U>(
  source: GeometricBehavior<T>,
  fn: (value: T) => GeometricBehavior<U>
): GeometricBehavior<U> {
  return {
    sample(): U {
      return fn(source.sample()).sample();
    },
    map<V>(mapFn: (value: U) => V): GeometricBehavior<V> {
      return createMappedBehavior(this, mapFn);
    },
    flatMap<V>(mapFn: (value: U) => GeometricBehavior<V>): GeometricBehavior<V> {
      return createFlatMappedBehavior(this, mapFn);
    },
    combine<V, W>(other: GeometricBehavior<V>, combineFn: (a: U, b: V) => W): GeometricBehavior<W> {
      return createCombinedBehavior(this, other, combineFn);
    },
    isActive(): boolean {
      return source.isActive() || fn(source.sample()).isActive();
    }
  };
}

function createCombinedBehavior<T, U, V>(
  sourceA: GeometricBehavior<T>,
  sourceB: GeometricBehavior<U>,
  fn: (a: T, b: U) => V
): GeometricBehavior<V> {
  return {
    sample(): V {
      return fn(sourceA.sample(), sourceB.sample());
    },
    map<W>(mapFn: (value: V) => W): GeometricBehavior<W> {
      return createMappedBehavior(this, mapFn);
    },
    flatMap<W>(mapFn: (value: V) => GeometricBehavior<W>): GeometricBehavior<W> {
      return createFlatMappedBehavior(this, mapFn);
    },
    combine<W, X>(other: GeometricBehavior<W>, combineFn: (a: V, b: W) => X): GeometricBehavior<X> {
      return createCombinedBehavior(this, other, combineFn);
    },
    isActive(): boolean {
      return sourceA.isActive() || sourceB.isActive();
    }
  };
}

// Fragment support
export function Fragment(props: { children?: any }): AlgebraicElement {
  const children = Array.isArray(props.children) ? props.children : props.children ? [props.children] : [];
  const nodeId = generateNodeId('fragment');
  const graph = currentGraph || createGeometricGraph();
  
  return {
    type: 'fragment',
    tag: 'fragment',
    props: new Map(),
    children: processChildren(children, nodeId, graph),
    key: null,
    nodeId,
    graph
  };
}

// Export the algebraic JSX runtime
export default jsx;