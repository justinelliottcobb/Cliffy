/**
 * Main Cliffy class - Entry point for the TypeScript API
 */

import { Multivector, MultivectorBuilder, initWasm } from './multivector';
import { GeometricBehavior } from './behavior';
import type { CliffySignature, MultivectorData, P2POptions, ConsensusConfig } from './types';

// Import WASM bindings
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - WASM module will be generated
import { CliffySystem, GeometricCRDTJs, benchmark_geometric_product } from './wasm/cliffy_wasm';

export class Cliffy<S extends CliffySignature = 'Cl(3,0)'> {
  private signature: S;
  private wasmSystem: CliffySystem | null = null;
  private crdt: GeometricCRDTJs | null = null;
  private initialized = false;

  constructor(signature: S = 'Cl(3,0)' as S) {
    this.signature = signature;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await initWasm();
    this.wasmSystem = new CliffySystem();
    this.initialized = true;
  }

  // Factory methods for creating multivectors
  scalar(value: number): Multivector {
    this.ensureInitialized();
    return Multivector.scalar(value, this.signature);
  }

  e1(): Multivector {
    this.ensureInitialized();
    return Multivector.e1(this.signature);
  }

  e2(): Multivector {
    this.ensureInitialized();
    return Multivector.e2(this.signature);
  }

  e3(): Multivector {
    this.ensureInitialized();
    return Multivector.e3(this.signature);
  }

  zero(): Multivector {
    this.ensureInitialized();
    return Multivector.zero(this.signature);
  }

  // Builder pattern for fluent construction
  builder(): MultivectorBuilder {
    this.ensureInitialized();
    return new MultivectorBuilder(this.signature);
  }

  // Behavior creation
  behavior(initialValue: Multivector): GeometricBehavior {
    this.ensureInitialized();
    return new GeometricBehavior(initialValue);
  }

  constant(value: Multivector): GeometricBehavior {
    this.ensureInitialized();
    return GeometricBehavior.constant(value);
  }

  // CRDT operations
  async initCRDT(initialState?: Multivector): Promise<void> {
    this.ensureInitialized();
    const state = initialState || this.zero();
    this.crdt = new GeometricCRDTJs(state);
  }

  getCRDTState(): Multivector | null {
    if (!this.crdt) return null;
    const wasmMv = this.crdt.getCurrentState();
    const coeffs = wasmMv.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  createCRDTOperation(transform: Multivector, operationType: string): string | null {
    if (!this.crdt) return null;
    return this.crdt.createOperation(transform, operationType);
  }

  applyCRDTOperation(operationJson: string): void {
    if (!this.crdt) return;
    this.crdt.applyOperation(operationJson);
  }

  // P2P and WebRTC utilities
  async setupP2P(options: P2POptions = {}): Promise<RTCPeerConnection> {
    this.ensureInitialized();
    
    const config: RTCConfiguration = {
      iceServers: options.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(config);
    
    // Set up data channel for CRDT synchronization
    const dataChannel = peerConnection.createDataChannel('cliffy-sync', {
      ordered: true
    });

    dataChannel.onmessage = (event) => {
      try {
        const operation = JSON.parse(event.data);
        this.applyCRDTOperation(JSON.stringify(operation));
      } catch (error) {
        console.error('Error processing P2P message:', error);
      }
    };

    return peerConnection;
  }

  broadcastOperation(peerConnection: RTCPeerConnection, operation: string): void {
    const dataChannel = peerConnection.createDataChannel('cliffy-sync');
    if (dataChannel.readyState === 'open') {
      dataChannel.send(operation);
    }
  }

  // Performance monitoring
  async benchmarkGeometricProduct(size: number = 1000, iterations: number = 100): Promise<number> {
    this.ensureInitialized();
    return benchmark_geometric_product(size, iterations);
  }

  // Consensus protocols
  async runConsensus(
    proposals: Multivector[],
    config: ConsensusConfig = { threshold: 0.1, timeout: 5000, maxRounds: 10 }
  ): Promise<Multivector | null> {
    // Simplified consensus implementation
    // In a real implementation, this would use the distributed consensus protocols
    if (proposals.length === 0) return null;
    
    // Geometric mean as consensus
    let sum = this.zero();
    for (const proposal of proposals) {
      sum = sum.add(proposal);
    }
    
    return sum.scale(1 / proposals.length);
  }

  // Utility methods
  getSignature(): S {
    return this.signature;
  }

  getDimension(): number {
    switch (this.signature) {
      case 'Cl(3,0)': return 8;
      case 'Cl(4,1)': return 32;
      case 'Cl(4,4)': return 256;
      default: return 8;
    }
  }

  getBasisElements(): string[] {
    switch (this.signature) {
      case 'Cl(3,0)':
        return ['1', 'e1', 'e2', 'e12', 'e3', 'e13', 'e23', 'e123'];
      case 'Cl(4,1)':
        return this.generateBasisElements(5);
      case 'Cl(4,4)':
        return this.generateBasisElements(8);
      default:
        return ['1', 'e1', 'e2', 'e12', 'e3', 'e13', 'e23', 'e123'];
    }
  }

  private generateBasisElements(n: number): string[] {
    const elements: string[] = ['1'];
    
    for (let i = 1; i < 2 ** n; i++) {
      let element = 'e';
      for (let j = 0; j < n; j++) {
        if ((i >> j) & 1) {
          element += (j + 1).toString();
        }
      }
      elements.push(element);
    }
    
    return elements;
  }

  // Version information
  static getVersion(): string {
    return '0.1.0';
  }

  getNodeId(): string {
    this.ensureInitialized();
    return this.wasmSystem?.node_id || '';
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Cliffy not initialized. Call initialize() first.');
    }
  }
}

// Convenience factory functions
export function createClifford<S extends CliffySignature>(signature: S): Cliffy<S> {
  return new Cliffy(signature);
}

export const Cl30 = () => createClifford('Cl(3,0)');
export const Cl41 = () => createClifford('Cl(4,1)');
export const Cl44 = () => createClifford('Cl(4,4)');

// Default instance for simple usage
export const cliffy = createClifford('Cl(3,0)');