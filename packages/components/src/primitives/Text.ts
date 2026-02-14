/**
 * Text Component
 *
 * Typography primitive for displaying text with reactive content.
 */

import type { BehaviorProp, TextSize, FontWeight, StyleProps } from '../types';
import { isBehavior } from '../types';

export interface TextProps extends StyleProps {
  /** Text content (can be a Behavior for reactive updates) */
  content: BehaviorProp<string | number>;
  /** Text size */
  size?: TextSize;
  /** Font weight */
  weight?: FontWeight;
  /** Text color (CSS value or token) */
  color?: BehaviorProp<string>;
  /** HTML element to render (default: span) */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label';
  /** Truncate with ellipsis */
  truncate?: boolean;
}

/**
 * Create a Text component.
 */
export async function Text(props: TextProps): Promise<HTMLElement> {
  const {
    content,
    size = 'md',
    weight = 'normal',
    color,
    as = 'span',
    truncate = false,
    style,
    className,
  } = props;

  // Create element with the specified tag
  const element = document.createElement(as);

  // Set classes
  element.className = [
    'cliffy-text',
    `cliffy-text--${size}`,
    `cliffy-text--${weight}`,
    truncate ? 'cliffy-text--truncate' : '',
    className && !isBehavior(className) ? className : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Set styles
  element.style.fontSize = `var(--cliffy-text-${size})`;
  element.style.fontWeight = `var(--cliffy-font-${weight})`;

  if (color && !isBehavior(color)) {
    element.style.color = color;
  }

  if (truncate) {
    element.style.overflow = 'hidden';
    element.style.textOverflow = 'ellipsis';
    element.style.whiteSpace = 'nowrap';
  }

  // Set initial content
  const initialContent = isBehavior(content) ? content.sample() : content;
  element.textContent = String(initialContent);

  // Subscribe to reactive content
  if (isBehavior(content)) {
    content.subscribe((value: string | number) => {
      element.textContent = String(value);
    });
  }

  // Subscribe to reactive color
  if (isBehavior(color)) {
    color.subscribe((value: string) => {
      element.style.color = value;
    });
  }

  // Subscribe to reactive className
  if (isBehavior(className)) {
    className.subscribe((value: string) => {
      element.className = `cliffy-text cliffy-text--${size} cliffy-text--${weight} ${truncate ? 'cliffy-text--truncate' : ''} ${value}`;
    });
  }

  return element;
}
