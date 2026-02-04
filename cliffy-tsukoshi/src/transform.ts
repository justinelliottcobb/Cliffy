/**
 * Transform - Combined rotation and translation.
 *
 * Represents a rigid body transformation:
 * 1. First apply rotation (via rotor)
 * 2. Then apply translation
 *
 * Transforms can be composed and interpolated.
 */

import { GA3, vector, add as addMv, asVector } from './ga3.js';
import { Rotor } from './rotor.js';

/**
 * Translation vector.
 */
export interface Translation {
  x: number;
  y: number;
  z: number;
}

/**
 * Create a translation.
 */
export function translation(x: number, y: number, z: number): Translation {
  return { x, y, z };
}

/**
 * Zero translation.
 */
export function zeroTranslation(): Translation {
  return { x: 0, y: 0, z: 0 };
}

/**
 * Add two translations.
 */
export function addTranslation(a: Translation, b: Translation): Translation {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

/**
 * Subtract two translations.
 */
export function subTranslation(a: Translation, b: Translation): Translation {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

/**
 * Scale a translation.
 */
export function scaleTranslation(t: Translation, s: number): Translation {
  return {
    x: t.x * s,
    y: t.y * s,
    z: t.z * s,
  };
}

/**
 * Negate a translation.
 */
export function negateTranslation(t: Translation): Translation {
  return scaleTranslation(t, -1);
}

/**
 * Linear interpolation between translations.
 */
export function lerpTranslation(a: Translation, b: Translation, t: number): Translation {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * a.x + t * b.x,
    y: oneMinusT * a.y + t * b.y,
    z: oneMinusT * a.z + t * b.z,
  };
}

/**
 * Convert translation to GA3 vector.
 */
export function translationToVector(t: Translation): GA3 {
  return vector(t.x, t.y, t.z);
}

/**
 * Transform class - combines rotation and translation.
 */
export class Transform {
  /** Rotation component */
  readonly rotor: Rotor;
  /** Translation component (applied after rotation) */
  readonly translation: Translation;

  private constructor(rotor: Rotor, trans: Translation) {
    this.rotor = rotor;
    this.translation = trans;
  }

  /**
   * Create a transform from a rotor and translation.
   */
  static new(rotor: Rotor, trans: Translation): Transform {
    return new Transform(rotor, trans);
  }

  /**
   * Identity transform (no rotation or translation).
   */
  static identity(): Transform {
    return new Transform(Rotor.identity(), zeroTranslation());
  }

  /**
   * Pure rotation transform.
   */
  static rotation(rotor: Rotor): Transform {
    return new Transform(rotor, zeroTranslation());
  }

  /**
   * Pure translation transform.
   */
  static fromTranslation(trans: Translation): Transform {
    return new Transform(Rotor.identity(), trans);
  }

  /**
   * Translation along X axis.
   */
  static translateX(amount: number): Transform {
    return Transform.fromTranslation(translation(amount, 0, 0));
  }

  /**
   * Translation along Y axis.
   */
  static translateY(amount: number): Transform {
    return Transform.fromTranslation(translation(0, amount, 0));
  }

  /**
   * Translation along Z axis.
   */
  static translateZ(amount: number): Transform {
    return Transform.fromTranslation(translation(0, 0, amount));
  }

  /**
   * Rotation in XY plane (around Z axis).
   */
  static rotateXY(angle: number): Transform {
    return Transform.rotation(Rotor.xy(angle));
  }

  /**
   * Rotation in XZ plane (around Y axis).
   */
  static rotateXZ(angle: number): Transform {
    return Transform.rotation(Rotor.xz(angle));
  }

  /**
   * Rotation in YZ plane (around X axis).
   */
  static rotateYZ(angle: number): Transform {
    return Transform.rotation(Rotor.yz(angle));
  }

  /**
   * Apply this transform to a vector.
   *
   * 1. Rotate the vector
   * 2. Add the translation
   */
  apply(v: GA3): GA3 {
    // Rotate first
    const rotated = this.rotor.transform(v);

    // Then translate (add translation vector to the result)
    const transVec = translationToVector(this.translation);

    return addMv(rotated, transVec);
  }

  /**
   * Compose with another transform.
   *
   * Returns a transform that applies this first, then other.
   */
  then(other: Transform): Transform {
    // Combined rotation: other.rotor * this.rotor
    const combinedRotor = this.rotor.then(other.rotor);

    // Combined translation:
    // other.rotor.transform(this.translation) + other.translation
    const thisTransVec = translationToVector(this.translation);
    const rotatedTrans = other.rotor.transform(thisTransVec);
    const [rx, ry, rz] = asVector(rotatedTrans);

    const combinedTranslation: Translation = {
      x: rx + other.translation.x,
      y: ry + other.translation.y,
      z: rz + other.translation.z,
    };

    return new Transform(combinedRotor, combinedTranslation);
  }

  /**
   * Get the inverse transform.
   */
  inverse(): Transform {
    // Inverse rotation
    const invRotor = this.rotor.inverse();

    // Inverse translation: -R⁻¹(t)
    const transVec = translationToVector(this.translation);
    const rotatedInvTrans = invRotor.transform(transVec);
    const [rx, ry, rz] = asVector(rotatedInvTrans);

    return new Transform(invRotor, translation(-rx, -ry, -rz));
  }

  /**
   * Interpolate from identity to this transform.
   *
   * @param t - Interpolation parameter [0, 1]
   */
  interpolate(t: number): Transform {
    // SLERP for rotation
    const interpRotor = this.rotor.slerp(t);

    // LERP for translation
    const interpTrans = lerpTranslation(zeroTranslation(), this.translation, t);

    return new Transform(interpRotor, interpTrans);
  }

  /**
   * Interpolate to another transform.
   *
   * @param other - Target transform
   * @param t - Interpolation parameter [0, 1]
   */
  interpolateTo(other: Transform, t: number): Transform {
    // SLERP for rotation
    const interpRotor = this.rotor.slerpTo(other.rotor, t);

    // LERP for translation
    const interpTrans = lerpTranslation(this.translation, other.translation, t);

    return new Transform(interpRotor, interpTrans);
  }

  /**
   * Check if approximately equal to another transform.
   */
  equals(other: Transform, epsilon: number = 1e-10): boolean {
    if (!this.rotor.equals(other.rotor, epsilon)) {
      return false;
    }

    const dx = Math.abs(this.translation.x - other.translation.x);
    const dy = Math.abs(this.translation.y - other.translation.y);
    const dz = Math.abs(this.translation.z - other.translation.z);

    return dx < epsilon && dy < epsilon && dz < epsilon;
  }
}
