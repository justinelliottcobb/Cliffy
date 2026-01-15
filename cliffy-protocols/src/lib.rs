//! Distributed consensus protocols using geometric algebra
//!
//! This crate provides CRDT and consensus implementations using Clifford algebra.
//!
//! # Key Components
//!
//! - [`GeometricCRDT`]: Operation-based CRDT with geometric transforms
//! - [`GeometricConsensus`]: Consensus protocol using geometric mean
//! - [`GeometricLattice`](lattice::GeometricLattice): Trait for lattice-based conflict resolution
//! - [`VectorClock`]: Causal ordering for distributed operations
//!
//! # Example
//!
//! ```rust
//! use cliffy_protocols::{GeometricCRDT, OperationType};
//! use cliffy_core::GA3;
//! use uuid::Uuid;
//!
//! let node_id = Uuid::new_v4();
//! let mut crdt = GeometricCRDT::new(node_id, GA3::scalar(0.0));
//!
//! // Apply a geometric transformation
//! let op = crdt.create_operation(GA3::scalar(5.0), OperationType::Addition);
//! crdt.apply_operation(op);
//! ```

use cliffy_core::GA3;

pub mod consensus;
pub mod crdt;
pub mod lattice;
pub mod serde_ga3;
pub mod vector_clock;

pub use consensus::*;
pub use crdt::*;
pub use lattice::{ComponentLattice, GA3Lattice, GeometricLattice};
pub use vector_clock::*;

/// Type alias for the default multivector type used in protocols
pub type ProtocolMultivector = GA3;
