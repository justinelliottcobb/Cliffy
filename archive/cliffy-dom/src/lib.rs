//! Geometric virtual DOM implementation for Cliffy web framework
//!
//! This crate provides a virtual DOM implementation that uses geometric algebra
//! for representing and transforming UI state.

use cliffy_core::GA3;
use cliffy_frp::GeometricBehavior;
use fxhash::FxHashMap;
use serde::{Deserialize, Serialize};
use slotmap::{DefaultKey, SlotMap};
use wasm_bindgen::prelude::*;
use web_sys::HtmlElement;

/// Type alias for geometric transforms in the DOM
pub type GeometricTransform = GA3;

/// A virtual DOM node with geometric state
#[derive(Debug, Clone)]
pub struct VNode {
    pub node_type: VNodeType,
    pub geometric_state: GeometricTransform,
    pub props: GeometricProps,
    pub children: Vec<VNode>,
    pub key: Option<String>,
    pub id: DefaultKey,
}

/// Types of virtual DOM nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VNodeType {
    Element { tag: String },
    Text { content: String },
    Component { name: String },
    Fragment,
}

/// Properties for a geometric VNode
#[derive(Debug, Clone)]
pub struct GeometricProps {
    pub attributes: FxHashMap<String, GeometricAttribute>,
    pub event_handlers: FxHashMap<String, GeometricEventHandler>,
    pub style: GeometricStyle,
}

/// Attribute types supporting static, dynamic, and geometric values
#[derive(Debug, Clone)]
pub enum GeometricAttribute {
    Static(String),
    Dynamic(GeometricBehavior),
    Transform(GeometricTransform),
}

/// Event handler with geometric transformation
#[derive(Debug, Clone)]
pub struct GeometricEventHandler {
    pub event_type: String,
    pub transform: GeometricTransform,
    pub callback_id: String,
}

/// Style properties using geometric transforms
#[derive(Debug, Clone, Default)]
pub struct GeometricStyle {
    pub position: Option<GeometricTransform>,
    pub scale: Option<GeometricTransform>,
    pub rotation: Option<GeometricTransform>,
    pub opacity: Option<f64>,
    pub color: Option<GeometricTransform>,
}

/// Virtual DOM tree manager
pub struct VDom {
    pub tree: Option<VNode>,
    pub element_pool: SlotMap<DefaultKey, VNode>,
    pub dom_cache: FxHashMap<DefaultKey, web_sys::Node>,
    pub root: Option<web_sys::Element>,
}

impl VNode {
    /// Create a new element node
    pub fn element(tag: &str) -> Self {
        Self {
            node_type: VNodeType::Element {
                tag: tag.to_string(),
            },
            geometric_state: GA3::scalar(1.0),
            props: GeometricProps::default(),
            children: Vec::new(),
            key: None,
            id: DefaultKey::default(),
        }
    }

    /// Create a new text node
    pub fn text(content: &str) -> Self {
        Self {
            node_type: VNodeType::Text {
                content: content.to_string(),
            },
            geometric_state: GA3::scalar(1.0),
            props: GeometricProps::default(),
            children: Vec::new(),
            key: None,
            id: DefaultKey::default(),
        }
    }

    /// Create a new component node
    pub fn component(name: &str) -> Self {
        Self {
            node_type: VNodeType::Component {
                name: name.to_string(),
            },
            geometric_state: GA3::scalar(1.0),
            props: GeometricProps::default(),
            children: Vec::new(),
            key: None,
            id: DefaultKey::default(),
        }
    }

    /// Set the key for this node
    pub fn with_key(mut self, key: String) -> Self {
        self.key = Some(key);
        self
    }

    /// Set children for this node
    pub fn with_children(mut self, children: Vec<VNode>) -> Self {
        self.children = children;
        self
    }

    /// Add a property to this node
    pub fn with_prop(mut self, name: &str, value: GeometricAttribute) -> Self {
        self.props.attributes.insert(name.to_string(), value);
        self
    }

    /// Add a static text property
    pub fn with_text_prop(self, name: &str, value: &str) -> Self {
        self.with_prop(name, GeometricAttribute::Static(value.to_string()))
    }

    /// Add a dynamic behavior property
    pub fn with_behavior_prop(self, name: &str, behavior: GeometricBehavior) -> Self {
        self.with_prop(name, GeometricAttribute::Dynamic(behavior))
    }

    /// Add a geometric transform property
    pub fn with_transform_prop(self, name: &str, transform: GeometricTransform) -> Self {
        self.with_prop(name, GeometricAttribute::Transform(transform))
    }

    /// Add an event handler
    pub fn with_event(mut self, event_type: &str, handler: GeometricEventHandler) -> Self {
        self.props
            .event_handlers
            .insert(event_type.to_string(), handler);
        self
    }

    /// Add a click handler
    pub fn with_click(self, transform: GeometricTransform, callback_id: String) -> Self {
        self.with_event(
            "click",
            GeometricEventHandler {
                event_type: "click".to_string(),
                transform,
                callback_id,
            },
        )
    }

