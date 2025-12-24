use crate::{geometric_mean, GeometricCRDT};
use cliffy_core::Multivector;
use num_traits::Float;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusMessage<T: Float, const N: usize> {
    pub sender_id: Uuid,
    pub proposal: Multivector<T, N>,
    pub round: u64,
    pub message_type: MessageType<T, N>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageType<T: Float, const N: usize> {
    Propose(Multivector<T, N>),
    Vote(bool, Multivector<T, N>),
    Commit(Multivector<T, N>),
    Sync(GeometricCRDT<T, N>),
}

pub struct GeometricConsensus<T: Float + Send + Sync + 'static, const N: usize> {
    node_id: Uuid,
    current_round: u64,
    proposals: Arc<RwLock<HashMap<u64, Vec<Multivector<T, N>>>>>,
    votes: Arc<RwLock<HashMap<u64, HashMap<Uuid, bool>>>>,
    committed_states: Arc<RwLock<HashMap<u64, Multivector<T, N>>>>,
    message_sender: broadcast::Sender<ConsensusMessage<T, N>>,
    message_receiver: broadcast::Receiver<ConsensusMessage<T, N>>,
    crdt_state: Arc<RwLock<GeometricCRDT<T, N>>>,
}

impl<T: Float + Send + Sync + Clone + 'static, const N: usize> GeometricConsensus<T, N> {
    pub fn new(node_id: Uuid, initial_state: Multivector<T, N>) -> Self {
        let (sender, receiver) = broadcast::channel(1000);
        let crdt = GeometricCRDT::new(node_id, initial_state);

        Self {
            node_id,
            current_round: 0,
            proposals: Arc::new(RwLock::new(HashMap::new())),
            votes: Arc::new(RwLock::new(HashMap::new())),
            committed_states: Arc::new(RwLock::new(HashMap::new())),
            message_sender: sender,
            message_receiver: receiver,
            crdt_state: Arc::new(RwLock::new(crdt)),
        }
    }

    pub async fn propose(
        &mut self,
        value: Multivector<T, N>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let round = self.current_round;
        self.current_round += 1;

        let message = ConsensusMessage {
            sender_id: self.node_id,
            proposal: value.clone(),
            round,
            message_type: MessageType::Propose(value),
        };

        self.message_sender.send(message)?;
        Ok(())
    }

    pub async fn geometric_consensus(
        &self,
        proposals: &[Multivector<T, N>],
        threshold: f64,
    ) -> Result<Multivector<T, N>, Box<dyn std::error::Error>> {
        if proposals.is_empty() {
            return Ok(Multivector::zero());
        }

        // Compute geometric mean of all proposals
        let consensus_value = geometric_mean(proposals);

        // Check if consensus meets threshold (based on geometric distance)
        let max_distance = proposals
            .iter()
            .map(|proposal| {
                let diff = consensus_value.clone() - proposal.clone();
                diff.magnitude()
            })
            .fold(T::zero(), |acc, dist| acc.max(dist));

        let threshold_val = T::from(threshold).unwrap();
        if max_distance <= threshold_val {
            Ok(consensus_value)
        } else {
            // No consensus reached, return weighted geometric mean
            self.weighted_geometric_consensus(proposals).await
        }
    }

    async fn weighted_geometric_consensus(
        &self,
        proposals: &[Multivector<T, N>],
    ) -> Result<Multivector<T, N>, Box<dyn std::error::Error>> {
        // Weight proposals by their geometric magnitude
        let weights: Vec<T> = proposals.iter().map(|p| p.magnitude()).collect();

        let total_weight: T = weights.iter().fold(T::zero(), |acc, &w| acc + w);

        if total_weight == T::zero() {
            return Ok(Multivector::zero());
        }

        // Compute weighted geometric mean using exponential/logarithm
        let weighted_log_sum = proposals
            .iter()
            .zip(weights.iter())
            .map(|(proposal, &weight)| proposal.log().scale(weight / total_weight))
            .fold(Multivector::zero(), |acc, weighted_log| acc + weighted_log);

        Ok(weighted_log_sum.exp())
    }

    pub async fn run_consensus_round(
        &mut self,
        proposal: Multivector<T, N>,
        participants: &[Uuid],
    ) -> Result<Option<Multivector<T, N>>, Box<dyn std::error::Error>> {
        let round = self.current_round;

        // Phase 1: Propose
        self.propose(proposal.clone()).await?;

        // Collect proposals from all participants
        let mut received_proposals = vec![proposal];
        let mut proposal_count = 1;

        while proposal_count < participants.len() {
            if let Ok(message) = self.message_receiver.recv().await {
                if message.round == round {
                    match message.message_type {
                        MessageType::Propose(prop) => {
                            received_proposals.push(prop);
                            proposal_count += 1;
                        }
                        _ => {}
                    }
                }
            }
        }

        // Phase 2: Vote
        let consensus_candidate = self.geometric_consensus(&received_proposals, 0.1).await?;
        let vote_message = ConsensusMessage {
            sender_id: self.node_id,
            proposal: consensus_candidate.clone(),
            round,
            message_type: MessageType::Vote(true, consensus_candidate.clone()),
        };

        self.message_sender.send(vote_message)?;

        // Collect votes
        let mut votes = HashMap::new();
        votes.insert(self.node_id, true);

        while votes.len() < participants.len() {
            if let Ok(message) = self.message_receiver.recv().await {
                if message.round == round {
                    match message.message_type {
                        MessageType::Vote(vote, _) => {
                            votes.insert(message.sender_id, vote);
                        }
                        _ => {}
                    }
                }
            }
        }

        // Phase 3: Commit if majority votes yes
        let yes_votes = votes.values().filter(|&&v| v).count();
        if yes_votes > participants.len() / 2 {
            let commit_message = ConsensusMessage {
                sender_id: self.node_id,
                proposal: consensus_candidate.clone(),
                round,
                message_type: MessageType::Commit(consensus_candidate.clone()),
            };

            self.message_sender.send(commit_message)?;

            // Update CRDT state
            let mut crdt_guard = self.crdt_state.write().await;
            let op = crdt_guard
                .create_operation(consensus_candidate.clone(), crate::OperationType::Addition);
            crdt_guard.apply_operation(op);

            Ok(Some(consensus_candidate))
        } else {
            Ok(None)
        }
    }

    pub async fn sync_crdt_state(
        &self,
        other_node: Uuid,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let crdt_guard = self.crdt_state.read().await;
        let sync_message = ConsensusMessage {
            sender_id: self.node_id,
            proposal: crdt_guard.state.clone(),
            round: self.current_round,
            message_type: MessageType::Sync(crdt_guard.clone()),
        };

        self.message_sender.send(sync_message)?;
        Ok(())
    }

    pub async fn handle_sync_message(&self, crdt_state: GeometricCRDT<T, N>) {
        let mut local_crdt = self.crdt_state.write().await;
        *local_crdt = local_crdt.merge(&crdt_state);
    }

    pub async fn get_current_state(&self) -> Multivector<T, N> {
        let crdt_guard = self.crdt_state.read().await;
        crdt_guard.state.clone()
    }
}

