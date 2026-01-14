/**
 * Geometric Dataflow Graph Runtime for Cliffy Framework
 * Processes algebraic elements and projects them to DOM without virtual DOM
 */

import { Multivector } from './multivector';
import { GeometricBehavior } from './behavior';
import { Cliffy } from './cliffy';
import type { 
  AlgebraicElement,
  GeometricDataflowGraph,
  GeometricDataflowNode,
  GeometricDataflowEdge,
  GeometricBehavior as GeometricBehaviorType,
  GeometricEvent,
  VNode,
  MultivectorData,
  CSSProperties
} from './types';

// Runtime state
interface RuntimeState {
  domNodes: Map<string, HTMLElement | Text>;
  behaviorSubscriptions: Map<string, (() => void)[]>;
  eventSubscriptions: Map<string, (() => void)[]>;
  activeAnimations: Map<string, number>;
  mountPoint: HTMLElement | null;
}

class GeometricRuntime {
  private state: RuntimeState;
  private cliffy: Cliffy | null = null;

  constructor() {
    this.state = {
      domNodes: new Map(),
      behaviorSubscriptions: new Map(),
      eventSubscriptions: new Map(),
      activeAnimations: new Map(),
      mountPoint: null
    };
  }

  // Initialize the runtime with a Cliffy instance
  initialize(cliffy: Cliffy): void {
    this.cliffy = cliffy;
  }

  // Mount an algebraic element tree to a DOM container
  mount(element: AlgebraicElement, container: HTMLElement): void {
    this.state.mountPoint = container;
    container.innerHTML = ''; // Clear existing content

    // Process the algebraic element graph
    const projectedVNode = this.projectToVNode(element);
    const domNode = this.createDOMFromVNode(projectedVNode, element.nodeId);
    
    container.appendChild(domNode);
    
    // Start the reactive update loop
    this.startReactiveLoop(element);
  }

  // Unmount and cleanup
  unmount(): void {
    // Cancel all animations
    for (const animationId of this.state.activeAnimations.values()) {
      cancelAnimationFrame(animationId);
    }
    this.state.activeAnimations.clear();

    // Cleanup all subscriptions
    for (const subscriptions of this.state.behaviorSubscriptions.values()) {
      subscriptions.forEach(unsubscribe => unsubscribe());
    }
    this.state.behaviorSubscriptions.clear();

    for (const subscriptions of this.state.eventSubscriptions.values()) {
      subscriptions.forEach(unsubscribe => unsubscribe());
    }
    this.state.eventSubscriptions.clear();

    // Clear DOM references
    this.state.domNodes.clear();
    
    if (this.state.mountPoint) {
      this.state.mountPoint.innerHTML = '';
      this.state.mountPoint = null;
    }
  }

  // Project an algebraic element to a virtual node
  private projectToVNode(element: AlgebraicElement): VNode {
    // Handle special combinators
    if (this.isCombinator(element.tag)) {
      return this.projectCombinatorToVNode(element);
    }

    // Handle text elements
    if (element.tag === 'text') {
      const content = element.props.get('content');
      return {
        tag: 'text',
        props: {},
        children: typeof content === 'string' ? content : String(content || ''),
        key: element.key || undefined
      };
    }

    // Handle fragments
    if (element.tag === 'fragment') {
      return {
        tag: 'fragment',
        props: {},
        children: this.projectChildrenToVNodes(element.children),
        key: element.key || undefined
      };
    }

    // Handle regular elements
    const staticProps = this.extractStaticProps(element.props);
    const children = this.projectChildrenToVNodes(element.children);

    return {
      tag: element.tag,
      props: staticProps,
      children,
      key: element.key || undefined
    };
  }

  // Project combinator elements to virtual nodes
  private projectCombinatorToVNode(element: AlgebraicElement): VNode {
    switch (element.tag) {
      case 'when-combinator': {
        const condition = element.props.get('condition') as GeometricBehaviorType<boolean>;
        const children = element.props.get('children') as GeometricBehaviorType<AlgebraicElement[]>;
        
        const shouldRender = condition?.sample() ?? false;
        if (shouldRender) {
          const childElements = children?.sample() ?? [];
          return {
            tag: 'fragment',
            props: {},
            children: childElements.map(child => this.projectToVNode(child)),
            key: element.key || undefined
          };
        } else {
          return {
            tag: 'fragment',
            props: {},
            children: [],
            key: element.key || undefined
          };
        }
      }

      case 'for-combinator': {
        const children = element.props.get('children') as GeometricBehaviorType<AlgebraicElement[]>;
        const childElements = children?.sample() ?? [];
        
        return {
          tag: 'fragment',
          props: {},
          children: childElements.map(child => this.projectToVNode(child)),
          key: element.key || undefined
        };
      }

      case 'switch-combinator':
      case 'map-combinator':
      case 'flatmap-combinator':
      case 'combine-combinator':
      case 'filter-combinator':
      case 'memoize-combinator': {
        const children = element.props.get('children') as GeometricBehaviorType<AlgebraicElement[]>;
        const childElements = children?.sample() ?? [];
        
        return {
          tag: 'fragment',
          props: {},
          children: childElements.map(child => this.projectToVNode(child)),
          key: element.key || undefined
        };
      }

      default:
        return {
          tag: 'div',
          props: {},
          children: [],
          key: element.key || undefined
        };
    }
  }

