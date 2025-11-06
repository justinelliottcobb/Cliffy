//! Cliffy Core - Reactive Geometric Algebra Framework
//!
//! This crate provides the core reactive wrappers around Amari's geometric algebra types.
//!
//! # Dependency Strategy
//!
//! Cliffy uses **Amari** for all geometric algebra operations:
//! - `amari-core` - Provides Multivector<P,Q,R> geometric algebra types
//! - `amari-fusion` - Provides fusion systems for LLM evaluation
//!
//! This crate provides only the **reactive layer** on top of Amari's types,
//! allowing UI components to observe and react to geometric state changes.

use serde::{Deserialize, Serialize};

// Re-export Amari types for convenience
pub use amari_core::{Multivector, Vector};

// Common geometric algebra type aliases
/// 3D Euclidean geometric algebra Cl(3,0)
pub type GA3 = Multivector<3, 0, 0>;

/// Conformal geometric algebra Cl(4,1)
pub type GA4_1 = Multivector<4, 1, 0>;

/// Spacetime algebra Cl(1,3) - Minkowski signature
pub type STA = Multivector<1, 3, 0>;

// Re-export scalar traits module
pub mod scalar_traits {
    pub use num_traits::Float;
}

// Re-export precision types from Amari
pub use amari_core::{ExtendedFloat, PrecisionFloat, StandardFloat};

/// Reactive wrapper around Amari geometric algebra types
///
/// This provides a reactive/observable interface to Amari's multivector types,
/// allowing UI components to automatically update when geometric state changes.
///
/// # Example
///
/// ```ignore
/// use cliffy_core::ReactiveMultivector;
/// use amari_core::GA3;
///
/// let position = ReactiveMultivector::new(GA3::scalar(0.0));
/// ```
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReactiveMultivector<T> {
    value: T,
    // Future: add observers, change tracking, etc.
}

impl<T> ReactiveMultivector<T> {
    /// Create a new reactive multivector
    pub fn new(value: T) -> Self {
        Self { value }
    }

    /// Get a reference to the current value
    pub fn get(&self) -> &T {
        &self.value
    }

    /// Set a new value
    pub fn set(&mut self, value: T) {
        self.value = value;
        // Future: notify observers
    }

    /// Map a function over the value
    pub fn map<U, F>(self, f: F) -> ReactiveMultivector<U>
    where
        F: FnOnce(T) -> U,
    {
        ReactiveMultivector::new(f(self.value))
    }

    /// Update the value with a function
    pub fn update<F>(&mut self, f: F)
    where
        F: FnOnce(&mut T),
    {
        f(&mut self.value);
        // Future: notify observers
    }

    /// Consume the reactive wrapper and return the inner value
    pub fn into_inner(self) -> T {
        self.value
    }
}

impl<T: Clone> ReactiveMultivector<T> {
    /// Get a cloned value
    pub fn value(&self) -> T {
        self.value.clone()
    }

    /// Sample the current value (alias for value())
    pub fn sample(&self) -> T {
        self.value.clone()
    }

    /// Set value using a function
    pub fn set_value<F>(&mut self, f: F)
    where
        F: FnOnce(T) -> T,
    {
        self.value = f(self.value.clone());
        // Future: notify observers
    }
}

/// Extension trait for Multivector operations not in Amari core
pub trait MultivectorExt<const P: usize, const Q: usize, const R: usize> {
    /// Get the magnitude squared
    fn magnitude_squared(&self) -> f64;

    /// Get the magnitude
    fn magnitude(&self) -> f64 {
        self.magnitude_squared().sqrt()
    }

    /// Normalize the multivector
    fn normalized(&self) -> Self;

    /// Dot product (grade-0 part of geometric product)
    fn dot(&self, other: &Self) -> f64;
}

impl<const P: usize, const Q: usize, const R: usize> MultivectorExt<P, Q, R> for Multivector<P, Q, R> {
    fn magnitude_squared(&self) -> f64 {
        // Compute norm using geometric product with reverse
        let product = self.geometric_product(self);
        product.scalar_part()
    }

    fn normalized(&self) -> Self {
        let mag = self.magnitude();
        if mag > f64::EPSILON {
            self.clone() * (1.0 / mag)
        } else {
            self.clone()
        }
    }

    fn dot(&self, other: &Self) -> f64 {
        // Dot product is the scalar part of the geometric product
        let product = self.geometric_product(other);
        product.scalar_part()
    }
}

/// Helper functions for creating geometric algebra objects
pub mod ga_helpers {
    use super::*;

    /// Create a 3D vector from components
    pub fn vector3(x: f64, y: f64, z: f64) -> GA3 {
        // Create vector by setting the e1, e2, e3 components
        use amari_core::Vector;
        let vec = Vector::<3, 0, 0>::from_components(x, y, z);
        Multivector::from_vector(&vec)
    }

    /// Create a scalar multivector
    pub fn scalar<const P: usize, const Q: usize, const R: usize>(value: f64) -> Multivector<P, Q, R> {
        Multivector::scalar(value)
    }

    /// Divide a multivector by a scalar (helper function to work around orphan rules)
    pub fn div_scalar<const P: usize, const Q: usize, const R: usize>(
        mv: &Multivector<P, Q, R>,
        scalar: f64,
    ) -> Multivector<P, Q, R> {
        mv * (1.0 / scalar)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reactive_multivector() {
        let mut reactive = ReactiveMultivector::new(42);
        assert_eq!(*reactive.get(), 42);

        reactive.set(100);
        assert_eq!(*reactive.get(), 100);

        reactive.update(|v| *v += 1);
        assert_eq!(*reactive.get(), 101);
    }

    #[test]
    fn test_reactive_map() {
        let reactive = ReactiveMultivector::new(10);
        let mapped = reactive.map(|v| v * 2);
        assert_eq!(*mapped.get(), 20);
    }
}
