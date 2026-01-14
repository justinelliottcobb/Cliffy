# Cliffy Examples

## Current Examples

### counter-101 (Reference Implementation)

The minimal "hello world" for Cliffy, demonstrating the new foundation-first architecture (January 2026):

- **Behaviors**: Reactive state with `behavior()`, derived values with `.map()`
- **Events**: Click streams with `fromClick()`, accumulation with `.fold()`
- **DOM Bindings**: `bindText()`, `bindClass()`, `BindingGroup`
- **Combinators**: `ifElse()`, `combine()`

```bash
cd counter-101
npm install
npm run dev
# Open http://localhost:3000
```

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

## Key Concepts

### Behaviors (Time-Varying Values)

```typescript
// Create reactive state
const count = behavior(0);

// Derive computed values (automatically updates)
const doubled = count.map(n => n * 2);
const isEven = count.map(n => n % 2 === 0);

// Update state
count.update(n => n + 1);
count.set(0);
```

### Events (Discrete Occurrences)

```typescript
// Create events from DOM
const clicks = fromClick(button);
const inputs = fromInput(textField);

// Fold events into behaviors
const clickCount = clicks.fold(0, (acc, _) => acc + 1);

// Filter and map events
const enterKeys = fromKeyboard(input, 'keydown')
  .filter(e => e.key === 'Enter');
```

### DOM Bindings

```typescript
// One-way bindings (Behavior → DOM)
bindText(element, count);
bindClass(element, 'active', isActive);
bindStyle(element, 'opacity', opacity);
bindVisible(element, isVisible);

// Two-way bindings (Behavior ↔ DOM)
bindValue(input, text);
bindChecked(checkbox, checked);
bindNumber(slider, value);
```

### Combinators

```typescript
// Conditional value
const message = ifElse(isLoggedIn, () => 'Welcome!', () => 'Please log in');

// Combined behaviors
const area = combine(width, height, (w, h) => w * h);

// Optional value
const content = when(showDetails, () => 'Details here...');
```

---

## Archived Examples

Previous examples using the older Algebraic JSX approach have been moved to `archive/`.
See `archive/MIGRATION.md` for detailed migration plans.

| Example | Description | Migration Complexity |
|---------|-------------|---------------------|
| basic-counter | Simple counter | Simple |
| form-validation | Multi-field validation | Simple |
| todo-app | TodoMVC implementation | Medium |
| geometric-animations | Animation showcase | Simple |
| algebraic-tsx-test | Vite plugin testing | Simple |
| dashboard | Dashboard UI | Unknown |
| collaborative-editor | Real-time CRDT editor | Complex |
| geometric-visualization | 3D Three.js demos | Complex |

---

## Creating New Examples

Use counter-101 as a template:

```bash
cp -r counter-101 my-new-example
cd my-new-example
# Edit package.json name
# Edit src/main.ts
npm install
npm run dev
```

### Recommended Structure

```
my-example/
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .env              # VITE_ALLOWED_HOST for remote access
├── .gitignore        # Include .env
└── src/
    └── main.ts
```

### Template main.ts

```typescript
import {
  init,
  behavior,
  combine,
  ifElse,
  bindText,
  bindClass,
  fromClick,
  BindingGroup,
} from '@cliffy/core';

await init();

// Manage subscriptions
const bindings = new BindingGroup();

// Create reactive state
const count = behavior(0);
const isEven = count.map(n => n % 2 === 0);

// Bind to DOM
bindings.add(bindText(document.getElementById('count')!, count));
bindings.add(bindClass(document.getElementById('count')!, 'even', isEven));

// Handle events
const clicks = fromClick(document.getElementById('button')!);
bindings.add(clicks.subscribe(() => count.update(n => n + 1)));

// Cleanup when done (e.g., on page unload)
// bindings.dispose();
```

---

## Development

### Running from Root

```bash
# From cliffy root directory
npm run dev              # Runs counter-101 with WASM hot reload
npm run example counter-101  # Same as above
```

### Build System

All examples use:
- **Vite** for development and building
- **TypeScript** for type safety
- **ESM modules** for modern JavaScript
- **Hot reloading** for both TypeScript and WASM

### Remote Access

To access dev server remotely, create `.env` in the example directory:

```env
VITE_ALLOWED_HOST=your-hostname.example.com
```
