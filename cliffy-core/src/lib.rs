//! # Cliffy Core
//!
//! Reactive UI framework with geometric algebra state management.
//!
//! Cliffy uses Clifford/Geometric Algebra as its mathematical foundation,
//! providing FRP-style reactive primitives where all state transformations
//! are geometric operations under the hood.
//!
//! ## Quick Start
//!
//! ```rust
//! use cliffy_core::{Behavior, behavior};
//!
//! // Create a reactive behavior (internally a GA3 multivector)
//! let count = behavior(0i32);
//!
//! // Sample the current value
//! assert_eq!(count.sample(), 0);
//!
//! // Update via transformation
//! count.update(|n| n + 1);
//! assert_eq!(count.sample(), 1);
//!
//! // Map to derived behavior
//! let doubled = count.map(|n| n * 2);
//! assert_eq!(doubled.sample(), 2);
//! ```
//!
//! ## Architecture
//!
//! - **Behavior<T>**: Time-varying values backed by geometric algebra
//! - **Event<T>**: Discrete occurrences with geometric transformations
//! - **Combinators**: `when`, `combine` for composition
//!
//! The geometric algebra foundation is hidden from users - they work with
//! familiar types like `i32`, `String`, `Vec<T>` while the framework
//! handles the mathematical transformations internally.

pub mod behavior;
pub mod combinators;
pub mod event;
pub mod geometric;

// Re-export main types
pub use behavior::{behavior, Behavior, Subscription};
pub use combinators::{combine, when};
pub use event::{event, Event};
pub use geometric::{FromGeometric, IntoGeometric, GA3};

// Re-export Amari types for advanced users
pub use amari_core::Multivector;
