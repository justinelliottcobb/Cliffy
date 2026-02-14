/**
 * Spacer Component
 *
 * Flexible space that fills available room in a flex container.
 */

import type { SpacingValue } from '../types';
import { toSpacingValue } from '../types';

export interface SpacerProps {
  /** Fixed size (overrides flex grow) */
  size?: SpacingValue;
}

/**
 * Create a Spacer component.
 */
export async function Spacer(props: SpacerProps = {}): Promise<HTMLElement> {
  const { size } = props;

  // Create element
  const element = document.createElement('div');
  element.className = 'cliffy-spacer';

  // Apply styles
  if (size !== undefined) {
    element.style.flex = '0 0 auto';
    element.style.width = toSpacingValue(size);
    element.style.height = toSpacingValue(size);
  } else {
    element.style.flex = '1 1 auto';
  }

  return element;
}
