# DOM Projection Guide

Cliffy provides direct DOM projection from reactive state, bypassing virtual DOM entirely. This guide covers `DOMProjection`, `ProjectionScheduler`, and efficient rendering patterns.

## Why Direct DOM Projection?

| Virtual DOM | Direct DOM Projection |
|-------------|----------------------|
| Create virtual tree on each render | Update only affected properties |
| Diff old vs new tree | No diffing needed |
| Patch DOM with changes | Direct property updates |
| O(n) reconciliation | O(1) targeted updates |

Cliffy knows exactly which DOM properties depend on which state, enabling surgical updates.

## DOMProjection

A `DOMProjection` connects a piece of state to a specific DOM property.

### Text Content

```typescript
import { DOMProjection } from '@cliffy/core';

const element = document.getElementById('display')!;

// Create a text projection
const textProj = DOMProjection.text(element, state => `Value: ${state}`);

// Update the DOM
textProj.update('42');  // Sets textContent to "Value: 42"
```

### Style Properties

```typescript
// Project state to a CSS property
const colorProj = DOMProjection.style(element, 'color', state =>
    state > 10 ? 'green' : 'red'
);

colorProj.update('green');

// Works with any CSS property
const transformProj = DOMProjection.style(element, 'transform', state =>
    `translateX(${state}px)`
);
```

### Attributes

```typescript
// Project state to an attribute
const attrProj = DOMProjection.attribute(element, 'data-count', state =>
    String(state)
);

attrProj.update('42');  // Sets data-count="42"
```

### Class Toggle

```typescript
// Toggle a CSS class based on state
const classProj = DOMProjection.classToggle(element, 'active', state =>
    state > 0
);

classProj.update(true);   // Adds 'active' class
classProj.update(false);  // Removes 'active' class
```

### Data Attributes

```typescript
// Project to data-* attributes
const dataProj = DOMProjection.data(element, 'userId', state =>
    String(state.id)
);

dataProj.update('123');  // Sets data-user-id="123"
```

## Connecting to Behaviors

The power of DOM projections comes from connecting them to reactive Behaviors:

```typescript
import { Behavior, DOMProjection } from '@cliffy/core';

const count = new Behavior(0);
const display = document.getElementById('display')!;

const textProj = DOMProjection.text(display, state => `Count: ${state}`);

// Automatically update DOM when behavior changes
count.subscribe(value => {
    textProj.update(String(value));
});

// Now any state change updates the DOM
count.set(10);  // DOM shows "Count: 10"
count.update(n => n + 1);  // DOM shows "Count: 11"
```

## ProjectionScheduler

For high-frequency updates, batch changes to animation frames:

```typescript
import { Behavior, DOMProjection, ProjectionScheduler } from '@cliffy/core';

const scheduler = new ProjectionScheduler();

const x = new Behavior(0);
const y = new Behavior(0);
const element = document.getElementById('box')!;

const transformProj = DOMProjection.style(element, 'transform', () => '');

// Schedule updates instead of immediate application
function updatePosition() {
    const transform = `translate(${x.sample()}px, ${y.sample()}px)`;
    scheduler.schedule(transformProj, transform);
}

x.subscribe(updatePosition);
y.subscribe(updatePosition);

// Updates are batched to next animation frame
// Even if x and y change 100 times, only one DOM update occurs
```

### Scheduler Methods

```typescript
const scheduler = new ProjectionScheduler();

// Schedule an update for next animation frame
scheduler.schedule(projection, value);

// Check pending update count
console.log(scheduler.pendingCount);  // Number of batched updates

// Force immediate flush (skip animation frame)
scheduler.flush();
```

## ElementProjections Builder

Set up multiple projections on one element efficiently:

```typescript
import { ElementProjections, GeometricState } from '@cliffy/core';

const element = document.getElementById('card')!;

const projections = new ElementProjections(element)
    .text(state => `Value: ${state[0]}`)
    .style('opacity', state => String(Math.min(1, state[0] / 100)))
    .classToggle('highlight', state => state[0] > 50);

// Apply all projections at once
const state = GeometricState.fromScalar(42);
projections.applyAll(state);
```

## Geometric State Integration

Use `GeometricState` for complex animations and transforms:

