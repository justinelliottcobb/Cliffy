//! WebAssembly integration tests for Cliffy
//!
//! Run with: wasm-pack test --headless --firefox
//! Or: wasm-pack test --headless --chrome

#![cfg(target_arch = "wasm32")]

use wasm_bindgen::prelude::*;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

// ============================================================================
// Behavior Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_behavior_creation() {
    use cliffy_wasm::Behavior;

    // Create a behavior with initial value
    let behavior = Behavior::new(JsValue::from(42));
    let sampled = behavior.sample();

    assert_eq!(sampled.as_f64().unwrap(), 42.0);
}

#[wasm_bindgen_test]
fn test_behavior_set() {
    use cliffy_wasm::Behavior;

    let behavior = Behavior::new(JsValue::from(0));

    // Set to a new value
    behavior.set(JsValue::from(100));

    let sampled = behavior.sample();
    assert_eq!(sampled.as_f64().unwrap(), 100.0);
}

#[wasm_bindgen_test]
fn test_behavior_update() {
    use cliffy_wasm::Behavior;
    use js_sys::Function;

    let behavior = Behavior::new(JsValue::from(10));

    // Create an update function: n => n * 2
    let update_fn = Function::new_with_args("n", "return n * 2");

    behavior.update(&update_fn).unwrap();

    let sampled = behavior.sample();
    assert_eq!(sampled.as_f64().unwrap(), 20.0);
}

#[wasm_bindgen_test]
fn test_behavior_map() {
    use cliffy_wasm::Behavior;
    use js_sys::Function;

    let behavior = Behavior::new(JsValue::from(5));

    // Map function: n => n * 3
    let map_fn = Function::new_with_args("n", "return n * 3");

    let mapped = behavior.map(&map_fn).unwrap();

    // Mapped behavior should have the transformed value
    assert_eq!(mapped.sample().as_f64().unwrap(), 15.0);

    // Update original
    behavior.set(JsValue::from(10));

    // Mapped should update too
    assert_eq!(mapped.sample().as_f64().unwrap(), 30.0);
}

#[wasm_bindgen_test]
fn test_behavior_combine() {
    use cliffy_wasm::Behavior;
    use js_sys::Function;

    let a = Behavior::new(JsValue::from(10));
    let b = Behavior::new(JsValue::from(5));

    // Combine function: (x, y) => x + y
    let combine_fn = Function::new_with_args("x, y", "return x + y");

    let combined = a.combine(&b, &combine_fn).unwrap();

    assert_eq!(combined.sample().as_f64().unwrap(), 15.0);

    // Update a
    a.set(JsValue::from(20));
    assert_eq!(combined.sample().as_f64().unwrap(), 25.0);

    // Update b
    b.set(JsValue::from(10));
    assert_eq!(combined.sample().as_f64().unwrap(), 30.0);
}

#[wasm_bindgen_test]
fn test_behavior_subscribe() {
    use cliffy_wasm::Behavior;
    use js_sys::Function;
    use std::cell::RefCell;
    use std::rc::Rc;
    use wasm_bindgen::closure::Closure;

    let behavior = Behavior::new(JsValue::from(0));

    // Create a cell to track callback invocations
    let call_count = Rc::new(RefCell::new(0));
    let call_count_clone = call_count.clone();

    let callback = Closure::wrap(Box::new(move |_: JsValue| {
        *call_count_clone.borrow_mut() += 1;
    }) as Box<dyn Fn(JsValue)>);

    let callback_fn: &Function = callback.as_ref().unchecked_ref();
    let _subscription = behavior.subscribe(callback_fn.clone());

    // Update should trigger callback
    behavior.set(JsValue::from(1));
    behavior.set(JsValue::from(2));

    // Should have been called twice for the two sets
    assert_eq!(*call_count.borrow(), 2);

    callback.forget();
}

// ============================================================================
// Event Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_event_creation() {
    use cliffy_wasm::Event;

    // Should create without panic
    let _event = Event::new();
}

