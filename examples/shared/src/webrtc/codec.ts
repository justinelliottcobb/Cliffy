/**
 * Binary Codec for WebRTC DataChannel
 *
 * Provides efficient binary serialization for SyncMessage using a custom
 * binary format. This avoids external dependencies while maintaining
 * compact message sizes suitable for real-time sync.
 *
 * Wire format:
 * - 4 bytes: message ID (uint32)
 * - 36 bytes: sender UUID (string)
 * - 8 bytes: timestamp (uint64)
 * - 1 byte: payload type
 * - Variable: clock data
 * - Variable: payload data
 */

import type {
  SyncMessage,
  SyncPayload,
  VectorClock,
  PeerInfo,
  DeltaBatch,
  StateDelta,
  DeltaEncoding,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const PAYLOAD_TYPES = {
  Hello: 0,
  ClockRequest: 1,
  ClockResponse: 2,
  DeltaRequest: 3,
  DeltaResponse: 4,
  FullState: 5,
  Heartbeat: 6,
  Ack: 7,
  Goodbye: 8,
} as const;

const DELTA_ENCODING = {
  Additive: 0,
  Multiplicative: 1,
  Compressed: 2,
} as const;

// =============================================================================
// Encoder
// =============================================================================

class BinaryEncoder {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number;

  constructor(initialSize = 1024) {
    this.buffer = new ArrayBuffer(initialSize);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  private ensureCapacity(additionalBytes: number): void {
    if (this.offset + additionalBytes > this.buffer.byteLength) {
      const newSize = Math.max(
        this.buffer.byteLength * 2,
        this.offset + additionalBytes
      );
      const newBuffer = new ArrayBuffer(newSize);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
      this.view = new DataView(this.buffer);
    }
  }

  writeUint8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeUint32(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  writeFloat64(value: number): void {
    this.ensureCapacity(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }

  writeBigUint64(value: bigint): void {
    this.ensureCapacity(8);
    this.view.setBigUint64(this.offset, value, true);
    this.offset += 8;
  }

  writeString(value: string): void {
    const encoded = new TextEncoder().encode(value);
    this.writeUint32(encoded.length);
    this.ensureCapacity(encoded.length);
    new Uint8Array(this.buffer, this.offset).set(encoded);
    this.offset += encoded.length;
  }

  writeBoolean(value: boolean): void {
    this.writeUint8(value ? 1 : 0);
  }

  writeVectorClock(clock: VectorClock): void {
    const entries = Object.entries(clock.entries);
    this.writeUint32(entries.length);
    for (const [nodeId, time] of entries) {
      this.writeString(nodeId);
      this.writeUint32(time);
    }
  }

  writeFloat64Array(arr: number[]): void {
    this.writeUint32(arr.length);
    for (const val of arr) {
      this.writeFloat64(val);
    }
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer, 0, this.offset);
  }
}

// =============================================================================
// Decoder
// =============================================================================

class BinaryDecoder {
  private view: DataView;
  private offset: number;

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.offset = 0;
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat64(): number {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readBigUint64(): bigint {
    const value = this.view.getBigUint64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readString(): string {
    const length = this.readUint32();
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length);
    this.offset += length;
    return new TextDecoder().decode(bytes);
  }

  readBoolean(): boolean {
    return this.readUint8() !== 0;
  }

  readVectorClock(): VectorClock {
    const count = this.readUint32();
    const entries: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
      const nodeId = this.readString();
      const time = this.readUint32();
      entries[nodeId] = time;
    }
    return { entries };
  }

  readFloat64Array(): number[] {
    const length = this.readUint32();
    const arr: number[] = [];
    for (let i = 0; i < length; i++) {
      arr.push(this.readFloat64());
    }
    return arr;
  }
}

// =============================================================================
// Payload Encoding/Decoding
// =============================================================================

function encodePeerInfo(encoder: BinaryEncoder, info: PeerInfo): void {
  encoder.writeString(info.nodeId);
  encoder.writeBoolean(info.name !== undefined);
  if (info.name !== undefined) {
    encoder.writeString(info.name);
  }
  encoder.writeBoolean(info.capabilities.compressedDeltas);
  encoder.writeBoolean(info.capabilities.batchOperations);
  encoder.writeUint32(info.capabilities.maxBatchSize);
  encoder.writeBoolean(info.capabilities.fullStateSync);
  encoder.writeUint32(info.protocolVersion);
}

function decodePeerInfo(decoder: BinaryDecoder): PeerInfo {
  const nodeId = decoder.readString();
  const hasName = decoder.readBoolean();
  const name = hasName ? decoder.readString() : undefined;
  const capabilities = {
    compressedDeltas: decoder.readBoolean(),
    batchOperations: decoder.readBoolean(),
    maxBatchSize: decoder.readUint32(),
    fullStateSync: decoder.readBoolean(),
  };
  const protocolVersion = decoder.readUint32();
  return { nodeId, name, capabilities, protocolVersion };
}

function encodeDeltaEncoding(encoder: BinaryEncoder, encoding: DeltaEncoding): void {
  encoder.writeUint8(DELTA_ENCODING[encoding]);
}

function decodeDeltaEncoding(decoder: BinaryDecoder): DeltaEncoding {
  const value = decoder.readUint8();
  switch (value) {
    case 0: return 'Additive';
    case 1: return 'Multiplicative';
    case 2: return 'Compressed';
    default: return 'Additive';
  }
}

function encodeStateDelta(encoder: BinaryEncoder, delta: StateDelta): void {
  encoder.writeFloat64Array(delta.transform);
  encodeDeltaEncoding(encoder, delta.encoding);
  encoder.writeVectorClock(delta.fromClock);
  encoder.writeVectorClock(delta.toClock);
  encoder.writeString(delta.sourceNode);
}

function decodeStateDelta(decoder: BinaryDecoder): StateDelta {
  return {
    transform: decoder.readFloat64Array(),
    encoding: decodeDeltaEncoding(decoder),
    fromClock: decoder.readVectorClock(),
    toClock: decoder.readVectorClock(),
    sourceNode: decoder.readString(),
  };
}

function encodeDeltaBatch(encoder: BinaryEncoder, batch: DeltaBatch): void {
  encoder.writeUint32(batch.deltas.length);
  for (const delta of batch.deltas) {
    encodeStateDelta(encoder, delta);
  }
  encoder.writeVectorClock(batch.combinedClock);
}

function decodeDeltaBatch(decoder: BinaryDecoder): DeltaBatch {
  const count = decoder.readUint32();
  const deltas: StateDelta[] = [];
  for (let i = 0; i < count; i++) {
    deltas.push(decodeStateDelta(decoder));
  }
  const combinedClock = decoder.readVectorClock();
  return { deltas, combinedClock };
}

function encodePayload(encoder: BinaryEncoder, payload: SyncPayload): void {
  switch (payload.type) {
    case 'Hello':
      encoder.writeUint8(PAYLOAD_TYPES.Hello);
      encodePeerInfo(encoder, payload.info);
      break;

    case 'ClockRequest':
      encoder.writeUint8(PAYLOAD_TYPES.ClockRequest);
      break;

    case 'ClockResponse':
      encoder.writeUint8(PAYLOAD_TYPES.ClockResponse);
      encoder.writeVectorClock(payload.clock);
      break;

    case 'DeltaRequest':
      encoder.writeUint8(PAYLOAD_TYPES.DeltaRequest);
      encoder.writeVectorClock(payload.sinceClock);
      break;

    case 'DeltaResponse':
      encoder.writeUint8(PAYLOAD_TYPES.DeltaResponse);
      encodeDeltaBatch(encoder, payload.deltas);
      encoder.writeBoolean(payload.hasMore);
      break;

    case 'FullState':
      encoder.writeUint8(PAYLOAD_TYPES.FullState);
      encoder.writeFloat64Array(payload.state);
      encoder.writeVectorClock(payload.clock);
      break;

    case 'Heartbeat':
      encoder.writeUint8(PAYLOAD_TYPES.Heartbeat);
      break;

    case 'Ack':
      encoder.writeUint8(PAYLOAD_TYPES.Ack);
      encoder.writeUint32(payload.messageId);
      encoder.writeVectorClock(payload.appliedClock);
      break;

    case 'Goodbye':
      encoder.writeUint8(PAYLOAD_TYPES.Goodbye);
      break;
  }
}

function decodePayload(decoder: BinaryDecoder): SyncPayload {
  const payloadType = decoder.readUint8();

  switch (payloadType) {
    case PAYLOAD_TYPES.Hello:
      return { type: 'Hello', info: decodePeerInfo(decoder) };

    case PAYLOAD_TYPES.ClockRequest:
      return { type: 'ClockRequest' };

    case PAYLOAD_TYPES.ClockResponse:
      return { type: 'ClockResponse', clock: decoder.readVectorClock() };

    case PAYLOAD_TYPES.DeltaRequest:
      return { type: 'DeltaRequest', sinceClock: decoder.readVectorClock() };

    case PAYLOAD_TYPES.DeltaResponse:
      return {
        type: 'DeltaResponse',
        deltas: decodeDeltaBatch(decoder),
        hasMore: decoder.readBoolean(),
      };

    case PAYLOAD_TYPES.FullState:
      return {
        type: 'FullState',
        state: decoder.readFloat64Array(),
        clock: decoder.readVectorClock(),
      };

    case PAYLOAD_TYPES.Heartbeat:
      return { type: 'Heartbeat' };

    case PAYLOAD_TYPES.Ack:
      return {
        type: 'Ack',
        messageId: decoder.readUint32(),
        appliedClock: decoder.readVectorClock(),
      };

    case PAYLOAD_TYPES.Goodbye:
      return { type: 'Goodbye' };

    default:
      throw new Error(`Unknown payload type: ${payloadType}`);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Encode a SyncMessage to binary format for DataChannel transmission.
 */
export function encode(message: SyncMessage): Uint8Array {
  const encoder = new BinaryEncoder();

  // Message header
  encoder.writeUint32(message.id);
  encoder.writeString(message.sender);
  encoder.writeBigUint64(BigInt(message.timestamp));
  encoder.writeVectorClock(message.clock);

  // Payload
  encodePayload(encoder, message.payload);

  return encoder.toUint8Array();
}

/**
 * Decode a binary message from DataChannel to SyncMessage.
 */
export function decode(data: Uint8Array): SyncMessage {
  const decoder = new BinaryDecoder(data);

  const id = decoder.readUint32();
  const sender = decoder.readString();
  const timestamp = Number(decoder.readBigUint64());
  const clock = decoder.readVectorClock();
  const payload = decodePayload(decoder);

  return {
    id,
    sender,
    payload,
    clock,
    timestamp,
  };
}

/**
 * Encode a signaling message to JSON string.
 * (Signaling uses JSON over WebSocket for simplicity)
 */
export function encodeSignaling<T>(message: T): string {
  return JSON.stringify(message);
}

/**
 * Decode a signaling message from JSON string.
 */
export function decodeSignaling<T>(data: string): T {
  return JSON.parse(data) as T;
}
