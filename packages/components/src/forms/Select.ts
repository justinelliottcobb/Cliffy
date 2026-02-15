/**
 * Select Component
 *
 * Dropdown select with reactive value binding.
 */

import type { Behavior } from '@cliffy-ga/core';
import type { BehaviorProp, Size, StyleProps } from '../types';
import { isBehavior } from '../types';

export interface SelectOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface SelectProps extends StyleProps {
  /** Current value (Behavior for two-way binding) */
  value: Behavior;
  /** Available options */
  options: SelectOption[];
  /** Change handler */
  onChange?: (value: string) => void;
  /** Placeholder text (shown as first disabled option) */
  placeholder?: string;
  /** Select size */
  size?: Size;
  /** Disabled state */
  disabled?: BehaviorProp<boolean>;
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
 * Create a Select component.
 */
export async function Select(props: SelectProps): Promise<HTMLSelectElement> {
  const {
    value,
    options,
    onChange,
    placeholder,
    size = 'md',
    disabled = false,
    name,
    id,
    fullWidth = false,
    style,
    className,
  } = props;

  // Create select element
  const element = document.createElement('select');
  element.className = className && !isBehavior(className)
    ? `cliffy-select cliffy-select--${size} ${className}`
    : `cliffy-select cliffy-select--${size}`;

  // Apply base styles
  element.style.fontFamily = 'var(--cliffy-font-sans)';
  element.style.border = 'var(--cliffy-border-width) solid var(--cliffy-color-border)';
  element.style.borderRadius = 'var(--cliffy-radius-md)';
  element.style.background = 'var(--cliffy-color-background)';
  element.style.color = 'var(--cliffy-color-foreground)';
  element.style.transition = 'all var(--cliffy-duration-normal) var(--cliffy-easing)';
  element.style.outline = 'none';
  element.style.cursor = 'pointer';

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

  // Add placeholder option if provided
  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    element.appendChild(placeholderOption);
  }

  // Add options
  options.forEach((opt) => {
    const optionElement = document.createElement('option');
    optionElement.value = opt.value;
    optionElement.textContent = opt.label;
    if (opt.disabled) optionElement.disabled = true;
    element.appendChild(optionElement);
  });

  // Set initial values
  const initialValue = value.sample() as string;
  const initialDisabled = isBehavior(disabled) ? disabled.sample() : disabled;

  element.value = initialValue;
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
  });

  // Handle change events - update the Behavior
  element.addEventListener('change', () => {
    value.set(element.value);
    onChange?.(element.value);
  });

  // Subscribe to value Behavior for external updates
  value.subscribe((newValue: string) => {
    if (element.value !== newValue) {
      element.value = newValue;
    }
  });

  // Subscribe to reactive disabled
  if (isBehavior(disabled)) {
    disabled.subscribe((isDisabled: boolean) => {
      element.disabled = isDisabled;
      element.style.opacity = isDisabled ? '0.5' : '1';
      element.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    });
  }

  return element;
}
