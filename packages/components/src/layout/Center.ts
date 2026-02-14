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
  const { html } = await import('@cliffy-ga/core/html');

  const { inline = false, style, className, children } = props;

  const buildStyle = (): string => {
    return [
      `display: ${inline ? 'inline-flex' : 'flex'}`,
      'align-items: center',
      'justify-content: center',
    ].join('; ');
  };

  const element = html`
    <div
      class="cliffy-center ${className && !isBehavior(className) ? className : ''}"
      style="${buildStyle()}"
    ></div>
  ` as HTMLElement;

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
