/**
 * Badge Component
 *
 * Status indicator or label with variants.
 */

import type { BehaviorProp, Size, StyleProps } from '../types';
import { isBehavior } from '../types';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

export interface BadgeProps extends StyleProps {
  /** Badge content */
  content: BehaviorProp<string | number>;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: Size;
  /** Rounded pill style */
  pill?: boolean;
}

// Size to padding/font-size mapping
const sizeConfig: Record<Size, { padding: string; fontSize: string }> = {
  xs: { padding: '0.125rem 0.375rem', fontSize: 'var(--cliffy-text-xs)' },
  sm: { padding: '0.125rem 0.5rem', fontSize: 'var(--cliffy-text-xs)' },
  md: { padding: '0.25rem 0.625rem', fontSize: 'var(--cliffy-text-sm)' },
  lg: { padding: '0.25rem 0.75rem', fontSize: 'var(--cliffy-text-md)' },
  xl: { padding: '0.375rem 1rem', fontSize: 'var(--cliffy-text-lg)' },
};

// Variant to color mapping
const variantConfig: Record<BadgeVariant, { background: string; color: string }> = {
  default: { background: 'var(--cliffy-color-border)', color: 'var(--cliffy-color-foreground)' },
  primary: { background: 'var(--cliffy-color-primary)', color: 'white' },
  secondary: { background: 'var(--cliffy-color-secondary)', color: 'white' },
  success: { background: 'var(--cliffy-color-success)', color: 'white' },
  warning: { background: 'var(--cliffy-color-warning)', color: 'var(--cliffy-color-neutral-900)' },
  error: { background: 'var(--cliffy-color-error)', color: 'white' },
};

/**
 * Create a Badge component.
 */
export async function Badge(props: BadgeProps): Promise<HTMLElement> {
  const {
    content,
    variant = 'default',
    size = 'md',
    pill = false,
    style,
    className,
  } = props;

  // Create element
  const element = document.createElement('span');
  element.className = className && !isBehavior(className)
    ? `cliffy-badge cliffy-badge--${variant} cliffy-badge--${size} ${className}`
    : `cliffy-badge cliffy-badge--${variant} cliffy-badge--${size}`;

  // Apply base styles
  element.style.display = 'inline-flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.style.fontFamily = 'var(--cliffy-font-sans)';
  element.style.fontWeight = 'var(--cliffy-font-medium)';
  element.style.lineHeight = '1';
  element.style.whiteSpace = 'nowrap';

  // Apply size styles
  const sizeStyles = sizeConfig[size];
  element.style.padding = sizeStyles.padding;
  element.style.fontSize = sizeStyles.fontSize;

  // Apply variant styles
  const variantStyles = variantConfig[variant];
  element.style.background = variantStyles.background;
  element.style.color = variantStyles.color;

  // Apply border radius
  element.style.borderRadius = pill ? 'var(--cliffy-radius-full)' : 'var(--cliffy-radius-sm)';

  // Set initial content
  const initialContent = isBehavior(content) ? content.sample() : content;
  element.textContent = String(initialContent);

  // Subscribe to reactive content
  if (isBehavior(content)) {
    content.subscribe((value: string | number) => {
      element.textContent = String(value);
    });
  }

  return element;
}
