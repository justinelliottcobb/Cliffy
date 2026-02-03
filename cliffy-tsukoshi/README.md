# cliffy-tsukoshi

Minimal geometric state management for JavaScript/TypeScript. Pure TypeScript, zero dependencies, works everywhere including React Native.

## Features

- **GeometricState** - Smooth state interpolation via `.blend()`
- **Rotor** - Rotation representation with SLERP interpolation
- **Transform** - Combined rotation + translation
- **Zero dependencies** - Pure TypeScript math
- **Universal** - Works in browser, Node.js, React Native, Deno

## Installation

```bash
npm install cliffy-tsukoshi
```

## Quick Start

```typescript
import { GeometricState, Rotor, Transform } from 'cliffy-tsukoshi';

// Create position state
const position = GeometricState.fromVector(100, 200, 0);

// Smooth interpolation (the key feature!)
const target = GeometricState.fromVector(300, 400, 0);
const smoothed = position.blend(target, 0.15); // Move 15% toward target

// Apply rotation (45 degrees in XY plane)
const rotation = Rotor.xy(Math.PI / 4);
const rotated = position.applyRotor(rotation);

// Full transform (rotation + translation)
const transform = Transform.new(
  Rotor.xz(Math.PI / 6),
  { x: 10, y: 20, z: 0 }
);
const transformed = position.applyTransform(transform);

// Extract values
const [x, y, z] = smoothed.asVector();
console.log(`Position: (${x}, ${y}, ${z})`);
```

## Core Concepts

### GeometricState

The main container for position/state data. Internally uses GA3 (3D Geometric Algebra) but exposes a simple vector interface.

```typescript
// Create states
const pos = GeometricState.fromVector(x, y, z);
const pos2D = GeometricState.fromVector2D(x, y);
const value = GeometricState.fromScalar(42);

// Smooth interpolation - the killer feature
// In a game loop: position = position.blend(target, 0.1)
const smoothed = current.blend(target, t);

// Arithmetic
const sum = a.add(b);
const diff = a.sub(b);
const scaled = a.scale(2);

// Extract values
const [x, y, z] = state.asVector();
const { x, y, z } = state.asVectorObject();
const scalar = state.asScalar();
```

### Rotor (Rotations)

Rotors represent rotations without gimbal lock. They support smooth interpolation via SLERP.

```typescript
// Create rotations
const r1 = Rotor.xy(angle);  // Around Z axis
const r2 = Rotor.xz(angle);  // Around Y axis
const r3 = Rotor.yz(angle);  // Around X axis
const r4 = Rotor.fromAxisAngle(ax, ay, az, angle);

// Apply to state
const rotated = position.applyRotor(rotation);

// Compose rotations
const combined = r1.then(r2);  // r1 first, then r2

// Interpolate (SLERP)
const halfway = r1.slerpTo(r2, 0.5);
```

### Transform (Rotation + Translation)

Combines rotation and translation into a single operation.

```typescript
// Create transforms
const t = Transform.new(rotor, { x: 10, y: 20, z: 0 });
const tRotate = Transform.rotation(rotor);
const tMove = Transform.fromTranslation({ x: 10, y: 0, z: 0 });

// Apply
const transformed = position.applyTransform(t);

// Compose
const combined = t1.then(t2);

// Interpolate
const halfway = t1.interpolateTo(t2, 0.5);
```

### ReactiveState

A mutable container with subscriptions for reactive updates.

```typescript
import { reactiveState, GeometricState } from 'cliffy-tsukoshi';

const position = reactiveState(GeometricState.fromVector(0, 0, 0));

// Subscribe to changes
position.subscribe((state) => {
  const [x, y, z] = state.asVector();
  updateUI(x, y, z);
});

// Update (triggers subscribers)
position.set(GeometricState.fromVector(100, 200, 0));

// Smooth update
position.blendTo(target, 0.1);
```

## Common Patterns

### Smooth Following (Game Loop)

```typescript
function gameLoop() {
  // Smooth follow: move 10% toward target each frame
  playerPosition = playerPosition.blend(targetPosition, 0.1);

  // Smooth rotation
  playerRotation = playerRotation.slerpTo(targetRotation, 0.1);

  render();
  requestAnimationFrame(gameLoop);
}
```

### 2D Game Movement

```typescript
const position = GeometricState.fromVector2D(100, 100);
const velocity = GeometricState.fromVector2D(5, 0);

function update() {
  // Move
  position = position.add(velocity);

  // Rotate velocity (turn)
  const turn = Rotor.xy(turnAngle);
  velocity = velocity.applyRotor(turn);
}
```

### React Native Integration

```typescript
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { GeometricState } from 'cliffy-tsukoshi';

function useGeometricAnimation(target: GeometricState) {
  const position = useRef(GeometricState.zero());
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      position.current = position.current.blend(target, 0.1);
      const [x, y] = position.current.asVector2D();
      animX.setValue(x);
      animY.setValue(y);
    }, 16);

    return () => clearInterval(interval);
  }, [target]);

  return { x: animX, y: animY };
}
```

## Why Geometric Algebra?

Under the hood, cliffy-tsukoshi uses GA3 (Clifford Algebra Cl(3,0)). This provides:

1. **Unified representation** - Scalars, vectors, rotations all in one type
2. **No gimbal lock** - Rotors avoid quaternion edge cases
3. **Composable** - Rotations compose correctly via geometric product
4. **Interpolation** - SLERP "just works" for smooth rotation blending

You don't need to understand GA to use the library - the API is designed around familiar vector operations.

## API Reference

### GeometricState

| Method | Description |
|--------|-------------|
| `fromVector(x, y, z)` | Create from 3D coordinates |
| `fromVector2D(x, y)` | Create from 2D coordinates |
| `fromScalar(n)` | Create from scalar value |
| `blend(target, t)` | Interpolate toward target |
| `add(other)` | Vector addition |
| `sub(other)` | Vector subtraction |
| `scale(factor)` | Scalar multiplication |
| `applyRotor(r)` | Apply rotation |
| `applyTransform(t)` | Apply rotation + translation |
| `asVector()` | Extract as [x, y, z] |
| `asVector2D()` | Extract as [x, y] |
| `asScalar()` | Extract scalar value |
| `distance(other)` | Euclidean distance |
| `magnitude()` | Vector length |

### Rotor

| Method | Description |
|--------|-------------|
| `xy(angle)` | Rotation in XY plane (around Z) |
| `xz(angle)` | Rotation in XZ plane (around Y) |
| `yz(angle)` | Rotation in YZ plane (around X) |
| `fromAxisAngle(ax, ay, az, angle)` | From axis-angle |
| `identity()` | No rotation |
| `transform(v)` | Apply to multivector |
| `then(other)` | Compose rotations |
| `inverse()` | Reverse rotation |
| `slerp(t)` | Interpolate from identity |
| `slerpTo(other, t)` | Interpolate to other |
| `angle()` | Get rotation angle |

### Transform

| Method | Description |
|--------|-------------|
| `new(rotor, translation)` | Create from components |
| `identity()` | No transformation |
| `rotation(rotor)` | Pure rotation |
| `fromTranslation(t)` | Pure translation |
| `apply(v)` | Apply to multivector |
| `then(other)` | Compose transforms |
| `inverse()` | Reverse transform |
| `interpolateTo(other, t)` | Interpolate to other |

## License

MIT

## Part of Cliffy

cliffy-tsukoshi is the pure TypeScript extraction of geometric state management from [Cliffy](https://github.com/justinelliottcobb/Cliffy), a framework for building collaborative applications using geometric algebra.
