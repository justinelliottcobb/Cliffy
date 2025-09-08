/**
 * Form Validation Example - Advanced Cliffy Patterns
 * Demonstrates complex state management and form validation
 */

import { Cliffy, mountApp, jsx } from '../../../cliffy-typescript/src/index';
import { FormApp } from './FormApp';

const cliffy = new Cliffy('Cl(3,0)');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  
  if (!container) {
    throw new Error('Could not find #app element');
  }

  const rootElement = jsx(FormApp, {});

  try {
    mountApp(rootElement, container, cliffy);
    console.log('✅ Form validation app mounted successfully!');
    (window as any).cliffy = cliffy;
  } catch (error) {
    console.error('❌ Failed to mount form app:', error);
    container.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center;">
        <h2>Form Validation App Failed to Load</h2>
        <p>Error: ${error}</p>
      </div>
    `;
  }
});