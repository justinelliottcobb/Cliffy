/**
 * Geometric Animations Example - Showcasing Clifford Algebra Transformations
 * 
 * This example demonstrates the power of geometric algebra for UI animations:
 * - Rotations using rotors (bivectors)
 * - Translations using translators 
 * - Scaling using scalar multivectors
 * - Complex transformations combining multiple operations
 */

import {
  jsx,
  When, For,
  createGeometricBehavior,
  GeometricBehavior,
  AlgebraicElement,
  Cliffy
} from '../../../cliffy-typescript/src/index';

const cliffy = new Cliffy('Cl(3,0)');

// Animation utilities
function createState<T>(initialValue: T) {
  let currentValue = initialValue;
  const subscribers: ((value: T) => void)[] = [];

  return {
    sample(): T { return currentValue; },
    
    map<U>(fn: (value: T) => U) {
      const mappedBehavior = createState(fn(currentValue));
      const updateMapped = (newValue: T) => {
        mappedBehavior.setValue(fn(newValue));
      };
      subscribers.push(updateMapped);
      return mappedBehavior;
    },
    
    flatMap<U>(fn: (value: T) => GeometricBehavior<U>) {
      return fn(currentValue);
    },
    
    combine<U, V>(other: GeometricBehavior<U>, fn: (a: T, b: U) => V) {
      const combinedBehavior = createState(fn(currentValue, other.sample()));
      const updateCombined = (newValue: T) => {
        combinedBehavior.setValue(fn(newValue, other.sample()));
      };
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

// ANIMATION STATE
const timeState = createState<number>(0);
const isAnimating = createState<boolean>(true);
const selectedAnimation = createState<string>('rotation');

// Animation time loop
const startAnimationLoop = () => {
  const animate = () => {
    if (isAnimating.sample()) {
      timeState.setValue(Date.now() * 0.001); // Time in seconds
    }
    requestAnimationFrame(animate);
  };
  animate();
};

// Start the animation loop
startAnimationLoop();

// GEOMETRIC TRANSFORMATION GENERATORS

/**
 * Pure rotation using geometric rotors
 * In Cl(3,0), a rotor R = cos(θ/2) + sin(θ/2)(e1∧e2) represents rotation in the e1-e2 plane
 */
const createRotation = (time: number, speed: number = 1) => {
  const angle = time * speed;
  // Rotor in e12 plane (XY rotation)
  return cliffy.rotor(angle, 1, 0); // Rotate around Z axis
};

/**
 * Translation using geometric translators
 * In conformal geometric algebra, translations are represented as motors
 */
const createTranslation = (time: number, amplitude: number = 50) => {
  const x = Math.cos(time) * amplitude;
  const y = Math.sin(time * 0.7) * amplitude;
  return cliffy.translator(x, y, 0);
};

/**
 * Scaling transformation using scalar multivectors
 */
const createScaling = (time: number, baseScale: number = 1, amplitude: number = 0.3) => {
  const scale = baseScale + Math.sin(time * 2) * amplitude;
  return cliffy.scalar(scale);
};

/**
 * Complex spiral motion combining rotation and translation
 */
const createSpiral = (time: number) => {
  const radius = 30 + Math.sin(time * 0.5) * 20;
  const angle = time * 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  
  // Combine translation with rotation
  const translation = cliffy.translator(x, y, 0);
  const rotation = cliffy.rotor(time * 3, 0, 1); // Rotate around Y axis
  
  return translation.add(rotation); // Compose transformations
};

/**
 * Figure-8 motion using Lissajous curves
 */
const createFigureEight = (time: number) => {
  const a = 2; // Frequency ratio
  const amplitude = 40;
  
  const x = Math.sin(time) * amplitude;
  const y = Math.sin(time * a) * amplitude;
  
  return cliffy.translator(x, y, 0);
};

// ANIMATION COMPONENTS

const AnimatedBox = (props: {
  transform: GeometricBehavior<any>;
  color: string;
  size?: number;
  label: string;
}): AlgebraicElement => {
  const { transform, color, size = 40, label } = props;
  
  return jsx('div', {
    style: {
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      // Apply the geometric transformation
      transform: transform,
      transition: 'all 0.1s ease-out',
      cursor: 'pointer'
    },
    children: label
  });
};

const ParticleSystem = (props: { count: number }): AlgebraicElement => {
  const { count } = props;
  const particles = Array.from({ length: count }, (_, i) => i);
  
  return jsx('div', {
    children: For({
      each: createState(particles),
      key: (particle: number) => particle.toString(),
      children: (particleIndex: GeometricBehavior<number>) => {
        const index = particleIndex.sample();
        
        // Each particle has its own phase offset
        const phaseOffset = (index / count) * Math.PI * 2;
        
        // Create unique motion for each particle
        const particleTransform = timeState.map(time => {
          const t = time + phaseOffset;
          const radius = 60 + index * 3;
          const speed = 0.5 + index * 0.1;
          
          const x = Math.cos(t * speed) * radius;
          const y = Math.sin(t * speed * 1.3) * radius;
          const rotation = t * (speed + 0.5);
          
          // Combine translation and rotation
          const translation = cliffy.translator(x, y, 0);
          const rotor = cliffy.rotor(rotation, 0, 0); // Spin around Z
          
          return translation.add(rotor);
        });
        
        const particleColor = `hsl(${(index * 30) % 360}, 70%, 60%)`;
        
        return AnimatedBox({
          transform: particleTransform,
          color: particleColor,
          size: 12,
          label: ''
        });
      }
    })
  });
};

const AnimationControls = (): AlgebraicElement => {
  const animations = [
    { key: 'rotation', label: '🔄 Rotation' },
    { key: 'translation', label: '↔️ Translation' },
    { key: 'scaling', label: '📏 Scaling' },
    { key: 'spiral', label: '🌀 Spiral' },
    { key: 'figure8', label: '∞ Figure-8' },
    { key: 'particles', label: '✨ Particles' }
  ];
  
  return jsx('div', {
    style: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      backgroundColor: 'rgba(255,255,255,0.9)',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    children: [
      jsx('h3', {
        style: { margin: '0 0 15px 0', color: '#333' },
        children: 'Geometric Transformations'
      }),
      
      jsx('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px'
        },
        children: For({
          each: createState(animations),
          key: (anim) => anim.key,
          children: (animBehavior: GeometricBehavior<typeof animations[0]>) => {
            const anim = animBehavior.sample();
            const isSelected = selectedAnimation.map(selected => selected === anim.key);
            
            return jsx('button', {
              onClick: () => selectedAnimation.setValue(anim.key),
              style: {
                padding: '10px 15px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                backgroundColor: isSelected.map(selected => 
                  selected ? '#4CAF50' : '#e0e0e0'
                ),
                color: isSelected.map(selected => 
                  selected ? 'white' : '#333'
                ),
                transition: 'all 0.2s ease'
              },
              children: anim.label
            });
          }
        })
      }),
      
      jsx('button', {
        onClick: () => isAnimating.setValue(prev => !prev),
        style: {
          width: '100%',
          padding: '12px',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: isAnimating.map(animating => 
            animating ? '#f44336' : '#4CAF50'
          ),
          color: 'white'
        },
        children: isAnimating.map(animating => 
          animating ? '⏸️ Pause' : '▶️ Play'
        )
      })
    ]
  });
};

