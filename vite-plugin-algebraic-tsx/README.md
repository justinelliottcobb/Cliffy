# Vite Plugin Algebraic TSX

> **Note**: This plugin is part of the previous Cliffy architecture and is currently not in active use. The current approach uses plain TypeScript with DOM bindings instead of TSX transformation. See the main [README](../README.md) for the current API.

## Overview

This Vite plugin transforms Algebraic TSX syntax into Cliffy jsx() function calls at build time.

```tsx
// Write this:
<div>
  <When condition={isVisible}>
    <span>Hello World</span>
  </When>

  <For each={items} key={item => item.id}>
    {(item, index) => <div>{item.name}</div>}
  </For>
</div>

// Gets transformed to:
jsx('div', {
  children: [
    When({
      condition: isVisible,
      children: jsx('span', { children: 'Hello World' })
    }),
    For({
      each: items,
      key: item => item.id,
      children: (item, index) => jsx('div', { children: item.name })
    })
  ]
})
```

## Status

This plugin may be revived in a future phase of Cliffy development when a component model is established. For now, use the current DOM binding approach:

```typescript
import { behavior, bindText, fromClick } from '@cliffy/core';

const count = behavior(0);
bindText(document.getElementById('count')!, count);
fromClick(button).subscribe(() => count.update(n => n + 1));
```

## Installation

```bash
npm install vite-plugin-algebraic-tsx
```

## Usage

### Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import algebraicTSX from 'vite-plugin-algebraic-tsx';

export default defineConfig({
  plugins: [
    algebraicTSX({
      jsxFactory: 'jsx',
      jsxImportSource: '@cliffy/typescript',
      debug: true
    })
  ]
});
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxFactory": "jsx",
    "jsxFragmentFactory": "Fragment"
  }
}
```

## Supported Algebraic Combinators

### Control Flow
- `<When condition={boolean$}>{children}</When>` - Conditional rendering
- `<Else>{children}</Else>` - Alternative branch
- `<Switch value={value$}>{cases}</Switch>` - Multi-way branching
- `<Case value={match}>{children}</Case>` - Switch case
- `<Default>{children}</Default>` - Switch default case

### List Operations
- `<For each={items$} key={keyFn}>{renderFn}</For>` - List rendering with keys
- `<Filter from={items$} where={predicate}>{renderFn}</Filter>` - Filtered lists

### Data Transformations
- `<Map from={data$} to={transform}>{renderFn}</Map>` - Transform values
- `<FlatMap from={data$} to={transform}>{renderFn}</FlatMap>` - Monadic bind
- `<Combine a={data1$} b={data2$} with={combineFn}>{renderFn}</Combine>` - Combine behaviors

### Performance
- `<Memoize value={expensive$} key={keyFn}>{renderFn}</Memoize>` - Memoization

## Plugin Options

```ts
interface AlgebraicTSXOptions {
  extensions?: string[];       // File extensions to transform
  include?: RegExp | RegExp[]; // Include patterns
  exclude?: RegExp | RegExp[]; // Exclude patterns
  jsxFactory?: string;         // JSX factory function name
  jsxFragment?: string;        // JSX fragment factory
  jsxImportSource?: string;    // Import source for jsx functions
  debug?: boolean;             // Enable debugging output
  algebraicCombinators?: string[]; // Algebraic combinators to transform
}
```

## How It Works

1. **Parse**: Uses Babel to parse TSX files into AST
2. **Transform**: Identifies algebraic combinators and regular JSX elements
3. **Convert**: Transforms combinators and JSX to function calls
4. **Import**: Automatically adds missing imports
5. **Output**: Generates transformed code with source maps
