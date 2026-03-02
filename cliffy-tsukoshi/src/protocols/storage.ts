/**
 * Persistence layer for geometric state and operation history.
 *
 * Uses a hybrid approach:
 * - Snapshots: Full state at specific points in time
 * - Operations: Log of operations since last snapshot
 *
 * Recovery: Load latest snapshot, then replay operations.
 *
 * @example
 * ```typescript
 * import { MemoryStore } from 'cliffy-tsukoshi/protocols';
 * import { scalar } from 'cliffy-tsukoshi';
 *
 * const store = new MemoryStore();
 *
 * // Save a snapshot
 * const state = scalar(42);
 * store.saveSnapshot(state, new VectorClock());
 *
 * // Load it back
 * const snapshot = store.loadLatestSnapshot();
 * ```
 */

import type { GA3 } from '../ga3.js';
import { clone } from '../ga3.js';
import { VectorClock } from './vector-clock.js';
import { StateDelta, applyDelta } from './delta.js';

/**
 * A snapshot of the geometric state at a point in time.
 */
export interface Snapshot {
  /** The state at this snapshot */
  state: GA3;
  /** Vector clock at this snapshot */
  clock: VectorClock;
  /** Snapshot ID (monotonically increasing) */
  id: number;
  /** Timestamp when snapshot was taken (ms since epoch) */
  timestamp: number;
}

/**
 * A stored operation for replay.
 */
export interface StoredOperation {
  /** The operation (as a delta) */
  delta: StateDelta;
  /** Sequence number (for ordering) */
  sequence: number;
  /** Whether this operation has been compacted */
  compacted: boolean;
}

/**
 * Statistics about stored data.
 */
export interface StorageStats {
  /** Number of snapshots stored */
  snapshotCount: number;
  /** Number of operations in the log */
  operationCount: number;
  /** Approximate total size in bytes */
  totalSizeBytes: number;
  /** Operations since last snapshot */
  pendingOperations: number;
}

/**
 * Interface for geometric state persistence.
 *
 * Implementations may target different backends:
 * - MemoryStore: In-memory (for testing)
 * - IndexedDbStore: Browser IndexedDB
 * - LocalStorageStore: Browser localStorage
 */
export interface GeometricStore {
  /** Save a state snapshot. */
  saveSnapshot(state: GA3, clock: VectorClock): void;

  /** Load the latest snapshot. */
  loadLatestSnapshot(): Snapshot | null;

  /** Load a specific snapshot by ID. */
  loadSnapshot(id: number): Snapshot | null;

  /** Append an operation to the log. */
  appendOperation(delta: StateDelta): void;

  /** Get all operations since a given clock. */
  operationsSince(clock: VectorClock): StoredOperation[];

  /** Get all operations since a given sequence number. */
  operationsSinceSequence(sequence: number): StoredOperation[];

  /** Compact the operation log by creating a new snapshot. */
  compact(): Snapshot | null;

  /** Get storage statistics. */
  stats(): StorageStats;

  /** Clear all stored data. */
  clear(): void;
}

/**
 * Configuration for MemoryStore.
 */
export interface MemoryStoreConfig {
  /** Maximum number of snapshots to keep */
  maxSnapshots: number;
  /** Maximum operations before auto-compact */
  maxOperationsBeforeCompact: number;
  /** Whether to auto-compact */
  autoCompact: boolean;
}

const DEFAULT_CONFIG: MemoryStoreConfig = {
  maxSnapshots: 10,
  maxOperationsBeforeCompact: 1000,
  autoCompact: true,
};

/**
 * In-memory implementation of GeometricStore.
 *
 * Useful for testing and as a reference implementation.
 */
export class MemoryStore implements GeometricStore {
  private snapshots: Snapshot[] = [];
  private operations: StoredOperation[] = [];
  private nextSnapshotId = 0;
  private nextSequence = 0;
  private currentState: GA3 | null = null;
  private currentClock: VectorClock = new VectorClock();
  private config: MemoryStoreConfig;

