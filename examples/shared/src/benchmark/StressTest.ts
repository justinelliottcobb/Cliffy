/**
 * StressTest - Stress testing utility for benchmarks
 *
 * Gradually increases operation count to find performance limits.
 */

export interface StressTestConfig {
  /** Starting operations per second */
  startOps: number;
  /** Maximum operations per second to attempt */
  maxOps: number;
  /** Ramp-up factor per step (e.g., 1.5 = 50% increase) */
  rampFactor: number;
  /** Duration of each step in ms */
  stepDuration: number;
  /** Target frame time in ms (default: 16.67 for 60fps) */
  targetFrameTime: number;
  /** Callback for each operation */
  operation: () => void | Promise<void>;
  /** Callback when stress test completes */
  onComplete?: (results: StressTestResults) => void;
  /** Callback for progress updates */
  onProgress?: (current: number, max: number, fps: number) => void;
}

export interface StressTestResults {
  /** Maximum ops/sec achieved while maintaining target frame time */
  maxSustainableOps: number;
  /** Operations per second when frame drops occurred */
  frameDropThreshold: number;
  /** All measurements */
  measurements: StressTestMeasurement[];
}

export interface StressTestMeasurement {
  targetOps: number;
  actualOps: number;
  avgFrameTime: number;
  droppedFrames: number;
}

/**
 * Runs stress tests to find performance limits
 */
export class StressTest {
  private config: Required<StressTestConfig>;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private measurements: StressTestMeasurement[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private droppedFrames = 0;
  private operationCount = 0;
  private currentTargetOps = 0;
  private stepStartTime = 0;

  constructor(config: StressTestConfig) {
    this.config = {
      onComplete: () => {},
      onProgress: () => {},
      ...config,
    };
  }

  /**
   * Start the stress test
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.measurements = [];
    this.currentTargetOps = this.config.startOps;
    this.stepStartTime = performance.now();
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.operationCount = 0;
    this.lastFrameTime = performance.now();

    this.runFrame();
  }

  /**
   * Stop the stress test
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Check if currently running
   */
  get running(): boolean {
    return this.isRunning;
  }

  private runFrame = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const frameDelta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Check for frame drops
    if (frameDelta > this.config.targetFrameTime * 1.5) {
      this.droppedFrames++;
    }

    this.frameCount++;

    // Calculate how many operations to run this frame
    const opsPerFrame = this.currentTargetOps / 60;
    const opsThisFrame = Math.ceil(opsPerFrame);

    // Run operations
    for (let i = 0; i < opsThisFrame; i++) {
      this.config.operation();
      this.operationCount++;
    }

    // Check if step is complete
    const stepElapsed = now - this.stepStartTime;
    if (stepElapsed >= this.config.stepDuration) {
      this.completeStep();
    }

    // Report progress
    const fps = 1000 / frameDelta;
    this.config.onProgress(this.currentTargetOps, this.config.maxOps, fps);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.runFrame);
  };

  private completeStep(): void {
    const stepDuration = performance.now() - this.stepStartTime;
    const actualOps = (this.operationCount / stepDuration) * 1000;
    const avgFrameTime = stepDuration / this.frameCount;

    this.measurements.push({
      targetOps: this.currentTargetOps,
      actualOps,
      avgFrameTime,
      droppedFrames: this.droppedFrames,
    });

    // Check if we've reached limits
    const hasFrameDrops = this.droppedFrames > this.frameCount * 0.1; // >10% drops
    const reachedMax = this.currentTargetOps >= this.config.maxOps;

    if (hasFrameDrops || reachedMax) {
      this.complete();
      return;
    }

    // Ramp up for next step
    this.currentTargetOps = Math.min(
      this.currentTargetOps * this.config.rampFactor,
      this.config.maxOps
    );
    this.stepStartTime = performance.now();
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.operationCount = 0;
  }

  private complete(): void {
    this.stop();

    // Find max sustainable ops (last measurement without frame drops)
    let maxSustainableOps = this.config.startOps;
    let frameDropThreshold = this.config.maxOps;

    for (const m of this.measurements) {
      if (m.droppedFrames === 0) {
        maxSustainableOps = m.actualOps;
      } else {
        frameDropThreshold = m.targetOps;
        break;
      }
    }

    this.config.onComplete({
      maxSustainableOps,
      frameDropThreshold,
      measurements: this.measurements,
    });
  }
}
