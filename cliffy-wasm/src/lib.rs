//! Cliffy WASM - WebAssembly bindings for Cliffy
//!
//! This crate exposes Cliffy's reactive primitives to JavaScript/TypeScript
//! via WebAssembly.
//!
//! # Example (JavaScript)
//!
//! ```javascript
//! import init, { Behavior, Event, when } from '@cliffy/core';
//!
//! await init();
//!
//! const count = new Behavior(0);
//! count.subscribe(n => console.log('Count:', n));
//!
//! count.update(n => n + 1);  // Logs: Count: 1
//! ```

use js_sys::Function;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;

/// Initialize the Cliffy WASM module.
///
/// Call this once before using any other Cliffy functions.
#[wasm_bindgen]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get the Cliffy version.
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// Type alias for subscriber callbacks
type SubscriberFn = Rc<RefCell<Vec<(usize, Function)>>>;

/// A reactive value that can change over time.
///
/// `Behavior` represents a value that can be updated and observed.
/// Subscribers are notified whenever the value changes.
///
/// # JavaScript Example
///
/// ```javascript
/// const count = new Behavior(0);
///
/// // Subscribe to changes
/// const unsubscribe = count.subscribe(value => {
///     console.log('New value:', value);
/// });
///
/// // Update the value
/// count.update(n => n + 1);
///
/// // Get current value
/// console.log(count.sample()); // 1
///
/// // Clean up
/// unsubscribe();
/// ```
#[wasm_bindgen]
pub struct Behavior {
    value: Rc<RefCell<JsValue>>,
    subscribers: SubscriberFn,
    next_id: Rc<RefCell<usize>>,
}

#[wasm_bindgen]
impl Behavior {
    /// Create a new Behavior with an initial value.
    #[wasm_bindgen(constructor)]
    pub fn new(initial: JsValue) -> Behavior {
        Behavior {
            value: Rc::new(RefCell::new(initial)),
            subscribers: Rc::new(RefCell::new(Vec::new())),
            next_id: Rc::new(RefCell::new(0)),
        }
    }

    /// Get the current value.
    #[wasm_bindgen]
    pub fn sample(&self) -> JsValue {
        self.value.borrow().clone()
    }

    /// Set the value directly.
    #[wasm_bindgen]
    pub fn set(&self, value: JsValue) {
        *self.value.borrow_mut() = value;
        self.notify_subscribers();
    }

    /// Update the value using a transformation function.
    ///
    /// The function receives the current value and should return the new value.
    #[wasm_bindgen]
    pub fn update(&self, f: &Function) -> Result<(), JsValue> {
        let current = self.value.borrow().clone();
        let this = JsValue::null();
        let new_value = f.call1(&this, &current)?;
        *self.value.borrow_mut() = new_value;
        self.notify_subscribers();
        Ok(())
    }

    /// Subscribe to value changes.
    ///
    /// Returns a Subscription that can be used to unsubscribe.
    #[wasm_bindgen]
    pub fn subscribe(&self, callback: Function) -> Subscription {
        let id = {
            let mut next = self.next_id.borrow_mut();
            let id = *next;
            *next += 1;
            id
        };

        self.subscribers.borrow_mut().push((id, callback));

        Subscription {
            id,
            subscribers: Rc::clone(&self.subscribers),
        }
    }

