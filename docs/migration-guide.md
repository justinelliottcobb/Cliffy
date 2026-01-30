# Migration Guide: React/Vue to Cliffy

This guide helps developers familiar with React or Vue transition to Cliffy's Algebraic TSX patterns. We'll show equivalent patterns side-by-side.

## Core Concept Mapping

| React/Vue | Cliffy | Description |
|-----------|--------|-------------|
| `useState` | `behavior()` | Reactive state container |
| `useEffect` | `subscribe()` | React to state changes |
| `useMemo` | `map()` | Derived values |
| Component re-render | Automatic DOM updates | How UI stays in sync |
| Virtual DOM | Direct DOM projection | Rendering strategy |
| JSX | `html` tagged template | Template syntax |

## State Management

### Creating State

**React:**
```jsx
const [count, setCount] = useState(0);
const [user, setUser] = useState(null);
```

**Cliffy:**
```typescript
const count = behavior(0);
const user = behavior<User | null>(null);
```

Key difference: Cliffy's `behavior()` returns a single object with methods, not a `[value, setter]` tuple.

### Reading State

**React:**
```jsx
// In component body - value is current
return <div>{count}</div>;
```

**Cliffy:**
```typescript
// Get current value explicitly
const current = count.sample();

// Or use in template (auto-updates)
html`<div>${count}</div>`;
```

### Updating State

**React:**
```jsx
setCount(10);                    // Set directly
setCount(prev => prev + 1);      // Update with function
```

**Cliffy:**
```typescript
count.set(10);                   // Set directly
count.update(n => n + 1);        // Update with function
```

## Derived State

### Computed Values

**React:**
```jsx
const doubled = useMemo(() => count * 2, [count]);
```

**Vue:**
```javascript
const doubled = computed(() => count.value * 2);
```

**Cliffy:**
```typescript
const doubled = count.map(n => n * 2);
// No dependency array - automatically tracked!
```

### Combining Multiple Values

**React:**
```jsx
const [width, setWidth] = useState(10);
const [height, setHeight] = useState(20);
const area = useMemo(() => width * height, [width, height]);
```

**Cliffy:**
```typescript
const width = behavior(10);
const height = behavior(20);
const area = combine(width, height, (w, h) => w * h);
// Updates automatically when either changes
```

## Side Effects

### Reacting to Changes

**React:**
```jsx
useEffect(() => {
    console.log('Count changed:', count);
    document.title = `Count: ${count}`;
}, [count]);
```

**Cliffy:**
```typescript
count.subscribe(n => {
    console.log('Count changed:', n);
    document.title = `Count: ${n}`;
});
```

### Cleanup

**React:**
```jsx
useEffect(() => {
    const subscription = api.subscribe(handler);
    return () => subscription.unsubscribe();
}, []);
```

**Cliffy:**
```typescript
const unsubscribe = count.subscribe(handler);
// Later...
unsubscribe();
```

## Templates and Rendering

### Basic Template

**React:**
```jsx
function Counter() {
    const [count, setCount] = useState(0);
    return (
        <div>
            <h1>Count: {count}</h1>
            <button onClick={() => setCount(c => c + 1)}>+</button>
        </div>
    );
}
```

**Cliffy:**
```typescript
const count = behavior(0);

const app = html`
    <div>
        <h1>Count: ${count}</h1>
        <button onclick=${() => count.update(n => n + 1)}>+</button>
    </div>
`;

mount(app, '#app');
```

Key differences:
- No component function that re-runs
- `onclick` not `onClick` (native DOM)
- `${}` interpolation, not `{}`
- Single `mount()` call, not React tree

### Conditional Rendering

**React:**
```jsx
{isLoggedIn && <WelcomeMessage />}
{isAdmin ? <AdminPanel /> : <UserPanel />}
```

**Cliffy:**
```typescript
// Using when() for conditional
const greeting = when(isLoggedIn, () => 'Welcome!');

// Using if_else() for either/or
const panel = if_else(isAdmin,
    () => html`<div class="admin">Admin Panel</div>`,
    () => html`<div class="user">User Panel</div>`
);

// In template
html`<div>${greeting}</div>`;
```

### List Rendering

**React:**
```jsx
{items.map(item => (
    <li key={item.id}>{item.name}</li>
))}
```

**Cliffy:**
```typescript
// items is a Behavior<Item[]>
// Use behavior.map() to transform the behavior itself
const listHtml = items.map(arr =>
    arr.map(item => html`<li>${item.name}</li>`).join('')
);

html`<ul>${listHtml}</ul>`;
```

**Important:** `behavior.map()` transforms the behavior, not an array inside it. For arrays, nest the transformations: `items.map(arr => arr.map(...))`.

## Event Handling

### Click Events

**React:**
```jsx
<button onClick={(e) => handleClick(e)}>Click</button>
```

**Cliffy:**
```typescript
html`<button onclick=${(e) => handleClick(e)}>Click</button>`;
```

### Form Input

**React:**
```jsx
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />
```

**Cliffy:**
```typescript
const value = behavior('');
html`<input
    value=${value.sample()}
    oninput=${(e) => value.set(e.target.value)}
/>`;
```

### Events as First-Class Values

Cliffy has dedicated Event types for discrete occurrences:

