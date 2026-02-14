/**
 * Shared types for @cliffy-ga/components
 */

import type { Behavior } from '@cliffy-ga/core';

// =============================================================================
// Behavior Props
// =============================================================================

/**
 * A prop that can be either a static value or a Behavior.
 * Components will handle both cases, subscribing to Behaviors automatically.
 *
 * Note: Behavior is not generic in the WASM types (uses any internally),
 * but we use T for documentation purposes.
 */
export type BehaviorProp<T> = T | Behavior;

// =============================================================================
// Sizing
// =============================================================================

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type SpacingValue = Size | number | string;

// =============================================================================
// Colors
// =============================================================================

export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

// =============================================================================
// Typography
// =============================================================================

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';

// =============================================================================
// Layout
// =============================================================================

export type FlexDirection = 'horizontal' | 'vertical';
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch';
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

// =============================================================================
// Component Variants
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';

// =============================================================================
// Style Props
// =============================================================================

/**
 * Style escape hatch for living layer integration.
 * cliffy-alive can pass dynamic styles to components.
 */
export interface StyleProps {
  style?: BehaviorProp<Partial<CSSStyleDeclaration>>;
  className?: BehaviorProp<string>;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Check if a value is a Behavior.
 */
export function isBehavior(value: unknown): value is Behavior {
  return (
    value !== null &&
    typeof value === 'object' &&
    'subscribe' in value &&
    typeof (value as Behavior).subscribe === 'function'
  );
}

/**
 * Convert spacing value to CSS value.
 */
export function toSpacingValue(value: SpacingValue): string {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  if (typeof value === 'string' && !['xs', 'sm', 'md', 'lg', 'xl'].includes(value)) {
    return value;
  }
  return `var(--cliffy-space-${value})`;
}
