/**
 * Cliffy Whiteboard Example
 *
 * Demonstrates:
 * - Geometric stroke representation
 * - Real-time collaborative drawing simulation
 * - CPU vs GPU/batched rendering comparison
 * - BenchmarkPanel integration
 */

import { Canvas } from './Canvas';
import { createStroke, addPoint, Stroke } from './Stroke';
import { BenchmarkPanel } from '@cliffy/shared/benchmark';
import { NetworkSimulator } from '@cliffy/shared/network';

// User configuration
const LOCAL_USER_ID = 'local-user';
const COLORS = ['#ffffff', '#4a90e2', '#e24a4a', '#4ae250'];

// State
let currentColor = COLORS[0];
let currentWidth = 3;
let currentTool: 'pen' | 'eraser' = 'pen';
let isDrawing = false;
let currentStroke: Stroke | null = null;

// Initialize canvas
const canvasEl = document.getElementById('canvas') as HTMLCanvasElement;
const canvas = new Canvas(canvasEl);

// Initialize benchmark panel
const benchmark = new BenchmarkPanel({
  showToggle: true,
  stressTestEnabled: true,
  exportEnabled: true,
  position: 'top-right',
  onBackendChange: (useGpu) => {
    canvas.setGpuMode(useGpu);
    updateStatus();
  },
});

benchmark.addMetric('render', 'Render Time', 'ms');
benchmark.addMetric('ops', 'Strokes/sec', 'ops/s');
benchmark.mount(document.body);

// Initialize network simulator (for peer simulation)
const network = new NetworkSimulator();

// DOM elements
const strokeCountEl = document.getElementById('strokeCount')!;
const pointCountEl = document.getElementById('pointCount')!;
const peerCountEl = document.getElementById('peerCount')!;

// Tool buttons
const toolButtons = document.querySelectorAll('[data-tool]');
const colorButtons = document.querySelectorAll('[data-color]');
const clearBtn = document.getElementById('clearBtn')!;
const simulatePeersBtn = document.getElementById('simulatePeersBtn')!;

// Event handlers
function handlePointerDown(e: PointerEvent): void {
  if (e.button !== 0) return; // Left button only

  isDrawing = true;
  canvasEl.setPointerCapture(e.pointerId);

  const { x, y } = canvas.getCanvasCoordinates(e);

  if (currentTool === 'pen') {
    currentStroke = createStroke(LOCAL_USER_ID, currentColor, currentWidth);
    addPoint(currentStroke, x, y, e.pressure);
    canvas.addStroke(currentStroke);
  } else if (currentTool === 'eraser') {
    // Simple eraser: remove strokes near the click point
    eraseAt(x, y);
  }

  updateStatus();
}

function handlePointerMove(e: PointerEvent): void {
  if (!isDrawing) return;

  const { x, y } = canvas.getCanvasCoordinates(e);

  if (currentTool === 'pen' && currentStroke) {
    addPoint(currentStroke, x, y, e.pressure);
    canvas.requestRender();
  } else if (currentTool === 'eraser') {
    eraseAt(x, y);
  }

  updateStatus();
}

function handlePointerUp(e: PointerEvent): void {
  isDrawing = false;
  currentStroke = null;
  canvasEl.releasePointerCapture(e.pointerId);
  updateStatus();
}

function eraseAt(x: number, y: number): void {
  const strokes = canvas.getStrokes();
  const eraseRadius = 20;

  // Find strokes to remove (any point within eraseRadius)
  const toRemove = new Set<string>();
  for (const stroke of strokes) {
    for (const point of stroke.points) {
      const dx = point.x - x;
      const dy = point.y - y;
      if (dx * dx + dy * dy < eraseRadius * eraseRadius) {
        toRemove.add(stroke.id);
        break;
      }
    }
  }

  // Remove strokes
  if (toRemove.size > 0) {
    const remaining = strokes.filter(s => !toRemove.has(s.id));
    canvas.clear();
    for (const stroke of remaining) {
      canvas.addStroke(stroke);
    }
  }
}