#[wasm_bindgen_test]
fn test_event_emit_and_subscribe() {
    use cliffy_wasm::Event;
    use std::cell::RefCell;
    use std::rc::Rc;
    use wasm_bindgen::closure::Closure;

    let event = Event::new();

    let received = Rc::new(RefCell::new(Vec::new()));
    let received_clone = received.clone();

    let callback = Closure::wrap(Box::new(move |value: JsValue| {
        received_clone.borrow_mut().push(value.as_f64().unwrap());
    }) as Box<dyn Fn(JsValue)>);

    let callback_fn: &js_sys::Function = callback.as_ref().unchecked_ref();
    let _subscription = event.subscribe(callback_fn.clone());

    // Emit some values
    event.emit(JsValue::from(1));
    event.emit(JsValue::from(2));
    event.emit(JsValue::from(3));

    let values = received.borrow();
    assert_eq!(*values, vec![1.0, 2.0, 3.0]);

    callback.forget();
}

#[wasm_bindgen_test]
fn test_event_map() {
    use cliffy_wasm::Event;
    use js_sys::Function;
    use std::cell::RefCell;
    use std::rc::Rc;
    use wasm_bindgen::closure::Closure;

    let event = Event::new();

    // Map function: n => n * 2
    let map_fn = Function::new_with_args("n", "return n * 2");
    let mapped = event.map(&map_fn);

    let received = Rc::new(RefCell::new(Vec::new()));
    let received_clone = received.clone();

    let callback = Closure::wrap(Box::new(move |value: JsValue| {
        received_clone.borrow_mut().push(value.as_f64().unwrap());
    }) as Box<dyn Fn(JsValue)>);

    let callback_fn: &js_sys::Function = callback.as_ref().unchecked_ref();
    let _subscription = mapped.subscribe(callback_fn.clone());

    event.emit(JsValue::from(5));
    event.emit(JsValue::from(10));

    let values = received.borrow();
    assert_eq!(*values, vec![10.0, 20.0]);

    callback.forget();
}

#[wasm_bindgen_test]
fn test_event_filter() {
    use cliffy_wasm::Event;
    use js_sys::Function;
    use std::cell::RefCell;
    use std::rc::Rc;
    use wasm_bindgen::closure::Closure;

    let event = Event::new();

    // Filter function: n => n > 5
    let filter_fn = Function::new_with_args("n", "return n > 5");
    let filtered = event.filter(&filter_fn);

    let received = Rc::new(RefCell::new(Vec::new()));
    let received_clone = received.clone();

    let callback = Closure::wrap(Box::new(move |value: JsValue| {
        received_clone.borrow_mut().push(value.as_f64().unwrap());
    }) as Box<dyn Fn(JsValue)>);

    let callback_fn: &js_sys::Function = callback.as_ref().unchecked_ref();
    let _subscription = filtered.subscribe(callback_fn.clone());

    event.emit(JsValue::from(3));
    event.emit(JsValue::from(7));
    event.emit(JsValue::from(4));
    event.emit(JsValue::from(10));

    let values = received.borrow();
    assert_eq!(*values, vec![7.0, 10.0]);

    callback.forget();
}

#[wasm_bindgen_test]
fn test_event_fold() {
    use cliffy_wasm::Event;
    use js_sys::Function;

    let event = Event::new();

    // Fold function: (acc, n) => acc + n
    let fold_fn = Function::new_with_args("acc, n", "return acc + n");
    let sum = event.fold(JsValue::from(0), &fold_fn).unwrap();

    event.emit(JsValue::from(1));
    event.emit(JsValue::from(2));
    event.emit(JsValue::from(3));

    assert_eq!(sum.sample().as_f64().unwrap(), 6.0);
}

