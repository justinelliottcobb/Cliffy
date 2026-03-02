/**
 * Geometric consensus protocol implementations.
 *
 * Uses geometric algebra for conflict-free consensus in distributed systems.
 * The geometric mean provides a mathematically elegant way to combine
 * proposals while maintaining convergence guarantees.
 *
 * @example
 * ```typescript
 * import { GeometricConsensus, latticeJoin, latticeMeet } from 'cliffy-tsukoshi/protocols';
 * import { scalar, fromCoefficients } from 'cliffy-tsukoshi';
 *
 * const nodeId = crypto.randomUUID();
 * const consensus = new GeometricConsensus(nodeId, scalar(0));
 *
 * // Propose a value
 * consensus.propose(scalar(5));
 *
 * // Compute consensus from multiple proposals
 * const result = consensus.geometricConsensus([
 *   scalar(1), scalar(2), scalar(4)
 * ], 0.1);
 * ```
 */

import type { GA3 } from '../ga3.js';
import {
  zero,
  magnitude,
  sub,
  add,
  fromCoefficients,
} from '../ga3.js';
import { GeometricCRDT, OperationType, geometricMean } from './crdt.js';

/**
 * Types of consensus messages.
 */
export type MessageType =
  | { type: 'Propose'; value: GA3 }
  | { type: 'Vote'; accept: boolean; value: GA3 }
  | { type: 'Commit'; value: GA3 }
  | { type: 'Sync'; crdt: GeometricCRDT };

/**
 * A message in the consensus protocol.
 */
export interface ConsensusMessage {
  senderId: string;
  proposal: GA3;
  round: number;
  messageType: MessageType;
}

/**
 * Event handler for consensus messages.
 */
export type ConsensusMessageHandler = (message: ConsensusMessage) => void;

/**
 * A geometric consensus protocol implementation.
 *
 * Uses geometric mean for proposal combining and supports both
 * synchronous and asynchronous consensus patterns.
 */
export class GeometricConsensus {
  private nodeId: string;
  private currentRound: number;
  private proposals: Map<number, GA3[]>;
  private votes: Map<number, Map<string, boolean>>;
  private committedStates: Map<number, GA3>;
  private crdtState: GeometricCRDT;
  private messageHandlers: ConsensusMessageHandler[];

  constructor(nodeId: string, initialState: GA3) {
    this.nodeId = nodeId;
    this.currentRound = 0;
    this.proposals = new Map();
    this.votes = new Map();
    this.committedStates = new Map();
    this.crdtState = new GeometricCRDT(nodeId, initialState);
    this.messageHandlers = [];
  }

  /**
   * Subscribe to outgoing consensus messages.
   */
  onMessage(handler: ConsensusMessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index >= 0) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Broadcast a message to all handlers.
   */
  private broadcast(message: ConsensusMessage): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  /**
   * Propose a value for consensus.
   */
  propose(value: GA3): number {
    const round = this.currentRound++;

    const message: ConsensusMessage = {
      senderId: this.nodeId,
      proposal: value,
      round,
      messageType: { type: 'Propose', value },
    };

    this.broadcast(message);
    return round;
  }

  /**
   * Compute consensus from a set of proposals using geometric algebra.
   */
  geometricConsensus(proposals: GA3[], threshold: number): GA3 {
    if (proposals.length === 0) {
      return zero();
    }

    // Compute geometric mean of all proposals
    const consensusValue = geometricMean(proposals);

    // Check if consensus meets threshold (based on geometric distance)
    let maxDistance = 0;
    for (const proposal of proposals) {
      const diff = sub(consensusValue, proposal);
      const dist = magnitude(diff);
      maxDistance = Math.max(maxDistance, dist);
    }

    if (maxDistance <= threshold) {
      return consensusValue;
    } else {
      // No consensus reached, return weighted geometric mean
      return this.weightedGeometricConsensus(proposals);
    }
  }

  /**
   * Compute weighted geometric consensus based on magnitudes.
   */
  private weightedGeometricConsensus(proposals: GA3[]): GA3 {
    // Weight proposals by their geometric magnitude
    const weights = proposals.map(p => magnitude(p));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    if (totalWeight === 0) {
      return zero();
    }

    // Weighted average
    let result = zero();
    for (let i = 0; i < proposals.length; i++) {
      const coeffs = proposals[i] as number[];
      const scaledCoeffs = coeffs.map(c => c * weights[i] / totalWeight);
      result = add(result, fromCoefficients(scaledCoeffs));
    }

    return result;
  }

