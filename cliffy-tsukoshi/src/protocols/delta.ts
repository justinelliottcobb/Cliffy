/**
 * State delta computation for efficient synchronization.
 *
 * Deltas represent minimal transformations between states,
 * enabling bandwidth-efficient sync in distributed systems.
 *
 * @example
 * ```typescript
 * import { computeDelta, applyAdditiveDelta } from 'cliffy-tsukoshi/protocols';
 * import { scalar } from 'cliffy-tsukoshi';
 *
 * const from = scalar(1);
 * const to = scalar(5);
 *
 * // Compute the delta between states
 * const delta = computeDelta(from, to);
 *
 * // Apply delta to reconstruct target state
 * let state = { ...from };
 * state = applyAdditiveDelta(state, delta);
 * ```
 */

import type { GA3 } from '../ga3.js';
import {
  add,
  sub,
  zero,
  scalar,
  magnitude,
  geometricProduct,
  reverse,
  fromCoefficients,
} from '../ga3.js';
import { VectorClock } from './vector-clock.js';

/**
 * How the delta is encoded.
 */
export enum DeltaEncoding {
  /** Simple additive delta: result = state + delta */
  Additive = 'additive',
  /** Multiplicative (sandwich) delta: result = delta * state * reverse(delta) */
  Multiplicative = 'multiplicative',
  /** Compressed log-space: result = exp(delta) * state */
  Compressed = 'compressed',
}

/**
 * A state delta representing the transformation between two states.
 */
export interface StateDelta {
  /** The delta transformation */
  transform: GA3;
  /** Type of delta encoding */
  encoding: DeltaEncoding;
  /** Source state clock (for causal ordering) */
  fromClock: VectorClock;
  /** Target state clock */
  toClock: VectorClock;
  /** Node that computed this delta */
  sourceNode: string;
}

/**
 * Create a new additive delta.
 */
export function additiveDelta(
  transform: GA3,
  fromClock: VectorClock,
  toClock: VectorClock,
  sourceNode: string
): StateDelta {
  return {
    transform,
    encoding: DeltaEncoding.Additive,
    fromClock,
    toClock,
    sourceNode,
  };
}

/**
 * Create a new multiplicative (versor) delta.
 */
export function multiplicativeDelta(
  transform: GA3,
  fromClock: VectorClock,
  toClock: VectorClock,
  sourceNode: string
): StateDelta {
  return {
    transform,
    encoding: DeltaEncoding.Multiplicative,
    fromClock,
    toClock,
    sourceNode,
  };
}

/**
 * Create a compressed (log-space) delta.
 */
export function compressedDelta(
  transform: GA3,
  fromClock: VectorClock,
  toClock: VectorClock,
  sourceNode: string
): StateDelta {
  return {
    transform,
    encoding: DeltaEncoding.Compressed,
    fromClock,
    toClock,
    sourceNode,
  };
}

/**
 * Get the approximate size of a delta in bytes (for bandwidth estimation).
 */
export function estimateDeltaSize(_delta: StateDelta): number {
  // 8 coefficients * 8 bytes each + overhead
  return 8 * 8 + 32;
}

/**
 * Check if a delta is causally applicable to a state with the given clock.
 */
export function isApplicableTo(delta: StateDelta, stateClock: VectorClock): boolean {
  return delta.fromClock.happensBefore(stateClock) || delta.fromClock.equals(stateClock);
}

/**
 * Compute the delta between two states (additive).
 */
export function computeDelta(from: GA3, to: GA3): GA3 {
  return sub(to, from);
}

/**
 * Compute a compressed (log-space) delta.
 *
 * This representation is more compact for states that differ by
 * multiplicative factors rather than additive differences.
 */
export function computeDeltaCompressed(from: GA3, to: GA3): GA3 {
  const fromMag = magnitude(from);
  const toMag = magnitude(to);

  if (fromMag < 1e-10) {
    // Can't compute log of zero - fall back to additive
    return sub(to, from);
  }

  // Compute the ratio and take log
  const ratio = toMag / fromMag;
  const logRatio = Math.log(ratio);

  // Return as scalar multivector (simplified)
  return scalar(logRatio);
}

/**
 * Apply a delta to a state, returning the new state.
 */
export function applyDelta(state: GA3, delta: StateDelta): GA3 {
  switch (delta.encoding) {
    case DeltaEncoding.Additive:
      return add(state, delta.transform);

    case DeltaEncoding.Multiplicative:
      // Sandwich product: delta * state * reverse(delta)
      const rev = reverse(delta.transform);
      const temp = geometricProduct(delta.transform, state);
      return geometricProduct(temp, rev);

    case DeltaEncoding.Compressed:
      // Exponential application: exp(delta) * state
      const expDelta = gaExp(delta.transform);
      return geometricProduct(expDelta, state);

    default:
      throw new Error(`Unknown delta encoding: ${delta.encoding}`);
  }
}

