use cliffy_core::{Multivector, cl4_1::ConformalMultivector, cl3_0::Multivector3D};
use num_traits::Float;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use tokio::sync::{watch, broadcast};
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct GeometricBehavior<T: Float + Send + Sync + Clone, const N: usize> {
    current_state: Arc<RwLock<Multivector<T, N>>>,
    receiver: watch::Receiver<Multivector<T, N>>,
    sender: watch::Sender<Multivector<T, N>>,
    time_started: Instant,
}

impl<T: Float + Send + Sync + Clone + 'static, const N: usize> GeometricBehavior<T, N> {
    pub fn new(initial_value: Multivector<T, N>) -> Self {
        let (sender, receiver) = watch::channel(initial_value.clone());
        
        Self {
            current_state: Arc::new(RwLock::new(initial_value)),
            receiver,
            sender,
            time_started: Instant::now(),
        }
    }

    pub fn constant(value: Multivector<T, N>) -> Self {
        Self::new(value)
    }

    pub fn transform<F>(&self, f: F) -> Self 
    where
        F: Fn(&Multivector<T, N>) -> Multivector<T, N> + Send + Sync + 'static,
    {
        let mut new_receiver = self.receiver.clone();
        let (new_sender, new_rx) = watch::channel(
            f(&self.receiver.borrow().clone())
        );

        let f = Arc::new(f);
        let sender_clone = new_sender.clone();
        
        tokio::spawn(async move {
            while new_receiver.changed().await.is_ok() {
                let current_value = new_receiver.borrow().clone();
                let transformed = f(&current_value);
                let _ = sender_clone.send(transformed);
            }
        });

        Self {
            current_state: Arc::new(RwLock::new(new_rx.borrow().clone())),
            receiver: new_rx,
            sender: new_sender,
            time_started: self.time_started,
        }
    }

    pub fn with_rotor(&self, rotor_behavior: &GeometricBehavior<T, N>) -> Self {
        let self_receiver = self.receiver.clone();
        let rotor_receiver = rotor_behavior.receiver.clone();
        
        let initial_state = {
            let state = self_receiver.borrow().clone();
            let rotor = rotor_receiver.borrow().clone();
            rotor.sandwich(&state)
        };

        let (sender, receiver) = watch::channel(initial_state.clone());

        let sender_clone = sender.clone();
        tokio::spawn(async move {
            let mut self_rx = self_receiver;
            let mut rotor_rx = rotor_receiver;
            
            loop {
                tokio::select! {
                    Ok(_) = self_rx.changed() => {
                        let state = self_rx.borrow().clone();
                        let rotor = rotor_rx.borrow().clone();
                        let result = rotor.sandwich(&state);
                        let _ = sender_clone.send(result);
                    }
                    Ok(_) = rotor_rx.changed() => {
                        let state = self_rx.borrow().clone();
                        let rotor = rotor_rx.borrow().clone();
                        let result = rotor.sandwich(&state);
                        let _ = sender_clone.send(result);
                    }
                    else => break,
                }
            }
        });

        Self {
            current_state: Arc::new(RwLock::new(initial_state)),
            receiver,
            sender,
            time_started: self.time_started,
        }
    }

    pub fn sample(&self) -> Multivector<T, N> {
        self.receiver.borrow().clone()
    }

    pub fn sample_at_conformal_point(&self, point: &ConformalMultivector<T>) -> Multivector<T, N> 
    where
        T: From<f64>,
    {
        let current = self.sample();
        let time_elapsed = self.time_started.elapsed().as_secs_f64();
        let time_factor = T::from(time_elapsed);
        
        current.scale(time_factor)
    }

    pub fn geometric_derivative(&self, dt: Duration) -> Self {
        let dt_secs = dt.as_secs_f64();
        let dt_val = T::from(dt_secs).unwrap();

        let mut prev_receiver = self.receiver.clone();
        let (sender, receiver) = watch::channel(Multivector::zero());

        let sender_clone = sender.clone();
        tokio::spawn(async move {
            let mut prev_value = prev_receiver.borrow().clone();
            
            while prev_receiver.changed().await.is_ok() {
                let current_value = prev_receiver.borrow().clone();
                let derivative = (current_value - prev_value.clone()).scale(
                    T::one() / dt_val
                );
                prev_value = current_value;
                let _ = sender_clone.send(derivative);
            }
        });

        Self {
            current_state: Arc::new(RwLock::new(Multivector::zero())),
            receiver,
            sender,
            time_started: Instant::now(),
        }
    }

    pub fn update(&self, new_value: Multivector<T, N>) {
        if let Ok(mut state) = self.current_state.write() {
            *state = new_value.clone();
        }
        let _ = self.sender.send(new_value);
    }

    pub fn combine<F>(&self, other: &Self, f: F) -> Self
    where
        F: Fn(&Multivector<T, N>, &Multivector<T, N>) -> Multivector<T, N> + Send + Sync + 'static,
    {
        let self_rx = self.receiver.clone();
        let other_rx = other.receiver.clone();
        
        let initial = f(&self_rx.borrow(), &other_rx.borrow());
        let (sender, receiver) = watch::channel(initial.clone());

        let f = Arc::new(f);
        let sender_clone = sender.clone();
        
        tokio::spawn(async move {
            let mut self_receiver = self_rx;
            let mut other_receiver = other_rx;
            
            loop {
                tokio::select! {
                    Ok(_) = self_receiver.changed() => {
                        let self_val = self_receiver.borrow().clone();
                        let other_val = other_receiver.borrow().clone();
                        let result = f(&self_val, &other_val);
                        let _ = sender_clone.send(result);
                    }
                    Ok(_) = other_receiver.changed() => {
                        let self_val = self_receiver.borrow().clone();
                        let other_val = other_receiver.borrow().clone();
                        let result = f(&self_val, &other_val);
                        let _ = sender_clone.send(result);
                    }
                    else => break,
                }
            }
        });

        Self {
            current_state: Arc::new(RwLock::new(initial)),
            receiver,
            sender,
            time_started: self.time_started,
        }
    }

    pub fn integrate(&self, dt: Duration) -> Self {
        let dt_val = T::from(dt.as_secs_f64()).unwrap();
        let mut input_rx = self.receiver.clone();
        
        let (sender, receiver) = watch::channel(Multivector::zero());
        let sender_clone = sender.clone();

        tokio::spawn(async move {
            let mut accumulated = Multivector::zero();
            
            while input_rx.changed().await.is_ok() {
                let current = input_rx.borrow().clone();
                accumulated = accumulated + current.scale(dt_val);
                let _ = sender_clone.send(accumulated.clone());
            }
        });

        Self {
            current_state: Arc::new(RwLock::new(Multivector::zero())),
            receiver,
            sender,
            time_started: Instant::now(),
        }
    }
}

