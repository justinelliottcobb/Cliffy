# Cliffy TodoApp Example

This TodoApp demonstrates Cliffy's revolutionary **Algebraic TSX** system, where TSX expressions compile to geometric dataflow graphs rather than virtual DOM structures.

## Key Concepts Demonstrated

### 1. Algebraic TSX Architecture
Unlike React's imperative JSX, Cliffy's TSX is a **compile-time graph specification language**:

```tsx
// This TSX creates a geometric dataflow graph, NOT virtual DOM
<div onClick={clicks$} style={style$}>
  {count$}
</div>
```

The expression above creates:
- A geometric dataflow node with tag `'div'`
- Props containing `clicks$` as a `GeometricEvent<MouseEvent>`
- Props containing `style$` as a `GeometricBehavior<CSSProperties>`  
- Children as `count$.map(n => TextNode(n))` - a `GeometricBehavior<VNode[]>`

### 2. Geometric Behaviors for State
All state is managed through **geometric behaviors** that use Clifford algebra operations:

```tsx
// State as geometric behaviors
const todosState = createGeometricBehavior<Todo[]>([...]);
const newTodoTextState = createGeometricBehavior<string>('');

// Geometric transformations for updates
const addTodo = (text: string) => {
  const translation = cliffy.translator(1, 0, 0); // Translate along e1 axis
  todosState.setValue(todos => [...todos, newTodo]);
};
```

### 3. Algebraic Control Flow Combinators
Replace JavaScript conditionals with algebraic operations:

```tsx
// Instead of: {isVisible ? <Component /> : null}
<When condition={isVisible$}>
  <Component />
</When>

// Instead of: {items.map(item => <Item key={item.id} item={item} />)}
<For each={items$} key={item => item.id}>
  {(item$, index$) => <Item item={item$} />}
</For>
```

### 4. Direct Geometric-to-DOM Projection
No virtual DOM diffing - geometric transformations flow directly through the optimized dataflow graph to update the DOM.

## Architecture Overview

```
TSX Source → Algebraic Graph → Geometric Runtime → DOM
     ↓              ↓                ↓           ↓
  Build Time    Compile Time     Runtime     Browser
```

1. **Build Time**: TSX compiles to algebraic specifications
2. **Compile Time**: Graph optimization using geometric algebra properties
3. **Runtime**: Only data flows through pre-optimized graph
4. **Browser**: Direct DOM updates without virtual DOM overhead

## Running the Example

1. **Build the framework**:
   ```bash
   cd ../../cliffy-typescript
   npm run build
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**: Navigate to `http://localhost:3000`

## Code Structure

- `src/TodoApp.tsx` - Main component using algebraic TSX
- `src/main.ts` - App initialization and mounting
- `index.html` - HTML template with styling
- `vite.config.ts` - Build configuration for algebraic TSX

## Key Features Demonstrated

### Geometric State Management
```tsx
const todosState = createGeometricBehavior<Todo[]>([...]);
const filteredTodos = todosState.map(todos => /* filter logic */);
```

### Algebraic Combinators
```tsx
<When condition={hasItems$}>
  <For each={filteredTodos} key={todo => todo.id}>
    {(todo$) => <TodoItem todo={todo$} />}
  </For>
</When>
```

### Geometric Transformations
```tsx
const transform = completed$.map(isCompleted => {
  return isCompleted 
    ? cliffy.scalar(0.95).add(cliffy.translator(0.1, 0, 0))
    : cliffy.scalar(1);
});
```

### Reactive Projections
```tsx
<span style={{ 
  opacity: completed$.map(c => cliffy.scalar(c ? 0.6 : 1.0)) 
}}>
  {todoText$}
</span>
```

## Performance Benefits

1. **No Virtual DOM**: Direct geometric transformations to DOM
2. **Compile-Time Optimization**: Graph optimized using GA properties
3. **Minimal Runtime**: Only data flows, no diffing algorithms
4. **Geometric Efficiency**: Clifford algebra operations are highly optimized

## Comparison with Traditional Frameworks

| Aspect | React/Vue | Cliffy |
|--------|-----------|--------|
| State Model | Imperative updates | Geometric behaviors |
| Control Flow | JavaScript conditionals | Algebraic combinators |
| Updates | Virtual DOM diffing | Direct graph projection |
| Optimization | Runtime reconciliation | Compile-time graph optimization |
| Math Foundation | None | Clifford/Geometric Algebra |

## Next Steps

Try modifying the TodoApp to explore:
- Custom geometric transformations
- Additional algebraic combinators
- Complex state relationships using GA operations
- Performance monitoring tools

For more advanced examples, see the dashboard example in `../dashboard/`.