  // Project children to virtual nodes
  private projectChildrenToVNodes(
    children: AlgebraicElement[] | GeometricBehaviorType<AlgebraicElement[]>
  ): VNode[] {
    if (Array.isArray(children)) {
      return children.map(child => this.projectToVNode(child));
    } else {
      const childElements = children.sample();
      return childElements.map(child => this.projectToVNode(child));
    }
  }

  // Extract static props from the props map, sampling behaviors
  private extractStaticProps(props: Map<string, any>): Record<string, any> {
    const staticProps: Record<string, any> = {};
    
    for (const [key, value] of props) {
      if (value && typeof value === 'object' && 'sample' in value) {
        // Sample the behavior
        staticProps[key] = value.sample();
      } else {
        staticProps[key] = value;
      }
    }
    
    return staticProps;
  }

  // Create DOM nodes from virtual nodes
  private createDOMFromVNode(vnode: VNode, elementId: string): HTMLElement | Text {
    if (vnode.tag === 'text') {
      const textNode = document.createTextNode(vnode.children as string);
      this.state.domNodes.set(elementId, textNode);
      return textNode;
    }

    if (vnode.tag === 'fragment') {
      // Create a document fragment
      const fragment = document.createDocumentFragment();
      const children = vnode.children as VNode[];
      
      children.forEach((child, index) => {
        const childNode = this.createDOMFromVNode(child, `${elementId}-child-${index}`);
        fragment.appendChild(childNode);
      });
      
      // Return a wrapper div for fragments (needed for DOM manipulation)
      const wrapper = document.createElement('div');
      wrapper.style.display = 'contents'; // Make wrapper invisible
      wrapper.appendChild(fragment);
      this.state.domNodes.set(elementId, wrapper);
      return wrapper;
    }

    // Create regular DOM element
    const element = document.createElement(vnode.tag);
    this.state.domNodes.set(elementId, element);
    
    // Apply props
    this.applyPropsToDOM(element, vnode.props);
    
    // Add children
    const children = vnode.children as VNode[];
    children.forEach((child, index) => {
      const childNode = this.createDOMFromVNode(child, `${elementId}-child-${index}`);
      element.appendChild(childNode);
    });
    
    return element;
  }

  // Apply props to DOM element
  private applyPropsToDOM(element: HTMLElement, props: Record<string, any>): void {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children' || key === 'key') {
        continue;
      }
      
