use wasm_bindgen::prelude::*;
use js_sys::{Array, Object};
use web_sys::console;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

use cliffy_core::{Multivector, cl3_0, cl4_1};
use cliffy_frp::GeometricBehavior;
use cliffy_protocols::{GeometricCRDT, GeometricConsensus};

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub struct CliffySystem {
    node_id: Uuid,
}

#[wasm_bindgen]
impl CliffySystem {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CliffySystem {
        console_error_panic_hook::set_once();
        
        Self {
            node_id: Uuid::new_v4(),
        }
    }
    
    #[wasm_bindgen(getter)]
    pub fn node_id(&self) -> String {
        self.node_id.to_string()
    }
}

#[wasm_bindgen]
pub struct MultivectorJs {
    inner: cl3_0::Multivector3D<f64>,
}

#[wasm_bindgen]
impl MultivectorJs {
    #[wasm_bindgen(constructor)]
    pub fn new() -> MultivectorJs {
        Self {
            inner: cl3_0::Multivector3D::zero(),
        }
    }

    #[wasm_bindgen(js_name = fromScalar)]
    pub fn from_scalar(value: f64) -> MultivectorJs {
        Self {
            inner: cl3_0::Multivector3D::scalar(value),
        }
    }

    #[wasm_bindgen(js_name = fromCoeffs)]
    pub fn from_coeffs(coeffs: &[f64]) -> MultivectorJs {
        if coeffs.len() != 8 {
            panic!("Coefficients array must have exactly 8 elements");
        }
        
        let mut coeff_array = [0.0; 8];
        coeff_array.copy_from_slice(coeffs);
        
        Self {
            inner: cl3_0::Multivector3D::new(coeff_array.into()),
        }
    }

    #[wasm_bindgen(js_name = e1)]
    pub fn e1() -> MultivectorJs {
        Self {
            inner: cl3_0::e1(),
        }
    }

    #[wasm_bindgen(js_name = e2)]
    pub fn e2() -> MultivectorJs {
        Self {
            inner: cl3_0::e2(),
        }
    }

    #[wasm_bindgen(js_name = e3)]
    pub fn e3() -> MultivectorJs {
        Self {
            inner: cl3_0::e3(),
        }
    }

    #[wasm_bindgen(js_name = geometricProduct)]
    pub fn geometric_product(&self, other: &MultivectorJs) -> MultivectorJs {
        Self {
            inner: self.inner.geometric_product(&other.inner),
        }
    }

    #[wasm_bindgen]
    pub fn add(&self, other: &MultivectorJs) -> MultivectorJs {
        Self {
            inner: self.inner.clone() + other.inner.clone(),
        }
    }

    #[wasm_bindgen]
    pub fn subtract(&self, other: &MultivectorJs) -> MultivectorJs {
        Self {
            inner: self.inner.clone() - other.inner.clone(),
        }
    }

    #[wasm_bindgen]
    pub fn scale(&self, scalar: f64) -> MultivectorJs {
        Self {
            inner: self.inner.scale(scalar),
        }
    }

    #[wasm_bindgen]
    pub fn magnitude(&self) -> f64 {
        self.inner.magnitude()
    }

    #[wasm_bindgen]
    pub fn normalize(&self) -> MultivectorJs {
        Self {
            inner: self.inner.normalize(),
        }
    }

    #[wasm_bindgen]
    pub fn exp(&self) -> MultivectorJs {
        Self {
            inner: self.inner.exp(),
        }
    }

    #[wasm_bindgen]
    pub fn log(&self) -> MultivectorJs {
        Self {
            inner: self.inner.log(),
        }
    }

    #[wasm_bindgen]
    pub fn sandwich(&self, x: &MultivectorJs) -> MultivectorJs {
        Self {
            inner: self.inner.sandwich(&x.inner),
        }
    }

    #[wasm_bindgen(js_name = gradeProjection)]
    pub fn grade_projection(&self, grade: usize) -> MultivectorJs {
        Self {
            inner: self.inner.grade_projection(grade),
        }
    }

    #[wasm_bindgen(js_name = getCoeffs)]
    pub fn get_coeffs(&self) -> Vec<f64> {
        self.inner.coeffs.as_slice().to_vec()
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string_js(&self) -> String {
        format!("{:?}", self.inner)
    }
}

#[wasm_bindgen]
pub fn create_rotor(angle: f64, bivector: &MultivectorJs) -> MultivectorJs {
    MultivectorJs {
        inner: cl3_0::rotor(angle, &bivector.inner),
    }
}

#[wasm_bindgen]
pub struct GeometricBehaviorJs {
    #[wasm_bindgen(skip)]
    pub inner: std::sync::Arc<std::sync::Mutex<Option<GeometricBehavior<f64, 8>>>>,
}

#[wasm_bindgen]
impl GeometricBehaviorJs {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_value: &MultivectorJs) -> GeometricBehaviorJs {
        Self {
            inner: std::sync::Arc::new(std::sync::Mutex::new(Some(
                GeometricBehavior::new(initial_value.inner.clone())
            ))),
        }
    }

    #[wasm_bindgen]
    pub fn sample(&self) -> MultivectorJs {
        let guard = self.inner.lock().unwrap();
        if let Some(ref behavior) = *guard {
            MultivectorJs {
                inner: behavior.sample(),
            }
        } else {
            MultivectorJs::new()
        }
    }

