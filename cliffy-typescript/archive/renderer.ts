/**
 * Cliffy Framework Renderer and Reconciler
 * Handles mounting, updating, and rendering of geometric components
 */

import { Multivector } from './multivector';
import { GeometricBehavior } from './behavior';
import { jsx, jsxs, setCliffyInstance } from './jsx';
import { componentManager, ComponentInstance } from './components';
import { setGlobalClifffy, setCurrentComponent, clearCurrentComponent } from './hooks';
import { Cliffy } from './cliffy';
import type { JSXElement, ComponentFunction, GeometricProps } from './types';

// Global renderer state
let mountedRoot: HTMLElement | null = null;
let rootInstance: ComponentInstance | null = null;
let cliffyInstance: Cliffy | null = null;

// Initialize the Cliffy framework
export function initializeCliffy(signature: string = 'Cl(3,0)'): Cliffy {
  cliffyInstance = new Cliffy(signature as any);
  setGlobalClifffy(cliffyInstance);
  setCliffyInstance(cliffyInstance);
  return cliffyInstance;
}

// Main render function - the entry point for the framework
export function render(element: JSXElement, container: HTMLElement): void {
  mountedRoot = container;
  
  // Initialize Cliffy if not already done
  if (!cliffyInstance) {
    initializeCliffy();
  }

  // Clear existing content
  container.innerHTML = '';
  
  // Create root component instance
  const rootId = 'root-' + Math.random().toString(36).substr(2, 9);
  const rootComponent = () => element;
  
  rootInstance = componentManager.createInstance(rootId, rootComponent, {});
  
  // Render and mount
  const rendered = renderElement(element, rootInstance);
  const domNode = createDOMNode(rendered);
  container.appendChild(domNode);
  
  rootInstance.mounted = true;
}

// Render a JSX element to a virtual node structure
function renderElement(element: JSXElement, parentInstance?: ComponentInstance): JSXElement {
  if (!element) return element;

  // Handle text nodes
  if (element.type === 'text') {
    return element;
  }

  // Handle fragments
  if (element.type === 'fragment') {
    return {
      ...element,
      children: element.children.map(child => renderElement(child, parentInstance))
    };
  }

  // Handle function components
  if (typeof element.type === 'function') {
    const componentFunction = element.type as ComponentFunction;
    const componentId = 'component-' + Math.random().toString(36).substr(2, 9);
    
    // Create component instance if it doesn't exist
    let instance = parentInstance?.children.find(child => 
      child.component === componentFunction
    );
    
    if (!instance) {
      instance = componentManager.createInstance(
        componentId,
        componentFunction,
        element.props,
        parentInstance
      );
    } else {
      // Update props
      instance.props = element.props;
    }

    // Render the component
    const rendered = componentManager.renderComponent(instance);
    return renderElement(rendered, instance);
  }

  // Handle intrinsic elements (div, span, etc.)
  const processedElement = {
    ...element,
    children: element.children.map(child => renderElement(child, parentInstance))
  };

  return processedElement;
}

// Create actual DOM nodes from virtual elements
function createDOMNode(element: JSXElement): HTMLElement | Text {
  if (!element) return document.createTextNode('');

  // Handle text nodes
  if (element.type === 'text') {
    return document.createTextNode(element.props.content || '');
  }

  // Handle fragments
  if (element.type === 'fragment') {
    const fragment = document.createDocumentFragment();
    element.children.forEach(child => {
      const childNode = createDOMNode(child);
      fragment.appendChild(childNode);
    });
    // Return a wrapper div for fragments
    const wrapper = document.createElement('div');
    wrapper.appendChild(fragment);
    return wrapper;
  }

  // Create DOM element
  const domElement = document.createElement(element.type as string);
  
  // Apply properties
  applyPropsToDOM(domElement, element.props, element.geometric);
  
  // Add children
  element.children.forEach(child => {
    const childNode = createDOMNode(child);
    domElement.appendChild(childNode);
  });
  
  return domElement;
}

