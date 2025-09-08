/**
 * React hooks and components for Cliffy geometric algebra
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Multivector } from './multivector';
import { GeometricBehavior } from './behavior';
import { Cliffy } from './cliffy';
import type { CliffySignature, GeometricState } from './types';

// React hook for geometric state management
export function useGeometric<S extends CliffySignature = 'Cl(3,0)'>(
  initialValue: Multivector,
  signature?: S
): GeometricState<Multivector> {
  const [value, setValue] = useState<Multivector>(initialValue);
  const behaviorRef = useRef<GeometricBehavior | null>(null);
  const cliffyRef = useRef<Cliffy<S> | null>(null);
  const subscribersRef = useRef<Set<(value: Multivector) => void>>(new Set());

  // Initialize Cliffy instance
  useEffect(() => {
    const initCliffy = async () => {
      const cliffy = new Cliffy(signature);
      await cliffy.initialize();
      cliffyRef.current = cliffy;
      
      const behavior = cliffy.behavior(initialValue);
      behaviorRef.current = behavior;
      
      // Subscribe to behavior updates
      const unsubscribe = behavior.subscribe((newValue) => {
        setValue(newValue);
        subscribersRef.current.forEach(callback => callback(newValue));
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    initCliffy().then(fn => unsubscribe = fn);

    return () => {
      unsubscribe?.();
    };
  }, [initialValue, signature]);

  const transform = useCallback((operation: string, ...args: unknown[]) => {
    if (!behaviorRef.current || !cliffyRef.current) return;

    const currentValue = behaviorRef.current.sample();
    let newValue: Multivector;

    switch (operation) {
      case 'geometricProduct':
        if (args[0] instanceof Multivector) {
          newValue = currentValue.geometricProduct(args[0]);
        } else {
          return;
        }
        break;
      case 'addition':
        if (args[0] instanceof Multivector) {
          newValue = currentValue.add(args[0]);
        } else {
          return;
        }
        break;
      case 'sandwich':
        if (args[0] instanceof Multivector) {
          newValue = args[0].sandwich(currentValue);
        } else {
          return;
        }
        break;
      case 'exponential':
        newValue = currentValue.exp();
        break;
      case 'logarithm':
        newValue = currentValue.log();
        break;
      case 'normalize':
        newValue = currentValue.normalize();
        break;
      case 'scale':
        if (typeof args[0] === 'number') {
          newValue = currentValue.scale(args[0]);
        } else {
          return;
        }
        break;
      default:
        return;
    }

    behaviorRef.current.update(newValue);
  }, []);

  const reset = useCallback(() => {
    if (!behaviorRef.current) return;
    behaviorRef.current.update(initialValue);
  }, [initialValue]);

  const subscribe = useCallback((callback: (value: Multivector) => void) => {
    subscribersRef.current.add(callback);
    return () => subscribersRef.current.delete(callback);
  }, []);

  return {
    value,
    transform,
    reset,
    subscribe
  };
}

// Hook for animation with geometric algebra
export function useGeometricAnimation(
  duration: number,
  from: Multivector,
  to: Multivector
): { value: Multivector; progress: number; isComplete: boolean } {
  const [progress, setProgress] = useState(0);
  const [value, setValue] = useState(from);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const currentProgress = Math.min(elapsed / (duration * 1000), 1);
      
      setProgress(currentProgress);
      
      // Spherical linear interpolation for geometric values
      const diff = to.geometricProduct(from.conjugate());
      const logDiff = diff.log();
      const interpolatedLog = logDiff.scale(currentProgress);
      const interpolatedResult = from.geometricProduct(interpolatedLog.exp());
      
      setValue(interpolatedResult);

      if (currentProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
      }
    };

    setIsComplete(false);
    startTimeRef.current = null;
    requestAnimationFrame(animate);
  }, [duration, from, to]);

  return { value, progress, isComplete };
}

// Hook for P2P collaboration
export function useP2PCollaboration<S extends CliffySignature = 'Cl(3,0)'>(
  signature?: S
): {
  connect: (peerId: string) => Promise<void>;
  disconnect: () => void;
  broadcast: (operation: string) => void;
  peers: string[];
  isConnected: boolean;
} {
  const [peers, setPeers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const cliffyRef = useRef<Cliffy<S> | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    const initCliffy = async () => {
      const cliffy = new Cliffy(signature);
      await cliffy.initialize();
      await cliffy.initCRDT();
      cliffyRef.current = cliffy;
    };

    initCliffy();
  }, [signature]);

  const connect = useCallback(async (peerId: string) => {
    if (!cliffyRef.current) return;

    try {
      const peerConnection = await cliffyRef.current.setupP2P();
      peerConnectionsRef.current.set(peerId, peerConnection);

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
          setPeers(prev => [...prev, peerId]);
          setIsConnected(true);
        } else if (peerConnection.connectionState === 'disconnected') {
          setPeers(prev => prev.filter(id => id !== peerId));
          peerConnectionsRef.current.delete(peerId);
          setIsConnected(peerConnectionsRef.current.size > 0);
        }
      };

    } catch (error) {
      console.error('Failed to connect to peer:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => {
      connection.close();
    });
    peerConnectionsRef.current.clear();
    setPeers([]);
    setIsConnected(false);
  }, []);

  const broadcast = useCallback((operation: string) => {
    if (!cliffyRef.current) return;

    peerConnectionsRef.current.forEach((connection) => {
      cliffyRef.current!.broadcastOperation(connection, operation);
    });
  }, []);

  return {
    connect,
    disconnect,
    broadcast,
    peers,
    isConnected
  };
}

// Hook for performance monitoring
export function usePerformanceMonitor(): {
  benchmark: () => Promise<number>;
  metrics: { fps: number; operations: number } | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
} {
  const [metrics, setMetrics] = useState<{ fps: number; operations: number } | null>(null);
  const monitoringRef = useRef<boolean>(false);
  const cliffyRef = useRef<Cliffy | null>(null);

  useEffect(() => {
    const initCliffy = async () => {
      const cliffy = new Cliffy('Cl(3,0)');
      await cliffy.initialize();
      cliffyRef.current = cliffy;
    };

    initCliffy();
  }, []);

  const benchmark = useCallback(async () => {
    if (!cliffyRef.current) return 0;
    return cliffyRef.current.benchmarkGeometricProduct();
  }, []);

  const startMonitoring = useCallback(() => {
    monitoringRef.current = true;
    
    let frameCount = 0;
    let operationCount = 0;
    let lastTime = performance.now();

    const monitor = () => {
      if (!monitoringRef.current) return;

      frameCount++;
      const now = performance.now();
      
      if (now - lastTime >= 1000) {
        setMetrics({
          fps: frameCount,
          operations: operationCount
        });
        
        frameCount = 0;
        operationCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  }, []);

  const stopMonitoring = useCallback(() => {
    monitoringRef.current = false;
    setMetrics(null);
  }, []);

  return {
    benchmark,
    metrics,
    startMonitoring,
    stopMonitoring
  };
}