/**
 * Cliffy WebRTC Signaling Server
 *
 * A minimal WebSocket relay server for WebRTC peer discovery and signaling.
 * Tracks rooms and peers, relays offer/answer/ICE messages between peers.
 */

import { WebSocketServer, WebSocket } from 'ws';

// =============================================================================
// Types
// =============================================================================

interface Peer {
  id: string;
  name?: string;
  ws: WebSocket;
  roomId: string | null;
}

interface Room {
  id: string;
  peers: Map<string, Peer>;
}

type SignalingMessage =
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
// Server State
// =============================================================================

const rooms = new Map<string, Room>();
const peersBySocket = new WeakMap<WebSocket, Peer>();
const peersById = new Map<string, Peer>();

// =============================================================================
// Room Management
// =============================================================================

function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = { id: roomId, peers: new Map() };
    rooms.set(roomId, room);
    console.log(`[Room] Created room: ${roomId}`);
  }
  return room;
}

function cleanupRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room && room.peers.size === 0) {
    rooms.delete(roomId);
    console.log(`[Room] Deleted empty room: ${roomId}`);
  }
}

// =============================================================================
// Message Handling
// =============================================================================

function sendToPeer(peer: Peer, message: SignalingMessage): void {
  if (peer.ws.readyState === WebSocket.OPEN) {
    peer.ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(room: Room, message: SignalingMessage, excludePeerId?: string): void {
  for (const [peerId, peer] of room.peers) {
    if (peerId !== excludePeerId) {
      sendToPeer(peer, message);
    }
  }
}

function handleJoin(ws: WebSocket, message: { roomId: string; peerId: string; peerName?: string }): void {
  const { roomId, peerId, peerName } = message;

  // Check if peer already exists
  const existingPeer = peersById.get(peerId);
  if (existingPeer) {
    // Leave previous room if in one
    if (existingPeer.roomId) {
      handleLeave(existingPeer.ws, { roomId: existingPeer.roomId, peerId });
    }
    existingPeer.ws = ws;
  }

  const room = getOrCreateRoom(roomId);
  const peer: Peer = existingPeer ?? { id: peerId, name: peerName, ws, roomId };
  peer.roomId = roomId;
  peer.name = peerName;

  room.peers.set(peerId, peer);
  peersBySocket.set(ws, peer);
  peersById.set(peerId, peer);

  console.log(`[Join] Peer ${peerId}${peerName ? ` (${peerName})` : ''} joined room ${roomId}`);

  // Send current peer list to the new peer
  const peerList = Array.from(room.peers.values())
    .filter(p => p.id !== peerId)
    .map(p => ({ id: p.id, name: p.name }));

  sendToPeer(peer, {
    type: 'peers',
    roomId,
    peers: peerList,
  });

  // Notify other peers
  broadcastToRoom(room, {
    type: 'peer-joined',
    roomId,
    peerId,
    peerName,
  }, peerId);
}

function handleLeave(ws: WebSocket, message: { roomId: string; peerId: string }): void {
  const { roomId, peerId } = message;
  const room = rooms.get(roomId);

  if (room) {
    const peer = room.peers.get(peerId);
    if (peer) {
      room.peers.delete(peerId);
      peer.roomId = null;

      console.log(`[Leave] Peer ${peerId} left room ${roomId}`);

      // Notify other peers
      broadcastToRoom(room, {
        type: 'peer-left',
        roomId,
        peerId,
      });

      cleanupRoom(roomId);
    }
  }
}

function handleOffer(message: { fromPeerId: string; toPeerId: string; sdp: string }): void {
  const targetPeer = peersById.get(message.toPeerId);
  if (targetPeer) {
    sendToPeer(targetPeer, {
      type: 'offer',
      fromPeerId: message.fromPeerId,
      toPeerId: message.toPeerId,
      sdp: message.sdp,
    });
  }
}

function handleAnswer(message: { fromPeerId: string; toPeerId: string; sdp: string }): void {
  const targetPeer = peersById.get(message.toPeerId);
  if (targetPeer) {
    sendToPeer(targetPeer, {
      type: 'answer',
      fromPeerId: message.fromPeerId,
      toPeerId: message.toPeerId,
      sdp: message.sdp,
    });
  }
}

function handleIceCandidate(message: { fromPeerId: string; toPeerId: string; candidate: string }): void {
  const targetPeer = peersById.get(message.toPeerId);
  if (targetPeer) {
    sendToPeer(targetPeer, {
      type: 'ice-candidate',
      fromPeerId: message.fromPeerId,
      toPeerId: message.toPeerId,
      candidate: message.candidate,
    });
  }
}

function handleMessage(ws: WebSocket, data: string): void {
  try {
    const message = JSON.parse(data) as SignalingMessage;

    switch (message.type) {
      case 'join':
        handleJoin(ws, message);
        break;

      case 'leave':
        handleLeave(ws, message);
        break;

      case 'offer':
        handleOffer(message);
        break;

      case 'answer':
        handleAnswer(message);
        break;

      case 'ice-candidate':
        handleIceCandidate(message);
        break;

      default:
        console.warn(`[Warning] Unknown message type: ${(message as { type: string }).type}`);
    }
  } catch (error) {
    console.error('[Error] Failed to parse message:', error);
    const peer = peersBySocket.get(ws);
    if (peer) {
      sendToPeer(peer, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }
}

function handleDisconnect(ws: WebSocket): void {
  const peer = peersBySocket.get(ws);
  if (peer && peer.roomId) {
    handleLeave(ws, { roomId: peer.roomId, peerId: peer.id });
    peersById.delete(peer.id);
  }
  peersBySocket.delete(ws);
}

// =============================================================================
// Server Initialization
// =============================================================================

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

const wss = new WebSocketServer({ port: PORT, host: HOST });

wss.on('connection', (ws) => {
  console.log('[Connect] New WebSocket connection');

  ws.on('message', (data) => {
    handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    handleDisconnect(ws);
    console.log('[Disconnect] WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('[Error] WebSocket error:', error);
    handleDisconnect(ws);
  });
});

wss.on('listening', () => {
  console.log(`[Server] Cliffy Signaling Server listening on ws://${HOST}:${PORT}`);
});

wss.on('error', (error) => {
  console.error('[Server] Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  wss.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...');
  wss.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
