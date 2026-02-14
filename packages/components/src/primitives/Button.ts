/**
 * Button Component
 *
 * Interactive button with variants, sizes, and reactive state.
 */

import type { BehaviorProp, Size, ButtonVariant, StyleProps } from '../types';
import { isBehavior } from '../types';

export interface ButtonProps extends StyleProps {
  /** Button label */
  label: BehaviorProp<string>;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: Size;
  /** Disabled state */
  disabled?: BehaviorProp<boolean>;
  /** Full width */
  fullWidth?: boolean;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
}

// Size to padding/font-size mapping
const sizeConfig: Record<Size, { padding: string; fontSize: string }> = {
  xs: { padding: 'var(--cliffy-space-xs) var(--cliffy-space-sm)', fontSize: 'var(--cliffy-text-xs)' },
  sm: { padding: 'var(--cliffy-space-xs) var(--cliffy-space-md)', fontSize: 'var(--cliffy-text-sm)' },
  md: { padding: 'var(--cliffy-space-sm) var(--cliffy-space-md)', fontSize: 'var(--cliffy-text-md)' },
  lg: { padding: 'var(--cliffy-space-sm) var(--cliffy-space-lg)', fontSize: 'var(--cliffy-text-lg)' },
  xl: { padding: 'var(--cliffy-space-md) var(--cliffy-space-xl)', fontSize: 'var(--cliffy-text-xl)' },
};

// Variant to color mapping
const variantConfig: Record<ButtonVariant, { background: string; color: string; border?: string }> = {
  primary: { background: 'var(--cliffy-color-primary)', color: 'white' },
  secondary: { background: 'var(--cliffy-color-secondary)', color: 'white' },
  ghost: { background: 'transparent', color: 'var(--cliffy-color-foreground)', border: 'var(--cliffy-border-width) solid var(--cliffy-color-border)' },
  danger: { background: 'var(--cliffy-color-error)', color: 'white' },
};

/**
 * Create a Button component.
 */
export async function Button(props: ButtonProps): Promise<HTMLButtonElement> {
  const {
    label,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    fullWidth = false,
    type = 'button',
    style,
    className,
  } = props;

  // Create element
  const element = document.createElement('button');
  element.type = type;
  element.className = `cliffy-btn cliffy-btn--${variant} cliffy-btn--${size}${className && !isBehavior(className) ? ` ${className}` : ''}`;

  // Apply base styles
  element.style.display = 'inline-flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.style.gap = 'var(--cliffy-space-sm)';
  element.style.fontFamily = 'var(--cliffy-font-sans)';
  element.style.fontWeight = 'var(--cliffy-font-medium)';
  element.style.border = 'none';
  element.style.cursor = 'pointer';
  element.style.transition = 'all var(--cliffy-duration-normal) var(--cliffy-easing)';
  element.style.borderRadius = 'var(--cliffy-radius-md)';

  // Apply size styles
  const sizeStyles = sizeConfig[size];
  element.style.padding = sizeStyles.padding;
  element.style.fontSize = sizeStyles.fontSize;

  // Apply variant styles
  const variantStyles = variantConfig[variant];
  element.style.background = variantStyles.background;
  element.style.color = variantStyles.color;
  if (variantStyles.border) {
    element.style.border = variantStyles.border;
  }

  if (fullWidth) {
    element.style.width = '100%';
  }

  // Set initial values
  const initialLabel = isBehavior(label) ? label.sample() : label;
  const initialDisabled = isBehavior(disabled) ? disabled.sample() : disabled;

  element.textContent = String(initialLabel);
  element.disabled = initialDisabled;
  if (initialDisabled) {
    element.style.opacity = '0.5';
    element.style.cursor = 'not-allowed';
  }

  // Add click handler
  element.addEventListener('click', onClick);

  // Add hover/active styles via event listeners
  element.addEventListener('mouseenter', () => {
    if (!element.disabled) {
      element.style.filter = 'brightness(0.9)';
    }
  });

  element.addEventListener('mouseleave', () => {
    element.style.filter = '';
  });

  element.addEventListener('mousedown', () => {
    if (!element.disabled) {
      element.style.filter = 'brightness(0.8)';
    }
  });

  element.addEventListener('mouseup', () => {
    if (!element.disabled) {
      element.style.filter = 'brightness(0.9)';
    }
  });

  // Subscribe to reactive label
  if (isBehavior(label)) {
    label.subscribe((value: string) => {
      element.textContent = value;
    });
  }

  // Subscribe to reactive disabled
  if (isBehavior(disabled)) {
    disabled.subscribe((value: boolean) => {
      element.disabled = value;
      element.style.opacity = value ? '0.5' : '1';
      element.style.cursor = value ? 'not-allowed' : 'pointer';
    });
  }

  return element;
}
