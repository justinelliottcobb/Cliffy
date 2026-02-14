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

  // Create element
  const element = document.createElement('div');
  element.className = className && !isBehavior(className)
    ? `cliffy-stack ${className}`
    : 'cliffy-stack';

  // Apply base styles
  element.style.display = 'flex';
  element.style.flexWrap = wrap ? 'wrap' : 'nowrap';
  element.style.alignItems = alignMap[align];
  element.style.justifyContent = justifyMap[justify];

  // Apply initial direction
  const initialDirection: FlexDirection = isBehavior(direction)
    ? (direction.sample() as FlexDirection)
    : direction;
  element.style.flexDirection = directionMap[initialDirection];

  // Apply initial gap
  const initialGap: SpacingValue = isBehavior(gap)
    ? (gap.sample() as SpacingValue)
    : gap;
  element.style.gap = toSpacingValue(initialGap);

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
