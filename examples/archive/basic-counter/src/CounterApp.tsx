/**
 * Basic Counter App - Demonstrates Core Cliffy Concepts
 * 
 * Key Learning Points:
 * - GeometricBehavior<T> for reactive state
 * - jsx() function for creating algebraic elements  
 * - Geometric transformations for state updates
 * - When combinator for conditional rendering
 */

import {
  jsx,
  When,
  createGeometricBehavior,
  GeometricBehavior,
  AlgebraicElement,
  Cliffy
} from '../../../cliffy-typescript/src/index';

// Initialize Cliffy instance for geometric operations
const cliffy = new Cliffy('Cl(3,0)');

/**
 * Helper function to create a geometric behavior
 * This is the fundamental building block of Cliffy state management
 */
function createState<T>(initialValue: T): GeometricBehavior<T> & {
  setValue: (newValue: T | ((prev: T) => T)) => void;
} {
  let currentValue = initialValue;
  const subscribers: ((value: T) => void)[] = [];

  return {
    // Core GeometricBehavior interface
    sample(): T {
      return currentValue;
    },

    map<U>(fn: (value: T) => U): GeometricBehavior<U> {
      const mappedBehavior = createState(fn(currentValue));
      
      const updateMapped = (newValue: T) => {
        mappedBehavior.setValue(fn(newValue));
      };
      subscribers.push(updateMapped);
      
      return mappedBehavior;
    },

    flatMap<U>(fn: (value: T) => GeometricBehavior<U>): GeometricBehavior<U> {
      return fn(currentValue); // Simplified implementation
    },

    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V): GeometricBehavior<V> {
      const combinedBehavior = createState(fn(currentValue, other.sample()));
      
      const updateCombined = (newValue: T) => {
        combinedBehavior.setValue(fn(newValue, other.sample()));
      };
      subscribers.push(updateCombined);
      
      return combinedBehavior;
    },

    isActive(): boolean {
      return subscribers.length > 0;
    },

    // State update function
    setValue(newValue: T | ((prev: T) => T)): void {
      const nextValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(currentValue)
        : newValue;
      
      if (nextValue !== currentValue) {
        currentValue = nextValue;
        subscribers.forEach(subscriber => subscriber(nextValue));
      }
    }
  };
}

// STEP 1: Create State using Geometric Behaviors
// In Cliffy, all state is managed through GeometricBehavior<T>
const countState = createState<number>(0);

// STEP 2: Create Derived Behaviors
// These automatically update when the source behavior changes
const isPositive = countState.map(count => count > 0);
const isNegative = countState.map(count => count < 0);
const isZero = countState.map(count => count === 0);
const countDisplay = countState.map(count => `Count: ${count}`);

// STEP 3: Define Geometric Transformations for State Updates
// In Cliffy, state updates use geometric algebra concepts
const increment = () => {
  // Geometric translation along the positive e1 axis
  const translation = cliffy.translator(1, 0, 0);
  countState.setValue(count => count + 1);
};

const decrement = () => {
  // Geometric translation along the negative e1 axis  
  const translation = cliffy.translator(-1, 0, 0);
  countState.setValue(count => count - 1);
};

const reset = () => {
  // Return to origin (identity transform)
  const identity = cliffy.scalar(1);
  countState.setValue(0);
};

const double = () => {
  // Geometric scaling transformation
  const scaling = cliffy.scalar(2);
  countState.setValue(count => count * 2);
};

// STEP 4: Create UI Components using Algebraic JSX

/**
 * Button component that demonstrates geometric styling
 */
