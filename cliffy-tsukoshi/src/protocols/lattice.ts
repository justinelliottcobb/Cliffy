/**
 * Lattice-based conflict resolution using geometric algebra.
 *
 * Join-semilattice operations enable coordination-free conflict resolution
 * in distributed systems with guaranteed convergence.
 *
 * Key Properties:
 * - Idempotent: a ⊔ a = a
 * - Commutative: a ⊔ b = b ⊔ a
 * - Associative: (a ⊔ b) ⊔ c = a ⊔ (b ⊔ c)
 *
 * @example
 * ```typescript
 * import { GA3Lattice } from 'cliffy-tsukoshi/protocols';
 *
 * const stateA = GA3Lattice.fromScalar(1);
 * const stateB = GA3Lattice.fromScalar(2);
 *
 * // Join always produces consistent result
 * const joined = stateA.join(stateB);
 * console.log(joined.dominates(stateA)); // true
 * console.log(joined.dominates(stateB)); // true
 * ```
 */

import type { GA3 } from '../ga3.js';
import {
  zero,
  scalar,
  vector,
  fromCoefficients,
  magnitude,
  sub,
  clone,
} from '../ga3.js';
import { geometricMean } from './crdt.js';

const EPSILON = 1e-10;

/**
 * Interface for geometric lattice operations.
 */
export interface GeometricLattice<T> {
  /** Lattice join (least upper bound) - always converges */
  join(other: T): T;

  /** Check if this state dominates (is >= to) another */
  dominates(other: T): boolean;

  /** Compute the geometric distance/divergence from another state */
  divergence(other: T): number;

  /** Check if two states are equal in the lattice ordering */
  latticeEq(other: T): boolean;

  /** Compute the lattice meet (greatest lower bound) if it exists */
  meet(other: T): T | null;
}

/**
 * A wrapper around GA3 that implements GeometricLattice.
 *
 * Provides lattice operations where:
 * - Join uses geometric mean for equal-magnitude states
 * - Dominance is based on magnitude ordering
 * - Divergence is the geometric distance
 */
export class GA3Lattice implements GeometricLattice<GA3Lattice> {
  private inner: GA3;

  constructor(mv: GA3) {
    this.inner = mv;
  }

  /** Create a lattice element from a scalar. */
  static fromScalar(value: number): GA3Lattice {
    return new GA3Lattice(scalar(value));
  }

  /** Create a lattice element from vector components. */
  static fromVector(x: number, y: number, z: number): GA3Lattice {
    return new GA3Lattice(vector(x, y, z));
  }

  /** Create the zero element (bottom of the lattice). */
  static zero(): GA3Lattice {
    return new GA3Lattice(zero());
  }

  /** Get the underlying multivector. */
  asMultivector(): GA3 {
    return this.inner;
  }

  /** Get the magnitude of this lattice element. */
  magnitude(): number {
    return magnitude(this.inner);
  }

  /** Get a coefficient at the given index. */
  get(index: number): number {
    return (this.inner as number[])[index];
  }

  /** Create a copy of this lattice element. */
  clone(): GA3Lattice {
    return new GA3Lattice(clone(this.inner));
  }

  /** Lattice join (least upper bound). */
  join(other: GA3Lattice): GA3Lattice {
    // Check for structural equality first (idempotence optimization)
    if (this.divergence(other) < EPSILON) {
      return this.clone();
    }

    const selfMag = magnitude(this.inner);
    const otherMag = magnitude(other.inner);

    // Dominance by magnitude
    if (selfMag > otherMag + EPSILON) {
      return this.clone();
    } else if (otherMag > selfMag + EPSILON) {
      return other.clone();
    } else {
      // Equal magnitudes but different states - use geometric mean
      return new GA3Lattice(geometricMean([this.inner, other.inner]));
    }
  }

  /** Check if this state dominates another. */
  dominates(other: GA3Lattice): boolean {
    return magnitude(this.inner) >= magnitude(other.inner) - EPSILON;
  }

  /** Compute the divergence (geometric distance) from another state. */
  divergence(other: GA3Lattice): number {
    return magnitude(sub(this.inner, other.inner));
  }

