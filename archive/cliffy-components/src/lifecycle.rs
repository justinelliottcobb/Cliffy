use cliffy_core::cl3_0::Multivector3D;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum LifecycleStage {
    Created,
    Mounting,
    Mounted,
    Updating,
    Updated,
    Unmounting,
    Unmounted,
    Error(String),
}

pub struct ComponentLifecycle {
    pub component_id: Uuid,
    pub stage: LifecycleStage,
    pub mount_time: Option<f64>,
    pub update_count: u32,
    pub last_render_time: Option<f64>,
}

pub trait LifecycleHooks {
    fn on_mount(&self) {}
    fn on_update(&self, _previous_props: &HashMap<String, String>) {}
    fn on_unmount(&self) {}
    fn on_error(&self, _error: &str) {}

    // Geometric-specific lifecycle hooks
    fn on_geometric_transform(&self, _transform: &Multivector3D<f64>) {}
    fn should_update(&self, _new_geometric_state: &Multivector3D<f64>) -> bool {
        true
    }
}

impl ComponentLifecycle {
    pub fn new(component_id: Uuid) -> Self {
        Self {
            component_id,
            stage: LifecycleStage::Created,
            mount_time: None,
            update_count: 0,
            last_render_time: None,
        }
    }

    pub fn transition_to(&mut self, new_stage: LifecycleStage) -> bool {
        let valid_transition = match (&self.stage, &new_stage) {
            (LifecycleStage::Created, LifecycleStage::Mounting) => true,
            (LifecycleStage::Mounting, LifecycleStage::Mounted) => true,
            (LifecycleStage::Mounted, LifecycleStage::Updating) => true,
            (LifecycleStage::Updating, LifecycleStage::Updated) => true,
            (LifecycleStage::Updated, LifecycleStage::Updating) => true,
            (LifecycleStage::Mounted, LifecycleStage::Unmounting) => true,
            (LifecycleStage::Updated, LifecycleStage::Unmounting) => true,
            (LifecycleStage::Unmounting, LifecycleStage::Unmounted) => true,
            (_, LifecycleStage::Error(_)) => true, // Can error from any stage
            _ => false,
        };

        if valid_transition {
            self.stage = new_stage;

            match &self.stage {
                LifecycleStage::Mounted => {
                    self.mount_time = Some(js_sys::Date::now());
                }
                LifecycleStage::Updated => {
                    self.update_count += 1;
                    self.last_render_time = Some(js_sys::Date::now());
                }
                _ => {}
            }
        }

        valid_transition
    }

    pub fn is_mounted(&self) -> bool {
        matches!(
            self.stage,
            LifecycleStage::Mounted | LifecycleStage::Updated | LifecycleStage::Updating
        )
    }

    pub fn get_uptime_ms(&self) -> Option<f64> {
        self.mount_time
            .map(|mount_time| js_sys::Date::now() - mount_time)
    }
}
