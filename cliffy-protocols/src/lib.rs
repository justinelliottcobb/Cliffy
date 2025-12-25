//! Distributed consensus protocols using geometric algebra
//!
//! This crate provides CRDT and consensus implementations using Clifford algebra.

use cliffy_core::GA3;

pub mod consensus;
pub mod crdt;
pub mod serde_ga3;
pub mod vector_clock;

pub use consensus::*;
pub use crdt::*;
pub use vector_clock::*;

/// Type alias for the default multivector type used in protocols
pub type ProtocolMultivector = GA3;
