/**
 * WebRTC Protocol Types
 *
 * TypeScript equivalents of the Rust sync protocol types from cliffy-protocols.
 * These types enable type-safe WebRTC communication between peers.
 */

// =============================================================================
// Vector Clock
// =============================================================================

/**
 * Vector clock for causal ordering of distributed events.
 * Maps node IDs to their logical timestamp.
 */
export interface VectorClock {
  /** Clock entries: nodeId -> timestamp */
  entries: Record<string, number>;
}

export function createVectorClock(nodeId?: string): VectorClock {
  const clock: VectorClock = { entries: {} };
  if (nodeId) {
    clock.entries[nodeId] = 0;
  }
  return clock;
}

export function tickClock(clock: VectorClock, nodeId: string): VectorClock {
  const newEntries = { ...clock.entries };
  newEntries[nodeId] = (newEntries[nodeId] || 0) + 1;
  return { entries: newEntries };
}

export function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
  const entries: Record<string, number> = { ...a.entries };
  for (const [nodeId, time] of Object.entries(b.entries)) {
    entries[nodeId] = Math.max(entries[nodeId] || 0, time);
  }
  return { entries };
}

export function getClockTime(clock: VectorClock, nodeId: string): number {
  return clock.entries[nodeId] || 0;
}

export function clockHappensBefore(a: VectorClock, b: VectorClock): boolean {
  let strictlyLess = false;
  for (const nodeId of Object.keys({ ...a.entries, ...b.entries })) {
    const aTime = a.entries[nodeId] || 0;
    const bTime = b.entries[nodeId] || 0;
    if (aTime > bTime) return false;
    if (aTime < bTime) strictlyLess = true;
  }
  return strictlyLess;
}

// =============================================================================
// Delta Types
// =============================================================================

/**
 * How the delta is encoded for transmission.
 */
export type DeltaEncoding = 'Additive' | 'Multiplicative' | 'Compressed';

/**
 * A state delta representing the transformation between two states.
 */
export interface StateDelta {
  /** The delta transformation (GA3 coefficients) */
  transform: number[];
  /** Type of delta encoding */
  encoding: DeltaEncoding;
  /** Source state clock */
  fromClock: VectorClock;
  /** Target state clock */
  toClock: VectorClock;
  /** Node that computed this delta */
  sourceNode: string;
}

/**
 * A batch of deltas for efficient transmission.
 */
export interface DeltaBatch {
  /** Deltas in causal order */
  deltas: StateDelta[];
  /** Combined clock covering all deltas */
  combinedClock: VectorClock;
}

export function createDeltaBatch(): DeltaBatch {
  return {
    deltas: [],
    combinedClock: createVectorClock(),
  };
}

// =============================================================================
// Peer Info
// =============================================================================

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

export function defaultCapabilities(): PeerCapabilities {
  return {
    compressedDeltas: true,
    batchOperations: true,
    maxBatchSize: 100,
    fullStateSync: true,
  };
}

/**
 * Information about a peer node.
 */
export interface PeerInfo {
  /** The peer's node ID (UUID) */
  nodeId: string;
  /** Human-readable name */
  name?: string;
  /** Capabilities this peer supports */
  capabilities: PeerCapabilities;
  /** Protocol version */
  protocolVersion: number;
}

// =============================================================================
// Sync Message
// =============================================================================

/**
 * Payload types for sync messages.
 */
export type SyncPayload =
  | { type: 'Hello'; info: PeerInfo }
  | { type: 'ClockRequest' }
  | { type: 'ClockResponse'; clock: VectorClock }
  | { type: 'DeltaRequest'; sinceClock: VectorClock }
  | { type: 'DeltaResponse'; deltas: DeltaBatch; hasMore: boolean }
  | { type: 'FullState'; state: number[]; clock: VectorClock }
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
  /** Message payload */
  payload: SyncPayload;
  /** Sender's current vector clock */
  clock: VectorClock;
  /** Timestamp in milliseconds since epoch */
  timestamp: number;
}

export function createSyncMessage(
  id: number,
  sender: string,
  payload: SyncPayload,
  clock: VectorClock
): SyncMessage {
  return {
    id,
    sender,
    payload,
    clock,
    timestamp: Date.now(),
  };
}

// =============================================================================
// Connection State
// =============================================================================

/**
 * Connection state with a peer.
 */
export type PeerConnectionState =
  | 'Discovered'
  | 'Syncing'
  | 'Synced'
  | 'Disconnected'
  | 'Gone';

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
  /** Last message timestamp */
  lastSeen: number | null;
  /** Pending acknowledgments: messageId -> sentTime */
  pendingAcks: Map<number, number>;
  /** RTT estimate in milliseconds */
  rttEstimate: number | null;
}

export function createPeerState(info: PeerInfo, clock: VectorClock): PeerState {
  return {
    info,
    lastClock: clock,
    connectionState: 'Discovered',
    lastSeen: null,
    pendingAcks: new Map(),
    rttEstimate: null,
  };
}

// =============================================================================
// Signaling Messages (for WebSocket relay)
// =============================================================================

/**
 * Messages sent to/from the signaling server.
 */
export type SignalingMessage =
  | { type: 'join'; roomId: string; peerId: string; peerName?: string }
  | { type: 'leave'; roomId: string; peerId: string }
  | { type: 'peers'; roomId: string; peers: Array<{ id: string; name?: string }> }
  | { type: 'peer-joined'; roomId: string; peerId: string; peerName?: string }
  | { type: 'peer-left'; roomId: string; peerId: string }
  | { type: 'offer'; fromPeerId: string; toPeerId: string; sdp: string }
  | { type: 'answer'; fromPeerId: string; toPeerId: string; sdp: string }
  | { type: 'ice-candidate'; fromPeerId: string; toPeerId: string; candidate: string }
  | { type: 'error'; message: string };

// =============================================================================
// Utilities
// =============================================================================

/**
 * Generate a UUID v4.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Protocol version constant.
 */
export const PROTOCOL_VERSION = 1;
