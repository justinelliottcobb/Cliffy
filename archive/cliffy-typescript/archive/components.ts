/**
 * Component system for Cliffy geometric web framework
 * Pure implementation without React dependencies
 */

import { Multivector } from './multivector';
import { GeometricBehavior } from './behavior';
import { setCurrentComponent, clearCurrentComponent } from './hooks';
import type { GeometricProps, JSXElement, ComponentFunction } from './types';

export interface GeometricComponent {
  (props: GeometricProps): JSXElement;
}

// Component instance tracking
interface ComponentInstance {
  id: string;
  component: ComponentFunction;
  props: GeometricProps;
  hooks: Map<number, any>;
  vnode: JSXElement | null;
  mounted: boolean;
  parent: ComponentInstance | null;
  children: ComponentInstance[];
}

class ComponentManager {
  private instances: Map<string, ComponentInstance> = new Map();
  private renderQueue: Set<string> = new Set();
  private isRendering = false;
  private updateScheduled = false;

  createInstance(
    id: string,
    component: ComponentFunction,
    props: GeometricProps,
    parent: ComponentInstance | null = null
  ): ComponentInstance {
    const instance: ComponentInstance = {
      id,
      component,
      props,
      hooks: new Map(),
      vnode: null,
      mounted: false,
      parent,
      children: []
    };

    this.instances.set(id, instance);
    if (parent) {
      parent.children.push(instance);
    }

    return instance;
  }

  renderComponent(instance: ComponentInstance): JSXElement {
    const context = {
      id: instance.id,
      hooks: instance.hooks,
      isRendering: true,
      scheduleUpdate: () => this.scheduleUpdate(instance.id)
    };

    setCurrentComponent(context);
    
    try {
      instance.vnode = instance.component(instance.props);
      return instance.vnode;
    } finally {
      clearCurrentComponent();
    }
  }

  scheduleUpdate(instanceId: string): void {
    this.renderQueue.add(instanceId);
    
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      Promise.resolve().then(() => this.flushUpdates());
    }
  }

  private flushUpdates(): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    
    for (const instanceId of this.renderQueue) {
      const instance = this.instances.get(instanceId);
      if (instance) {
        this.renderComponent(instance);
        // Trigger DOM update here
      }
    }
    
    this.renderQueue.clear();
    this.updateScheduled = false;
    this.isRendering = false;
  }

  unmountComponent(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    // Cleanup hooks
    for (const [, hookState] of instance.hooks) {
      if (hookState.cleanup) {
        hookState.cleanup();
      }
    }

    // Remove from parent
    if (instance.parent) {
      instance.parent.children = instance.parent.children.filter(child => child.id !== instanceId);
    }

    // Cleanup children
    for (const child of instance.children) {
      this.unmountComponent(child.id);
    }

    this.instances.delete(instanceId);
  }
}

const componentManager = new ComponentManager();

export class ComponentBuilder {
  private props: GeometricProps = {};
  private children: JSXElement[] = [];

  static create(type: string): ComponentBuilder {
    return new ComponentBuilder().setType(type);
  }

  private type: string = 'div';

  private setType(type: string): this {
    this.type = type;
    return this;
  }

  prop(name: string, value: any): this {
    this.props[name] = value;
    return this;
  }

  geometricProp(name: string, value: Multivector | GeometricBehavior): this {
    this.props[`geometric:${name}`] = value;
    return this;
  }

  style(styles: Record<string, any>): this {
    this.props.style = { ...this.props.style, ...styles };
    return this;
  }

  className(className: string): this {
    this.props.className = className;
    return this;
  }

  transform(transform: Multivector): this {
    this.props.transform = transform;
    return this;
  }

  onClick(handler: (event: Event, transform?: Multivector) => void): this {
    this.props.onClick = handler;
    return this;
  }

  child(child: JSXElement): this {
    this.children.push(child);
    return this;
  }

  children(children: JSXElement[]): this {
    this.children = [...this.children, ...children];
    return this;
  }

  text(content: string): this {
    this.children.push({
      type: 'text',
      props: { content },
      children: [],
      key: null,
      geometric: {
        transform: new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)'),
        behaviors: new Map(),
        animations: new Map()
      }
    });
    return this;
  }

  build(): JSXElement {
    return {
      type: this.type,
      props: this.props,
      children: this.children,
      key: null,
      geometric: {
        transform: this.props.transform as Multivector || new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)'),
        behaviors: new Map(),
        animations: new Map()
      }
    };
  }
}

// Component creation utilities
export function defineComponent(
  name: string,
  component: ComponentFunction
): ComponentFunction {
  const namedComponent = function(props: GeometricProps): JSXElement {
    return component(props);
  };
  
  Object.defineProperty(namedComponent, 'name', { value: name });
  return namedComponent;
}

export function createComponent(render: ComponentFunction): ComponentFunction {
  return render;
}

// Higher-order component utilities
export function withGeometric<P extends GeometricProps>(
  component: (props: P) => JSXElement
): (props: P) => JSXElement {
  return function GeometricWrapper(props: P): JSXElement {
    // Apply geometric transformations to props
    const enhancedProps = {
      ...props,
      style: {
        ...props.style,
        transform: props.transform ? multivectorToTransformCSS(props.transform as Multivector) : undefined
      }
    };

    return component(enhancedProps);
  };
}

