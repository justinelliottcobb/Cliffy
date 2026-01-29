/**
 * Canvas - Main drawing canvas with GPU-accelerated rendering
 *
 * Handles stroke rendering, user input, and batch operations.
 * Demonstrates CPU vs GPU performance comparison.
 */

import { Stroke, Point, smoothStroke } from './Stroke';

export interface CanvasConfig {
  /** Background color */
  backgroundColor?: string;
  /** Whether to enable smoothing */
  smoothing?: boolean;
  /** Batch size threshold for GPU rendering */
  gpuThreshold?: number;
}

/**
 * High-performance drawing canvas
 */
export class Canvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: Required<CanvasConfig>;
  private strokes: Stroke[] = [];
  private pendingRender = false;
  private useGpu = true;

  // Performance tracking
  private lastRenderTime = 0;
  private renderTimes: number[] = [];
  private maxRenderSamples = 60;

  constructor(canvas: HTMLCanvasElement, config: CanvasConfig = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;

    this.config = {
      backgroundColor: '#1a1a2e',
      smoothing: true,
      gpuThreshold: 256,
      ...config,
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Resize canvas to fill container
   */
  resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      this.ctx.scale(dpr, dpr);
      this.requestRender();
    }
  }

  /**
   * Set GPU rendering mode
   */
  setGpuMode(enabled: boolean): void {
    this.useGpu = enabled;
    this.requestRender();
  }

  /**
   * Check if GPU mode is enabled
   */
  isGpuMode(): boolean {
    return this.useGpu;
  }

  /**
   * Add a stroke to the canvas
   */
  addStroke(stroke: Stroke): void {
    this.strokes.push(stroke);
    this.requestRender();
  }

  /**
   * Get all strokes
   */
  getStrokes(): Stroke[] {
    return this.strokes;
  }

  /**
   * Clear all strokes
   */
  clear(): void {
    this.strokes = [];
    this.requestRender();
  }

  /**
   * Remove strokes by user ID
   */
  removeStrokesByUser(userId: string): void {
    this.strokes = this.strokes.filter(s => s.userId !== userId);
    this.requestRender();
  }

  /**
   * Get total point count across all strokes
   */
  getTotalPointCount(): number {
    return this.strokes.reduce((sum, s) => sum + s.points.length, 0);
  }

  /**
   * Get average render time in ms
   */
  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }

  /**
   * Get render FPS
   */
  getRenderFps(): number {
    const avgTime = this.getAverageRenderTime();
    return avgTime > 0 ? 1000 / avgTime : 60;
  }

  /**
   * Request a render on next animation frame
   */
  requestRender(): void {
    if (this.pendingRender) return;
    this.pendingRender = true;
    requestAnimationFrame(() => this.render());
  }

  /**
   * Render all strokes
   */
  private render(): void {
    this.pendingRender = false;
    const startTime = performance.now();

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Determine rendering strategy based on point count
    const totalPoints = this.getTotalPointCount();
    const useBatchRendering = this.useGpu && totalPoints > this.config.gpuThreshold;

    if (useBatchRendering) {
      this.renderBatched();
    } else {
      this.renderImmediate();
    }

    // Track render time
    const renderTime = performance.now() - startTime;
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > this.maxRenderSamples) {
      this.renderTimes.shift();
    }
    this.lastRenderTime = renderTime;
  }

  /**
   * Immediate mode rendering (CPU)
   */
  private renderImmediate(): void {
    for (const stroke of this.strokes) {
      this.renderStroke(stroke);
    }
  }

  /**
   * Batched rendering (simulates GPU batch optimization)
   * In a real implementation, this would use WebGPU compute shaders
   */
  private renderBatched(): void {
    // Group strokes by color for batch rendering
    const byColor = new Map<string, Stroke[]>();
    for (const stroke of this.strokes) {
      const existing = byColor.get(stroke.color) ?? [];
      existing.push(stroke);
      byColor.set(stroke.color, existing);
    }

    // Render each batch
    for (const [color, strokes] of byColor) {
      this.ctx.strokeStyle = color;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      for (const stroke of strokes) {
        const points = this.config.smoothing && stroke.points.length > 2
          ? smoothStroke(stroke)
          : stroke.points;

        if (points.length < 2) continue;

        this.ctx.lineWidth = stroke.width;
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
          this.ctx.lineTo(points[i].x, points[i].y);
        }
      }
      this.ctx.stroke();
    }
  }

  /**
   * Render a single stroke
   */
  private renderStroke(stroke: Stroke): void {
    const points = this.config.smoothing && stroke.points.length > 2
      ? smoothStroke(stroke)
      : stroke.points;

    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      // Variable width based on pressure
      const p = points[i];
      this.ctx.lineTo(p.x, p.y);
    }

    this.ctx.stroke();
  }

  /**
   * Get canvas coordinates from a pointer event
   */
  getCanvasCoordinates(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /**
   * Run a benchmark comparing CPU vs batched rendering
   */
  runBenchmark(iterations = 100): { cpuTime: number; batchedTime: number } {
    const originalGpu = this.useGpu;
    const originalStrokes = [...this.strokes];

    // CPU benchmark
    this.useGpu = false;
    const cpuStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.render();
    }
    const cpuTime = (performance.now() - cpuStart) / iterations;

    // Batched benchmark
    this.useGpu = true;
    const batchedStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.render();
    }
    const batchedTime = (performance.now() - batchedStart) / iterations;

    // Restore state
    this.useGpu = originalGpu;
    this.strokes = originalStrokes;
    this.requestRender();

    return { cpuTime, batchedTime };
  }
}
