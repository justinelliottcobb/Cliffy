use cliffy_core::{Multivector, cl3_0::Multivector3D};
use cliffy_frp::GeometricBehavior;
use cliffy_dom::{VNode, VNodeType, GeometricProps, GeometricAttribute, GeometricEventHandler};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::Arc;
use slotmap::{DefaultKey, SlotMap};
use fxhash::FxHashMap;
use uuid::Uuid;

pub mod hooks;
pub mod lifecycle;
pub mod context;

pub use hooks::*;
pub use lifecycle::*;
pub use context::*;

pub type GeometricState = GeometricBehavior<f64, 8>;
pub type ComponentId = Uuid;
pub type ComponentFn = dyn Fn(&ComponentContext) -> VNode;

/// Core component trait
pub trait GeometricComponent {
    fn render(&self, ctx: &ComponentContext) -> VNode;
    fn component_name(&self) -> &str;
    fn geometric_key(&self) -> Option<Multivector3D<f64>> { None }
}

/// Component context providing hooks and state management
pub struct ComponentContext {
    pub component_id: ComponentId,
    pub hooks: Arc<HookManager>,
    pub props: GeometricProps,
    pub children: Vec<VNode>,
    pub app_context: Arc<AppContext>,
}

/// Global application context
pub struct AppContext {
    pub components: SlotMap<DefaultKey, Box<dyn GeometricComponent>>,
    pub component_states: FxHashMap<ComponentId, ComponentState>,
    pub global_behaviors: FxHashMap<String, GeometricState>,
}

/// Component instance state
#[derive(Debug, Clone)]
pub struct ComponentState {
    pub geometric_state: Multivector3D<f64>,
    pub local_behaviors: FxHashMap<String, GeometricState>,
    pub lifecycle_stage: LifecycleStage,
    pub render_count: u32,
}

/// Built-in geometric components
pub struct GeometricDiv {
    pub transform: Option<Multivector3D<f64>>,
}

pub struct GeometricButton {
    pub transform: Option<Multivector3D<f64>>,
    pub on_click: Option<Box<dyn Fn(Multivector3D<f64>)>>,
}

pub struct GeometricText {
    pub content: String,
    pub transform: Option<Multivector3D<f64>>,
}

pub struct GeometricInput {
    pub value: GeometricState,
    pub on_change: Option<Box<dyn Fn(String, Multivector3D<f64>)>>,
}

/// Component builder for fluent API
pub struct ComponentBuilder {
    node_type: VNodeType,
    props: GeometricProps,
    children: Vec<VNode>,
    key: Option<String>,
    geometric_state: Multivector3D<f64>,
}

impl ComponentBuilder {
    pub fn new(tag: &str) -> Self {
        Self {
            node_type: VNodeType::Element { tag: tag.to_string() },
            props: GeometricProps::default(),
            children: Vec::new(),
            key: None,
            geometric_state: Multivector3D::scalar(1.0),
        }
    }

    pub fn component(name: &str) -> Self {
        Self {
            node_type: VNodeType::Component { name: name.to_string() },
            props: GeometricProps::default(),
            children: Vec::new(),
            key: None,
            geometric_state: Multivector3D::scalar(1.0),
        }
    }

    pub fn prop(mut self, name: &str, value: &str) -> Self {
        self.props.attributes.insert(
            name.to_string(), 
            GeometricAttribute::Static(value.to_string())
        );
        self
    }

    pub fn geometric_prop(mut self, name: &str, transform: Multivector3D<f64>) -> Self {
        self.props.attributes.insert(
            name.to_string(),
            GeometricAttribute::Transform(transform)
        );
        self
    }

    pub fn behavior_prop(mut self, name: &str, behavior: GeometricState) -> Self {
        self.props.attributes.insert(
            name.to_string(),
            GeometricAttribute::Dynamic(behavior)
        );
        self
    }

    pub fn on_click<F>(mut self, handler: F) -> Self 
    where 
        F: Fn(Multivector3D<f64>) + 'static 
    {
        let callback_id = Uuid::new_v4().to_string();
        self.props.event_handlers.insert(
            "click".to_string(),
            GeometricEventHandler {
                event_type: "click".to_string(),
                transform: Multivector3D::scalar(1.0),
                callback_id: callback_id.clone(),
            }
        );
        // Store the actual callback somewhere accessible by callback_id
        self
    }

    pub fn children(mut self, children: Vec<VNode>) -> Self {
        self.children = children;
        self
    }

    pub fn child(mut self, child: VNode) -> Self {
        self.children.push(child);
        self
    }

    pub fn text(mut self, content: &str) -> Self {
        self.children.push(VNode::text(content));
        self
    }

    pub fn key(mut self, key: &str) -> Self {
        self.key = Some(key.to_string());
        self
    }

    pub fn transform(mut self, transform: Multivector3D<f64>) -> Self {
        self.geometric_state = transform;
        self
    }

