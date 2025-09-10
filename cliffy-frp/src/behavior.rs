//! FRP behavior system using Amari geometric algebra through cliffy-core

use cliffy_core::{
    ReactiveMultivector, Multivector3D, ConformalMultivector, 
    AmariMultivector, GA3, GA4_1, constructors
};
use amari_core::{Multivector, scalar_traits::Float};
use amari_fusion::{GeometricProduct, GradeSelection};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use tokio::sync::{watch, broadcast};
use std::time::{Duration, Instant};

/// A time-varying geometric behavior that wraps Amari multivectors with reactive capabilities
#[derive(Debug, Clone)]
pub struct GeometricBehavior<M: Multivector> {
    current_state: Arc<RwLock<ReactiveMultivector<M>>>,
    receiver: watch::Receiver<ReactiveMultivector<M>>,
    sender: watch::Sender<ReactiveMultivector<M>>,
    time_started: Instant,
}

impl<M> GeometricBehavior<M> 
where 
    M: Multivector + Clone + Send + Sync + 'static,
{
    /// Create a new geometric behavior with an initial value
    pub fn new(initial_value: M) -> Self {
        let reactive_value = ReactiveMultivector::new(initial_value);
        let (sender, receiver) = watch::channel(reactive_value.clone());
        
        Self {
            current_state: Arc::new(RwLock::new(reactive_value)),
            receiver,
            sender,
            time_started: Instant::now(),
        }
    }

    /// Create a constant behavior that never changes
    pub fn constant(value: M) -> Self {
        Self::new(value)
    }

    /// Transform this behavior by applying a function to its values
    pub fn transform<F, N>(&self, f: F) -> GeometricBehavior<N> 
    where
        F: Fn(&M) -> N + Send + Sync + 'static,
        N: Multivector + Clone + Send + Sync + 'static,
    {
        let mut new_receiver = self.receiver.clone();
        let initial_transformed = f(&self.receiver.borrow().inner);
        let (new_sender, new_rx) = watch::channel(ReactiveMultivector::new(initial_transformed));

        let f = Arc::new(f);
        let sender_clone = new_sender.clone();
        
        tokio::spawn(async move {
            while new_receiver.changed().await.is_ok() {
                let current_value = new_receiver.borrow();
                let transformed = f(&current_value.inner);
                let reactive_result = ReactiveMultivector::new(transformed);
                let _ = sender_clone.send(reactive_result);
            }
        });

        GeometricBehavior {
            current_state: Arc::new(RwLock::new(new_rx.borrow().clone())),
            receiver: new_rx,
            sender: new_sender,
            time_started: self.time_started,
        }
    }

    /// Sample the current value of this behavior
    pub fn sample(&self) -> ReactiveMultivector<M> {
        self.receiver.borrow().clone()
    }

    /// Update the behavior with a new value
    pub fn update(&self, new_value: M) {
        let reactive_value = ReactiveMultivector::new(new_value);
        
        if let Ok(mut state) = self.current_state.write() {
            *state = reactive_value.clone();
        }
        let _ = self.sender.send(reactive_value);
    }

    /// Combine two behaviors using a function
    pub fn combine<N, R, F>(&self, other: &GeometricBehavior<N>, f: F) -> GeometricBehavior<R>
    where
        F: Fn(&M, &N) -> R + Send + Sync + 'static,
        N: Multivector + Clone + Send + Sync + 'static,
        R: Multivector + Clone + Send + Sync + 'static,
    {
        let self_rx = self.receiver.clone();
        let other_rx = other.receiver.clone();
        
        let initial = f(&self_rx.borrow().inner, &other_rx.borrow().inner);
        let (sender, receiver) = watch::channel(ReactiveMultivector::new(initial));

        let f = Arc::new(f);
        let sender_clone = sender.clone();
        
        tokio::spawn(async move {
            let mut self_receiver = self_rx;
            let mut other_receiver = other_rx;
            
            loop {
                tokio::select! {
                    Ok(_) = self_receiver.changed() => {
                        let self_val = &self_receiver.borrow().inner;
                        let other_val = &other_receiver.borrow().inner;
                        let result = f(self_val, other_val);
                        let reactive_result = ReactiveMultivector::new(result);
                        let _ = sender_clone.send(reactive_result);
                    }
                    Ok(_) = other_receiver.changed() => {
                        let self_val = &self_receiver.borrow().inner;
                        let other_val = &other_receiver.borrow().inner;
                        let result = f(self_val, other_val);
                        let reactive_result = ReactiveMultivector::new(result);
                        let _ = sender_clone.send(reactive_result);
                    }
                    else => break,
                }
            }
        });

        GeometricBehavior {
            current_state: Arc::new(RwLock::new(receiver.borrow().clone())),
            receiver,
            sender,
            time_started: self.time_started,
        }
    }
}

