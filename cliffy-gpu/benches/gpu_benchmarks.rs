//! GPU vs CPU benchmarks for geometric algebra operations.

use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};

use amari_core::Vector;
use cliffy_core::GA3;

/// Generate random multivectors for benchmarking.
fn random_multivectors(count: usize) -> Vec<GA3> {
    (0..count)
        .map(|i| {
            let t = i as f64 * 0.1;
            let vec = Vector::<3, 0, 0>::from_components(t.sin(), t.cos(), (t * 0.5).sin());
            GA3::from_vector(&vec)
        })
        .collect()
}

/// CPU-only geometric product benchmark.
fn cpu_geometric_product(a: &[GA3], b: &[GA3]) -> Vec<GA3> {
    a.iter()
        .zip(b.iter())
        .map(|(a, b)| a.geometric_product(b))
        .collect()
}

/// CPU-only addition benchmark.
fn cpu_addition(a: &[GA3], b: &[GA3]) -> Vec<GA3> {
    a.iter().zip(b.iter()).map(|(a, b)| a.add(b)).collect()
}

fn bench_geometric_product(c: &mut Criterion) {
    let mut group = c.benchmark_group("geometric_product");

    for size in [64, 256, 1024, 4096, 16384].iter() {
        let a = random_multivectors(*size);
        let b = random_multivectors(*size);

        group.throughput(Throughput::Elements(*size as u64));

        group.bench_with_input(BenchmarkId::new("cpu", size), size, |bench, _| {
            bench.iter(|| cpu_geometric_product(&a, &b))
        });

        // GPU benchmarks would require async runtime
        // group.bench_with_input(BenchmarkId::new("gpu", size), size, |bench, _| {
        //     bench.iter(|| { /* async GPU call */ })
        // });
    }

    group.finish();
}

fn bench_addition(c: &mut Criterion) {
    let mut group = c.benchmark_group("addition");

    for size in [64, 256, 1024, 4096, 16384].iter() {
        let a = random_multivectors(*size);
        let b = random_multivectors(*size);

        group.throughput(Throughput::Elements(*size as u64));

        group.bench_with_input(BenchmarkId::new("cpu", size), size, |bench, _| {
            bench.iter(|| cpu_addition(&a, &b))
        });
    }

    group.finish();
}

fn bench_batch_sizes(c: &mut Criterion) {
    let mut group = c.benchmark_group("batch_scaling");

    // Test how performance scales with batch size
    for size in [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192].iter() {
        let a = random_multivectors(*size);
        let b = random_multivectors(*size);

        group.throughput(Throughput::Elements(*size as u64));

        group.bench_with_input(BenchmarkId::from_parameter(size), size, |bench, _| {
            bench.iter(|| cpu_geometric_product(&a, &b))
        });
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_geometric_product,
    bench_addition,
    bench_batch_sizes
);
criterion_main!(benches);
