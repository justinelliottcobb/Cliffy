/**
 * Grid Component
 *
 * CSS Grid-based layout component for arranging children in rows and columns.
 */

import type { BehaviorProp, SpacingValue, StyleProps } from '../types';
import { isBehavior, toSpacingValue } from '../types';

export interface GridProps extends StyleProps {
  /** Number of columns (or template string like "1fr 2fr 1fr") */
  columns?: BehaviorProp<number | string>;
  /** Number of rows (or template string) */
  rows?: BehaviorProp<number | string>;
  /** Gap between items */
  gap?: BehaviorProp<SpacingValue>;
  /** Column gap (overrides gap for columns) */
  columnGap?: BehaviorProp<SpacingValue>;
  /** Row gap (overrides gap for rows) */
  rowGap?: BehaviorProp<SpacingValue>;
  /** Align items on cross axis */
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  /** Justify items on main axis */
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
  /** Child elements */
  children?: HTMLElement | HTMLElement[];
}

/**
 * Convert columns/rows value to grid template
 */
function toGridTemplate(value: number | string): string {
  if (typeof value === 'number') {
    return `repeat(${value}, 1fr)`;
  }
  return value;
}

/**
 * Create a Grid component.
 */
export async function Grid(props: GridProps = {}): Promise<HTMLElement> {
  const {
    columns = 1,
    rows,
    gap = 'md',
    columnGap,
    rowGap,
    alignItems = 'stretch',
    justifyItems = 'stretch',
    style,
    className,
    children,
  } = props;

  // Create element
  const element = document.createElement('div');
  element.className = className && !isBehavior(className)
    ? `cliffy-grid ${className}`
    : 'cliffy-grid';

  // Apply base styles
  element.style.display = 'grid';
  element.style.alignItems = alignItems;
  element.style.justifyItems = justifyItems;

  // Apply initial columns
  const initialColumns = isBehavior(columns)
    ? (columns.sample() as number | string)
    : columns;
  element.style.gridTemplateColumns = toGridTemplate(initialColumns);

  // Apply initial rows if provided
  if (rows !== undefined) {
    const initialRows = isBehavior(rows)
      ? (rows.sample() as number | string)
      : rows;
    element.style.gridTemplateRows = toGridTemplate(initialRows);
  }

  // Apply initial gap
  const initialGap = isBehavior(gap)
    ? (gap.sample() as SpacingValue)
    : gap;
  element.style.gap = toSpacingValue(initialGap);

  // Apply column gap if specified
  if (columnGap !== undefined) {
    const initialColumnGap = isBehavior(columnGap)
      ? (columnGap.sample() as SpacingValue)
      : columnGap;
    element.style.columnGap = toSpacingValue(initialColumnGap);
  }

  // Apply row gap if specified
  if (rowGap !== undefined) {
    const initialRowGap = isBehavior(rowGap)
      ? (rowGap.sample() as SpacingValue)
      : rowGap;
    element.style.rowGap = toSpacingValue(initialRowGap);
  }

  // Subscribe to reactive columns
  if (isBehavior(columns)) {
    columns.subscribe((value: number | string) => {
      element.style.gridTemplateColumns = toGridTemplate(value);
    });
  }

  // Subscribe to reactive rows
  if (isBehavior(rows)) {
    rows.subscribe((value: number | string) => {
      element.style.gridTemplateRows = toGridTemplate(value);
    });
  }

  // Subscribe to reactive gap
  if (isBehavior(gap)) {
    gap.subscribe((value: SpacingValue) => {
      element.style.gap = toSpacingValue(value);
    });
  }

  // Subscribe to reactive column gap
  if (isBehavior(columnGap)) {
    columnGap.subscribe((value: SpacingValue) => {
      element.style.columnGap = toSpacingValue(value);
    });
  }

  // Subscribe to reactive row gap
  if (isBehavior(rowGap)) {
    rowGap.subscribe((value: SpacingValue) => {
      element.style.rowGap = toSpacingValue(value);
    });
  }

  // Subscribe to reactive className
  if (isBehavior(className)) {
    className.subscribe((value: string) => {
      element.className = `cliffy-grid ${value}`;
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
