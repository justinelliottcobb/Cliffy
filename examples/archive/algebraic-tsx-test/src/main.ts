/**
 * Algebraic TSX Test - Main Entry Point
 * Tests the vite-plugin-algebraic-tsx transformation
 */

import { Cliffy, mountApp, jsx } from '../../../cliffy-typescript/src/index';
import { AlgebraicTSXDemo } from './AlgebraicTSXDemo';

const cliffy = new Cliffy('Cl(3,0)');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  
  if (!container) {
    throw new Error('Could not find #app element');
  }

  // This jsx call will remain as-is (not TSX)
  const rootElement = jsx(AlgebraicTSXDemo, {});

  try {
    mountApp(rootElement, container, cliffy);
    console.log('✅ Algebraic TSX test app mounted successfully!');
    console.log('🔄 Check the transformed source in DevTools to see jsx() calls');
    
    (window as any).cliffy = cliffy;
    (window as any).demo = rootElement;
    
  } catch (error) {
    console.error('❌ Failed to mount Algebraic TSX test:', error);
    container.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center;">
        <h2>Algebraic TSX Test Failed to Load</h2>
        <p>Error: ${error}</p>
        <p>This is expected while the framework is under development.</p>
        <hr />
        <p><strong>Note:</strong> This example demonstrates the intended Algebraic TSX syntax.</p>
        <p>The vite-plugin-algebraic-tsx should transform the TSX into jsx() calls.</p>
      </div>
    `;
  }
});