// Apply props and geometric transformations to DOM elements
function applyPropsToDOM(
  domElement: HTMLElement, 
  props: Record<string, any>, 
  geometric?: JSXElement['geometric']
): void {
  // Apply standard props
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || key.startsWith('geometric:')) {
      continue;
    }
    
    if (key === 'className') {
      domElement.className = value;
    } else if (key === 'style') {
      applyStyles(domElement, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event handlers
      const eventName = key.toLowerCase().substring(2);
      domElement.addEventListener(eventName, (event) => {
        value(event, geometric?.transform);
      });
    } else if (key === 'value' && domElement instanceof HTMLInputElement) {
      domElement.value = value?.toString() || '';
    } else if (key === 'type' && domElement instanceof HTMLInputElement) {
      domElement.type = value;
    } else {
      domElement.setAttribute(key, value?.toString() || '');
    }
  }
  
  // Apply geometric transformations
  if (geometric?.transform) {
    applyGeometricTransform(domElement, geometric.transform);
  }
  
  // Apply geometric behaviors
  if (geometric?.behaviors && geometric.behaviors.size > 0) {
    applyGeometricBehaviors(domElement, geometric.behaviors);
  }
}

// Apply CSS styles including geometric transformations
function applyStyles(domElement: HTMLElement, styles: Record<string, any>): void {
  for (const [property, value] of Object.entries(styles)) {
    if (value instanceof Multivector) {
      const cssValue = multivectorToCSS(property, value);
      domElement.style.setProperty(property, cssValue);
    } else if (value instanceof GeometricBehavior) {
      const cssValue = multivectorToCSS(property, value.sample());
      domElement.style.setProperty(property, cssValue);
    } else {
      domElement.style.setProperty(property, value);
    }
  }
}

// Convert multivector to CSS transform
function applyGeometricTransform(domElement: HTMLElement, transform: Multivector): void {
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
    domElement.style.transform = transforms.join(' ');
  }
}

// Apply geometric behaviors to DOM elements
function applyGeometricBehaviors(
  domElement: HTMLElement, 
  behaviors: Map<string, GeometricBehavior>
): void {
  for (const [key, behavior] of behaviors) {
    // Set up behavior animation
    const animate = () => {
      const currentValue = behavior.sample();
      
      if (key === 'transform') {
        applyGeometricTransform(domElement, currentValue);
      } else {
        const cssValue = multivectorToCSS(key, currentValue);
        domElement.style.setProperty(key, cssValue);
      }
      
      // Continue animation if behavior is still active
      if (behavior.isActive()) {
        requestAnimationFrame(animate);
      }
    };
    
    if (behavior.isActive()) {
      requestAnimationFrame(animate);
    }
  }
}

// Convert multivector to CSS value based on property
function multivectorToCSS(property: string, mv: Multivector): string {
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
      return `${coeffs[0] || 0}px`;
      
    default:
      return coeffs[0]?.toString() || '0';
  }
}

// Update a component and re-render
export function updateComponent(instanceId: string): void {
  const instance = componentManager['instances'].get(instanceId);
  if (!instance || !mountedRoot) return;

  // Re-render the component
  const rendered = componentManager.renderComponent(instance);
  
  // Find the DOM node and update it
  // This is a simplified update - in a production framework,
  // you'd implement proper diffing and patching
  if (rootInstance && mountedRoot) {
    const newRendered = renderElement(rendered, instance);
    const newDOMNode = createDOMNode(newRendered);
    
    // Replace the old node with the new one
    const oldNode = mountedRoot.firstChild;
    if (oldNode) {
      mountedRoot.replaceChild(newDOMNode, oldNode);
    }
  }
}

// Unmount the entire application
export function unmount(): void {
  if (rootInstance) {
    componentManager.unmountComponent(rootInstance.id);
    rootInstance = null;
  }
  
  if (mountedRoot) {
    mountedRoot.innerHTML = '';
    mountedRoot = null;
  }
}

// Export the core renderer API
export const CliffyRenderer = {
  render,
  updateComponent,
  unmount,
  initializeCliffy
};

// Export framework utilities
export function createApp(rootComponent: ComponentFunction): {
  mount: (container: HTMLElement) => void;
  unmount: () => void;
} {
  return {
    mount: (container: HTMLElement) => {
      const element = jsx(rootComponent, {});
      render(element, container);
    },
    unmount
  };
}