  /** Check if two states are equal in the lattice ordering. */
  latticeEq(other: GA3Lattice): boolean {
    return this.dominates(other) && other.dominates(this);
  }

  /** Compute the lattice meet (greatest lower bound). */
  meet(other: GA3Lattice): GA3Lattice | null {
    const selfMag = magnitude(this.inner);
    const otherMag = magnitude(other.inner);

    // Meet is the element with smaller magnitude
    if (selfMag < otherMag + EPSILON) {
      return this.clone();
    } else if (otherMag < selfMag + EPSILON) {
      return other.clone();
    } else {
      // Equal magnitudes - meet exists and equals both
      return this.clone();
    }
  }

  /** Serialize to JSON. */
  toJSON(): number[] {
    return this.inner as number[];
  }

  /** Deserialize from JSON. */
  static fromJSON(data: number[]): GA3Lattice {
    return new GA3Lattice(fromCoefficients(data));
  }
}

/**
 * Component-wise lattice operations for multivectors.
 *
 * Unlike GA3Lattice which uses magnitude ordering, this provides
 * coefficient-by-coefficient join/meet operations.
 */
export class ComponentLattice implements GeometricLattice<ComponentLattice> {
  private inner: GA3;

  constructor(mv: GA3) {
    this.inner = mv;
  }

  /** Create from a scalar value. */
  static fromScalar(value: number): ComponentLattice {
    return new ComponentLattice(scalar(value));
  }

  /** Get the underlying multivector. */
  asMultivector(): GA3 {
    return this.inner;
  }

  /** Create a copy. */
  clone(): ComponentLattice {
    return new ComponentLattice(clone(this.inner));
  }

  /** Component-wise maximum (join). */
  join(other: ComponentLattice): ComponentLattice {
    const selfCoeffs = this.inner as number[];
    const otherCoeffs = other.inner as number[];
    const result = selfCoeffs.map((c, i) => Math.max(c, otherCoeffs[i]));
    return new ComponentLattice(fromCoefficients(result));
  }

  /** Dominates if every component is >= the corresponding component. */
  dominates(other: ComponentLattice): boolean {
    const selfCoeffs = this.inner as number[];
    const otherCoeffs = other.inner as number[];
    return selfCoeffs.every((c, i) => c >= otherCoeffs[i] - EPSILON);
  }

  /** L-infinity norm (max component difference). */
  divergence(other: ComponentLattice): number {
    const selfCoeffs = this.inner as number[];
    const otherCoeffs = other.inner as number[];
    return Math.max(...selfCoeffs.map((c, i) => Math.abs(c - otherCoeffs[i])));
  }

  /** Check if two states are equal in the lattice ordering. */
  latticeEq(other: ComponentLattice): boolean {
    return this.dominates(other) && other.dominates(this);
  }

  /** Component-wise minimum (meet). */
  meet(other: ComponentLattice): ComponentLattice {
    const selfCoeffs = this.inner as number[];
    const otherCoeffs = other.inner as number[];
    const result = selfCoeffs.map((c, i) => Math.min(c, otherCoeffs[i]));
    return new ComponentLattice(fromCoefficients(result));
  }

  /** Serialize to JSON. */
  toJSON(): number[] {
    return this.inner as number[];
  }

  /** Deserialize from JSON. */
  static fromJSON(data: number[]): ComponentLattice {
    return new ComponentLattice(fromCoefficients(data));
  }
}

/**
 * Compute component-wise lattice join of two multivectors.
 */
export function latticeJoin(a: GA3, b: GA3): GA3 {
  const aCoeffs = a as number[];
  const bCoeffs = b as number[];
  return fromCoefficients(aCoeffs.map((c, i) => Math.max(c, bCoeffs[i])));
}

/**
 * Compute component-wise lattice meet of two multivectors.
 */
export function latticeMeet(a: GA3, b: GA3): GA3 {
  const aCoeffs = a as number[];
  const bCoeffs = b as number[];
  return fromCoefficients(aCoeffs.map((c, i) => Math.min(c, bCoeffs[i])));
}