#[wasm_bindgen_test]
fn test_event_merge() {
    use cliffy_wasm::Event;
    use std::cell::RefCell;
    use std::rc::Rc;
    use wasm_bindgen::closure::Closure;

    let event1 = Event::new();
    let event2 = Event::new();

    let merged = event1.merge(&event2);

    let received = Rc::new(RefCell::new(Vec::new()));
    let received_clone = received.clone();

    let callback = Closure::wrap(Box::new(move |value: JsValue| {
        received_clone.borrow_mut().push(value.as_f64().unwrap());
    }) as Box<dyn Fn(JsValue)>);

    let callback_fn: &js_sys::Function = callback.as_ref().unchecked_ref();
    let _subscription = merged.subscribe(callback_fn.clone());

    event1.emit(JsValue::from(1));
    event2.emit(JsValue::from(2));
    event1.emit(JsValue::from(3));

    let values = received.borrow();
    assert_eq!(*values, vec![1.0, 2.0, 3.0]);

    callback.forget();
}

// ============================================================================
// Combinator Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_when_combinator() {
    use cliffy_wasm::{when, Behavior};
    use js_sys::Function;

    let condition = Behavior::new(JsValue::from(true));
    let then_fn = Function::new_no_args("return 'visible'");

    let result = when(&condition, &then_fn).unwrap();

    // When true, should have the value
    assert_eq!(result.sample().as_string().unwrap(), "visible");

    // When false, should be null
    condition.set(JsValue::from(false));
    assert!(result.sample().is_null());
}

#[wasm_bindgen_test]
fn test_if_else_combinator() {
    use cliffy_wasm::{if_else, Behavior};
    use js_sys::Function;

    let condition = Behavior::new(JsValue::from(true));
    let then_fn = Function::new_no_args("return 'yes'");
    let else_fn = Function::new_no_args("return 'no'");

    let result = if_else(&condition, &then_fn, &else_fn).unwrap();

    assert_eq!(result.sample().as_string().unwrap(), "yes");

    condition.set(JsValue::from(false));
    assert_eq!(result.sample().as_string().unwrap(), "no");
}

#[wasm_bindgen_test]
fn test_combine_function() {
    use cliffy_wasm::{combine, Behavior};
    use js_sys::Function;

    let a = Behavior::new(JsValue::from(10));
    let b = Behavior::new(JsValue::from(20));
    let f = Function::new_with_args("x, y", "return x * y");

    let result = combine(&a, &b, &f).unwrap();

    assert_eq!(result.sample().as_f64().unwrap(), 200.0);
}

#[wasm_bindgen_test]
fn test_constant_and_behavior_functions() {
    use cliffy_wasm::{behavior, constant};

    let c = constant(JsValue::from(42));
    assert_eq!(c.sample().as_f64().unwrap(), 42.0);

    let b = behavior(JsValue::from(100));
    assert_eq!(b.sample().as_f64().unwrap(), 100.0);
}

// ============================================================================
// Geometric State Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_geometric_state_from_scalar() {
    use cliffy_wasm::GeometricState;

    let state = GeometricState::from_scalar(42.0);
    assert_eq!(state.scalar(), 42.0);
}

