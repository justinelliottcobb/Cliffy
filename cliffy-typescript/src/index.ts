/**
 * @cliffy/core - Reactive UI framework with geometric algebra
 *
 * Cliffy uses Clifford/Geometric Algebra as its mathematical foundation,
 * providing FRP-style reactive primitives where all state transformations
 * are geometric operations under the hood.
 *
 * @example
 * ```typescript
 * import { init, rotor, geometricState } from '@cliffy/core';
 *
 * // Initialize WASM (required before using any types)
 * await init();
 *
 * // Create a position in 3D space
 * const pos = geometricState.fromVector(1, 0, 0);
 *
 * // Create a 90-degree rotation
 * const rot = rotor.xy(Math.PI / 2);
 *
 * // Apply the rotation
 * const rotated = pos.applyRotor(rot);
 * const [x, y, z] = rotated.asVector(); // [~0, ~1, ~0]
 * ```
 */

// WASM module reference
let wasmModule: WasmModuleExports | null = null;

// Type for WASM module exports
interface WasmModuleExports {
  Rotor: RotorStatic;
  Versor: VersorStatic;
  Translation: TranslationStatic;
  Transform: TransformStatic;
  GeometricState: GeometricStateStatic;
  Behavior: BehaviorStatic;
  Event: EventStatic;
}

interface RotorStatic {
  identity(): WasmRotorInstance;
  xy(angle: number): WasmRotorInstance;
  xz(angle: number): WasmRotorInstance;
  yz(angle: number): WasmRotorInstance;
  fromAxisAngle(x: number, y: number, z: number, angle: number): WasmRotorInstance;
}

interface WasmRotorInstance {
  angle(): number;
  then(other: WasmRotorInstance): WasmRotorInstance;
  inverse(): WasmRotorInstance;
  slerp(t: number): WasmRotorInstance;
  slerpTo(other: WasmRotorInstance, t: number): WasmRotorInstance;
}

interface VersorStatic {
  identity(): WasmVersorInstance;
  reflection(x: number, y: number, z: number): WasmVersorInstance;
  fromRotor(rotor: WasmRotorInstance): WasmVersorInstance;
}

interface WasmVersorInstance {
  then(other: WasmVersorInstance): WasmVersorInstance;
  isRotor(): boolean;
  toRotor(): WasmRotorInstance | undefined;
}

interface TranslationStatic {
  new (x: number, y: number, z: number): WasmTranslationInstance;
  x(amount: number): WasmTranslationInstance;
  y(amount: number): WasmTranslationInstance;
  z(amount: number): WasmTranslationInstance;
}

interface WasmTranslationInstance {
  then(other: WasmTranslationInstance): WasmTranslationInstance;
  inverse(): WasmTranslationInstance;
  lerp(t: number): WasmTranslationInstance;
  lerpTo(other: WasmTranslationInstance, t: number): WasmTranslationInstance;
}

interface TransformStatic {
  identity(): WasmTransformInstance;
  fromRotorAndTranslation(
    rotor: WasmRotorInstance,
    translation: WasmTranslationInstance
  ): WasmTransformInstance;
  fromRotor(rotor: WasmRotorInstance): WasmTransformInstance;
  fromTranslation(translation: WasmTranslationInstance): WasmTransformInstance;
}

interface WasmTransformInstance {
  then(other: WasmTransformInstance): WasmTransformInstance;
  inverse(): WasmTransformInstance;
  interpolate(t: number): WasmTransformInstance;
  interpolateTo(other: WasmTransformInstance, t: number): WasmTransformInstance;
}

interface GeometricStateStatic {
  fromScalar(value: number): WasmGeometricStateInstance;
  fromVector(x: number, y: number, z: number): WasmGeometricStateInstance;
  fromBivector(xy: number, xz: number, yz: number): WasmGeometricStateInstance;
}

interface WasmGeometricStateInstance {
  scalar(): number;
  asVector(): [number, number, number];
  asBivector(): [number, number, number];
  magnitude(): number;
  setScalar(value: number): void;
  setVector(x: number, y: number, z: number): void;
  applyRotor(rotor: WasmRotorInstance): WasmGeometricStateInstance;
  applyTranslation(translation: WasmTranslationInstance): WasmGeometricStateInstance;
  applyTransform(transform: WasmTransformInstance): WasmGeometricStateInstance;
  scale(factor: number): WasmGeometricStateInstance;
  normalize(): WasmGeometricStateInstance | undefined;
  lerp(other: WasmGeometricStateInstance, t: number): WasmGeometricStateInstance;
  slerp(other: WasmGeometricStateInstance, t: number): WasmGeometricStateInstance;
  toArray(): Float64Array;
}

interface BehaviorStatic {
  new (initial: unknown): unknown;
}

