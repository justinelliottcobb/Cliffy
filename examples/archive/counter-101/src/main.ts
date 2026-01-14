/**
 * Counter-101: The simplest possible Cliffy example
 *
 * This demonstrates:
 * - Creating reactive state with behavior()
 * - Deriving computed values with map()
 * - DOM bindings with bindText(), bindClass()
 * - Event streams with fromClick()
 * - Combining behaviors
 */

import {
  init,
  behavior,
  combine,
  ifElse,
  // DOM bindings
  bindText,
  bindClass,
  fromClick,
  BindingGroup,
} from '@cliffy/core';

// Initialize WASM (required before using any other Cliffy functions)
await init();

console.log('Cliffy initialized!');

// Create a binding group to manage all subscriptions
const bindings = new BindingGroup();

// ============================================================================
// Create reactive state
// ============================================================================

// A behavior representing the current count
const count = behavior(0);

// Derived behaviors - automatically update when count changes
const doubled = count.map(n => n * 2);
const isEven = count.map(n => n % 2 === 0);
const parity = ifElse(isEven, () => 'even', () => 'odd');

// Combined behavior
const width = behavior(100);
const height = behavior(50);
const area = combine(width, height, (w, h) => w * h);

// ============================================================================
// Bind behaviors to DOM elements
// ============================================================================

// Much cleaner than manual subscriptions!
bindings.add(bindText(document.getElementById('count')!, count));
bindings.add(bindText(document.getElementById('doubled')!, doubled));
bindings.add(bindText(document.getElementById('parity')!, parity));
bindings.add(bindText(document.getElementById('area')!, area));

// Conditionally toggle a CSS class based on isEven
bindings.add(bindClass(document.getElementById('count')!, 'even', isEven));

// ============================================================================
// Create events from DOM clicks
// ============================================================================

// fromClick creates a Cliffy Event from DOM click events
const incrementClicks = fromClick(document.getElementById('increment')!);
const decrementClicks = fromClick(document.getElementById('decrement')!);
const resetClicks = fromClick(document.getElementById('reset')!);

// Subscribe to events and update state
bindings.add(incrementClicks.subscribe(() => count.update(n => n + 1)));
bindings.add(decrementClicks.subscribe(() => count.update(n => n - 1)));
bindings.add(resetClicks.subscribe(() => count.set(0)));

// Width/Height controls
const widthUpClicks = fromClick(document.getElementById('widthUp')!);
const heightUpClicks = fromClick(document.getElementById('heightUp')!);

bindings.add(widthUpClicks.subscribe(() => width.update(w => w + 10)));
bindings.add(heightUpClicks.subscribe(() => height.update(h => h + 10)));

// ============================================================================
// Events example: click counter using fold
// ============================================================================

const targetClicks = fromClick(document.getElementById('clickTarget')!);
const clickCount = targetClicks.fold(0, (acc, _) => acc + 1);

bindings.add(bindText(document.getElementById('clickCount')!, clickCount));

console.log('Counter-101 ready!');

// Note: In a real app, you would call bindings.dispose() when cleaning up
// For example, in a component unmount or when navigating away
