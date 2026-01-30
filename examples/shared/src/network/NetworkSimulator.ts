/**
 * NetworkSimulator - Orchestrates multiple simulated peers
 */

import { SimulatedPeer, PeerConfig, PeerMessage } from './SimulatedPeer';
import { LatencyModel, LatencyConfig } from './LatencyModel';

export interface NetworkConfig {
  /** Number of peers to simulate */
  peerCount: number;
  /** Latency model for all peers (or per-peer config) */
  latencyModel?: LatencyModel | LatencyConfig;
  /** Operations per second per peer */
  opsPerSecond?: number;
}

/**
 * Simulates a network of peers for collaboration testing
 */
export class NetworkSimulator {
  private peers: Map<string, SimulatedPeer> = new Map();
  private messageHandlers: Set<(msg: PeerMessage) => void> = new Set();
  private isRunning = false;

  constructor(config?: NetworkConfig) {
    if (config) {
      this.createPeers(config);
    }
  }

  /**
   * Create peers based on config
   */
  createPeers(config: NetworkConfig): void {
    const latencyModel =
      config.latencyModel instanceof LatencyModel
        ? config.latencyModel
        : new LatencyModel(config.latencyModel);

    for (let i = 0; i < config.peerCount; i++) {
      const peer = new SimulatedPeer({
        id: `peer-${i}`,
        latencyModel,
        opsPerSecond: config.opsPerSecond ?? 1,
      });

      peer.onMessage(msg => this.broadcastMessage(msg));
      this.peers.set(peer.id, peer);
    }
  }

  /**
   * Add a peer to the network
   */
  addPeer(config: PeerConfig): SimulatedPeer {
    const peer = new SimulatedPeer(config);
    peer.onMessage(msg => this.broadcastMessage(msg));
    this.peers.set(peer.id, peer);

    if (this.isRunning) {
      peer.start();
    }

    return peer;
  }

  /**
   * Remove a peer from the network
   */
  removePeer(id: string): void {
    const peer = this.peers.get(id);
    if (peer) {
      peer.stop();
      this.peers.delete(id);
    }
  }

  /**
   * Get a peer by ID
   */
  getPeer(id: string): SimulatedPeer | undefined {
    return this.peers.get(id);
  }

  /**
   * Get all peers
   */
  getAllPeers(): SimulatedPeer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Subscribe to messages from all peers
   */
  onMessage(handler: (msg: PeerMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Start all peers
   */
  start(): void {
    this.isRunning = true;
    for (const peer of this.peers.values()) {
      peer.start();
    }
  }

  /**
   * Stop all peers
   */
  stop(): void {
    this.isRunning = false;
    for (const peer of this.peers.values()) {
      peer.stop();
    }
  }

  /**
   * Check if simulator is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get peer count
   */
  get peerCount(): number {
    return this.peers.size;
  }

  private broadcastMessage(msg: PeerMessage): void {
    for (const handler of this.messageHandlers) {
      handler(msg);
    }
  }
}
