/**
 * Tests for GA3 multivector operations.
 */

import { describe, it, expect } from 'vitest';
import {
  zero,
  scalar,
  vector,
  bivector,
  add,
  sub,
  scale,
  geometricProduct,
  reverse,
  magnitude,
  normalize,
  sandwich,
  lerp,
  asVector,
  asBivector,
  equals,
  GA3,
} from './ga3.js';

describe('GA3 Constructors', () => {
  it('creates zero multivector', () => {
    const z = zero();
    expect(z).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('creates scalar multivector', () => {
    const s = scalar(5);
    expect(s[0]).toBe(5);
    expect(s.slice(1)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('creates vector multivector', () => {
    const v = vector(1, 2, 3);
    expect(v[0]).toBe(0); // scalar
    expect(v[1]).toBe(1); // e1 (x)
    expect(v[2]).toBe(2); // e2 (y)
    expect(v[4]).toBe(3); // e3 (z)
  });

  it('creates bivector multivector', () => {
    const b = bivector(1, 2, 3);
    expect(b[3]).toBe(1); // e12 (xy)
    expect(b[5]).toBe(2); // e13 (xz)
    expect(b[6]).toBe(3); // e23 (yz)
  });
});

describe('GA3 Basic Operations', () => {
  it('adds two multivectors', () => {
    const a = vector(1, 2, 3);
    const b = vector(4, 5, 6);
    const result = add(a, b);
    expect(asVector(result)).toEqual([5, 7, 9]);
  });

  it('subtracts two multivectors', () => {
    const a = vector(5, 7, 9);
    const b = vector(1, 2, 3);
    const result = sub(a, b);
    expect(asVector(result)).toEqual([4, 5, 6]);
  });

  it('scales a multivector', () => {
    const v = vector(1, 2, 3);
    const result = scale(v, 2);
    expect(asVector(result)).toEqual([2, 4, 6]);
  });
});

describe('GA3 Geometric Product', () => {
  it('multiplies two scalars', () => {
    const a = scalar(2);
    const b = scalar(3);
    const result = geometricProduct(a, b);
    expect(result[0]).toBeCloseTo(6);
  });

  it('multiplies scalar and vector', () => {
    const s = scalar(2);
    const v = vector(1, 2, 3);
    const result = geometricProduct(s, v);
    expect(asVector(result)).toEqual([2, 4, 6]);
  });

  it('multiplies two parallel vectors (produces scalar)', () => {
    const v1 = vector(1, 0, 0);
    const v2 = vector(1, 0, 0);
    const result = geometricProduct(v1, v2);
    // e1 * e1 = 1
    expect(result[0]).toBeCloseTo(1);
  });

  it('multiplies two perpendicular vectors (produces bivector)', () => {
    const v1 = vector(1, 0, 0);
    const v2 = vector(0, 1, 0);
    const result = geometricProduct(v1, v2);
    // e1 * e2 = e12
    expect(result[3]).toBeCloseTo(1); // e12 component
  });
});

describe('GA3 Reverse', () => {
  it('reverses a vector (unchanged)', () => {
    const v = vector(1, 2, 3);
    const rev = reverse(v);
    expect(asVector(rev)).toEqual([1, 2, 3]);
  });

  it('reverses a bivector (sign flip)', () => {
    const b = bivector(1, 2, 3);
    const rev = reverse(b);
    expect(asBivector(rev)).toEqual([-1, -2, -3]);
  });

  it('reverses a scalar (unchanged)', () => {
    const s = scalar(5);
    const rev = reverse(s);
    expect(rev[0]).toBe(5);
  });
});

describe('GA3 Magnitude and Normalize', () => {
  it('computes magnitude of a vector', () => {
    const v = vector(3, 4, 0);
    expect(magnitude(v)).toBeCloseTo(5);
  });

  it('normalizes a vector', () => {
    const v = vector(3, 4, 0);
    const norm = normalize(v);
    expect(norm).not.toBeNull();
    expect(magnitude(norm!)).toBeCloseTo(1);
    expect(asVector(norm!)[0]).toBeCloseTo(0.6);
    expect(asVector(norm!)[1]).toBeCloseTo(0.8);
  });

  it('returns null for zero vector', () => {
    const z = zero();
    expect(normalize(z)).toBeNull();
  });
});

describe('GA3 Interpolation', () => {
  it('lerp at t=0 returns first value', () => {
    const a = vector(0, 0, 0);
    const b = vector(10, 10, 10);
    const result = lerp(a, b, 0);
    expect(asVector(result)).toEqual([0, 0, 0]);
  });

  it('lerp at t=1 returns second value', () => {
    const a = vector(0, 0, 0);
    const b = vector(10, 10, 10);
    const result = lerp(a, b, 1);
    expect(asVector(result)).toEqual([10, 10, 10]);
  });

  it('lerp at t=0.5 returns midpoint', () => {
    const a = vector(0, 0, 0);
    const b = vector(10, 10, 10);
    const result = lerp(a, b, 0.5);
    expect(asVector(result)).toEqual([5, 5, 5]);
  });
});

describe('GA3 Sandwich Product', () => {
  it('identity rotor leaves vector unchanged', () => {
    const identity = scalar(1);
    const v = vector(1, 2, 3);
    const result = sandwich(identity, v);
    const [x, y, z] = asVector(result);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(2);
    expect(z).toBeCloseTo(3);
  });
});

describe('GA3 Equality', () => {
  it('equal vectors are equal', () => {
    const a = vector(1, 2, 3);
    const b = vector(1, 2, 3);
    expect(equals(a, b)).toBe(true);
  });

  it('different vectors are not equal', () => {
    const a = vector(1, 2, 3);
    const b = vector(1, 2, 4);
    expect(equals(a, b)).toBe(false);
  });

  it('respects epsilon for floating point', () => {
    const a = vector(1, 2, 3);
    const b = vector(1.0000001, 2, 3);
    expect(equals(a, b, 1e-6)).toBe(true);
    expect(equals(a, b, 1e-8)).toBe(false);
  });
});