#[wasm_bindgen_test]
fn test_geometric_state_from_vector() {
    use cliffy_wasm::GeometricState;

    let state = GeometricState::from_vector(1.0, 2.0, 3.0);
    let vec = state.as_vector();

    assert_eq!(vec.len(), 3);
    assert!((vec[0] - 1.0).abs() < 1e-10);
    assert!((vec[1] - 2.0).abs() < 1e-10);
    assert!((vec[2] - 3.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_geometric_state_magnitude() {
    use cliffy_wasm::GeometricState;

    let state = GeometricState::from_vector(3.0, 4.0, 0.0);
    let mag = state.magnitude();

    assert!((mag - 5.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_geometric_state_scale() {
    use cliffy_wasm::GeometricState;

    let state = GeometricState::from_vector(1.0, 2.0, 3.0);
    let scaled = state.scale(2.0);
    let vec = scaled.as_vector();

    assert!((vec[0] - 2.0).abs() < 1e-10);
    assert!((vec[1] - 4.0).abs() < 1e-10);
    assert!((vec[2] - 6.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_geometric_state_lerp() {
    use cliffy_wasm::GeometricState;

    let a = GeometricState::from_vector(0.0, 0.0, 0.0);
    let b = GeometricState::from_vector(10.0, 10.0, 10.0);

    let mid = a.lerp(&b, 0.5);
    let vec = mid.as_vector();

    assert!((vec[0] - 5.0).abs() < 1e-10);
    assert!((vec[1] - 5.0).abs() < 1e-10);
    assert!((vec[2] - 5.0).abs() < 1e-10);
}

// ============================================================================
// Rotor Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_rotor_identity() {
    use cliffy_wasm::Rotor;

    let identity = Rotor::identity();
    assert!(identity.angle().abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_rotor_xy_rotation() {
    use cliffy_wasm::{GeometricState, Rotor};
    use std::f64::consts::PI;

    // 90-degree rotation in XY plane
    let rotor = Rotor::xy(PI / 2.0);

    // Rotate (1, 0, 0)
    let state = GeometricState::from_vector(1.0, 0.0, 0.0);
    let rotated = state.apply_rotor(&rotor);
    let vec = rotated.as_vector();

    // Should become approximately (0, 1, 0)
    assert!(vec[0].abs() < 1e-10);
    assert!((vec[1] - 1.0).abs() < 1e-10);
    assert!(vec[2].abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_rotor_xz_rotation() {
    use cliffy_wasm::{GeometricState, Rotor};
    use std::f64::consts::PI;

    // 90-degree rotation in XZ plane
    let rotor = Rotor::xz(PI / 2.0);

    // Rotate (1, 0, 0)
    let state = GeometricState::from_vector(1.0, 0.0, 0.0);
    let rotated = state.apply_rotor(&rotor);
    let vec = rotated.as_vector();

    // Should become approximately (0, 0, -1)
    assert!(vec[0].abs() < 1e-10);
    assert!(vec[1].abs() < 1e-10);
    assert!((vec[2] + 1.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_rotor_composition() {
    use cliffy_wasm::Rotor;
    use std::f64::consts::PI;

    let r1 = Rotor::xy(PI / 4.0); // 45 degrees
    let r2 = Rotor::xy(PI / 4.0); // 45 degrees

    let composed = r1.then(&r2);

    // Combined should be 90 degrees
    assert!((composed.angle() - PI / 2.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_rotor_inverse() {
    use cliffy_wasm::{GeometricState, Rotor};
    use std::f64::consts::PI;

    let rotor = Rotor::xy(PI / 3.0);
    let inverse = rotor.inverse();

    // Apply rotor then inverse should give identity
    let state = GeometricState::from_vector(1.0, 2.0, 3.0);
    let rotated = state.apply_rotor(&rotor);
    let back = rotated.apply_rotor(&inverse);

    let original = state.as_vector();
    let result = back.as_vector();

    assert!((result[0] - original[0]).abs() < 1e-10);
    assert!((result[1] - original[1]).abs() < 1e-10);
    assert!((result[2] - original[2]).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_rotor_slerp() {
    use cliffy_wasm::Rotor;
    use std::f64::consts::PI;

    let rotor = Rotor::xy(PI);

    // Halfway interpolation
    let half = rotor.slerp(0.5);

    // Should be 90 degrees
    assert!((half.angle() - PI / 2.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_rotor_from_axis_angle() {
    use cliffy_wasm::{GeometricState, Rotor};
    use std::f64::consts::PI;

    // Rotation around Z axis (equivalent to XY plane rotation)
    let rotor = Rotor::from_axis_angle(0.0, 0.0, 1.0, PI / 2.0);

    let state = GeometricState::from_vector(1.0, 0.0, 0.0);
    let rotated = state.apply_rotor(&rotor);
    let vec = rotated.as_vector();

    // Should become approximately (0, 1, 0)
    assert!(vec[0].abs() < 1e-10);
    assert!((vec[1] - 1.0).abs() < 1e-10);
    assert!(vec[2].abs() < 1e-10);
}

// ============================================================================
// Versor Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_versor_identity() {
    use cliffy_wasm::Versor;

    let identity = Versor::identity();
    assert!(identity.is_rotor());
}

#[wasm_bindgen_test]
fn test_versor_from_rotor() {
    use cliffy_wasm::{Rotor, Versor};
    use std::f64::consts::PI;

    let rotor = Rotor::xy(PI / 4.0);
    let versor = Versor::from_rotor(&rotor);

    assert!(versor.is_rotor());

    let recovered = versor.to_rotor();
    assert!(recovered.is_some());
}

#[wasm_bindgen_test]
fn test_versor_reflection() {
    use cliffy_wasm::Versor;

    // Reflection through XY plane (normal = Z)
    let reflection = Versor::reflection(0.0, 0.0, 1.0);

    // Reflections are odd versors
    assert!(!reflection.is_rotor());
}

#[wasm_bindgen_test]
fn test_versor_composition() {
    use cliffy_wasm::Versor;

    // Two reflections compose to a rotation
    let r1 = Versor::reflection(1.0, 0.0, 0.0);
    let r2 = Versor::reflection(0.0, 1.0, 0.0);

    let composed = r1.then(&r2);

    // Two reflections = rotation (even versor)
    assert!(composed.is_rotor());
}

// ============================================================================
// Translation Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_translation_basic() {
    use cliffy_wasm::{GeometricState, Translation};

    let state = GeometricState::from_vector(0.0, 0.0, 0.0);
    let trans = Translation::new(10.0, 20.0, 30.0);

    let translated = state.apply_translation(&trans);
    let vec = translated.as_vector();

    assert!((vec[0] - 10.0).abs() < 1e-10);
    assert!((vec[1] - 20.0).abs() < 1e-10);
    assert!((vec[2] - 30.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_translation_axis_helpers() {
    use cliffy_wasm::{GeometricState, Translation};

    let origin = GeometricState::zero();

    let tx = Translation::x(5.0);
    let ty = Translation::y(10.0);
    let tz = Translation::z(15.0);

    let moved_x = origin.apply_translation(&tx);
    let moved_y = origin.apply_translation(&ty);
    let moved_z = origin.apply_translation(&tz);

    assert!((moved_x.as_vector()[0] - 5.0).abs() < 1e-10);
    assert!((moved_y.as_vector()[1] - 10.0).abs() < 1e-10);
    assert!((moved_z.as_vector()[2] - 15.0).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_translation_composition() {
    use cliffy_wasm::{GeometricState, Translation};

    let t1 = Translation::new(1.0, 0.0, 0.0);
    let t2 = Translation::new(0.0, 2.0, 0.0);

    let combined = t1.then(&t2);

    let state = GeometricState::zero();
    let moved = state.apply_translation(&combined);
    let vec = moved.as_vector();

    assert!((vec[0] - 1.0).abs() < 1e-10);
    assert!((vec[1] - 2.0).abs() < 1e-10);
    assert!(vec[2].abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_translation_inverse() {
    use cliffy_wasm::{GeometricState, Translation};

    let trans = Translation::new(5.0, 10.0, 15.0);
    let inv = trans.inverse();

    let state = GeometricState::from_vector(1.0, 2.0, 3.0);
    let moved = state.apply_translation(&trans);
    let back = moved.apply_translation(&inv);

    let original = state.as_vector();
    let result = back.as_vector();

    assert!((result[0] - original[0]).abs() < 1e-10);
    assert!((result[1] - original[1]).abs() < 1e-10);
    assert!((result[2] - original[2]).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_translation_lerp() {
    use cliffy_wasm::Translation;

    let trans = Translation::new(10.0, 10.0, 10.0);
    let half = trans.lerp(0.5);

    let t1 = Translation::new(0.0, 0.0, 0.0);
    let t2 = Translation::new(20.0, 20.0, 20.0);
    let mid = t1.lerp_to(&t2, 0.5);

    // lerp from zero gives half translation
    // lerp_to gives midpoint between two translations
    // Both should work without panic
}

// ============================================================================
// Transform Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_transform_identity() {
    use cliffy_wasm::{GeometricState, Transform};

    let identity = Transform::identity();
    let state = GeometricState::from_vector(1.0, 2.0, 3.0);

    let transformed = state.apply_transform(&identity);
    let original = state.as_vector();
    let result = transformed.as_vector();

    assert!((result[0] - original[0]).abs() < 1e-10);
    assert!((result[1] - original[1]).abs() < 1e-10);
    assert!((result[2] - original[2]).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_transform_from_rotor_and_translation() {
    use cliffy_wasm::{GeometricState, Rotor, Transform, Translation};
    use std::f64::consts::PI;

    let rotor = Rotor::xy(PI / 2.0);
    let trans = Translation::new(10.0, 0.0, 0.0);

    let transform = Transform::from_rotor_and_translation(&rotor, &trans);

    let state = GeometricState::from_vector(1.0, 0.0, 0.0);
    let transformed = state.apply_transform(&transform);
    let vec = transformed.as_vector();

    // Rotate (1,0,0) -> (0,1,0), then translate by (10,0,0) -> (10,1,0)
    assert!((vec[0] - 10.0).abs() < 1e-10);
    assert!((vec[1] - 1.0).abs() < 1e-10);
    assert!(vec[2].abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_transform_composition() {
    use cliffy_wasm::{GeometricState, Rotor, Transform, Translation};
    use std::f64::consts::PI;

    let t1 = Transform::from_rotor(&Rotor::xy(PI / 2.0));
    let t2 = Transform::from_translation(&Translation::new(5.0, 0.0, 0.0));

    let combined = t1.then(&t2);

    let state = GeometricState::from_vector(1.0, 0.0, 0.0);
    let result = state.apply_transform(&combined);
    let vec = result.as_vector();

    // Rotate (1,0,0) -> (0,1,0), then translate -> (5,1,0)
    assert!((vec[0] - 5.0).abs() < 1e-10);
    assert!((vec[1] - 1.0).abs() < 1e-10);
    assert!(vec[2].abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_transform_inverse() {
    use cliffy_wasm::{GeometricState, Rotor, Transform, Translation};
    use std::f64::consts::PI;

    let rotor = Rotor::xy(PI / 3.0);
    let trans = Translation::new(5.0, 10.0, 15.0);
    let transform = Transform::from_rotor_and_translation(&rotor, &trans);
    let inverse = transform.inverse();

    let state = GeometricState::from_vector(1.0, 2.0, 3.0);
    let transformed = state.apply_transform(&transform);
    let back = transformed.apply_transform(&inverse);

    let original = state.as_vector();
    let result = back.as_vector();

    assert!((result[0] - original[0]).abs() < 1e-10);
    assert!((result[1] - original[1]).abs() < 1e-10);
    assert!((result[2] - original[2]).abs() < 1e-10);
}

#[wasm_bindgen_test]
fn test_transform_interpolation() {
    use cliffy_wasm::{Rotor, Transform, Translation};
    use std::f64::consts::PI;

    let rotor = Rotor::xy(PI);
    let trans = Translation::new(10.0, 0.0, 0.0);
    let transform = Transform::from_rotor_and_translation(&rotor, &trans);

    // Interpolate halfway
    let half = transform.interpolate(0.5);

    // Should work without panic - exact values depend on interpolation method
}

// ============================================================================
// Module Tests
// ============================================================================

#[wasm_bindgen_test]
fn test_version() {
    use cliffy_wasm::version;

    let v = version();
    assert!(!v.is_empty());
    assert!(v.contains('.'));
}

#[wasm_bindgen_test]
fn test_init() {
    use cliffy_wasm::init;

    // Should not panic
    init();
    init(); // Should be idempotent
}
