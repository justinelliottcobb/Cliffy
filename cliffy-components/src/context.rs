use cliffy_core::cl3_0::Multivector3D;
use cliffy_frp::GeometricBehavior;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

pub type GeometricState = GeometricBehavior<f64, 8>;

/// Global context provider for sharing state across component tree
pub struct GeometricContextProvider {
    values: Arc<RwLock<HashMap<String, GeometricState>>>,
    subscribers: Arc<RwLock<HashMap<String, Vec<Uuid>>>>,
}

/// Context consumer for accessing provided values
pub struct GeometricContextConsumer {
    provider: Arc<GeometricContextProvider>,
    subscribed_keys: Vec<String>,
    component_id: Uuid,
}

impl GeometricContextProvider {
    pub fn new() -> Self {
        Self {
            values: Arc::new(RwLock::new(HashMap::new())),
            subscribers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn provide(&self, key: String, value: GeometricState) {
        {
            let mut values = self.values.write().unwrap();
            values.insert(key.clone(), value);
        }

        // Notify subscribers
        if let Ok(subscribers) = self.subscribers.read() {
            if let Some(component_ids) = subscribers.get(&key) {
                for _component_id in component_ids {
                    // In a real implementation, we'd trigger re-renders here
                }
            }
        }
    }

    pub fn get(&self, key: &str) -> Option<GeometricState> {
        self.values.read().ok()?.get(key).cloned()
    }

    pub fn subscribe(&self, key: String, component_id: Uuid) {
        let mut subscribers = self.subscribers.write().unwrap();
        subscribers
            .entry(key)
            .or_insert_with(Vec::new)
            .push(component_id);
    }

    pub fn unsubscribe(&self, key: &str, component_id: &Uuid) {
        if let Ok(mut subscribers) = self.subscribers.write() {
            if let Some(component_ids) = subscribers.get_mut(key) {
                component_ids.retain(|id| id != component_id);
            }
        }
    }

    pub fn create_consumer(&self, component_id: Uuid) -> GeometricContextConsumer {
        GeometricContextConsumer {
            provider: Arc::new(self.clone()),
            subscribed_keys: Vec::new(),
            component_id,
        }
    }
}

impl Clone for GeometricContextProvider {
    fn clone(&self) -> Self {
        Self {
            values: self.values.clone(),
            subscribers: self.subscribers.clone(),
        }
    }
}

impl GeometricContextConsumer {
    pub fn consume(&mut self, key: &str) -> Option<GeometricState> {
        if !self.subscribed_keys.contains(&key.to_string()) {
            self.provider.subscribe(key.to_string(), self.component_id);
            self.subscribed_keys.push(key.to_string());
        }
        self.provider.get(key)
    }

    pub fn cleanup(&self) {
        for key in &self.subscribed_keys {
            self.provider.unsubscribe(key, &self.component_id);
        }
    }
}

impl Drop for GeometricContextConsumer {
    fn drop(&mut self) {
        self.cleanup();
    }
}

/// Theme context for consistent styling across components
pub struct GeometricTheme {
    pub primary_color: Multivector3D<f64>,
    pub secondary_color: Multivector3D<f64>,
    pub spacing_unit: f64,
    pub animation_duration: f64,
    pub transform_defaults: HashMap<String, Multivector3D<f64>>,
}

impl Default for GeometricTheme {
    fn default() -> Self {
        let mut transform_defaults = HashMap::new();
        transform_defaults.insert("scale".to_string(), Multivector3D::scalar(1.0));
        transform_defaults.insert("rotation".to_string(), Multivector3D::zero());

        Self {
            primary_color: Multivector3D::scalar(0.2) + cliffy_core::cl3_0::e1::<f64>().scale(0.6),
            secondary_color: Multivector3D::scalar(0.8)
                + cliffy_core::cl3_0::e2::<f64>().scale(0.4),
            spacing_unit: 8.0,
            animation_duration: 200.0,
            transform_defaults,
        }
    }
}

/// Router context for geometric-based routing
pub struct GeometricRouter {
    current_route: Arc<RwLock<String>>,
    route_transforms: Arc<RwLock<HashMap<String, Multivector3D<f64>>>>,
    navigation_behavior: GeometricState,
}

impl GeometricRouter {
    pub fn new() -> Self {
        let initial_transform = Multivector3D::scalar(1.0);

        Self {
            current_route: Arc::new(RwLock::new("/".to_string())),
            route_transforms: Arc::new(RwLock::new(HashMap::new())),
            navigation_behavior: GeometricBehavior::new(initial_transform),
        }
    }

    pub fn register_route(&self, path: String, transform: Multivector3D<f64>) {
        let mut route_transforms = self.route_transforms.write().unwrap();
        route_transforms.insert(path, transform);
    }

    pub fn navigate_to(&self, path: String) {
        {
            let mut current_route = self.current_route.write().unwrap();
            *current_route = path.clone();
        }

        // Apply geometric transformation for route transition
        if let Ok(route_transforms) = self.route_transforms.read() {
            if let Some(transform) = route_transforms.get(&path) {
                self.navigation_behavior.update(transform.clone());
            }
        }
    }

    pub fn get_current_route(&self) -> String {
        self.current_route.read().unwrap().clone()
    }

    pub fn get_navigation_behavior(&self) -> GeometricState {
        self.navigation_behavior.clone()
    }
}

/// Global app state manager using geometric algebra
pub struct GeometricAppState {
    global_transform: GeometricState,
    theme: GeometricTheme,
    router: GeometricRouter,
    context_provider: GeometricContextProvider,
    performance_metrics: Arc<RwLock<PerformanceMetrics>>,
}

#[derive(Debug, Clone)]
pub struct PerformanceMetrics {
    pub total_renders: u64,
    pub average_render_time: f64,
    pub geometric_operations_count: u64,
    pub memory_usage_mb: f64,
}

impl GeometricAppState {
    pub fn new() -> Self {
        Self {
            global_transform: GeometricBehavior::new(Multivector3D::scalar(1.0)),
            theme: GeometricTheme::default(),
            router: GeometricRouter::new(),
            context_provider: GeometricContextProvider::new(),
            performance_metrics: Arc::new(RwLock::new(PerformanceMetrics::default())),
        }
    }

    pub fn get_global_transform(&self) -> GeometricState {
        self.global_transform.clone()
    }

    pub fn apply_global_transform(&self, transform: Multivector3D<f64>) {
        let current = self.global_transform.sample();
        let new_transform = current.geometric_product(&transform);
        self.global_transform.update(new_transform);
    }

    pub fn get_theme(&self) -> &GeometricTheme {
        &self.theme
    }

    pub fn set_theme(&mut self, theme: GeometricTheme) {
        self.theme = theme;
    }

    pub fn get_router(&self) -> &GeometricRouter {
        &self.router
    }

    pub fn get_context_provider(&self) -> &GeometricContextProvider {
        &self.context_provider
    }

    pub fn record_render(&self, render_time: f64) {
        if let Ok(mut metrics) = self.performance_metrics.write() {
            metrics.total_renders += 1;
            metrics.average_render_time =
                (metrics.average_render_time * (metrics.total_renders - 1) as f64 + render_time)
                    / metrics.total_renders as f64;
        }
    }

    pub fn record_geometric_operation(&self) {
        if let Ok(mut metrics) = self.performance_metrics.write() {
            metrics.geometric_operations_count += 1;
        }
    }

    pub fn get_performance_metrics(&self) -> PerformanceMetrics {
        self.performance_metrics.read().unwrap().clone()
    }
}

impl Default for PerformanceMetrics {
    fn default() -> Self {
        Self {
            total_renders: 0,
            average_render_time: 0.0,
            geometric_operations_count: 0,
            memory_usage_mb: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::cl3_0::{e1, e2};

    #[test]
    fn test_context_provider() {
        let provider = GeometricContextProvider::new();
        let behavior = GeometricBehavior::new(e1::<f64>());

        provider.provide("test_key".to_string(), behavior.clone());

        let retrieved = provider.get("test_key");
        assert!(retrieved.is_some());
    }

    #[test]
    fn test_context_consumer() {
        let provider = GeometricContextProvider::new();
        let mut consumer = provider.create_consumer(Uuid::new_v4());

        let behavior = GeometricBehavior::new(e2::<f64>());
        provider.provide("test_key".to_string(), behavior.clone());

        let consumed = consumer.consume("test_key");
        assert!(consumed.is_some());
    }

    #[test]
    fn test_geometric_theme_default() {
        let theme = GeometricTheme::default();
        assert_eq!(theme.spacing_unit, 8.0);
        assert_eq!(theme.animation_duration, 200.0);
        assert!(theme.transform_defaults.contains_key("scale"));
    }

    #[test]
    fn test_geometric_router() {
        let router = GeometricRouter::new();

        router.register_route("/home".to_string(), e1::<f64>());
        router.navigate_to("/home".to_string());

        assert_eq!(router.get_current_route(), "/home");
    }

    #[test]
    fn test_app_state() {
        let mut app_state = GeometricAppState::new();

        let transform = e1::<f64>() + e2::<f64>();
        app_state.apply_global_transform(transform);

        let global_transform = app_state.get_global_transform().sample();
        assert!(global_transform.magnitude() > 1.0);
    }

    #[test]
    fn test_performance_metrics() {
        let app_state = GeometricAppState::new();

        app_state.record_render(16.7); // 60 FPS
        app_state.record_render(20.0);
        app_state.record_geometric_operation();

        let metrics = app_state.get_performance_metrics();
        assert_eq!(metrics.total_renders, 2);
        assert_eq!(metrics.geometric_operations_count, 1);
        assert!((metrics.average_render_time - 18.35).abs() < 0.1);
    }
}
