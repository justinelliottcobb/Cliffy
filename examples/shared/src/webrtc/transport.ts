/**
 * WebRTC Transport Layer
 *
 * Wraps RTCPeerConnection and RTCDataChannel to provide a clean API
 * for peer-to-peer data transmission.
 */

import { encode, decode } from './codec';
import type { SyncMessage } from './types';

// =============================================================================
// Types
// =============================================================================

export interface TransportConfig {
  /** ICE servers for NAT traversal */
  iceServers?: RTCIceServer[];
  /** Data channel configuration */
  dataChannelOptions?: RTCDataChannelInit;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
}

export interface PeerConnectionInfo {
  peerId: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  state: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
  connected: boolean;
}

export interface TransportEvents {
  onMessage: (peerId: string, message: SyncMessage) => void;
  onPeerConnected: (peerId: string) => void;
  onPeerDisconnected: (peerId: string) => void;
  onIceCandidate: (peerId: string, candidate: RTCIceCandidate) => void;
  onError: (peerId: string, error: Error) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const DEFAULT_DATA_CHANNEL_OPTIONS: RTCDataChannelInit = {
  ordered: true,
  maxRetransmits: 3,
};

const DEFAULT_CONFIG: Required<TransportConfig> = {
  iceServers: DEFAULT_ICE_SERVERS,
  dataChannelOptions: DEFAULT_DATA_CHANNEL_OPTIONS,
  connectionTimeout: 30000,
};

// =============================================================================
// WebRTC Transport
// =============================================================================

/**
 * WebRTC transport layer for peer-to-peer communication.
 */
export class WebRTCTransport {
  private config: Required<TransportConfig>;
  private peers: Map<string, PeerConnectionInfo> = new Map();
  private events: Partial<TransportEvents> = {};
  private localPeerId: string;

  constructor(localPeerId: string, config: TransportConfig = {}) {
    this.localPeerId = localPeerId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  /**
   * Set the message handler for incoming sync messages.
   */
  onMessage(handler: TransportEvents['onMessage']): void {
    this.events.onMessage = handler;
  }

  /**
   * Set the handler for peer connection events.
   */
  onPeerConnected(handler: TransportEvents['onPeerConnected']): void {
    this.events.onPeerConnected = handler;
  }

  /**
   * Set the handler for peer disconnection events.
   */
  onPeerDisconnected(handler: TransportEvents['onPeerDisconnected']): void {
    this.events.onPeerDisconnected = handler;
  }

  /**
   * Set the handler for ICE candidate generation.
   */
  onIceCandidate(handler: TransportEvents['onIceCandidate']): void {
    this.events.onIceCandidate = handler;
  }

  /**
   * Set the error handler.
   */
  onError(handler: TransportEvents['onError']): void {
    this.events.onError = handler;
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Create an offer to connect to a peer.
   * Returns the SDP offer to send via signaling.
   */
  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.getOrCreateConnection(peerId);

    // Create data channel (only offerer creates it)
    const dataChannel = pc.createDataChannel('sync', this.config.dataChannelOptions);
    this.setupDataChannel(peerId, dataChannel);

    const peerInfo = this.peers.get(peerId)!;
    peerInfo.dataChannel = dataChannel;

    // Create and set local description
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return offer;
  }

  /**
   * Handle an incoming offer from a peer.
   * Returns the SDP answer to send via signaling.
   */
  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.getOrCreateConnection(peerId);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }

  /**
   * Handle an incoming answer from a peer.
   */
  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerInfo = this.peers.get(peerId);
    if (!peerInfo) {
      throw new Error(`Unknown peer: ${peerId}`);
    }

    await peerInfo.connection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Add an ICE candidate for a peer.
   */
  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerInfo = this.peers.get(peerId);
    if (!peerInfo) {
      throw new Error(`Unknown peer: ${peerId}`);
    }

    await peerInfo.connection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // ===========================================================================
  // Data Transmission
  // ===========================================================================