    /// Set the style for this node
    pub fn with_style(mut self, style: GeometricStyle) -> Self {
        self.props.style = style;
        self
    }

    /// Set the geometric state
    pub fn with_geometric_state(mut self, state: GeometricTransform) -> Self {
        self.geometric_state = state;
        self
    }

    /// Apply a geometric transformation to this node and all children
    pub fn transform(&mut self, transformation: &GeometricTransform) {
        self.geometric_state = self.geometric_state.geometric_product(transformation);

        // Apply transformation to children
        for child in &mut self.children {
            child.transform(transformation);
        }
    }

    /// Scale uniformly by a factor
    pub fn scale_uniform(&mut self, factor: f64) {
        let scale_transform = GA3::scalar(factor);
        self.transform(&scale_transform);
    }

    /// Translate by a vector
    pub fn translate(&mut self, translation: &GeometricTransform) {
        self.geometric_state = &self.geometric_state + translation;
    }

    /// Rotate using a rotor (sandwich product: R * x * R^reverse)
    pub fn rotate(&mut self, rotor: &GeometricTransform) {
        let rev = rotor.reverse();
        self.geometric_state = rotor
            .geometric_product(&self.geometric_state)
            .geometric_product(&rev);
    }

    /// Compute the geometric transformation needed to go from this node to another
    pub fn geometric_diff(&self, other: &VNode) -> Option<GeometricTransform> {
        if std::mem::discriminant(&self.node_type) != std::mem::discriminant(&other.node_type) {
            return None; // Cannot diff different node types
        }

        // Compute the geometric transformation between states
        // Using reverse as the conjugate for rotors
        let diff = other
            .geometric_state
            .geometric_product(&self.geometric_state.reverse());

        Some(diff)
    }

    /// Check if this VNode can be patched to match another
    pub fn can_patch(&self, other: &VNode) -> bool {
        match (&self.node_type, &other.node_type) {
            (VNodeType::Element { tag: tag1 }, VNodeType::Element { tag: tag2 }) => tag1 == tag2,
            (VNodeType::Text { .. }, VNodeType::Text { .. }) => true,
            (VNodeType::Component { name: name1 }, VNodeType::Component { name: name2 }) => {
                name1 == name2
            }
            (VNodeType::Fragment, VNodeType::Fragment) => true,
            _ => false,
        }
    }
}

impl Default for GeometricProps {
    fn default() -> Self {
        Self {
            attributes: FxHashMap::default(),
            event_handlers: FxHashMap::default(),
            style: GeometricStyle::default(),
        }
    }
}

impl VDom {
    /// Create a new empty virtual DOM
    pub fn new() -> Self {
        Self {
            tree: None,
            element_pool: SlotMap::new(),
            dom_cache: FxHashMap::default(),
            root: None,
        }
    }

    /// Mount the virtual DOM to a root element
    pub fn mount(&mut self, root_element: web_sys::Element) {
        self.root = Some(root_element);
    }

    /// Render a new virtual tree
    pub fn render(&mut self, new_tree: VNode) {
        if self.tree.is_none() {
            // Initial render
            if let Some(root) = &self.root {
                let dom_node = self.create_dom_node(&new_tree);
                root.append_child(&dom_node).unwrap();
                let key = self.element_pool.insert(new_tree.clone());
                self.dom_cache.insert(key, dom_node);
            }
            self.tree = Some(new_tree);
        } else {
            // Update render - perform geometric diff
            // Clone old tree to avoid borrow issues
            let old_tree = self.tree.clone().unwrap();
            self.patch(&old_tree, &new_tree);
            self.tree = Some(new_tree);
        }
    }

    fn create_dom_node(&self, vnode: &VNode) -> web_sys::Node {
        let document = web_sys::window().unwrap().document().unwrap();

        match &vnode.node_type {
            VNodeType::Element { tag } => {
                let element = document.create_element(tag).unwrap();

                // Apply geometric attributes
                self.apply_geometric_attributes(&element, &vnode.props);

                // Add children
                for child in &vnode.children {
                    let child_node = self.create_dom_node(child);
                    element.append_child(&child_node).unwrap();
                }

                element.into()
            }
            VNodeType::Text { content } => document.create_text_node(content).into(),
            VNodeType::Component { .. } => {
                // Components are resolved before this point
                document.create_comment("component").into()
            }
            VNodeType::Fragment => {
                let fragment = document.create_document_fragment();
                for child in &vnode.children {
                    let child_node = self.create_dom_node(child);
                    fragment.append_child(&child_node).unwrap();
                }
                fragment.into()
            }
        }
    }

