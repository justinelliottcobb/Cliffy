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

// Base button styles
const baseStyles = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--cliffy-space-sm);
  font-family: var(--cliffy-font-sans);
  font-weight: var(--cliffy-font-medium);
  border: none;
  cursor: pointer;
  transition: all var(--cliffy-duration-normal) var(--cliffy-easing);
  border-radius: var(--cliffy-radius-md);
`;

// Size styles
const sizeStyles: Record<Size, string> = {
  xs: 'padding: var(--cliffy-space-xs) var(--cliffy-space-sm); font-size: var(--cliffy-text-xs);',
  sm: 'padding: var(--cliffy-space-xs) var(--cliffy-space-md); font-size: var(--cliffy-text-sm);',
  md: 'padding: var(--cliffy-space-sm) var(--cliffy-space-md); font-size: var(--cliffy-text-md);',
  lg: 'padding: var(--cliffy-space-sm) var(--cliffy-space-lg); font-size: var(--cliffy-text-lg);',
  xl: 'padding: var(--cliffy-space-md) var(--cliffy-space-xl); font-size: var(--cliffy-text-xl);',
};

// Variant styles
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    background: var(--cliffy-color-primary);
    color: white;
  `,
  secondary: `
    background: var(--cliffy-color-secondary);
    color: white;
  `,
  ghost: `
    background: transparent;
    color: var(--cliffy-color-foreground);
    border: var(--cliffy-border-width) solid var(--cliffy-color-border);
  `,
  danger: `
    background: var(--cliffy-color-error);
    color: white;
  `,
};

/**
 * Create a Button component.
 */
export async function Button(props: ButtonProps): Promise<HTMLButtonElement> {
  const { html } = await import('@cliffy-ga/core/html');

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

  // Build styles
  const buildStyle = (): string => {
    let styles = baseStyles + sizeStyles[size] + variantStyles[variant];

    if (fullWidth) {
      styles += 'width: 100%;';
    }

    return styles.replace(/\s+/g, ' ').trim();
  };

  // Get initial values
  const initialLabel = isBehavior(label) ? label.sample() : label;
  const initialDisabled = isBehavior(disabled) ? disabled.sample() : disabled;

  // Create element
  const element = html`
    <button
      type="${type}"
      class="cliffy-btn cliffy-btn--${variant} cliffy-btn--${size} ${className && !isBehavior(className) ? className : ''}"
      style="${buildStyle()}"
      disabled="${initialDisabled}"
      onclick="${onClick}"
    >${initialLabel}</button>
  ` as HTMLButtonElement;

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