interface EventStatic {
  new (): unknown;
}

// Helper to get WASM or throw
function getWasm(): WasmModuleExports {
  if (!wasmModule) {
    throw new Error("Cliffy WASM not initialized. Call init() first.");
  }
  return wasmModule;
}

/**
 * A rotor represents a rotation in 3D space.
 */
export class Rotor {
  /** @internal */
  _inner: WasmRotorInstance;

  /** @internal */
  constructor(inner: WasmRotorInstance) {
    this._inner = inner;
  }

  /** Create the identity rotor (no rotation). */
  static identity(): Rotor {
    return new Rotor(getWasm().Rotor.identity());
  }

  /** Create a rotation in the XY plane (around Z axis). */
  static xy(angle: number): Rotor {
    return new Rotor(getWasm().Rotor.xy(angle));
  }

  /** Create a rotation in the XZ plane (around Y axis). */
  static xz(angle: number): Rotor {
    return new Rotor(getWasm().Rotor.xz(angle));
  }

  /** Create a rotation in the YZ plane (around X axis). */
  static yz(angle: number): Rotor {
    return new Rotor(getWasm().Rotor.yz(angle));
  }

  /** Create a rotation around an arbitrary axis. */
  static fromAxisAngle(x: number, y: number, z: number, angle: number): Rotor {
    return new Rotor(getWasm().Rotor.fromAxisAngle(x, y, z, angle));
  }

  /** Get the rotation angle in radians. */
  angle(): number {
    return this._inner.angle();
  }

  /** Compose with another rotor (apply this, then other). */
  then(other: Rotor): Rotor {
    return new Rotor(this._inner.then(other._inner));
  }

  /** Get the inverse rotor (reverse rotation). */
  inverse(): Rotor {
    return new Rotor(this._inner.inverse());
  }

  /** Spherical linear interpolation from identity to this rotor. */
  slerp(t: number): Rotor {
    return new Rotor(this._inner.slerp(t));
  }

  /** Spherical linear interpolation to another rotor. */
  slerpTo(other: Rotor, t: number): Rotor {
    return new Rotor(this._inner.slerpTo(other._inner, t));
  }
}

/**
 * A versor represents a general geometric transformation (rotation or reflection).
 */
export class Versor {
  /** @internal */
  _inner: WasmVersorInstance;

  /** @internal */
  constructor(inner: WasmVersorInstance) {
    this._inner = inner;
  }

  /** Create the identity versor (no transformation). */
  static identity(): Versor {
    return new Versor(getWasm().Versor.identity());
  }

  /** Create a reflection through a plane with the given normal. */
  static reflection(x: number, y: number, z: number): Versor {
    return new Versor(getWasm().Versor.reflection(x, y, z));
  }

  /** Create a versor from a rotor. */
  static fromRotor(rotor: Rotor): Versor {
    return new Versor(getWasm().Versor.fromRotor(rotor._inner));
  }

  /** Compose with another versor. */
  then(other: Versor): Versor {
    return new Versor(this._inner.then(other._inner));
  }

  /** Check if this is an even versor (a rotor). */
  isRotor(): boolean {
    return this._inner.isRotor();
  }

  /** Try to convert to a Rotor. Returns null for odd versors. */
  toRotor(): Rotor | null {
    const result = this._inner.toRotor();
    return result ? new Rotor(result) : null;
  }
}

/**
 * A translation in 3D space.
 */
export class Translation {
  /** @internal */
  _inner: WasmTranslationInstance;

  /** @internal */
  constructor(inner: WasmTranslationInstance) {
    this._inner = inner;
  }

  /** Create a new translation. */
  static new(x: number, y: number, z: number): Translation {
    const wasm = getWasm();
    return new Translation(new wasm.Translation(x, y, z));
  }

  /** Create a translation along the X axis. */
  static x(amount: number): Translation {
    return new Translation(getWasm().Translation.x(amount));
  }

  /** Create a translation along the Y axis. */
  static y(amount: number): Translation {
    return new Translation(getWasm().Translation.y(amount));
  }

  /** Create a translation along the Z axis. */
  static z(amount: number): Translation {
    return new Translation(getWasm().Translation.z(amount));
  }

  /** Compose with another translation. */
  then(other: Translation): Translation {
    return new Translation(this._inner.then(other._inner));
  }

  /** Get the inverse translation. */
  inverse(): Translation {
    return new Translation(this._inner.inverse());
  }

  /** Linear interpolation from zero to this translation. */
  lerp(t: number): Translation {
    return new Translation(this._inner.lerp(t));
  }

  /** Linear interpolation to another translation. */
  lerpTo(other: Translation, t: number): Translation {
    return new Translation(this._inner.lerpTo(other._inner, t));
  }
}

/**
 * A combined rotation and translation transform.
 */