    fn apply_geometric_attributes(&self, element: &web_sys::Element, props: &GeometricProps) {
        let html_element = element.dyn_ref::<HtmlElement>().unwrap();

        // Apply regular attributes
        for (name, attr) in &props.attributes {
            match attr {
                GeometricAttribute::Static(value) => {
                    element.set_attribute(name, value).unwrap();
                }
                GeometricAttribute::Dynamic(behavior) => {
                    let current_value = behavior.sample();
                    // Convert multivector to string representation
                    let value = self.multivector_to_attribute_value(&current_value);
                    element.set_attribute(name, &value).unwrap();
                }
                GeometricAttribute::Transform(transform) => {
                    let value = self.multivector_to_attribute_value(transform);
                    element.set_attribute(name, &value).unwrap();
                }
            }
        }

        // Apply geometric style transformations
        let mut style_parts = Vec::new();

        if let Some(position) = &props.style.position {
            let coeffs = position.as_slice();
            style_parts.push(format!(
                "transform: translate({}px, {}px)",
                coeffs.get(1).unwrap_or(&0.0) * 100.0,
                coeffs.get(2).unwrap_or(&0.0) * 100.0
            ));
        }

        if let Some(scale) = &props.style.scale {
            let scale_factor = scale.get(0);
            style_parts.push(format!("transform: scale({})", scale_factor));
        }

        if let Some(rotation) = &props.style.rotation {
            // Extract rotation angle from bivector
            let angle = rotation.get(3);
            style_parts.push(format!("transform: rotate({}rad)", angle));
        }

        if let Some(opacity) = props.style.opacity {
            style_parts.push(format!("opacity: {}", opacity));
        }

        if let Some(color) = &props.style.color {
            // Map multivector to RGB color
            let coeffs = color.as_slice();
            let r = ((coeffs.get(1).unwrap_or(&0.0) + 1.0) * 127.5) as u8;
            let g = ((coeffs.get(2).unwrap_or(&0.0) + 1.0) * 127.5) as u8;
            let b = ((coeffs.get(4).unwrap_or(&0.0) + 1.0) * 127.5) as u8;
            style_parts.push(format!("color: rgb({}, {}, {})", r, g, b));
        }

        if !style_parts.is_empty() {
            html_element
                .set_attribute("style", &style_parts.join("; "))
                .unwrap();
        }
    }

    fn multivector_to_attribute_value(&self, mv: &GeometricTransform) -> String {
        // For now, just use the scalar part as the value
        mv.get(0).to_string()
    }

    fn patch(&mut self, old_vnode: &VNode, new_vnode: &VNode) {
        if !old_vnode.can_patch(new_vnode) {
            // Replace entire subtree
            self.replace_node(old_vnode, new_vnode);
            return;
        }

        // Compute geometric diff
        if let Some(transform_diff) = old_vnode.geometric_diff(new_vnode) {
            self.apply_geometric_transform(&transform_diff);
        }

        // Patch attributes
        self.patch_attributes(&old_vnode.props, &new_vnode.props);

        // Patch children
        self.patch_children(&old_vnode.children, &new_vnode.children);
    }

    fn replace_node(&mut self, _old: &VNode, _new: &VNode) {
        // Implementation for replacing DOM nodes
        // This would remove the old DOM node and create a new one
    }

    fn apply_geometric_transform(&self, _transform: &GeometricTransform) {
        // Apply the geometric transformation to the DOM element
        // This could be done through CSS transforms or direct manipulation
    }

    fn patch_attributes(&self, _old_props: &GeometricProps, _new_props: &GeometricProps) {
        // Compare and update attributes
    }

    fn patch_children(&mut self, old_children: &[VNode], new_children: &[VNode]) {
        // Efficient children patching using geometric keys
        for (old, new) in old_children.iter().zip(new_children.iter()) {
            self.patch(old, new);
        }

        // Handle added/removed children
        if new_children.len() > old_children.len() {
            // Add new children
        } else if old_children.len() > new_children.len() {
            // Remove excess children
        }
    }
}

impl Default for VDom {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vnode_creation() {
        let vnode = VNode::element("div")
            .with_text_prop("class", "container")
            .with_children(vec![VNode::text("Hello, Cliffy!")]);

        assert!(matches!(vnode.node_type, VNodeType::Element { .. }));
        assert_eq!(vnode.children.len(), 1);
    }

    #[test]
    fn test_geometric_transform() {
        let mut vnode = VNode::element("div");
        // Create a transform using basis vectors (e1 + e2)
        let e1 = GA3::basis_vector(0);
        let e2 = GA3::basis_vector(1);
        let transform = &e1 + &e2;

        vnode.transform(&transform);

        // The geometric state should be modified by the geometric product
        // with (1 + e1 + e2), which changes the scalar part
        assert!(vnode.geometric_state.magnitude() > 0.0);
    }

    #[test]
    fn test_geometric_diff() {
        let vnode1 = VNode::element("div");
        let mut vnode2 = VNode::element("div");

        // Create a transform using e1 basis vector
        let transform = GA3::basis_vector(0);
        vnode2.transform(&transform);

        let diff = vnode1.geometric_diff(&vnode2);
        assert!(diff.is_some());
    }

    #[test]
    fn test_can_patch() {
        let vnode1 = VNode::element("div");
        let vnode2 = VNode::element("div");
        let vnode3 = VNode::element("span");

        assert!(vnode1.can_patch(&vnode2));
        assert!(!vnode1.can_patch(&vnode3));
    }
}
