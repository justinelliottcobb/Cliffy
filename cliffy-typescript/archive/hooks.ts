/**
 * Geometric state management hooks for Cliffy framework
 * Pure implementation without React dependencies
 */

import { Multivector } from './multivector';
import { GeometricBehavior } from './behavior';
import { Cliffy } from './cliffy';

// Global Cliffy instance for framework operations
let globalCliffyInstance: Cliffy | null = null;
let currentComponent: ComponentContext | null = null;
let hookIndex: number = 0;

export function setGlobalClifffy(instance: Cliffy) {
  globalCliffyInstance = instance;
}

export function getClifffy(): Cliffy {
  if (!globalCliffyInstance) {
    throw new Error('Cliffy not initialized. Make sure to call initializeClifffy() first.');
  }
  return globalCliffyInstance;
}

// Component context for hook state management
interface ComponentContext {
  id: string;
  hooks: Map<number, HookState>;
  isRendering: boolean;
  scheduleUpdate: () => void;
}

interface HookState {
  type: 'geometric' | 'effect' | 'memo' | 'callback';
  value: any;
  dependencies?: any[];
  cleanup?: () => void;
}

export function setCurrentComponent(component: ComponentContext) {
  currentComponent = component;
  hookIndex = 0;
}

export function clearCurrentComponent() {
  currentComponent = null;
  hookIndex = 0;
}

function getNextHookIndex(): number {
  return hookIndex++;
}

function getCurrentHook<T>(type: string, initialValue: T): [T, (newValue: T) => void] {
  if (!currentComponent) {
    throw new Error('Hooks can only be used inside components during render');
  }

  const index = getNextHookIndex();
  const existing = currentComponent.hooks.get(index);

  if (existing) {
    if (existing.type !== type) {
      throw new Error(`Hook type mismatch at index ${index}. Expected ${type}, got ${existing.type}`);
    }
    return [existing.value, (newValue: T) => {
      existing.value = newValue;
      currentComponent?.scheduleUpdate();
    }];
  }

  const hookState: HookState = {
    type: type as any,
    value: initialValue
  };

  currentComponent.hooks.set(index, hookState);

  return [initialValue, (newValue: T) => {
    hookState.value = newValue;
    currentComponent?.scheduleUpdate();
  }];
}

/**
 * Core geometric state hook - like useState but for geometric values
 */
export function useGeometric(
  initialValue: Multivector
): [Multivector, (newValue: Multivector | ((prev: Multivector) => Multivector)) => void] {
  const [value, setValue] = getCurrentHook('geometric', initialValue);

  const setGeometricValue = (
    newValue: Multivector | ((prev: Multivector) => Multivector)
  ) => {
    if (typeof newValue === 'function') {
      setValue(newValue(value));
    } else {
      setValue(newValue);
    }
  };

  return [value, setGeometricValue];
}

/**
 * Geometric transformation hook - provides transform operations
 */
export function useGeometricTransform(
  initialTransform?: Multivector
): [
  Multivector,
  {
    translate: (translation: Multivector) => void;
    rotate: (rotor: Multivector) => void;
    scale: (factor: number) => void;
    reset: () => void;
    apply: (transform: Multivector) => void;
  }
] {
  const cliffy = getClifffy();
  const [transform, setTransform] = useGeometric(
    initialTransform || cliffy.scalar(1)
  );

  const operations = {
    translate: (translation: Multivector) => {
      setTransform(current => current.add(translation));
    },
    
    rotate: (rotor: Multivector) => {
      setTransform(current => rotor.sandwich(current));
    },
    
    scale: (factor: number) => {
      setTransform(current => current.scale(factor));
    },
    
    reset: () => {
      setTransform(initialTransform || cliffy.scalar(1));
    },
    
    apply: (newTransform: Multivector) => {
      setTransform(current => current.geometricProduct(newTransform));
    }
  };

  return [transform, operations];
}

/**
 * Effect hook for side effects
 */
export function useGeometricEffect(
  effect: () => void | (() => void),
  dependencies?: any[]
): void {
  if (!currentComponent) {
    throw new Error('useGeometricEffect can only be used inside components');
  }

  const index = getNextHookIndex();
  const existing = currentComponent.hooks.get(index);

  const shouldRun = !existing || 
    !existing.dependencies || 
    !dependencies ||
    dependencies.some((dep, i) => dep !== existing.dependencies![i]);

  if (shouldRun) {
    // Clean up previous effect
    if (existing?.cleanup) {
      existing.cleanup();
    }

    // Run the effect
    const cleanup = effect();

    // Store the hook state
    const hookState: HookState = {
      type: 'effect',
      value: null,
      dependencies: dependencies ? [...dependencies] : undefined,
      cleanup: typeof cleanup === 'function' ? cleanup : undefined
    };

    currentComponent.hooks.set(index, hookState);
  }
}

/**
 * Memo hook for expensive computations
 */
export function useGeometricMemo<T>(
  computation: () => T,
  dependencies: any[]
): T {
  if (!currentComponent) {
    throw new Error('useGeometricMemo can only be used inside components');
  }

  const index = getNextHookIndex();
  const existing = currentComponent.hooks.get(index);

  const shouldCompute = !existing || 
    !existing.dependencies ||
    dependencies.some((dep, i) => dep !== existing.dependencies![i]);

  if (shouldCompute) {
    const value = computation();
    const hookState: HookState = {
      type: 'memo',
      value,
      dependencies: [...dependencies]
    };
    currentComponent.hooks.set(index, hookState);
    return value;
  }

  return existing.value;
}