impl<M> GeometricBehavior<M> 
where 
    M: Multivector + GeometricProduct<M> + Clone + Send + Sync + 'static,
{
    /// Apply a rotor transformation to this behavior
    pub fn with_rotor(&self, rotor_behavior: &GeometricBehavior<M>) -> Self {
        self.combine(rotor_behavior, |state, rotor| {
            rotor.sandwich(state)
        })
    }

    /// Geometric product with another behavior
    pub fn geometric_product(&self, other: &Self) -> Self {
        self.combine(other, |a, b| a.geometric_product(b))
    }
}

/// Specialized behaviors for 3D geometric algebra (GA3)
impl GeometricBehavior<GA3<f64>> {
    /// Create a 3D vector behavior
    pub fn vector3d(x: f64, y: f64, z: f64) -> Self {
        Self::new(GA3::vector([x, y, z]))
    }

    /// Create a scalar behavior
    pub fn scalar(value: f64) -> Self {
        Self::new(GA3::scalar(value))
    }

    /// Create a rotor behavior from angle and bivector
    pub fn rotor(angle: f64, bivector: &GA3<f64>) -> Self {
        let half_angle = angle / 2.0;
        let rotor = GA3::scalar(half_angle.cos()) + bivector.normalized() * half_angle.sin();
        Self::new(rotor)
    }

    /// Compute the geometric derivative with respect to time
    pub fn geometric_derivative(&self, dt: Duration) -> Self {
        let dt_secs = dt.as_secs_f64();
        let mut prev_receiver = self.receiver.clone();
        let (sender, receiver) = watch::channel(ReactiveMultivector::new(GA3::zero()));

        let sender_clone = sender.clone();
        tokio::spawn(async move {
            let mut prev_value = prev_receiver.borrow().inner.clone();
            
            while prev_receiver.changed().await.is_ok() {
                let current_value = prev_receiver.borrow().inner.clone();
                let derivative = (current_value - prev_value.clone()) * (1.0 / dt_secs);
                prev_value = current_value;
                let _ = sender_clone.send(ReactiveMultivector::new(derivative));
            }
        });

        Self {
            current_state: Arc::new(RwLock::new(ReactiveMultivector::new(GA3::zero()))),
            receiver,
            sender,
            time_started: Instant::now(),
        }
    }

    /// Integrate this behavior over time
    pub fn integrate(&self, dt: Duration) -> Self {
        let dt_secs = dt.as_secs_f64();
        let mut input_rx = self.receiver.clone();
        
        let (sender, receiver) = watch::channel(ReactiveMultivector::new(GA3::zero()));
        let sender_clone = sender.clone();

        tokio::spawn(async move {
            let mut accumulated = GA3::zero();
            
            while input_rx.changed().await.is_ok() {
                let current = input_rx.borrow().inner.clone();
                accumulated = accumulated + current * dt_secs;
                let _ = sender_clone.send(ReactiveMultivector::new(accumulated.clone()));
            }
        });

        Self {
            current_state: Arc::new(RwLock::new(ReactiveMultivector::new(GA3::zero()))),
            receiver,
            sender,
            time_started: Instant::now(),
        }
    }
}

/// Specialized behaviors for conformal geometric algebra (GA4_1) 
impl GeometricBehavior<GA4_1<f64>> {
    /// Create a conformal point behavior
    pub fn conformal_point(x: f64, y: f64, z: f64) -> Self {
        Self::new(GA4_1::point([x, y, z]))
    }

