# Cliffy Examples

This directory contains example applications demonstrating various aspects of the Cliffy framework. Each example focuses on specific concepts to help you understand how to use geometric algebra for web development.

## Getting Started

All examples are built with Vite and TypeScript. To run any example:

```bash
cd examples/[example-name]
npm install
npm run dev
```

**Note**: These examples currently won't run successfully as the core Cliffy framework is still under development. They serve as documentation of the intended API and patterns.

## Examples Overview

### 1. Basic Counter (`basic-counter/`)
**Port**: 3000  
**Concepts**: Fundamental Cliffy patterns

The simplest possible Cliffy application. Perfect for getting started.

**What you'll learn:**
- Creating `GeometricBehavior<T>` for state management
- Using the `jsx()` function to create algebraic elements
- Handling events with geometric transformations
- Basic `When` combinator for conditional rendering
- Geometric scaling and transformation effects

**Key Files:**
- `src/CounterApp.tsx` - Main component with detailed comments
- `src/main.ts` - Application bootstrap

**Run it:**
```bash
cd examples/basic-counter
npm install && npm run dev
# Open http://localhost:3000
```

### 2. Form Validation (`form-validation/`)
**Port**: 3000  
**Concepts**: Complex state management and validation

A registration form demonstrating advanced Cliffy patterns.

**What you'll learn:**
- Multiple interconnected geometric behaviors
- Combining behaviors with `.combine()` for complex logic
- Real-time validation with visual feedback
- Geometric animations for error states and loading
- Form submission with async state management
- Password strength visualization using geometric "magnitude"

**Key Features:**
- Email, password, and age validation
- Password strength indicator with geometric scaling
- Real-time error feedback with geometric shake animations
- Form submission with loading states
- Terms of service checkbox

**Run it:**
```bash
cd examples/form-validation
npm install && npm run dev
# Open http://localhost:3000
```

### 3. Geometric Animations (`geometric-animations/`)
**Port**: 3000  
**Concepts**: Clifford algebra transformations for UI

Visual showcase of geometric algebra's power for animations.

**What you'll learn:**
- Pure rotations using geometric rotors
- Translations with conformal geometric algebra
- Scaling transformations with scalar multivectors
- Complex motions combining multiple transformations
- Particle systems with phase-offset animations
- Mathematical explanations of each transformation

**Animation Types:**
- **Rotation**: `R = cos(θ/2) + sin(θ/2)(e₁∧e₂)` - Geometric rotors
- **Translation**: Conformal translators for smooth motion
- **Scaling**: Scalar multivectors for size changes
- **Spiral**: Combined translation and rotation motors
- **Figure-8**: Lissajous curves via geometric transformations
- **Particles**: Multi-body system with individual transformations

**Run it:**
```bash
cd examples/geometric-animations
npm install && npm run dev
# Open http://localhost:3000
```

### 4. Todo App (`todo-app/`)
**Port**: 3000  
**Concepts**: Complete application patterns

The classic TodoMVC application built with Cliffy's algebraic approach.

**What you'll learn:**
- `For` combinator for rendering lists
- `Map` combinator for data transformations
- Filtering and derived behaviors
- Component composition patterns
- State management for CRUD operations
- Geometric transformations for visual feedback

**Features:**
- Add, edit, delete todos
- Filter by all/active/completed
- Clear completed todos
- Visual transformations for completed items
- Statistics display

### 5. Collaborative Editor (`collaborative-editor/`)
**Port**: 3000  
**Concepts**: Real-time collaboration and distributed systems

A collaborative text editor using geometric algebra for conflict resolution.

**What you'll learn:**
- Distributed state management
- CRDT (Conflict-free Replicated Data Types) with geometric algebra
- WebSocket integration
- Real-time synchronization
- Geometric operations for text transformations

**Features:**
- Real-time collaborative editing
- Conflict resolution using geometric algebra
- Multiple cursor positions
- Operational transformation
- Persistent document state

## Common Patterns

### Creating Geometric Behaviors

All Cliffy applications use `GeometricBehavior<T>` for state management:

```tsx
// Create state
const countState = createGeometricBehavior<number>(0);

// Derived behaviors
const isPositive = countState.map(count => count > 0);
const displayText = countState.map(count => `Count: ${count}`);

// Combined behaviors
const validation = emailState.combine(
  passwordState,
  (email, password) => validateForm(email, password)
);
```

### Algebraic JSX Elements

Use the `jsx()` function instead of React's JSX:

```tsx
// Basic element
const button = jsx('button', {
  onClick: handleClick,
  children: 'Click me'
});

// With geometric transformations
const animatedDiv = jsx('div', {
  style: {
    transform: rotationBehavior, // GeometricBehavior<Transform>
    opacity: fadeInBehavior      // GeometricBehavior<number>
  },
  children: 'Animated content'
});
```

### Control Flow Combinators

Replace JavaScript control structures with mathematical operations:

```tsx
// Conditional rendering
When({
  condition: isLoggedIn,
  children: jsx('div', { children: 'Welcome!' })
})

// List rendering  
For({
  each: todosBehavior,
  key: (todo) => todo.id,
  children: (todoBehavior) => TodoItem({ todo: todoBehavior })
})

// Data transformation
Map({
  from: usersBehavior,
  to: (users) => users.length,
  children: (count) => `${count} users`
})
```

### Geometric Transformations

Use Clifford algebra operations for UI effects:

```tsx
// Rotation using rotors
const rotation = cliffy.rotor(angle, 1, 0); // Rotate in e12 plane

// Translation using motors
const translation = cliffy.translator(x, y, z);

// Scaling with scalars
const scaling = cliffy.scalar(1.5);

// Complex transformations
const complexTransform = translation.add(rotation).multiply(scaling);
```

## Development Notes

### Current Status
These examples represent the intended API design. The core framework is under development, so:

- Examples won't run successfully yet
- APIs may change during development  
- Mathematical operations are simplified implementations
- Focus on understanding the patterns and concepts

### Mathematical Foundation
Each example includes explanations of the geometric algebra concepts:

- **Rotors**: Represent rotations as exponentials of bivectors
- **Translators**: Conformal geometric algebra for translations
- **Motors**: General transformations combining rotation and translation
- **Multivectors**: Unified representation of geometric objects

### Build System
All examples use:
- **Vite** for development and building
- **TypeScript** for type safety
- **ESM modules** for modern JavaScript
- **Hot reloading** for development

### Contributing
When the core framework is ready:

1. Test examples work correctly
2. Add more complex use cases  
3. Improve mathematical explanations
4. Add performance benchmarks
5. Create interactive tutorials

## Next Steps

1. **Start with basic-counter** - Understand fundamental concepts
2. **Try form-validation** - Learn complex state management
3. **Explore geometric-animations** - See mathematical transformations in action
4. **Study todo-app** - Complete application patterns
5. **Build your own** - Apply the concepts to your own projects

Each example builds on concepts from previous ones, so follow them in order for the best learning experience.