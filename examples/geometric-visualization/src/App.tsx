import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Html } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';

import { Cliffy, Multivector, MultivectorBuilder, initWasm } from '@cliffy/typescript';
import { useGeometric, useGeometricAnimation } from '@cliffy/typescript/react';

// Custom geometric objects for Three.js
const VectorArrow: React.FC<{ 
  vector: Multivector; 
  color: string; 
  label?: string;
  scale?: number;
}> = ({ vector, color, label, scale = 1 }) => {
  const coeffs = vector.coefficients;
  const direction = useMemo(() => new THREE.Vector3(
    coeffs[1] || 0, // e1
    coeffs[2] || 0, // e2  
    coeffs[4] || 0  // e3
  ).normalize(), [coeffs]);
  
  const magnitude = useMemo(() => 
    Math.sqrt((coeffs[1] || 0) ** 2 + (coeffs[2] || 0) ** 2 + (coeffs[4] || 0) ** 2) * scale,
    [coeffs, scale]
  );

  if (magnitude < 0.001) return null;

  return (
    <group>
      <mesh position={direction.clone().multiplyScalar(magnitude / 2)}>
        <cylinderGeometry args={[0.02, 0.02, magnitude]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      <mesh position={direction.clone().multiplyScalar(magnitude)}>
        <coneGeometry args={[0.05, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {label && (
        <Html position={direction.clone().multiplyScalar(magnitude + 0.2)}>
          <div style={{ 
            color: color, 
            fontSize: '12px', 
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.8)',
            padding: '2px 6px',
            borderRadius: '3px'
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};

const BivectorPlane: React.FC<{
  bivector: Multivector;
  color: string;
  opacity?: number;
}> = ({ bivector, color, opacity = 0.3 }) => {
  const coeffs = bivector.coefficients;
  
  // Extract bivector components
  const e12 = coeffs[3] || 0; // xy-plane
  const e13 = coeffs[5] || 0; // xz-plane
  const e23 = coeffs[6] || 0; // yz-plane

  return (
    <group>
      {/* XY plane (e12) */}
      {Math.abs(e12) > 0.001 && (
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[Math.abs(e12), Math.abs(e12)]} />
          <meshStandardMaterial 
            color={color} 
            transparent 
            opacity={opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* XZ plane (e13) */}
      {Math.abs(e13) > 0.001 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[Math.abs(e13), Math.abs(e13)]} />
          <meshStandardMaterial 
            color={color} 
            transparent 
            opacity={opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* YZ plane (e23) */}
      {Math.abs(e23) > 0.001 && (
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[Math.abs(e23), Math.abs(e23)]} />
          <meshStandardMaterial 
            color={color} 
            transparent 
            opacity={opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

const GeometricProduct: React.FC<{
  a: Multivector;
  b: Multivector;
  result: Multivector;
  showSteps?: boolean;
}> = ({ a, b, result, showSteps }) => {
  return (
    <group>
      <VectorArrow vector={a} color="#ff6b6b" label="A" />
      <VectorArrow vector={b} color="#4ecdc4" label="B" />
      <VectorArrow vector={result} color="#45b7d1" label="A ∧ B" scale={0.8} />
      
      {showSteps && (
        <Html position={[3, 2, 0]}>
          <div style={{ 
            background: 'rgba(255,255,255,0.95)',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h4>Geometric Product Steps:</h4>
            <div>A = {formatMultivector(a)}</div>
            <div>B = {formatMultivector(b)}</div>
            <div>A * B = {formatMultivector(result)}</div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
              Magnitude: {result.magnitude().toFixed(3)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

const formatMultivector = (mv: Multivector): string => {
  const coeffs = mv.coefficients;
  const terms = [];
  
  const basisNames = ['1', 'e₁', 'e₂', 'e₁₂', 'e₃', 'e₁₃', 'e₂₃', 'e₁₂₃'];
  
  for (let i = 0; i < Math.min(coeffs.length, basisNames.length); i++) {
    const coeff = coeffs[i];
    if (Math.abs(coeff || 0) > 0.001) {
      const sign = coeff >= 0 && terms.length > 0 ? '+' : '';
      const value = Math.abs(coeff).toFixed(2);
      const basis = i === 0 ? '' : basisNames[i];
      terms.push(`${sign}${coeff < 0 ? '-' : ''}${value}${basis}`);
    }
  }
  
  return terms.length > 0 ? terms.join('') : '0';
};

const App: React.FC = () => {
  const [cliffy, setCliffy] = useState<Cliffy | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize Cliffy
  useEffect(() => {
    const init = async () => {
      try {
        await initWasm();
        const cliffyInstance = new Cliffy('Cl(3,0)');
        await cliffyInstance.initialize();
        setCliffy(cliffyInstance);
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Cliffy:', error);
      }
    };
    init();
  }, []);

  // Control panel for interactive manipulation
  const {
    vectorA_x,
    vectorA_y, 
    vectorA_z,
    vectorB_x,
    vectorB_y,
    vectorB_z,
    showSteps,
    animationSpeed,
    operationType,
  } = useControls({
    'Vector A': {
      vectorA_x: { value: 1, min: -3, max: 3, step: 0.1 },
      vectorA_y: { value: 0, min: -3, max: 3, step: 0.1 },
      vectorA_z: { value: 0, min: -3, max: 3, step: 0.1 },
    },
    'Vector B': {
      vectorB_x: { value: 0, min: -3, max: 3, step: 0.1 },
      vectorB_y: { value: 1, min: -3, max: 3, step: 0.1 },
      vectorB_z: { value: 0, min: -3, max: 3, step: 0.1 },
    },
    'Visualization': {
      showSteps: true,
      animationSpeed: { value: 1, min: 0.1, max: 5, step: 0.1 },
      operationType: {
        value: 'geometric_product',
        options: ['geometric_product', 'outer_product', 'inner_product', 'sandwich', 'commutator']
      },
    }
  });

  // Create multivectors from controls
  const vectorA = useMemo(() => {
    if (!cliffy) return new Multivector([0, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)');
    return cliffy.builder()
      .e1(vectorA_x)
      .e2(vectorA_y) 
      .e3(vectorA_z)
      .build();
  }, [cliffy, vectorA_x, vectorA_y, vectorA_z]);

  const vectorB = useMemo(() => {
    if (!cliffy) return new Multivector([0, 0, 0, 0, 0, 0, 0, 0], 'Cl(3,0)');
    return cliffy.builder()
      .e1(vectorB_x)
      .e2(vectorB_y)
      .e3(vectorB_z)
      .build();
  }, [cliffy, vectorB_x, vectorB_y, vectorB_z]);

  // Calculate result based on operation type
  const result = useMemo(() => {
    if (!initialized) return vectorA;
    
    switch (operationType) {
      case 'geometric_product':
        return vectorA.geometricProduct(vectorB);
      case 'outer_product':
        // Outer product = (AB - BA) / 2
        const ab = vectorA.geometricProduct(vectorB);
        const ba = vectorB.geometricProduct(vectorA);
        return ab.subtract(ba).scale(0.5);
      case 'inner_product':
        // Inner product = (AB + BA) / 2
        const ab2 = vectorA.geometricProduct(vectorB);
        const ba2 = vectorB.geometricProduct(vectorA);
        return ab2.add(ba2).scale(0.5);
      case 'sandwich':
        return vectorA.sandwich(vectorB);
      case 'commutator':
        // Commutator = AB - BA
        return vectorA.geometricProduct(vectorB).subtract(vectorB.geometricProduct(vectorA));
      default:
        return vectorA.geometricProduct(vectorB);
    }
  }, [vectorA, vectorB, operationType, initialized]);

  // Animated result for smooth transitions
  const { value: animatedResult } = useGeometricAnimation(
    1 / animationSpeed,
    vectorA.geometricProduct(vectorB),
    result
  );

  if (!initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        🔮 Initializing Cliffy Geometric Algebra...
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f0f0f' }}>
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        zIndex: 1000,
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>
          🎯 Cliffy Geometric Visualization
        </h1>
        <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
          Interactive 3D geometric algebra operations
        </p>
      </div>

      <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
        <color attach="background" args={['#0a0a0a']} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4080ff" />
        
        {/* Grid and axes */}
        <Grid 
          args={[10, 10]} 
          position={[0, -0.01, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#333"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#555"
        />
        
        {/* Coordinate axes */}
        <VectorArrow 
          vector={cliffy?.e1() || vectorA} 
          color="#ff4444" 
          label="e₁" 
          scale={2}
        />
        <VectorArrow 
          vector={cliffy?.e2() || vectorA} 
          color="#44ff44" 
          label="e₂" 
          scale={2}
        />
        <VectorArrow 
          vector={cliffy?.e3() || vectorA} 
          color="#4444ff" 
          label="e₃" 
          scale={2}
        />

        {/* Main geometric operation visualization */}
        <GeometricProduct
          a={vectorA}
          b={vectorB}
          result={animatedResult}
          showSteps={showSteps}
        />

        {/* Show bivector components if present */}
        <BivectorPlane bivector={animatedResult} color="#ffd700" opacity={0.2} />

        {/* Interactive controls */}
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true}
          minDistance={2}
          maxDistance={20}
        />
      </Canvas>

      {/* Information panel */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '350px',
        zIndex: 1000
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
          Current Operation: {operationType.replace('_', ' ').toUpperCase()}
        </h3>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>A:</strong> {formatMultivector(vectorA)}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>B:</strong> {formatMultivector(vectorB)}
        </div>
        <div style={{ marginBottom: '8px' }}>
          <strong>Result:</strong> {formatMultivector(animatedResult)}
        </div>
        
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          background: '#f0f0f0', 
          borderRadius: '4px',
          fontSize: '10px'
        }}>
          <div><strong>Magnitude:</strong> {animatedResult.magnitude().toFixed(3)}</div>
          <div><strong>Grades:</strong> {getGrades(animatedResult).join(', ')}</div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '10px', color: '#666' }}>
          Use the control panel (top-right) to modify vectors and operations.
          Drag to rotate the view, scroll to zoom.
        </div>
      </div>
    </div>
  );
};

// Helper function to identify which grades are present
const getGrades = (mv: Multivector): number[] => {
  const coeffs = mv.coefficients;
  const grades = [];
  
  // Grade 0 (scalar)
  if (Math.abs(coeffs[0] || 0) > 0.001) grades.push(0);
  
  // Grade 1 (vector)
  if (Math.abs(coeffs[1] || 0) > 0.001 || 
      Math.abs(coeffs[2] || 0) > 0.001 || 
      Math.abs(coeffs[4] || 0) > 0.001) grades.push(1);
  
  // Grade 2 (bivector)
  if (Math.abs(coeffs[3] || 0) > 0.001 || 
      Math.abs(coeffs[5] || 0) > 0.001 || 
      Math.abs(coeffs[6] || 0) > 0.001) grades.push(2);
  
  // Grade 3 (trivector)
  if (Math.abs(coeffs[7] || 0) > 0.001) grades.push(3);
  
  return grades;
};

export default App;