//! Functional Reactive Programming for Cliffy using Amari geometric algebra

use cliffy_core::{ReactiveMultivector, GA3, GA4_1, GA4_4};
use amari_core::{Multivector, scalar_traits::Float};
use amari_fusion::GeometricProduct;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use tokio::sync::watch;

pub mod behavior;

pub use behavior::*;