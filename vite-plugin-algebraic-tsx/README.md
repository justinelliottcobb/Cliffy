# Vite Plugin Algebraic TSX

Transform Algebraic TSX syntax into Cliffy jsx() function calls at build time.

## Overview

This Vite plugin enables you to write TSX using algebraic combinators directly:

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
      // Options
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

### In Your TSX Files

```tsx
import { jsx, When, For, GeometricBehavior } from '@cliffy/typescript';

// The plugin will automatically add missing imports

export function MyComponent() {
  const items$ = createGeometricBehavior([1, 2, 3]);
  const isVisible$ = createGeometricBehavior(true);
  
  return (
    <div className="container">
      <When condition={isVisible$}>
        <h1>Algebraic TSX Demo</h1>
      </When>
      
      <For each={items$} key={item => item}>
        {(item$) => (
          <div>Item: {item$}</div>
        )}
      </For>
    </div>
  );
}
```

## Supported Algebraic Combinators

The plugin recognizes and transforms these algebraic combinators:

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
  /** File extensions to transform @default ['.tsx', '.jsx'] */
  extensions?: string[];
  
  /** Include patterns @default /\.(tsx?|jsx?)$/ */
  include?: RegExp | RegExp[];
  
  /** Exclude patterns @default /node_modules/ */
  exclude?: RegExp | RegExp[];
  
  /** JSX factory function name @default 'jsx' */
  jsxFactory?: string;
  
  /** JSX fragment factory @default 'Fragment' */
  jsxFragment?: string;
  
  /** Import source for jsx functions @default '@cliffy/typescript' */
  jsxImportSource?: string;
  
  /** Enable debugging output @default false */
  debug?: boolean;
  
  /** Algebraic combinators to transform @default [...] */
  algebraicCombinators?: string[];
}
```

## How It Works

1. **Parse**: Uses Babel to parse TSX files into AST
2. **Transform**: Identifies algebraic combinators and regular JSX elements
3. **Convert**: 
   - `<When condition={x}>{children}</When>` → `When({ condition: x, children: [...] })`
   - `<div prop={x}>{children}</div>` → `jsx('div', { prop: x, children: [...] })`
4. **Import**: Automatically adds missing imports from `@cliffy/typescript`
5. **Output**: Generates transformed code with source maps

## TypeScript Support

The plugin includes TypeScript declarations for all algebraic combinators, providing:

- Full IntelliSense support
- Type checking for combinator props
- Auto-completion for algebraic elements
- Proper error reporting

## Debugging

Enable debug mode to see transformation details:

```ts
algebraicTSX({ debug: true })
```

This will log:
- Which files are being transformed
- Before/after code samples
- Import additions
- Transformation statistics

## Limitations

- Requires Babel for AST parsing (adds to build time)
- Source maps may not be perfect for complex transformations
- TSX syntax is limited to supported algebraic combinators
- No runtime JSX support (all transforms happen at build time)

## Contributing

This plugin is part of the Cliffy framework. See the main repository for contribution guidelines.