    /// Create a derived Behavior by mapping a function over this one.
    ///
    /// The derived Behavior will automatically update when this Behavior changes.
    #[wasm_bindgen]
    pub fn map(&self, f: &Function) -> Result<Behavior, JsValue> {
        let current = self.value.borrow().clone();
        let this_js = JsValue::null();
        let initial = f.call1(&this_js, &current)?;

        let derived = Behavior::new(initial);

        // Subscribe to changes
        let derived_value = Rc::clone(&derived.value);
        let derived_subscribers = Rc::clone(&derived.subscribers);
        let f_clone = f.clone();

        let callback = Closure::wrap(Box::new(move |value: JsValue| {
            let this = JsValue::null();
            if let Ok(new_value) = f_clone.call1(&this, &value) {
                *derived_value.borrow_mut() = new_value;
                // Notify derived's subscribers
                for (_, cb) in derived_subscribers.borrow().iter() {
                    let _ = cb.call1(&this, &derived_value.borrow());
                }
            }
        }) as Box<dyn Fn(JsValue)>);

        // Get the Function from the closure
        let js_fn = callback.as_ref().unchecked_ref::<Function>().clone();
        callback.forget(); // Prevent the closure from being dropped

        self.subscribers.borrow_mut().push((
            {
                let mut next = self.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn,
        ));

        Ok(derived)
    }

    /// Combine this Behavior with another using a function.
    #[wasm_bindgen]
    pub fn combine(&self, other: &Behavior, f: &Function) -> Result<Behavior, JsValue> {
        let a = self.value.borrow().clone();
        let b = other.value.borrow().clone();
        let this_js = JsValue::null();
        let initial = f.call2(&this_js, &a, &b)?;

        let combined = Behavior::new(initial);

        // Subscribe to self
        let combined_value = Rc::clone(&combined.value);
        let combined_subscribers = Rc::clone(&combined.subscribers);
        let other_value = Rc::clone(&other.value);
        let f_clone = f.clone();

        let callback_a = Closure::wrap(Box::new(move |a_val: JsValue| {
            let this = JsValue::null();
            let b_val = other_value.borrow().clone();
            if let Ok(new_value) = f_clone.call2(&this, &a_val, &b_val) {
                *combined_value.borrow_mut() = new_value;
                for (_, cb) in combined_subscribers.borrow().iter() {
                    let _ = cb.call1(&this, &combined_value.borrow());
                }
            }
        }) as Box<dyn Fn(JsValue)>);

        let js_fn_a = callback_a.as_ref().unchecked_ref::<Function>().clone();
        callback_a.forget();

        self.subscribers.borrow_mut().push((
            {
                let mut next = self.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn_a,
        ));

        // Subscribe to other
        let combined_value = Rc::clone(&combined.value);
        let combined_subscribers = Rc::clone(&combined.subscribers);
        let self_value = Rc::clone(&self.value);
        let f_clone = f.clone();

        let callback_b = Closure::wrap(Box::new(move |b_val: JsValue| {
            let this = JsValue::null();
            let a_val = self_value.borrow().clone();
            if let Ok(new_value) = f_clone.call2(&this, &a_val, &b_val) {
                *combined_value.borrow_mut() = new_value;
                for (_, cb) in combined_subscribers.borrow().iter() {
                    let _ = cb.call1(&this, &combined_value.borrow());
                }
            }
        }) as Box<dyn Fn(JsValue)>);

        let js_fn_b = callback_b.as_ref().unchecked_ref::<Function>().clone();
        callback_b.forget();

        other.subscribers.borrow_mut().push((
            {
                let mut next = other.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn_b,
        ));

        Ok(combined)
    }

    /// Notify all subscribers of the current value.
    fn notify_subscribers(&self) {
        let value = self.value.borrow().clone();
        let this = JsValue::null();
        for (_, callback) in self.subscribers.borrow().iter() {
            let _ = callback.call1(&this, &value);
        }
    }
}

/// A subscription handle that can be used to unsubscribe.
#[wasm_bindgen]
pub struct Subscription {
    id: usize,
    subscribers: SubscriberFn,
}

#[wasm_bindgen]
impl Subscription {
    /// Unsubscribe from the Behavior.
    #[wasm_bindgen]
    pub fn unsubscribe(&self) {
        self.subscribers
            .borrow_mut()
            .retain(|(id, _)| *id != self.id);
    }
}

/// A stream of discrete events.
///
/// `Event` represents a stream of values that occur at discrete moments.
/// Unlike Behavior, Event does not have a "current value" - it only
/// emits values when they occur.
///
/// # JavaScript Example
///
/// ```javascript
/// const clicks = new Event();
///
/// clicks.subscribe(event => {
///     console.log('Clicked!', event);
/// });
///
/// // Emit an event
/// clicks.emit({ x: 100, y: 200 });
/// ```
#[wasm_bindgen]
pub struct Event {
    subscribers: SubscriberFn,
    next_id: Rc<RefCell<usize>>,
}

#[wasm_bindgen]
impl Event {
    /// Create a new Event stream.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Event {
        Event {
            subscribers: Rc::new(RefCell::new(Vec::new())),
            next_id: Rc::new(RefCell::new(0)),
        }
    }

    /// Emit a value to all subscribers.
    #[wasm_bindgen]
    pub fn emit(&self, value: JsValue) {
        let this = JsValue::null();
        for (_, callback) in self.subscribers.borrow().iter() {
            let _ = callback.call1(&this, &value);
        }
    }

    /// Subscribe to this event stream.
    #[wasm_bindgen]
    pub fn subscribe(&self, callback: Function) -> Subscription {
        let id = {
            let mut next = self.next_id.borrow_mut();
            let id = *next;
            *next += 1;
            id
        };

        self.subscribers.borrow_mut().push((id, callback));

        Subscription {
            id,
            subscribers: Rc::clone(&self.subscribers),
        }
    }

    /// Map a function over this event stream.
    #[wasm_bindgen]
    pub fn map(&self, f: &Function) -> Event {
        let mapped = Event::new();

        let mapped_subscribers = Rc::clone(&mapped.subscribers);
        let f_clone = f.clone();

        let callback = Closure::wrap(Box::new(move |value: JsValue| {
            let this = JsValue::null();
            if let Ok(mapped_value) = f_clone.call1(&this, &value) {
                for (_, cb) in mapped_subscribers.borrow().iter() {
                    let _ = cb.call1(&this, &mapped_value);
                }
            }
        }) as Box<dyn Fn(JsValue)>);

        let js_fn = callback.as_ref().unchecked_ref::<Function>().clone();
        callback.forget();

        self.subscribers.borrow_mut().push((
            {
                let mut next = self.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn,
        ));

        mapped
    }

    /// Filter events based on a predicate.
    #[wasm_bindgen]
    pub fn filter(&self, predicate: &Function) -> Event {
        let filtered = Event::new();

        let filtered_subscribers = Rc::clone(&filtered.subscribers);
        let predicate_clone = predicate.clone();

        let callback = Closure::wrap(Box::new(move |value: JsValue| {
            let this = JsValue::null();
            if let Ok(result) = predicate_clone.call1(&this, &value) {
                if result.is_truthy() {
                    for (_, cb) in filtered_subscribers.borrow().iter() {
                        let _ = cb.call1(&this, &value);
                    }
                }
            }
        }) as Box<dyn Fn(JsValue)>);

        let js_fn = callback.as_ref().unchecked_ref::<Function>().clone();
        callback.forget();

        self.subscribers.borrow_mut().push((
            {
                let mut next = self.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn,
        ));

        filtered
    }

    /// Merge two event streams into one.
    #[wasm_bindgen]
    pub fn merge(&self, other: &Event) -> Event {
        let merged = Event::new();

        // Subscribe to self
        let merged_subscribers_1 = Rc::clone(&merged.subscribers);
        let callback_1 = Closure::wrap(Box::new(move |value: JsValue| {
            let this = JsValue::null();
            for (_, cb) in merged_subscribers_1.borrow().iter() {
                let _ = cb.call1(&this, &value);
            }
        }) as Box<dyn Fn(JsValue)>);

        let js_fn_1 = callback_1.as_ref().unchecked_ref::<Function>().clone();
        callback_1.forget();

        self.subscribers.borrow_mut().push((
            {
                let mut next = self.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn_1,
        ));

        // Subscribe to other
        let merged_subscribers_2 = Rc::clone(&merged.subscribers);
        let callback_2 = Closure::wrap(Box::new(move |value: JsValue| {
            let this = JsValue::null();
            for (_, cb) in merged_subscribers_2.borrow().iter() {
                let _ = cb.call1(&this, &value);
            }
        }) as Box<dyn Fn(JsValue)>);

        let js_fn_2 = callback_2.as_ref().unchecked_ref::<Function>().clone();
        callback_2.forget();

        other.subscribers.borrow_mut().push((
            {
                let mut next = other.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn_2,
        ));

        merged
    }

    /// Fold events into a Behavior, accumulating values.
    ///
    /// # Arguments
    ///
    /// * `initial` - The initial accumulated value
    /// * `f` - A function that takes (accumulator, event) and returns new accumulator
    #[wasm_bindgen]
    pub fn fold(&self, initial: JsValue, f: &Function) -> Result<Behavior, JsValue> {
        let behavior = Behavior::new(initial);

        let behavior_value = Rc::clone(&behavior.value);
        let behavior_subscribers = Rc::clone(&behavior.subscribers);
        let f_clone = f.clone();

        let callback = Closure::wrap(Box::new(move |event_value: JsValue| {
            let this = JsValue::null();
            let current = behavior_value.borrow().clone();
            if let Ok(new_value) = f_clone.call2(&this, &current, &event_value) {
                *behavior_value.borrow_mut() = new_value;
                for (_, cb) in behavior_subscribers.borrow().iter() {
                    let _ = cb.call1(&this, &behavior_value.borrow());
                }
            }
        }) as Box<dyn Fn(JsValue)>);

        let js_fn = callback.as_ref().unchecked_ref::<Function>().clone();
        callback.forget();

        self.subscribers.borrow_mut().push((
            {
                let mut next = self.next_id.borrow_mut();
                let id = *next;
                *next += 1;
                id
            },
            js_fn,
        ));

        Ok(behavior)
    }
}

impl Default for Event {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Combinators
// ============================================================================

/// Create a Behavior that holds a value only when a condition is true.
///
/// # Arguments
///
/// * `condition` - A Behavior<boolean> that controls visibility
/// * `then_fn` - A function that returns the value when condition is true
///
/// # Returns
///
/// A Behavior that holds the value when true, or null when false.
///
/// # JavaScript Example
///
/// ```javascript
/// const showMessage = new Behavior(true);
/// const message = when(showMessage, () => "Hello!");
///
/// console.log(message.sample()); // "Hello!"
///
/// showMessage.set(false);
/// console.log(message.sample()); // null
/// ```
#[wasm_bindgen]
pub fn when(condition: &Behavior, then_fn: &Function) -> Result<Behavior, JsValue> {
    let cond_value = condition.value.borrow().clone();
    let this_js = JsValue::null();

    let initial = if cond_value.is_truthy() {
        then_fn.call0(&this_js)?
    } else {
        JsValue::null()
    };

    let result = Behavior::new(initial);

    // Subscribe to condition changes
    let result_value = Rc::clone(&result.value);
    let result_subscribers = Rc::clone(&result.subscribers);
    let then_fn_clone = then_fn.clone();

    let callback = Closure::wrap(Box::new(move |cond: JsValue| {
        let this = JsValue::null();
        let new_value = if cond.is_truthy() {
            then_fn_clone.call0(&this).unwrap_or(JsValue::null())
        } else {
            JsValue::null()
        };
        *result_value.borrow_mut() = new_value;
        for (_, cb) in result_subscribers.borrow().iter() {
            let _ = cb.call1(&this, &result_value.borrow());
        }
    }) as Box<dyn Fn(JsValue)>);

    let js_fn = callback.as_ref().unchecked_ref::<Function>().clone();
    callback.forget();

    condition.subscribers.borrow_mut().push((
        {
            let mut next = condition.next_id.borrow_mut();
            let id = *next;
            *next += 1;
            id
        },
        js_fn,
    ));

    Ok(result)
}

/// Create a Behavior that selects between two values based on a condition.
///
/// # Arguments
///
/// * `condition` - A Behavior<boolean> that controls selection
/// * `then_fn` - A function that returns the value when condition is true
/// * `else_fn` - A function that returns the value when condition is false
///
/// # JavaScript Example
///
/// ```javascript
/// const isDarkMode = new Behavior(false);
/// const theme = ifElse(isDarkMode, () => "dark", () => "light");
///
/// console.log(theme.sample()); // "light"
///
/// isDarkMode.set(true);
/// console.log(theme.sample()); // "dark"
/// ```
#[wasm_bindgen(js_name = ifElse)]
pub fn if_else(
    condition: &Behavior,
    then_fn: &Function,
    else_fn: &Function,
) -> Result<Behavior, JsValue> {
    let cond_value = condition.value.borrow().clone();
    let this_js = JsValue::null();

    let initial = if cond_value.is_truthy() {
        then_fn.call0(&this_js)?
    } else {
        else_fn.call0(&this_js)?
    };

    let result = Behavior::new(initial);

    // Subscribe to condition changes
    let result_value = Rc::clone(&result.value);
    let result_subscribers = Rc::clone(&result.subscribers);
    let then_fn_clone = then_fn.clone();
    let else_fn_clone = else_fn.clone();

    let callback = Closure::wrap(Box::new(move |cond: JsValue| {
        let this = JsValue::null();
        let new_value = if cond.is_truthy() {
            then_fn_clone.call0(&this).unwrap_or(JsValue::null())
        } else {
            else_fn_clone.call0(&this).unwrap_or(JsValue::null())
        };
        *result_value.borrow_mut() = new_value;
        for (_, cb) in result_subscribers.borrow().iter() {
            let _ = cb.call1(&this, &result_value.borrow());
        }
    }) as Box<dyn Fn(JsValue)>);

    let js_fn = callback.as_ref().unchecked_ref::<Function>().clone();
    callback.forget();

    condition.subscribers.borrow_mut().push((
        {
            let mut next = condition.next_id.borrow_mut();
            let id = *next;
            *next += 1;
            id
        },
        js_fn,
    ));

    Ok(result)
}

/// Combine two Behaviors into one using a function.
///
/// # Arguments
///
/// * `a` - First Behavior
/// * `b` - Second Behavior
/// * `f` - A function that takes both values and returns the combined value
///
/// # JavaScript Example
///
/// ```javascript
/// const width = new Behavior(100);
/// const height = new Behavior(50);
/// const area = combine(width, height, (w, h) => w * h);
///
/// console.log(area.sample()); // 5000
/// ```
#[wasm_bindgen]
pub fn combine(a: &Behavior, b: &Behavior, f: &Function) -> Result<Behavior, JsValue> {
    a.combine(b, f)
}

/// Create a Behavior with a constant value.
///
/// # JavaScript Example
///
/// ```javascript
/// const pi = constant(3.14159);
/// console.log(pi.sample()); // 3.14159
/// ```
#[wasm_bindgen]
pub fn constant(value: JsValue) -> Behavior {
    Behavior::new(value)
}

/// Create a new Behavior (convenience function).
///
/// # JavaScript Example
///
/// ```javascript
/// const count = behavior(0);
/// count.update(n => n + 1);
/// ```
#[wasm_bindgen]
pub fn behavior(initial: JsValue) -> Behavior {
    Behavior::new(initial)
}

/// Create a new Event stream (convenience function).
///
/// # JavaScript Example
///
/// ```javascript
/// const clicks = event();
/// clicks.subscribe(e => console.log('Clicked!', e));
/// ```
#[wasm_bindgen]
pub fn event() -> Event {
    Event::new()
}

#[cfg(test)]
mod tests {
    // WASM tests go in tests/wasm_tests.rs
}
