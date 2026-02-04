/**
 * GA3 - 3D Euclidean Geometric Algebra Cl(3,0)
 *
 * A multivector with 8 basis elements:
 *
 * Index | Basis | Grade | Description
 * ------|-------|-------|---------------------
 *   0   | 1     | 0     | Scalar
 *   1   | e1    | 1     | X-axis vector
 *   2   | e2    | 1     | Y-axis vector
 *   3   | e12   | 2     | XY bivector (rotation plane)
 *   4   | e3    | 1     | Z-axis vector
 *   5   | e13   | 2     | XZ bivector (rotation plane)
 *   6   | e23   | 2     | YZ bivector (rotation plane)
 *   7   | e123  | 3     | Pseudoscalar (trivector)
 *
 * This is the internal representation - users interact with
 * GeometricState, Rotor, and Transform instead.
 */

/** Coefficient indices for clarity */
export const GA3_SCALAR = 0;
export const GA3_E1 = 1; // x
export const GA3_E2 = 2; // y
export const GA3_E12 = 3; // xy bivector
export const GA3_E3 = 4; // z
export const GA3_E13 = 5; // xz bivector
export const GA3_E23 = 6; // yz bivector
export const GA3_E123 = 7; // pseudoscalar

/** 8-element multivector array type */
export type GA3 = [number, number, number, number, number, number, number, number];

/** Create a zero multivector */
export function zero(): GA3 {
  return [0, 0, 0, 0, 0, 0, 0, 0];
}

/** Create a scalar multivector */
export function scalar(value: number): GA3 {
  return [value, 0, 0, 0, 0, 0, 0, 0];
}

/** Create a vector (grade 1) from x, y, z components */
export function vector(x: number, y: number, z: number): GA3 {
  return [0, x, y, 0, z, 0, 0, 0];
}

/** Create a bivector (grade 2) from xy, xz, yz components */
export function bivector(xy: number, xz: number, yz: number): GA3 {
  return [0, 0, 0, xy, 0, xz, yz, 0];
}

/** Create from all 8 coefficients */
export function fromCoefficients(coeffs: number[]): GA3 {
  return [
    coeffs[0] ?? 0,
    coeffs[1] ?? 0,
    coeffs[2] ?? 0,
    coeffs[3] ?? 0,
    coeffs[4] ?? 0,
    coeffs[5] ?? 0,
    coeffs[6] ?? 0,
    coeffs[7] ?? 0,
  ];
}

/** Clone a multivector */
export function clone(mv: GA3): GA3 {
  return [...mv] as GA3;
}

/** Add two multivectors */
export function add(a: GA3, b: GA3): GA3 {
  return [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2],
    a[3] + b[3],
    a[4] + b[4],
    a[5] + b[5],
    a[6] + b[6],
    a[7] + b[7],
  ];
}

/** Subtract two multivectors */
export function sub(a: GA3, b: GA3): GA3 {
  return [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2],
    a[3] - b[3],
    a[4] - b[4],
    a[5] - b[5],
    a[6] - b[6],
    a[7] - b[7],
  ];
}

/** Multiply by a scalar */
export function scale(mv: GA3, s: number): GA3 {
  return [
    mv[0] * s,
    mv[1] * s,
    mv[2] * s,
    mv[3] * s,
    mv[4] * s,
    mv[5] * s,
    mv[6] * s,
    mv[7] * s,
  ];
}

/** Negate all components */
export function negate(mv: GA3): GA3 {
  return scale(mv, -1);
}

/**
 * Geometric product of two multivectors.
 *
 * This is the fundamental operation of geometric algebra,
 * combining the inner and outer products.
 *
 * The multiplication table for GA3 basis elements:
 * e1*e1 = e2*e2 = e3*e3 = 1
 * e1*e2 = e12, e2*e1 = -e12
 * e1*e3 = e13, e3*e1 = -e13
 * e2*e3 = e23, e3*e2 = -e23
 * e12*e12 = e13*e13 = e23*e23 = -1
 * e123*e123 = -1
 */
