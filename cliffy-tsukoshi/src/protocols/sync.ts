/**
 * Synchronization protocol for P2P state coordination.
 *
 * Defines protocol messages and types for peer-to-peer state
 * synchronization using geometric deltas and vector clocks.
 *
 * Protocol phases:
 * 1. Discovery: Peers announce themselves and exchange clock info
 * 2. Sync: Peers exchange deltas to converge on consistent state
 * 3. Maintenance: Periodic heartbeats and partition recovery
 *
 * @example
 * ```typescript
 * import { SyncState, VectorClock } from 'cliffy-tsukoshi/protocols';
 *
 * const nodeId = crypto.randomUUID();
 * const syncState = new SyncState(nodeId);
 *
 * // Register a peer
 * const peerId = crypto.randomUUID();
 * syncState.registerPeer(peerId, new VectorClock());
 *
 * // Create and send hello message
 * const hello = syncState.createHello('My Node');
 * // ... send via WebRTC, WebSocket, etc.
 * ```
 */

import type { GA3 } from '../ga3.js';
import { VectorClock } from './vector-clock.js';
import { DeltaBatch } from './delta.js';

/**
 * The payload of a sync message.
 */
export type SyncPayload =
  | { type: 'Hello'; info: PeerInfo }
  | { type: 'ClockRequest' }
  | { type: 'ClockResponse'; clock: VectorClock }
  | { type: 'DeltaRequest'; sinceClock: VectorClock }
  | { type: 'DeltaResponse'; deltas: DeltaBatch; hasMore: boolean }
  | { type: 'FullState'; state: GA3; clock: VectorClock }
  | { type: 'Heartbeat' }
  | { type: 'Ack'; messageId: number; appliedClock: VectorClock }
  | { type: 'Goodbye' };

/**
 * A message in the sync protocol.
 */
export interface SyncMessage {
  /** Unique message ID */
  id: number;
  /** Sender's node ID */
  sender: string;
  /** Message type and payload */
  payload: SyncPayload;
  /** Sender's current vector clock */
  clock: VectorClock;
  /** Timestamp (milliseconds since epoch) */
  timestamp: number;
}

/**
 * Information about a peer node.
 */
export interface PeerInfo {
  /** The peer's node ID */
  nodeId: string;
  /** Human-readable name (optional) */
  name?: string;
  /** Capabilities this peer supports */
  capabilities: PeerCapabilities;
  /** Protocol version */
  protocolVersion: number;
}

/**
 * Capabilities a peer may support.
 */
export interface PeerCapabilities {
  /** Supports compressed deltas */
  compressedDeltas: boolean;
  /** Supports batch operations */
  batchOperations: boolean;
  /** Maximum batch size supported */
  maxBatchSize: number;
  /** Supports full state snapshots */
  fullStateSync: boolean;
}

/**
 * Default peer capabilities.
 */
export function defaultCapabilities(): PeerCapabilities {
  return {
    compressedDeltas: true,
    batchOperations: true,
    maxBatchSize: 100,
    fullStateSync: true,
  };
}

/**
 * Connection state with a peer.
 */
export enum PeerConnectionState {
  /** Just discovered, not yet synced */
  Discovered = 'discovered',
  /** Currently synchronizing */
  Syncing = 'syncing',
  /** Fully synchronized */
  Synced = 'synced',
  /** Connection lost, attempting recovery */
  Disconnected = 'disconnected',
  /** Peer has left the network */
  Gone = 'gone',
}

/**
 * Tracked state for a connected peer.
 */
export interface PeerState {
  /** Peer information */
  info: PeerInfo;
  /** Last known clock from this peer */
  lastClock: VectorClock;
  /** Connection state */
  connectionState: PeerConnectionState;
  /** Last message received timestamp (ms) */
  lastSeen: number | null;
  /** Pending acknowledgments (messageId -> sentTime) */
  pendingAcks: Map<number, number>;
  /** Round-trip time estimate (in milliseconds) */
  rttEstimate: number | null;
}

