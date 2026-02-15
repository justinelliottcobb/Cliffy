/**
 * FormField Component
 *
 * Wrapper for form inputs with label, helper text, and error display.
 */

import type { BehaviorProp, StyleProps } from '../types';
import { isBehavior } from '../types';

export interface FormFieldProps extends StyleProps {
  /** Field label */
  label?: BehaviorProp<string>;
  /** Helper text displayed below input */
  helperText?: BehaviorProp<string>;
  /** Error message (displays in error state) */
  error?: BehaviorProp<string>;
  /** Required indicator */
  required?: boolean;
  /** For attribute (connects to input id) */
  htmlFor?: string;
  /** Child input element */
  children?: HTMLElement;
}

/**
 * Create a FormField component.
 */
export async function FormField(props: FormFieldProps): Promise<HTMLElement> {
  const {
    label,
    helperText,
    error,
    required = false,
    htmlFor,
    style,
    className,
    children,
  } = props;

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = className && !isBehavior(className)
    ? `cliffy-form-field ${className}`
    : 'cliffy-form-field';

  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = 'var(--cliffy-space-xs)';

  // Create label if provided
  if (label !== undefined) {
    const labelElement = document.createElement('label');
    if (htmlFor) labelElement.htmlFor = htmlFor;

    labelElement.style.fontSize = 'var(--cliffy-text-sm)';
    labelElement.style.fontWeight = 'var(--cliffy-font-medium)';
    labelElement.style.color = 'var(--cliffy-color-foreground)';

    const initialLabel = isBehavior(label) ? (label.sample() as string) : label;
    labelElement.textContent = initialLabel + (required ? ' *' : '');

    if (isBehavior(label)) {
      label.subscribe((newLabel: string) => {
        labelElement.textContent = newLabel + (required ? ' *' : '');
      });
    }

    wrapper.appendChild(labelElement);
  }

  // Add child input
  if (children) {
    wrapper.appendChild(children);
  }

  // Create helper/error text container
  const messageElement = document.createElement('span');
  messageElement.style.fontSize = 'var(--cliffy-text-xs)';
  messageElement.style.minHeight = '1.2em';

  const updateMessage = () => {
    const errorValue = error
      ? isBehavior(error) ? (error.sample() as string) : error
      : '';
    const helperValue = helperText
      ? isBehavior(helperText) ? (helperText.sample() as string) : helperText
      : '';

    if (errorValue) {
      messageElement.textContent = errorValue;
      messageElement.style.color = 'var(--cliffy-color-error)';
    } else if (helperValue) {
      messageElement.textContent = helperValue;
      messageElement.style.color = 'var(--cliffy-color-muted)';
    } else {
      messageElement.textContent = '';
    }
  };

  updateMessage();

  // Subscribe to reactive error
  if (isBehavior(error)) {
    error.subscribe(() => updateMessage());
  }

  // Subscribe to reactive helperText
  if (isBehavior(helperText)) {
    helperText.subscribe(() => updateMessage());
  }

  wrapper.appendChild(messageElement);

  return wrapper;
}
