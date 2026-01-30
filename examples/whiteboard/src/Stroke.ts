/**
 * Stroke - Represents a drawing stroke with geometric points
 *
 * Each stroke is a sequence of points where each point is represented
 * as a position in geometric space. Transformations can be applied
 * to entire strokes using geometric algebra operations.
 */

export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  userId: string;
  points: Point[];
  color: string;
  width: number;
  timestamp: number;
}

/**
 * Generate a unique stroke ID
 */
export function generateStrokeId(): string {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new stroke
 */
export function createStroke(
  userId: string,
  color: string,
  width: number
): Stroke {
  return {
    id: generateStrokeId(),
    userId,
    points: [],
    color,
    width,
    timestamp: Date.now(),
  };
}

/**
 * Add a point to a stroke
 */
export function addPoint(
  stroke: Stroke,
  x: number,
  y: number,
  pressure = 1
): void {
  stroke.points.push({
    x,
    y,
    pressure,
    timestamp: performance.now(),
  });
}

/**
 * Apply a translation to all points in a stroke
 */
export function translateStroke(stroke: Stroke, dx: number, dy: number): Stroke {
  return {
    ...stroke,
    points: stroke.points.map(p => ({
      ...p,
      x: p.x + dx,
      y: p.y + dy,
    })),
  };
}

/**
 * Apply a rotation to all points in a stroke around a center
 */
export function rotateStroke(
  stroke: Stroke,
  angle: number,
  centerX: number,
  centerY: number
): Stroke {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    ...stroke,
    points: stroke.points.map(p => {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      return {
        ...p,
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
      };
    }),
  };
}

/**
 * Apply a scale to all points in a stroke around a center
 */
export function scaleStroke(
  stroke: Stroke,
  scale: number,
  centerX: number,
  centerY: number
): Stroke {
  return {
    ...stroke,
    points: stroke.points.map(p => ({
      ...p,
      x: centerX + (p.x - centerX) * scale,
      y: centerY + (p.y - centerY) * scale,
    })),
  };
}

/**
 * Calculate the bounding box of a stroke
 */
export function getStrokeBounds(stroke: Stroke): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (stroke.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of stroke.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Smooth a stroke using Catmull-Rom spline interpolation
 */
export function smoothStroke(stroke: Stroke, tension = 0.5): Point[] {
  const points = stroke.points;
  if (points.length < 3) return points;

  const result: Point[] = [];
  const segments = 4; // Points to insert between each pair

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        ((2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        ((2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      const pressure = p1.pressure + (p2.pressure - p1.pressure) * t;
      const timestamp = p1.timestamp + (p2.timestamp - p1.timestamp) * t;

      result.push({ x, y, pressure, timestamp });
    }
  }

  // Add the last point
  result.push(points[points.length - 1]);

  return result;
}

/**
 * Calculate the total length of a stroke
 */
export function getStrokeLength(stroke: Stroke): number {
  let length = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    const p1 = stroke.points[i - 1];
    const p2 = stroke.points[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}