export function geometricProduct(a: GA3, b: GA3): GA3 {
  // Extract components for clarity
  const [a0, a1, a2, a3, a4, a5, a6, a7] = a;
  const [b0, b1, b2, b3, b4, b5, b6, b7] = b;

  // Compute each component of the result
  // This expands the full geometric product using the GA3 multiplication table

  // Scalar (grade 0)
  const r0 =
    a0 * b0 +
    a1 * b1 +
    a2 * b2 +
    a4 * b4 -
    a3 * b3 -
    a5 * b5 -
    a6 * b6 -
    a7 * b7;

  // e1 (grade 1)
  const r1 =
    a0 * b1 +
    a1 * b0 -
    a2 * b3 +
    a3 * b2 -
    a4 * b5 +
    a5 * b4 +
    a6 * b7 +
    a7 * b6;

  // e2 (grade 1)
  const r2 =
    a0 * b2 +
    a1 * b3 +
    a2 * b0 -
    a3 * b1 -
    a4 * b6 -
    a5 * b7 +
    a6 * b4 +
    a7 * b5;

  // e12 (grade 2)
  const r3 =
    a0 * b3 +
    a1 * b2 -
    a2 * b1 +
    a3 * b0 +
    a4 * b7 +
    a5 * b6 -
    a6 * b5 +
    a7 * b4;

  // e3 (grade 1)
  const r4 =
    a0 * b4 +
    a1 * b5 +
    a2 * b6 +
    a3 * b7 +
    a4 * b0 -
    a5 * b1 -
    a6 * b2 -
    a7 * b3;

  // e13 (grade 2)
  const r5 =
    a0 * b5 +
    a1 * b4 -
    a2 * b7 +
    a3 * b6 -
    a4 * b1 +
    a5 * b0 -
    a6 * b3 -
    a7 * b2;

  // e23 (grade 2)
  const r6 =
    a0 * b6 +
    a1 * b7 +
    a2 * b4 -
    a3 * b5 -
    a4 * b2 +
    a5 * b3 +
    a6 * b0 +
    a7 * b1;

  // e123 (grade 3)
  const r7 =
    a0 * b7 +
    a1 * b6 -
    a2 * b5 +
    a3 * b4 +
    a4 * b3 -
    a5 * b2 +
    a6 * b1 +
    a7 * b0;

  return [r0, r1, r2, r3, r4, r5, r6, r7];
}

/**
 * Reverse (also called reversion or conjugate).
 *
 * Reverses the order of basis vectors in each term.
 * For GA3: flips sign of bivectors (grade 2) and trivector (grade 3).
 *
 * This is used to compute rotor inverses: for unit rotors, R† = R⁻¹
 */
export function reverse(mv: GA3): GA3 {
  return [
    mv[0], // scalar: unchanged
    mv[1], // e1: unchanged
    mv[2], // e2: unchanged
    -mv[3], // e12: sign flip (grade 2)
    mv[4], // e3: unchanged
    -mv[5], // e13: sign flip (grade 2)
    -mv[6], // e23: sign flip (grade 2)
    -mv[7], // e123: sign flip (grade 3)
  ];
}

/**
 * Magnitude (Euclidean norm) of the multivector.
 *
 * sqrt(sum of all coefficients squared)
 */
export function magnitude(mv: GA3): number {
  return Math.sqrt(
    mv[0] * mv[0] +
      mv[1] * mv[1] +
      mv[2] * mv[2] +
      mv[3] * mv[3] +
      mv[4] * mv[4] +
      mv[5] * mv[5] +
      mv[6] * mv[6] +
      mv[7] * mv[7]
  );
}

/**
 * Normalize to unit magnitude.
 *
 * Returns null if magnitude is too small (< 1e-10).
 */
export function normalize(mv: GA3): GA3 | null {
  const mag = magnitude(mv);
  if (mag < 1e-10) {
    return null;
  }
  return scale(mv, 1 / mag);
}

/**
 * Sandwich product: a * b * reverse(a)
 *
 * This is the fundamental transformation operation in GA.
 * When `a` is a unit rotor, this rotates `b`.
 */
export function sandwich(a: GA3, b: GA3): GA3 {
  return geometricProduct(geometricProduct(a, b), reverse(a));
}

/**
 * Linear interpolation between two multivectors.
 *
 * lerp(a, b, t) = (1-t)*a + t*b
 */
export function lerp(a: GA3, b: GA3, t: number): GA3 {
  const oneMinusT = 1 - t;
  return [
    oneMinusT * a[0] + t * b[0],
    oneMinusT * a[1] + t * b[1],
    oneMinusT * a[2] + t * b[2],
    oneMinusT * a[3] + t * b[3],
    oneMinusT * a[4] + t * b[4],
    oneMinusT * a[5] + t * b[5],
    oneMinusT * a[6] + t * b[6],
    oneMinusT * a[7] + t * b[7],
  ];
}

/** Extract vector components (x, y, z) */
export function asVector(mv: GA3): [number, number, number] {
  return [mv[GA3_E1], mv[GA3_E2], mv[GA3_E3]];
}

/** Extract bivector components (xy, xz, yz) */
export function asBivector(mv: GA3): [number, number, number] {
  return [mv[GA3_E12], mv[GA3_E13], mv[GA3_E23]];
}

/** Check if two multivectors are approximately equal */
export function equals(a: GA3, b: GA3, epsilon: number = 1e-10): boolean {
  for (let i = 0; i < 8; i++) {
    if (Math.abs(a[i] - b[i]) > epsilon) {
      return false;
    }
  }
  return true;
}
