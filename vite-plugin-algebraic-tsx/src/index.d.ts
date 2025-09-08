/**
 * Type declarations for vite-plugin-algebraic-tsx
 */

import type { Plugin } from 'vite';

export interface AlgebraicTSXOptions {
  /**
   * File extensions to transform
   * @default ['.tsx', '.jsx']
   */
  extensions?: string[];
  
  /**
   * Include patterns for files to transform
   * @default /\.(tsx?|jsx?)$/
   */
  include?: RegExp | RegExp[];
  
  /**
   * Exclude patterns for files to skip
   * @default /node_modules/
   */
  exclude?: RegExp | RegExp[];
  
  /**
   * JSX factory function name
   * @default 'jsx'
   */
  jsxFactory?: string;
  
  /**
   * JSX fragment factory function name
   * @default 'Fragment'
   */
  jsxFragment?: string;
  
  /**
   * Import source for jsx functions
   * @default '@cliffy/typescript'
   */
  jsxImportSource?: string;
  
  /**
   * Enable debugging output
   * @default false
   */
  debug?: boolean;
  
  /**
   * Algebraic combinators that should be treated as function calls
   * @default ['When', 'For', 'Map', 'Switch', 'Case', 'Default', 'Else', 'Filter', 'Combine', 'Memoize']
   */
  algebraicCombinators?: string[];
}

export interface TransformOptions {
  filename: string;
  jsxFactory: string;
  jsxFragment: string;
  jsxImportSource: string;
  algebraicCombinators: string[];
  debug: boolean;
}

export interface TransformResult {
  code: string;
  map?: any;
  transformed: boolean;
}

declare function algebraicTSX(options?: AlgebraicTSXOptions): Plugin;

export default algebraicTSX;

export declare function transformAlgebraicTSX(
  code: string, 
  options: TransformOptions
): TransformResult;