export class Transform {
  /** @internal */
  _inner: WasmTransformInstance;

  /** @internal */
  constructor(inner: WasmTransformInstance) {
    this._inner = inner;
  }

  /** Create the identity transform. */
  static identity(): Transform {
    return new Transform(getWasm().Transform.identity());
  }

  /** Create from a rotor and translation. */
  static fromRotorAndTranslation(rotor: Rotor, translation: Translation): Transform {
    return new Transform(
      getWasm().Transform.fromRotorAndTranslation(rotor._inner, translation._inner)
    );
  }

  /** Create a pure rotation transform. */
  static fromRotor(rotor: Rotor): Transform {
    return new Transform(getWasm().Transform.fromRotor(rotor._inner));
  }

  /** Create a pure translation transform. */
  static fromTranslation(translation: Translation): Transform {
    return new Transform(getWasm().Transform.fromTranslation(translation._inner));
  }

  /** Compose with another transform. */
  then(other: Transform): Transform {
    return new Transform(this._inner.then(other._inner));
  }

  /** Get the inverse transform. */
  inverse(): Transform {
    return new Transform(this._inner.inverse());
  }

  /** Interpolate from identity to this transform. */
  interpolate(t: number): Transform {
    return new Transform(this._inner.interpolate(t));
  }

  /** Interpolate to another transform. */
  interpolateTo(other: Transform, t: number): Transform {
    return new Transform(this._inner.interpolateTo(other._inner, t));
  }
}

/**
 * Geometric state with explicit transformation support.
 */
export class GeometricState {
  /** @internal */
  _inner: WasmGeometricStateInstance;

  /** @internal */
  constructor(inner: WasmGeometricStateInstance) {
    this._inner = inner;
  }

  /** Create from a scalar value. */
  static fromScalar(value: number): GeometricState {
    return new GeometricState(getWasm().GeometricState.fromScalar(value));
  }

  /** Create from a 3D vector. */
  static fromVector(x: number, y: number, z: number): GeometricState {
    return new GeometricState(getWasm().GeometricState.fromVector(x, y, z));
  }

  /** Create from a bivector (rotation plane). */
  static fromBivector(xy: number, xz: number, yz: number): GeometricState {
    return new GeometricState(getWasm().GeometricState.fromBivector(xy, xz, yz));
  }

  /** Get the scalar component. */
  scalar(): number {
    return this._inner.scalar();
  }

  /** Get the vector components as [x, y, z]. */
  asVector(): [number, number, number] {
    return this._inner.asVector();
  }

  /** Get the bivector components as [xy, xz, yz]. */
  asBivector(): [number, number, number] {
    return this._inner.asBivector();
  }

  /** Get the magnitude (length). */
  magnitude(): number {
    return this._inner.magnitude();
  }

  /** Apply a rotor transformation. */
  applyRotor(rotor: Rotor): GeometricState {
    return new GeometricState(this._inner.applyRotor(rotor._inner));
  }

  /** Apply a translation. */
  applyTranslation(translation: Translation): GeometricState {
    return new GeometricState(this._inner.applyTranslation(translation._inner));
  }

  /** Apply a combined transform. */
  applyTransform(transform: Transform): GeometricState {
    return new GeometricState(this._inner.applyTransform(transform._inner));
  }

  /** Scale by a factor. */
  scale(factor: number): GeometricState {
    return new GeometricState(this._inner.scale(factor));
  }

  /** Normalize to unit magnitude. */
  normalize(): GeometricState | null {
    const result = this._inner.normalize();
    return result ? new GeometricState(result) : null;
  }

  /** Linear interpolation to another state. */
  lerp(other: GeometricState, t: number): GeometricState {
    return new GeometricState(this._inner.lerp(other._inner, t));
  }

  /** Spherical linear interpolation (for rotor-like states). */
  slerp(other: GeometricState, t: number): GeometricState {
    return new GeometricState(this._inner.slerp(other._inner, t));
  }

  /** Get state as raw coefficients array. */
  toArray(): Float64Array {
    return this._inner.toArray();
  }
}

let initialized = false;

/**
 * Initialize the WASM module.
 *
 * This must be called before using any Cliffy types.
 *
 * @example
 * ```typescript
 * import { init, Rotor } from '@cliffy/core';
 *
 * await init();
 *
 * const rot = Rotor.xy(Math.PI / 2);
 * ```
 */
export async function init(): Promise<void> {
  if (initialized) return;

  // Dynamic import of WASM module
  const wasm = await import("../pkg/cliffy_wasm.js");
  await wasm.default();

  wasmModule = wasm as unknown as WasmModuleExports;
  initialized = true;
}

/**
 * Check if the WASM module has been initialized.
 */
export function isInitialized(): boolean {
  return initialized;
}
