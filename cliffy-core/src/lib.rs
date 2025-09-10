//! Cliffy Core - FRP wrapper types over Amari geometric algebra
//! 
//! This crate provides reactive wrappers around Amari's geometric algebra types,
//! adding functional reactive programming capabilities while leveraging Amari's
//! optimized geometric algebra implementations.

use amari_core::{Multivector, GA3, GA4_1, GA4_4};
use amari_fusion::{GeometricProduct, Exponential, Logarithm, GradeSelection};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

// Re-export Amari types for convenience
pub use amari_core::{Multivector as AmariMultivector, GA3, GA4_1, GA4_4};
pub use amari_fusion::*;

/// Cliffy type aliases using Amari's geometric algebra spaces
pub type Multivector3D<T> = GA3<T>;
pub type ConformalMultivector<T> = GA4_1<T>;  
pub type SpacetimeMultivector<T> = GA4_4<T>;

/// A reactive wrapper around Amari multivectors that adds FRP capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReactiveMultivector<M: Multivector> {
    /// The underlying Amari multivector
    pub inner: M,
    /// Unique identifier for change tracking
    pub version: u64,
    /// Timestamp when this value was last updated
    pub updated_at: std::time::SystemTime,
}

impl<M: Multivector> ReactiveMultivector<M> {
    /// Create a new reactive multivector
    pub fn new(inner: M) -> Self {
        Self {
            inner,
            version: next_version(),
            updated_at: std::time::SystemTime::now(),
        }
    }

    /// Get the underlying Amari multivector
    pub fn value(&self) -> &M {
        &self.inner
    }

    /// Update the value, incrementing the version counter
    pub fn update(&mut self, new_value: M) {
        self.inner = new_value;
        self.version = next_version();
        self.updated_at = std::time::SystemTime::now();
    }

    /// Apply a transformation function to the underlying multivector
    pub fn map<F>(&self, f: F) -> Self 
    where 
        F: FnOnce(&M) -> M,
    {
        Self::new(f(&self.inner))
    }

    /// Check if this reactive multivector has been updated since the given version
    pub fn changed_since(&self, version: u64) -> bool {
        self.version > version
    }

    /// Get the current version number
    pub fn version(&self) -> u64 {
        self.version
    }
}

impl<M: Multivector + GeometricProduct<M>> ReactiveMultivector<M> {
    /// Geometric product with another reactive multivector
    pub fn geometric_product(&self, other: &Self) -> Self {
        Self::new(self.inner.geometric_product(&other.inner))
    }

    /// Sandwich product: self * other * self.reverse()
    pub fn sandwich(&self, other: &Self) -> Self {
        Self::new(self.inner.sandwich(&other.inner))
    }
}

impl<M: Multivector + Exponential> ReactiveMultivector<M> {
    /// Exponential map
    pub fn exp(&self) -> Self {
        Self::new(self.inner.exp())
    }
}

impl<M: Multivector + Logarithm> ReactiveMultivector<M> {
    /// Logarithm
    pub fn log(&self) -> Self {
        Self::new(self.inner.log())
    }
}

impl<M: Multivector + GradeSelection> ReactiveMultivector<M> {
    /// Grade projection
    pub fn grade(&self, k: usize) -> Self {
        Self::new(self.inner.grade(k))
    }

    /// Scalar part (grade 0)
    pub fn scalar(&self) -> Self {
        self.grade(0)
    }

    /// Vector part (grade 1)  
    pub fn vector(&self) -> Self {
        self.grade(1)
    }

    /// Bivector part (grade 2)
    pub fn bivector(&self) -> Self {
        self.grade(2)
    }
}

/// Global version counter for tracking changes
static VERSION_COUNTER: AtomicU64 = AtomicU64::new(0);

fn next_version() -> u64 {
    VERSION_COUNTER.fetch_add(1, Ordering::Relaxed)
}

/// Cliffy-specific constructors for common geometric algebra operations
pub mod constructors {
    use super::*;
    use amari_core::scalar_traits::Float;

    /// Create a reactive scalar multivector
    pub fn scalar<T: Float>(value: T) -> ReactiveMultivector<GA3<T>> {
        ReactiveMultivector::new(GA3::scalar(value))
    }

    /// Create a reactive 3D vector
    pub fn vector3d<T: Float>(x: T, y: T, z: T) -> ReactiveMultivector<GA3<T>> {
        ReactiveMultivector::new(GA3::vector([x, y, z]))
    }

    /// Create a reactive rotor from angle and bivector
    pub fn rotor<T: Float>(angle: T, bivector: &GA3<T>) -> ReactiveMultivector<GA3<T>> {
        let half_angle = angle / T::from(2.0).unwrap();
        let rotor = GA3::scalar(half_angle.cos()) + bivector.normalized() * half_angle.sin();
        ReactiveMultivector::new(rotor)
    }

