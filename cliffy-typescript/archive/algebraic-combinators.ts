/**
 * Algebraic Control Flow Combinators for Cliffy Framework
 * Replace JavaScript conditionals with geometric algebra operations
 */

import type { 
  AlgebraicElement, 
  GeometricBehavior, 
  GeometricProps,
  GeometricComponent,
  GeometricDataflowGraph,
  MultivectorData
} from './types';
import { jsx, createGeometricGraph, withGraph } from './algebraic-jsx';

// When combinator - replaces conditional rendering
export interface WhenProps {
  condition: GeometricBehavior<boolean> | boolean;
  children: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export const When: GeometricComponent = (props: WhenProps) => {
  const { condition, children } = props as WhenProps;
  
  const conditionBehavior = typeof condition === 'boolean' 
    ? createStaticBehavior(condition)
    : condition;
    
  const childrenBehavior = typeof children === 'function'
    ? createLazyBehavior(children)
    : createStaticBehavior(Array.isArray(children) ? children : [children]);
    
  const resultBehavior = conditionBehavior.flatMap(cond => 
    cond 
      ? childrenBehavior.map(children => Array.isArray(children) ? children : [children])
      : createStaticBehavior([])
  );
  
  return jsx('when-combinator', { 
    condition: conditionBehavior, 
    children: resultBehavior 
  });
};

// Else combinator - works with When
export interface ElseProps {
  children: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export const Else: GeometricComponent = (props: ElseProps) => {
  const { children } = props as ElseProps;
  
  const childrenBehavior = typeof children === 'function'
    ? createLazyBehavior(children)
    : createStaticBehavior(Array.isArray(children) ? children : [children]);
    
  return jsx('else-combinator', { children: childrenBehavior });
};

// Switch combinator - replaces switch statements
export interface SwitchProps<T> {
  value: GeometricBehavior<T> | T;
  children: AlgebraicElement[];
}

export const Switch = <T>(props: SwitchProps<T>) => {
  const { value, children } = props;
  
  const valueBehavior = typeof value === 'object' && 'sample' in value
    ? value as GeometricBehavior<T>
    : createStaticBehavior(value);
    
  const resultBehavior = valueBehavior.flatMap(val => {
    // Find the matching Case component
    for (const child of children) {
      if (child.tag === 'case-combinator') {
        const caseValue = child.props.get('value');
        const caseValueSample = typeof caseValue === 'object' && 'sample' in caseValue
          ? caseValue.sample()
          : caseValue;
          
        if (caseValueSample === val) {
          return child.props.get('children') as GeometricBehavior<AlgebraicElement[]>;
        }
      }
    }
    
    // Find default case
    const defaultCase = children.find(child => child.tag === 'default-combinator');
    return defaultCase 
      ? defaultCase.props.get('children') as GeometricBehavior<AlgebraicElement[]>
      : createStaticBehavior([]);
  });
  
  return jsx('switch-combinator', { 
    value: valueBehavior, 
    children: resultBehavior 
  });
};

// Case combinator - works with Switch
export interface CaseProps<T> {
  value: T;
  children: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export const Case = <T>(props: CaseProps<T>) => {
  const { value, children } = props;
  
  const childrenBehavior = typeof children === 'function'
    ? createLazyBehavior(children)
    : createStaticBehavior(Array.isArray(children) ? children : [children]);
    
  return jsx('case-combinator', { 
    value: createStaticBehavior(value), 
    children: childrenBehavior 
  });
};

// Default combinator - works with Switch
export interface DefaultProps {
  children: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export const Default: GeometricComponent = (props: DefaultProps) => {
  const { children } = props as DefaultProps;
  
  const childrenBehavior = typeof children === 'function'
    ? createLazyBehavior(children)
    : createStaticBehavior(Array.isArray(children) ? children : [children]);
    
  return jsx('default-combinator', { children: childrenBehavior });
};

// For combinator - replaces array mapping with incremental diffing
export interface ForProps<T> {
  each: GeometricBehavior<T[]> | T[];
  key?: (item: T, index: number) => string | number;
  children: (item: GeometricBehavior<T>, index: GeometricBehavior<number>) => AlgebraicElement;
}

export const For = <T>(props: ForProps<T>) => {
  const { each, key, children } = props;
  
  const arrayBehavior = Array.isArray(each)
    ? createStaticBehavior(each)
    : each;
    
  const keyFn = key || ((item: T, index: number) => index);
  
  // Create incremental list behavior with geometric diffing
  const listBehavior = createIncrementalListBehavior(arrayBehavior, keyFn, children);
  
  return jsx('for-combinator', { 
    each: arrayBehavior,
    children: listBehavior
  });
};

// Map combinator - pure functional mapping
export interface MapProps<T, U> {
  from: GeometricBehavior<T> | T;
  to: (value: T) => U;
  children: (result: GeometricBehavior<U>) => AlgebraicElement;
}

export const Map = <T, U>(props: MapProps<T, U>) => {
  const { from, to, children } = props;
  
  const sourceBehavior = typeof from === 'object' && 'sample' in from
    ? from as GeometricBehavior<T>
    : createStaticBehavior(from);
    
  const mappedBehavior = sourceBehavior.map(to);
  const resultElement = children(mappedBehavior);
  
  return jsx('map-combinator', {
    from: sourceBehavior,
    children: createStaticBehavior([resultElement])
  });
};

// FlatMap combinator - monadic bind operation
export interface FlatMapProps<T, U> {
  from: GeometricBehavior<T> | T;
  to: (value: T) => GeometricBehavior<U>;
  children: (result: GeometricBehavior<U>) => AlgebraicElement;
}

export const FlatMap = <T, U>(props: FlatMapProps<T, U>) => {
  const { from, to, children } = props;
  
  const sourceBehavior = typeof from === 'object' && 'sample' in from
    ? from as GeometricBehavior<T>
    : createStaticBehavior(from);
    
  const flatMappedBehavior = sourceBehavior.flatMap(to);
  const resultElement = children(flatMappedBehavior);
  
  return jsx('flatmap-combinator', {
    from: sourceBehavior,
    children: createStaticBehavior([resultElement])
  });
};

// Combine combinator - combine multiple behaviors
export interface CombineProps<T, U, V> {
  a: GeometricBehavior<T> | T;
  b: GeometricBehavior<U> | U;
  with: (a: T, b: U) => V;
  children: (result: GeometricBehavior<V>) => AlgebraicElement;
}

export const Combine = <T, U, V>(props: CombineProps<T, U, V>) => {
  const { a, b, with: combineFn, children } = props;
  
  const behaviorA = typeof a === 'object' && 'sample' in a
    ? a as GeometricBehavior<T>
    : createStaticBehavior(a);
    
  const behaviorB = typeof b === 'object' && 'sample' in b
    ? b as GeometricBehavior<U>
    : createStaticBehavior(b);
    
  const combinedBehavior = behaviorA.combine(behaviorB, combineFn);
  const resultElement = children(combinedBehavior);
  
  return jsx('combine-combinator', {
    a: behaviorA,
    b: behaviorB,
    children: createStaticBehavior([resultElement])
  });
};

// Filter combinator - filter behavior values
export interface FilterProps<T> {
  from: GeometricBehavior<T[]> | T[];
  where: (item: T) => boolean;
  children: (result: GeometricBehavior<T[]>) => AlgebraicElement;
}

export const Filter = <T>(props: FilterProps<T>) => {
  const { from, where, children } = props;
  
  const sourceBehavior = Array.isArray(from)
    ? createStaticBehavior(from)
    : from;
    
  const filteredBehavior = sourceBehavior.map(array => array.filter(where));
  const resultElement = children(filteredBehavior);
  
  return jsx('filter-combinator', {
    from: sourceBehavior,
    children: createStaticBehavior([resultElement])
  });
};

// Memoize combinator - cache expensive computations
export interface MemoizeProps<T> {
  value: GeometricBehavior<T> | T;
  key?: (value: T) => string;
  children: (result: GeometricBehavior<T>) => AlgebraicElement;
}

export const Memoize = <T>(props: MemoizeProps<T>) => {
  const { value, key, children } = props;
  
  const sourceBehavior = typeof value === 'object' && 'sample' in value
    ? value as GeometricBehavior<T>
    : createStaticBehavior(value);
    
  const memoizedBehavior = createMemoizedBehavior(sourceBehavior, key);
  const resultElement = children(memoizedBehavior);
  
  return jsx('memoize-combinator', {
    value: memoizedBehavior,
    children: createStaticBehavior([resultElement])
  });
};

// Helper function to create static behaviors
function createStaticBehavior<T>(value: T): GeometricBehavior<T> {
  return {
    sample(): T {
      return value;
    },
    map<U>(fn: (value: T) => U): GeometricBehavior<U> {
      return createStaticBehavior(fn(value));
    },
    flatMap<U>(fn: (value: T) => GeometricBehavior<U>): GeometricBehavior<U> {
      return fn(value);
    },
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V): GeometricBehavior<V> {
      return createStaticBehavior(fn(value, other.sample()));
    },
    isActive(): boolean {
      return false; // Static behaviors are never active
    }
  };
}

// Helper function to create lazy behaviors
function createLazyBehavior<T>(factory: () => T): GeometricBehavior<T> {
  let cached: T | undefined = undefined;
  let computed = false;
  
  return {
    sample(): T {
      if (!computed) {
        cached = factory();
        computed = true;
      }
      return cached!;
    },
    map<U>(fn: (value: T) => U): GeometricBehavior<U> {
      return createLazyBehavior(() => fn(this.sample()));
    },
    flatMap<U>(fn: (value: T) => GeometricBehavior<U>): GeometricBehavior<U> {
      return createLazyBehavior(() => fn(this.sample()).sample());
    },
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V): GeometricBehavior<V> {
      return createLazyBehavior(() => fn(this.sample(), other.sample()));
    },
    isActive(): boolean {
      return false;
    }
  };
}

// Helper function to create incremental list behavior
function createIncrementalListBehavior<T>(
  arrayBehavior: GeometricBehavior<T[]>,
  keyFn: (item: T, index: number) => string | number,
  renderFn: (item: GeometricBehavior<T>, index: GeometricBehavior<number>) => AlgebraicElement
): GeometricBehavior<AlgebraicElement[]> {
  let previousKeys = new Set<string | number>();
  let itemBehaviors = new Map<string | number, GeometricBehavior<T>>();
  let indexBehaviors = new Map<string | number, GeometricBehavior<number>>();
  
  return {
    sample(): AlgebraicElement[] {
      const currentArray = arrayBehavior.sample();
      const currentKeys = new Set<string | number>();
      const results: AlgebraicElement[] = [];
      
      currentArray.forEach((item, index) => {
        const key = keyFn(item, index);
        currentKeys.add(key);
        
        // Create or update item behavior
        if (!itemBehaviors.has(key)) {
          itemBehaviors.set(key, createItemBehavior(item));
          indexBehaviors.set(key, createItemBehavior(index));
        } else {
          updateItemBehavior(itemBehaviors.get(key)!, item);
          updateItemBehavior(indexBehaviors.get(key)!, index);
        }
        
        const element = renderFn(itemBehaviors.get(key)!, indexBehaviors.get(key)!);
        results.push(element);
      });
      
      // Clean up removed items
      for (const key of previousKeys) {
        if (!currentKeys.has(key)) {
          itemBehaviors.delete(key);
          indexBehaviors.delete(key);
        }
      }
      
      previousKeys = currentKeys;
      return results;
    },
    map<U>(fn: (value: AlgebraicElement[]) => U): GeometricBehavior<U> {
      return {
        sample: () => fn(this.sample()),
        map: <V>(mapFn: (value: U) => V) => createStaticBehavior(mapFn(fn(this.sample()))),
        flatMap: <V>(mapFn: (value: U) => GeometricBehavior<V>) => mapFn(fn(this.sample())),
        combine: <V, W>(other: GeometricBehavior<V>, combineFn: (a: U, b: V) => W) => 
          createStaticBehavior(combineFn(fn(this.sample()), other.sample())),
        isActive: () => true
      };
    },
    flatMap<U>(fn: (value: AlgebraicElement[]) => GeometricBehavior<U>): GeometricBehavior<U> {
      return fn(this.sample());
    },
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: AlgebraicElement[], b: U) => V): GeometricBehavior<V> {
      return createStaticBehavior(fn(this.sample(), other.sample()));
    },
    isActive(): boolean {
      return arrayBehavior.isActive();
    }
  };
}

