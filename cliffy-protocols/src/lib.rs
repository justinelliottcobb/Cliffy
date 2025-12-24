use cliffy_core::Multivector;
use cliffy_frp::GeometricBehavior;
use num_traits::Float;
use serde::{Deserialize, Serialize};

pub mod consensus;
pub mod crdt;
pub mod vector_clock;

pub use consensus::*;
pub use crdt::*;
pub use vector_clock::*;
