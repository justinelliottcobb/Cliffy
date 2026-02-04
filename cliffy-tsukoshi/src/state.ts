/**
 * GeometricState - Reactive geometric state container.
 *
 * This is the primary user-facing class in cliffy-tsukoshi.
 * It wraps a GA3 multivector and provides:
 *
 * - Vector/scalar state storage
 * - .blend() for smooth interpolation (LERP/SLERP)
 * - Rotation and transformation application
 * - Reactive subscriptions
 */

import {
  GA3,
  zero,
  scalar,
  vector,
  bivector,
  clone,
  add,
  sub,
  scale,
  magnitude,
  normalize,
  lerp,
  geometricProduct,
  reverse,
  asVector as ga3AsVector,
  asBivector as ga3AsBivector,
  equals as ga3Equals,
} from './ga3.js';
import { Rotor } from './rotor.js';
import { Transform, Translation, translationToVector } from './transform.js';

/** Subscription callback type */
export type StateSubscriber = (state: GeometricState) => void;

/** Subscription handle for unsubscribing */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * GeometricState - The main state container.
 *
 * Stores values as GA3 multivectors internally, providing
 * smooth interpolation and geometric transformations.
 */
export class GeometricState {
  /** Internal GA3 representation */
  private mv: GA3;

  /** Subscribers for reactive updates */
  private subscribers: Set<StateSubscriber> = new Set();

  private constructor(mv: GA3) {
    this.mv = mv;
  }

  // ==========================================================================
  // Constructors
  // ==========================================================================

  /**
   * Create a state from a scalar value.
   */
  static fromScalar(value: number): GeometricState {
    return new GeometricState(scalar(value));
  }

  /**
   * Create a state from a 3D vector (position).
   */
  static fromVector(x: number, y: number, z: number): GeometricState {
    return new GeometricState(vector(x, y, z));
  }

  /**
   * Create a state from a 2D vector (z = 0).
   */
  static fromVector2D(x: number, y: number): GeometricState {
    return new GeometricState(vector(x, y, 0));
  }

  /**
   * Create a state from a bivector (rotation plane).
   */
  static fromBivector(xy: number, xz: number, yz: number): GeometricState {
    return new GeometricState(bivector(xy, xz, yz));
  }

  /**
   * Create a state from raw GA3 coefficients.
   */
  static fromCoefficients(coeffs: number[]): GeometricState {
    const mv: GA3 = [
      coeffs[0] ?? 0,
      coeffs[1] ?? 0,
      coeffs[2] ?? 0,
      coeffs[3] ?? 0,
      coeffs[4] ?? 0,
      coeffs[5] ?? 0,
      coeffs[6] ?? 0,
      coeffs[7] ?? 0,
    ];
    return new GeometricState(mv);
  }

  /**
   * Create a state from an existing GA3 multivector.
   */
  static fromMultivector(mv: GA3): GeometricState {
    return new GeometricState(clone(mv));
  }

  /**
   * Create a zero state.
   */
  static zero(): GeometricState {
    return new GeometricState(zero());
  }

  // ==========================================================================
  // Value Access
  // ==========================================================================

  /**
   * Get the internal GA3 multivector (cloned).
   */
  toMultivector(): GA3 {
    return clone(this.mv);
  }

  /**
   * Get a specific coefficient by index.
   */
  get(index: number): number {
    if (index < 0 || index >= 8) {
      throw new Error(`Invalid GA3 index: ${index}`);
    }
    return this.mv[index];
  }

  /**
   * Get the scalar component (coefficient 0).
   */
  asScalar(): number {
    return this.mv[0];
  }

  /**
   * Get the vector components as [x, y, z].
   */
  asVector(): [number, number, number] {
    return ga3AsVector(this.mv);
  }

  /**
   * Get the vector components as {x, y, z} object.
   */
  asVectorObject(): { x: number; y: number; z: number } {
    const [x, y, z] = this.asVector();
    return { x, y, z };
  }

  /**
   * Get the 2D vector components as [x, y].
   */
  asVector2D(): [number, number] {
    return [this.mv[1], this.mv[2]];
  }

  /**
   * Get the bivector components as [xy, xz, yz].
   */
  asBivector(): [number, number, number] {
    return ga3AsBivector(this.mv);
  }

  /**
   * Get the magnitude (Euclidean norm).
   */
  magnitude(): number {
    return magnitude(this.mv);
  }

  // ==========================================================================
  // Mutations (return new state)
  // ==========================================================================

  /**
   * Set to a new GA3 value.
   * Returns a new GeometricState.
   */
  set(mv: GA3): GeometricState {
    return new GeometricState(clone(mv));
  }

  /**
   * Update via a transformation function.
   * Returns a new GeometricState.
   */
  update(fn: (mv: GA3) => GA3): GeometricState {
    return new GeometricState(fn(clone(this.mv)));
  }

  /**
   * Add another state.
   */
  add(other: GeometricState): GeometricState {
    return new GeometricState(add(this.mv, other.mv));
  }

  /**
   * Subtract another state.
   */
  sub(other: GeometricState): GeometricState {
    return new GeometricState(sub(this.mv, other.mv));
  }