    pub fn translate(mut self, translation: Multivector3D<f64>) -> Self {
        self.geometric_state = self.geometric_state + translation;
        self
    }

    pub fn scale(mut self, factor: f64) -> Self {
        self.geometric_state = self.geometric_state.scale(factor);
        self
    }

    pub fn rotate(mut self, rotor: Multivector3D<f64>) -> Self {
        self.geometric_state = rotor.sandwich(&self.geometric_state);
        self
    }

    pub fn build(self) -> VNode {
        VNode {
            node_type: self.node_type,
            geometric_state: self.geometric_state,
            props: self.props,
            children: self.children,
            key: self.key,
            id: DefaultKey::default(),
        }
    }
}

impl GeometricComponent for GeometricDiv {
    fn render(&self, ctx: &ComponentContext) -> VNode {
        let mut builder = ComponentBuilder::new("div");
        
        if let Some(transform) = &self.transform {
            builder = builder.transform(transform.clone());
        }

        builder
            .children(ctx.children.clone())
            .build()
    }

    fn component_name(&self) -> &str {
        "GeometricDiv"
    }
}

impl GeometricComponent for GeometricButton {
    fn render(&self, ctx: &ComponentContext) -> VNode {
        let mut builder = ComponentBuilder::new("button");

        if let Some(transform) = &self.transform {
            builder = builder.transform(transform.clone());
        }

        builder
            .children(ctx.children.clone())
            .build()
    }

    fn component_name(&self) -> &str {
        "GeometricButton" 
    }
}

impl GeometricComponent for GeometricText {
    fn render(&self, ctx: &ComponentContext) -> VNode {
        let mut text_node = VNode::text(&self.content);
        
        if let Some(transform) = &self.transform {
            text_node.geometric_state = transform.clone();
        }

        text_node
    }

    fn component_name(&self) -> &str {
        "GeometricText"
    }
}

impl GeometricComponent for GeometricInput {
    fn render(&self, ctx: &ComponentContext) -> VNode {
        let current_value = self.value.sample();
        
        ComponentBuilder::new("input")
            .prop("type", "text")
            .prop("value", &current_value.coeffs[0].to_string())
            .build()
    }

    fn component_name(&self) -> &str {
        "GeometricInput"
    }
}

impl ComponentContext {
    pub fn new(
        component_id: ComponentId,
        props: GeometricProps,
        children: Vec<VNode>,
        app_context: Arc<AppContext>,
    ) -> Self {
        Self {
            component_id,
            hooks: Arc::new(HookManager::new()),
            props,
            children,
            app_context,
        }
    }
}

impl AppContext {
    pub fn new() -> Self {
        Self {
            components: SlotMap::new(),
            component_states: FxHashMap::default(),
            global_behaviors: FxHashMap::default(),
        }
    }

    pub fn register_component(&mut self, component: Box<dyn GeometricComponent>) -> DefaultKey {
        self.components.insert(component)
    }

    pub fn get_component_state(&self, id: &ComponentId) -> Option<&ComponentState> {
        self.component_states.get(id)
    }

    pub fn update_component_state(&mut self, id: ComponentId, state: ComponentState) {
        self.component_states.insert(id, state);
    }

    pub fn set_global_behavior(&mut self, name: String, behavior: GeometricState) {
        self.global_behaviors.insert(name, behavior);
    }

    pub fn get_global_behavior(&self, name: &str) -> Option<&GeometricState> {
        self.global_behaviors.get(name)
    }
}

impl ComponentState {
    pub fn new() -> Self {
        Self {
            geometric_state: Multivector3D::scalar(1.0),
            local_behaviors: FxHashMap::default(),
            lifecycle_stage: LifecycleStage::Created,
            render_count: 0,
        }
    }

    pub fn transform(&mut self, transformation: &Multivector3D<f64>) {
        self.geometric_state = self.geometric_state.geometric_product(transformation);
    }

    pub fn set_behavior(&mut self, name: String, behavior: GeometricState) {
        self.local_behaviors.insert(name, behavior);
    }

    pub fn get_behavior(&self, name: &str) -> Option<&GeometricState> {
        self.local_behaviors.get(name)
    }
}

/// Functional component creation macros and helpers
pub fn functional_component<F>(name: &str, render_fn: F) -> Box<dyn GeometricComponent>
where
    F: Fn(&ComponentContext) -> VNode + 'static
{
    struct FunctionalComponent {
        name: String,
        render_fn: Box<dyn Fn(&ComponentContext) -> VNode>,
    }

    impl GeometricComponent for FunctionalComponent {
        fn render(&self, ctx: &ComponentContext) -> VNode {
            (self.render_fn)(ctx)
        }

        fn component_name(&self) -> &str {
            &self.name
        }
    }

    Box::new(FunctionalComponent {
        name: name.to_string(),
        render_fn: Box::new(render_fn),
    })
}