  constructor(config: Partial<MemoryStoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  saveSnapshot(state: GA3, clock: VectorClock): void {
    const snapshot: Snapshot = {
      state: clone(state),
      clock: clock.clone(),
      id: this.nextSnapshotId++,
      timestamp: Date.now(),
    };
    this.snapshots.push(snapshot);
    this.currentState = clone(state);
    this.currentClock = clock.clone();
    this.pruneSnapshots();
  }

  loadLatestSnapshot(): Snapshot | null {
    if (this.snapshots.length === 0) {
      return null;
    }
    return this.snapshots[this.snapshots.length - 1];
  }

  loadSnapshot(id: number): Snapshot | null {
    return this.snapshots.find(s => s.id === id) ?? null;
  }

  appendOperation(delta: StateDelta): void {
    // Update current state
    if (this.currentState !== null) {
      this.currentState = applyDelta(this.currentState, delta);
    }
    this.currentClock.update(delta.toClock);

    const op: StoredOperation = {
      delta,
      sequence: this.nextSequence++,
      compacted: false,
    };
    this.operations.push(op);

    // Auto-compact if needed
    if (this.shouldCompact()) {
      this.compact();
    }
  }

  operationsSince(clock: VectorClock): StoredOperation[] {
    return this.operations.filter(op =>
      clock.happensBefore(op.delta.toClock)
    );
  }

  operationsSinceSequence(sequence: number): StoredOperation[] {
    return this.operations.filter(op => op.sequence >= sequence);
  }

  compact(): Snapshot | null {
    if (this.currentState === null) {
      return null;
    }

    // Create new snapshot
    this.saveSnapshot(this.currentState, this.currentClock);

    // Clear operations (they're now in the snapshot)
    this.operations = [];

    return this.loadLatestSnapshot();
  }

  stats(): StorageStats {
    const lastSnapshot = this.loadLatestSnapshot();
    const pending = lastSnapshot
      ? this.operationsSince(lastSnapshot.clock).length
      : this.operations.length;

    return {
      snapshotCount: this.snapshots.length,
      operationCount: this.operations.length,
      totalSizeBytes: this.estimateSize(),
      pendingOperations: pending,
    };
  }

  clear(): void {
    this.snapshots = [];
    this.operations = [];
    this.currentState = null;
    this.currentClock = new VectorClock();
    this.nextSnapshotId = 0;
    this.nextSequence = 0;
  }

  /**
   * Get the current state by replaying from snapshot.
   */
  getCurrentState(): GA3 | null {
    const snapshot = this.loadLatestSnapshot();
    if (!snapshot) {
      return null;
    }

    let state = clone(snapshot.state);
    for (const op of this.operationsSince(snapshot.clock)) {
      state = applyDelta(state, op.delta);
    }

    return state;
  }

  private pruneSnapshots(): void {
    while (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  private shouldCompact(): boolean {
    return (
      this.config.autoCompact &&
      this.operations.length >= this.config.maxOperationsBeforeCompact
    );
  }

  private estimateSize(): number {
    // Rough estimate: 64 bytes per snapshot, 96 bytes per operation
    return this.snapshots.length * 64 + this.operations.length * 96;
  }
}

/**
 * A recovery result from loading stored state.
 */
export interface RecoveryResult {
  /** The recovered state */
  state: GA3;
  /** The recovered clock */
  clock: VectorClock;
  /** Number of operations replayed */
  operationsReplayed: number;
  /** The snapshot ID used as base */
  baseSnapshotId: number | null;
}

/**
 * Recover state from a store.
 *
 * Loads the latest snapshot and replays any subsequent operations.
 */
export function recoverState(store: GeometricStore): RecoveryResult | null {
  const snapshot = store.loadLatestSnapshot();
  if (!snapshot) {
    return null;
  }

  let state = clone(snapshot.state);
  let clock = snapshot.clock.clone();

  const ops = store.operationsSince(snapshot.clock);

  for (const op of ops) {
    state = applyDelta(state, op.delta);
    clock.update(op.delta.toClock);
  }

  return {
    state,
    clock,
    operationsReplayed: ops.length,
    baseSnapshotId: snapshot.id,
  };
}