  /**
   * Scale by a factor.
   */
  scale(factor: number): GeometricState {
    return new GeometricState(scale(this.mv, factor));
  }

  /**
   * Normalize to unit magnitude.
   * Returns null if magnitude is too small.
   */
  normalize(): GeometricState | null {
    const normalized = normalize(this.mv);
    if (normalized === null) {
      return null;
    }
    return new GeometricState(normalized);
  }

  /**
   * Compute the reverse (grade reversion).
   */
  reverse(): GeometricState {
    return new GeometricState(reverse(this.mv));
  }

  /**
   * Compute the geometric product with another state.
   */
  geometricProduct(other: GeometricState): GeometricState {
    return new GeometricState(geometricProduct(this.mv, other.mv));
  }

  // ==========================================================================
  // Transformations
  // ==========================================================================

  /**
   * Apply a rotor (rotation).
   * Uses the sandwich product: R * v * R†
   */
  applyRotor(rotor: Rotor): GeometricState {
    return new GeometricState(rotor.transform(this.mv));
  }

  /**
   * Apply a translation (vector addition).
   */
  applyTranslation(trans: Translation): GeometricState {
    const transVec = translationToVector(trans);
    return new GeometricState(add(this.mv, transVec));
  }

  /**
   * Apply a full transform (rotation + translation).
   */
  applyTransform(transform: Transform): GeometricState {
    return new GeometricState(transform.apply(this.mv));
  }

  // ==========================================================================
  // Interpolation
  // ==========================================================================

  /**
   * Linear interpolation to another state.
   *
   * This is the primary smoothing function for positions.
   * blend(target, t) moves t% of the way toward target.
   *
   * Common usage: position = position.blend(targetPosition, 0.1)
   *
   * @param target - Target state to interpolate toward
   * @param t - Interpolation factor [0, 1] (0.1 = 10% toward target)
   */
  lerp(target: GeometricState, t: number): GeometricState {
    return new GeometricState(lerp(this.mv, target.mv, t));
  }

  /**
   * Blend toward another state.
   *
   * This is an alias for lerp(), providing a more intuitive name
   * for smooth state transitions.
   *
   * @param target - Target state to blend toward
   * @param t - Blend factor [0, 1]
   */
  blend(target: GeometricState, t: number): GeometricState {
    return this.lerp(target, t);
  }

  /**
   * Compute distance to another state.
   */
  distance(other: GeometricState): number {
    const diff = sub(this.mv, other.mv);
    return magnitude(diff);
  }

  // ==========================================================================
  // Reactive Subscriptions
  // ==========================================================================

  /**
   * Subscribe to state changes.
   *
   * Note: Since GeometricState is immutable, subscriptions are
   * typically used with a mutable wrapper or state manager.
   *
   * Returns a Subscription object with an unsubscribe() method.
   */
  subscribe(callback: StateSubscriber): Subscription {
    this.subscribers.add(callback);

    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);
      },
    };
  }

  /**
   * Notify all subscribers of a state change.
   *
   * Call this after creating a new state that represents
   * an update to the previous state.
   */
  notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this);
    }
  }

  /**
   * Get the number of subscribers.
   */
  subscriberCount(): number {
    return this.subscribers.size;
  }

  // ==========================================================================
  // Comparison
  // ==========================================================================

  /**
   * Check if approximately equal to another state.
   */
  equals(other: GeometricState, epsilon: number = 1e-10): boolean {
    return ga3Equals(this.mv, other.mv, epsilon);
  }

  /**
   * Clone this state.
   */
  clone(): GeometricState {
    return new GeometricState(clone(this.mv));
  }
}

// ==========================================================================
// Reactive State Holder
// ==========================================================================

/**
 * ReactiveState - A mutable container for GeometricState with subscriptions.
 *
 * Use this when you need mutable state with reactive updates.
 */
export class ReactiveState {
  private _current: GeometricState;
  private subscribers: Set<StateSubscriber> = new Set();

  constructor(initial: GeometricState) {
    this._current = initial;
  }

  /**
   * Get the current state.
   */
  get current(): GeometricState {
    return this._current;
  }

  /**
   * Set a new state and notify subscribers.
   */
  set(state: GeometricState): void {
    this._current = state;
    this.notifySubscribers();
  }

  /**
   * Update the state via a transformation function.
   */
  update(fn: (state: GeometricState) => GeometricState): void {
    this._current = fn(this._current);
    this.notifySubscribers();
  }

  /**
   * Blend toward a target state.
   */
  blendTo(target: GeometricState, t: number): void {
    this._current = this._current.blend(target, t);
    this.notifySubscribers();
  }

  /**
   * Subscribe to state changes.
   */
  subscribe(callback: StateSubscriber): Subscription {
    this.subscribers.add(callback);

    // Call immediately with current state
    callback(this._current);

    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);
      },
    };
  }

  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this._current);
    }
  }
}

/**
 * Create a reactive state container.
 */
export function reactiveState(initial: GeometricState): ReactiveState {
  return new ReactiveState(initial);
}
