/**
 * Progress Component
 *
 * Progress bar with reactive value binding.
 */

import type { BehaviorProp, Size, StyleProps } from '../types';
import { isBehavior } from '../types';

export type ProgressVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface ProgressProps extends StyleProps {
  /** Current value (0-100 or Behavior) */
  value: BehaviorProp<number>;
  /** Maximum value (default 100) */
  max?: number;
  /** Progress size */
  size?: Size;
  /** Progress variant */
  variant?: ProgressVariant;
  /** Show percentage label */
  showLabel?: boolean;
  /** Indeterminate state (animated, ignores value) */
  indeterminate?: boolean;
}

// Size to height mapping
const sizeConfig: Record<Size, string> = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
};

// Variant to color mapping
const variantConfig: Record<ProgressVariant, string> = {
  default: 'var(--cliffy-color-primary)',
  primary: 'var(--cliffy-color-primary)',
  success: 'var(--cliffy-color-success)',
  warning: 'var(--cliffy-color-warning)',
  error: 'var(--cliffy-color-error)',
};

/**
 * Create a Progress component.
 */
export async function Progress(props: ProgressProps): Promise<HTMLElement> {
  const {
    value,
    max = 100,
    size = 'md',
    variant = 'default',
    showLabel = false,
    indeterminate = false,
    style,
    className,
  } = props;

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = className && !isBehavior(className)
    ? `cliffy-progress cliffy-progress--${size} ${className}`
    : `cliffy-progress cliffy-progress--${size}`;

  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = 'var(--cliffy-space-sm)';
  wrapper.style.width = '100%';

  // Create track
  const track = document.createElement('div');
  track.className = 'cliffy-progress__track';
  track.style.flex = '1';
  track.style.height = sizeConfig[size];
  track.style.background = 'var(--cliffy-color-border)';
  track.style.borderRadius = 'var(--cliffy-radius-full)';
  track.style.overflow = 'hidden';

  // Create fill
  const fill = document.createElement('div');
  fill.className = 'cliffy-progress__fill';
  fill.style.height = '100%';
  fill.style.background = variantConfig[variant];
  fill.style.borderRadius = 'var(--cliffy-radius-full)';
  fill.style.transition = 'width var(--cliffy-duration-normal) var(--cliffy-easing)';

  // Set initial value
  const updateProgress = (val: number) => {
    const percentage = Math.min(100, Math.max(0, (val / max) * 100));
    fill.style.width = `${percentage}%`;
    if (labelElement) {
      labelElement.textContent = `${Math.round(percentage)}%`;
    }
  };

  // Handle indeterminate state
  if (indeterminate) {
    fill.style.width = '30%';
    fill.style.animation = 'cliffy-progress-indeterminate 1.5s ease-in-out infinite';

    // Inject keyframes if not already present
    if (!document.getElementById('cliffy-progress-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'cliffy-progress-styles';
      styleSheet.textContent = `
        @keyframes cliffy-progress-indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  } else {
    const initialValue = isBehavior(value) ? (value.sample() as number) : value;
    updateProgress(initialValue);
  }

  track.appendChild(fill);
  wrapper.appendChild(track);

  // Create label if needed
  let labelElement: HTMLElement | null = null;
  if (showLabel && !indeterminate) {
    labelElement = document.createElement('span');
    labelElement.className = 'cliffy-progress__label';
    labelElement.style.fontSize = 'var(--cliffy-text-sm)';
    labelElement.style.color = 'var(--cliffy-color-foreground)';
    labelElement.style.minWidth = '3em';
    labelElement.style.textAlign = 'right';

    const initialValue = isBehavior(value) ? (value.sample() as number) : value;
    const percentage = Math.min(100, Math.max(0, (initialValue / max) * 100));
    labelElement.textContent = `${Math.round(percentage)}%`;

    wrapper.appendChild(labelElement);
  }

  // Subscribe to reactive value
  if (isBehavior(value) && !indeterminate) {
    value.subscribe((newValue: number) => {
      updateProgress(newValue);
    });
  }

  return wrapper;
}
