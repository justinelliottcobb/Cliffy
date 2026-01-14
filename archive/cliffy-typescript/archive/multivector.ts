/**
 * Multivector implementation and builder for TypeScript
 */

import type { MultivectorData, CliffySignature, GeometricOperation } from './types';

// Import WASM bindings (will be available after build)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - WASM module will be generated
import init, { MultivectorJs, ConformalMultivectorJs, create_rotor } from './wasm/cliffy_wasm';

let wasmInitialized = false;

export async function initWasm(): Promise<void> {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
}

export class Multivector implements MultivectorData {
  private wasm: MultivectorJs;
  public readonly signature: CliffySignature;

  constructor(coefficients: number[], signature: CliffySignature = 'Cl(3,0)') {
    if (!wasmInitialized) {
      throw new Error('WASM not initialized. Call initWasm() first.');
    }
    
    this.signature = signature;
    this.wasm = MultivectorJs.fromCoeffs(coefficients);
  }

  public get coefficients(): readonly number[] {
    return this.wasm.getCoeffs();
  }

  static scalar(value: number, signature: CliffySignature = 'Cl(3,0)'): Multivector {
    const mv = new Multivector([value, 0, 0, 0, 0, 0, 0, 0], signature);
    return mv;
  }

  static e1(signature: CliffySignature = 'Cl(3,0)'): Multivector {
    const coeffs = new Array(8).fill(0);
    coeffs[1] = 1;
    return new Multivector(coeffs, signature);
  }

  static e2(signature: CliffySignature = 'Cl(3,0)'): Multivector {
    const coeffs = new Array(8).fill(0);
    coeffs[2] = 1;
    return new Multivector(coeffs, signature);
  }

  static e3(signature: CliffySignature = 'Cl(3,0)'): Multivector {
    const coeffs = new Array(8).fill(0);
    coeffs[4] = 1;
    return new Multivector(coeffs, signature);
  }

  static zero(signature: CliffySignature = 'Cl(3,0)'): Multivector {
    return new Multivector(new Array(8).fill(0), signature);
  }

  geometricProduct(other: Multivector): Multivector {
    const result = this.wasm.geometricProduct(other.wasm);
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  add(other: Multivector): Multivector {
    const result = this.wasm.add(other.wasm);
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  subtract(other: Multivector): Multivector {
    const result = this.wasm.subtract(other.wasm);
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  scale(scalar: number): Multivector {
    const result = this.wasm.scale(scalar);
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  magnitude(): number {
    return this.wasm.magnitude();
  }

  normalize(): Multivector {
    const result = this.wasm.normalize();
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  exp(): Multivector {
    const result = this.wasm.exp();
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  log(): Multivector {
    const result = this.wasm.log();
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  sandwich(other: Multivector): Multivector {
    const result = this.wasm.sandwich(other.wasm);
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  gradeProjection(grade: number): Multivector {
    const result = this.wasm.gradeProjection(grade);
    const coeffs = result.getCoeffs();
    return new Multivector(coeffs, this.signature);
  }

  toString(): string {
    return this.wasm.toString();
  }

  toJSON(): MultivectorData {
    return {
      coefficients: this.coefficients,
      signature: this.signature
    };
  }

  static fromJSON(data: MultivectorData): Multivector {
    return new Multivector([...data.coefficients], data.signature);
  }

  // Get internal WASM object (for internal use)
  getWasmObject(): MultivectorJs {
    return this.wasm;
  }
}

export class MultivectorBuilder {
  private coeffs: number[];
  private sig: CliffySignature;

  constructor(signature: CliffySignature = 'Cl(3,0)') {
    this.sig = signature;
    this.coeffs = new Array(signature === 'Cl(3,0)' ? 8 : signature === 'Cl(4,1)' ? 32 : 256).fill(0);
  }

  scalar(value: number): this {
    this.coeffs[0] = value;
    return this;
  }

  e1(coefficient: number = 1): this {
    this.coeffs[1] = coefficient;
    return this;
  }

  e2(coefficient: number = 1): this {
    this.coeffs[2] = coefficient;
    return this;
  }

  e12(coefficient: number = 1): this {
    this.coeffs[3] = coefficient;
    return this;
  }

  e3(coefficient: number = 1): this {
    this.coeffs[4] = coefficient;
    return this;
  }

  e13(coefficient: number = 1): this {
    this.coeffs[5] = coefficient;
    return this;
  }

  e23(coefficient: number = 1): this {
    this.coeffs[6] = coefficient;
    return this;
  }

  e123(coefficient: number = 1): this {
    this.coeffs[7] = coefficient;
    return this;
  }

  coefficient(index: number, value: number): this {
    if (index >= 0 && index < this.coeffs.length) {
      this.coeffs[index] = value;
    }
    return this;
  }

  build(): Multivector {
    return new Multivector([...this.coeffs], this.sig);
  }

  reset(): this {
    this.coeffs.fill(0);
    return this;
  }
}

// Utility functions for creating rotors
export function createRotor(angle: number, bivector: Multivector): Multivector {
  if (!wasmInitialized) {
    throw new Error('WASM not initialized. Call initWasm() first.');
  }
  
  const result = create_rotor(angle, bivector.getWasmObject());
  const coeffs = result.getCoeffs();
  return new Multivector(coeffs, bivector.signature);
}

// Conformal geometric algebra utilities
export class ConformalMultivector {
  private wasm: ConformalMultivectorJs;

  constructor() {
    if (!wasmInitialized) {
      throw new Error('WASM not initialized. Call initWasm() first.');
    }
    this.wasm = new ConformalMultivectorJs();
  }

  static createPoint(x: number, y: number, z: number): ConformalMultivector {
    if (!wasmInitialized) {
      throw new Error('WASM not initialized. Call initWasm() first.');
    }
    
    const mv = new ConformalMultivector();
    mv.wasm = ConformalMultivectorJs.createPoint(x, y, z);
    return mv;
  }

  geometricProduct(other: ConformalMultivector): ConformalMultivector {
    const result = new ConformalMultivector();
    result.wasm = this.wasm.geometricProduct(other.wasm);
    return result;
  }

  magnitude(): number {
    return this.wasm.magnitude();
  }

  getCoefficients(): number[] {
    return this.wasm.getCoeffs();
  }
}