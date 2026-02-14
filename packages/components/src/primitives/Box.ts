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
  const { html } = await import('@cliffy-ga/core/html');

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

  // Build initial style object
  const buildStyle = (): Partial<CSSStyleDeclaration> => {
    const s: Record<string, string> = {};

    // Padding
    if (padding !== undefined && !isBehavior(padding)) {
      s.padding = toSpacingValue(padding);
    }
    if (paddingX !== undefined && !isBehavior(paddingX)) {
      s.paddingLeft = toSpacingValue(paddingX);
      s.paddingRight = toSpacingValue(paddingX);
    }
    if (paddingY !== undefined && !isBehavior(paddingY)) {
      s.paddingTop = toSpacingValue(paddingY);
      s.paddingBottom = toSpacingValue(paddingY);
    }

    // Margin
    if (margin !== undefined && !isBehavior(margin)) {
      s.margin = toSpacingValue(margin);
    }
    if (marginX !== undefined && !isBehavior(marginX)) {
      s.marginLeft = toSpacingValue(marginX);
      s.marginRight = toSpacingValue(marginX);
    }
    if (marginY !== undefined && !isBehavior(marginY)) {
      s.marginTop = toSpacingValue(marginY);
      s.marginBottom = toSpacingValue(marginY);
    }

    return s as Partial<CSSStyleDeclaration>;
  };

  // Create element
  const element = html`
    <div
      class=${className ?? 'cliffy-box'}
      style=${style ?? buildStyle()}
    ></div>
  ` as HTMLElement;

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
