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

// Base input styles
const baseStyles = `
  font-family: var(--cliffy-font-sans);
  border: var(--cliffy-border-width) solid var(--cliffy-color-border);
  border-radius: var(--cliffy-radius-md);
  background: var(--cliffy-color-background);
  color: var(--cliffy-color-foreground);
  transition: all var(--cliffy-duration-normal) var(--cliffy-easing);
  outline: none;
`;

// Size styles
const sizeStyles: Record<Size, string> = {
  xs: 'padding: var(--cliffy-space-xs); font-size: var(--cliffy-text-xs);',
  sm: 'padding: var(--cliffy-space-xs) var(--cliffy-space-sm); font-size: var(--cliffy-text-sm);',
  md: 'padding: var(--cliffy-space-sm) var(--cliffy-space-md); font-size: var(--cliffy-text-md);',
  lg: 'padding: var(--cliffy-space-sm) var(--cliffy-space-lg); font-size: var(--cliffy-text-lg);',
  xl: 'padding: var(--cliffy-space-md) var(--cliffy-space-xl); font-size: var(--cliffy-text-xl);',
};

/**
 * Create an Input component.
 */
export async function Input(props: InputProps): Promise<HTMLInputElement> {
  const { html } = await import('@cliffy-ga/core/html');

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

  // Build styles
  const buildStyle = (): string => {
    let styles = baseStyles + sizeStyles[size];

    if (fullWidth) {
      styles += 'width: 100%; box-sizing: border-box;';
    }

    return styles.replace(/\s+/g, ' ').trim();
  };

  // Get initial values
  const initialValue = value.sample();
  const initialPlaceholder = placeholder
    ? isBehavior(placeholder)
      ? placeholder.sample()
      : placeholder
    : '';
  const initialDisabled = isBehavior(disabled) ? disabled.sample() : disabled;

  // Create element
  const element = html`
    <input
      type="${type}"
      class="cliffy-input cliffy-input--${size} ${className && !isBehavior(className) ? className : ''}"
      style="${buildStyle()}"
      value="${initialValue}"
      placeholder="${initialPlaceholder}"
      disabled="${initialDisabled}"
      readonly="${readOnly}"
      name="${name || ''}"
      id="${id || ''}"
    />
  ` as HTMLInputElement;

  // Handle focus styles
  element.addEventListener('focus', () => {
    element.style.borderColor = 'var(--cliffy-color-primary)';
    element.style.boxShadow = `0 0 0 var(--cliffy-focus-ring-width) var(--cliffy-color-primary-light)`;
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
