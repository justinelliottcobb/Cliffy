/**
 * Box Component
 *
 * A generic container element that serves as the foundation for all layout.
 * Supports padding, margin, and style escape hatch for living layer.
 */

import type { BehaviorProp, SpacingValue, StyleProps } from '../types';
import { isBehavior, toSpacingValue } from '../types';

export interface BoxProps extends StyleProps {
  /** Padding on all sides */
  padding?: BehaviorProp<SpacingValue>;
  /** Horizontal padding */
  paddingX?: BehaviorProp<SpacingValue>;
  /** Vertical padding */
  paddingY?: BehaviorProp<SpacingValue>;
  /** Margin on all sides */
  margin?: BehaviorProp<SpacingValue>;
  /** Horizontal margin */
  marginX?: BehaviorProp<SpacingValue>;
  /** Vertical margin */
  marginY?: BehaviorProp<SpacingValue>;
  /** Child elements */
  children?: HTMLElement | HTMLElement[];
}

/**
 * Create a Box component.
 */
export async function Box(props: BoxProps = {}): Promise<HTMLElement> {
  const {
    padding,
    paddingX,
    paddingY,
    margin,
    marginX,
    marginY,
    style,
    className,
    children,
  } = props;

  // Create element
  const element = document.createElement('div');
  element.className = className && !isBehavior(className) ? `cliffy-box ${className}` : 'cliffy-box';

  // Apply static styles
  if (padding !== undefined && !isBehavior(padding)) {
    element.style.padding = toSpacingValue(padding);
  }
  if (paddingX !== undefined && !isBehavior(paddingX)) {
    element.style.paddingLeft = toSpacingValue(paddingX);
    element.style.paddingRight = toSpacingValue(paddingX);
  }
  if (paddingY !== undefined && !isBehavior(paddingY)) {
    element.style.paddingTop = toSpacingValue(paddingY);
    element.style.paddingBottom = toSpacingValue(paddingY);
  }
  if (margin !== undefined && !isBehavior(margin)) {
    element.style.margin = toSpacingValue(margin);
  }
  if (marginX !== undefined && !isBehavior(marginX)) {
    element.style.marginLeft = toSpacingValue(marginX);
    element.style.marginRight = toSpacingValue(marginX);
  }
  if (marginY !== undefined && !isBehavior(marginY)) {
    element.style.marginTop = toSpacingValue(marginY);
    element.style.marginBottom = toSpacingValue(marginY);
  }

  // Subscribe to Behavior props
  if (isBehavior(padding)) {
    padding.subscribe((value: SpacingValue) => {
      element.style.padding = toSpacingValue(value);
    });
  }
  if (isBehavior(paddingX)) {
    paddingX.subscribe((value: SpacingValue) => {
      element.style.paddingLeft = toSpacingValue(value);
      element.style.paddingRight = toSpacingValue(value);
    });
  }
  if (isBehavior(paddingY)) {
    paddingY.subscribe((value: SpacingValue) => {
      element.style.paddingTop = toSpacingValue(value);
      element.style.paddingBottom = toSpacingValue(value);
    });
  }
  if (isBehavior(margin)) {
    margin.subscribe((value: SpacingValue) => {
      element.style.margin = toSpacingValue(value);
    });
  }
  if (isBehavior(marginX)) {
    marginX.subscribe((value: SpacingValue) => {
      element.style.marginLeft = toSpacingValue(value);
      element.style.marginRight = toSpacingValue(value);
    });
  }
  if (isBehavior(marginY)) {
    marginY.subscribe((value: SpacingValue) => {
      element.style.marginTop = toSpacingValue(value);
      element.style.marginBottom = toSpacingValue(value);
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