// Helper to create item behaviors
function createItemBehavior<T>(initialValue: T): GeometricBehavior<T> {
  let currentValue = initialValue;
  
  return {
    sample(): T {
      return currentValue;
    },
    map<U>(fn: (value: T) => U): GeometricBehavior<U> {
      return createStaticBehavior(fn(currentValue));
    },
    flatMap<U>(fn: (value: T) => GeometricBehavior<U>): GeometricBehavior<U> {
      return fn(currentValue);
    },
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V): GeometricBehavior<V> {
      return createStaticBehavior(fn(currentValue, other.sample()));
    },
    isActive(): boolean {
      return false;
    },
    // Internal method to update value
    _updateValue(newValue: T) {
      currentValue = newValue;
    }
  } as GeometricBehavior<T> & { _updateValue(value: T): void };
}

// Helper to update item behavior
function updateItemBehavior<T>(behavior: GeometricBehavior<T>, newValue: T): void {
  if ('_updateValue' in behavior) {
    (behavior as any)._updateValue(newValue);
  }
}

// Helper to create memoized behavior
function createMemoizedBehavior<T>(
  source: GeometricBehavior<T>,
  keyFn?: (value: T) => string
): GeometricBehavior<T> {
  const cache = new Map<string, T>();
  
  return {
    sample(): T {
      const value = source.sample();
      const key = keyFn ? keyFn(value) : JSON.stringify(value);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      cache.set(key, value);
      return value;
    },
    map<U>(fn: (value: T) => U): GeometricBehavior<U> {
      return createMemoizedBehavior(source.map(fn), keyFn ? (u) => keyFn!(source.sample()) : undefined);
    },
    flatMap<U>(fn: (value: T) => GeometricBehavior<U>): GeometricBehavior<U> {
      return source.flatMap(fn);
    },
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V): GeometricBehavior<V> {
      return source.combine(other, fn);
    },
    isActive(): boolean {
      return source.isActive();
    }
  };
}

// Export all combinators
export {
  createStaticBehavior,
  createLazyBehavior,
  createIncrementalListBehavior
};