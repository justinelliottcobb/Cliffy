/**
 * WebRTC P2P Synchronization
 *
 * Real WebRTC-based peer-to-peer communication for Cliffy.
 */

// Types
export {
  type VectorClock,
  type DeltaEncoding,
  type StateDelta,
  type DeltaBatch,
  type PeerCapabilities,
  type PeerInfo,
  type SyncPayload,
  type SyncMessage,
  type PeerConnectionState,
  type PeerState,
  type SignalingMessage,
  createVectorClock,
  tickClock,
  mergeClock,
  getClockTime,
  clockHappensBefore,
  createDeltaBatch,
  defaultCapabilities,
  createPeerState,
  createSyncMessage,
  generateUUID,
  PROTOCOL_VERSION,
} from './types';

// Codec
export { encode, decode, encodeSignaling, decodeSignaling } from './codec';

// Transport
export {
  WebRTCTransport,
  type TransportConfig,
  type PeerConnectionInfo,
  type TransportEvents,
} from './transport';

// Signaling
export {
  SignalingClient,
  type SignalingConfig,
  type SignalingEvents,
} from './signaling';

// Peer Manager
export {
  PeerManager,
  type PeerManagerConfig,
  type PeerManagerEvents,
  type ConnectedPeer,
} from './peer-manager';
