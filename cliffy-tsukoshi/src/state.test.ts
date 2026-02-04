/**
 * Tests for GeometricState and ReactiveState.
 */

import { describe, it, expect, vi } from 'vitest';
import { GeometricState, ReactiveState, reactiveState } from './state.js';
import { Rotor } from './rotor.js';
import { Transform, translation } from './transform.js';

describe('GeometricState Construction', () => {
  it('creates from scalar', () => {
    const s = GeometricState.fromScalar(42);
    expect(s.asScalar()).toBe(42);
  });

  it('creates from 3D vector', () => {
    const v = GeometricState.fromVector(1, 2, 3);
    expect(v.asVector()).toEqual([1, 2, 3]);
  });

  it('creates from 2D vector', () => {
    const v = GeometricState.fromVector2D(5, 10);
    expect(v.asVector2D()).toEqual([5, 10]);
    expect(v.asVector()).toEqual([5, 10, 0]);
  });

  it('creates zero state', () => {
    const z = GeometricState.zero();
    expect(z.magnitude()).toBe(0);
  });
});

describe('GeometricState Operations', () => {
  it('adds two states', () => {
    const a = GeometricState.fromVector(1, 2, 3);
    const b = GeometricState.fromVector(4, 5, 6);
    const result = a.add(b);
    expect(result.asVector()).toEqual([5, 7, 9]);
  });

  it('subtracts two states', () => {
    const a = GeometricState.fromVector(5, 7, 9);
    const b = GeometricState.fromVector(1, 2, 3);
    const result = a.sub(b);
    expect(result.asVector()).toEqual([4, 5, 6]);
  });

  it('scales a state', () => {
    const v = GeometricState.fromVector(1, 2, 3);
    const result = v.scale(2);
    expect(result.asVector()).toEqual([2, 4, 6]);
  });

  it('normalizes a state', () => {
    const v = GeometricState.fromVector(3, 4, 0);
    const norm = v.normalize();
    expect(norm).not.toBeNull();
    expect(norm!.magnitude()).toBeCloseTo(1);
  });

  it('computes distance between states', () => {
    const a = GeometricState.fromVector(0, 0, 0);
    const b = GeometricState.fromVector(3, 4, 0);
    expect(a.distance(b)).toBeCloseTo(5);
  });
});

describe('GeometricState Interpolation (blend)', () => {
  it('blend at t=0 returns original', () => {
    const a = GeometricState.fromVector(0, 0, 0);
    const b = GeometricState.fromVector(10, 10, 10);
    const result = a.blend(b, 0);
    expect(result.asVector()).toEqual([0, 0, 0]);
  });

  it('blend at t=1 returns target', () => {
    const a = GeometricState.fromVector(0, 0, 0);
    const b = GeometricState.fromVector(10, 10, 10);
    const result = a.blend(b, 1);
    expect(result.asVector()).toEqual([10, 10, 10]);
  });

  it('blend at t=0.5 returns midpoint', () => {
    const a = GeometricState.fromVector(0, 0, 0);
    const b = GeometricState.fromVector(10, 10, 10);
    const result = a.blend(b, 0.5);
    expect(result.asVector()).toEqual([5, 5, 5]);
  });

  it('repeated blend converges to target', () => {
    let current = GeometricState.fromVector(0, 0, 0);
    const target = GeometricState.fromVector(100, 100, 100);

    // Simulate game loop smoothing
    for (let i = 0; i < 100; i++) {
      current = current.blend(target, 0.1);
    }

    const [x, y, z] = current.asVector();
    expect(x).toBeCloseTo(100, 0);
    expect(y).toBeCloseTo(100, 0);
    expect(z).toBeCloseTo(100, 0);
  });
});

describe('GeometricState Transformations', () => {
  it('applies rotor rotation', () => {
    const v = GeometricState.fromVector(1, 0, 0);
    const r = Rotor.xy(Math.PI / 2);
    const result = v.applyRotor(r);
    const [x, y, z] = result.asVector();
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
  });

  it('applies translation', () => {
    const v = GeometricState.fromVector(1, 2, 3);
    const result = v.applyTranslation(translation(10, 20, 30));
    expect(result.asVector()).toEqual([11, 22, 33]);
  });

  it('applies full transform', () => {
    const v = GeometricState.fromVector(1, 0, 0);
    const t = Transform.new(Rotor.xy(Math.PI / 2), translation(0, 10, 0));
    const result = v.applyTransform(t);
    const [x, y, z] = result.asVector();
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(11); // rotated to (0,1,0) + translated (0,10,0)
    expect(z).toBeCloseTo(0);
  });
});

describe('GeometricState Subscriptions', () => {
  it('can subscribe and unsubscribe', () => {
    const state = GeometricState.fromScalar(0);
    const callback = vi.fn();

    const sub = state.subscribe(callback);
    expect(state.subscriberCount()).toBe(1);

    sub.unsubscribe();
    expect(state.subscriberCount()).toBe(0);
  });
});

describe('ReactiveState', () => {
  it('holds and updates state', () => {
    const reactive = reactiveState(GeometricState.fromVector(0, 0, 0));
    expect(reactive.current.asVector()).toEqual([0, 0, 0]);

    reactive.set(GeometricState.fromVector(1, 2, 3));
    expect(reactive.current.asVector()).toEqual([1, 2, 3]);
  });

  it('notifies subscribers on change', () => {
    const reactive = reactiveState(GeometricState.fromVector(0, 0, 0));
    const callback = vi.fn();

    reactive.subscribe(callback);
    expect(callback).toHaveBeenCalledTimes(1); // Called immediately

    reactive.set(GeometricState.fromVector(1, 2, 3));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('blendTo smoothly updates', () => {
    const reactive = reactiveState(GeometricState.fromVector(0, 0, 0));
    const target = GeometricState.fromVector(10, 10, 10);

    reactive.blendTo(target, 0.5);

    expect(reactive.current.asVector()).toEqual([5, 5, 5]);
  });

  it('update transforms current state', () => {
    const reactive = reactiveState(GeometricState.fromVector(1, 2, 3));

    reactive.update(s => s.scale(2));

    expect(reactive.current.asVector()).toEqual([2, 4, 6]);
  });
});

describe('GeometricState Immutability', () => {
  it('operations return new instances', () => {
    const original = GeometricState.fromVector(1, 2, 3);
    const scaled = original.scale(2);

    expect(original.asVector()).toEqual([1, 2, 3]); // Unchanged
    expect(scaled.asVector()).toEqual([2, 4, 6]);
    expect(original).not.toBe(scaled);
  });

  it('clone creates independent copy', () => {
    const original = GeometricState.fromVector(1, 2, 3);
    const cloned = original.clone();

    expect(cloned.asVector()).toEqual(original.asVector());
    expect(cloned).not.toBe(original);
  });
});
