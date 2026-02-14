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
  const { html } = await import('@cliffy-ga/core/html');

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

  // Build CSS classes
  const classes = [
    'cliffy-text',
    `cliffy-text--${size}`,
    `cliffy-text--${weight}`,
    truncate ? 'cliffy-text--truncate' : '',
    className && !isBehavior(className) ? className : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Build inline styles
  const buildStyle = (): string => {
    const styles: string[] = [];

    styles.push(`font-size: var(--cliffy-text-${size})`);
    styles.push(`font-weight: var(--cliffy-font-${weight})`);

    if (color && !isBehavior(color)) {
      styles.push(`color: ${color}`);
    }

    if (truncate) {
      styles.push('overflow: hidden');
      styles.push('text-overflow: ellipsis');
      styles.push('white-space: nowrap');
    }

    return styles.join('; ');
  };

  // Use static or initial content
  const initialContent = isBehavior(content) ? content.sample() : content;

  // Create element based on 'as' prop
  const element = html`
    <${as}
      class="${classes}"
      style="${buildStyle()}"
    >${initialContent}</${as}>
  ` as HTMLElement;

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
