/**
 * Rotor - Rotation representation in geometric algebra.
 *
 * A rotor is a unit-magnitude element that encodes a rotation:
 *
 *   R = cos(θ/2) + sin(θ/2) * B
 *
 * where:
 *   θ = rotation angle (radians)
 *   B = unit bivector defining the rotation plane
 *
 * Rotations are applied via the sandwich product: R * v * R†
 * where R† is the reverse (conjugate) of R.
 *
 * For unit rotors, R† = R⁻¹, making inverses trivial to compute.
 */

import {
  GA3,
  GA3_SCALAR,
  GA3_E12,
  GA3_E13,
  GA3_E23,
  scalar,
  geometricProduct,
  reverse,
  magnitude,
  normalize,
  sandwich,
  clone,
} from './ga3.js';

export class Rotor {
  /** Internal GA3 representation */
  private readonly mv: GA3;

  private constructor(mv: GA3) {
    this.mv = mv;
  }

  /**
   * Create from a bivector and angle.
   *
   * @param angle - Rotation angle in radians
   * @param xy - XY plane component (rotation around Z)
   * @param xz - XZ plane component (rotation around Y)
   * @param yz - YZ plane component (rotation around X)
   */
  static fromBivectorAngle(
    angle: number,
    xy: number,
    xz: number,
    yz: number
  ): Rotor {
    // Normalize the bivector
    const bvMag = Math.sqrt(xy * xy + xz * xz + yz * yz);

    if (bvMag < 1e-10) {
      // Zero bivector = identity rotation
      return Rotor.identity();
    }

    const normalizedXy = xy / bvMag;
    const normalizedXz = xz / bvMag;
    const normalizedYz = yz / bvMag;

    // R = cos(θ/2) - sin(θ/2) * B
    // The negative sign ensures counterclockwise positive rotation
    // (right-hand rule convention)
    const halfAngle = angle / 2;
    const cosHalf = Math.cos(halfAngle);
    const sinHalf = Math.sin(halfAngle);

    const mv: GA3 = [
      cosHalf, // scalar
      0, // e1
      0, // e2
      -sinHalf * normalizedXy, // e12 (negated for right-hand rule)
      0, // e3
      -sinHalf * normalizedXz, // e13 (negated for right-hand rule)
      -sinHalf * normalizedYz, // e23 (negated for right-hand rule)
      0, // e123
    ];

    return new Rotor(mv);
  }

  /**
   * Rotation in the XY plane (around the Z axis).
   */
  static xy(angle: number): Rotor {
    return Rotor.fromBivectorAngle(angle, 1, 0, 0);
  }

  /**
   * Rotation in the XZ plane (around the Y axis).
   */
  static xz(angle: number): Rotor {
    return Rotor.fromBivectorAngle(angle, 0, 1, 0);
  }

  /**
   * Rotation in the YZ plane (around the X axis).
   */
  static yz(angle: number): Rotor {
    return Rotor.fromBivectorAngle(angle, 0, 0, 1);
  }

  /**
   * Create from axis-angle representation.
   *
   * @param ax - X component of rotation axis
   * @param ay - Y component of rotation axis
   * @param az - Z component of rotation axis
   * @param angle - Rotation angle in radians
   */
  static fromAxisAngle(
    ax: number,
    ay: number,
    az: number,
    angle: number
  ): Rotor {
    // Axis to bivector mapping:
    // Axis (1,0,0) -> YZ plane bivector (rotation around X)
    // Axis (0,1,0) -> XZ plane bivector (rotation around Y), negated
    // Axis (0,0,1) -> XY plane bivector (rotation around Z)
    const xy = az;
    const xz = -ay;
    const yz = ax;

    return Rotor.fromBivectorAngle(angle, xy, xz, yz);
  }

  /**
   * Create from an existing GA3 multivector.
   * The multivector should already be a valid unit rotor.
   */
  static fromMultivector(mv: GA3): Rotor {
    return new Rotor(clone(mv));
  }