  /**
   * Send a sync message to a specific peer.
   */
  send(peerId: string, message: SyncMessage): boolean {
    const peerInfo = this.peers.get(peerId);
    if (!peerInfo?.dataChannel || peerInfo.dataChannel.readyState !== 'open') {
      return false;
    }

    try {
      const encoded = encode(message);
      // Copy to a new ArrayBuffer to ensure clean buffer without SharedArrayBuffer issues
      const buffer = new ArrayBuffer(encoded.byteLength);
      new Uint8Array(buffer).set(encoded);
      peerInfo.dataChannel.send(buffer);
      return true;
    } catch (error) {
      this.events.onError?.(peerId, error as Error);
      return false;
    }
  }

  /**
   * Broadcast a sync message to all connected peers.
   */
  broadcast(message: SyncMessage): void {
    for (const [peerId, peerInfo] of this.peers) {
      if (peerInfo.connected && peerInfo.dataChannel?.readyState === 'open') {
        this.send(peerId, message);
      }
    }
  }

  // ===========================================================================
  // State Queries
  // ===========================================================================

  /**
   * Check if connected to a peer.
   */
  isConnected(peerId: string): boolean {
    const peerInfo = this.peers.get(peerId);
    return peerInfo?.connected ?? false;
  }

  /**
   * Get list of connected peer IDs.
   */
  getConnectedPeers(): string[] {
    return Array.from(this.peers.entries())
      .filter(([, info]) => info.connected)
      .map(([id]) => id);
  }

  /**
   * Get connection info for a peer.
   */
  getPeerInfo(peerId: string): PeerConnectionInfo | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all peer connection info.
   */
  getAllPeers(): Map<string, PeerConnectionInfo> {
    return new Map(this.peers);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Close connection to a specific peer.
   */
  closePeer(peerId: string): void {
    const peerInfo = this.peers.get(peerId);
    if (peerInfo) {
      peerInfo.dataChannel?.close();
      peerInfo.connection.close();
      this.peers.delete(peerId);
    }
  }

  /**
   * Close all connections and clean up.
   */
  close(): void {
    for (const peerId of this.peers.keys()) {
      this.closePeer(peerId);
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private getOrCreateConnection(peerId: string): RTCPeerConnection {
    let peerInfo = this.peers.get(peerId);

    if (!peerInfo) {
      const pc = new RTCPeerConnection({
        iceServers: this.config.iceServers,
      });

      peerInfo = {
        peerId,
        connection: pc,
        dataChannel: null,
        state: pc.connectionState,
        iceState: pc.iceConnectionState,
        connected: false,
      };

      this.peers.set(peerId, peerInfo);
      this.setupConnectionHandlers(peerId, pc);
    }

    return peerInfo.connection;
  }

  private setupConnectionHandlers(peerId: string, pc: RTCPeerConnection): void {
    // ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onIceCandidate?.(peerId, event.candidate);
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        peerInfo.state = pc.connectionState;

        if (pc.connectionState === 'connected') {
          peerInfo.connected = true;
          this.events.onPeerConnected?.(peerId);
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          const wasConnected = peerInfo.connected;
          peerInfo.connected = false;
          if (wasConnected) {
            this.events.onPeerDisconnected?.(peerId);
          }
        }
      }
    };

    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        peerInfo.iceState = pc.iceConnectionState;
      }
    };

    // Data channel (for answerer - receives channel from offerer)
    pc.ondatachannel = (event) => {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        peerInfo.dataChannel = event.channel;
        this.setupDataChannel(peerId, event.channel);
      }
    };
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        peerInfo.connected = true;
        this.events.onPeerConnected?.(peerId);
      }
    };

    channel.onclose = () => {
      const peerInfo = this.peers.get(peerId);
      if (peerInfo) {
        const wasConnected = peerInfo.connected;
        peerInfo.connected = false;
        if (wasConnected) {
          this.events.onPeerDisconnected?.(peerId);
        }
      }
    };

    channel.onerror = (event) => {
      this.events.onError?.(peerId, new Error(`DataChannel error: ${event}`));
    };

    channel.onmessage = (event) => {
      try {
        const data = new Uint8Array(event.data as ArrayBuffer);
        const message = decode(data);
        this.events.onMessage?.(peerId, message);
      } catch (error) {
        this.events.onError?.(peerId, error as Error);
      }
    };
  }
}
