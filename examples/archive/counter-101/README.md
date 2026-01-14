# Counter-101: The Simplest Cliffy Example

This is the minimal "hello world" for Cliffy, demonstrating core FRP concepts.

## What It Demonstrates

### Behavior (Time-Varying Values)

```typescript
// Create reactive state
const count = behavior(0);

// Derive computed values (automatically updates)
const doubled = count.map(n => n * 2);
const isEven = count.map(n => n % 2 === 0);

// Update state
count.update(n => n + 1);
```

### DOM Bindings

```typescript
import { bindText, bindClass, fromClick, BindingGroup } from '@cliffy/core';

// Manage subscriptions together
const bindings = new BindingGroup();

// One-way binding: Behavior → DOM
bindings.add(bindText(document.getElementById('count')!, count));
bindings.add(bindClass(document.getElementById('count')!, 'even', isEven));

// Create events from DOM clicks
const clicks = fromClick(document.getElementById('btn')!);
clicks.subscribe(() => count.update(n => n + 1));

// Cleanup when done
bindings.dispose();
```

### Combinators

```typescript
// Conditional behavior
const parity = ifElse(isEven, () => 'even', () => 'odd');

// Combined behavior
const area = combine(width, height, (w, h) => w * h);
```

### Event (Discrete Occurrences)

```typescript
// Create event from DOM clicks
const clicks = fromClick(button);

// Fold events into behavior (accumulate)
const clickCount = clicks.fold(0, (acc, _) => acc + 1);
```

## Running

```bash
npm install
npm run dev
```

Opens at http://localhost:3000

## Available DOM Bindings

### One-Way (Behavior → DOM)
- `bindText(element, behavior)` - Bind text content
- `bindAttr(element, 'href', behavior)` - Bind attribute
- `bindProp(element, 'disabled', behavior)` - Bind property
- `bindClass(element, 'active', boolBehavior)` - Toggle CSS class
- `bindClasses(element, recordBehavior)` - Toggle multiple classes
- `bindStyle(element, 'color', behavior)` - Bind CSS property
- `bindStyles(element, recordBehavior)` - Bind multiple styles
- `bindVisible(element, boolBehavior)` - Show/hide element
- `bindDisabled(element, boolBehavior)` - Enable/disable form element

### Two-Way (Behavior ↔ DOM)
- `bindValue(input, behavior)` - Text input binding
- `bindChecked(checkbox, boolBehavior)` - Checkbox binding
- `bindNumber(input, numBehavior)` - Numeric input binding

### Event Creation
- `fromEvent(element, 'click')` - Any DOM event
- `fromClick(element)` - Click events
- `fromInput(input)` - Input value changes
- `fromChange(input)` - Change events
- `fromSubmit(form)` - Form submissions
- `fromKeyboard(element, 'keydown')` - Keyboard events

## Key Concepts

1. **Behaviors are signals, not state** — They always have a current value
2. **Events are occurrences, not callbacks** — They're streams you can transform
3. **Derived values update automatically** — No manual dependency tracking
4. **DOM bindings are declarative** — No manual DOM manipulation
5. **No React patterns** — No hooks, no effects, no virtual DOM

## Architecture

```
User Code (TypeScript)
    ↓
@cliffy/core (thin wrapper)
    ↓
cliffy-wasm (WASM bindings)
    ↓
cliffy-core (Rust FRP + GA)
    ↓
amari-core (Geometric Algebra)
```

The geometric algebra is completely hidden from users. What you write is simple and familiar. What happens underneath is mathematically elegant.
