# @cliffy-ga/components

UI component library for [Cliffy](https://github.com/Industrial-Algebra/cliffy) applications.

## Installation

```bash
npm install @cliffy-ga/components @cliffy-ga/core
```

## Usage

```typescript
import { Button, Stack, Text } from '@cliffy-ga/components';
import { behavior, mount } from '@cliffy-ga/core';

// Import theme CSS
import '@cliffy-ga/components/theme.css';

const count = behavior(0);
const label = count.map(n => `Count: ${n}`);

async function app() {
  const ui = await Stack({ direction: 'vertical', gap: 'md' }, [
    await Text({ content: 'Counter Example', size: 'xl', weight: 'bold' }),
    await Text({ content: label }),
    await Button({
      label: 'Increment',
      onClick: () => count.update(n => n + 1),
    }),
  ]);

  mount(ui, '#app');
}

app();
```

## Components

### Primitives

| Component | Description |
|-----------|-------------|
| `Box` | Generic container with padding/margin |
| `Text` | Typography primitive |
| `Button` | Clickable button with variants |
| `Input` | Text input with two-way binding |

### Layout

| Component | Description |
|-----------|-------------|
| `Stack` | Flex container (vertical/horizontal) |
| `HStack` | Horizontal stack shorthand |
| `VStack` | Vertical stack shorthand |
| `Center` | Centers children |
| `Spacer` | Flexible space filler |

## Async Factory Pattern

All components are async factories to handle WASM initialization:

```typescript
// Components return Promises
const button = await Button({ label: 'Click me', onClick: handleClick });
const stack = await Stack({ gap: 'md' }, [button]);
```

## Reactive Props

Components accept both static values and Behaviors:

```typescript
import { behavior } from '@cliffy-ga/core';

const isDisabled = behavior(false);
const label = behavior('Click me');

await Button({
  label,           // Reactive - updates automatically
  disabled: isDisabled,
  onClick: () => { /* ... */ },
});

// Later: button updates automatically
label.set('Clicked!');
isDisabled.set(true);
```

## Theming

Components use CSS custom properties. Import the default theme or override variables:

```css
/* Import default theme */
@import '@cliffy-ga/components/theme.css';

/* Override variables */
:root {
  --cliffy-color-primary: #your-color;
  --cliffy-space-md: 1.25rem;
}
```

### Available Tokens

- **Colors**: `--cliffy-color-primary`, `--cliffy-color-secondary`, etc.
- **Spacing**: `--cliffy-space-xs` through `--cliffy-space-xl`
- **Typography**: `--cliffy-text-*`, `--cliffy-font-*`
- **Radii**: `--cliffy-radius-*`
- **Shadows**: `--cliffy-shadow-*`

## Architecture

This library is designed to work with cliffy-alive's living interfaces:

```
cliffy-alive (Rust/WASM) - creates Behaviors, drives evolution
    │
    ▼
@cliffy-ga/components (TypeScript) - receives Behaviors, renders UI
    │
    ▼
@cliffy-ga/core (Rust/WASM) - Behavior subscriptions, DOM updates
    │
    ▼
Browser DOM
```

Components don't create Behaviors - they consume them. The living layer (cliffy-alive) creates Behaviors and passes them to components via props.

## License

MIT
