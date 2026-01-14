/**
 * Algebraic TSX Demo - Testing the Vite Plugin
 * This file demonstrates true Algebraic TSX syntax that should be transformed
 * by the vite-plugin-algebraic-tsx into jsx() function calls
 */

import { createGeometricBehavior, GeometricBehavior, AlgebraicElement } from '../../../cliffy-typescript/src/index';

// Note: jsx, When, For, etc. should be auto-imported by the plugin

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

function createState<T>(initialValue: T) {
  let currentValue = initialValue;
  const subscribers: ((value: T) => void)[] = [];

  return {
    sample(): T { return currentValue; },
    map<U>(fn: (value: T) => U) {
      const mappedBehavior = createState(fn(currentValue));
      const updateMapped = (newValue: T) => mappedBehavior.setValue(fn(newValue));
      subscribers.push(updateMapped);
      return mappedBehavior;
    },
    flatMap<U>(fn: (value: T) => GeometricBehavior<U>) { return fn(currentValue); },
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V) {
      const combinedBehavior = createState(fn(currentValue, other.sample()));
      const updateCombined = (newValue: T) => combinedBehavior.setValue(fn(newValue, other.sample()));
      subscribers.push(updateCombined);
      return combinedBehavior;
    },
    isActive(): boolean { return subscribers.length > 0; },
    setValue(newValue: T | ((prev: T) => T)): void {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(currentValue) : newValue;
      if (nextValue !== currentValue) {
        currentValue = nextValue;
        subscribers.forEach(subscriber => subscriber(nextValue));
      }
    }
  };
}

// State using geometric behaviors
const todos$ = createState<Todo[]>([
  { id: 1, text: 'Learn Algebraic TSX', completed: false },
  { id: 2, text: 'Build Vite Plugin', completed: true },
  { id: 3, text: 'Test Transformations', completed: false }
]);

const newTodoText$ = createState<string>('');
const filter$ = createState<'all' | 'active' | 'completed'>('all');

// Derived behaviors
const filteredTodos$ = todos$.combine(filter$, (todos, filter) => {
  switch (filter) {
    case 'active': return todos.filter(todo => !todo.completed);
    case 'completed': return todos.filter(todo => todo.completed);
    default: return todos;
  }
});

const todoCount$ = todos$.map(todos => todos.length);
const activeCount$ = todos$.map(todos => todos.filter(t => !t.completed).length);
const hasCompleted$ = todos$.map(todos => todos.some(t => t.completed));

// Actions
const addTodo = () => {
  const text = newTodoText$.sample().trim();
  if (text) {
    todos$.setValue(todos => [...todos, {
      id: Math.max(0, ...todos.map(t => t.id)) + 1,
      text,
      completed: false
    }]);
    newTodoText$.setValue('');
  }
};

const toggleTodo = (id: number) => {
  todos$.setValue(todos => todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  ));
};

const clearCompleted = () => {
  todos$.setValue(todos => todos.filter(t => !t.completed));
};

