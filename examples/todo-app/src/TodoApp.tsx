/**
 * TodoApp Example - Demonstrates Cliffy's Algebraic JSX System
 * Uses geometric behaviors for state and algebraic combinators for control flow
 */

import {
  jsx, jsxs,
  When, For, Map,
  createStaticBehavior,
  GeometricBehavior,
  GeometricEvent,
  Cliffy,
  Multivector,
  AlgebraicElement
} from '../../../cliffy-typescript/src/index';

// Initialize Cliffy instance
const cliffy = new Cliffy('Cl(3,0)');

// Todo item interface
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// Create geometric behaviors for state management
function createGeometricBehavior<T>(initialValue: T): GeometricBehavior<T> & {
  setValue: (newValue: T | ((prev: T) => T)) => void;
  asEvent: () => GeometricEvent<T>;
} {
  let currentValue = initialValue;
  const subscribers: ((value: T) => void)[] = [];

  const behavior: GeometricBehavior<T> & {
    setValue: (newValue: T | ((prev: T) => T)) => void;
    asEvent: () => GeometricEvent<T>;
  } = {
    sample(): T {
      return currentValue;
    },

    map<U>(fn: (value: T) => U): GeometricBehavior<U> {
      const mappedBehavior = createGeometricBehavior(fn(currentValue));
      
      // Subscribe to changes
      const updateMapped = (newValue: T) => {
        mappedBehavior.setValue(fn(newValue));
      };
      subscribers.push(updateMapped);
      
      return mappedBehavior;
    },

    flatMap<U>(fn: (value: T) => GeometricBehavior<U>): GeometricBehavior<U> {
      const flatMappedBehavior = fn(currentValue);
      
      // Subscribe to changes
      const updateFlatMapped = (newValue: T) => {
        const newBehavior = fn(newValue);
        // In a full implementation, this would properly chain behaviors
      };
      subscribers.push(updateFlatMapped);
      
      return flatMappedBehavior;
    },

    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V): GeometricBehavior<V> {
      const combinedBehavior = createGeometricBehavior(fn(currentValue, other.sample()));
      
      // Subscribe to changes
      const updateCombined = (newValue: T) => {
        combinedBehavior.setValue(fn(newValue, other.sample()));
      };
      subscribers.push(updateCombined);
      
      return combinedBehavior;
    },

    isActive(): boolean {
      return subscribers.length > 0;
    },

    setValue(newValue: T | ((prev: T) => T)): void {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(currentValue)
        : newValue;
      
      if (nextValue !== currentValue) {
        currentValue = nextValue;
        subscribers.forEach(subscriber => subscriber(nextValue));
      }
    },

    asEvent(): GeometricEvent<T> {
      return {
        subscribe(fn: (value: T) => void): () => void {
          subscribers.push(fn);
          return () => {
            const index = subscribers.indexOf(fn);
            if (index >= 0) {
              subscribers.splice(index, 1);
            }
          };
        },

        map<U>(fn: (value: T) => U): GeometricEvent<U> {
          const mappedEvent: GeometricEvent<U> = {
            subscribe: (callback: (value: U) => void) => {
              return this.subscribe((value: T) => callback(fn(value)));
            },
            map: <V>(mapFn: (value: U) => V) => mappedEvent.map(mapFn),
            filter: (predicate: (value: U) => boolean) => {
              return {
                subscribe: (callback: (value: U) => void) => {
                  return mappedEvent.subscribe((value: U) => {
                    if (predicate(value)) callback(value);
                  });
                },
                map: <V>(mapFn: (value: U) => V) => this.map(mapFn),
                filter: (pred: (value: U) => boolean) => this.filter(pred)
              };
            }
          };
          return mappedEvent;
        },

        filter(predicate: (value: T) => boolean): GeometricEvent<T> {
          return {
            subscribe: (callback: (value: T) => void) => {
              return this.subscribe((value: T) => {
                if (predicate(value)) callback(value);
              });
            },
            map: <U>(fn: (value: T) => U) => this.map(fn),
            filter: (pred: (value: T) => boolean) => this.filter(pred)
          };
        }
      };
    }
  };

  return behavior;
}

