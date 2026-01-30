/**
 * Benchmark UI components for Cliffy examples
 *
 * Provides visual comparison of CPU vs GPU performance
 * with real-time metrics, backend toggling, and stress testing.
 */

export { BenchmarkPanel, type BenchmarkPanelConfig } from './BenchmarkPanel';
export { MetricCard, type MetricCardProps } from './MetricCard';
export { StressTest, type StressTestConfig } from './StressTest';
export {
  MetricsCollector,
  type MetricStats,
  type BenchmarkReport,
} from './metrics';