      if (key === 'className') {
        element.className = value || '';
      } else if (key === 'style') {
        this.applyStylesToDOM(element, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        // Event handlers
        const eventName = key.toLowerCase().substring(2);
        element.addEventListener(eventName, value);
      } else if (key === 'transform' && value instanceof Multivector) {
        this.applyGeometricTransform(element, value);
      } else if (element instanceof HTMLInputElement && key === 'value') {
        element.value = String(value || '');
      } else if (element instanceof HTMLInputElement && key === 'type') {
        element.type = value || 'text';
      } else {
        element.setAttribute(key, String(value || ''));
      }
    }
  }

  // Apply CSS styles to DOM element
  private applyStylesToDOM(element: HTMLElement, styles: CSSProperties | any): void {
    if (!styles || typeof styles !== 'object') return;
    
    for (const [property, value] of Object.entries(styles)) {
      if (value instanceof Multivector) {
        const cssValue = this.multivectorToCSS(property, value);
        element.style.setProperty(property, cssValue);
      } else if (value != null) {
        element.style.setProperty(property, String(value));
      }
    }
  }

  // Apply geometric transform to DOM element
  private applyGeometricTransform(element: HTMLElement, transform: Multivector): void {
    const coeffs = transform.coefficients;
    const transforms: string[] = [];

    // Translation (e1, e2, e3 components)
    const tx = (coeffs[1] || 0) * 100;
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
    const rotateZ = (coeffs[3] || 0) * 180 / Math.PI;
    const rotateX = (coeffs[5] || 0) * 180 / Math.PI;
    const rotateY = (coeffs[6] || 0) * 180 / Math.PI;

    if (rotateX !== 0) transforms.push(`rotateX(${rotateX}deg)`);
    if (rotateY !== 0) transforms.push(`rotateY(${rotateY}deg)`);
    if (rotateZ !== 0) transforms.push(`rotateZ(${rotateZ}deg)`);

    if (transforms.length > 0) {
      element.style.transform = transforms.join(' ');
    }
  }

  // Convert multivector to CSS value
  private multivectorToCSS(property: string, mv: Multivector): string {
    const coeffs = mv.coefficients;
    
    switch (property) {
      case 'opacity':
        return Math.max(0, Math.min(1, coeffs[0] || 1)).toString();
        
      case 'color':
        const r = Math.round(((coeffs[1] || 0) + 1) * 127.5);
        const g = Math.round(((coeffs[2] || 0) + 1) * 127.5);
        const b = Math.round(((coeffs[4] || 0) + 1) * 127.5);
        return `rgb(${r}, ${g}, ${b})`;
        
      case 'backgroundColor':
        const br = Math.round(((coeffs[1] || 0) + 1) * 127.5);
        const bg = Math.round(((coeffs[2] || 0) + 1) * 127.5);
        const bb = Math.round(((coeffs[4] || 0) + 1) * 127.5);
        const alpha = Math.max(0, Math.min(1, coeffs[0] || 1));
        return `rgba(${br}, ${bg}, ${bb}, ${alpha})`;
        
      case 'width':
      case 'height':
      case 'fontSize':
        return `${Math.abs(coeffs[0] || 0)}px`;
        
      default:
        return coeffs[0]?.toString() || '0';
    }
  }

  // Start the reactive update loop
  private startReactiveLoop(rootElement: AlgebraicElement): void {
    const update = () => {
      // Check if any behaviors have changed
      const hasChanges = this.checkForChanges(rootElement);
      
      if (hasChanges) {
        this.updateDOM(rootElement);
      }
      
      // Schedule next update
      const animationId = requestAnimationFrame(update);
      this.state.activeAnimations.set('main-loop', animationId);
    };
    
    // Start the loop
    update();
  }

  // Check if any behaviors in the tree have changed
  private checkForChanges(element: AlgebraicElement): boolean {
    // In a production implementation, this would use a change detection system
    // For now, we assume changes happen and always update
    return this.hasActiveBehaviors(element);
  }

  // Check if element has active behaviors
  private hasActiveBehaviors(element: AlgebraicElement): boolean {
    // Check props for active behaviors
    for (const [, value] of element.props) {
      if (value && typeof value === 'object' && 'isActive' in value && value.isActive()) {
        return true;
      }
    }
    
    // Check children
    if (Array.isArray(element.children)) {
      return element.children.some(child => this.hasActiveBehaviors(child));
    } else if (element.children && 'isActive' in element.children) {
      return element.children.isActive();
    }
    
    return false;
  }

  // Update DOM based on current algebraic element state
  private updateDOM(element: AlgebraicElement): void {
    const domNode = this.state.domNodes.get(element.nodeId);
    if (!domNode) return;
    
    // Re-project to VNode and update DOM
    const newVNode = this.projectToVNode(element);
    this.updateDOMFromVNode(domNode, newVNode, element.nodeId);
  }

  // Update existing DOM node from new VNode
  private updateDOMFromVNode(
    domNode: HTMLElement | Text,
    newVNode: VNode,
    elementId: string
  ): void {
    if (newVNode.tag === 'text') {
      if (domNode instanceof Text) {
        domNode.textContent = newVNode.children as string;
      }
      return;
    }

    if (domNode instanceof HTMLElement) {
      // Update props
      this.applyPropsToDOM(domNode, newVNode.props);
      
      // Update children (simplified - production would use proper diffing)
      const children = newVNode.children as VNode[];
      const currentChildCount = domNode.childNodes.length;
      
      // Add/update children
      children.forEach((child, index) => {
        if (index < currentChildCount) {
          // Update existing child
          const existingChild = domNode.childNodes[index];
          if (existingChild instanceof HTMLElement || existingChild instanceof Text) {
            this.updateDOMFromVNode(existingChild, child, `${elementId}-child-${index}`);
          }
        } else {
          // Add new child
          const newChild = this.createDOMFromVNode(child, `${elementId}-child-${index}`);
          domNode.appendChild(newChild);
        }
      });
      
      // Remove excess children
      while (domNode.childNodes.length > children.length) {
        const lastChild = domNode.lastChild;
        if (lastChild) {
          domNode.removeChild(lastChild);
        }
      }
    }
  }

  // Check if a tag represents a combinator
  private isCombinator(tag: string): boolean {
    return tag.endsWith('-combinator');
  }

  // Public API for external interaction
  public updateElement(elementId: string): void {
    const domNode = this.state.domNodes.get(elementId);
    if (domNode && this.state.mountPoint) {
      // Trigger a re-render of this specific element
      // Implementation would depend on maintaining element tree
    }
  }

  public getDOMNode(elementId: string): HTMLElement | Text | undefined {
    return this.state.domNodes.get(elementId);
  }

  public isActive(): boolean {
    return this.state.mountPoint !== null;
  }
}

// Create and export a global runtime instance
export const geometricRuntime = new GeometricRuntime();

// Export the runtime class for custom instances
export { GeometricRuntime };

// Convenience functions
export function createGeometricRuntime(): GeometricRuntime {
  return new GeometricRuntime();
}

export function mountApp(
  element: AlgebraicElement, 
  container: HTMLElement, 
  cliffy?: Cliffy
): void {
  if (cliffy) {
    geometricRuntime.initialize(cliffy);
  }
  geometricRuntime.mount(element, container);
}

export function unmountApp(): void {
  geometricRuntime.unmount();
}