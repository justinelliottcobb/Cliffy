/**
 * Vector Clock for causal ordering in distributed systems.
 *
 * Vector clocks enable tracking happens-before relationships
 * between events across multiple nodes without centralized coordination.
 *
 * @example
 * ```typescript
 * const clock1 = new VectorClock();
 * const clock2 = new VectorClock();
 *
 * clock1.tick('node-1');
 * clock2.tick('node-2');
 *
 * // These events are concurrent (neither happened before the other)
 * console.log(clock1.concurrent(clock2)); // true
 *
 * // Merge clocks after sync
 * clock1.update(clock2);
 * clock1.tick('node-1');
 *
 * // Now clock1 happened after clock2
 * console.log(clock2.happensBefore(clock1)); // true
 * ```
 */
export class VectorClock {
  private clocks: Map<string, number>;

  constructor(clocks?: Map<string, number>) {
    this.clocks = clocks ? new Map(clocks) : new Map();
  }

  /**
   * Increment the clock for a specific node.
   */
  tick(nodeId: string): void {
    const current = this.clocks.get(nodeId) ?? 0;
    this.clocks.set(nodeId, current + 1);
  }

  /**
   * Update this clock with values from another clock (take max of each).
   */
  update(other: VectorClock): void {
    for (const [nodeId, timestamp] of other.clocks) {
      const current = this.clocks.get(nodeId) ?? 0;
      this.clocks.set(nodeId, Math.max(current, timestamp));
    }
  }

  /**
   * Check if this clock happened before another clock.
   *
   * Returns true if all timestamps in this clock are <= the corresponding
   * timestamps in the other clock, and at least one is strictly less.
   */
  happensBefore(other: VectorClock): boolean {
    let hasSmaller = false;

    // Check all entries in other
    for (const [nodeId, otherTime] of other.clocks) {
      const selfTime = this.clocks.get(nodeId) ?? 0;
      if (selfTime > otherTime) {
        return false;
      }
      if (selfTime < otherTime) {
        hasSmaller = true;
      }
    }

    // Check entries in self that aren't in other
    for (const [nodeId, selfTime] of this.clocks) {
      if (!other.clocks.has(nodeId)) {
        // self has a non-zero entry that other doesn't have (implicitly 0)
        if (selfTime > 0) {
          return false;
        }
      }
    }

    return hasSmaller;
  }

  /**
   * Check if this clock is concurrent with another (neither happened before).
   */
  concurrent(other: VectorClock): boolean {
    return !this.happensBefore(other) && !other.happensBefore(this);
  }

  /**
   * Merge this clock with another, returning a new clock.
   */
  merge(other: VectorClock): VectorClock {
    const result = this.clone();
    result.update(other);
    return result;
  }

  /**
   * Get the timestamp for a specific node.
   */
  get(nodeId: string): number {
    return this.clocks.get(nodeId) ?? 0;
  }

  /**
   * Check if two clocks are equal.
   */
  equals(other: VectorClock): boolean {
    if (this.clocks.size !== other.clocks.size) {
      return false;
    }
    for (const [nodeId, timestamp] of this.clocks) {
      if (other.clocks.get(nodeId) !== timestamp) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create a copy of this clock.
   */
  clone(): VectorClock {
    return new VectorClock(this.clocks);
  }

  /**
   * Serialize to a plain object for JSON.
   */
  toJSON(): Record<string, number> {
    return Object.fromEntries(this.clocks);
  }

  /**
   * Deserialize from a plain object.
   */
  static fromJSON(data: Record<string, number>): VectorClock {
    return new VectorClock(new Map(Object.entries(data)));
  }
}
