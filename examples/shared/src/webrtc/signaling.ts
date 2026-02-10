/**
 * WebSocket Signaling Client
 *
 * Handles peer discovery and WebRTC signaling through a WebSocket relay server.
 */

import { encodeSignaling, decodeSignaling } from './codec';
import type { SignalingMessage } from './types';

// =============================================================================
// Types
// =============================================================================

export interface SignalingConfig {
  /** WebSocket server URL */
  serverUrl: string;
  /** Reconnection settings */
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delayMs: number;
  };
}

export interface SignalingEvents {
  onConnected: () => void;
  onDisconnected: () => void;
  onPeers: (peers: Array<{ id: string; name?: string }>) => void;
  onPeerJoined: (peerId: string, peerName?: string) => void;
  onPeerLeft: (peerId: string) => void;
  onOffer: (fromPeerId: string, sdp: string) => void;
  onAnswer: (fromPeerId: string, sdp: string) => void;
  onIceCandidate: (fromPeerId: string, candidate: string) => void;
  onError: (error: Error) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Required<SignalingConfig> = {
  serverUrl: 'ws://localhost:8080',
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delayMs: 1000,
  },
};

// =============================================================================
// Signaling Client
// =============================================================================

/**
 * WebSocket signaling client for WebRTC peer discovery.
 */
export class SignalingClient {
  private config: Required<SignalingConfig>;
  private ws: WebSocket | null = null;
  private events: Partial<SignalingEvents> = {};
  private peerId: string;
  private peerName?: string;
  private roomId: string | null = null;
  private reconnectAttempts = 0;
  private isClosing = false;

  constructor(peerId: string, config: Partial<SignalingConfig> = {}) {
    this.peerId = peerId;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      reconnect: { ...DEFAULT_CONFIG.reconnect, ...config.reconnect },
    };
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  onConnected(handler: SignalingEvents['onConnected']): void {
    this.events.onConnected = handler;
  }

  onDisconnected(handler: SignalingEvents['onDisconnected']): void {
    this.events.onDisconnected = handler;
  }

  onPeers(handler: SignalingEvents['onPeers']): void {
    this.events.onPeers = handler;
  }

  onPeerJoined(handler: SignalingEvents['onPeerJoined']): void {
    this.events.onPeerJoined = handler;
  }

  onPeerLeft(handler: SignalingEvents['onPeerLeft']): void {
    this.events.onPeerLeft = handler;
  }

  onOffer(handler: SignalingEvents['onOffer']): void {
    this.events.onOffer = handler;
  }

  onAnswer(handler: SignalingEvents['onAnswer']): void {
    this.events.onAnswer = handler;
  }

  onIceCandidate(handler: SignalingEvents['onIceCandidate']): void {
    this.events.onIceCandidate = handler;
  }

  onError(handler: SignalingEvents['onError']): void {
    this.events.onError = handler;
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connect to the signaling server.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isClosing = false;

      try {
        this.ws = new WebSocket(this.config.serverUrl);
      } catch (error) {
        reject(error);
        return;
      }

      const onOpenHandler = () => {
        this.reconnectAttempts = 0;
        this.events.onConnected?.();
        resolve();
      };

      const onErrorHandler = (event: Event) => {
        this.events.onError?.(new Error(`WebSocket error: ${event}`));
        reject(new Error('Failed to connect to signaling server'));
      };

      this.ws.addEventListener('open', onOpenHandler, { once: true });
      this.ws.addEventListener('error', onErrorHandler, { once: true });

      this.ws.onmessage = (event) => this.handleMessage(event.data);
      this.ws.onclose = () => this.handleClose();
    });
  }

  /**
   * Disconnect from the signaling server.
   */
  disconnect(): void {
    this.isClosing = true;
    if (this.roomId) {
      this.leave();
    }
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Check if connected to the signaling server.
   */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ===========================================================================
  // Room Management
  // ===========================================================================

  /**
   * Join a room for peer discovery.
   */
  join(roomId: string, peerName?: string): void {
    this.roomId = roomId;
    this.peerName = peerName;

    this.send({
      type: 'join',
      roomId,
      peerId: this.peerId,
      peerName,
    });
  }

  /**
   * Leave the current room.
   */
  leave(): void {
    if (this.roomId) {
      this.send({
        type: 'leave',
        roomId: this.roomId,
        peerId: this.peerId,
      });
      this.roomId = null;
    }
  }

  // ===========================================================================
  // Signaling Messages
  // ===========================================================================

  /**
   * Send an SDP offer to a peer.
   */
  sendOffer(toPeerId: string, sdp: string): void {
    this.send({
      type: 'offer',
      fromPeerId: this.peerId,
      toPeerId,
      sdp,
    });
  }

  /**
   * Send an SDP answer to a peer.
   */
  sendAnswer(toPeerId: string, sdp: string): void {
    this.send({
      type: 'answer',
      fromPeerId: this.peerId,
      toPeerId,
      sdp,
    });
  }

  /**
   * Send an ICE candidate to a peer.
   */
  sendIceCandidate(toPeerId: string, candidate: RTCIceCandidate): void {
    this.send({
      type: 'ice-candidate',
      fromPeerId: this.peerId,
      toPeerId,
      candidate: JSON.stringify(candidate.toJSON()),
    });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private send(message: SignalingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(encodeSignaling(message));
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = decodeSignaling<SignalingMessage>(data);

      switch (message.type) {
        case 'peers':
          this.events.onPeers?.(message.peers);
          break;

        case 'peer-joined':
          this.events.onPeerJoined?.(message.peerId, message.peerName);
          break;

        case 'peer-left':
          this.events.onPeerLeft?.(message.peerId);
          break;

        case 'offer':
          this.events.onOffer?.(message.fromPeerId, message.sdp);
          break;

        case 'answer':
          this.events.onAnswer?.(message.fromPeerId, message.sdp);
          break;

        case 'ice-candidate':
          this.events.onIceCandidate?.(message.fromPeerId, message.candidate);
          break;

        case 'error':
          this.events.onError?.(new Error(message.message));
          break;
      }
    } catch (error) {
      this.events.onError?.(error as Error);
    }
  }

  private handleClose(): void {
    this.events.onDisconnected?.();

    // Attempt reconnection if enabled and not intentionally closing
    if (
      !this.isClosing &&
      this.config.reconnect.enabled &&
      this.reconnectAttempts < this.config.reconnect.maxAttempts
    ) {
      this.reconnectAttempts++;
      const delay = this.config.reconnect.delayMs * this.reconnectAttempts;

      setTimeout(async () => {
        try {
          await this.connect();
          // Rejoin room if we were in one
          if (this.roomId) {
            this.join(this.roomId, this.peerName);
          }
        } catch {
          // Reconnection failed, will try again on next close
        }
      }, delay);
    }
  }
}
