/**
 * Checkbox Component
 *
 * Boolean toggle with reactive state binding.
 */

import type { Behavior } from '@cliffy-ga/core';
import type { BehaviorProp, Size, StyleProps } from '../types';
import { isBehavior } from '../types';

export interface CheckboxProps extends StyleProps {
  /** Checked state (Behavior for two-way binding) */
  checked: Behavior;
  /** Change handler */
  onChange?: (checked: boolean) => void;
  /** Label text */
  label?: BehaviorProp<string>;
  /** Checkbox size */
  size?: Size;
  /** Disabled state */
  disabled?: BehaviorProp<boolean>;
  /** Name attribute */
  name?: string;
  /** ID attribute */
  id?: string;
}

// Size to dimension mapping
const sizeConfig: Record<Size, { box: string; fontSize: string; gap: string }> = {
  xs: { box: '14px', fontSize: 'var(--cliffy-text-xs)', gap: 'var(--cliffy-space-xs)' },
  sm: { box: '16px', fontSize: 'var(--cliffy-text-sm)', gap: 'var(--cliffy-space-xs)' },
  md: { box: '18px', fontSize: 'var(--cliffy-text-md)', gap: 'var(--cliffy-space-sm)' },
  lg: { box: '22px', fontSize: 'var(--cliffy-text-lg)', gap: 'var(--cliffy-space-sm)' },
  xl: { box: '26px', fontSize: 'var(--cliffy-text-xl)', gap: 'var(--cliffy-space-md)' },
};

/**
 * Create a Checkbox component.
 */
export async function Checkbox(props: CheckboxProps): Promise<HTMLElement> {
  const {
    checked,
    onChange,
    label,
    size = 'md',
    disabled = false,
    name,
    id,
    style,
    className,
  } = props;

  const sizeStyles = sizeConfig[size];

  // Create wrapper label element
  const wrapper = document.createElement('label');
  wrapper.className = className && !isBehavior(className)
    ? `cliffy-checkbox cliffy-checkbox--${size} ${className}`
    : `cliffy-checkbox cliffy-checkbox--${size}`;

  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = sizeStyles.gap;
  wrapper.style.cursor = 'pointer';
  wrapper.style.userSelect = 'none';

  // Create checkbox input
  const input = document.createElement('input');
  input.type = 'checkbox';
  if (name) input.name = name;
  if (id) input.id = id;

  input.style.width = sizeStyles.box;
  input.style.height = sizeStyles.box;
  input.style.margin = '0';
  input.style.cursor = 'pointer';
  input.style.accentColor = 'var(--cliffy-color-primary)';

  // Set initial values
  const initialChecked = checked.sample() as boolean;
  const initialDisabled = isBehavior(disabled) ? disabled.sample() : disabled;

  input.checked = initialChecked;
  input.disabled = initialDisabled;

  if (initialDisabled) {
    wrapper.style.opacity = '0.5';
    wrapper.style.cursor = 'not-allowed';
    input.style.cursor = 'not-allowed';
  }

  // Handle change events - update the Behavior
  input.addEventListener('change', () => {
    checked.set(input.checked);
    onChange?.(input.checked);
  });

  // Subscribe to checked Behavior for external updates
  checked.subscribe((newChecked: boolean) => {
    if (input.checked !== newChecked) {
      input.checked = newChecked;
    }
  });

  // Subscribe to reactive disabled
  if (isBehavior(disabled)) {
    disabled.subscribe((isDisabled: boolean) => {
      input.disabled = isDisabled;
      wrapper.style.opacity = isDisabled ? '0.5' : '1';
      wrapper.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
      input.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    });
  }

  wrapper.appendChild(input);

  // Add label text if provided
  if (label !== undefined) {
    const labelSpan = document.createElement('span');
    labelSpan.style.fontSize = sizeStyles.fontSize;
    labelSpan.style.color = 'var(--cliffy-color-foreground)';

    const initialLabel = isBehavior(label) ? (label.sample() as string) : label;
    labelSpan.textContent = initialLabel;

    if (isBehavior(label)) {
      label.subscribe((newLabel: string) => {
        labelSpan.textContent = newLabel;
      });
    }

    wrapper.appendChild(labelSpan);
  }

  return wrapper;
}
