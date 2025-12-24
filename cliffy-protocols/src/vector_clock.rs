use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct VectorClock {
    pub clocks: HashMap<Uuid, u64>,
}

impl VectorClock {
    pub fn new() -> Self {
        Self {
            clocks: HashMap::new(),
        }
    }

    pub fn tick(&mut self, node_id: Uuid) {
        *self.clocks.entry(node_id).or_insert(0) += 1;
    }

    pub fn update(&mut self, other: &VectorClock) {
        for (&node_id, &timestamp) in &other.clocks {
            let current = self.clocks.entry(node_id).or_insert(0);
            *current = (*current).max(timestamp);
        }
    }

    pub fn happens_before(&self, other: &VectorClock) -> bool {
        let mut has_smaller = false;

        for (&node_id, &other_time) in &other.clocks {
            match self.clocks.get(&node_id) {
                Some(&self_time) => {
                    if self_time > other_time {
                        return false;
                    }
                    if self_time < other_time {
                        has_smaller = true;
                    }
                }
                None => has_smaller = true,
            }
        }

        has_smaller
    }

    pub fn concurrent(&self, other: &VectorClock) -> bool {
        !self.happens_before(other) && !other.happens_before(self)
    }

    pub fn merge(&self, other: &VectorClock) -> VectorClock {
        let mut result = self.clone();
        result.update(other);
        result
    }
}
