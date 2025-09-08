/**
 * Geometric Animations Example - Clifford Algebra Transformations
 * Showcases the power of geometric algebra for UI animations
 */

import { Cliffy, mountApp, jsx } from '../../../cliffy-typescript/src/index';
import { AnimationsApp } from './AnimationsApp';

const cliffy = new Cliffy('Cl(3,0)');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  
  if (!container) {
    throw new Error('Could not find #app element');
  }

  const rootElement = jsx(AnimationsApp, {});

  try {
    mountApp(rootElement, container, cliffy);
    console.log('✅ Geometric animations app mounted successfully!');
    
    // Make available for debugging
    (window as any).cliffy = cliffy;
    (window as any).animationsApp = rootElement;
    
    console.log('🎨 Geometric Algebra Animations loaded!');
    console.log('Try different animation types to see various transformations.');
    
  } catch (error) {
    console.error('❌ Failed to mount animations app:', error);
    container.innerHTML = `
      <div style="color: white; padding: 40px; text-align: center; background: #1e3c72;">
        <h2>Geometric Animations Failed to Load</h2>
        <p>Error: ${error}</p>
        <p>This is expected while the core framework is under development.</p>
      </div>
    `;
  }
});