```typescript
import {
    GeometricState,
    Rotor,
    DOMProjection,
    stateToTransform
} from '@cliffy/core';

const element = document.getElementById('sprite')!;
const transformProj = DOMProjection.style(element, 'transform', () => '');

// Create animated state
let state = GeometricState.fromVector(100, 50, 0);
const rotation = Rotor.xy(Math.PI / 60);  // 3 degrees per frame

function animate() {
    // Apply rotation
    state = state.applyRotor(rotation);
    const [x, y, z] = state.asVector();

    // Update DOM
    const transform = stateToTransform(x, y, z, 0, 1);
    transformProj.update(transform);

    requestAnimationFrame(animate);
}

animate();
```

## Helper Functions

### stateToTransform

Create CSS transform strings from geometric values:

```typescript
import { stateToTransform } from '@cliffy/core';

const transform = stateToTransform(
    100,  // x (pixels)
    50,   // y (pixels)
    0,    // z (pixels)
    45,   // rotation (degrees)
    1.5   // scale
);
// Returns: "translate3d(100px, 50px, 0px) rotate(45deg) scale(1.5)"
```

### stateToColor

Create RGBA color strings from normalized values:

```typescript
import { stateToColor } from '@cliffy/core';

const color = stateToColor(
    1.0,  // r (0-1)
    0.5,  // g (0-1)
    0.0,  // b (0-1)
    0.8   // a (0-1)
);
// Returns: "rgba(255, 127, 0, 0.8)"
```

## Complete Example: Animated Counter

```typescript
import {
    Behavior,
    Event,
    DOMProjection,
    ProjectionScheduler,
    stateToColor
} from '@cliffy/core';

// State
const count = new Behavior(0);

// DOM elements
const display = document.getElementById('count')!;
const incBtn = document.getElementById('increment')!;
const decBtn = document.getElementById('decrement')!;

// Projections
const textProj = DOMProjection.text(display, () => '');
const colorProj = DOMProjection.style(display, 'color', () => '');
const scaleProj = DOMProjection.style(display, 'transform', () => '');

// Scheduler for batched updates
const scheduler = new ProjectionScheduler();

// React to state changes
count.subscribe(value => {
    // Text
    scheduler.schedule(textProj, String(value));

    // Color based on value (green for positive, red for negative)
    const normalized = Math.min(1, Math.abs(value) / 10);
    const color = value >= 0
        ? stateToColor(0, normalized, 0, 1)
        : stateToColor(normalized, 0, 0, 1);
    scheduler.schedule(colorProj, color);

    // Scale based on magnitude
    const scale = 1 + Math.abs(value) * 0.02;
    scheduler.schedule(scaleProj, `scale(${scale})`);
});

// Events
const increment = new Event<void>();
const decrement = new Event<void>();

increment.subscribe(() => count.update(n => n + 1));
decrement.subscribe(() => count.update(n => n - 1));

// Connect to DOM events
incBtn.onclick = () => increment.emit();
decBtn.onclick = () => decrement.emit();
```

## Performance Tips

### 1. Use the Scheduler for High-Frequency Updates

```typescript
// Bad: Direct updates cause multiple reflows
mousemove.subscribe(e => {
    xProj.update(String(e.clientX));  // Reflow
    yProj.update(String(e.clientY));  // Reflow
});

// Good: Batched to single animation frame
mousemove.subscribe(e => {
    scheduler.schedule(xProj, String(e.clientX));
    scheduler.schedule(yProj, String(e.clientY));
});
```

### 2. Create Projections Once

```typescript
// Bad: Creating projection on every update
count.subscribe(value => {
    const proj = DOMProjection.text(element, () => '');  // Creates new object
    proj.update(String(value));
});

// Good: Create once, reuse
const proj = DOMProjection.text(element, () => '');
count.subscribe(value => {
    proj.update(String(value));
});
```

### 3. Use GeometricState for Complex Animations

```typescript
// Good: Let geometric algebra handle interpolation
const start = GeometricState.fromVector(0, 0, 0);
const end = GeometricState.fromVector(100, 50, 0);

function animate(t: number) {
    const current = start.lerp(end, t);
    const [x, y, z] = current.asVector();
    transformProj.update(stateToTransform(x, y, z, 0, 1));
}
```

## Next Steps

- [Getting Started](./getting-started.md) - Core concepts
- [FRP Guide](./frp-guide.md) - Reactive patterns
- [Geometric Algebra Primer](./geometric-algebra-primer.md) - Understanding transforms
- [Architecture](./architecture/) - Design decisions