/**
 * Callback hook for memoized functions
 */
export function useGeometricCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T {
  return useGeometricMemo(() => callback, dependencies);
}

/**
 * Geometric animation hook - smooth transitions between geometric values
 */
export function useGeometricAnimation(
  from: Multivector,
  to: Multivector,
  duration: number = 300,
  options: {
    autoStart?: boolean;
    loop?: boolean;
    ease?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  } = {}
): [
  Multivector,
  {
    start: () => void;
    stop: () => void;
    restart: () => void;
    progress: number;
    isRunning: boolean;
  }
] {
  const { autoStart = false, loop = false, ease = 'ease' } = options;
  const [current, setCurrent] = useGeometric(from);
  const [progress, setProgress] = useGeometric(getClifffy().scalar(0));
  const [isRunning, setIsRunning] = useGeometric(getClifffy().scalar(0)); // 0 = false, 1 = true
  
  const animationRef = { current: 0 };
  const startTimeRef = { current: 0 };

  const easeFunction = useGeometricMemo(() => {
    switch (ease) {
      case 'linear': return (t: number) => t;
      case 'ease': return (t: number) => t * t * (3 - 2 * t);
      case 'ease-in': return (t: number) => t * t;
      case 'ease-out': return (t: number) => 1 - (1 - t) * (1 - t);
      case 'ease-in-out': return (t: number) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
      default: return (t: number) => t;
    }
  }, [ease]);

  const animate = useGeometricCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const rawProgress = Math.min(elapsed / duration, 1);
    const easedProgress = easeFunction(rawProgress);
    
    setProgress(getClifffy().scalar(rawProgress));

    // Geometric interpolation using exponential/logarithm
    const diff = to.geometricProduct(from.conjugate());
    const logDiff = diff.log();
    const scaledLog = logDiff.scale(easedProgress);
    const interpolated = from.geometricProduct(scaledLog.exp());
    
    setCurrent(interpolated);

    if (rawProgress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsRunning(getClifffy().scalar(0));
      if (loop) {
        setTimeout(() => start(), 0);
      }
    }
  }, [from, to, duration, easeFunction, loop]);

  const start = useGeometricCallback(() => {
    if (isRunning.coefficients[0] > 0.5) return;
    
    setIsRunning(getClifffy().scalar(1));
    setProgress(getClifffy().scalar(0));
    startTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);
  }, [animate, isRunning]);

  const stop = useGeometricCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    setIsRunning(getClifffy().scalar(0));
  }, []);

  const restart = useGeometricCallback(() => {
    stop();
    setCurrent(from);
    setProgress(getClifffy().scalar(0));
    start();
  }, [stop, start, from]);

  useGeometricEffect(() => {
    if (autoStart) {
      start();
    }
    
    return () => {
      stop();
    };
  }, [autoStart, start, stop]);

  return [current, { 
    start, 
    stop, 
    restart, 
    progress: progress.coefficients[0], 
    isRunning: isRunning.coefficients[0] > 0.5 
  }];
}

/**
 * Geometric spring physics hook
 */
export function useGeometricSpring(
  target: Multivector,
  config: {
    stiffness?: number;
    damping?: number;
    mass?: number;
    precision?: number;
  } = {}
): [Multivector, (newTarget: Multivector) => void] {
  const { 
    stiffness = 0.1, 
    damping = 0.8, 
    mass = 1, 
    precision = 0.001 
  } = config;

  const [current, setCurrent] = useGeometric(target);
  const [velocity, setVelocity] = useGeometric(getClifffy().zero());
  const animationRef = { current: 0 };
  const targetRef = { current: target };

  targetRef.current = target;

  const animate = useGeometricCallback(() => {
    const displacement = targetRef.current.subtract(current);
    const springForce = displacement.scale(stiffness / mass);
    const dampingForce = velocity.scale(-damping / mass);
    const totalForce = springForce.add(dampingForce);
    
    const newVelocity = velocity.add(totalForce);
    const newPosition = current.add(newVelocity);
    
    setVelocity(newVelocity);
    setCurrent(newPosition);
    
    // Check if spring has settled
    const displacementMagnitude = displacement.magnitude();
    const velocityMagnitude = newVelocity.magnitude();
    
    if (displacementMagnitude > precision || velocityMagnitude > precision) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [current, velocity, stiffness, damping, mass, precision]);

  useGeometricEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, target]);

  const setTarget = useGeometricCallback((newTarget: Multivector) => {
    targetRef.current = newTarget;
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  return [current, setTarget];
}

/**
 * Geometric reducer hook - for complex state management
 */
export function useGeometricReducer<A>(
  reducer: (state: Multivector, action: A) => Multivector,
  initialState: Multivector
): [Multivector, (action: A) => void] {
  const [state, setState] = useGeometric(initialState);

  const dispatch = useGeometricCallback((action: A) => {
    setState(currentState => reducer(currentState, action));
  }, [reducer]);

  return [state, dispatch];
}

export { ComponentContext };