// ALGEBRAIC TSX DEMO - This is what the plugin should transform!
export const AlgebraicTSXDemo = (): AlgebraicElement => {
  return (
    <div className="algebraic-tsx-demo" style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      
      {/* Header with conditional styling */}
      <header>
        <h1 style={{
          textAlign: 'center',
          color: '#333'
        }}>
          Algebraic TSX Demo
        </h1>
        
        <p style={{
          textAlign: 'center', 
          color: '#666'
        }}>
          True TSX syntax transformed to jsx() calls!
        </p>
      </header>

      {/* Add Todo Form */}
      <div className="add-todo" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTodoText$}
          onChange={(e: Event) => {
            const target = e.target as HTMLInputElement;
            newTodoText$.setValue(target.value);
          }}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter') addTodo();
          }}
          style={{
            width: '70%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        
        <button
          onClick={addTodo}
          disabled={newTodoText$.map(text => text.trim().length === 0)}
          style={{
            width: '25%',
            marginLeft: '5%',
            padding: '10px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Add
        </button>
      </div>

      {/* Stats Display using Map combinator */}
      <div className="stats" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        <Map from={todoCount$} to={count => `Total: ${count}`}>
          {(text$) => <span>{text$}</span>}
        </Map>
        
        <Map from={activeCount$} to={count => `Active: ${count}`}>
          {(text$) => <span>{text$}</span>}
        </Map>
        
        <Map from={todos$} to={todos => todos.filter(t => t.completed).length}>
          {(count$) => (
            <Map from={count$} to={count => `Completed: ${count}`}>
              {(text$) => <span>{text$}</span>}
            </Map>
          )}
        </Map>
      </div>

      {/* Filter Buttons using For combinator */}
      <div className="filters" style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        justifyContent: 'center'
      }}>
        <For each={[
          { key: 'all' as const, label: 'All' },
          { key: 'active' as const, label: 'Active' }, 
          { key: 'completed' as const, label: 'Completed' }
        ]} key={item => item.key}>
          {(item$) => (
            <Map from={item$} to={item => item}>
              {(item$) => (
                <button
                  onClick={() => filter$.setValue(item$.sample().key)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: filter$.map(f => 
                      f === item$.sample().key ? '#4CAF50' : 'white'
                    ),
                    color: filter$.map(f => 
                      f === item$.sample().key ? 'white' : '#333'
                    )
                  }}
                >
                  {item$.map(item => item.label)}
                </button>
              )}
            </Map>
          )}
        </For>
      </div>

      {/* Todo List using When and For combinators */}
      <When condition={filteredTodos$.map(todos => todos.length > 0)}>
        <ul style={{
          listStyle: 'none',
          padding: '0'
        }}>
          <For each={filteredTodos$} key={todo => todo.id}>
            {(todo$) => (
              <li style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                borderBottom: '1px solid #eee',
                backgroundColor: todo$.map(todo => 
                  todo.completed ? '#f9f9f9' : 'white'
                )
              }}>
                <input
                  type="checkbox"
                  checked={todo$.map(todo => todo.completed)}
                  onChange={() => toggleTodo(todo$.sample().id)}
                  style={{ marginRight: '10px' }}
                />
                
                <span style={{
                  flex: '1',
                  textDecoration: todo$.map(todo => 
                    todo.completed ? 'line-through' : 'none'
                  ),
                  color: todo$.map(todo => 
                    todo.completed ? '#999' : '#333'
                  )
                }}>
                  {todo$.map(todo => todo.text)}
                </span>
              </li>
            )}
          </For>
        </ul>
      </When>

      {/* Empty State */}
      <When condition={filteredTodos$.map(todos => todos.length === 0)}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#999',
          fontSize: '18px'
        }}>
          <When condition={filter$.map(f => f === 'all')}>
            <div>No todos yet. Add one above!</div>
          </When>
          
          <When condition={filter$.map(f => f === 'active')}>
            <div>No active todos. Great job! 🎉</div>
          </When>
          
          <When condition={filter$.map(f => f === 'completed')}>
            <div>No completed todos yet.</div>
          </When>
        </div>
      </When>

      {/* Clear Completed Button */}
      <When condition={hasCompleted$}>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={clearCompleted}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Completed
          </button>
        </div>
      </When>

      {/* Footer with transformation info */}
      <footer style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
          🚀 Algebraic TSX Transformations
        </h3>
        
        <p style={{ margin: '0 0 10px 0' }}>
          This component was written using true TSX syntax with algebraic combinators:
        </p>
        
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>&lt;When condition={`{condition$}`}&gt; for conditional rendering</li>
          <li>&lt;For each={`{items$}`} key={`{keyFn}`}&gt; for list rendering</li>
          <li>&lt;Map from={`{data$}`} to={`{transform}`}&gt; for data transformation</li>
          <li>Regular HTML elements like &lt;div&gt;, &lt;button&gt;, etc.</li>
        </ul>
        
        <p style={{ margin: '10px 0 0 0', fontStyle: 'italic' }}>
          The Vite plugin transforms all of this into jsx() function calls at build time!
        </p>
      </footer>

    </div>
  );
};

export default AlgebraicTSXDemo;