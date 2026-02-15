/**
 * TextField Component
 *
 * Labeled text input with validation support.
 * Combines FormField and Input for convenience.
 */

import type { Behavior } from '@cliffy-ga/core';
import type { BehaviorProp, Size, InputType, StyleProps } from '../types';
import { isBehavior } from '../types';
import { Input } from '../primitives/Input';
import { FormField } from './FormField';

export interface TextFieldProps extends StyleProps {
  /** Current value (Behavior for two-way binding) */
  value: Behavior;
  /** Field label */
  label?: BehaviorProp<string>;
  /** Placeholder text */
  placeholder?: BehaviorProp<string>;
  /** Helper text */
  helperText?: BehaviorProp<string>;
  /** Error message */
  error?: BehaviorProp<string>;
  /** Input type */
  type?: InputType;
  /** Input size */
  size?: Size;
  /** Required indicator */
  required?: boolean;
  /** Disabled state */
  disabled?: BehaviorProp<boolean>;
  /** Read-only state */
  readOnly?: boolean;
  /** Name attribute */
  name?: string;
  /** ID attribute */
  id?: string;
  /** Input handler */
  onInput?: (value: string) => void;
  /** Change handler */
  onChange?: (value: string) => void;
}

/**
 * Create a TextField component.
 */
export async function TextField(props: TextFieldProps): Promise<HTMLElement> {
  const {
    value,
    label,
    placeholder,
    helperText,
    error,
    type = 'text',
    size = 'md',
    required = false,
    disabled = false,
    readOnly = false,
    name,
    id,
    onInput,
    onChange,
    style,
    className,
  } = props;

  // Generate ID if not provided (for label association)
  const inputId = id || `cliffy-textfield-${Math.random().toString(36).slice(2, 9)}`;

  // Create the input element
  const input = await Input({
    value,
    placeholder,
    type,
    size,
    disabled,
    readOnly,
    name,
    id: inputId,
    fullWidth: true,
    onInput,
    onChange,
  });

  // Apply error styling to input if there's an error
  if (error) {
    const applyErrorStyle = (hasError: boolean) => {
      if (hasError) {
        input.style.borderColor = 'var(--cliffy-color-error)';
      } else {
        input.style.borderColor = '';
      }
    };

    if (isBehavior(error)) {
      error.subscribe((errorValue: string) => {
        applyErrorStyle(!!errorValue);
      });
      applyErrorStyle(!!(error.sample() as string));
    } else {
      applyErrorStyle(!!error);
    }
  }

  // Wrap in FormField
  const field = await FormField({
    label,
    helperText,
    error,
    required,
    htmlFor: inputId,
    children: input,
    className,
  });

  return field;
}