    #[wasm_bindgen]
    pub fn update(&self, new_value: &MultivectorJs) {
        let guard = self.inner.lock().unwrap();
        if let Some(ref behavior) = *guard {
            behavior.update(new_value.inner.clone());
        }
    }

    #[wasm_bindgen(js_name = transformWith)]
    pub fn transform_with(&self, transformer: &js_sys::Function) -> GeometricBehaviorJs {
        let guard = self.inner.lock().unwrap();
        if let Some(ref behavior) = *guard {
            let transformed = behavior.transform(move |mv| {
                let js_mv = MultivectorJs { inner: mv.clone() };
                let result = transformer.call1(&JsValue::NULL, &JsValue::from(js_mv)).unwrap();
                let result_mv: MultivectorJs = result.into_serde().unwrap();
                result_mv.inner
            });

            GeometricBehaviorJs {
                inner: std::sync::Arc::new(std::sync::Mutex::new(Some(transformed))),
            }
        } else {
            GeometricBehaviorJs::new(&MultivectorJs::new())
        }
    }
}

#[wasm_bindgen]
pub struct ConformalMultivectorJs {
    inner: cl4_1::ConformalMultivector<f64>,
}

#[wasm_bindgen]
impl ConformalMultivectorJs {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ConformalMultivectorJs {
        Self {
            inner: cl4_1::ConformalMultivector::zero(),
        }
    }

    #[wasm_bindgen(js_name = createPoint)]
    pub fn create_point(x: f64, y: f64, z: f64) -> ConformalMultivectorJs {
        Self {
            inner: cl4_1::point(x, y, z),
        }
    }

    #[wasm_bindgen(js_name = geometricProduct)]
    pub fn geometric_product(&self, other: &ConformalMultivectorJs) -> ConformalMultivectorJs {
        Self {
            inner: self.inner.geometric_product(&other.inner),
        }
    }

    #[wasm_bindgen]
    pub fn magnitude(&self) -> f64 {
        self.inner.magnitude()
    }

    #[wasm_bindgen(js_name = getCoeffs)]
    pub fn get_coeffs(&self) -> Vec<f64> {
        self.inner.coeffs.as_slice().to_vec()
    }
}

#[wasm_bindgen]
pub struct GeometricCRDTJs {
    inner: GeometricCRDT<f64, 8>,
}

#[wasm_bindgen]
impl GeometricCRDTJs {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_state: &MultivectorJs) -> GeometricCRDTJs {
        Self {
            inner: GeometricCRDT::new(Uuid::new_v4(), initial_state.inner.clone()),
        }
    }

    #[wasm_bindgen(js_name = getCurrentState)]
    pub fn get_current_state(&self) -> MultivectorJs {
        MultivectorJs {
            inner: self.inner.state.clone(),
        }
    }

    #[wasm_bindgen(js_name = createOperation)]
    pub fn create_operation(&mut self, transform: &MultivectorJs, op_type: &str) -> String {
        let operation_type = match op_type {
            "geometric_product" => cliffy_protocols::OperationType::GeometricProduct,
            "addition" => cliffy_protocols::OperationType::Addition,
            "sandwich" => cliffy_protocols::OperationType::Sandwich,
            "exponential" => cliffy_protocols::OperationType::Exponential,
            _ => cliffy_protocols::OperationType::Addition,
        };

        let op = self.inner.create_operation(transform.inner.clone(), operation_type);
        serde_json::to_string(&op).unwrap_or_default()
    }

    #[wasm_bindgen(js_name = applyOperation)]
    pub fn apply_operation(&mut self, operation_json: &str) {
        if let Ok(op) = serde_json::from_str(operation_json) {
            self.inner.apply_operation(op);
        }
    }

    #[wasm_bindgen]
    pub fn merge(&mut self, other: &GeometricCRDTJs) -> GeometricCRDTJs {
        let merged = self.inner.merge(&other.inner);
        GeometricCRDTJs { inner: merged }
    }
}

// WebRTC and P2P utilities
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window"], js_name = RTCPeerConnection)]
    type RtcPeerConnection;
}

#[wasm_bindgen]
pub fn init_webrtc_peer() -> Result<JsValue, JsValue> {
    let mut config = Object::new();
    js_sys::Reflect::set(&config, &"iceServers".into(), &Array::new())?;
    
    console_log!("WebRTC peer connection initialized for Cliffy");
    Ok(config.into())
}

// Performance monitoring
#[wasm_bindgen]
pub fn benchmark_geometric_product(size: usize, iterations: usize) -> f64 {
    let mv1 = cl3_0::Multivector3D::scalar(1.0) + cl3_0::e1::<f64>();
    let mv2 = cl3_0::Multivector3D::scalar(2.0) + cl3_0::e2::<f64>();
    
    let start = web_sys::window()
        .unwrap()
        .performance()
        .unwrap()
        .now();

    for _ in 0..iterations {
        let _result = mv1.geometric_product(&mv2);
    }

    let end = web_sys::window()
        .unwrap()
        .performance()
        .unwrap()
        .now();

    (end - start) / iterations as f64
}

// Utility functions for JavaScript integration
#[wasm_bindgen]
pub fn cliffy_version() -> String {
    "0.1.0".to_string()
}

#[wasm_bindgen]
pub fn is_simd_supported() -> bool {
    cfg!(feature = "simd")
}

// Export panic hook for better debugging
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    console_log!("Cliffy WASM module initialized");
}