/**
 * Apply a raw additive delta to a state.
 */
export function applyAdditiveDelta(state: GA3, delta: GA3): GA3 {
  return add(state, delta);
}

/**
 * A batch of deltas that can be applied together.
 */
export class DeltaBatch {
  /** The deltas in this batch, in causal order */
  deltas: StateDelta[];
  /** Combined clock covering all deltas */
  combinedClock: VectorClock;

  constructor() {
    this.deltas = [];
    this.combinedClock = new VectorClock();
  }

  /** Add a delta to the batch. */
  push(delta: StateDelta): void {
    this.combinedClock.update(delta.toClock);
    this.deltas.push(delta);
  }

  /** Check if the batch is empty. */
  isEmpty(): boolean {
    return this.deltas.length === 0;
  }

  /** Get the number of deltas in the batch. */
  get length(): number {
    return this.deltas.length;
  }

  /**
   * Combine all additive deltas into a single delta.
   * Returns null if batch contains non-additive deltas.
   */
  combineAdditive(): GA3 | null {
    if (this.deltas.length === 0) {
      return null;
    }

    // Check all deltas are additive
    if (!this.deltas.every(d => d.encoding === DeltaEncoding.Additive)) {
      return null;
    }

    // Sum all transforms
    return this.deltas.reduce(
      (acc, d) => add(acc, d.transform),
      zero()
    );
  }

  /** Apply all deltas in the batch to a state. */
  applyTo(state: GA3): GA3 {
    let result = state;
    for (const delta of this.deltas) {
      result = applyDelta(result, delta);
    }
    return result;
  }

  /** Get the estimated total size in bytes. */
  estimatedSize(): number {
    return this.deltas.reduce((sum, d) => sum + estimateDeltaSize(d), 0);
  }

  /** Serialize to JSON. */
  toJSON(): object {
    return {
      deltas: this.deltas.map(d => ({
        transform: d.transform,
        encoding: d.encoding,
        fromClock: d.fromClock.toJSON(),
        toClock: d.toClock.toJSON(),
        sourceNode: d.sourceNode,
      })),
      combinedClock: this.combinedClock.toJSON(),
    };
  }

  /** Deserialize from JSON. */
  static fromJSON(data: any): DeltaBatch {
    const batch = new DeltaBatch();
    batch.combinedClock = VectorClock.fromJSON(data.combinedClock);
    batch.deltas = data.deltas.map((d: any) => ({
      transform: d.transform,
      encoding: d.encoding,
      fromClock: VectorClock.fromJSON(d.fromClock),
      toClock: VectorClock.fromJSON(d.toClock),
      sourceNode: d.sourceNode,
    }));
    return batch;
  }
}

/**
 * Compute the size savings from using deltas vs full state sync.
 * Returns [deltaSize, fullSize, savingsRatio].
 */
export function computeSavings(delta: StateDelta, _fullState: GA3): [number, number, number] {
  const deltaSize = estimateDeltaSize(delta);
  const fullSize = 8 * 8; // 8 coefficients * 8 bytes

  const savings = fullSize > 0
    ? 1.0 - deltaSize / fullSize
    : 0.0;

  return [deltaSize, fullSize, savings];
}

/**
 * Simple exponential approximation for GA3.
 * Uses Taylor series: exp(x) ≈ 1 + x + x²/2! + x³/3! + ...
 */
function gaExp(mv: GA3): GA3 {
  const coeffs = mv as number[];
  const scalarPart = coeffs[0];

  // For primarily scalar values, use standard exp
  const vectorMag = Math.sqrt(
    coeffs.slice(1).reduce((sum, c) => sum + c * c, 0)
  );

  if (vectorMag < 1e-10) {
    // Pure scalar - standard exponential
    return fromCoefficients([Math.exp(scalarPart), 0, 0, 0, 0, 0, 0, 0]);
  }

  // General case: use Taylor series approximation (4 terms)
  let result = fromCoefficients([1, 0, 0, 0, 0, 0, 0, 0]); // 1
  let term = mv; // x

  result = add(result, term);

  term = scale(geometricProduct(term, mv), 0.5); // x²/2!
  result = add(result, term);

  term = scale(geometricProduct(term, mv), 1 / 3); // x³/3!
  result = add(result, term);

  term = scale(geometricProduct(term, mv), 0.25); // x⁴/4!
  result = add(result, term);

  return result;
}

import { scale } from '../ga3.js';