```typescript
// Create an event stream
const clicks = event<MouseEvent>();

// Subscribe to events
clicks.subscribe(e => console.log('Clicked at', e.clientX));

// Emit events
document.onclick = (e) => clicks.emit(e);

// Fold events into state
const clickCount = clicks.fold(0, (count, _) => count + 1);
```

## Component Patterns

### Props Equivalent

**React:**
```jsx
function Greeting({ name, onGreet }) {
    return <button onClick={onGreet}>Hello, {name}!</button>;
}
```

**Cliffy:**
```typescript
function greeting(name: Behavior<string>, onGreet: () => void) {
    return html`<button onclick=${onGreet}>Hello, ${name}!</button>`;
}
```

### Composition

**React:**
```jsx
function App() {
    return (
        <div>
            <Header />
            <Content />
            <Footer />
        </div>
    );
}
```

**Cliffy:**
```typescript
const header = html`<header>...</header>`;
const content = html`<main>...</main>`;
const footer = html`<footer>...</footer>`;

const app = html`
    <div>
        ${header}
        ${content}
        ${footer}
    </div>
`;
```

## What You Don't Need

### No Rules of Hooks

React's hooks have rules: call order matters, can't be conditional. Cliffy has none of this:

```typescript
// This is fine in Cliffy
if (someCondition) {
    const extra = behavior(0);  // Create behaviors anywhere
}

// Call in any order
const b = behavior(0);
const a = behavior(1);
```

### No Dependency Arrays

React's `useEffect` and `useMemo` require manual dependency tracking:

```typescript
// React - easy to miss dependencies
useMemo(() => expensiveCalc(a, b), [a, b]);  // Forgot c?

// Cliffy - automatic
combine(a, b, (x, y) => expensiveCalc(x, y));
```

### No Stale Closure Issues

React closures can capture stale values:

```jsx
// React - potential stale closure
useEffect(() => {
    const timer = setInterval(() => {
        console.log(count);  // May be stale!
    }, 1000);
    return () => clearInterval(timer);
}, []);  // Empty deps = stale closure
```

```typescript
// Cliffy - always current
setInterval(() => {
    console.log(count.sample());  // Always current value
}, 1000);
```

### No Virtual DOM

React rebuilds a virtual tree and diffs it. Cliffy updates DOM directly:

```
React:  State → Render → VDOM → Diff → Patch → DOM
Cliffy: State → Subscribe → DOM property
```

This means:
- Less memory allocation
- Predictable update timing
- Easier debugging (inspect DOM directly)

## Common Migration Patterns

### useState + useEffect → behavior + subscribe

**Before (React):**
```jsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
    fetchData().then(d => {
        setData(d);
        setLoading(false);
    });
}, []);

if (loading) return <div>Loading...</div>;
return <div>{data.name}</div>;
```

**After (Cliffy):**
```typescript
const data = behavior<Data | null>(null);
const loading = behavior(true);

fetchData().then(d => {
    data.set(d);
    loading.set(false);
});

const content = if_else(loading,
    () => html`<div>Loading...</div>`,
    () => html`<div>${data.map(d => d?.name ?? '')}</div>`
);

mount(content, '#app');
```

### Context → Shared Behaviors

**Before (React):**
```jsx
const ThemeContext = createContext('light');

function App() {
    const [theme, setTheme] = useState('light');
    return (
        <ThemeContext.Provider value={theme}>
            <Child />
        </ThemeContext.Provider>
    );
}

function Child() {
    const theme = useContext(ThemeContext);
    return <div className={theme}>...</div>;
}
```

**After (Cliffy):**
```typescript
// Shared module
export const theme = behavior<'light' | 'dark'>('light');

// Any component
import { theme } from './state';
html`<div class=${theme}>...</div>`;
```

No providers needed - behaviors are just values you can import.

### useReducer → Event + fold

**Before (React):**
```jsx
function reducer(state, action) {
    switch (action.type) {
        case 'increment': return { count: state.count + 1 };
        case 'decrement': return { count: state.count - 1 };
    }
}

const [state, dispatch] = useReducer(reducer, { count: 0 });
dispatch({ type: 'increment' });
```

**After (Cliffy):**
```typescript
type Action = { type: 'increment' } | { type: 'decrement' };

const actions = event<Action>();

const state = actions.fold({ count: 0 }, (state, action) => {
    switch (action.type) {
        case 'increment': return { count: state.count + 1 };
        case 'decrement': return { count: state.count - 1 };
    }
});

actions.emit({ type: 'increment' });
```

## Performance Considerations

| Aspect | React | Cliffy |
|--------|-------|--------|
| Update granularity | Component tree | Individual DOM properties |
| Memory per update | VDOM nodes | Just changed values |
| When updates happen | Batched by React | Immediate or scheduled |
| Debugging | React DevTools | Browser DevTools (direct DOM) |

Cliffy's approach means:
- Fewer unnecessary updates
- More predictable performance
- Easier to profile (standard browser tools)

## Next Steps

- [Getting Started](./getting-started.md) - Build your first app
- [FRP Guide](./frp-guide.md) - Deep dive into Behaviors and Events
- [API Reference](./api-reference.md) - Complete API documentation
- [Examples](../examples/) - Full application examples
