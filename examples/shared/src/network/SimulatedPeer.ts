/**
 * SimulatedPeer - Simulates a remote peer for testing collaboration
 */

import { LatencyModel } from './LatencyModel';

export interface PeerConfig {
  id: string;
  latencyModel?: LatencyModel;
  /** Operations per second this peer generates */
  opsPerSecond?: number;
}

export type PeerMessage = {
  type: 'operation' | 'sync' | 'presence';
  peerId: string;
  timestamp: number;
  data: unknown;
};

/**
 * Simulates a remote peer for multi-user testing
 */
export class SimulatedPeer {
  public readonly id: string;
  private latencyModel: LatencyModel;
  private opsPerSecond: number;
  private isActive = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private messageHandler: ((msg: PeerMessage) => void) | null = null;

  constructor(config: PeerConfig) {
    this.id = config.id;
    this.latencyModel = config.latencyModel ?? LatencyModel.wan();
    this.opsPerSecond = config.opsPerSecond ?? 1;
  }

  /**
   * Set the message handler
   */
  onMessage(handler: (msg: PeerMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Start generating simulated operations
   */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;

    const interval = 1000 / this.opsPerSecond;
    this.intervalId = setInterval(() => {
      this.generateOperation();
    }, interval);
  }

  /**
   * Stop generating operations
   */
  stop(): void {
    this.isActive = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Send a message to this peer (simulates receiving)
   */
  async receive(msg: PeerMessage): Promise<void> {
    const delivered = await this.latencyModel.send(msg);
    if (delivered && this.messageHandler) {
      this.messageHandler(delivered);
    }
  }

  /**
   * Check if peer is active
   */
  get active(): boolean {
    return this.isActive;
  }

  private generateOperation(): void {
    if (!this.messageHandler) return;

    const msg: PeerMessage = {
      type: 'operation',
      peerId: this.id,
      timestamp: Date.now(),
      data: {
        // Simulated operation data
        x: Math.random() * 100,
        y: Math.random() * 100,
        value: Math.random(),
      },
    };

    // Apply latency before delivering
    this.latencyModel.send(msg).then(delivered => {
      if (delivered && this.messageHandler) {
        this.messageHandler(delivered);
      }
    });
  }
}
