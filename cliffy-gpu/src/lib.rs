use bytemuck::{Pod, Zeroable};
use cliffy_core::Multivector;
use num_traits::Float;
use std::borrow::Cow;
use wgpu::util::DeviceExt;

#[repr(C)]
#[derive(Clone, Copy, Debug, Pod, Zeroable)]
pub struct GpuMultivector {
    pub coeffs: [f32; 8],
}

impl From<Multivector<f32, 8>> for GpuMultivector {
    fn from(mv: Multivector<f32, 8>) -> Self {
        let mut coeffs = [0.0; 8];
        for (i, &coeff) in mv.coeffs.as_slice().iter().enumerate() {
            if i < 8 {
                coeffs[i] = coeff;
            }
        }
        Self { coeffs }
    }
}

impl From<GpuMultivector> for Multivector<f32, 8> {
    fn from(gpu_mv: GpuMultivector) -> Self {
        Multivector::new(gpu_mv.coeffs.into())
    }
}

pub struct GeometricComputeContext {
    device: wgpu::Device,
    queue: wgpu::Queue,
    geometric_product_pipeline: wgpu::ComputePipeline,
    addition_pipeline: wgpu::ComputePipeline,
    sandwich_pipeline: wgpu::ComputePipeline,
    exp_pipeline: wgpu::ComputePipeline,
    rotor_slerp_pipeline: wgpu::ComputePipeline,
    reduction_pipeline: wgpu::ComputePipeline,
}

