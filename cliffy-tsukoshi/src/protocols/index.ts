/**
 * Distributed protocols for cliffy-tsukoshi.
 *
 * This module provides CRDT, consensus, and synchronization implementations
 * using Clifford algebra for coordination-free distributed systems.
 *
 * @example
 * ```typescript
 * import {
 *   GeometricCRDT,
 *   VectorClock,
 *   SyncState,
 *   GeometricConsensus,
 * } from 'cliffy-tsukoshi/protocols';
 * ```
 *
 * @packageDocumentation
 */

// Vector Clock - causal ordering
export { VectorClock } from './vector-clock.js';

// CRDT - conflict-free replicated data types
export {
  GeometricCRDT,
  GeometricOperation,
  OperationType,
  geometricMean,
} from './crdt.js';

// Lattice - conflict resolution
export {
  GeometricLattice,
  GA3Lattice,
  ComponentLattice,
  latticeJoin,
  latticeMeet,
} from './lattice.js';

// Delta - efficient state synchronization
export {
  StateDelta,
  DeltaEncoding,
  DeltaBatch,
  additiveDelta,
  multiplicativeDelta,
  compressedDelta,
  computeDelta,
  computeDeltaCompressed,
  applyDelta,
  applyAdditiveDelta,
  estimateDeltaSize,
  isApplicableTo,
  computeSavings,
} from './delta.js';

// Storage - persistence layer
export {
  Snapshot,
  StoredOperation,
  StorageStats,
  GeometricStore,
  MemoryStore,
  MemoryStoreConfig,
  RecoveryResult,
  recoverState,
} from './storage.js';

// Sync - P2P synchronization protocol
export {
  SyncMessage,
  SyncPayload,
  PeerInfo,
  PeerCapabilities,
  PeerConnectionState,
  PeerState,
  SyncConfig,
  SyncState,
  defaultCapabilities,
  createPeerState,
} from './sync.js';

// Consensus - distributed agreement
export {
  ConsensusMessage,
  MessageType,
  ConsensusMessageHandler,
  GeometricConsensus,
} from './consensus.js';
