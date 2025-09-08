use cliffy_core::{Multivector, cl3_0::Multivector3D};
use cliffy_protocols::{GeometricCRDT, GeometricConsensus, OperationType};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use uuid::Uuid;
use warp::Filter;
use futures_util::{SinkExt, StreamExt};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct DocumentState {
    content: String,
    geometric_state: Vec<f64>, // Multivector coefficients
    version: u64,
    node_id: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct EditOperation {
    id: String,
    node_id: String,
    operation_type: String,
    position: usize,
    content: String,
    geometric_transform: Vec<f64>, // Multivector coefficients
    timestamp: u64,
}

type Clients = Arc<RwLock<HashMap<String, tokio_tungstenite::WebSocketStream<warp::ws::WebSocket>>>>;
type DocumentCRDT = Arc<RwLock<GeometricCRDT<f64, 8>>>;

#[tokio::main]
async fn main() {
    let clients: Clients = Arc::new(RwLock::new(HashMap::new()));
    let (tx, _) = broadcast::channel::<EditOperation>(1000);
    
    // Initialize document CRDT with geometric state
    let initial_state = Multivector3D::scalar(0.0); // Empty document
    let node_id = Uuid::new_v4();
    let document_crdt = Arc::new(RwLock::new(
        GeometricCRDT::new(node_id, initial_state)
    ));

    println!("🎉 Cliffy Collaborative Editor Server starting...");
    println!("📝 Document Node ID: {}", node_id);
    
    let websocket_route = warp::path("ws")
        .and(warp::ws())
        .and(with_clients(clients.clone()))
        .and(with_broadcast(tx.clone()))
        .and(with_crdt(document_crdt.clone()))
        .and_then(handle_websocket);

    let static_files = warp::fs::dir("public");

    let routes = websocket_route.or(static_files);

    println!("🚀 Server running on http://localhost:3030");
    warp::serve(routes)
        .run(([127, 0, 0, 1], 3030))
        .await;
}

fn with_clients(clients: Clients) -> impl Filter<Extract = (Clients,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || clients.clone())
}

fn with_broadcast(tx: broadcast::Sender<EditOperation>) -> impl Filter<Extract = (broadcast::Sender<EditOperation>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || tx.clone())
}

fn with_crdt(crdt: DocumentCRDT) -> impl Filter<Extract = (DocumentCRDT,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || crdt.clone())
}

async fn handle_websocket(
    ws: warp::ws::Ws,
    clients: Clients,
    tx: broadcast::Sender<EditOperation>,
    document_crdt: DocumentCRDT,
) -> Result<impl warp::Reply, warp::Rejection> {
    Ok(ws.on_upgrade(move |socket| handle_client(socket, clients, tx, document_crdt)))
}

async fn handle_client(
    ws: warp::ws::WebSocket,
    clients: Clients,
    tx: broadcast::Sender<EditOperation>,
    document_crdt: DocumentCRDT,
) {
    let client_id = Uuid::new_v4().to_string();
    println!("👤 New client connected: {}", client_id);

    let (mut ws_tx, mut ws_rx) = ws.split();
    
    // Add client to the clients map
    {
        let mut client_map = clients.write().await;
        // Note: This is simplified - in practice we'd store the sender part
    }

    // Send current document state to new client
    {
        let crdt = document_crdt.read().await;
        let document_state = DocumentState {
            content: format!("Document managed by geometric CRDT"),
            geometric_state: crdt.state.coeffs.as_slice().to_vec(),
            version: 0,
            node_id: crdt.node_id.to_string(),
        };
        
        if let Ok(message) = serde_json::to_string(&document_state) {
            let _ = ws_tx.send(warp::ws::Message::text(message)).await;
        }
    }

    let mut rx = tx.subscribe();

    // Handle incoming messages from client
    let clients_for_task = clients.clone();
    let tx_for_task = tx.clone();
    let crdt_for_task = document_crdt.clone();
    let client_id_for_task = client_id.clone();

    let receive_task = tokio::spawn(async move {
        while let Some(msg) = ws_rx.next().await {
            match msg {
                Ok(message) => {
                    if let Ok(text) = message.to_str() {
                        if let Ok(edit_op) = serde_json::from_str::<EditOperation>(text) {
                            println!("📝 Received edit from {}: {}", client_id_for_task, edit_op.operation_type);
                            
                            // Apply edit to CRDT
                            {
                                let mut crdt = crdt_for_task.write().await;
                                let geometric_transform = Multivector3D::new(
                                    edit_op.geometric_transform.try_into().unwrap_or([0.0; 8])
                                );
                                
                                let op_type = match edit_op.operation_type.as_str() {
                                    "insert" => OperationType::Addition,
                                    "delete" => OperationType::GeometricProduct,
                                    "format" => OperationType::Sandwich,
                                    _ => OperationType::Addition,
                                };

                                let operation = crdt.create_operation(geometric_transform, op_type);
                                crdt.apply_operation(operation);
                            }

                            // Broadcast to all other clients
                            let _ = tx_for_task.send(edit_op);
                        }
                    }
                }
                Err(e) => {
                    println!("❌ WebSocket error for {}: {}", client_id_for_task, e);
                    break;
                }
            }
        }
    });

    // Handle broadcasting messages to client
    let broadcast_task = tokio::spawn(async move {
        while let Ok(edit_op) = rx.recv().await {
            // Don't send back to the same client
            if edit_op.node_id != client_id {
                if let Ok(message) = serde_json::to_string(&edit_op) {
                    if ws_tx.send(warp::ws::Message::text(message)).await.is_err() {
                        println!("❌ Failed to send message to client {}", client_id);
                        break;
                    }
                }
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = receive_task => {},
        _ = broadcast_task => {},
    }

    // Clean up client
    {
        let mut client_map = clients.write().await;
        client_map.remove(&client_id);
    }
    
    println!("👋 Client disconnected: {}", client_id);
}

// Geometric conflict resolution
fn resolve_conflict_geometric(
    local_state: &Multivector3D<f64>,
    remote_state: &Multivector3D<f64>,
) -> Multivector3D<f64> {
    // Use geometric mean for conflict resolution
    let log_local = local_state.log();
    let log_remote = remote_state.log();
    let mean_log = (log_local + log_remote).scale(0.5);
    mean_log.exp()
}

// Convert text operations to geometric transformations
fn text_to_geometric_transform(operation: &str, position: usize, content: &str) -> Multivector3D<f64> {
    match operation {
        "insert" => {
            // Insertion as translation in conformal space
            let pos_factor = (position as f64) / 1000.0; // Normalize position
            let content_factor = content.len() as f64 / 100.0; // Content length factor
            
            cliffy_core::cl3_0::e1::<f64>().scale(pos_factor) + 
            cliffy_core::cl3_0::e2::<f64>().scale(content_factor)
        }
        "delete" => {
            // Deletion as rotation (undoing insertion)
            let pos_factor = (position as f64) / 1000.0;
            let content_factor = content.len() as f64 / 100.0;
            
            cliffy_core::cl3_0::e1::<f64>().scale(-pos_factor) + 
            cliffy_core::cl3_0::e2::<f64>().scale(-content_factor)
        }
        "format" => {
            // Formatting as bivector transformation
            let style_factor = match content {
                "bold" => 1.0,
                "italic" => 0.5,
                "underline" => 0.25,
                _ => 0.1,
            };
            
            cliffy_core::cl3_0::e1::<f64>().geometric_product(&cliffy_core::cl3_0::e2::<f64>()).scale(style_factor)
        }
        _ => Multivector3D::scalar(1.0),
    }
}