const CounterButton = (props: {
  onClick: () => void;
  children: string;
  variant?: 'primary' | 'secondary' | 'danger';
}): AlgebraicElement => {
  const { onClick, children, variant = 'primary' } = props;
  
  // Use geometric transformations for styling
  const transform = countState.map(count => {
    // Scale buttons based on count value using geometric algebra
    const scale = Math.abs(count) > 10 ? 1.1 : 1.0;
    return cliffy.scalar(scale);
  });

  const colors = {
    primary: '#4CAF50',
    secondary: '#2196F3', 
    danger: '#f44336'
  };

  return jsx('button', {
    onClick,
    style: {
      padding: '12px 24px',
      margin: '8px',
      fontSize: '16px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: colors[variant],
      color: 'white',
      cursor: 'pointer',
      transform: transform, // Geometric transformation applied
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    children: children
  });
};

/**
 * Status indicator component using When combinator
 */
const CounterStatus = (): AlgebraicElement => {
  return jsx('div', {
    style: {
      margin: '20px 0',
      fontSize: '18px',
      fontWeight: 'bold'
    },
    children: [
      // Conditional rendering using When combinator
      When({
        condition: isPositive,
        children: jsx('div', {
          style: { color: '#4CAF50' },
          children: '📈 Positive Territory!'
        })
      }),
      
      When({
        condition: isNegative,
        children: jsx('div', {
          style: { color: '#f44336' },
          children: '📉 Negative Zone!'
        })
      }),
      
      When({
        condition: isZero,
        children: jsx('div', {
          style: { color: '#666' },
          children: '⚖️ Perfectly Balanced'
        })
      })
    ]
  });
};

// STEP 5: Main Application Component
export const CounterApp = (): AlgebraicElement => {
  return jsx('div', {
    style: {
      maxWidth: '400px',
      margin: '50px auto',
      padding: '30px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9f9f9',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    children: [
      // Header
      jsx('h1', {
        style: {
          color: '#333',
          marginBottom: '10px',
          // Use geometric scaling for the header
          transform: cliffy.scalar(1.2)
        },
        children: 'Cliffy Counter'
      }),

      jsx('p', {
        style: {
          color: '#666',
          fontSize: '14px',
          marginBottom: '30px'
        },
        children: 'Learn Geometric Behaviors & Algebraic JSX'
      }),

      // Counter Display
      jsx('div', {
        style: {
          fontSize: '48px',
          fontWeight: 'bold',
          margin: '30px 0',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          // Color changes based on count value
          color: countState.map(count => {
            if (count > 0) return '#4CAF50';
            if (count < 0) return '#f44336';
            return '#333';
          }),
          // Geometric transformation for visual feedback
          transform: countState.map(count => {
            const rotation = count * 2; // Rotate based on count
            return cliffy.rotor(Math.PI / 180 * rotation, 1, 0); // Rotate in e12 plane
          })
        },
        children: countDisplay
      }),

      // Status Component
      CounterStatus(),

      // Control Buttons
      jsx('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px',
          margin: '30px 0'
        },
        children: [
          CounterButton({ 
            onClick: decrement, 
            children: '➖ Decrement',
            variant: 'secondary' 
          }),
          
          CounterButton({ 
            onClick: increment, 
            children: '➕ Increment',
            variant: 'primary' 
          }),
          
          CounterButton({ 
            onClick: double, 
            children: '✖️ Double',
            variant: 'secondary' 
          }),
          
          CounterButton({ 
            onClick: reset, 
            children: '🔄 Reset',
            variant: 'danger' 
          })
        ]
      }),

      // Learning Notes
      jsx('div', {
        style: {
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          textAlign: 'left',
          fontSize: '14px'
        },
        children: [
          jsx('h3', {
            style: { margin: '0 0 15px 0', color: '#1976d2' },
            children: '🎓 What You\'re Learning:'
          }),
          jsx('ul', {
            style: { margin: '0', paddingLeft: '20px', lineHeight: '1.6' },
            children: [
              jsx('li', { children: 'GeometricBehavior<T> for reactive state management' }),
              jsx('li', { children: 'jsx() function creates algebraic elements' }),
              jsx('li', { children: 'When combinator for conditional rendering' }),
              jsx('li', { children: 'Geometric transformations (scaling, rotation, translation)' }),
              jsx('li', { children: 'Derived behaviors with .map() operations' })
            ]
          })
        ]
      })
    ]
  });
};

export default CounterApp;