const MathExplanation = (): AlgebraicElement => {
  const currentAnim = selectedAnimation.sample();
  
  const explanations: Record<string, { title: string; math: string; description: string }> = {
    rotation: {
      title: 'Geometric Rotor',
      math: 'R = cos(θ/2) + sin(θ/2)(e₁∧e₂)',
      description: 'Uses bivectors to represent rotations in geometric algebra. The rotor R rotates vectors in the e₁-e₂ plane by angle θ.'
    },
    translation: {
      title: 'Conformal Translator',
      math: 'T = 1 + ½(ae∞)',
      description: 'In conformal geometric algebra, translations are represented as motors that move objects through space.'
    },
    scaling: {
      title: 'Scalar Transform',
      math: 'S = α (scalar multivector)',
      description: 'Pure scaling using scalar multivectors that uniformly scale all components of geometric objects.'
    },
    spiral: {
      title: 'Composite Transform',
      math: 'M = T ∘ R (motor composition)',
      description: 'Combines translation and rotation motors to create complex spiral motions through geometric composition.'
    },
    figure8: {
      title: 'Lissajous Motion',
      math: 'x = sin(t), y = sin(2t)',
      description: 'Parametric equations create figure-8 patterns, translated through conformal geometric algebra.'
    },
    particles: {
      title: 'Multi-body System',
      math: 'Mᵢ = Tᵢ ∘ Rᵢ (per particle)',
      description: 'Each particle follows its own geometric transformation with phase offsets and unique parameters.'
    }
  };
  
  const explanation = explanations[currentAnim] || explanations.rotation;
  
  return jsx('div', {
    style: {
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      right: '20px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      fontSize: '14px'
    },
    children: [
      jsx('h4', {
        style: { margin: '0 0 10px 0', color: '#4CAF50' },
        children: explanation.title
      }),
      jsx('code', {
        style: {
          display: 'block',
          backgroundColor: 'rgba(255,255,255,0.1)',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px',
          fontFamily: 'Monaco, monospace'
        },
        children: explanation.math
      }),
      jsx('p', {
        style: { margin: '0', lineHeight: '1.5' },
        children: explanation.description
      })
    ]
  });
};

