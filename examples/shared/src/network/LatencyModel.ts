/**
 * LatencyModel - Simulates network latency for testing
 */

export interface LatencyConfig {
  /** Base latency in ms */
  baseMs: number;
  /** Variance in ms */
  varianceMs: number;
  /** Packet loss probability (0-1) */
  lossRate: number;
  /** Jitter factor (0-1) */
  jitter: number;
}

/**
 * Models network latency with configurable characteristics
 */
export class LatencyModel {
  private config: LatencyConfig;

  constructor(config: Partial<LatencyConfig> = {}) {
    this.config = {
      baseMs: 50,
      varianceMs: 20,
      lossRate: 0,
      jitter: 0.1,
      ...config,
    };
  }

  /**
   * Create a local network model (very low latency)
   */
  static local(): LatencyModel {
    return new LatencyModel({
      baseMs: 1,
      varianceMs: 0.5,
      lossRate: 0,
      jitter: 0.1,
    });
  }

  /**
   * Create a LAN model
   */
  static lan(): LatencyModel {
    return new LatencyModel({
      baseMs: 5,
      varianceMs: 2,
      lossRate: 0.001,
      jitter: 0.2,
    });
  }

  /**
   * Create a WAN model
   */
  static wan(): LatencyModel {
    return new LatencyModel({
      baseMs: 50,
      varianceMs: 20,
      lossRate: 0.01,
      jitter: 0.3,
    });
  }

  /**
   * Create a mobile network model
   */
  static mobile(): LatencyModel {
    return new LatencyModel({
      baseMs: 100,
      varianceMs: 50,
      lossRate: 0.05,
      jitter: 0.5,
    });
  }

  /**
   * Get a random latency value based on the model
   */
  getLatency(): number {
    const variance = (Math.random() - 0.5) * 2 * this.config.varianceMs;
    const jitterFactor = 1 + (Math.random() - 0.5) * 2 * this.config.jitter;
    return Math.max(0, (this.config.baseMs + variance) * jitterFactor);
  }

  /**
   * Check if a packet should be dropped
   */
  shouldDrop(): boolean {
    return Math.random() < this.config.lossRate;
  }

  /**
   * Simulate sending a message with latency
   */
  async send<T>(data: T): Promise<T | null> {
    if (this.shouldDrop()) {
      return null;
    }

    const latency = this.getLatency();
    await new Promise(resolve => setTimeout(resolve, latency));
    return data;
  }
}
