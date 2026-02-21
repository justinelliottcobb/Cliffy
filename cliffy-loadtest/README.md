# cliffy-loadtest

Scale testing framework for distributed Cliffy applications.

## Overview

`cliffy-loadtest` simulates 100 to 10,000+ concurrent users to validate convergence, measure latency, and test throughput of distributed geometric state systems.

## Features

- **Simulated Users**: Configurable user behavior patterns
- **Network Simulation**: Latency, packet loss, topology modeling
- **Convergence Metrics**: Track state convergence across replicas
- **Throughput Testing**: Operations per second under load
- **Detailed Reports**: JSON/HTML output with percentile latencies

## Quick Start

```rust
use cliffy_loadtest::{Scenario, SimulatedUser, NetworkConfig};

// Define scenario
let scenario = Scenario::builder()
    .name("Basic convergence test")
    .users(100)
    .duration_secs(60)
    .operations_per_user(50)
    .build();

// Run simulation
let report = scenario.run().await;

// Check results
assert!(report.convergence_rate() > 0.99);
assert!(report.p99_latency_ms() < 100.0);
```

## Network Topologies

Simulate different network conditions:

```rust
use cliffy_loadtest::network::{Topology, LatencyModel};

// Full mesh (everyone connects to everyone)
let mesh = Topology::full_mesh(100);

// Star topology (central coordinator)
let star = Topology::star(100);

// Ring topology
let ring = Topology::ring(100);

// Custom latency model
let latency = LatencyModel::new()
    .base_latency_ms(10.0)
    .jitter_ms(5.0)
    .loss_rate(0.01);  // 1% packet loss
```

## Scenarios

Pre-built test scenarios:

```rust
use cliffy_loadtest::scenarios;

// Burst traffic
let burst = scenarios::burst_traffic(1000, 10);  // 1000 users, 10 second burst

// Sustained load
let sustained = scenarios::sustained_load(500, 300);  // 500 users, 5 minutes

// Chaos testing (random failures)
let chaos = scenarios::chaos_test(200, 60, 0.05);  // 5% failure rate
```

## Metrics

Comprehensive metrics collection:

```rust
let report = scenario.run().await;

// Latency percentiles
println!("p50: {}ms", report.p50_latency_ms());
println!("p95: {}ms", report.p95_latency_ms());
println!("p99: {}ms", report.p99_latency_ms());

// Throughput
println!("ops/sec: {}", report.throughput());

// Convergence
println!("converged: {}%", report.convergence_rate() * 100.0);
println!("max divergence: {}", report.max_divergence());
```

## Reports

Generate detailed reports:

```rust
use cliffy_loadtest::report::{JsonReport, HtmlReport};

let report = scenario.run().await;

// JSON for CI/CD
report.save_json("results.json")?;

// HTML for humans
report.save_html("results.html")?;
```

## Integration with cliffy-test

Use invariant testing during load:

```rust
use cliffy_test::invariant_impossible;

scenario.with_invariant(|| {
    invariant_impossible!(
        "State never diverges beyond threshold",
        || max_divergence() < 0.001
    )
});
```

## License

MIT