    /// Sample at a specific conformal point with time-based scaling
    pub fn sample_at_conformal_point(&self, _point: &GA4_1<f64>) -> ReactiveMultivector<GA4_1<f64>> {
        let current = self.sample();
        let time_elapsed = self.time_started.elapsed().as_secs_f64();
        
        // Apply time-based transformation using Amari operations
        let time_scaled = current.inner.clone() * time_elapsed;
        ReactiveMultivector::new(time_scaled)
    }
}

/// Interpolation functions for behaviors
pub fn interpolate_rotors(
    from: GeometricBehavior<GA3<f64>>,
    to: GeometricBehavior<GA3<f64>>,
    t: f64
) -> GeometricBehavior<GA3<f64>> {
    from.combine(&to, move |a, b| {
        // Use Amari's interpolation capabilities
        amari_fusion::slerp(a, b, t)
    })
}

/// Linear interpolation between two behaviors
pub fn lerp_behaviors<M>(
    from: GeometricBehavior<M>,
    to: GeometricBehavior<M>,
    t: M::Scalar
) -> GeometricBehavior<M>
where
    M: Multivector + Clone + Send + Sync + 'static,
    M::Scalar: Float,
    M: std::ops::Add<Output = M> + std::ops::Mul<M::Scalar, Output = M>,
{
    from.combine(&to, move |a, b| {
        a.clone() * (M::Scalar::one() - t) + b.clone() * t
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_geometric_behavior_transform() {
        let behavior = GeometricBehavior::scalar(1.0);
        
        let doubled = behavior.transform(|mv| mv.clone() * 2.0);
        
        assert_eq!(doubled.sample().inner.scalar_part(), 2.0);
        
        behavior.update(GA3::scalar(3.0));
        sleep(Duration::from_millis(10)).await;
        
        assert_eq!(doubled.sample().inner.scalar_part(), 6.0);
    }

    #[tokio::test]
    async fn test_rotor_behavior() {
        let point_behavior = GeometricBehavior::vector3d(1.0, 0.0, 0.0);
        let bivector = GA3::bivector([0.0, 0.0, 1.0]); // e1^e2
        let angle = std::f64::consts::PI / 2.0;
        let rotor_behavior = GeometricBehavior::rotor(angle, &bivector);
        
        let rotated = point_behavior.with_rotor(&rotor_behavior);
        let result = rotated.sample();
        
        // After π/2 rotation around z-axis, e1 should become e2
        let y_component = result.inner.vector_part()[1];
        assert!((y_component - 1.0).abs() < 1e-10);
    }

    #[tokio::test]
    async fn test_geometric_derivative() {
        let behavior = GeometricBehavior::scalar(0.0);
        let dt = Duration::from_millis(100);
        let derivative = behavior.geometric_derivative(dt);
        
        // Update with a linear function of time
        behavior.update(GA3::scalar(1.0));
        sleep(Duration::from_millis(50)).await;
        behavior.update(GA3::scalar(2.0));
        sleep(Duration::from_millis(50)).await;
        
        // Derivative should be approximately 10.0 (change of 1.0 over 0.1s)
        let deriv_value = derivative.sample();
        assert!((deriv_value.inner.scalar_part() - 10.0).abs() < 1.0);
    }

    #[tokio::test]
    async fn test_combine_behaviors() {
        let a = GeometricBehavior::scalar(3.0);
        let b = GeometricBehavior::scalar(4.0);
        
        let sum = a.combine(&b, |x, y| x.clone() + y.clone());
        assert_eq!(sum.sample().inner.scalar_part(), 7.0);
        
        let product = a.combine(&b, |x, y| x.geometric_product(y));
        assert_eq!(product.sample().inner.scalar_part(), 12.0);
    }

    #[tokio::test]
    async fn test_conformal_behavior() {
        let point_behavior = GeometricBehavior::conformal_point(1.0, 2.0, 3.0);
        let sample = point_behavior.sample();
        
        // Should create a valid conformal point representation
        assert!(sample.inner.magnitude() > 0.0);
    }
}