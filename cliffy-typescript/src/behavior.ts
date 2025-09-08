/**
 * Geometric Behavior implementation for reactive programming
 */

import { Multivector } from './multivector';
import type { MultivectorData, BehaviorTransform } from './types';

// Import WASM bindings
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - WASM module will be generated
import { GeometricBehaviorJs } from './wasm/cliffy_wasm';

export class GeometricBehavior {
  private wasm: GeometricBehaviorJs;
  private subscribers: Set<(value: Multivector) => void> = new Set();

  constructor(initialValue: Multivector) {
    this.wasm = new GeometricBehaviorJs(initialValue.getWasmObject());
  }

  static constant(value: Multivector): GeometricBehavior {
    return new GeometricBehavior(value);
  }

  sample(): Multivector {
    const wasmResult = this.wasm.sample();
    const coeffs = wasmResult.getCoeffs();
    return new Multivector(coeffs);
  }

  update(newValue: Multivector): void {
    this.wasm.update(newValue.getWasmObject());
    this.notifySubscribers(newValue);
  }

  transform(transformer: BehaviorTransform<MultivectorData>): GeometricBehavior {
    // Create a wrapper function for the WASM interface
    const wasmTransformer = (wasmMv: any) => {
      const coeffs = wasmMv.getCoeffs();
      const mv = new Multivector(coeffs);
      const result = transformer(mv.toJSON());
      return Multivector.fromJSON(result).getWasmObject();
    };

    const transformedWasm = this.wasm.transformWith(wasmTransformer);
    const behavior = new GeometricBehavior(Multivector.zero());
    behavior.wasm = transformedWasm;
    return behavior;
  }

  map<U>(fn: (value: Multivector) => U): Behavior<U> {
    return new Behavior<U>(() => fn(this.sample()));
  }

  combine<T, U>(other: GeometricBehavior, combiner: (a: Multivector, b: Multivector) => Multivector): GeometricBehavior {
    const combined = new GeometricBehavior(combiner(this.sample(), other.sample()));
    
    // Subscribe to both behaviors
    this.subscribe((a) => {
      const b = other.sample();
      combined.update(combiner(a, b));
    });
    
    other.subscribe((b) => {
      const a = this.sample();
      combined.update(combiner(a, b));
    });
    
    return combined;
  }

  subscribe(callback: (value: Multivector) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(value: Multivector): void {
    for (const callback of this.subscribers) {
      try {
        callback(value);
      } catch (error) {
        console.error('Error in GeometricBehavior subscriber:', error);
      }
    }
  }

  // Geometric-specific operations
  withRotor(rotor: GeometricBehavior): GeometricBehavior {
    return this.combine(rotor, (x, r) => r.sandwich(x));
  }

  integrate(dt: number = 1/60): GeometricBehavior {
    let accumulator = Multivector.zero();
    
    return this.transform((data) => {
      const current = Multivector.fromJSON(data);
      accumulator = accumulator.add(current.scale(dt));
      return accumulator.toJSON();
    });
  }

  differentiate(dt: number = 1/60): GeometricBehavior {
    let previous = this.sample();
    
    return this.transform((data) => {
      const current = Multivector.fromJSON(data);
      const derivative = current.subtract(previous).scale(1 / dt);
      previous = current;
      return derivative.toJSON();
    });
  }

  delay(frames: number = 1): GeometricBehavior {
    const buffer: Multivector[] = [];
    
    return this.transform((data) => {
      const current = Multivector.fromJSON(data);
      buffer.push(current);
      
      if (buffer.length > frames) {
        const delayed = buffer.shift()!;
        return delayed.toJSON();
      } else {
        return current.toJSON();
      }
    });
  }
}

// Generic behavior class for non-geometric values
export class Behavior<T> {
  private sampler: () => T;
  private subscribers: Set<(value: T) => void> = new Set();

  constructor(sampler: () => T) {
    this.sampler = sampler;
  }

  sample(): T {
    return this.sampler();
  }

  map<U>(fn: (value: T) => U): Behavior<U> {
    return new Behavior<U>(() => fn(this.sample()));
  }

  subscribe(callback: (value: T) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  static constant<T>(value: T): Behavior<T> {
    return new Behavior(() => value);
  }

  static time(): Behavior<number> {
    const startTime = Date.now();
    return new Behavior(() => (Date.now() - startTime) / 1000);
  }

  static animationFrame(): Behavior<number> {
    return new Behavior(() => performance.now() / 1000);
  }
}

// Utility functions for creating common behaviors
export function interpolateRotors(
  from: GeometricBehavior,
  to: GeometricBehavior,
  t: Behavior<number>
): GeometricBehavior {
  return from.combine(to, (a, b) => {
    const tValue = t.sample();
    
    // Spherical linear interpolation for rotors
    const diff = b.geometricProduct(a.conjugate());
    const logDiff = diff.log();
    const interpolatedLog = logDiff.scale(tValue);
    const interpolatedRotor = interpolatedLog.exp();
    
    return a.geometricProduct(interpolatedRotor);
  });
}

export function oscillator(frequency: number, amplitude: number = 1): GeometricBehavior {
  const time = Behavior.time();
  return new GeometricBehavior(
    Multivector.scalar(amplitude).scale(Math.sin(2 * Math.PI * frequency * time.sample()))
  );
}

export function spiral(radius: number, frequency: number): GeometricBehavior {
  const time = Behavior.time();
  const angle = time.map(t => 2 * Math.PI * frequency * t);
  
  return new GeometricBehavior(
    Multivector.e1().scale(radius * Math.cos(angle.sample()))
      .add(Multivector.e2().scale(radius * Math.sin(angle.sample())))
  );
}