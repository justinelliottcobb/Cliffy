# Getting Started with Cliffy

Cliffy is a reactive UI framework built on geometric algebra. This guide will get you up and running with your first Cliffy application.

## Prerequisites

- Node.js 18+ (for web development)

## Installation

Use the scaffolding tool to create a new project:

```bash
npx create-cliffy my-app --template typescript-vite
cd my-app
npm install
npm run dev
```

Or add to an existing project:

```bash
npm install @cliffy/core
```

## Core Concepts

Cliffy uses **Functional Reactive Programming (FRP)** with two fundamental primitives:

### Behavior: Time-Varying Values

A `Behavior` represents a value that changes over time. Think of it as a cell in a spreadsheet that can update.

```typescript
import { Behavior } from '@cliffy/core';

// Create a behavior with initial value
const count = new Behavior(0);

// Read the current value
console.log(count.sample());  // 0

// Update the value with a transform function
count.update(n => n + 1);
console.log(count.sample());  // 1

// Set directly
count.set(100);
console.log(count.sample());  // 100
```

### Event: Discrete Occurrences

An `Event` represents discrete happenings like clicks or key presses.

```typescript
import { Event } from '@cliffy/core';

// Create an event stream
const clicks = new Event();

// Subscribe to events
clicks.subscribe(value => {
    console.log('Clicked!', value);
});

// Emit an event
clicks.emit({ x: 100, y: 200 });
```

### Reactive Subscriptions

Behaviors notify subscribers when they change:

```typescript
const count = new Behavior(0);

// Subscribe to changes
count.subscribe(value => {
    console.log('Count is now:', value);
});

count.set(1);  // Logs: "Count is now: 1"
count.set(2);  // Logs: "Count is now: 2"
```

### Derived Behaviors with `map`

Create new behaviors that automatically update:

```typescript
const count = new Behavior(5);
const doubled = count.map(n => n * 2);

console.log(doubled.sample());  // 10

count.set(10);
console.log(doubled.sample());  // 20 - Automatically updated!
```

### Combining Behaviors

Combine multiple behaviors into one:

```typescript
import { Behavior, combine } from '@cliffy/core';

const width = new Behavior(10);
const height = new Behavior(20);
const area = combine(width, height, (w, h) => w * h);

console.log(area.sample());  // 200

width.set(15);
console.log(area.sample());  // 300 - Automatically recalculated!
```

## Your First App: Counter

Here's a complete counter example:

```typescript
import { Behavior, Event } from '@cliffy/core';

// State
const count = new Behavior(0);

// Derived state
const displayText = count.map(n => `Count: ${n}`);

// Subscribe to render
displayText.subscribe(text => {
    document.getElementById('display')!.textContent = text;
});

// Events
const increment = new Event<void>();
const decrement = new Event<void>();

// Wire events to state
increment.subscribe(() => count.update(n => n + 1));
decrement.subscribe(() => count.update(n => n - 1));

// Connect to DOM
document.getElementById('inc')!.onclick = () => increment.emit();
document.getElementById('dec')!.onclick = () => decrement.emit();
```

```html
<div id="display">Count: 0</div>
<button id="inc">+</button>
<button id="dec">-</button>
```

## Combinators

Cliffy provides combinators for common patterns:

### `when` - Conditional Values

```typescript
import { Behavior, when } from '@cliffy/core';

const showMessage = new Behavior(true);
const message = when(showMessage, () => "Hello!");

console.log(message.sample());  // "Hello!"

showMessage.set(false);
console.log(message.sample());  // null
```

### `ifElse` - Conditional Selection

```typescript
import { Behavior, ifElse } from '@cliffy/core';

const isDarkMode = new Behavior(false);
const theme = ifElse(isDarkMode, () => "dark", () => "light");

console.log(theme.sample());  // "light"

isDarkMode.set(true);
console.log(theme.sample());  // "dark"
```

### `fold` - Accumulate Events

```typescript
import { Event } from '@cliffy/core';

const clicks = new Event<void>();
const clickCount = clicks.fold(0, (n, _) => n + 1);

console.log(clickCount.sample());  // 0

clicks.emit();
clicks.emit();
console.log(clickCount.sample());  // 2
```

## Event Transformations

### `map` - Transform Event Values

```typescript
const numbers = new Event<number>();
const doubled = numbers.map(n => n * 2);

doubled.subscribe(n => console.log('Got:', n));

numbers.emit(5);  // Logs: "Got: 10"
```

### `filter` - Select Events

```typescript
const numbers = new Event<number>();
const evens = numbers.filter(n => n % 2 === 0);

evens.subscribe(n => console.log('Even:', n));

numbers.emit(1);  // Nothing
numbers.emit(2);  // Logs: "Even: 2"
numbers.emit(3);  // Nothing
numbers.emit(4);  // Logs: "Even: 4"
```

### `merge` - Combine Event Streams

```typescript
const clicks = new Event<string>();
const keys = new Event<string>();
const inputs = clicks.merge(keys);

inputs.subscribe(s => console.log('Input:', s));

clicks.emit('click');  // Logs: "Input: click"
keys.emit('key');      // Logs: "Input: key"
```

## Geometric State (Advanced)

For animations, physics, and explicit geometric control, use `GeometricState`:

```typescript
import { GeometricState, Rotor, Translation } from '@cliffy/core';

// Create state from a 3D position
const pos = GeometricState.fromVector(1, 0, 0);

// Apply a 90-degree rotation in the XY plane (around Z axis)
const rot = Rotor.xy(Math.PI / 2);
const rotated = pos.applyRotor(rot);

// Apply a translation
const trans = new Translation(1, 0, 0);
const translated = rotated.applyTranslation(trans);

// Read the result
const [x, y, z] = translated.asVector();
console.log(x, y, z);  // ~1, ~1, ~0
```

## DOM Projections

For efficient DOM updates without virtual DOM, use `DOMProjection`:

```typescript
import { Behavior, DOMProjection, ProjectionScheduler } from '@cliffy/core';

const count = new Behavior(0);
const display = document.getElementById('display')!;

// Create projections for different DOM properties
const textProj = DOMProjection.text(display, state => `Count: ${state}`);
const styleProj = DOMProjection.style(display, 'color', state =>
    state > 10 ? 'green' : 'black'
);

// Subscribe to update DOM when state changes
count.subscribe(value => {
    textProj.update(String(value));
    styleProj.update(value > 10 ? 'green' : 'black');
});

// Or use a scheduler for batched updates
const scheduler = new ProjectionScheduler();
count.subscribe(value => {
    scheduler.schedule(textProj, `Count: ${value}`);
    scheduler.schedule(styleProj, value > 10 ? 'green' : 'black');
});
```

## Next Steps

- Read the [FRP Guide](./frp-guide.md) for reactive patterns
- Explore the [Geometric Algebra Primer](./geometric-algebra-primer.md)
- Learn the [DOM Projection Guide](./dom-projection-guide.md) for efficient rendering
- Check out the [examples](../examples/) for complete applications
- See the [Architecture docs](./architecture/) for design decisions

## Key Differences from React/Redux

| Concept | React/Redux | Cliffy |
|---------|------------|--------|
| State | `useState`, Redux store | `Behavior` |
| Derived state | `useMemo`, selectors | `behavior.map()` |
| Events | Callbacks, actions | `Event` |
| Side effects | `useEffect` | `subscribe()` |
| Combining state | Multiple hooks | `combine()` |
| DOM updates | Virtual DOM diffing | Direct `DOMProjection` |

Cliffy's approach is more declarative: you describe the relationships between values, and updates propagate automatically. DOM updates happen directly without virtual DOM reconciliation.
