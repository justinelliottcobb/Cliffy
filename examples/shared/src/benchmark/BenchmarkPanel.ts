/**
 * BenchmarkPanel - Main benchmark UI component
 *
 * Displays CPU vs GPU performance metrics with:
 * - Real-time metric cards
 * - Backend toggle (CPU/GPU)
 * - Stress test mode
 * - Export functionality
 */

import { MetricCard, MetricCardProps } from './MetricCard';
import { MetricsCollector } from './metrics';
import { StressTest, StressTestConfig, StressTestResults } from './StressTest';

export interface BenchmarkPanelConfig {
  /** Show CPU/GPU toggle button */
  showToggle?: boolean;
  /** Enable stress test button */
  stressTestEnabled?: boolean;
  /** Enable export button */
  exportEnabled?: boolean;
  /** Panel position */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'floating';
  /** Initial backend selection */
  initialBackend?: 'cpu' | 'gpu';
  /** Callback when backend changes */
  onBackendChange?: (useGpu: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

interface Metric {
  id: string;
  label: string;
  unit: string;
  card: MetricCard;
}

/**
 * Complete benchmark UI panel with metrics, controls, and visualization
 */
export class BenchmarkPanel {
  private element: HTMLElement;
  private config: Required<BenchmarkPanelConfig>;
  private metrics: Map<string, Metric> = new Map();
  private collector: MetricsCollector;
  private useGpu: boolean;
  private stressTest: StressTest | null = null;
  private isStressTesting = false;

  // UI elements
  private metricsContainer: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private stressButton: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;

  constructor(config: BenchmarkPanelConfig = {}) {
    this.config = {
      showToggle: true,
      stressTestEnabled: true,
      exportEnabled: true,
      position: 'top-right',
      initialBackend: 'gpu',
      onBackendChange: () => {},
      className: '',
      ...config,
    };

    this.useGpu = this.config.initialBackend === 'gpu';
    this.collector = new MetricsCollector();
    this.element = this.createElement();
  }

  /**
   * Add a metric to display
   */
  addMetric(id: string, label: string, unit: string): void {
    const card = new MetricCard({
      label,
      cpuValue: 0,
      gpuValue: 0,
      unit,
    });

    this.metrics.set(id, { id, label, unit, card });

    if (this.metricsContainer) {
      card.mount(this.metricsContainer);
    }
  }

  /**
   * Update a metric's values
   */
  updateMetric(id: string, cpuValue: number, gpuValue: number): void {
    const metric = this.metrics.get(id);
    if (metric) {
      metric.card.update(cpuValue, gpuValue);
    }
  }

  /**
   * Record an operation timing
   */
  recordOperation(name: string, durationMs: number): void {
    this.collector.recordOperation(name, durationMs);
  }

  /**
   * Get the metrics collector for direct access
   */
  getCollector(): MetricsCollector {
    return this.collector;
  }

  /**
   * Check if GPU is currently selected
   */
  isGpuEnabled(): boolean {
    return this.useGpu;
  }

  /**
   * Toggle between CPU and GPU backends
   */
  toggleBackend(): void {
    this.useGpu = !this.useGpu;
    this.updateToggleButton();
    this.config.onBackendChange(this.useGpu);
  }

  /**
   * Set the backend explicitly
   */
  setBackend(useGpu: boolean): void {
    if (this.useGpu !== useGpu) {
      this.useGpu = useGpu;
      this.updateToggleButton();
      this.config.onBackendChange(this.useGpu);
    }
  }

  /**
   * Start a stress test
   */
  startStressTest(operation: () => void): void {
    if (this.isStressTesting) return;

    this.isStressTesting = true;
    this.updateStressButton();
    this.setStatus('Running stress test...');

    this.stressTest = new StressTest({
      startOps: 100,
      maxOps: 50000,
      rampFactor: 1.5,
      stepDuration: 2000,
      targetFrameTime: 16.67,
      operation,
      onProgress: (current, max, fps) => {
        this.setStatus(`Stress: ${current} ops/s @ ${fps.toFixed(0)} FPS`);
      },
      onComplete: (results) => {
        this.isStressTesting = false;
        this.updateStressButton();
        this.setStatus(
          `Max sustainable: ${results.maxSustainableOps.toFixed(0)} ops/s`
        );
        this.stressTest = null;
      },
    });

    this.stressTest.start();
  }

  /**
   * Stop the current stress test
   */
  stopStressTest(): void {
    if (this.stressTest) {
      this.stressTest.stop();
      this.stressTest = null;
    }
    this.isStressTesting = false;
    this.updateStressButton();
    this.setStatus('Stress test stopped');
  }

  /**
   * Export benchmark results
   */
  exportResults(): void {
    this.collector.downloadReport();
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Mount to a parent element
   */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.element);
  }

  /**
   * Remove from DOM
   */
  unmount(): void {
    this.element.remove();
  }

  private createElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = `benchmark-panel benchmark-panel--${this.config.position} ${this.config.className}`.trim();

    // Header
    const header = document.createElement('div');
    header.className = 'benchmark-panel__header';

    const title = document.createElement('span');
    title.className = 'benchmark-panel__title';
    title.textContent = 'Performance';
    header.appendChild(title);

    panel.appendChild(header);

    // Metrics container
    this.metricsContainer = document.createElement('div');
    this.metricsContainer.className = 'benchmark-panel__metrics';
    panel.appendChild(this.metricsContainer);

    // Mount existing metrics
    for (const metric of this.metrics.values()) {
      metric.card.mount(this.metricsContainer);
    }

    // Status line
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'benchmark-panel__status';
    panel.appendChild(this.statusEl);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'benchmark-panel__controls';

    // Toggle button
    if (this.config.showToggle) {
      this.toggleButton = document.createElement('button');
      this.toggleButton.className = 'benchmark-panel__button benchmark-panel__button--toggle';
      this.toggleButton.addEventListener('click', () => this.toggleBackend());
      this.updateToggleButton();
      controls.appendChild(this.toggleButton);
    }

    // Stress test button
    if (this.config.stressTestEnabled) {
      this.stressButton = document.createElement('button');
      this.stressButton.className = 'benchmark-panel__button benchmark-panel__button--stress';
      this.stressButton.textContent = 'Stress Test';
      // Note: caller must provide operation via startStressTest()
      this.stressButton.addEventListener('click', () => {
        if (this.isStressTesting) {
          this.stopStressTest();
        } else {
          // Emit event for caller to start stress test with their operation
          this.element.dispatchEvent(
            new CustomEvent('stresstest', { bubbles: true })
          );
        }
      });
      controls.appendChild(this.stressButton);
    }

    // Export button
    if (this.config.exportEnabled) {
      const exportButton = document.createElement('button');
      exportButton.className = 'benchmark-panel__button benchmark-panel__button--export';
      exportButton.textContent = 'Export';
      exportButton.addEventListener('click', () => this.exportResults());
      controls.appendChild(exportButton);
    }

    panel.appendChild(controls);

    // Add default styles
    this.injectStyles();

    return panel;
  }