    /// Create a reactive conformal point
    pub fn conformal_point<T: Float>(x: T, y: T, z: T) -> ReactiveMultivector<GA4_1<T>> {
        ReactiveMultivector::new(GA4_1::point([x, y, z]))
    }

    /// Create a reactive spacetime interval
    pub fn spacetime_interval<T: Float>(
        t: T, x: T, y: T, z: T
    ) -> ReactiveMultivector<GA4_4<T>> {
        ReactiveMultivector::new(GA4_4::spacetime_vector([t, x, y, z]))
    }
}

/// Interpolation utilities for reactive multivectors
pub mod interpolation {
    use super::*;
    use amari_core::scalar_traits::Float;

    /// Linear interpolation between two reactive multivectors
    pub fn lerp<M: Multivector + Clone>(
        a: &ReactiveMultivector<M>,
        b: &ReactiveMultivector<M>, 
        t: M::Scalar
    ) -> ReactiveMultivector<M>
    where
        M::Scalar: Float,
        M: std::ops::Add<Output = M> + std::ops::Mul<M::Scalar, Output = M>,
    {
        let one_minus_t = M::Scalar::one() - t;
        let result = a.inner.clone() * one_minus_t + b.inner.clone() * t;
        ReactiveMultivector::new(result)
    }

    /// Spherical linear interpolation for rotors
    pub fn slerp<T: Float>(
        a: &ReactiveMultivector<GA3<T>>,
        b: &ReactiveMultivector<GA3<T>>,
        t: T
    ) -> ReactiveMultivector<GA3<T>> {
        // Use Amari's rotor slerp functionality
        let result = amari_fusion::slerp(&a.inner, &b.inner, t);
        ReactiveMultivector::new(result)
    }
}

/// Animation utilities for reactive multivectors
pub mod animation {
    use super::*;
    use std::time::{Duration, SystemTime};

    /// An animated reactive multivector that changes over time
    #[derive(Debug, Clone)]
    pub struct AnimatedMultivector<M: Multivector> {
        pub start: ReactiveMultivector<M>,
        pub end: ReactiveMultivector<M>,
        pub duration: Duration,
        pub start_time: SystemTime,
    }

    impl<M: Multivector + Clone> AnimatedMultivector<M> 
    where
        M: std::ops::Add<Output = M> + std::ops::Mul<M::Scalar, Output = M>,
        M::Scalar: amari_core::scalar_traits::Float,
    {
        /// Create a new animation between two values
        pub fn new(
            start: ReactiveMultivector<M>,
            end: ReactiveMultivector<M>,
            duration: Duration,
        ) -> Self {
            Self {
                start,
                end,
                duration,
                start_time: SystemTime::now(),
            }
        }

        /// Sample the animation at the current time
        pub fn sample(&self) -> ReactiveMultivector<M> {
            let elapsed = self.start_time.elapsed().unwrap_or(Duration::ZERO);
            let t = (elapsed.as_secs_f64() / self.duration.as_secs_f64()).min(1.0);
            let t_scalar = M::Scalar::from(t).unwrap_or(M::Scalar::zero());
            
            interpolation::lerp(&self.start, &self.end, t_scalar)
        }

        /// Check if the animation is complete
        pub fn is_complete(&self) -> bool {
            self.start_time.elapsed().unwrap_or(Duration::ZERO) >= self.duration
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::constructors::*;

    #[test]
    fn test_reactive_multivector_creation() {
        let scalar_mv = scalar(42.0);
        assert_eq!(scalar_mv.value().scalar_part(), 42.0);
    }

    #[test]
    fn test_reactive_multivector_versioning() {
        let mut mv = scalar(1.0);
        let initial_version = mv.version();
        
        mv.update(GA3::scalar(2.0));
        assert!(mv.version() > initial_version);
        assert!(mv.changed_since(initial_version));
    }

    #[test] 
    fn test_reactive_geometric_product() {
        let a = vector3d(1.0, 0.0, 0.0);
        let b = vector3d(0.0, 1.0, 0.0);
        let product = a.geometric_product(&b);
        
        // Should produce a bivector
        let bivector_part = product.bivector();
        assert!(bivector_part.value().magnitude() > 0.0);
    }

    #[test]
    fn test_interpolation() {
        let start = scalar(0.0);
        let end = scalar(10.0);
        let mid = interpolation::lerp(&start, &end, 0.5);
        
        assert_eq!(mid.value().scalar_part(), 5.0);
    }

    #[test]
    fn test_animation() {
        use std::time::Duration;
        
        let start = scalar(0.0);
        let end = scalar(10.0);
        let anim = animation::AnimatedMultivector::new(start, end, Duration::from_secs(1));
        
        let sample = anim.sample();
        assert!(sample.value().scalar_part() >= 0.0);
        assert!(sample.value().scalar_part() <= 10.0);
    }
}