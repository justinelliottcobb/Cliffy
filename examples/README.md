# Cliffy Examples

Production-ready examples demonstrating Cliffy's FRP + Geometric Algebra approach.

## Examples

| Example | Description | Status |
|---------|-------------|--------|
| **whiteboard** | Collaborative drawing with geometric strokes | In Development |
| **multiplayer-game** | High-frequency state sync, physics via rotors | Planned |
| **document-editor** | CRDT text operations, presence indicators | Planned |
| **design-tool** | Shapes as GA primitives, undo/redo via versors | Planned |

## Quick Start

```bash
# Build WASM first
npm run build:wasm

# Install dependencies
npm install

# Run whiteboard example
npm run dev:whiteboard
```

## Shared Infrastructure

The `shared/` package provides reusable components:

- **Benchmark UI**: `BenchmarkPanel`, `MetricCard` - CPU vs GPU comparison
- **Debug Tools**: `StateInspector`, `OperationLog` - Geometric state visualization
- **Network Simulation**: `SimulatedPeer`, `NetworkSimulator` - Multi-user testing

### BenchmarkPanel Usage

```typescript
import { BenchmarkPanel } from '@cliffy/shared';

const benchmark = new BenchmarkPanel({
  showToggle: true,        // CPU/GPU toggle
  stressTestEnabled: true, // Stress test button
  exportEnabled: true,     // Export results
  onBackendChange: (useGpu) => {
    console.log('Backend:', useGpu ? 'GPU' : 'CPU');
  },
});

benchmark.addMetric('ops', 'Operations', 'ops/s');
benchmark.updateMetric('ops', cpuOps, gpuOps);
benchmark.mount(document.body);
```

## Archived Examples

Previous examples are in `archive/` for reference. See `archive/MIGRATION.md`.
