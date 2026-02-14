/**
 * Center Component
 *
 * Centers its children both horizontally and vertically.
 */

import type { StyleProps } from '../types';
import { isBehavior } from '../types';

export interface CenterProps extends StyleProps {
  /** Use inline-flex instead of flex */
  inline?: boolean;
  /** Child elements */
  children?: HTMLElement | HTMLElement[];
}

/**
 * Create a Center component.
 */
export async function Center(props: CenterProps = {}): Promise<HTMLElement> {
  const { inline = false, style, className, children } = props;

  // Create element
  const element = document.createElement('div');
  element.className = className && !isBehavior(className)
    ? `cliffy-center ${className}`
    : 'cliffy-center';

  // Apply styles
  element.style.display = inline ? 'inline-flex' : 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';

  // Append children
  if (children) {
    if (Array.isArray(children)) {
      children.forEach((child) => element.appendChild(child));
    } else {
      element.appendChild(children);
    }
  }

  return element;
}