  /**
   * Handle an incoming proposal.
   */
  receiveProposal(_senderId: string, value: GA3, round: number): void {
    if (!this.proposals.has(round)) {
      this.proposals.set(round, []);
    }
    this.proposals.get(round)!.push(value);
  }

  /**
   * Cast a vote on a proposal.
   */
  vote(round: number, accept: boolean, value: GA3): void {
    if (!this.votes.has(round)) {
      this.votes.set(round, new Map());
    }
    this.votes.get(round)!.set(this.nodeId, accept);

    const message: ConsensusMessage = {
      senderId: this.nodeId,
      proposal: value,
      round,
      messageType: { type: 'Vote', accept, value },
    };

    this.broadcast(message);
  }

  /**
   * Handle an incoming vote.
   */
  receiveVote(senderId: string, round: number, accept: boolean): void {
    if (!this.votes.has(round)) {
      this.votes.set(round, new Map());
    }
    this.votes.get(round)!.set(senderId, accept);
  }

  /**
   * Try to commit a round if we have enough votes.
   */
  tryCommit(round: number, participantCount: number): GA3 | null {
    const roundVotes = this.votes.get(round);
    if (!roundVotes) {
      return null;
    }

    const yesVotes = Array.from(roundVotes.values()).filter(v => v).length;

    if (yesVotes > participantCount / 2) {
      const proposals = this.proposals.get(round) ?? [];
      const consensusValue = this.geometricConsensus(proposals, 0.1);

      // Commit
      this.committedStates.set(round, consensusValue);

      // Update CRDT state
      const op = this.crdtState.createOperation(consensusValue, OperationType.Addition);
      this.crdtState.applyOperation(op);

      const message: ConsensusMessage = {
        senderId: this.nodeId,
        proposal: consensusValue,
        round,
        messageType: { type: 'Commit', value: consensusValue },
      };

      this.broadcast(message);
      return consensusValue;
    }

    return null;
  }

  /**
   * Handle an incoming commit.
   */
  receiveCommit(value: GA3, round: number): void {
    if (!this.committedStates.has(round)) {
      this.committedStates.set(round, value);

      // Update CRDT state
      const op = this.crdtState.createOperation(value, OperationType.Addition);
      this.crdtState.applyOperation(op);
    }
  }

  /**
   * Sync CRDT state with another node.
   */
  syncCrdtState(): void {
    const message: ConsensusMessage = {
      senderId: this.nodeId,
      proposal: this.crdtState.state,
      round: this.currentRound,
      messageType: { type: 'Sync', crdt: this.crdtState },
    };

    this.broadcast(message);
  }

  /**
   * Handle an incoming sync message.
   */
  handleSyncMessage(crdtState: GeometricCRDT): void {
    this.crdtState = this.crdtState.merge(crdtState);
  }

  /**
   * Get the current consensus state.
   */
  getCurrentState(): GA3 {
    return this.crdtState.state;
  }

  /**
   * Get the underlying CRDT.
   */
  getCrdt(): GeometricCRDT {
    return this.crdtState;
  }

  /**
   * Get the current round number.
   */
  getCurrentRound(): number {
    return this.currentRound;
  }

  /**
   * Get proposals for a round.
   */
  getProposals(round: number): GA3[] {
    return this.proposals.get(round) ?? [];
  }

  /**
   * Get votes for a round.
   */
  getVotes(round: number): Map<string, boolean> {
    return this.votes.get(round) ?? new Map();
  }

  /**
   * Check if a round has been committed.
   */
  isCommitted(round: number): boolean {
    return this.committedStates.has(round);
  }

  /**
   * Get committed value for a round.
   */
  getCommittedValue(round: number): GA3 | null {
    return this.committedStates.get(round) ?? null;
  }
}

/**
 * Compute the component-wise lattice join (least upper bound).
 */
export function latticeJoin(a: GA3, b: GA3): GA3 {
  const aCoeffs = a as number[];
  const bCoeffs = b as number[];
  const result = aCoeffs.map((c, i) => Math.max(c, bCoeffs[i]));
  return fromCoefficients(result);
}

/**
 * Compute the component-wise lattice meet (greatest lower bound).
 */
export function latticeMeet(a: GA3, b: GA3): GA3 {
  const aCoeffs = a as number[];
  const bCoeffs = b as number[];
  const result = aCoeffs.map((c, i) => Math.min(c, bCoeffs[i]));
  return fromCoefficients(result);
}
