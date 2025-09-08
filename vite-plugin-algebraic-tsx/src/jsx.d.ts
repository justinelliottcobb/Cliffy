/**
 * TypeScript JSX declarations for Algebraic TSX
 * Enables TSX syntax for Cliffy algebraic combinators
 */

import { AlgebraicElement, GeometricBehavior } from '@cliffy/typescript';

declare global {
  namespace JSX {
    // Intrinsic elements (HTML elements)
    interface IntrinsicElements {
      // All standard HTML elements
      [elemName: string]: any;
    }

    // Element types
    interface Element extends AlgebraicElement {}
    
    // Element attribute types
    interface ElementAttributesProperty {
      props: {};
    }
    
    interface ElementChildrenAttribute {
      children: {};
    }

    // Algebraic combinators as JSX elements
    interface IntrinsicElements {
      // When combinator
      When: {
        condition: GeometricBehavior<boolean> | boolean;
        children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
      };
      
      // Else combinator  
      Else: {
        children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
      };
      
      // Switch combinator
      Switch: {
        value: GeometricBehavior<any> | any;
        children?: AlgebraicElement[];
      };
      
      // Case combinator
      Case: {
        value: any;
        children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
      };
      
      // Default combinator
      Default: {
        children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
      };
      
      // For combinator
      For: {
        each: GeometricBehavior<any[]> | any[];
        key?: (item: any, index: number) => string | number;
        children: (item: GeometricBehavior<any>, index: GeometricBehavior<number>) => AlgebraicElement;
      };
      
      // Map combinator
      Map: {
        from: GeometricBehavior<any> | any;
        to: (value: any) => any;
        children: (result: GeometricBehavior<any>) => AlgebraicElement;
      };
      
      // FlatMap combinator
      FlatMap: {
        from: GeometricBehavior<any> | any;
        to: (value: any) => GeometricBehavior<any>;
        children: (result: GeometricBehavior<any>) => AlgebraicElement;
      };
      
      // Combine combinator
      Combine: {
        a: GeometricBehavior<any> | any;
        b: GeometricBehavior<any> | any;
        with: (a: any, b: any) => any;
        children: (result: GeometricBehavior<any>) => AlgebraicElement;
      };
      
      // Filter combinator
      Filter: {
        from: GeometricBehavior<any[]> | any[];
        where: (item: any) => boolean;
        children: (result: GeometricBehavior<any[]>) => AlgebraicElement;
      };
      
      // Memoize combinator
      Memoize: {
        value: GeometricBehavior<any> | any;
        key?: (value: any) => string;
        children: (result: GeometricBehavior<any>) => AlgebraicElement;
      };
    }
  }
}

// Component prop types for better type inference
export interface WhenProps {
  condition: GeometricBehavior<boolean> | boolean;
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

export interface SwitchProps<T> {
  value: GeometricBehavior<T> | T;
  children?: AlgebraicElement[];
}

export interface CaseProps<T> {
  value: T;
  children?: AlgebraicElement | AlgebraicElement[] | (() => AlgebraicElement);
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

// Allow this file to be imported as a module
export {};