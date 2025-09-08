/**
 * JSX runtime for Cliffy geometric web framework
 * Pure implementation without React dependencies
 */

import { Multivector } from './multivector';
import { GeometricBehavior } from './behavior';
import type { GeometricProps, JSXElement, ComponentFunction } from './types';

// Global instance for JSX runtime
let cliffyInstance: any = null;

export function setCliffyInstance(instance: any) {
  cliffyInstance = instance;
}

// JSX factory function
export function jsx(
  type: string | ComponentFunction,
  props: GeometricProps | null,
  key?: string
): JSXElement {
  return jsxImpl(type, props, [], key);
}

// JSX factory for elements with children
export function jsxs(
  type: string | ComponentFunction,
  props: GeometricProps & { children?: JSXElement | JSXElement[] } | null,
  key?: string
): JSXElement {
  const { children, ...otherProps } = props || {};
  const childArray = Array.isArray(children) ? children : children ? [children] : [];
  return jsxImpl(type, otherProps, childArray, key);
}

// Fragment component
export function Fragment(props: { children?: JSXElement | JSXElement[] }): JSXElement {
  const children = Array.isArray(props.children) ? props.children : props.children ? [props.children] : [];
  return {
    type: 'fragment',
    props: {},
    children,
    key: null,
    geometric: {
      transform: cliffyInstance?.scalar(1) || new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)'),
      behaviors: new Map(),
      animations: new Map()
    }
  };
}

// Internal JSX implementation
function jsxImpl(
  type: string | ComponentFunction,
  props: GeometricProps | null,
  children: JSXElement[],
  key?: string
): JSXElement {
  const processedProps = processGeometricProps(props || {});
  
  return {
    type,
    props: processedProps,
    children,
    key: key || null,
    geometric: {
      transform: extractGeometricTransform(processedProps),
      behaviors: extractGeometricBehaviors(processedProps),
      animations: extractGeometricAnimations(processedProps)
    }
  };
}

// Process props to handle geometric attributes
function processGeometricProps(props: GeometricProps): Record<string, any> {
  const processed: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('geometric:')) {
      // Handle geometric-specific props
      const geometricKey = key.substring(10); // Remove 'geometric:' prefix
      processed[geometricKey] = value;
    } else if (value instanceof Multivector || value instanceof GeometricBehavior) {
      // Handle geometric values
      processed[key] = value;
    } else if (key === 'transform' && typeof value === 'object') {
      // Handle transformation props
      processed[key] = processTransformProp(value);
    } else if (key === 'style' && typeof value === 'object') {
      // Handle geometric styles
      processed[key] = processStyleProp(value);
    } else {
      // Regular props
      processed[key] = value;
    }
  }
  
  return processed;
}

// Extract geometric transformation from props
function extractGeometricTransform(props: Record<string, any>): Multivector {
  if (props.transform instanceof Multivector) {
    return props.transform;
  }
  
  if (props.transform && typeof props.transform === 'object') {
    return processTransformProp(props.transform);
  }
  
  // Default identity transform
  return cliffyInstance?.scalar(1) || new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)');
}

// Extract geometric behaviors from props
function extractGeometricBehaviors(props: Record<string, any>): Map<string, GeometricBehavior> {
  const behaviors = new Map<string, GeometricBehavior>();
  
  for (const [key, value] of Object.entries(props)) {
    if (value instanceof GeometricBehavior) {
      behaviors.set(key, value);
    }
  }
  
  return behaviors;
}

// Extract geometric animations from props
function extractGeometricAnimations(props: Record<string, any>): Map<string, any> {
  const animations = new Map<string, any>();
  
  if (props.animate) {
    animations.set('default', props.animate);
  }
  
  return animations;
}

// Process transformation prop
function processTransformProp(transform: any): Multivector {
  if (!cliffyInstance) {
    return new Multivector([1, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)');
  }

  const builder = cliffyInstance.builder();

  if (transform.translate) {
    const { x = 0, y = 0, z = 0 } = transform.translate;
    builder.e1(x).e2(y).e3(z);
  }

  if (transform.scale) {
    const scale = typeof transform.scale === 'number' ? transform.scale : 1;
    builder.scalar(scale);
  }

  if (transform.rotate) {
    if (transform.rotate.xy) {
      // Rotation in XY plane (around Z axis)
      builder.e12(Math.sin(transform.rotate.xy / 2));
      builder.scalar(Math.cos(transform.rotate.xy / 2));
    }
  }

  return builder.build();
}

// Process style prop with geometric values
function processStyleProp(style: any): Record<string, any> {
  const processedStyle: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(style)) {
    if (value instanceof Multivector) {
      // Convert geometric values to CSS
      processedStyle[key] = multivectorToCSS(key, value);
    } else if (value instanceof GeometricBehavior) {
      // Sample current value from behavior
      processedStyle[key] = multivectorToCSS(key, value.sample());
    } else {
      processedStyle[key] = value;
    }
  }
  
  return processedStyle;
}

// Convert multivector to CSS value based on property
function multivectorToCSS(property: string, mv: Multivector): string {
  const coeffs = mv.coefficients;
  
  switch (property) {
    case 'transform':
      const translateX = (coeffs[1] || 0) * 100;
      const translateY = (coeffs[2] || 0) * 100;
      const translateZ = (coeffs[4] || 0) * 100;
      const scale = coeffs[0] || 1;
      const rotateZ = (coeffs[3] || 0) * 180 / Math.PI; // Convert radians to degrees
      
      return `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) scale(${scale}) rotateZ(${rotateZ}deg)`;
      
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
      
    default:
      return coeffs[0]?.toString() || '0';
  }
}

// Built-in geometric elements
export const div = (props: GeometricProps & { children?: JSXElement | JSXElement[] } = {}) => {
  return jsx('div', props);
};

export const span = (props: GeometricProps & { children?: JSXElement | JSXElement[] } = {}) => {
  return jsx('span', props);
};

export const button = (props: GeometricProps & { 
  children?: JSXElement | JSXElement[];
  onClick?: (transform: Multivector) => void;
} = {}) => {
  return jsx('button', props);
};

export const input = (props: GeometricProps & {
  value?: Multivector | GeometricBehavior | string;
  onChange?: (value: string, transform: Multivector) => void;
  type?: string;
} = {}) => {
  return jsx('input', props);
};

export const h1 = (props: GeometricProps & { children?: JSXElement | JSXElement[] } = {}) => {
  return jsx('h1', props);
};

export const h2 = (props: GeometricProps & { children?: JSXElement | JSXElement[] } = {}) => {
  return jsx('h2', props);
};

export const h3 = (props: GeometricProps & { children?: JSXElement | JSXElement[] } = {}) => {
  return jsx('h3', props);
};

export const p = (props: GeometricProps & { children?: JSXElement | JSXElement[] } = {}) => {
  return jsx('p', props);
};

// TypeScript JSX configuration for standalone framework
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'div': GeometricProps & Record<string, any>;
      'span': GeometricProps & Record<string, any>;
      'button': GeometricProps & Record<string, any>;
      'input': GeometricProps & Record<string, any>;
      'h1': GeometricProps & Record<string, any>;
      'h2': GeometricProps & Record<string, any>;
      'h3': GeometricProps & Record<string, any>;
      'p': GeometricProps & Record<string, any>;
      'a': GeometricProps & Record<string, any>;
      'img': GeometricProps & Record<string, any>;
      'ul': GeometricProps & Record<string, any>;
      'li': GeometricProps & Record<string, any>;
      'form': GeometricProps & Record<string, any>;
      'label': GeometricProps & Record<string, any>;
    }
  }
}

export default jsx;