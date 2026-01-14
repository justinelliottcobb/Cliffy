/**
 * Basic Counter Example - Getting Started with Cliffy
 * 
 * This is the simplest possible Cliffy application to understand:
 * 1. How to create geometric behaviors for state
 * 2. How to use algebraic JSX elements
 * 3. How to handle events with geometric transformations
 */

import { Cliffy, mountApp, jsx } from '../../../cliffy-typescript/src/index';
import { CounterApp } from './CounterApp';

// Initialize Cliffy with 3D geometric algebra Cl(3,0)
const cliffy = new Cliffy('Cl(3,0)');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  
  if (!container) {
    throw new Error('Could not find #app element');
  }

  // Create root element using jsx factory
  const rootElement = jsx(CounterApp, {});

  try {
    mountApp(rootElement, container, cliffy);
    console.log('✅ Counter app mounted successfully!');
    
    // Make Cliffy instance available for debugging
    (window as any).cliffy = cliffy;
    
  } catch (error) {
    console.error('❌ Failed to mount Counter app:', error);
    container.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center;">
        <h2>Counter App Failed to Load</h2>
        <p>Error: ${error}</p>
        <p>This is expected if the core framework is still being developed.</p>
      </div>
    `;
  }
});