impl GeometricComputeContext {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .ok_or("Failed to request adapter")?;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Cliffy GPU Device"),
                    features: wgpu::Features::empty(),
                    limits: wgpu::Limits::default(),
                },
                None,
            )
            .await?;

        let shader_source = include_str!("../shaders/geometric.wgsl");
        let shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Geometric Algebra Shader"),
            source: wgpu::ShaderSource::Wgsl(Cow::Borrowed(shader_source)),
        });

        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Geometric Compute Bind Group Layout"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        let compute_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Geometric Compute Pipeline Layout"),
                bind_group_layouts: &[&bind_group_layout],
                push_constant_ranges: &[],
            });

        let geometric_product_pipeline =
            device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
                label: Some("Geometric Product Pipeline"),
                layout: Some(&compute_pipeline_layout),
                module: &shader_module,
                entry_point: "geometric_product_kernel",
            });

        let addition_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Addition Pipeline"),
            layout: Some(&compute_pipeline_layout),
            module: &shader_module,
            entry_point: "addition_kernel",
        });

        let sandwich_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Sandwich Pipeline"),
            layout: Some(&compute_pipeline_layout),
            module: &shader_module,
            entry_point: "sandwich_kernel",
        });

        let exp_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Exponential Pipeline"),
            layout: Some(&compute_pipeline_layout),
            module: &shader_module,
            entry_point: "exp_kernel",
        });

        let rotor_slerp_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Rotor SLERP Pipeline"),
            layout: Some(&compute_pipeline_layout),
            module: &shader_module,
            entry_point: "rotor_slerp_kernel",
        });

        let reduction_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Reduction Pipeline"),
            layout: Some(&compute_pipeline_layout),
            module: &shader_module,
            entry_point: "reduction_sum_kernel",
        });

        Ok(Self {
            device,
            queue,
            geometric_product_pipeline,
            addition_pipeline,
            sandwich_pipeline,
            exp_pipeline,
            rotor_slerp_pipeline,
            reduction_pipeline,
        })
    }

    pub async fn geometric_product_batch(
        &self,
        input_a: &[Multivector<f32, 8>],
        input_b: &[Multivector<f32, 8>],
    ) -> Result<Vec<Multivector<f32, 8>>, Box<dyn std::error::Error>> {
        assert_eq!(input_a.len(), input_b.len());
        
        let gpu_input_a: Vec<GpuMultivector> = input_a.iter().map(|&mv| mv.into()).collect();
        let gpu_input_b: Vec<GpuMultivector> = input_b.iter().map(|&mv| mv.into()).collect();
        
        self.run_compute_kernel(
            &self.geometric_product_pipeline,
            &gpu_input_a,
            &gpu_input_b,
        ).await
    }

    pub async fn addition_batch(
        &self,
        input_a: &[Multivector<f32, 8>],
        input_b: &[Multivector<f32, 8>],
    ) -> Result<Vec<Multivector<f32, 8>>, Box<dyn std::error::Error>> {
        assert_eq!(input_a.len(), input_b.len());
        
        let gpu_input_a: Vec<GpuMultivector> = input_a.iter().map(|&mv| mv.into()).collect();
        let gpu_input_b: Vec<GpuMultivector> = input_b.iter().map(|&mv| mv.into()).collect();
        
        self.run_compute_kernel(
            &self.addition_pipeline,
            &gpu_input_a,
            &gpu_input_b,
        ).await
    }

    pub async fn sandwich_batch(
        &self,
        rotors: &[Multivector<f32, 8>],
        vectors: &[Multivector<f32, 8>],
    ) -> Result<Vec<Multivector<f32, 8>>, Box<dyn std::error::Error>> {
        assert_eq!(rotors.len(), vectors.len());
        
        let gpu_rotors: Vec<GpuMultivector> = rotors.iter().map(|&mv| mv.into()).collect();
        let gpu_vectors: Vec<GpuMultivector> = vectors.iter().map(|&mv| mv.into()).collect();
        
        self.run_compute_kernel(
            &self.sandwich_pipeline,
            &gpu_rotors,
            &gpu_vectors,
        ).await
    }

    pub async fn exp_batch(
        &self,
        input: &[Multivector<f32, 8>],
    ) -> Result<Vec<Multivector<f32, 8>>, Box<dyn std::error::Error>> {
        let gpu_input: Vec<GpuMultivector> = input.iter().map(|&mv| mv.into()).collect();
        let dummy_input = vec![GpuMultivector { coeffs: [0.0; 8] }; input.len()];
        
        self.run_compute_kernel(
            &self.exp_pipeline,
            &gpu_input,
            &dummy_input,
        ).await
    }

    pub async fn rotor_slerp_batch(
        &self,
        rotors_a: &[Multivector<f32, 8>],
        rotors_b: &[Multivector<f32, 8>],
        t_values: &[f32],
    ) -> Result<Vec<Multivector<f32, 8>>, Box<dyn std::error::Error>> {
        assert_eq!(rotors_a.len(), rotors_b.len());
        assert_eq!(rotors_a.len(), t_values.len());
        
        let gpu_rotors_a: Vec<GpuMultivector> = rotors_a.iter().map(|&mv| mv.into()).collect();
        let gpu_rotors_b: Vec<GpuMultivector> = rotors_b.iter().zip(t_values.iter()).map(|(&mv, &t)| {
            let mut gpu_mv: GpuMultivector = mv.into();
            gpu_mv.coeffs[0] = t; // Store t in first coefficient
            gpu_mv
        }).collect();
        
        self.run_compute_kernel(
            &self.rotor_slerp_pipeline,
            &gpu_rotors_a,
            &gpu_rotors_b,
        ).await
    }

    async fn run_compute_kernel(
        &self,
        pipeline: &wgpu::ComputePipeline,
        input_a: &[GpuMultivector],
        input_b: &[GpuMultivector],
    ) -> Result<Vec<Multivector<f32, 8>>, Box<dyn std::error::Error>> {
        let size = input_a.len();
        
        let input_buffer_a = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Input Buffer A"),
            contents: bytemuck::cast_slice(input_a),
            usage: wgpu::BufferUsages::STORAGE,
        });

        let input_buffer_b = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Input Buffer B"),
            contents: bytemuck::cast_slice(input_b),
            usage: wgpu::BufferUsages::STORAGE,
        });

        let output_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Output Buffer"),
            size: (size * std::mem::size_of::<GpuMultivector>()) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let staging_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Staging Buffer"),
            size: (size * std::mem::size_of::<GpuMultivector>()) as u64,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Compute Bind Group"),
            layout: &pipeline.get_bind_group_layout(0),
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: input_buffer_a.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: input_buffer_b.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: output_buffer.as_entire_binding(),
                },
            ],
        });

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Compute Encoder"),
        });

        {
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Compute Pass"),
                timestamp_writes: None,
            });

            compute_pass.set_pipeline(pipeline);
            compute_pass.set_bind_group(0, &bind_group, &[]);
            compute_pass.dispatch_workgroups((size as u32 + 63) / 64, 1, 1);
        }

        encoder.copy_buffer_to_buffer(
            &output_buffer,
            0,
            &staging_buffer,
            0,
            (size * std::mem::size_of::<GpuMultivector>()) as u64,
        );

        self.queue.submit(std::iter::once(encoder.finish()));

        let buffer_slice = staging_buffer.slice(..);
        let (sender, receiver) = futures::channel::oneshot::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            sender.send(result).unwrap();
        });

        self.device.poll(wgpu::Maintain::Wait);
        receiver.await??;

        let data = buffer_slice.get_mapped_range();
        let gpu_result: &[GpuMultivector] = bytemuck::cast_slice(&data);
        let result: Vec<Multivector<f32, 8>> = gpu_result.iter().map(|&gpu_mv| gpu_mv.into()).collect();

        drop(data);
        staging_buffer.unmap();

        Ok(result)
    }

    pub async fn parallel_sum(
        &self,
        input: &[Multivector<f32, 8>],
    ) -> Result<Multivector<f32, 8>, Box<dyn std::error::Error>> {
        if input.is_empty() {
            return Ok(Multivector::zero());
        }

        let mut current_input = input.to_vec();
        
        while current_input.len() > 1 {
            let size = current_input.len();
            let reduced_size = (size + 63) / 64; // Each workgroup reduces 64 elements
            
            let gpu_input: Vec<GpuMultivector> = current_input.iter().map(|&mv| mv.into()).collect();
            let dummy_input = vec![GpuMultivector { coeffs: [0.0; 8] }; size];
            
            let result = self.run_compute_kernel(
                &self.reduction_pipeline,
                &gpu_input,
                &dummy_input,
            ).await?;
            
            current_input = result;
            
            if reduced_size == 1 {
                break;
            }
        }
        
        Ok(current_input[0])
    }

    pub fn get_device(&self) -> &wgpu::Device {
        &self.device
    }

    pub fn get_queue(&self) -> &wgpu::Queue {
        &self.queue
    }
}