/**
 * Create a new peer state.
 */
export function createPeerState(info: PeerInfo, clock: VectorClock): PeerState {
  return {
    info,
    lastClock: clock,
    connectionState: PeerConnectionState.Discovered,
    lastSeen: null,
    pendingAcks: new Map(),
    rttEstimate: null,
  };
}

/**
 * Configuration for sync behavior.
 */
export interface SyncConfig {
  /** How often to send heartbeats (ms) */
  heartbeatInterval: number;
  /** How long before a peer is considered stale (ms) */
  peerTimeout: number;
  /** Maximum deltas per batch */
  maxBatchSize: number;
  /** Whether to prefer compressed deltas */
  preferCompressed: boolean;
  /** Protocol version */
  protocolVersion: number;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  heartbeatInterval: 5000,
  peerTimeout: 30000,
  maxBatchSize: 100,
  preferCompressed: true,
  protocolVersion: 1,
};

/**
 * The synchronization state for a node.
 */
export class SyncState {
  /** This node's ID */
  readonly nodeId: string;
  /** Current vector clock */
  clock: VectorClock;
  /** Known peers */
  peers: Map<string, PeerState>;
  /** Next message ID */
  private nextMessageId: number;
  /** Configuration */
  config: SyncConfig;

  constructor(nodeId: string, config: Partial<SyncConfig> = {}) {
    this.nodeId = nodeId;
    this.clock = new VectorClock();
    this.peers = new Map();
    this.nextMessageId = 0;
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  /**
   * Register a new peer.
   */
  registerPeer(peerId: string, clock: VectorClock): void {
    const info: PeerInfo = {
      nodeId: peerId,
      capabilities: defaultCapabilities(),
      protocolVersion: this.config.protocolVersion,
    };
    this.peers.set(peerId, createPeerState(info, clock));
  }

  /**
   * Register a peer with full info.
   */
  registerPeerWithInfo(info: PeerInfo, clock: VectorClock): void {
    this.peers.set(info.nodeId, createPeerState(info, clock));
  }

  /**
   * Remove a peer.
   */
  removePeer(peerId: string): void {
    this.peers.delete(peerId);
  }

  /**
   * Get a peer's state.
   */
  getPeer(peerId: string): PeerState | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Update our clock and get next message ID.
   */
  tick(): number {
    this.clock.tick(this.nodeId);
    return this.nextMessageId++;
  }

  /**
   * Create a hello message.
   */
  createHello(name?: string): SyncMessage {
    const id = this.tick();
    return {
      id,
      sender: this.nodeId,
      payload: {
        type: 'Hello',
        info: {
          nodeId: this.nodeId,
          name,
          capabilities: defaultCapabilities(),
          protocolVersion: this.config.protocolVersion,
        },
      },
      clock: this.clock.clone(),
      timestamp: Date.now(),
    };
  }

  /**
   * Create a delta request message.
   */
  createDeltaRequest(sinceClock: VectorClock): SyncMessage {
    const id = this.tick();
    return {
      id,
      sender: this.nodeId,
      payload: { type: 'DeltaRequest', sinceClock },
      clock: this.clock.clone(),
      timestamp: Date.now(),
    };
  }

  /**
   * Create a delta response message.
   */
  createDeltaResponse(deltas: DeltaBatch, hasMore: boolean): SyncMessage {
    const id = this.tick();
    return {
      id,
      sender: this.nodeId,
      payload: { type: 'DeltaResponse', deltas, hasMore },
      clock: this.clock.clone(),
      timestamp: Date.now(),
    };
  }

  /**
   * Create a full state message.
   */
  createFullState(state: GA3): SyncMessage {
    const id = this.tick();
    return {
      id,
      sender: this.nodeId,
      payload: {
        type: 'FullState',
        state,
        clock: this.clock.clone(),
      },
      clock: this.clock.clone(),
      timestamp: Date.now(),
    };
  }

  /**
   * Create a heartbeat message.
   */
  createHeartbeat(): SyncMessage {
    const id = this.tick();
    return {
      id,
      sender: this.nodeId,
      payload: { type: 'Heartbeat' },
      clock: this.clock.clone(),
      timestamp: Date.now(),
    };
  }

  /**
   * Create an acknowledgment message.
   */
  createAck(messageId: number): SyncMessage {
    const id = this.tick();
    return {
      id,
      sender: this.nodeId,
      payload: {
        type: 'Ack',
        messageId,
        appliedClock: this.clock.clone(),
      },
      clock: this.clock.clone(),
      timestamp: Date.now(),
    };
  }

  /**
   * Create a goodbye message.
   */
  createGoodbye(): SyncMessage {
    const id = this.tick();
    return {
      id,
      sender: this.nodeId,
      payload: { type: 'Goodbye' },
      clock: this.clock.clone(),
      timestamp: Date.now(),
    };
  }

  /**
   * Handle an incoming message from a peer.
   * Returns a response message if one should be sent.
   */
  handleMessage(message: SyncMessage): SyncMessage | null {
    // Update peer state
    const peer = this.peers.get(message.sender);
    if (peer) {
      peer.lastSeen = Date.now();
      peer.lastClock = message.clock.clone();
    }

    // Update our clock
    this.clock.update(message.clock);

    const payload = message.payload;

    switch (payload.type) {
      case 'Hello':
        this.registerPeerWithInfo(payload.info, message.clock);
        return this.createHello();

      case 'ClockRequest':
        const id = this.tick();
        return {
          id,
          sender: this.nodeId,
          payload: { type: 'ClockResponse', clock: this.clock.clone() },
          clock: this.clock.clone(),
          timestamp: Date.now(),
        };

      case 'Heartbeat':
        // No response needed, just updated peer state above
        return null;

      case 'Ack':
        if (peer) {
          const sentTime = peer.pendingAcks.get(payload.messageId);
          if (sentTime !== undefined) {
            peer.pendingAcks.delete(payload.messageId);
            const rtt = Date.now() - sentTime;
            peer.rttEstimate = peer.rttEstimate !== null
              ? peer.rttEstimate * 0.8 + rtt * 0.2
              : rtt;
          }
        }
        return null;

      case 'Goodbye':
        if (peer) {
          peer.connectionState = PeerConnectionState.Gone;
        }
        return null;

      default:
        // Other message types need application-level handling
        return null;
    }
  }

  /**
   * Get list of stale peers that should be checked.
   */
  stalePeers(): string[] {
    const now = Date.now();
    return Array.from(this.peers.entries())
      .filter(([_, state]) => {
        if (state.lastSeen === null) return true;
        return now - state.lastSeen > this.config.peerTimeout;
      })
      .map(([id]) => id);
  }

  /**
   * Get peers that need heartbeats.
   */
  peersNeedingHeartbeat(): string[] {
    const now = Date.now();
    return Array.from(this.peers.entries())
      .filter(([_, state]) => {
        if (state.connectionState !== PeerConnectionState.Synced &&
            state.connectionState !== PeerConnectionState.Syncing) {
          return false;
        }
        if (state.lastSeen === null) return true;
        return now - state.lastSeen > this.config.heartbeatInterval / 2;
      })
      .map(([id]) => id);
  }

  /**
   * Record that we sent a message requiring acknowledgment.
   */
  expectAck(peerId: string, messageId: number): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.pendingAcks.set(messageId, Date.now());
    }
  }

  /**
   * Serialize to JSON.
   */
  toJSON(): object {
    return {
      nodeId: this.nodeId,
      clock: this.clock.toJSON(),
      peers: Array.from(this.peers.entries()).map(([id, state]) => ({
        id,
        info: state.info,
        lastClock: state.lastClock.toJSON(),
        connectionState: state.connectionState,
        lastSeen: state.lastSeen,
        rttEstimate: state.rttEstimate,
      })),
      config: this.config,
    };
  }
}
