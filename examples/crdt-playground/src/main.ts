/**
 * Cliffy CRDT Playground
 *
 * Demonstrates:
 * - GeometricCRDT operations (simulated in TypeScript)
 * - Multiple peers with concurrent operations
 * - Vector clocks for causal ordering
 * - Merge and convergence visualization
 * - Geometric algebra concepts in CRDT design
 *
 * Note: This is a TypeScript simulation of the Rust cliffy-protocols CRDT.
 * The actual implementation uses geometric algebra operations in Rust.
 *
 * Security Note: This demo uses innerHTML for rendering. In production,
 * use safe DOM methods or a sanitizer library like DOMPurify.
 */

// =============================================================================
// CRDT Simulation Types (mirrors cliffy-protocols/src/crdt.rs)
// =============================================================================

interface VectorClock {
  [nodeId: string]: number;
}

interface GeometricOperation {
  id: number;
  nodeId: string;
  timestamp: VectorClock;
  value: number; // Simplified: using scalar for demo (real impl uses GA3 multivector)
  operationType: 'addition' | 'multiplication' | 'geometric_product';
}

interface GeometricCRDT {
  nodeId: string;
  state: number; // Simplified scalar state (real impl uses GA3)
  vectorClock: VectorClock;
  operations: Map<number, GeometricOperation>;
  nextOpId: number;
}

// =============================================================================
// Vector Clock Operations
// =============================================================================

function createVectorClock(): VectorClock {
  return {};
}

function tickClock(clock: VectorClock, nodeId: string): VectorClock {
  return { ...clock, [nodeId]: (clock[nodeId] || 0) + 1 };
}

function mergeClock(a: VectorClock, b: VectorClock): VectorClock {
  const result: VectorClock = { ...a };
  for (const [node, time] of Object.entries(b)) {
    result[node] = Math.max(result[node] || 0, time);
  }
  return result;
}

function happensBefore(a: VectorClock, b: VectorClock): boolean {
  let atLeastOneLess = false;
  const allNodes = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const node of allNodes) {
    const aTime = a[node] || 0;
    const bTime = b[node] || 0;
    if (aTime > bTime) return false;
    if (aTime < bTime) atLeastOneLess = true;
  }

  return atLeastOneLess;
}

function formatClock(clock: VectorClock): string {
  const entries = Object.entries(clock)
    .map(([k, v]) => `${k.slice(0, 4)}:${v}`)
    .join(', ');
  return `{${entries}}`;
}

// =============================================================================
// GeometricCRDT Operations
// =============================================================================

function createCRDT(nodeId: string, initialState: number = 0): GeometricCRDT {
  return {
    nodeId,
    state: initialState,
    vectorClock: createVectorClock(),
    operations: new Map(),
    nextOpId: 0,
  };
}

function createOperation(
  crdt: GeometricCRDT,
  value: number,
  opType: GeometricOperation['operationType']
): GeometricOperation {
  crdt.vectorClock = tickClock(crdt.vectorClock, crdt.nodeId);
  const op: GeometricOperation = {
    id: crdt.nextOpId++,
    nodeId: crdt.nodeId,
    timestamp: { ...crdt.vectorClock },
    value,
    operationType: opType,
  };
  return op;
}

function applyOperation(crdt: GeometricCRDT, op: GeometricOperation): void {
  // Idempotent: skip if already applied
  if (crdt.operations.has(op.id) && crdt.operations.get(op.id)?.nodeId === op.nodeId) {
    return;
  }

  crdt.vectorClock = mergeClock(crdt.vectorClock, op.timestamp);
  crdt.operations.set(crdt.operations.size, op);

  switch (op.operationType) {
    case 'addition':
      crdt.state += op.value;
      break;
    case 'multiplication':
      crdt.state *= op.value;
      break;
    case 'geometric_product':
      // In real GA: geometric product of multivectors
      // Simplified: treat as a scaling + rotation factor
      crdt.state = crdt.state * op.value + op.value;
      break;
  }
}

function mergeCRDTs(a: GeometricCRDT, b: GeometricCRDT): GeometricCRDT {
  // Collect all operations
  const allOps: GeometricOperation[] = [];
  a.operations.forEach((op) => allOps.push(op));
  b.operations.forEach((op) => {
    // Only add if not already present (by nodeId + original id)
    const exists = allOps.some((o) => o.nodeId === op.nodeId && o.id === op.id);
    if (!exists) allOps.push(op);
  });

  // Sort by causal order (happens-before), with deterministic tie-breaking
  allOps.sort((x, y) => {
    if (happensBefore(x.timestamp, y.timestamp)) return -1;
    if (happensBefore(y.timestamp, x.timestamp)) return 1;
    // Concurrent: use node ID and op ID for deterministic order
    if (x.nodeId < y.nodeId) return -1;
    if (x.nodeId > y.nodeId) return 1;
    return x.id - y.id;
  });

  // Re-apply all operations to fresh state
  const result = createCRDT(a.nodeId, 0);
  result.vectorClock = mergeClock(a.vectorClock, b.vectorClock);

  for (const op of allOps) {
    applyOperation(result, op);
  }

  return result;
}