// Lattice-based automatic conflict resolution
pub fn lattice_join<T: Float, const N: usize>(
    a: &Multivector<T, N>,
    b: &Multivector<T, N>,
) -> Multivector<T, N> {
    // Implement least upper bound in the lattice
    let mut result_coeffs = a.coeffs.clone();

    for i in 0..N {
        result_coeffs[i] = result_coeffs[i].max(b.coeffs[i]);
    }

    Multivector::new(result_coeffs)
}

pub fn lattice_meet<T: Float, const N: usize>(
    a: &Multivector<T, N>,
    b: &Multivector<T, N>,
) -> Multivector<T, N> {
    // Implement greatest lower bound in the lattice
    let mut result_coeffs = a.coeffs.clone();

    for i in 0..N {
        result_coeffs[i] = result_coeffs[i].min(b.coeffs[i]);
    }

    Multivector::new(result_coeffs)
}

#[cfg(test)]
mod tests {
    use super::*;
    use cliffy_core::cl3_0::*;
    use tokio::time::{timeout, Duration};

    #[tokio::test]
    async fn test_geometric_consensus_simple() {
        let proposals = vec![
            Multivector3D::scalar(1.0),
            Multivector3D::scalar(2.0),
            Multivector3D::scalar(4.0),
        ];

        let node_id = Uuid::new_v4();
        let consensus = GeometricConsensus::new(node_id, Multivector3D::zero());

        let result = consensus
            .geometric_consensus(&proposals, 0.5)
            .await
            .unwrap();

        // Geometric mean of 1, 2, 4 should be 2
        assert!((result.coeffs[0] - 2.0).abs() < 1e-10);
    }

    #[tokio::test]
    async fn test_lattice_operations() {
        let a = Multivector3D::new([1.0, 2.0, 3.0, 0.0, 0.0, 0.0, 0.0, 0.0].into());
        let b = Multivector3D::new([2.0, 1.0, 4.0, 0.0, 0.0, 0.0, 0.0, 0.0].into());

        let join = lattice_join(&a, &b);
        let meet = lattice_meet(&a, &b);

        assert_eq!(join.coeffs[0], 2.0);
        assert_eq!(join.coeffs[1], 2.0);
        assert_eq!(join.coeffs[2], 4.0);

        assert_eq!(meet.coeffs[0], 1.0);
        assert_eq!(meet.coeffs[1], 1.0);
        assert_eq!(meet.coeffs[2], 3.0);
    }
}
