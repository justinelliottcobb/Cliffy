/**
 * Peer Manager
 *
 * High-level integration layer combining WebRTC transport and signaling
 * for seamless P2P synchronization.
 */

import { WebRTCTransport, type TransportConfig } from './transport';
import { SignalingClient, type SignalingConfig } from './signaling';
import {
  type SyncMessage,
  type SyncPayload,
  type VectorClock,
  type PeerInfo,
  type PeerState,
  type PeerConnectionState,
  createVectorClock,
  tickClock,
  mergeClock,
  defaultCapabilities,
  generateUUID,
  PROTOCOL_VERSION,
  createPeerState,
} from './types';

// =============================================================================
// Types
// =============================================================================

export interface PeerManagerConfig {
  /** Local peer ID (generated if not provided) */
  peerId?: string;
  /** Local peer display name */
  peerName?: string;
  /** Signaling server configuration */
  signaling: Partial<SignalingConfig> & { serverUrl: string };
  /** WebRTC transport configuration */
  transport?: TransportConfig;
  /** Auto-connect to peers when they join */
  autoConnect?: boolean;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
}

interface InternalConfig {
  peerId: string;
  peerName: string | undefined;
  signaling: Partial<SignalingConfig> & { serverUrl: string };
  transport: TransportConfig;
  autoConnect: boolean;
  heartbeatInterval: number;
}

export interface PeerManagerEvents {
  onReady: () => void;
  onPeerConnected: (peerId: string, peerInfo: PeerInfo) => void;
  onPeerDisconnected: (peerId: string) => void;
  onPeerStateChange: (peerId: string, state: PeerConnectionState) => void;
  onSyncMessage: (peerId: string, message: SyncMessage) => void;
  onError: (error: Error) => void;
}

export interface ConnectedPeer {
  id: string;
  name?: string;
  info: PeerInfo | null;
  state: PeerState | null;
  connected: boolean;
  rtt: number | null;
}

// =============================================================================
// Peer Manager
// =============================================================================

/**
 * High-level manager for P2P connections and state synchronization.
 */
export class PeerManager {
  private config: InternalConfig;
  private transport: WebRTCTransport;
  private signaling: SignalingClient;
  private events: Partial<PeerManagerEvents> = {};

  private localPeerId: string;
  private localPeerInfo: PeerInfo;
  private clock: VectorClock;
  private messageId = 0;

  private peers: Map<string, PeerState> = new Map();
  private peerNames: Map<string, string | undefined> = new Map();
  private roomId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isReady = false;