// Benchmark utilities
pub struct PerformanceBenchmark {
    context: GeometricComputeContext,
}

impl PerformanceBenchmark {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            context: GeometricComputeContext::new().await?,
        })
    }

    pub async fn benchmark_geometric_product(
        &self,
        size: usize,
        iterations: usize,
    ) -> Result<f64, Box<dyn std::error::Error>> {
        let input_a: Vec<Multivector<f32, 8>> = (0..size)
            .map(|_| Multivector::scalar(1.0) + cliffy_core::cl3_0::e1::<f32>())
            .collect();
        let input_b: Vec<Multivector<f32, 8>> = (0..size)
            .map(|_| Multivector::scalar(2.0) + cliffy_core::cl3_0::e2::<f32>())
            .collect();

        let start = std::time::Instant::now();
        
        for _ in 0..iterations {
            let _result = self.context.geometric_product_batch(&input_a, &input_b).await?;
        }
        
        let duration = start.elapsed();
        let ops_per_second = (size * iterations) as f64 / duration.as_secs_f64();
        
        Ok(ops_per_second)
    }

    pub async fn benchmark_parallel_sum(
        &self,
        size: usize,
    ) -> Result<f64, Box<dyn std::error::Error>> {
        let input: Vec<Multivector<f32, 8>> = (0..size)
            .map(|i| Multivector::scalar(i as f32))
            .collect();

        let start = std::time::Instant::now();
        let _result = self.context.parallel_sum(&input).await?;
        let duration = start.elapsed();
        
        let elements_per_second = size as f64 / duration.as_secs_f64();
        
        Ok(elements_per_second)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::cl3_0::{e1, e2, Multivector3D};

    #[tokio::test]
    async fn test_gpu_geometric_product() {
        let context = GeometricComputeContext::new().await.unwrap();
        
        let a = vec![e1::<f32>()];
        let b = vec![e2::<f32>()];
        
        let result = context.geometric_product_batch(&a, &b).await.unwrap();
        
        // e1 * e2 = e12 (coefficient at index 3)
        assert!((result[0].coeffs[3] - 1.0).abs() < 1e-6);
    }

    #[tokio::test]
    async fn test_gpu_parallel_sum() {
        let context = GeometricComputeContext::new().await.unwrap();
        
        let input = vec![
            Multivector3D::scalar(1.0),
            Multivector3D::scalar(2.0),
            Multivector3D::scalar(3.0),
        ];
        
        let result = context.parallel_sum(&input).await.unwrap();
        
        // Sum should be 6.0
        assert!((result.coeffs[0] - 6.0).abs() < 1e-6);
    }
}