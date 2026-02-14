/**
 * Input Component
 *
 * Text input with reactive value binding.
 */

import type { Behavior } from '@cliffy-ga/core';
import type { BehaviorProp, Size, InputType, StyleProps } from '../types';
import { isBehavior } from '../types';

export interface InputProps extends StyleProps {
  /** Current value (Behavior for two-way binding) */
  value: Behavior;
  /** Input handler (called on every keystroke) */
  onInput?: (value: string) => void;
  /** Change handler (called on blur) */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: BehaviorProp<string>;
  /** Input type */
  type?: InputType;
  /** Input size */
  size?: Size;
  /** Disabled state */
  disabled?: BehaviorProp<boolean>;
  /** Read-only state */
  readOnly?: boolean;
  /** Name attribute */
  name?: string;
  /** ID attribute */
  id?: string;
  /** Full width */
  fullWidth?: boolean;
}

// Size to padding/font-size mapping
const sizeConfig: Record<Size, { padding: string; fontSize: string }> = {
  xs: { padding: 'var(--cliffy-space-xs)', fontSize: 'var(--cliffy-text-xs)' },
  sm: { padding: 'var(--cliffy-space-xs) var(--cliffy-space-sm)', fontSize: 'var(--cliffy-text-sm)' },
  md: { padding: 'var(--cliffy-space-sm) var(--cliffy-space-md)', fontSize: 'var(--cliffy-text-md)' },
  lg: { padding: 'var(--cliffy-space-sm) var(--cliffy-space-lg)', fontSize: 'var(--cliffy-text-lg)' },
  xl: { padding: 'var(--cliffy-space-md) var(--cliffy-space-xl)', fontSize: 'var(--cliffy-text-xl)' },
};

/**
 * Create an Input component.
 */
export async function Input(props: InputProps): Promise<HTMLInputElement> {
  const {
    value,
    onInput,
    onChange,
    placeholder,
    type = 'text',
    size = 'md',
    disabled = false,
    readOnly = false,
    name,
    id,
    fullWidth = false,
    style,
    className,
  } = props;

  // Create element
  const element = document.createElement('input');
  element.type = type;
  element.className = `cliffy-input cliffy-input--${size}${className && !isBehavior(className) ? ` ${className}` : ''}`;

  // Apply base styles
  element.style.fontFamily = 'var(--cliffy-font-sans)';
  element.style.border = 'var(--cliffy-border-width) solid var(--cliffy-color-border)';
  element.style.borderRadius = 'var(--cliffy-radius-md)';
  element.style.background = 'var(--cliffy-color-background)';
  element.style.color = 'var(--cliffy-color-foreground)';
  element.style.transition = 'all var(--cliffy-duration-normal) var(--cliffy-easing)';
  element.style.outline = 'none';

  // Apply size styles
  const sizeStyles = sizeConfig[size];
  element.style.padding = sizeStyles.padding;
  element.style.fontSize = sizeStyles.fontSize;

  if (fullWidth) {
    element.style.width = '100%';
    element.style.boxSizing = 'border-box';
  }

  // Set attributes
  if (name) element.name = name;
  if (id) element.id = id;
  element.readOnly = readOnly;

  // Set initial values
  const initialValue = value.sample() as string;
  const initialPlaceholder = placeholder
    ? isBehavior(placeholder)
      ? (placeholder.sample() as string)
      : placeholder
    : '';
  const initialDisabled = isBehavior(disabled) ? disabled.sample() : disabled;

  element.value = initialValue;
  element.placeholder = initialPlaceholder;
  element.disabled = initialDisabled;

  if (initialDisabled) {
    element.style.opacity = '0.5';
    element.style.cursor = 'not-allowed';
  }

  // Handle focus styles
  element.addEventListener('focus', () => {
    element.style.borderColor = 'var(--cliffy-color-primary)';
    element.style.boxShadow = '0 0 0 var(--cliffy-focus-ring-width) var(--cliffy-color-primary-light)';
  });

  element.addEventListener('blur', () => {
    element.style.borderColor = '';
    element.style.boxShadow = '';
    onChange?.(element.value);
  });

  // Handle input events - update the Behavior
  element.addEventListener('input', () => {
    value.set(element.value);
    onInput?.(element.value);
  });

  // Subscribe to value Behavior for external updates
  value.subscribe((newValue: string) => {
    if (element.value !== newValue) {
      element.value = newValue;
    }
  });

  // Subscribe to reactive placeholder
  if (isBehavior(placeholder)) {
    placeholder.subscribe((newPlaceholder: string) => {
      element.placeholder = newPlaceholder;
    });
  }

  // Subscribe to reactive disabled
  if (isBehavior(disabled)) {
    disabled.subscribe((isDisabled: boolean) => {
      element.disabled = isDisabled;
      element.style.opacity = isDisabled ? '0.5' : '1';
      element.style.cursor = isDisabled ? 'not-allowed' : 'text';
    });
  }

  return element;
}
