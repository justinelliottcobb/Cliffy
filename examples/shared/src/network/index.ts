/**
 * Network utilities for Cliffy examples
 *
 * Provides both simulation and real WebRTC networking.
 */

// Simulation (for testing without network)
export { SimulatedPeer, type PeerConfig } from './SimulatedPeer';
export { NetworkSimulator, type NetworkConfig } from './NetworkSimulator';
export { LatencyModel, type LatencyConfig } from './LatencyModel';

// Real WebRTC (re-exported from webrtc module)
export {
  PeerManager,
  WebRTCTransport,
  SignalingClient,
  type PeerManagerConfig,
  type ConnectedPeer,
} from '../webrtc';
