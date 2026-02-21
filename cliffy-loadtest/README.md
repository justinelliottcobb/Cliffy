# cliffy-loadtest

Scale testing framework for Cliffy - simulates 100-10,000+ concurrent users.

## Overview

cliffy-loadtest provides load testing infrastructure for Cliffy applications:

- **User simulation** - Simulates realistic user behavior patterns
- **Network modeling** - Configurable latency, jitter, and packet loss
- **Topology simulation** - Star, ring, and mesh network topologies
- **Metrics collection** - Latency percentiles, throughput, convergence time

## Usage

```rust
use cliffy_loadtest::{Simulator, ScenarioConfig, NetworkModel};

// Configure a load test scenario
let config = ScenarioConfig {
    user_count: 1000,
    duration_secs: 60,
    operations_per_second: 10.0,
    network: NetworkModel::realistic(),
};

// Run simulation
let simulator = Simulator::new(config);
let report = simulator.run().await;

// Analyze results
println!("P99 latency: {:?}", report.latency_p99());
println!("Convergence time: {:?}", report.convergence_time());
println!("Throughput: {} ops/sec", report.throughput());
```

## Scenarios

- **Burst** - Sudden spike in user activity
- **Gradual ramp** - Slowly increasing load
- **Chaos** - Random network partitions and failures
- **Convergence** - Measure time to reach consistent state

## Features

- Parallel simulation via [rayon](https://crates.io/crates/rayon)
- Async runtime via [tokio](https://crates.io/crates/tokio)
- JSON/HTML report generation
- Integration with cliffy-test for invariant verification

## License

MIT
