/**
 * Metrics collection and reporting for Cliffy benchmarks
 */

export interface MetricStats {
  count: number;
  total: number;
  mean: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface BenchmarkReport {
  timestamp: string;
  environment: {
    userAgent: string;
    gpuAvailable: boolean;
    gpuInfo?: string;
  };
  metrics: Record<string, MetricStats>;
  comparison: {
    cpuOpsPerSec: number;
    gpuOpsPerSec: number;
    speedup: number;
  };
}

/**
 * Collects timing metrics for operations
 */
export class MetricsCollector {
  private measurements: Map<string, number[]> = new Map();
  private maxSamples: number;

  constructor(maxSamples = 1000) {
    this.maxSamples = maxSamples;
  }

  /**
   * Record an operation's duration
   */
  recordOperation(name: string, durationMs: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }

    const samples = this.measurements.get(name)!;
    samples.push(durationMs);

    // Keep only recent samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Time an operation and record it
   */
  async timeOperation<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.recordOperation(name, duration);
    return result;
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): MetricStats | null {
    const samples = this.measurements.get(name);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const count = sorted.length;
    const total = sorted.reduce((sum, v) => sum + v, 0);

    return {
      count,
      total,
      mean: total / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Get operations per second for a metric
   */
  getOpsPerSec(name: string): number {
    const stats = this.getStats(name);
    if (!stats || stats.mean === 0) return 0;
    return 1000 / stats.mean;
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }

  /**
   * Clear measurements for a specific metric
   */
  clearMetric(name: string): void {
    this.measurements.delete(name);
  }

  /**
   * Export all metrics as a report
   */
  export(): BenchmarkReport {
    const metrics: Record<string, MetricStats> = {};

    for (const name of this.measurements.keys()) {
      const stats = this.getStats(name);
      if (stats) {
        metrics[name] = stats;
      }
    }

    const cpuStats = this.getStats('cpu');
    const gpuStats = this.getStats('gpu');
    const cpuOps = cpuStats ? 1000 / cpuStats.mean : 0;
    const gpuOps = gpuStats ? 1000 / gpuStats.mean : 0;

    return {
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        gpuAvailable: this.detectGpu(),
        gpuInfo: this.getGpuInfo(),
      },
      metrics,
      comparison: {
        cpuOpsPerSec: cpuOps,
        gpuOpsPerSec: gpuOps,
        speedup: cpuOps > 0 ? gpuOps / cpuOps : 1,
      },
    };
  }

  /**
   * Export as JSON string
   */
  exportJson(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  /**
   * Download report as JSON file
   */
  downloadReport(filename = 'benchmark-report.json'): void {
    const json = this.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private detectGpu(): boolean {
    if (typeof navigator === 'undefined') return false;
    return 'gpu' in navigator;
  }

  private getGpuInfo(): string | undefined {
    if (typeof document === 'undefined') return undefined;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch {
      // Ignore errors
    }

    return undefined;
  }
}
