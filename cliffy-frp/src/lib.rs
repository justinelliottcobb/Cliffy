use cliffy_core::{Multivector, cl4_1::ConformalMultivector};
use num_traits::Float;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use tokio::sync::watch;

pub mod behavior;

pub use behavior::*;