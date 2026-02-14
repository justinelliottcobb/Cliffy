/**
 * Stack Component
 *
 * Flexbox-based layout component for arranging children in a row or column.
 */

import type {
  BehaviorProp,
  SpacingValue,
  FlexDirection,
  FlexAlign,
  FlexJustify,
  StyleProps,
} from '../types';
import { isBehavior, toSpacingValue } from '../types';

export interface StackProps extends StyleProps {
  /** Stack direction */
  direction?: BehaviorProp<FlexDirection>;
  /** Gap between children */
  gap?: BehaviorProp<SpacingValue>;
  /** Cross-axis alignment */
  align?: FlexAlign;
  /** Main-axis alignment */
  justify?: FlexJustify;
  /** Wrap children */
  wrap?: boolean;
  /** Child elements */
  children?: HTMLElement | HTMLElement[];
}

// Flex direction mapping
const directionMap: Record<FlexDirection, string> = {
  horizontal: 'row',
  vertical: 'column',
};

// Alignment mapping
const alignMap: Record<FlexAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

// Justification mapping
const justifyMap: Record<FlexJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

/**
 * Create a Stack component.
 */
export async function Stack(props: StackProps = {}): Promise<HTMLElement> {
  const { html } = await import('@cliffy-ga/core/html');

  const {
    direction = 'vertical',
    gap = 'md',
    align = 'stretch',
    justify = 'start',
    wrap = false,
    style,
    className,
    children,
  } = props;

  // Build initial styles
  const buildStyle = (): string => {
    const dir: FlexDirection = isBehavior(direction)
      ? (direction.sample() as FlexDirection)
      : direction;
    const g: SpacingValue = isBehavior(gap)
      ? (gap.sample() as SpacingValue)
      : gap;

    const styles = [
      'display: flex',
      `flex-direction: ${directionMap[dir]}`,
      `gap: ${toSpacingValue(g)}`,
      `align-items: ${alignMap[align]}`,
      `justify-content: ${justifyMap[justify]}`,
      wrap ? 'flex-wrap: wrap' : 'flex-wrap: nowrap',
    ];

    return styles.join('; ');
  };

  // Create element
  const element = html`
    <div
      class="cliffy-stack ${className && !isBehavior(className) ? className : ''}"
      style="${buildStyle()}"
    ></div>
  ` as HTMLElement;

  // Subscribe to reactive direction
  if (isBehavior(direction)) {
    direction.subscribe((value: FlexDirection) => {
      element.style.flexDirection = directionMap[value];
    });
  }

  // Subscribe to reactive gap
  if (isBehavior(gap)) {
    gap.subscribe((value: SpacingValue) => {
      element.style.gap = toSpacingValue(value);
    });
  }

  // Subscribe to reactive className
  if (isBehavior(className)) {
    className.subscribe((value: string) => {
      element.className = `cliffy-stack ${value}`;
    });
  }

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

/**
 * Create a horizontal stack (row).
 */
export async function HStack(
  props: Omit<StackProps, 'direction'> = {}
): Promise<HTMLElement> {
  return Stack({ ...props, direction: 'horizontal' });
}

/**
 * Create a vertical stack (column).
 */
export async function VStack(
  props: Omit<StackProps, 'direction'> = {}
): Promise<HTMLElement> {
  return Stack({ ...props, direction: 'vertical' });
}
