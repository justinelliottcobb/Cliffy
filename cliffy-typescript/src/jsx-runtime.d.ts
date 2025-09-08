/**
 * JSX Runtime Type Declarations for Algebraic TSX
 * This file provides TypeScript support for Algebraic TSX syntax
 */

import type { AlgebraicElement, GeometricBehavior, GeometricComponent } from './types';

// Global JSX namespace declarations
declare global {
  namespace JSX {
    // Element type returned by JSX expressions
    interface Element extends AlgebraicElement {}
    
    // Intrinsic elements (HTML elements and algebraic combinators)
    interface IntrinsicElements {
      // HTML elements - accept any props for flexibility
      div: any;
      span: any;
      p: any;
      a: any;
      button: any;
      input: any;
      textarea: any;
      select: any;
      option: any;
      form: any;
      label: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      h5: any;
      h6: any;
      ul: any;
      ol: any;
      li: any;
      table: any;
      thead: any;
      tbody: any;
      tr: any;
      td: any;
      th: any;
      img: any;
      video: any;
      audio: any;
      canvas: any;
      svg: any;
      path: any;
      g: any;
      circle: any;
      rect: any;
      line: any;
      polygon: any;
      polyline: any;
      text: any;
      header: any;
      footer: any;
      main: any;
      nav: any;
      section: any;
      article: any;
      aside: any;
      details: any;
      summary: any;
      dialog: any;
      code: any;
      pre: any;
      blockquote: any;
      cite: any;
      em: any;
      strong: any;
      small: any;
      mark: any;
      del: any;
      ins: any;
      sub: any;
      sup: any;
      br: any;
      hr: any;
      iframe: any;
      embed: any;
      object: any;
      param: any;
      
      // Algebraic Combinators
      When: WhenProps;
      Else: ElseProps;
      Switch: SwitchProps<any>;
      Case: CaseProps<any>;
      Default: DefaultProps;
      For: ForProps<any>;
      Map: MapProps<any, any>;
      FlatMap: FlatMapProps<any, any>;
      Combine: CombineProps<any, any, any>;
      Filter: FilterProps<any>;
      Memoize: MemoizeProps<any>;
    }
    
    // Component prop attribute
    interface ElementAttributesProperty {
      props: {};
    }
    
    // Children attribute
    interface ElementChildrenAttribute {
      children: {};
    }
    
    // Intrinsic attributes (key, ref, etc.)
    interface IntrinsicAttributes {
      key?: string | number | null;
    }
    
    // Library managed attributes
    interface LibraryManagedAttributes<C, P> {
      // This allows component libraries to customize prop handling
    }
  }
}

// Prop type definitions for algebraic combinators
export interface WhenProps {
  condition: GeometricBehavior<boolean> | boolean;
  children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export interface ElseProps {
  children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export interface SwitchProps<T> {
  value: GeometricBehavior<T> | T;
  children?: AlgebraicElement[];
}

export interface CaseProps<T> {
  value: T;
  children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export interface DefaultProps {
  children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
}

export interface ForProps<T> {
  each: GeometricBehavior<T[]> | T[];
  key?: (item: T, index: number) => string | number;
  children: (item: GeometricBehavior<T>, index: GeometricBehavior<number>) => AlgebraicElement;
}

export interface MapProps<T, U> {
  from: GeometricBehavior<T> | T;
  to: (value: T) => U;
  children: (result: GeometricBehavior<U>) => AlgebraicElement;
}

export interface FlatMapProps<T, U> {
  from: GeometricBehavior<T> | T;
  to: (value: T) => GeometricBehavior<U>;
  children: (result: GeometricBehavior<U>) => AlgebraicElement;
}

export interface CombineProps<T, U, V> {
  a: GeometricBehavior<T> | T;
  b: GeometricBehavior<U> | U;
  with: (a: T, b: U) => V;
  children: (result: GeometricBehavior<V>) => AlgebraicElement;
}

export interface FilterProps<T> {
  from: GeometricBehavior<T[]> | T[];
  where: (item: T) => boolean;
  children: (result: GeometricBehavior<T[]>) => AlgebraicElement;
}

export interface MemoizeProps<T> {
  value: GeometricBehavior<T> | T;
  key?: (value: T) => string;
  children: (result: GeometricBehavior<T>) => AlgebraicElement;
}

// HTML element prop types (simplified, you can expand these)
export interface HTMLAttributes {
  // Standard HTML attributes
  className?: string;
  id?: string;
  style?: any;
  title?: string;
  hidden?: boolean;
  tabIndex?: number;
  role?: string;
  
  // Event handlers
  onClick?: (event: Event) => void;
  onChange?: (event: Event) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onSubmit?: (event: Event) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onMouseOver?: (event: MouseEvent) => void;
  onMouseOut?: (event: MouseEvent) => void;
  
  // Children
  children?: any;
}

export interface InputHTMLAttributes extends HTMLAttributes {
  type?: string;
  value?: any;
  placeholder?: string;
  disabled?: boolean;
  checked?: boolean;
  readOnly?: boolean;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

export interface ButtonHTMLAttributes extends HTMLAttributes {
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export interface FormHTMLAttributes extends HTMLAttributes {
  action?: string;
  method?: string;
  encType?: string;
  target?: string;
  noValidate?: boolean;
}

export interface AnchorHTMLAttributes extends HTMLAttributes {
  href?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
}

export interface ImgHTMLAttributes extends HTMLAttributes {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  loading?: 'lazy' | 'eager';
}

// Re-export for convenience
export type { AlgebraicElement, GeometricBehavior, GeometricComponent } from './types';