  private updateToggleButton(): void {
    if (this.toggleButton) {
      this.toggleButton.textContent = this.useGpu ? 'GPU' : 'CPU';
      this.toggleButton.classList.toggle('benchmark-panel__button--active', this.useGpu);
    }
  }

  private updateStressButton(): void {
    if (this.stressButton) {
      this.stressButton.textContent = this.isStressTesting ? 'Stop' : 'Stress Test';
      this.stressButton.classList.toggle('benchmark-panel__button--active', this.isStressTesting);
    }
  }

  private setStatus(message: string): void {
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
  }

  private injectStyles(): void {
    const styleId = 'benchmark-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = BENCHMARK_STYLES;
    document.head.appendChild(style);
  }
}

// Default styles (can be overridden via CSS)
const BENCHMARK_STYLES = `
.benchmark-panel {
  position: fixed;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  min-width: 200px;
  z-index: 10000;
  backdrop-filter: blur(8px);
}

.benchmark-panel--top-right { top: 16px; right: 16px; }
.benchmark-panel--bottom-right { bottom: 16px; right: 16px; }
.benchmark-panel--top-left { top: 16px; left: 16px; }
.benchmark-panel--bottom-left { bottom: 16px; left: 16px; }

.benchmark-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.benchmark-panel__title {
  font-weight: 600;
  font-size: 13px;
}

.benchmark-panel__metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.benchmark-panel__status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  min-height: 14px;
}

.benchmark-panel__controls {
  display: flex;
  gap: 6px;
}

.benchmark-panel__button {
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: transparent;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.benchmark-panel__button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.benchmark-panel__button--active {
  background: rgba(74, 144, 226, 0.3);
  border-color: rgba(74, 144, 226, 0.5);
}

.benchmark-panel__button--toggle {
  min-width: 40px;
}

/* MetricCard styles */
.metric-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 8px;
}

.metric-card__label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.metric-card__values {
  display: flex;
  gap: 12px;
}

.metric-card__value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.metric-card__badge {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.metric-card__value--cpu .metric-card__badge {
  background: rgba(255, 152, 0, 0.3);
}

.metric-card__value--gpu .metric-card__badge {
  background: rgba(76, 175, 80, 0.3);
}

.metric-card__number {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.metric-card__unit {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.metric-card__value--faster .metric-card__number {
  color: #4caf50;
}

.metric-card__speedup {
  margin-top: 4px;
  font-size: 10px;
  text-align: right;
}

.metric-card__speedup--positive {
  color: #4caf50;
}

.metric-card__speedup--negative {
  color: #ff9800;
}
`;
