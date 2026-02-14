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
  const { html } = await import('@cliffy-ga/core/html');

  const { size } = props;

  const buildStyle = (): string => {
    if (size !== undefined) {
      return [
        'flex: 0 0 auto',
        `width: ${toSpacingValue(size)}`,
        `height: ${toSpacingValue(size)}`,
      ].join('; ');
    }
    return 'flex: 1 1 auto';
  };

  return html`<div class="cliffy-spacer" style="${buildStyle()}"></div>` as HTMLElement;
}