/// Helper functions for common geometric operations
pub mod geometry_helpers {
    use super::*;
    use cliffy_core::cl3_0::{e1, e2, e3, rotor};

    pub fn translate_x(distance: f64) -> Multivector3D<f64> {
        e1::<f64>().scale(distance)
    }

    pub fn translate_y(distance: f64) -> Multivector3D<f64> {
        e2::<f64>().scale(distance)
    }

    pub fn translate_z(distance: f64) -> Multivector3D<f64> {
        e3::<f64>().scale(distance)
    }

    pub fn rotate_xy(angle: f64) -> Multivector3D<f64> {
        let bivector = e1::<f64>().geometric_product(&e2::<f64>());
        rotor(angle, &bivector)
    }

    pub fn scale_uniform(factor: f64) -> Multivector3D<f64> {
        Multivector3D::scalar(factor)
    }

    pub fn lerp_transforms(
        from: &Multivector3D<f64>,
        to: &Multivector3D<f64>,
        t: f64
    ) -> Multivector3D<f64> {
        // Linear interpolation in geometric algebra
        let diff = to.clone() - from.clone();
        from.clone() + diff.scale(t)
    }

    pub fn slerp_transforms(
        from: &Multivector3D<f64>,
        to: &Multivector3D<f64>,
        t: f64
    ) -> Multivector3D<f64> {
        // Spherical linear interpolation using exponential/log
        let relative = to.geometric_product(&from.conjugate());
        let log_relative = relative.log();
        let scaled_log = log_relative.scale(t);
        let interpolated = scaled_log.exp();
        from.geometric_product(&interpolated)
    }
}

/// Component registration and rendering system
pub struct ComponentRegistry {
    registered_components: FxHashMap<String, Box<dyn GeometricComponent>>,
    app_context: Arc<AppContext>,
}

impl ComponentRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            registered_components: FxHashMap::default(),
            app_context: Arc::new(AppContext::new()),
        };

        // Register built-in components
        registry.register_builtin_components();
        registry
    }

    fn register_builtin_components(&mut self) {
        self.register("div", Box::new(GeometricDiv { transform: None }));
        self.register("button", Box::new(GeometricButton { 
            transform: None, 
            on_click: None 
        }));
        // Add more built-in components
    }

    pub fn register(&mut self, name: &str, component: Box<dyn GeometricComponent>) {
        self.registered_components.insert(name.to_string(), component);
    }

    pub fn render_component(&self, name: &str, props: GeometricProps, children: Vec<VNode>) -> Option<VNode> {
        if let Some(component) = self.registered_components.get(name) {
            let context = ComponentContext::new(
                Uuid::new_v4(),
                props,
                children,
                self.app_context.clone(),
            );
            Some(component.render(&context))
        } else {
            None
        }
    }

    pub fn get_app_context(&self) -> Arc<AppContext> {
        self.app_context.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::cl3_0::{e1, e2};

    #[test]
    fn test_component_builder() {
        let vnode = ComponentBuilder::new("div")
            .prop("class", "container")
            .text("Hello World")
            .transform(e1::<f64>())
            .build();

        assert!(matches!(vnode.node_type, VNodeType::Element { .. }));
        assert_eq!(vnode.children.len(), 1);
    }

    #[test]
    fn test_geometric_div_component() {
        let div = GeometricDiv {
            transform: Some(e1::<f64>() + e2::<f64>()),
        };

        let context = ComponentContext::new(
            Uuid::new_v4(),
            GeometricProps::default(),
            vec![VNode::text("test")],
            Arc::new(AppContext::new()),
        );

        let vnode = div.render(&context);
        assert!(matches!(vnode.node_type, VNodeType::Element { .. }));
    }

    #[test]
    fn test_functional_component() {
        let counter = functional_component("Counter", |ctx| {
            ComponentBuilder::new("div")
                .text("Count: 0")
                .build()
        });

        let context = ComponentContext::new(
            Uuid::new_v4(),
            GeometricProps::default(),
            Vec::new(),
            Arc::new(AppContext::new()),
        );

        let vnode = counter.render(&context);
        assert_eq!(counter.component_name(), "Counter");
    }

    #[test]
    fn test_geometry_helpers() {
        use geometry_helpers::*;

        let translation = translate_x(5.0);
        assert_eq!(translation.coeffs[1], 5.0);

        let rotation = rotate_xy(std::f64::consts::PI / 4.0);
        assert!(rotation.magnitude() > 0.0);

        let scale = scale_uniform(2.0);
        assert_eq!(scale.coeffs[0], 2.0);
    }

    #[test]
    fn test_component_registry() {
        let mut registry = ComponentRegistry::new();
        
        let custom_component = functional_component("CustomComponent", |_| {
            ComponentBuilder::new("span").text("Custom").build()
        });

        registry.register("custom", custom_component);

        let vnode = registry.render_component(
            "custom",
            GeometricProps::default(),
            Vec::new()
        );

        assert!(vnode.is_some());
    }
}