// State management using geometric behaviors
let todoIdCounter = 1;

const todosState = createGeometricBehavior<Todo[]>([
  { id: 1, text: 'Learn Geometric Algebra', completed: false },
  { id: 2, text: 'Build Cliffy App', completed: true },
  { id: 3, text: 'Master Algebraic TSX', completed: false }
]);

const newTodoTextState = createGeometricBehavior<string>('');
const filterState = createGeometricBehavior<'all' | 'active' | 'completed'>('all');

// Geometric transformations for state updates
const addTodo = (text: string) => {
  if (text.trim()) {
    const newTodo: Todo = {
      id: ++todoIdCounter,
      text: text.trim(),
      completed: false
    };
    
    // Use geometric translation to add new todo
    todosState.setValue(todos => {
      const translation = cliffy.translator(1, 0, 0); // Translate along e1 axis
      return [...todos, newTodo];
    });
    
    newTodoTextState.setValue('');
  }
};

const toggleTodo = (id: number) => {
  todosState.setValue(todos =>
    todos.map(todo =>
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    )
  );
};

const deleteTodo = (id: number) => {
  todosState.setValue(todos => todos.filter(todo => todo.id !== id));
};

const clearCompleted = () => {
  todosState.setValue(todos => todos.filter(todo => !todo.completed));
};

// Derived behaviors using geometric operations
const filteredTodos = todosState.map(todos => {
  const filter = filterState.sample();
  switch (filter) {
    case 'active':
      return todos.filter(todo => !todo.completed);
    case 'completed':
      return todos.filter(todo => todo.completed);
    default:
      return todos;
  }
});

const todoCount = todosState.map(todos => todos.length);
const activeCount = todosState.map(todos => todos.filter(todo => !todo.completed).length);
const completedCount = todosState.map(todos => todos.filter(todo => todo.completed).length);

// Individual Todo Component
const TodoItem = (props: { todo: GeometricBehavior<Todo> }): AlgebraicElement => {
  const { todo } = props;
  
  // Extract individual properties as behaviors
  const todoId = todo.map(t => t.id);
  const todoText = todo.map(t => t.text);
  const todoCompleted = todo.map(t => t.completed);
  
  // Geometric transformation for visual feedback
  const transform = todoCompleted.map(completed => {
    if (completed) {
      // Scale down and translate completed items using geometric algebra
      return cliffy.scalar(0.95).add(cliffy.translator(0.1, 0, 0));
    }
    return cliffy.scalar(1); // Identity transform
  });
  
  const opacity = todoCompleted.map(completed => 
    cliffy.scalar(completed ? 0.6 : 1.0)
  );
  
  return jsx('li', {
    className: todoCompleted.map(completed => `todo-item ${completed ? 'completed' : ''}`),
    style: {
      transform: transform,
      opacity: opacity,
      transition: 'all 0.3s ease'
    },
    children: [
      jsx('input', {
        type: 'checkbox',
        checked: todoCompleted,
        onChange: todoId.map(id => () => toggleTodo(id))
      }),
      jsx('span', {
        className: 'todo-text',
        style: todoCompleted.map(completed => ({
          textDecoration: completed ? 'line-through' : 'none'
        })),
        children: todoText
      }),
      jsx('button', {
        className: 'delete-btn',
        onClick: todoId.map(id => () => deleteTodo(id)),
        children: '×'
      })
    ]
  });
};

// Filter Button Component
const FilterButton = (props: {
  filter: 'all' | 'active' | 'completed';
  label: string;
}): AlgebraicElement => {
  const { filter, label } = props;
  
  const isActive = filterState.map(currentFilter => currentFilter === filter);
  
  return jsx('button', {
    className: isActive.map(active => `filter-btn ${active ? 'active' : ''}`),
    onClick: () => filterState.setValue(filter),
    children: label
  });
};