export const AnimationsApp = (): AlgebraicElement => {
  // Main animation transform based on selected type
  const mainTransform = timeState.combine(selectedAnimation, (time, animType) => {
    switch (animType) {
      case 'rotation':
        return createRotation(time);
      case 'translation':
        return createTranslation(time);
      case 'scaling':
        return createScaling(time, 1, 0.5);
      case 'spiral':
        return createSpiral(time);
      case 'figure8':
        return createFigureEight(time);
      default:
        return createRotation(time);
    }
  });
  
  return jsx('div', {
    style: {
      width: '100vw',
      height: '100vh',
      position: 'relative',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      overflow: 'hidden'
    },
    children: [
      // Animation controls
      AnimationControls(),
      
      // Main animation area
      jsx('div', {
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '400px',
          height: '400px',
          marginLeft: '-200px',
          marginTop: '-200px',
          border: '2px dashed rgba(255,255,255,0.3)',
          borderRadius: '50%'
        },
        children: [
          // Show particles or single animated box
          When({
            condition: selectedAnimation.map(anim => anim === 'particles'),
            children: ParticleSystem({ count: 8 })
          }),
          
          When({
            condition: selectedAnimation.map(anim => anim !== 'particles'),
            children: jsx('div', {
              style: {
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginLeft: '-30px',
                marginTop: '-30px'
              },
              children: AnimatedBox({
                transform: mainTransform,
                color: '#4CAF50',
                size: 60,
                label: 'GA'
              })
            })
          })
        ]
      }),
      
      // Mathematical explanation
      MathExplanation(),
      
      // Title
      jsx('div', {
        style: {
          position: 'absolute',
          top: '20px',
          right: '20px',
          color: 'white',
          textAlign: 'right'
        },
        children: [
          jsx('h1', {
            style: { margin: '0', fontSize: '24px' },
            children: 'Geometric Algebra Animations'
          }),
          jsx('p', {
            style: { margin: '5px 0 0 0', opacity: 0.8 },
            children: 'Clifford Algebra in Motion'
          })
        ]
      })
    ]
  });
};

export default AnimationsApp;