  /**
   * Identity rotor (no rotation).
   */
  static identity(): Rotor {
    return new Rotor(scalar(1));
  }

  /**
   * Get the internal multivector representation.
   */
  toMultivector(): GA3 {
    return clone(this.mv);
  }

  /**
   * Transform a vector using this rotor.
   *
   * Applies the sandwich product: R * v * R†
   */
  transform(v: GA3): GA3 {
    return sandwich(this.mv, v);
  }

  /**
   * Compose with another rotor.
   *
   * Returns a new rotor that applies this rotation first, then the other.
   * Mathematically: other * this
   */
  then(other: Rotor): Rotor {
    const combined = geometricProduct(other.mv, this.mv);
    return new Rotor(combined);
  }

  /**
   * Get the inverse rotor.
   *
   * For unit rotors, the inverse equals the reverse.
   */
  inverse(): Rotor {
    return new Rotor(reverse(this.mv));
  }

  /**
   * Normalize to unit magnitude.
   */
  normalize(): Rotor {
    const normalized = normalize(this.mv);
    if (normalized === null) {
      return Rotor.identity();
    }
    return new Rotor(normalized);
  }

  /**
   * Get the rotation angle in radians.
   */
  angle(): number {
    const s = this.mv[GA3_SCALAR];
    // Clamp to [-1, 1] to handle numerical errors
    const clamped = Math.max(-1, Math.min(1, s));
    return 2 * Math.acos(clamped);
  }

  /**
   * Get the bivector (rotation plane) components.
   */
  bivector(): [number, number, number] {
    return [this.mv[GA3_E12], this.mv[GA3_E13], this.mv[GA3_E23]];
  }

  /**
   * Spherical linear interpolation from identity.
   *
   * Returns a rotor that represents t * (this rotation).
   * When t=0, returns identity. When t=1, returns this rotor.
   *
   * @param t - Interpolation parameter [0, 1]
   */
  slerp(t: number): Rotor {
    // Extract angle and bivector
    const angle = this.angle();
    const [bxy, bxz, byz] = this.bivector();

    // The stored bivector is negated (due to sign convention in fromBivectorAngle)
    // We need to negate it to get the logical bivector direction
    const logicalBxy = -bxy;
    const logicalBxz = -bxz;
    const logicalByz = -byz;

    // Normalize bivector
    const bvMag = Math.sqrt(logicalBxy * logicalBxy + logicalBxz * logicalBxz + logicalByz * logicalByz);

    if (bvMag < 1e-10 || Math.abs(angle) < 1e-10) {
      // No rotation or zero angle
      return Rotor.identity();
    }

    // Scale angle by t
    const newAngle = angle * t;

    // Rebuild rotor with new angle (fromBivectorAngle will apply the sign convention)
    return Rotor.fromBivectorAngle(newAngle, logicalBxy, logicalBxz, logicalByz);
  }

  /**
   * Spherical linear interpolation to another rotor.
   *
   * Returns a rotor between this and other.
   * When t=0, returns this rotor. When t=1, returns other.
   *
   * @param other - Target rotor
   * @param t - Interpolation parameter [0, 1]
   */
  slerpTo(other: Rotor, t: number): Rotor {
    // Compute relative rotation: other * this⁻¹
    const relative = other.then(this.inverse());

    // Interpolate from identity to relative
    const interpolated = relative.slerp(t);

    // Apply to this: interpolated * this
    return interpolated.then(this);
  }

  /**
   * Check if approximately equal to another rotor.
   */
  equals(other: Rotor, epsilon: number = 1e-10): boolean {
    for (let i = 0; i < 8; i++) {
      if (Math.abs(this.mv[i] - other.mv[i]) > epsilon) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get the magnitude (should be 1 for a valid rotor).
   */
  magnitude(): number {
    return magnitude(this.mv);
  }
}
