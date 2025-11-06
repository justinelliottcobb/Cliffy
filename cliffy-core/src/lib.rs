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
pub use amari_core::Multivector;

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
