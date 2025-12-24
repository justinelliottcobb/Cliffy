use cliffy_core::GA3;
use std::sync::{Arc, RwLock};
use std::time::Instant;
use tokio::sync::watch;

/// Geometric Behavior for 3D Euclidean space (Cl(3,0))
///
/// After Amari 0.9.8 migration, this uses concrete GA3 type instead of generic parameters.
/// Previous API: GeometricBehavior<T, N> where T was scalar type and N was dimension
/// Current API: Uses GA3 = Multivector<3, 0, 0> with fixed f64 scalars
#[derive(Debug, Clone)]
pub struct GeometricBehavior {
    current_state: Arc<RwLock<GA3>>,
    receiver: watch::Receiver<GA3>,
    sender: watch::Sender<GA3>,
    time_started: Instant,
}

impl GeometricBehavior {
    pub fn new(initial_value: GA3) -> Self {
        let (sender, receiver) = watch::channel(initial_value.clone());

        Self {
            current_state: Arc::new(RwLock::new(initial_value)),
            receiver,
            sender,
            time_started: Instant::now(),
        }
    }

    pub fn constant(value: GA3) -> Self {
        Self::new(value)
    }

    pub fn transform<F>(&self, f: F) -> Self
    where
        F: Fn(&GA3) -> GA3 + Send + Sync + 'static,
    {
        let mut new_receiver = self.receiver.clone();
        let (new_sender, new_rx) = watch::channel(f(&self.receiver.borrow().clone()));

        let f = Arc::new(f);
        let sender_clone = new_sender.clone();

        tokio::spawn(async move {
            while new_receiver.changed().await.is_ok() {
                let current_value = new_receiver.borrow().clone();
                let transformed = f(&current_value);
                let _ = sender_clone.send(transformed);
            }
        });

        let initial_state = new_rx.borrow().clone();

        Self {
            current_state: Arc::new(RwLock::new(initial_state)),
            receiver: new_rx,
            sender: new_sender,
            time_started: self.time_started,
        }
    }

    pub fn sample(&self) -> GA3 {
        self.receiver.borrow().clone()
    }

    pub fn update(&self, new_value: GA3) {
        if let Ok(mut state) = self.current_state.write() {
            *state = new_value.clone();
        }
        let _ = self.sender.send(new_value);
    }

    pub fn combine<F>(&self, other: &Self, f: F) -> Self
    where
        F: Fn(&GA3, &GA3) -> GA3 + Send + Sync + 'static,
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

    pub fn geometric_product(&self, other: &Self) -> Self {
        self.combine(other, |a, b| a.geometric_product(b))
    }

    pub fn add(&self, other: &Self) -> Self {
        self.combine(other, |a, b| a + b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::ga_helpers::*;
    use std::time::Duration;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_geometric_behavior_new() {
        let initial = scalar(1.0);
        let behavior = GeometricBehavior::new(initial.clone());

        let sampled = behavior.sample();
        assert_eq!(sampled, initial);
    }

    #[tokio::test]
    async fn test_geometric_behavior_transform() {
        let initial = scalar(2.0);
        let behavior = GeometricBehavior::new(initial);

        let doubled = behavior.transform(|mv| mv * 2.0);

        // Should be 2.0 * 2.0 = 4.0
        let result = doubled.sample();
        assert!((result.get(0) - 4.0).abs() < 1e-10);

        behavior.update(scalar(3.0));
        sleep(Duration::from_millis(50)).await;

        // Should be 3.0 * 2.0 = 6.0
        let result2 = doubled.sample();
        assert!((result2.get(0) - 6.0).abs() < 1e-10);
    }

    #[tokio::test]
    async fn test_combine_addition() {
        let behavior1 = GeometricBehavior::new(scalar(1.0));
        let behavior2 = GeometricBehavior::new(scalar(2.0));

        let combined = behavior1.add(&behavior2);

        let result = combined.sample();
        assert!((result.get(0) - 3.0).abs() < 1e-10);
    }

    #[tokio::test]
    async fn test_geometric_product() {
        let v1 = vector3(1.0, 0.0, 0.0); // e1
        let v2 = vector3(0.0, 1.0, 0.0); // e2

        let behavior1 = GeometricBehavior::new(v1);
        let behavior2 = GeometricBehavior::new(v2);

        let product = behavior1.geometric_product(&behavior2);

        // e1 * e2 should give the e1^e2 bivector component
        let result = product.sample();
        // This should have a bivector component, exact value depends on Amari's basis ordering
        assert!(result.magnitude() > 0.0);
    }
}