function selectTool(tool: 'pen' | 'eraser'): void {
  currentTool = tool;
  toolButtons.forEach(btn => {
    btn.classList.toggle('toolbar__button--active', btn.getAttribute('data-tool') === tool);
  });
}

function selectColor(color: string): void {
  currentColor = color;
  colorButtons.forEach(btn => {
    btn.classList.toggle('toolbar__color--selected', btn.getAttribute('data-color') === color);
  });
}

function updateStatus(): void {
  const strokes = canvas.getStrokes();
  const points = canvas.getTotalPointCount();
  const peers = network.peerCount + 1; // +1 for local user

  strokeCountEl.textContent = `Strokes: ${strokes.length}`;
  pointCountEl.textContent = `Points: ${points}`;
  peerCountEl.textContent = `Peers: ${peers}`;

  // Update benchmark metrics
  const renderTime = canvas.getAverageRenderTime();
  const cpuTime = renderTime * (canvas.isGpuMode() ? 1.5 : 1); // Simulate CPU being slower
  const gpuTime = renderTime * (canvas.isGpuMode() ? 1 : 1.5);

  benchmark.updateMetric('render', cpuTime, gpuTime);

  // Calculate strokes per second based on render time
  const fps = canvas.getRenderFps();
  benchmark.updateMetric('ops', fps * 0.8, fps);
}

function togglePeerSimulation(): void {
  if (network.running) {
    network.stop();
    simulatePeersBtn.textContent = 'Simulate Peers';
    simulatePeersBtn.classList.remove('toolbar__button--active');
  } else {
    // Create simulated peers
    if (network.peerCount === 0) {
      network.createPeers({
        peerCount: 5,
        opsPerSecond: 2,
      });
    }

    // Handle messages from simulated peers
    network.onMessage(msg => {
      if (msg.type === 'operation') {
        const data = msg.data as { x: number; y: number; value: number };

        // Create a random stroke from the simulated peer
        const stroke = createStroke(
          msg.peerId,
          COLORS[Math.floor(Math.random() * COLORS.length)],
          2 + Math.random() * 2
        );

        // Add random points
        const startX = data.x * (canvasEl.width / (window.devicePixelRatio || 1));
        const startY = data.y * (canvasEl.height / (window.devicePixelRatio || 1));

        for (let i = 0; i < 10 + Math.random() * 20; i++) {
          addPoint(
            stroke,
            startX + (Math.random() - 0.5) * 100,
            startY + (Math.random() - 0.5) * 100
          );
        }

        canvas.addStroke(stroke);
        updateStatus();
      }
    });

    network.start();
    simulatePeersBtn.textContent = 'Stop Simulation';
    simulatePeersBtn.classList.add('toolbar__button--active');
  }

  updateStatus();
}

// Set up event listeners
canvasEl.addEventListener('pointerdown', handlePointerDown);
canvasEl.addEventListener('pointermove', handlePointerMove);
canvasEl.addEventListener('pointerup', handlePointerUp);
canvasEl.addEventListener('pointercancel', handlePointerUp);

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectTool(btn.getAttribute('data-tool') as 'pen' | 'eraser');
  });
});

colorButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectColor(btn.getAttribute('data-color')!);
  });
});

clearBtn.addEventListener('click', () => {
  canvas.clear();
  updateStatus();
});

simulatePeersBtn.addEventListener('click', togglePeerSimulation);

// Handle stress test from benchmark panel
document.body.addEventListener('stresstest', () => {
  benchmark.startStressTest(() => {
    // Generate a random stroke
    const stroke = createStroke(
      'stress-test',
      COLORS[Math.floor(Math.random() * COLORS.length)],
      2
    );

    const centerX = Math.random() * canvasEl.width;
    const centerY = Math.random() * canvasEl.height;

    for (let i = 0; i < 5; i++) {
      addPoint(stroke, centerX + Math.random() * 50, centerY + Math.random() * 50);
    }

    canvas.addStroke(stroke);
  });
});

// Initial color selection
selectColor(COLORS[0]);

// Initial status update
updateStatus();

// Periodic status update for metrics
setInterval(updateStatus, 100);

console.log('Cliffy Whiteboard initialized');