// Main TodoApp Component using Algebraic TSX
export const TodoApp = (): AlgebraicElement => {
  return jsx('div', {
    className: 'todo-app',
    style: {
      maxWidth: '600px',
      margin: '50px auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    },
    children: [
      // Header
      jsx('header', {
        children: [
          jsx('h1', {
            style: {
              textAlign: 'center',
              color: '#333',
              marginBottom: '30px',
              transform: cliffy.scalar(1.2), // Scaled header using geometric algebra
            },
            children: 'Cliffy Todo App'
          }),
          jsx('p', {
            style: {
              textAlign: 'center',
              color: '#666',
              fontStyle: 'italic'
            },
            children: 'Built with Algebraic TSX & Geometric Behaviors'
          })
        ]
      }),

      // Add Todo Form
      jsx('div', {
        className: 'add-todo',
        style: { marginBottom: '20px' },
        children: [
          jsx('input', {
            type: 'text',
            placeholder: 'What needs to be done?',
            value: newTodoTextState,
            onChange: newTodoTextState.asEvent().map((e: Event) => {
              const target = e.target as HTMLInputElement;
              return target.value;
            }),
            onKeyDown: newTodoTextState.map(text => (e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                addTodo(text);
              }
            }),
            style: {
              width: '70%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }
          }),
          jsx('button', {
            onClick: () => addTodo(newTodoTextState.sample()),
            disabled: newTodoTextState.map(text => text.trim().length === 0),
            style: {
              width: '25%',
              marginLeft: '5%',
              padding: '10px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            },
            children: 'Add'
          })
        ]
      }),

      // Todo Stats
      jsx('div', {
        className: 'todo-stats',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        },
        children: [
          jsx('span', {
            children: Map({
              from: todoCount,
              to: (count: number) => `Total: ${count}`,
              children: (result) => result
            })
          }),
          jsx('span', {
            children: Map({
              from: activeCount,
              to: (count: number) => `Active: ${count}`,
              children: (result) => result
            })
          }),
          jsx('span', {
            children: Map({
              from: completedCount,
              to: (count: number) => `Completed: ${count}`,
              children: (result) => result
            })
          })
        ]
      }),

      // Filter Buttons
      jsx('div', {
        className: 'filters',
        style: {
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          justifyContent: 'center'
        },
        children: [
          FilterButton({ filter: 'all', label: 'All' }),
          FilterButton({ filter: 'active', label: 'Active' }),
          FilterButton({ filter: 'completed', label: 'Completed' })
        ]
      }),

      // Todo List using For combinator
      jsx('ul', {
        className: 'todo-list',
        style: {
          listStyle: 'none',
          padding: '0'
        },
        children: For({
          each: filteredTodos,
          key: (todo: Todo) => todo.id.toString(),
          children: (todoItem: GeometricBehavior<Todo>) => 
            TodoItem({ todo: todoItem })
        })
      }),

      // Clear Completed Button
      jsx('div', {
        className: 'clear-completed',
        style: { textAlign: 'center', marginTop: '20px' },
        children: When({
          condition: completedCount.map(count => count > 0),
          children: jsx('button', {
            onClick: clearCompleted,
            style: {
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            },
            children: 'Clear Completed'
          })
        })
      }),

      // Footer
      jsx('footer', {
        style: {
          marginTop: '40px',
          textAlign: 'center',
          color: '#999',
          fontSize: '14px'
        },
        children: [
          jsx('p', {
            children: 'This TodoApp demonstrates:'
          }),
          jsx('ul', {
            style: {
              display: 'inline-block',
              textAlign: 'left',
              marginTop: '10px'
            },
            children: [
              jsx('li', { children: '• Geometric behaviors for reactive state' }),
              jsx('li', { children: '• Algebraic combinators (When, For, Map)' }),
              jsx('li', { children: '• Geometric transformations for UI effects' }),
              jsx('li', { children: '• Direct dataflow graph projection to DOM' })
            ]
          })
        ]
      })
    ]
  });
};

export default TodoApp;