  constructor(config: PeerManagerConfig) {
    this.localPeerId = config.peerId || generateUUID();
    this.config = {
      peerId: this.localPeerId,
      peerName: config.peerName,
      signaling: config.signaling,
      transport: config.transport || {},
      autoConnect: config.autoConnect ?? true,
      heartbeatInterval: config.heartbeatInterval ?? 5000,
    };

    this.clock = createVectorClock(this.localPeerId);

    this.localPeerInfo = {
      nodeId: this.localPeerId,
      name: config.peerName,
      capabilities: defaultCapabilities(),
      protocolVersion: PROTOCOL_VERSION,
    };

    // Initialize transport and signaling
    this.transport = new WebRTCTransport(this.localPeerId, config.transport);
    this.signaling = new SignalingClient(this.localPeerId, config.signaling);

    this.setupTransportHandlers();
    this.setupSignalingHandlers();
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  onReady(handler: PeerManagerEvents['onReady']): void {
    this.events.onReady = handler;
  }

  onPeerConnected(handler: PeerManagerEvents['onPeerConnected']): void {
    this.events.onPeerConnected = handler;
  }

  onPeerDisconnected(handler: PeerManagerEvents['onPeerDisconnected']): void {
    this.events.onPeerDisconnected = handler;
  }

  onPeerStateChange(handler: PeerManagerEvents['onPeerStateChange']): void {
    this.events.onPeerStateChange = handler;
  }

  onSyncMessage(handler: PeerManagerEvents['onSyncMessage']): void {
    this.events.onSyncMessage = handler;
  }

  onError(handler: PeerManagerEvents['onError']): void {
    this.events.onError = handler;
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Join a room and start peer discovery.
   */
  async join(roomId: string): Promise<void> {
    this.roomId = roomId;

    // Connect to signaling server
    await this.signaling.connect();

    // Join the room
    this.signaling.join(roomId, this.config.peerName);

    // Start heartbeat
    this.startHeartbeat();

    this.isReady = true;
    this.events.onReady?.();
  }

  /**
   * Leave the current room and disconnect.
   */
  leave(): void {
    this.stopHeartbeat();
    this.signaling.leave();
    this.signaling.disconnect();
    this.transport.close();
    this.peers.clear();
    this.peerNames.clear();
    this.roomId = null;
    this.isReady = false;
  }

  /**
   * Manually connect to a specific peer.
   */
  async connectToPeer(peerId: string): Promise<void> {
    if (this.transport.isConnected(peerId)) {
      return;
    }

    // Create offer
    const offer = await this.transport.createOffer(peerId);

    // Send via signaling
    this.signaling.sendOffer(peerId, JSON.stringify(offer));
  }

  // ===========================================================================
  // State Synchronization
  // ===========================================================================

  /**
   * Send a sync message to a specific peer.
   */
  send(peerId: string, payload: SyncPayload): boolean {
    const message = this.createMessage(payload);
    return this.transport.send(peerId, message);
  }

  /**
   * Broadcast a sync message to all connected peers.
   */
  broadcast(payload: SyncPayload): void {
    const message = this.createMessage(payload);
    this.transport.broadcast(message);
  }

  /**
   * Send a Hello message to a peer (called after connection).
   */
  sendHello(peerId: string): void {
    this.send(peerId, { type: 'Hello', info: this.localPeerInfo });
  }

  /**
   * Request full state from a peer.
   */
  requestFullState(peerId: string): void {
    this.send(peerId, { type: 'DeltaRequest', sinceClock: createVectorClock() });
  }

  /**
   * Send a heartbeat to all connected peers.
   */
  sendHeartbeats(): void {
    this.broadcast({ type: 'Heartbeat' });
  }

  // ===========================================================================
  // State Queries
  // ===========================================================================

  /**
   * Get the local peer ID.
   */
  get peerId(): string {
    return this.localPeerId;
  }

  /**
   * Get the local peer name.
   */
  get peerName(): string | undefined {
    return this.config.peerName;
  }

  /**
   * Get the current vector clock.
   */
  getClock(): VectorClock {
    return this.clock;
  }

  /**
   * Tick the local clock and return the new clock.
   */
  tick(): VectorClock {
    this.clock = tickClock(this.clock, this.localPeerId);
    return this.clock;
  }

  /**
   * Check if ready (connected to signaling).
   */
  get ready(): boolean {
    return this.isReady;
  }

  /**
   * Get list of connected peers.
   */
  getConnectedPeers(): ConnectedPeer[] {
    const connected: ConnectedPeer[] = [];

    for (const peerId of this.transport.getConnectedPeers()) {
      const state = this.peers.get(peerId);
      const transportInfo = this.transport.getPeerInfo(peerId);

      connected.push({
        id: peerId,
        name: this.peerNames.get(peerId),
        info: state?.info ?? null,
        state: state ?? null,
        connected: transportInfo?.connected ?? false,
        rtt: state?.rttEstimate ?? null,
      });
    }

    return connected;
  }

  /**
   * Get peer state by ID.
   */
  getPeer(peerId: string): ConnectedPeer | null {
    const state = this.peers.get(peerId);
    const transportInfo = this.transport.getPeerInfo(peerId);

    if (!state && !transportInfo) {
      return null;
    }

    return {
      id: peerId,
      name: this.peerNames.get(peerId),
      info: state?.info ?? null,
      state: state ?? null,
      connected: transportInfo?.connected ?? false,
      rtt: state?.rttEstimate ?? null,
    };
  }

  /**
   * Check if connected to a specific peer.
   */
  isConnected(peerId: string): boolean {
    return this.transport.isConnected(peerId);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setupTransportHandlers(): void {
    this.transport.onMessage((peerId, message) => {
      this.handleSyncMessage(peerId, message);
    });

    this.transport.onPeerConnected((peerId) => {
      // Send Hello after WebRTC connection established
      this.sendHello(peerId);
    });

    this.transport.onPeerDisconnected((peerId) => {
      const state = this.peers.get(peerId);
      if (state) {
        state.connectionState = 'Disconnected';
        this.events.onPeerStateChange?.(peerId, 'Disconnected');
      }
      this.events.onPeerDisconnected?.(peerId);
    });

    this.transport.onIceCandidate((peerId, candidate) => {
      this.signaling.sendIceCandidate(peerId, candidate);
    });

    this.transport.onError((peerId, error) => {
      this.events.onError?.(new Error(`Peer ${peerId}: ${error.message}`));
    });
  }

  private setupSignalingHandlers(): void {
    this.signaling.onPeers((peers) => {
      // Auto-connect to existing peers
      if (this.config.autoConnect) {
        for (const peer of peers) {
          this.peerNames.set(peer.id, peer.name);
          this.connectToPeer(peer.id).catch((error) => {
            this.events.onError?.(error as Error);
          });
        }
      }
    });

    this.signaling.onPeerJoined((peerId, peerName) => {
      this.peerNames.set(peerId, peerName);
      // Wait for the new peer to initiate connection (they will receive peers list)
    });

    this.signaling.onPeerLeft((peerId) => {
      this.peerNames.delete(peerId);
      this.peers.delete(peerId);
      this.transport.closePeer(peerId);
    });

    this.signaling.onOffer(async (fromPeerId, sdp) => {
      try {
        const offer = JSON.parse(sdp) as RTCSessionDescriptionInit;
        const answer = await this.transport.handleOffer(fromPeerId, offer);
        this.signaling.sendAnswer(fromPeerId, JSON.stringify(answer));
      } catch (error) {
        this.events.onError?.(error as Error);
      }
    });

    this.signaling.onAnswer(async (fromPeerId, sdp) => {
      try {
        const answer = JSON.parse(sdp) as RTCSessionDescriptionInit;
        await this.transport.handleAnswer(fromPeerId, answer);
      } catch (error) {
        this.events.onError?.(error as Error);
      }
    });

    this.signaling.onIceCandidate(async (fromPeerId, candidateStr) => {
      try {
        const candidate = JSON.parse(candidateStr) as RTCIceCandidateInit;
        await this.transport.addIceCandidate(fromPeerId, candidate);
      } catch (error) {
        this.events.onError?.(error as Error);
      }
    });

    this.signaling.onError((error) => {
      this.events.onError?.(error);
    });
  }

  private handleSyncMessage(peerId: string, message: SyncMessage): void {
    // Update clock
    this.clock = mergeClock(this.clock, message.clock);

    // Update peer state
    let peerState = this.peers.get(peerId);

    switch (message.payload.type) {
      case 'Hello': {
        const info = message.payload.info;
        if (peerState) {
          peerState.info = info;
          peerState.lastClock = message.clock;
          peerState.lastSeen = Date.now();
          peerState.connectionState = 'Synced';
        } else {
          peerState = createPeerState(info, message.clock);
          peerState.lastSeen = Date.now();
          peerState.connectionState = 'Synced';
          this.peers.set(peerId, peerState);
        }

        this.peerNames.set(peerId, info.name);
        this.events.onPeerConnected?.(peerId, info);
        this.events.onPeerStateChange?.(peerId, 'Synced');

        // Send Hello back if we haven't
        if (!this.transport.getPeerInfo(peerId)?.dataChannel) {
          this.sendHello(peerId);
        }
        break;
      }

      case 'Heartbeat':
        if (peerState) {
          peerState.lastSeen = Date.now();
          peerState.lastClock = message.clock;
        }
        break;

      case 'Ack':
        if (peerState && peerState.pendingAcks.has(message.payload.messageId)) {
          const sentTime = peerState.pendingAcks.get(message.payload.messageId)!;
          const rtt = Date.now() - sentTime;
          peerState.pendingAcks.delete(message.payload.messageId);

          // Exponential moving average for RTT
          if (peerState.rttEstimate === null) {
            peerState.rttEstimate = rtt;
          } else {
            peerState.rttEstimate = peerState.rttEstimate * 0.8 + rtt * 0.2;
          }
        }
        break;

      case 'Goodbye':
        if (peerState) {
          peerState.connectionState = 'Gone';
          this.events.onPeerStateChange?.(peerId, 'Gone');
        }
        this.transport.closePeer(peerId);
        this.peers.delete(peerId);
        break;

      default:
        // Pass other messages to application
        if (peerState) {
          peerState.lastSeen = Date.now();
          peerState.lastClock = message.clock;
        }
        break;
    }

    // Always emit the message for application handling
    this.events.onSyncMessage?.(peerId, message);
  }

  private createMessage(payload: SyncPayload): SyncMessage {
    const id = this.messageId++;
    return {
      id,
      sender: this.localPeerId,
      payload,
      clock: this.clock,
      timestamp: Date.now(),
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeats();
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
