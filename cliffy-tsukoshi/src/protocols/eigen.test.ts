/**
 * Eigen-side parity pins — the bits the Rust oracle
 * (cliffy-protocols/src/eigen.rs) asserts, asserted here through the port.
 */
import { describe, it, expect } from 'vitest';
import { jacobiEigen4, dominantEigenvalueIndex } from './eigen.js';

describe('jacobiEigen4 (Rust-pinned bits)', () => {
  it('subnormal off-diagonal is skipped (2^-1074 < 2^-1022 = f64::MIN_POSITIVE)', () => {
    // Review round 1 (PR #342) regression oracle: Number.MIN_VALUE is
    // 2^-1074 (smallest SUBNORMAL); the Rust skip floor is 2^-1022. With
    // the wrong constant the port rotated this pair where Rust skips it.
    const s = 2 ** -1074;
    const m = [
      [2, s, 0, 0],
      [s, 2, 0, 0],
      [0, 0, 5, 1],
      [0, 0, 1, 5],
    ];
    const [vals, vecs] = jacobiEigen4(m);
    // Exact bits, identical to eigen.rs::subnormal_off_diagonal_is_skipped.
    expect(vals[0]).toBe(2);
    expect(vals[1]).toBe(2);
    expect(vals[2]).toBe(3.999999999999999);
    expect(vals[3]).toBe(5.999999999999999);
    expect(vecs[0]).toEqual([1, 0, 0, 0]);
    expect(vecs[1]).toEqual([0, 1, 0, 0]);
    expect(vecs[2][2]).toBe(0.7071067811865475);
    expect(vecs[2][3]).toBe(0.7071067811865475);
    expect(vecs[3][2]).toBe(-0.7071067811865475);
    expect(vecs[3][3]).toBe(0.7071067811865475);
    expect(dominantEigenvalueIndex(vals)).toBe(3);
  });
});
