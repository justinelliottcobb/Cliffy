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

/// Serializable wrapper for Multivector
///
/// Since Amari's Multivector doesn't implement Serialize/Deserialize,
/// this wrapper provides serialization by converting to/from coefficient arrays.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SerializableMultivector<const P: usize, const Q: usize, const R: usize> {
    coefficients: Vec<f64>,
}

impl<const P: usize, const Q: usize, const R: usize> SerializableMultivector<P, Q, R> {
    const BASIS_COUNT: usize = 1 << (P + Q + R);

    /// Create from a Multivector
    pub fn from_multivector(mv: &Multivector<P, Q, R>) -> Self {
        let coefficients = (0..Self::BASIS_COUNT)
            .map(|i| mv.get(i))
            .collect();
        Self { coefficients }
    }

    /// Convert to a Multivector
    pub fn to_multivector(&self) -> Multivector<P, Q, R> {
        Multivector::from_coefficients(self.coefficients.clone())
    }
}

impl<const P: usize, const Q: usize, const R: usize> From<Multivector<P, Q, R>> for SerializableMultivector<P, Q, R> {
    fn from(mv: Multivector<P, Q, R>) -> Self {
        Self::from_multivector(&mv)
    }
}

impl<const P: usize, const Q: usize, const R: usize> From<SerializableMultivector<P, Q, R>> for Multivector<P, Q, R> {
    fn from(smv: SerializableMultivector<P, Q, R>) -> Self {
        smv.to_multivector()
    }
}

/// Phantom type marker module for compile-time type safety
pub mod phantom {
    use std::marker::PhantomData;

    /// Phantom type marker for cell types
    pub trait CellTypeMarker: Send + Sync {}

    /// Marker for button cells
    pub struct ButtonCell;
    impl CellTypeMarker for ButtonCell {}

    /// Marker for input field cells
    pub struct InputCell;
    impl CellTypeMarker for InputCell {}

    /// Marker for text cells
    pub struct TextCell;
    impl CellTypeMarker for TextCell {}

    /// Marker for container cells
    pub struct ContainerCell;
    impl CellTypeMarker for ContainerCell {}

    /// Marker for generic cells
    pub struct GenericCell;
    impl CellTypeMarker for GenericCell {}

    /// Phantom type marker for lifecycle stages
    pub trait LifecycleStageMarker: Send + Sync {}

    /// Marker for embryonic stage
    pub struct Embryonic;
    impl LifecycleStageMarker for Embryonic {}

    /// Marker for juvenile stage
    pub struct Juvenile;
    impl LifecycleStageMarker for Juvenile {}

    /// Marker for adult stage
    pub struct Adult;
    impl LifecycleStageMarker for Adult {}

    /// Marker for elder stage
    pub struct Elder;
    impl LifecycleStageMarker for Elder {}

    /// Marker for senescent stage
    pub struct Senescent;
    impl LifecycleStageMarker for Senescent {}

    /// Type-safe cell with phantom markers
    #[derive(Debug, Clone)]
    pub struct TypedCell<T: CellTypeMarker, L: LifecycleStageMarker> {
        _cell_type: PhantomData<T>,
        _lifecycle: PhantomData<L>,
    }

    impl<T: CellTypeMarker, L: LifecycleStageMarker> Default for TypedCell<T, L> {
        fn default() -> Self {
            Self {
                _cell_type: PhantomData,
                _lifecycle: PhantomData,
            }
        }
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

    /// Normalize a multivector, returning zero if magnitude is too small
    ///
    /// Wrapper around Amari's normalize() which returns Option.
    /// Returns zero multivector if normalization fails.
    pub fn normalize_or_zero<const P: usize, const Q: usize, const R: usize>(
        mv: &Multivector<P, Q, R>,
    ) -> Multivector<P, Q, R> {
        mv.normalize().unwrap_or_else(|| Multivector::zero())
    }

    /// Normalize a multivector, returning self if magnitude is too small
    ///
    /// Wrapper around Amari's normalize() which returns Option.
    /// Returns a clone of self if normalization fails.
    pub fn normalize_or_self<const P: usize, const Q: usize, const R: usize>(
        mv: &Multivector<P, Q, R>,
    ) -> Multivector<P, Q, R> {
        mv.normalize().unwrap_or_else(|| mv.clone())
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
