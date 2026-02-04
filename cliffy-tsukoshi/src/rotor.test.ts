/**
 * Tests for Rotor (rotation) operations.
 */

import { describe, it, expect } from 'vitest';
import { Rotor } from './rotor.js';
import { vector, asVector, magnitude } from './ga3.js';

describe('Rotor Construction', () => {
  it('creates identity rotor', () => {
    const r = Rotor.identity();
    expect(r.magnitude()).toBeCloseTo(1);
    expect(r.angle()).toBeCloseTo(0);
  });

  it('creates XY rotation (around Z)', () => {
    const r = Rotor.xy(Math.PI / 2);
    expect(r.magnitude()).toBeCloseTo(1);
    expect(r.angle()).toBeCloseTo(Math.PI / 2);
  });

  it('creates rotation from axis-angle', () => {
    // Rotation around Z axis
    const r = Rotor.fromAxisAngle(0, 0, 1, Math.PI / 2);
    expect(r.magnitude()).toBeCloseTo(1);
    expect(r.angle()).toBeCloseTo(Math.PI / 2);
  });
});

describe('Rotor Transformation', () => {
  it('identity rotor leaves vector unchanged', () => {
    const r = Rotor.identity();
    const v = vector(1, 0, 0);
    const result = r.transform(v);
    const [x, y, z] = asVector(result);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  it('90 degree XY rotation rotates X to Y', () => {
    const r = Rotor.xy(Math.PI / 2);
    const v = vector(1, 0, 0);
    const result = r.transform(v);
    const [x, y, z] = asVector(result);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
  });

  it('180 degree XY rotation rotates X to -X', () => {
    const r = Rotor.xy(Math.PI);
    const v = vector(1, 0, 0);
    const result = r.transform(v);
    const [x, y, z] = asVector(result);
    expect(x).toBeCloseTo(-1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  it('rotation preserves magnitude', () => {
    const r = Rotor.xy(Math.PI / 3);
    const v = vector(3, 4, 0);
    const originalMag = magnitude(v);
    const result = r.transform(v);
    const resultMag = magnitude(result);
    expect(resultMag).toBeCloseTo(originalMag);
  });
});

describe('Rotor Composition', () => {
  it('composing with identity returns same rotation', () => {
    const r = Rotor.xy(Math.PI / 4);
    const composed = r.then(Rotor.identity());
    expect(composed.angle()).toBeCloseTo(r.angle());
  });

  it('two 90 degree rotations equal 180 degrees', () => {
    const r1 = Rotor.xy(Math.PI / 2);
    const r2 = Rotor.xy(Math.PI / 2);
    const composed = r1.then(r2);
    expect(composed.angle()).toBeCloseTo(Math.PI);
  });

  it('composing with inverse gives identity', () => {
    const r = Rotor.xy(Math.PI / 4);
    const composed = r.then(r.inverse());
    expect(composed.angle()).toBeCloseTo(0, 5);
  });
});

describe('Rotor SLERP', () => {
  it('slerp(0) returns identity', () => {
    const r = Rotor.xy(Math.PI / 2);
    const interp = r.slerp(0);
    expect(interp.angle()).toBeCloseTo(0);
  });

  it('slerp(1) returns original rotor', () => {
    const r = Rotor.xy(Math.PI / 2);
    const interp = r.slerp(1);
    expect(interp.angle()).toBeCloseTo(Math.PI / 2);
  });

  it('slerp(0.5) returns half rotation', () => {
    const r = Rotor.xy(Math.PI);
    const interp = r.slerp(0.5);
    expect(interp.angle()).toBeCloseTo(Math.PI / 2);
  });

  it('slerpTo interpolates between two rotors', () => {
    const r1 = Rotor.xy(0);
    const r2 = Rotor.xy(Math.PI);
    const interp = r1.slerpTo(r2, 0.5);
    expect(interp.angle()).toBeCloseTo(Math.PI / 2);
  });
});

describe('Rotor Properties', () => {
  it('unit rotor has magnitude 1', () => {
    const r = Rotor.xy(Math.PI / 3);
    expect(r.magnitude()).toBeCloseTo(1);
  });

  it('normalize ensures unit magnitude', () => {
    const r = Rotor.xy(Math.PI / 3).normalize();
    expect(r.magnitude()).toBeCloseTo(1);
  });

  it('bivector components match rotation plane', () => {
    const r = Rotor.xy(Math.PI / 2);
    const [xy, xz, yz] = r.bivector();
    // XY rotation should have non-zero xy component
    expect(Math.abs(xy)).toBeGreaterThan(0.1);
    expect(Math.abs(xz)).toBeLessThan(0.01);
    expect(Math.abs(yz)).toBeLessThan(0.01);
  });
});