pub fn interpolate_rotors<T: Float + Send + Sync + Clone>(
    from: GeometricBehavior<T, 8>,
    to: GeometricBehavior<T, 8>,
    t: T
) -> GeometricBehavior<T, 8> {
    from.combine(&to, move |a, b| {
        let log_diff = (b.geometric_product(&a.conjugate())).log();
        let interpolated_log = log_diff.scale(t);
        let interpolated_rotor = interpolated_log.exp();
        a.geometric_product(&interpolated_rotor)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::cl3_0::{e1, e2, rotor};
    use std::time::Duration;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_geometric_behavior_transform() {
        let initial = Multivector3D::scalar(1.0);
        let behavior = GeometricBehavior::new(initial.clone());
        
        let doubled = behavior.transform(|mv| mv.scale(2.0));
        
        assert_eq!(doubled.sample().coeffs[0], 2.0);
        
        behavior.update(Multivector3D::scalar(3.0));
        sleep(Duration::from_millis(10)).await;
        
        assert_eq!(doubled.sample().coeffs[0], 6.0);
    }

    #[tokio::test]
    async fn test_rotor_behavior() {
        let point = e1::<f64>();
        let bivector = e1::<f64>().geometric_product(&e2::<f64>());
        let angle = std::f64::consts::PI / 2.0;
        let rotor_mv = rotor(angle, &bivector);
        
        let point_behavior = GeometricBehavior::new(point);
        let rotor_behavior = GeometricBehavior::new(rotor_mv);
        
        let rotated = point_behavior.with_rotor(&rotor_behavior);
        let result = rotated.sample();
        
        // After π/2 rotation around z-axis, e1 should become e2
        assert!((result.coeffs[2] - 1.0).abs() < 1e-10);
    }

    #[tokio::test]
    async fn test_geometric_derivative() {
        let behavior = GeometricBehavior::new(Multivector3D::scalar(0.0));
        let dt = Duration::from_millis(100);
        let derivative = behavior.geometric_derivative(dt);
        
        // Update with a linear function of time
        behavior.update(Multivector3D::scalar(1.0));
        sleep(Duration::from_millis(50)).await;
        behavior.update(Multivector3D::scalar(2.0));
        sleep(Duration::from_millis(50)).await;
        
        // Derivative should be approximately 10.0 (change of 1.0 over 0.1s)
        let deriv_value = derivative.sample();
        assert!((deriv_value.coeffs[0] - 10.0).abs() < 1.0);
    }
}