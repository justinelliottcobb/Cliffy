use cliffy_core::Multivector;
use crate::vector_clock::VectorClock;
use num_traits::Float;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeometricCRDT<T: Float, const N: usize> {
    pub state: Multivector<T, N>,
    pub vector_clock: VectorClock,
    pub node_id: Uuid,
    pub operations: HashMap<u64, GeometricOperation<T, N>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeometricOperation<T: Float, const N: usize> {
    pub id: u64,
    pub node_id: Uuid,
    pub timestamp: VectorClock,
    pub transform: Multivector<T, N>,
    pub operation_type: OperationType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OperationType {
    GeometricProduct,
    Addition,
    Sandwich,
    Exponential,
}

impl<T: Float + Send + Sync, const N: usize> GeometricCRDT<T, N> {
    pub fn new(node_id: Uuid, initial_state: Multivector<T, N>) -> Self {
        Self {
            state: initial_state,
            vector_clock: VectorClock::new(),
            node_id,
            operations: HashMap::new(),
        }
    }

    pub fn apply_operation(&mut self, operation: GeometricOperation<T, N>) {
        if self.operations.contains_key(&operation.id) {
            return;
        }

        self.vector_clock.update(&operation.timestamp);
        self.operations.insert(operation.id, operation.clone());

        self.state = match operation.operation_type {
            OperationType::GeometricProduct => {
                self.state.geometric_product(&operation.transform)
            }
            OperationType::Addition => {
                self.state + operation.transform
            }
            OperationType::Sandwich => {
                operation.transform.sandwich(&self.state)
            }
            OperationType::Exponential => {
                operation.transform.exp().geometric_product(&self.state)
            }
        };
    }

    pub fn create_operation(
        &mut self,
        transform: Multivector<T, N>,
        op_type: OperationType,
    ) -> GeometricOperation<T, N> {
        self.vector_clock.tick(self.node_id);
        let op_id = self.operations.len() as u64;

        GeometricOperation {
            id: op_id,
            node_id: self.node_id,
            timestamp: self.vector_clock.clone(),
            transform,
            operation_type: op_type,
        }
    }

    pub fn merge(&mut self, other: &GeometricCRDT<T, N>) -> GeometricCRDT<T, N> {
        let mut merged_state = self.geometric_join(&other.state);
        let merged_clock = self.vector_clock.merge(&other.vector_clock);
        
        let mut merged_ops = self.operations.clone();
        for (id, op) in &other.operations {
            if !merged_ops.contains_key(id) {
                merged_ops.insert(*id, op.clone());
            }
        }

        // Re-apply all operations in causal order
        let mut sorted_ops: Vec<_> = merged_ops.values().collect();
        sorted_ops.sort_by(|a, b| {
            if a.timestamp.happens_before(&b.timestamp) {
                std::cmp::Ordering::Less
            } else if b.timestamp.happens_before(&a.timestamp) {
                std::cmp::Ordering::Greater
            } else {
                a.id.cmp(&b.id) // Deterministic tie-breaking
            }
        });

        let mut result = GeometricCRDT::new(self.node_id, Multivector::zero());
        result.vector_clock = merged_clock;
        result.operations = merged_ops;

        for op in sorted_ops {
            result.apply_operation(op.clone());
        }

        result
    }

    fn geometric_join(&self, other: &Multivector<T, N>) -> Multivector<T, N> {
        // Geometric join using meet operation for lattice-based CRDT
        let self_norm = self.state.magnitude();
        let other_norm = other.magnitude();
        
        if self_norm > other_norm {
            self.state.clone()
        } else if other_norm > self_norm {
            other.clone()
        } else {
            // Equal magnitudes - use geometric mean
            geometric_mean(&[self.state.clone(), other.clone()])
        }
    }
}

pub fn geometric_mean<T: Float, const N: usize>(
    multivectors: &[Multivector<T, N>]
) -> Multivector<T, N> {
    if multivectors.is_empty() {
        return Multivector::zero();
    }

    let n = T::from(multivectors.len()).unwrap();
    let sum_logs: Multivector<T, N> = multivectors
        .iter()
        .map(|mv| mv.log())
        .fold(Multivector::zero(), |acc, log_mv| acc + log_mv);
    
    let mean_log = sum_logs.scale(T::one() / n);
    mean_log.exp()
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::cl3_0::*;

    #[test]
    fn test_geometric_crdt_convergence() {
        let node1_id = Uuid::new_v4();
        let node2_id = Uuid::new_v4();

        let initial_state = Multivector3D::scalar(1.0);
        let mut crdt1 = GeometricCRDT::new(node1_id, initial_state.clone());
        let mut crdt2 = GeometricCRDT::new(node2_id, initial_state.clone());

        // Node 1 applies rotation
        let rotation = e1::<f64>().geometric_product(&e2::<f64>()).scale(0.5);
        let op1 = crdt1.create_operation(rotation, OperationType::GeometricProduct);
        crdt1.apply_operation(op1.clone());

        // Node 2 applies translation
        let translation = e1::<f64>();
        let op2 = crdt2.create_operation(translation, OperationType::Addition);
        crdt2.apply_operation(op2.clone());

        // Merge states
        let merged1 = crdt1.merge(&crdt2);
        let merged2 = crdt2.merge(&crdt1);

        // Should converge to same state
        assert!((merged1.state.coeffs - merged2.state.coeffs).magnitude() < 1e-10);
    }

    #[test]
    fn test_geometric_mean() {
        let mv1 = Multivector3D::scalar(2.0);
        let mv2 = Multivector3D::scalar(8.0);
        let mean = geometric_mean(&[mv1, mv2]);
        
        // Geometric mean of 2 and 8 should be 4
        assert!((mean.coeffs[0] - 4.0).abs() < 1e-10);
    }

    #[test]
    fn test_vector_clock_ordering() {
        let mut clock1 = VectorClock::new();
        let mut clock2 = VectorClock::new();
        
        let node1 = Uuid::new_v4();
        let node2 = Uuid::new_v4();

        clock1.tick(node1);
        clock2.tick(node2);
        
        assert!(clock1.concurrent(&clock2));
        
        clock1.update(&clock2);
        clock1.tick(node1);
        
        assert!(clock2.happens_before(&clock1));
    }
}