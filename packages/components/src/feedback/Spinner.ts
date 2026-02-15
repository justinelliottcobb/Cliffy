/**
 * Spinner Component
 *
 * Loading indicator with size variants.
 */

import type { Size, StyleProps } from '../types';
import { isBehavior } from '../types';

export interface SpinnerProps extends StyleProps {
  /** Spinner size */
  size?: Size;
  /** Spinner color (CSS value) */
  color?: string;
  /** Accessibility label */
  label?: string;
}

// Size to dimension mapping
const sizeConfig: Record<Size, string> = {
  xs: '12px',
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '48px',
};

/**
 * Create a Spinner component.
 */
export async function Spinner(props: SpinnerProps = {}): Promise<HTMLElement> {
  const {
    size = 'md',
    color = 'var(--cliffy-color-primary)',
    label = 'Loading',
    style,
    className,
  } = props;

  // Create wrapper
  const wrapper = document.createElement('span');
  wrapper.className = className && !isBehavior(className)
    ? `cliffy-spinner cliffy-spinner--${size} ${className}`
    : `cliffy-spinner cliffy-spinner--${size}`;

  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-label', label);

  // Apply styles
  const dimension = sizeConfig[size];
  wrapper.style.display = 'inline-block';
  wrapper.style.width = dimension;
  wrapper.style.height = dimension;
  wrapper.style.borderRadius = '50%';
  wrapper.style.border = `2px solid ${color}`;
  wrapper.style.borderTopColor = 'transparent';
  wrapper.style.animation = 'cliffy-spin 0.75s linear infinite';

  // Inject keyframes if not already present
  if (!document.getElementById('cliffy-spinner-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'cliffy-spinner-styles';
    styleSheet.textContent = `
      @keyframes cliffy-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  return wrapper;
}