function multivectorToTransformCSS(mv: Multivector): string {
  const coeffs = mv.coefficients;
  const transforms: string[] = [];

  // Translation (e1, e2, e3 components)
  const tx = (coeffs[1] || 0) * 100; // Scale for pixels
  const ty = (coeffs[2] || 0) * 100;
  const tz = (coeffs[4] || 0) * 100;
  
  if (tx !== 0 || ty !== 0 || tz !== 0) {
    transforms.push(`translate3d(${tx}px, ${ty}px, ${tz}px)`);
  }

  // Scale (scalar component)
  const scale = coeffs[0] || 1;
  if (scale !== 1) {
    transforms.push(`scale(${scale})`);
  }

  // Rotation (bivector components)
  const rotateZ = (coeffs[3] || 0) * 180 / Math.PI; // e12 -> rotation around Z
  const rotateX = (coeffs[5] || 0) * 180 / Math.PI; // e13 -> rotation around X  
  const rotateY = (coeffs[6] || 0) * 180 / Math.PI; // e23 -> rotation around Y

  if (rotateX !== 0) transforms.push(`rotateX(${rotateX}deg)`);
  if (rotateY !== 0) transforms.push(`rotateY(${rotateY}deg)`);
  if (rotateZ !== 0) transforms.push(`rotateZ(${rotateZ}deg)`);

  return transforms.join(' ') || 'none';
}

// Built-in geometric components
export const GeometricDiv: GeometricComponent = (props) => {
  return ComponentBuilder.create('div')
    .prop('className', props.className)
    .style(props.style || {})
    .transform(props.transform as Multivector)
    .children(props.children as JSXElement[] || [])
    .build();
};

export const GeometricButton: GeometricComponent = (props) => {
  return ComponentBuilder.create('button')
    .prop('className', props.className)
    .style(props.style || {})
    .transform(props.transform as Multivector)
    .onClick(props.onClick as any)
    .children(props.children as JSXElement[] || [])
    .build();
};

export const GeometricInput: GeometricComponent = (props) => {
  return ComponentBuilder.create('input')
    .prop('type', props.type || 'text')
    .prop('value', props.value)
    .prop('onChange', props.onChange)
    .prop('className', props.className)
    .style(props.style || {})
    .transform(props.transform as Multivector)
    .build();
};

export const GeometricText: GeometricComponent = (props) => {
  return ComponentBuilder.create('span')
    .prop('className', props.className)
    .style(props.style || {})
    .transform(props.transform as Multivector)
    .text(props.content as string || '')
    .build();
};

// Context system for geometric state sharing
interface GeometricContext<T> {
  value: T;
  subscribers: Set<(value: T) => void>;
}

const contexts: Map<symbol, GeometricContext<any>> = new Map();

export function createGeometricContext<T>(defaultValue: T): {
  Provider: (props: { value: T; children: JSXElement[] }) => JSXElement;
  Consumer: (props: { children: (value: T) => JSXElement }) => JSXElement;
  symbol: symbol;
} {
  const contextSymbol = Symbol('GeometricContext');
  
  contexts.set(contextSymbol, {
    value: defaultValue,
    subscribers: new Set()
  });

  const Provider: GeometricComponent = (props: any) => {
    const context = contexts.get(contextSymbol)!;
    context.value = props.value;
    
    // Notify subscribers
    for (const subscriber of context.subscribers) {
      subscriber(props.value);
    }

    return {
      type: 'geometric-context-provider',
      props: { contextSymbol, value: props.value },
      children: props.children || [],
      key: null,
      geometric: {
        transform: new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)'),
        behaviors: new Map(),
        animations: new Map()
      }
    };
  };

  const Consumer: GeometricComponent = (props: any) => {
    const context = contexts.get(contextSymbol)!;
    return props.children(context.value);
  };

  return { Provider, Consumer, symbol: contextSymbol };
}

export function useGeometricContext<T>(contextSymbol: symbol): T {
  const context = contexts.get(contextSymbol);
  if (!context) {
    throw new Error('Context not found');
  }
  return context.value;
}

// Error boundary component
export function createGeometricErrorBoundary(
  fallback: (error: Error) => JSXElement
): GeometricComponent {
  return (props: GeometricProps) => {
    try {
      return {
        type: 'div',
        props: props,
        children: props.children as JSXElement[] || [],
        key: null,
        geometric: {
          transform: new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)'),
          behaviors: new Map(),
          animations: new Map()
        }
      };
    } catch (error) {
      return fallback(error as Error);
    }
  };
}

// Suspense-like component for async operations
export const GeometricSuspense: GeometricComponent = (props) => {
  const fallback = props.fallback || {
    type: 'div',
    props: { children: ['Loading...'] },
    children: [],
    key: null,
    geometric: {
      transform: new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)'),
      behaviors: new Map(),
      animations: new Map()
    }
  };

  // In a real implementation, this would handle async component loading
  return {
    type: 'geometric-suspense',
    props: { fallback },
    children: props.children as JSXElement[] || [],
    key: null,
    geometric: {
      transform: props.transform as Multivector || new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)'),
      behaviors: new Map(),
      animations: new Map()
    }
  };
};

// Export the component manager for framework use
export { componentManager, ComponentManager, ComponentInstance };