// =============================================================================
// UI State
// =============================================================================

interface LogEntry {
  time: string;
  peer: string;
  action: string;
}

const state = {
  peers: new Map<string, GeometricCRDT>(),
  log: [] as LogEntry[],
  mergeResult: null as GeometricCRDT | null,
};

function addLogEntry(peer: string, action: string): void {
  const now = new Date();
  state.log.unshift({
    time: `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
    peer,
    action,
  });
  if (state.log.length > 50) state.log.pop();
  render();
}

// Initialize peers
function initializePeers(): void {
  state.peers.set('peer1', createCRDT('peer1', 10));
  state.peers.set('peer2', createCRDT('peer2', 10));
  state.peers.set('peer3', createCRDT('peer3', 10));
  state.log = [];
  state.mergeResult = null;
  addLogEntry('system', 'Initialized 3 peers with state = 10');
}

// =============================================================================
// Operations
// =============================================================================

function add(peerId: string, value: number): void {
  const peer = state.peers.get(peerId);
  if (!peer) return;

  const op = createOperation(peer, value, 'addition');
  applyOperation(peer, op);
  addLogEntry(peerId, `Added ${value} → state = ${peer.state}`);
}

function multiply(peerId: string, value: number): void {
  const peer = state.peers.get(peerId);
  if (!peer) return;

  const op = createOperation(peer, value, 'multiplication');
  applyOperation(peer, op);
  addLogEntry(peerId, `Multiplied by ${value} → state = ${peer.state}`);
}

function geometricOp(peerId: string, value: number): void {
  const peer = state.peers.get(peerId);
  if (!peer) return;

  const op = createOperation(peer, value, 'geometric_product');
  applyOperation(peer, op);
  addLogEntry(peerId, `Geometric product with ${value} → state = ${peer.state.toFixed(2)}`);
}

function syncPeers(fromId: string, toId: string): void {
  const from = state.peers.get(fromId);
  const to = state.peers.get(toId);
  if (!from || !to) return;

  // Send all operations from 'from' to 'to'
  from.operations.forEach((op) => {
    const exists = Array.from(to.operations.values()).some(
      (o) => o.nodeId === op.nodeId && o.id === op.id
    );
    if (!exists) {
      applyOperation(to, op);
    }
  });

  addLogEntry('system', `Synced ${fromId} → ${toId}, ${toId} state = ${to.state.toFixed(2)}`);
}

function mergeAll(): void {
  const peers = Array.from(state.peers.values());
  if (peers.length < 2) return;

  let result = mergeCRDTs(peers[0], peers[1]);
  for (let i = 2; i < peers.length; i++) {
    result = mergeCRDTs(result, peers[i]);
  }

  state.mergeResult = result;

  // Also update all peers to converged state
  state.peers.forEach((peer) => {
    peer.state = result.state;
    peer.vectorClock = { ...result.vectorClock };
    result.operations.forEach((op, key) => {
      peer.operations.set(key, op);
    });
  });

  addLogEntry('system', `Merged all peers → converged state = ${result.state.toFixed(2)}`);
}

function reset(): void {
  initializePeers();
}

// =============================================================================
// Safe DOM Rendering Helpers
// =============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createElement(tag: string, attrs: Record<string, string> = {}, children: (Node | string)[] = []): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}

// =============================================================================
// Rendering
// =============================================================================

function checkConvergence(): boolean {
  const states = Array.from(state.peers.values()).map((p) => p.state);
  return states.every((s) => Math.abs(s - states[0]) < 0.001);
}

function createPeerCard(id: string, peer: GeometricCRDT): HTMLElement {
  const card = createElement('div', { class: `peer-card ${id}` });

  // Header
  const header = createElement('div', { class: 'peer-header' });
  const name = createElement('span', { class: 'peer-name' }, [
    createElement('span', { class: 'peer-dot' }),
    id.charAt(0).toUpperCase() + id.slice(1),
  ]);
  const peerId = createElement('span', { class: 'peer-id' }, [peer.nodeId]);
  header.appendChild(name);
  header.appendChild(peerId);
  card.appendChild(header);

  // State display
  const stateDisplay = createElement('div', { class: 'state-display' });
  stateDisplay.appendChild(createElement('div', { class: 'state-label' }, ['Current State (Multivector Scalar)']));
  stateDisplay.appendChild(createElement('div', { class: 'state-value' }, [peer.state.toFixed(2)]));
  stateDisplay.appendChild(createElement('div', { class: 'vector-clock' }, [`Vector Clock: ${formatClock(peer.vectorClock)}`]));
  card.appendChild(stateDisplay);

  // Operations
  const ops = createElement('div', { class: 'operations' });

  const btn1 = createElement('button', {}, ['+5']);
  btn1.onclick = () => add(id, 5);
  ops.appendChild(btn1);

  const btn2 = createElement('button', {}, ['-3']);
  btn2.onclick = () => add(id, -3);
  ops.appendChild(btn2);

  const btn3 = createElement('button', {}, ['×2']);
  btn3.onclick = () => multiply(id, 2);
  ops.appendChild(btn3);

  const btn4 = createElement('button', {}, ['GA ⊗ 1.5']);
  btn4.onclick = () => geometricOp(id, 1.5);
  ops.appendChild(btn4);

  card.appendChild(ops);

  return card;
}

function createVisualization(): HTMLElement {
  const peerStates = Array.from(state.peers.values());
  const maxState = Math.max(...peerStates.map((p) => Math.abs(p.state)), 1);

  const viz = createElement('div', { class: 'visualization' });
  viz.appendChild(createElement('div', { class: 'viz-axis x' }));
  viz.appendChild(createElement('div', { class: 'viz-axis y' }));

  const labelPlus = createElement('div', { class: 'viz-label' }, ['+']);
  labelPlus.style.left = '95%';
  labelPlus.style.top = '52%';
  viz.appendChild(labelPlus);

  const labelMinus = createElement('div', { class: 'viz-label' }, ['-']);
  labelMinus.style.left = '3%';
  labelMinus.style.top = '52%';
  viz.appendChild(labelMinus);

  const labelState = createElement('div', { class: 'viz-label' }, ['State']);
  labelState.style.left = '52%';
  labelState.style.top = '5%';
  viz.appendChild(labelState);

  peerStates.forEach((peer, i) => {
    const x = 50 + (peer.state / maxState) * 35;
    const y = 30 + i * 25;
    const point = createElement('div', { class: `viz-point peer${i + 1}` }, [`P${i + 1}`]);
    point.style.left = `${x}%`;
    point.style.top = `${y}%`;
    viz.appendChild(point);
  });

  if (state.mergeResult) {
    const x = 50 + (state.mergeResult.state / maxState) * 35;
    const point = createElement('div', { class: 'viz-point merged' }, ['M']);
    point.style.left = `${x}%`;
    point.style.top = '80%';
    viz.appendChild(point);
  }

  return viz;
}

function createLogSection(): HTMLElement {
  const log = createElement('div', { class: 'history-log' });

  if (state.log.length === 0) {
    const empty = createElement('div', {}, ['No operations yet...']);
    empty.style.color = 'var(--text-dim)';
    log.appendChild(empty);
  } else {
    for (const entry of state.log) {
      const row = createElement('div', { class: 'log-entry' });
      row.appendChild(createElement('span', { class: 'log-time' }, [entry.time]));
      row.appendChild(createElement('span', { class: `log-peer ${entry.peer}` }, [entry.peer]));
      row.appendChild(createElement('span', { class: 'log-action' }, [entry.action]));
      log.appendChild(row);
    }
  }

  return log;
}

function render(): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Clear existing content
  app.textContent = '';

  const isConverged = checkConvergence();
  const playground = createElement('div', { class: 'playground' });

  // === Peers Section ===
  const peersSection = createElement('div', { class: 'section' });
  peersSection.appendChild(createElement('h2', {}, ['Distributed Peers']));
  const peersGrid = createElement('div', { class: 'peers-grid' });
  for (const [id, peer] of state.peers.entries()) {
    peersGrid.appendChild(createPeerCard(id, peer));
  }
  peersSection.appendChild(peersGrid);
  playground.appendChild(peersSection);

  // === Visualization Section ===
  const vizSection = createElement('div', { class: 'section' });
  vizSection.appendChild(createElement('h2', {}, ['State Space Visualization']));
  vizSection.appendChild(createVisualization());

  const convergence = createElement('div', { class: `convergence-indicator ${isConverged ? 'converged' : 'diverged'}` });
  convergence.textContent = isConverged ? '✓ All peers converged' : '⚠ Peers have diverged states';
  vizSection.appendChild(convergence);
  playground.appendChild(vizSection);

  // === Sync & Merge Section ===
  const syncSection = createElement('div', { class: 'section' });
  syncSection.appendChild(createElement('h2', {}, ['Synchronization']));

  const mergeSection = createElement('div', { class: 'merge-section' });
  const controls = createElement('div', { class: 'merge-controls' });

  const syncBtn1 = createElement('button', {}, ['Sync P1 → P2']);
  syncBtn1.onclick = () => syncPeers('peer1', 'peer2');
  controls.appendChild(syncBtn1);

  const syncBtn2 = createElement('button', {}, ['Sync P2 → P1']);
  syncBtn2.onclick = () => syncPeers('peer2', 'peer1');
  controls.appendChild(syncBtn2);

  const syncBtn3 = createElement('button', {}, ['Sync P2 → P3']);
  syncBtn3.onclick = () => syncPeers('peer2', 'peer3');
  controls.appendChild(syncBtn3);

  const syncBtn4 = createElement('button', {}, ['Sync P3 → P1']);
  syncBtn4.onclick = () => syncPeers('peer3', 'peer1');
  controls.appendChild(syncBtn4);

  const mergeBtn = createElement('button', { class: 'accent' }, ['Merge All (Converge)']);
  mergeBtn.onclick = () => mergeAll();
  controls.appendChild(mergeBtn);

  mergeSection.appendChild(controls);

  if (state.mergeResult) {
    const result = createElement('div', { class: 'merge-result' });
    result.appendChild(createElement('div', { class: 'state-label' }, ['Merged State (Geometric Mean)']));
    result.appendChild(createElement('div', { class: 'state-value' }, [state.mergeResult.state.toFixed(2)]));
    result.appendChild(createElement('div', { class: 'vector-clock' }, [`Merged Clock: ${formatClock(state.mergeResult.vectorClock)}`]));
    mergeSection.appendChild(result);
  }

  syncSection.appendChild(mergeSection);

  const conceptBox1 = createElement('div', { class: 'concept-box' });
  conceptBox1.appendChild(createElement('h3', {}, ['How Geometric CRDT Works']));
  const p1 = createElement('p', {});
  p1.textContent = 'Each peer maintains state as a GA3 multivector and a vector clock. Operations are geometric transformations (rotors, translations). When merging, operations are replayed in causal order. Conflicts resolve via geometric mean: exp((log(a) + log(b))/2). This guarantees convergence without coordination.';
  conceptBox1.appendChild(p1);
  syncSection.appendChild(conceptBox1);
  playground.appendChild(syncSection);

  // === Log Section ===
  const logSection = createElement('div', { class: 'section' });
  logSection.appendChild(createElement('h2', {}, ['Operation Log']));
  logSection.appendChild(createLogSection());
  playground.appendChild(logSection);

  // === Concepts Section ===
  const conceptsSection = createElement('div', { class: 'section' });
  conceptsSection.appendChild(createElement('h2', {}, ['Key Concepts']));

  const conceptsGrid = createElement('div', { class: 'peers-grid' });

  const box1 = createElement('div', { class: 'concept-box' });
  box1.appendChild(createElement('h3', {}, ['Vector Clocks']));
  const text1 = createElement('p', {});
  text1.textContent = "Each peer tracks logical time for all known peers. This establishes causal ordering: if A happens-before B, then A's effects are applied before B's during merge. Concurrent operations are ordered deterministically by node ID.";
  box1.appendChild(text1);
  conceptsGrid.appendChild(box1);

  const box2 = createElement('div', { class: 'concept-box' });
  box2.appendChild(createElement('h3', {}, ['Geometric Operations']));
  const text2 = createElement('p', {});
  text2.textContent = 'State changes are geometric transformations in Clifford algebra: addition (translation), multiplication (scaling), geometric_product (rotation + scaling). The geometric product ab encodes both the inner and outer products.';
  box2.appendChild(text2);
  conceptsGrid.appendChild(box2);

  const box3 = createElement('div', { class: 'concept-box' });
  box3.appendChild(createElement('h3', {}, ['Eventual Consistency']));
  const text3 = createElement('p', {});
  text3.textContent = 'CRDTs guarantee that all peers will eventually converge to the same state, regardless of the order messages are received. The key: operations are commutative and associative when properly ordered by causal history.';
  box3.appendChild(text3);
  conceptsGrid.appendChild(box3);

  conceptsSection.appendChild(conceptsGrid);
  playground.appendChild(conceptsSection);

  // === Reset Button ===
  const resetDiv = createElement('div', { class: 'reset-all' });
  const resetBtn = createElement('button', { class: 'primary' }, ['Reset All Peers']);
  resetBtn.onclick = () => reset();
  resetDiv.appendChild(resetBtn);
  playground.appendChild(resetDiv);

  app.appendChild(playground);
}

// =============================================================================
// Initialize
// =============================================================================

initializePeers();
render();

console.log('Cliffy CRDT Playground initialized');
console.log('This is a TypeScript simulation of cliffy-protocols/src/crdt.rs');
console.log('The actual implementation uses geometric algebra (GA3) multivectors in Rust.');
