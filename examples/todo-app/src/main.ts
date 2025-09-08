/**
 * Main entry point for Cliffy TodoApp Example
 * Demonstrates mounting an algebraic TSX application
 */

import { Cliffy, mountApp, jsx } from '../../../cliffy-typescript/src/index';
import { TodoApp } from './TodoApp';

// Initialize Cliffy framework
const cliffy = new Cliffy('Cl(3,0)');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  
  if (!container) {
    throw new Error('Could not find app container element');
  }

  // Create the root element
  const rootElement = jsx(TodoApp, {});

  // Mount the application
  console.log('Mounting Cliffy TodoApp...');
  console.log('Root element:', rootElement);
  
  try {
    mountApp(rootElement, container, cliffy);
    console.log('TodoApp mounted successfully!');
    
    // Add some development info
    (window as any).cliffy = cliffy;
    (window as any).todoApp = rootElement;
    
    console.log('Development tools available:');
    console.log('- window.cliffy: Cliffy instance');
    console.log('- window.todoApp: Root algebraic element');
    
  } catch (error) {
    console.error('Failed to mount TodoApp:', error);
    container.innerHTML = `
      <div style="color: red; padding: 20px;">
        <h2>Failed to mount TodoApp</h2>
        <p>Error: ${error}</p>
        <p>Check the console for more details.</p>
      </div>
    `;
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  console.log('Unmounting TodoApp...');
  // The unmountApp function will be called automatically by the runtime
});