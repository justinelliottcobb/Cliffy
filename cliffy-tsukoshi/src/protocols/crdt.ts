/**
 * Geometric CRDT (Conflict-free Replicated Data Type) using Clifford algebra.
 *
 * This CRDT uses geometric algebra operations for conflict resolution,
 * enabling coordination-free distributed state management.
 *
 * @example
 * ```typescript
 * import { GeometricCRDT, OperationType } from 'cliffy-tsukoshi/protocols';
 * import { scalar } from 'cliffy-tsukoshi';
 *
 * const nodeId = crypto.randomUUID();
 * const crdt = new GeometricCRDT(nodeId, scalar(0));
 *
 * // Apply a geometric transformation
 * const op = crdt.createOperation(scalar(5), OperationType.Addition);
 * crdt.applyOperation(op);
 *
 * console.log(crdt.state); // scalar(5)
 * ```
 */

import type { GA3 } from '../ga3.js';
import { add, zero, magnitude, geometricProduct, reverse, scale, fromCoefficients } from '../ga3.js';
import { VectorClock } from './vector-clock.js';

/**
 * Types of geometric operations supported by the CRDT.
 */
export enum OperationType {
  /** Geometric product: state * transform */
  GeometricProduct = 'geometric_product',
  /** Addition: state + transform */
  Addition = 'addition',
  /** Sandwich product: transform * state * reverse(transform) */
  Sandwich = 'sandwich',
  /** Exponential: exp(transform) * state */
  Exponential = 'exponential',
}

/**
 * A geometric operation that can be applied to the CRDT state.
 */
export interface GeometricOperation {
  /** Unique operation ID */
  id: number;
  /** Node that created this operation */
  nodeId: string;
  /** Timestamp for causal ordering */
  timestamp: VectorClock;
  /** The transformation to apply */
  transform: GA3;
  /** Type of operation */
  operationType: OperationType;
}

/**
 * A CRDT that uses geometric algebra operations for conflict resolution.
 */
export class GeometricCRDT {
  /** Current state as a multivector */
  state: GA3;
  /** Vector clock for causal ordering */
  vectorClock: VectorClock;
  /** This node's ID */
  nodeId: string;
  /** Applied operations (keyed by ID) */
  operations: Map<number, GeometricOperation>;
  /** Next operation ID */
  private nextOpId: number;

  constructor(nodeId: string, initialState: GA3) {
    this.state = initialState;
    this.vectorClock = new VectorClock();
    this.nodeId = nodeId;
    this.operations = new Map();
    this.nextOpId = 0;
  }

  /**
   * Apply a geometric operation to the CRDT state.
   */
  applyOperation(operation: GeometricOperation): void {
    // Skip if already applied (idempotent)
    if (this.operations.has(operation.id)) {
      return;
    }

    // Update vector clock
    this.vectorClock.update(operation.timestamp);

    // Store operation
    this.operations.set(operation.id, operation);

    // Apply transformation
    switch (operation.operationType) {
      case OperationType.GeometricProduct:
        this.state = geometricProduct(this.state, operation.transform);
        break;

      case OperationType.Addition:
        this.state = add(this.state, operation.transform);
        break;

      case OperationType.Sandwich:
        // R * v * R^-1 sandwich product
        const rev = reverse(operation.transform);
        const temp = geometricProduct(operation.transform, this.state);
        this.state = geometricProduct(temp, rev);
        break;

      case OperationType.Exponential:
        // exp(transform) * state
        const expTransform = gaExp(operation.transform);
        this.state = geometricProduct(expTransform, this.state);
        break;
    }
  }

  /**
   * Create a new operation to be applied.
   */
  createOperation(transform: GA3, opType: OperationType): GeometricOperation {
    this.vectorClock.tick(this.nodeId);
    const opId = this.nextOpId++;

    return {
      id: opId,
      nodeId: this.nodeId,
      timestamp: this.vectorClock.clone(),
      transform,
      operationType: opType,
    };
  }

  /**
   * Merge this CRDT with another, resolving conflicts using geometric algebra.
   */
  merge(other: GeometricCRDT): GeometricCRDT {
    const mergedClock = this.vectorClock.merge(other.vectorClock);

    // Collect all operations
    const mergedOps = new Map(this.operations);
    for (const [id, op] of other.operations) {
      if (!mergedOps.has(id)) {
        mergedOps.set(id, op);
      }
    }

    // Sort operations in causal order
    const sortedOps = Array.from(mergedOps.values()).sort((a, b) => {
      if (a.timestamp.happensBefore(b.timestamp)) {
        return -1;
      } else if (b.timestamp.happensBefore(a.timestamp)) {
        return 1;
      } else {
        // Deterministic tie-breaking by ID
        return a.id - b.id;
      }
    });

    // Re-apply all operations in order
    const result = new GeometricCRDT(this.nodeId, zero());
    result.vectorClock = mergedClock;
    result.operations = mergedOps;
    result.nextOpId = Math.max(this.nextOpId, other.nextOpId);

    for (const op of sortedOps) {
      result.applyOperation(op);
    }

    return result;
  }

  /**
   * Compute geometric join for conflict resolution.
   *
   * Returns the state with larger magnitude, or their geometric mean if equal.
   */
  geometricJoin(other: GA3): GA3 {
    const selfNorm = magnitude(this.state);
    const otherNorm = magnitude(other);

    if (selfNorm > otherNorm) {
      return this.state;
    } else if (otherNorm > selfNorm) {
      return other;
    } else {
      // Equal magnitudes - use geometric mean
      return geometricMean([this.state, other]);
    }
  }

  /**
   * Serialize to JSON.
   */
  toJSON(): object {
    return {
      state: this.state,
      vectorClock: this.vectorClock.toJSON(),
      nodeId: this.nodeId,
      operations: Array.from(this.operations.entries()).map(([id, op]) => ({
        id,
        nodeId: op.nodeId,
        timestamp: op.timestamp.toJSON(),
        transform: op.transform,
        operationType: op.operationType,
      })),
    };
  }

  /**
   * Deserialize from JSON.
   */
  static fromJSON(data: any): GeometricCRDT {
    const crdt = new GeometricCRDT(data.nodeId, data.state);
    crdt.vectorClock = VectorClock.fromJSON(data.vectorClock);
    for (const op of data.operations) {
      crdt.operations.set(op.id, {
        ...op,
        timestamp: VectorClock.fromJSON(op.timestamp),
      });
    }
    return crdt;
  }
}

/**
 * Compute the geometric mean of a set of multivectors.
 */
export function geometricMean(multivectors: GA3[]): GA3 {
  if (multivectors.length === 0) {
    return zero();
  }

  const n = multivectors.length;

  // Sum all (using exp as approximation since log may not exist for all)
  let sum = zero();
  for (const mv of multivectors) {
    sum = add(sum, gaExp(mv));
  }

  // Scale by 1/n
  return scale(sum, 1 / n);
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
