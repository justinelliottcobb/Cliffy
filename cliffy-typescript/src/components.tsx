/**
 * React components for geometric transformations and visualizations
 */

import React, { useRef, useEffect, useState, ReactNode } from 'react';
import { Multivector } from './multivector';
import { useGeometric, useGeometricAnimation } from './react';
import type { CliffySignature } from './types';

interface GeometricSpaceProps {
  children: ReactNode;
  signature?: CliffySignature;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

export function GeometricSpace({
  children,
  signature = 'Cl(3,0)',
  width = 400,
  height = 400,
  style = {}
}: GeometricSpaceProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up coordinate system
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(1, -1); // Flip Y-axis for mathematical coordinates

    // Draw coordinate axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(-width / 2, 0);
    ctx.lineTo(width / 2, 0);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(0, -height / 2);
    ctx.lineTo(0, height / 2);
    ctx.stroke();

    ctx.restore();
  }, [width, height]);

  return (
    <div style={{ position: 'relative', ...style }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          border: '1px solid #ccc',
          background: '#fafafa'
        }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        {children}
      </div>
    </div>
  );
}

interface TransformProps {
  children: ReactNode;
  rotor?: Multivector;
  translator?: Multivector;
  scale?: number;
  duration?: number;
  animate?: boolean;
}

export function Transform({
  children,
  rotor,
  translator,
  scale = 1,
  duration = 1,
  animate = false
}: TransformProps): JSX.Element {
  const [transformedChildren, setTransformedChildren] = useState(children);

  // Apply geometric transformations to child components
  useEffect(() => {
    // This is a simplified version - in practice, we'd need to traverse
    // the React element tree and apply transformations to geometric objects
    setTransformedChildren(children);
  }, [rotor, translator, scale, children]);

  return <>{transformedChildren}</>;
}

interface VectorVisualizationProps {
  vector: Multivector;
  color?: string;
  thickness?: number;
  label?: string;
}

export function VectorVisualization({
  vector,
  color = '#007acc',
  thickness = 2,
  label
}: VectorVisualizationProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coeffs = vector.coefficients;
    const scale = 50; // Scale factor for visualization

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    // Draw vector as arrow
    const x = coeffs[1] * scale; // e1 coefficient
    const y = coeffs[2] * scale; // e2 coefficient

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.fillStyle = color;

    // Draw line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Draw arrowhead
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    const angle = Math.atan2(y, x);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - arrowLength * Math.cos(angle - arrowAngle),
      y - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - arrowLength * Math.cos(angle + arrowAngle),
      y - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();

    ctx.restore();

    // Draw label
    if (label) {
      ctx.fillStyle = color;
      ctx.font = '12px sans-serif';
      ctx.fillText(label, x + canvas.width / 2 + 5, -y + canvas.height / 2 - 5);
    }
  }, [vector, color, thickness, label]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      style={{ position: 'absolute', pointerEvents: 'none' }}
    />
  );
}

interface BivectorVisualizationProps {
  bivector: Multivector;
  color?: string;
  opacity?: number;
}

export function BivectorVisualization({
  bivector,
  color = '#ff6b35',
  opacity = 0.3
}: BivectorVisualizationProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coeffs = bivector.coefficients;
    const scale = 50;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    // Draw bivector as oriented area
    const e12 = coeffs[3] * scale; // e1 ∧ e2 coefficient

    if (Math.abs(e12) > 0.01) {
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      
      // Draw parallelogram representing the bivector
      ctx.beginPath();
      ctx.arc(0, 0, Math.abs(e12), 0, 2 * Math.PI);
      ctx.fill();

      // Add orientation indicator
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      if (e12 > 0) {
        // Counter-clockwise arrow
        ctx.beginPath();
        ctx.arc(0, 0, Math.abs(e12) * 0.8, 0, Math.PI / 2);
        ctx.stroke();
      } else {
        // Clockwise arrow
        ctx.beginPath();
        ctx.arc(0, 0, Math.abs(e12) * 0.8, 0, -Math.PI / 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [bivector, color, opacity]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      style={{ position: 'absolute', pointerEvents: 'none' }}
    />
  );
}

interface RotorControlProps {
  onRotorChange: (rotor: Multivector) => void;
  initialAngle?: number;
  bivector?: Multivector;
}

export function RotorControl({
  onRotorChange,
  initialAngle = 0,
  bivector
}: RotorControlProps): JSX.Element {
  const [angle, setAngle] = useState(initialAngle);

  useEffect(() => {
    if (!bivector) return;

    // Create rotor from angle and bivector
    const halfAngle = angle / 2;
    const cos = Math.cos(halfAngle);
    const sin = Math.sin(halfAngle);
    
    const rotor = Multivector.scalar(cos).add(bivector.scale(sin));
    onRotorChange(rotor);
  }, [angle, bivector, onRotorChange]);

  return (
    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <label style={{ display: 'block', marginBottom: '5px' }}>
        Rotation Angle: {angle.toFixed(2)} radians
      </label>
      <input
        type="range"
        min={-Math.PI}
        max={Math.PI}
        step={0.01}
        value={angle}
        onChange={(e) => setAngle(parseFloat(e.target.value))}
        style={{ width: '100%' }}
      />
      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
        {(angle * 180 / Math.PI).toFixed(1)}°
      </div>
    </div>
  );
}

interface GeometricAnimationProps {
  from: Multivector;
  to: Multivector;
  duration: number;
  children: (value: Multivector, progress: number) => ReactNode;
  autoPlay?: boolean;
}

export function GeometricAnimation({
  from,
  to,
  duration,
  children,
  autoPlay = true
}: GeometricAnimationProps): JSX.Element {
  const { value, progress } = useGeometricAnimation(duration, from, to);

  return <>{children(value, progress)}</>;
}

interface CRDTStatusProps {
  nodeId: string;
  state: Multivector;
  operations: number;
  peers: string[];
}

export function CRDTStatus({
  nodeId,
  state,
  operations,
  peers
}: CRDTStatusProps): JSX.Element {
  return (
    <div style={{
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: '#f9f9f9',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div><strong>Node:</strong> {nodeId.slice(0, 8)}...</div>
      <div><strong>State:</strong> {state.toString()}</div>
      <div><strong>Operations:</strong> {operations}</div>
      <div><strong>Peers:</strong> {peers.length}</div>
      {peers.length > 0 && (
        <div style={{ marginTop: '5px' }}>
          {peers.map(peer => (
            <div key={peer} style={{ marginLeft: '10px' }}>
              • {peer.slice(0, 8)}...
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PerformanceMonitorProps {
  onMetrics?: (metrics: { fps: number; operations: number }) => void;
}

export function PerformanceMonitor({ onMetrics }: PerformanceMonitorProps): JSX.Element {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<{ fps: number; operations: number } | null>(null);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      // Start monitoring logic would go here
      // For now, simulate metrics
      const interval = setInterval(() => {
        const mockMetrics = {
          fps: 60 + Math.random() * 10,
          operations: Math.floor(1000 + Math.random() * 500)
        };
        setMetrics(mockMetrics);
        onMetrics?.(mockMetrics);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setMetrics(null);
    }
  };

  return (
    <div style={{
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      backgroundColor: '#f0f8ff'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={toggleMonitoring}>
          {isMonitoring ? 'Stop' : 'Start'} Monitoring
        </button>
      </div>
      
      {metrics && (
        <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          <div>FPS: {metrics.fps.toFixed(1)}</div>
          <div>Ops/sec: {metrics.operations.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}