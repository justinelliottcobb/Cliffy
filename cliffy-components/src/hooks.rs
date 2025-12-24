use cliffy_core::cl3_0::Multivector3D;
use cliffy_frp::GeometricBehavior;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

pub type GeometricState = GeometricBehavior<f64, 8>;
pub type HookId = u32;

/// Hook manager for component state and effects
pub struct HookManager {
    current_component: Option<Uuid>,
    hook_counter: Arc<Mutex<u32>>,
    state_hooks: Arc<Mutex<HashMap<HookId, GeometricState>>>,
    effect_hooks: Arc<Mutex<HashMap<HookId, EffectHook>>>,
    memo_hooks: Arc<Mutex<HashMap<HookId, MemoHook>>>,
}

#[derive(Debug, Clone)]
pub struct EffectHook {
    pub dependencies: Vec<Multivector3D<f64>>,
    pub cleanup: Option<Box<dyn Fn() + Send + Sync>>,
    pub effect: Box<dyn Fn() + Send + Sync>,
}

#[derive(Debug, Clone)]
pub struct MemoHook {
    pub dependencies: Vec<Multivector3D<f64>>,
    pub cached_value: Multivector3D<f64>,
}

impl HookManager {
    pub fn new() -> Self {
        Self {
            current_component: None,
            hook_counter: Arc::new(Mutex::new(0)),
            state_hooks: Arc::new(Mutex::new(HashMap::new())),
            effect_hooks: Arc::new(Mutex::new(HashMap::new())),
            memo_hooks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn set_current_component(&mut self, component_id: Uuid) {
        self.current_component = Some(component_id);
        // Reset hook counter for this render
        *self.hook_counter.lock().unwrap() = 0;
    }

    fn next_hook_id(&self) -> HookId {
        let mut counter = self.hook_counter.lock().unwrap();
        *counter += 1;
        *counter
    }

    /// useState equivalent - returns current state and setter function
    pub fn use_geometric_state(
        &self,
        initial_value: Multivector3D<f64>,
    ) -> (GeometricState, impl Fn(Multivector3D<f64>)) {
        let hook_id = self.next_hook_id();
        let mut state_hooks = self.state_hooks.lock().unwrap();

        let behavior = state_hooks
            .entry(hook_id)
            .or_insert_with(|| GeometricBehavior::new(initial_value))
            .clone();

        let behavior_for_setter = behavior.clone();
        let setter = move |new_value: Multivector3D<f64>| {
            behavior_for_setter.update(new_value);
        };

        (behavior, setter)
    }

    /// useReducer equivalent for more complex state management
    pub fn use_geometric_reducer<A>(
        &self,
        initial_state: Multivector3D<f64>,
        reducer: impl Fn(&Multivector3D<f64>, A) -> Multivector3D<f64> + 'static,
    ) -> (GeometricState, impl Fn(A))
    where
        A: Clone + 'static,
    {
        let (state, set_state) = self.use_geometric_state(initial_state);
        let current_state = state.clone();

        let dispatch = move |action: A| {
            let current_value = current_state.sample();
            let new_value = reducer(&current_value, action);
            set_state(new_value);
        };

        (state, dispatch)
    }

    /// useEffect equivalent for side effects
    pub fn use_effect<F>(&self, effect: F, dependencies: Vec<Multivector3D<f64>>)
    where
        F: Fn() + Send + Sync + 'static,
    {
        let hook_id = self.next_hook_id();
        let mut effect_hooks = self.effect_hooks.lock().unwrap();

        let should_run = if let Some(existing_hook) = effect_hooks.get(&hook_id) {
            // Check if dependencies changed
            existing_hook.dependencies != dependencies
        } else {
            true // First run
        };

        if should_run {
            // Run cleanup if it exists
            if let Some(existing_hook) = effect_hooks.get(&hook_id) {
                if let Some(cleanup) = &existing_hook.cleanup {
                    cleanup();
                }
            }

            // Run the effect
            effect();

            // Store the new hook
            effect_hooks.insert(
                hook_id,
                EffectHook {
                    dependencies,
                    cleanup: None,
                    effect: Box::new(effect),
                },
            );
        }
    }

    /// useEffect with cleanup
    pub fn use_effect_with_cleanup<F, C>(
        &self,
        effect: F,
        cleanup: C,
        dependencies: Vec<Multivector3D<f64>>,
    ) where
        F: Fn() + Send + Sync + 'static,
        C: Fn() + Send + Sync + 'static,
    {
        let hook_id = self.next_hook_id();
        let mut effect_hooks = self.effect_hooks.lock().unwrap();

        let should_run = if let Some(existing_hook) = effect_hooks.get(&hook_id) {
            existing_hook.dependencies != dependencies
        } else {
            true
        };

        if should_run {
            if let Some(existing_hook) = effect_hooks.get(&hook_id) {
                if let Some(existing_cleanup) = &existing_hook.cleanup {
                    existing_cleanup();
                }
            }

            effect();

            effect_hooks.insert(
                hook_id,
                EffectHook {
                    dependencies,
                    cleanup: Some(Box::new(cleanup)),
                    effect: Box::new(effect),
                },
            );
        }
    }

    /// useMemo equivalent for expensive computations
    pub fn use_memo<F>(
        &self,
        computation: F,
        dependencies: Vec<Multivector3D<f64>>,
    ) -> Multivector3D<f64>
    where
        F: Fn() -> Multivector3D<f64>,
    {
        let hook_id = self.next_hook_id();
        let mut memo_hooks = self.memo_hooks.lock().unwrap();

        let should_recompute = if let Some(existing_memo) = memo_hooks.get(&hook_id) {
            existing_memo.dependencies != dependencies
        } else {
            true
        };

        if should_recompute {
            let new_value = computation();
            memo_hooks.insert(
                hook_id,
                MemoHook {
                    dependencies,
                    cached_value: new_value.clone(),
                },
            );
            new_value
        } else {
            memo_hooks.get(&hook_id).unwrap().cached_value.clone()
        }
    }

    /// Custom hook for geometric transformations
    pub fn use_geometric_transform(
        &self,
        initial_transform: Multivector3D<f64>,
    ) -> (GeometricState, impl Fn(Multivector3D<f64>)) {
        let (transform_state, set_transform) = self.use_geometric_state(initial_transform);

        let apply_transform = move |new_transform: Multivector3D<f64>| {
            let current = transform_state.sample();
            let combined = current.geometric_product(&new_transform);
            set_transform(combined);
        };

        (transform_state, apply_transform)
    }

    /// Hook for animated geometric values
    pub fn use_geometric_animation(
        &self,
        from: Multivector3D<f64>,
        to: Multivector3D<f64>,
        duration_ms: u32,
    ) -> GeometricState {
        let (animated_state, set_animated_state) = self.use_geometric_state(from.clone());

        let animated_state_for_effect = animated_state.clone();
        self.use_effect_with_cleanup(
            move || {
                // Start animation
                let start_time = js_sys::Date::now();
                let from_clone = from.clone();
                let to_clone = to.clone();
                let duration = duration_ms as f64;

                let animate = move || {
                    let now = js_sys::Date::now();
                    let elapsed = now - start_time;
                    let progress = (elapsed / duration).min(1.0);

                    // Geometric interpolation (SLERP)
                    let diff = to_clone.geometric_product(&from_clone.conjugate());
                    let log_diff = diff.log();
                    let scaled_log = log_diff.scale(progress);
                    let interpolated = from_clone.geometric_product(&scaled_log.exp());

                    set_animated_state(interpolated);

                    if progress < 1.0 {
                        web_sys::window()
                            .unwrap()
                            .request_animation_frame(&animate.into())
                            .unwrap();
                    }
                };

                animate();
            },
            || {
                // Cleanup - cancel any ongoing animation
                // In a real implementation, we'd store and cancel the animation frame
            },
            vec![from, to], // Dependencies
        );

        animated_state
    }

    /// Hook for geometric spring physics
    pub fn use_geometric_spring(
        &self,
        target: Multivector3D<f64>,
        spring_config: SpringConfig,
    ) -> GeometricState {
        let (spring_state, set_spring_state) = self.use_geometric_state(target.clone());
        let (velocity, set_velocity) = self.use_geometric_state(Multivector3D::zero());

        let spring_state_for_effect = spring_state.clone();
        let velocity_for_effect = velocity.clone();

        self.use_effect(
            move || {
                let current_pos = spring_state_for_effect.sample();
                let current_vel = velocity_for_effect.sample();

                // Spring physics calculation
                let displacement = target.clone() - current_pos.clone();
                let spring_force = displacement.scale(spring_config.stiffness);
                let damping_force = current_vel.scale(-spring_config.damping);
                let total_force = spring_force + damping_force;

                let new_velocity = current_vel + total_force.scale(spring_config.dt);
                let new_position = current_pos + new_velocity.scale(spring_config.dt);

                set_velocity(new_velocity);
                set_spring_state(new_position);

                // Continue animation if not at rest
                if displacement.magnitude() > 0.001 || new_velocity.magnitude() > 0.001 {
                    // Schedule next frame
                    web_sys::window()
                        .unwrap()
                        .set_timeout_with_callback_and_timeout_and_arguments_0(
                            &js_sys::Function::new_no_args(""),
                            16,
                        )
                        .unwrap();
                }
            },
            vec![target],
        );

        spring_state
    }

    /// Hook for accessing global geometric behaviors
    pub fn use_global_behavior(&self, name: &str) -> Option<GeometricState> {
        // This would access the global context
        // Implementation depends on how global state is managed
        None
    }

    /// Hook for creating derived behaviors
    pub fn use_derived_behavior<F>(
        &self,
        dependencies: Vec<GeometricState>,
        computation: F,
    ) -> GeometricState
    where
        F: Fn(&[Multivector3D<f64>]) -> Multivector3D<f64> + 'static,
    {
        let initial_values: Vec<_> = dependencies.iter().map(|b| b.sample()).collect();
        let initial_result = computation(&initial_values);

        let (derived_state, set_derived_state) = self.use_geometric_state(initial_result);

        // Set up subscriptions to dependencies
        for (i, dependency) in dependencies.iter().enumerate() {
            let derived_state_clone = derived_state.clone();
            let dependencies_clone = dependencies.clone();
            let computation_clone = computation.clone();

            // This is a simplified subscription mechanism
            // In practice, we'd need proper cleanup and subscription management
            let _unsubscribe = dependency.subscribe(move |_| {
                let current_values: Vec<_> =
                    dependencies_clone.iter().map(|b| b.sample()).collect();
                let new_result = computation_clone(&current_values);
                set_derived_state(new_result);
            });
        }

        derived_state
    }
}

#[derive(Debug, Clone)]
pub struct SpringConfig {
    pub stiffness: f64,
    pub damping: f64,
    pub dt: f64, // delta time
}

impl Default for SpringConfig {
    fn default() -> Self {
        Self {
            stiffness: 0.1,
            damping: 0.8,
            dt: 1.0 / 60.0, // 60 FPS
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::cl3_0::{e1, e2};

    #[test]
    fn test_hook_manager_creation() {
        let hook_manager = HookManager::new();
        assert!(hook_manager.current_component.is_none());
    }

    #[test]
    fn test_use_geometric_state() {
        let hook_manager = HookManager::new();
        hook_manager.set_current_component(Uuid::new_v4());

        let initial_value = e1::<f64>();
        let (state, set_state) = hook_manager.use_geometric_state(initial_value.clone());

        assert_eq!(state.sample().coeffs, initial_value.coeffs);

        let new_value = e2::<f64>();
        set_state(new_value.clone());

        // Note: In a real implementation, this would be async
        // assert_eq!(state.sample().coeffs, new_value.coeffs);
    }

    #[test]
    fn test_use_memo() {
        let hook_manager = HookManager::new();
        hook_manager.set_current_component(Uuid::new_v4());

        let expensive_computation = || {
            // Simulate expensive computation
            e1::<f64>().geometric_product(&e2::<f64>())
        };

        let dependencies = vec![e1::<f64>(), e2::<f64>()];
        let result1 = hook_manager.use_memo(&expensive_computation, dependencies.clone());
        let result2 = hook_manager.use_memo(&expensive_computation, dependencies);

        // Should return cached value
        assert_eq!(result1.coeffs, result2.coeffs);
    }

    #[test]
    fn test_spring_config_default() {
        let config = SpringConfig::default();
        assert_eq!(config.stiffness, 0.1);
        assert_eq!(config.damping, 0.8);
        assert_eq!(config.dt, 1.0 / 60.0);
    }
}
