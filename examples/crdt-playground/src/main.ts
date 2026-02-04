/**
 * Cliffy CRDT Playground
 *
 * Demonstrates:
 * - GeometricCRDT from cliffy-protocols via WASM bindings
 * - Multiple peers with concurrent operations
 * - Vector clocks for causal ordering
 * - Merge and convergence visualization
 * - Geometric algebra concepts in CRDT design
 */

import init, {
  GeometricCRDT,
  VectorClock,
  OperationType,
  generateNodeId,
} from '@cliffy-ga/core';

// =============================================================================
// UI State
// =============================================================================

interface PeerState {
  id: string;
  crdt: GeometricCRDT;
  displayName: string;
}

interface LogEntry {
  time: string;
  peer: string;
  action: string;
}

const state = {
  peers: new Map<string, PeerState>(),
  log: [] as LogEntry[],
  mergeResult: null as GeometricCRDT | null,
  initialized: false,
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

// =============================================================================
// CRDT Operations using real WASM bindings
// =============================================================================

function initializePeers(): void {
  state.peers.clear();

  // Create three peers with the real GeometricCRDT
  const peer1Id = generateNodeId();
  const peer2Id = generateNodeId();
  const peer3Id = generateNodeId();

  state.peers.set('peer1', {
    id: peer1Id,
    crdt: new GeometricCRDT(peer1Id, 10.0),
    displayName: 'Peer 1',
  });

  state.peers.set('peer2', {
    id: peer2Id,
    crdt: new GeometricCRDT(peer2Id, 10.0),
    displayName: 'Peer 2',
  });

  state.peers.set('peer3', {
    id: peer3Id,
    crdt: new GeometricCRDT(peer3Id, 10.0),
    displayName: 'Peer 3',
  });

  state.log = [];
  state.mergeResult = null;
  addLogEntry('system', 'Initialized 3 peers with state = 10.0 (using real WASM CRDT)');
}

function add(peerId: string, value: number): void {
  const peer = state.peers.get(peerId);
  if (!peer) return;

  peer.crdt.add(value);
  addLogEntry(peerId, `Added ${value} → state = ${peer.crdt.state().toFixed(2)}`);
}

function multiply(peerId: string, value: number): void {
  const peer = state.peers.get(peerId);
  if (!peer) return;

  peer.crdt.multiply(value);
  addLogEntry(peerId, `Multiplied by ${value} → state = ${peer.crdt.state().toFixed(2)}`);
}

function geometricOp(peerId: string, value: number): void {
  const peer = state.peers.get(peerId);
  if (!peer) return;

  peer.crdt.applyOperation(value, OperationType.GeometricProduct);
  addLogEntry(peerId, `Geometric product with ${value} → state = ${peer.crdt.state().toFixed(2)}`);
}

function syncPeers(fromId: string, toId: string): void {
  const from = state.peers.get(fromId);
  const to = state.peers.get(toId);
  if (!from || !to) return;

  // Merge the source into the destination
  const merged = to.crdt.merge(from.crdt);

  // Replace the destination CRDT with the merged result
  state.peers.set(toId, {
    ...to,
    crdt: merged,
  });

  addLogEntry('system', `Synced ${fromId} → ${toId}, ${toId} state = ${merged.state().toFixed(2)}`);
}

function mergeAll(): void {
  const peerList = Array.from(state.peers.values());
  if (peerList.length < 2) return;

  // Start with peer1
  let result = peerList[0].crdt;

  // Merge all others into it
  for (let i = 1; i < peerList.length; i++) {
    result = result.merge(peerList[i].crdt);
  }

  state.mergeResult = result;

  // Update all peers to the merged state by creating new CRDTs
  // (In a real app, you'd propagate the merged operations)
  const finalState = result.state();
  for (const [key, peer] of state.peers.entries()) {
    const newCrdt = new GeometricCRDT(peer.id, finalState);
    state.peers.set(key, {
      ...peer,
      crdt: newCrdt,
    });
  }

  addLogEntry('system', `Merged all peers → converged state = ${finalState.toFixed(2)}`);
}

function reset(): void {
  initializePeers();
}

// =============================================================================
// Safe DOM Rendering Helpers
// =============================================================================

function createElement(
  tag: string,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = []
): HTMLElement {
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
  const states = Array.from(state.peers.values()).map((p) => p.crdt.state());
  return states.every((s) => Math.abs(s - states[0]) < 0.001);
}

function formatVectorClock(crdt: GeometricCRDT): string {
  const clock = crdt.vectorClock;
  const obj = clock.toObject();
  const entries = Object.entries(obj)
    .map(([k, v]) => `${k.slice(0, 4)}:${v}`)
    .join(', ');
  return `{${entries || 'empty'}}`;
}

function createPeerCard(key: string, peer: PeerState): HTMLElement {
  const card = createElement('div', { class: `peer-card ${key}` });

  // Header
  const header = createElement('div', { class: 'peer-header' });
  const name = createElement('span', { class: 'peer-name' }, [
    createElement('span', { class: 'peer-dot' }),
    peer.displayName,
  ]);
  const peerId = createElement('span', { class: 'peer-id' }, [peer.id.slice(0, 8) + '...']);
  header.appendChild(name);
  header.appendChild(peerId);
  card.appendChild(header);

  // State display
  const stateDisplay = createElement('div', { class: 'state-display' });
  stateDisplay.appendChild(
    createElement('div', { class: 'state-label' }, ['Current State (GA3 Scalar)'])
  );
  stateDisplay.appendChild(
    createElement('div', { class: 'state-value' }, [peer.crdt.state().toFixed(2)])
  );
  stateDisplay.appendChild(
    createElement('div', { class: 'vector-clock' }, [
      `Vector Clock: ${formatVectorClock(peer.crdt)}`,
    ])
  );
  stateDisplay.appendChild(
    createElement('div', { class: 'op-count' }, [
      `Operations: ${peer.crdt.operationCount}`,
    ])
  );
  card.appendChild(stateDisplay);

  // Operations
  const ops = createElement('div', { class: 'operations' });

  const btn1 = createElement('button', {}, ['+5']);
  btn1.onclick = () => add(key, 5);
  ops.appendChild(btn1);

  const btn2 = createElement('button', {}, ['-3']);
  btn2.onclick = () => add(key, -3);
  ops.appendChild(btn2);

  const btn3 = createElement('button', {}, ['×2']);
  btn3.onclick = () => multiply(key, 2);
  ops.appendChild(btn3);

  const btn4 = createElement('button', {}, ['GA ⊗ 1.5']);
  btn4.onclick = () => geometricOp(key, 1.5);
  ops.appendChild(btn4);

  card.appendChild(ops);

  return card;
}

function createVisualization(): HTMLElement {
  const peerStates = Array.from(state.peers.values());
  const maxState = Math.max(...peerStates.map((p) => Math.abs(p.crdt.state())), 1);

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
    const x = 50 + (peer.crdt.state() / maxState) * 35;
    const y = 30 + i * 25;
    const point = createElement('div', { class: `viz-point peer${i + 1}` }, [`P${i + 1}`]);
    point.style.left = `${x}%`;
    point.style.top = `${y}%`;
    viz.appendChild(point);
  });

  if (state.mergeResult) {
    const x = 50 + (state.mergeResult.state() / maxState) * 35;
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

  if (!state.initialized) {
    app.textContent = 'Initializing WASM...';
    return;
  }

  // Clear existing content
  app.textContent = '';

  const isConverged = checkConvergence();
  const playground = createElement('div', { class: 'playground' });

  // === WASM Badge ===
  const badge = createElement('div', { class: 'wasm-badge' }, [
    '✓ Using real cliffy-protocols WASM bindings',
  ]);
  playground.appendChild(badge);

  // === Peers Section ===
  const peersSection = createElement('div', { class: 'section' });
  peersSection.appendChild(createElement('h2', {}, ['Distributed Peers']));
  const peersGrid = createElement('div', { class: 'peers-grid' });
  for (const [key, peer] of state.peers.entries()) {
    peersGrid.appendChild(createPeerCard(key, peer));
  }
  peersSection.appendChild(peersGrid);
  playground.appendChild(peersSection);

  // === Visualization Section ===
  const vizSection = createElement('div', { class: 'section' });
  vizSection.appendChild(createElement('h2', {}, ['State Space Visualization']));
  vizSection.appendChild(createVisualization());

  const convergence = createElement(
    'div',
    { class: `convergence-indicator ${isConverged ? 'converged' : 'diverged'}` }
  );
  convergence.textContent = isConverged
    ? '✓ All peers converged'
    : '⚠ Peers have diverged states';
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
    result.appendChild(
      createElement('div', { class: 'state-label' }, ['Merged State (Geometric Join)'])
    );
    result.appendChild(
      createElement('div', { class: 'state-value' }, [state.mergeResult.state().toFixed(2)])
    );
    result.appendChild(
      createElement('div', { class: 'vector-clock' }, [
        `Merged Clock: ${formatVectorClock(state.mergeResult)}`,
      ])
    );
    mergeSection.appendChild(result);
  }

  syncSection.appendChild(mergeSection);

  const conceptBox1 = createElement('div', { class: 'concept-box' });
  conceptBox1.appendChild(createElement('h3', {}, ['How Geometric CRDT Works']));
  const p1 = createElement('p', {});
  p1.textContent =
    'Each peer maintains state as a GA3 multivector and a vector clock. ' +
    'Operations are geometric transformations (rotors, translations). ' +
    'When merging, operations are replayed in causal order. ' +
    'Conflicts resolve via geometric mean: exp((log(a) + log(b))/2). ' +
    'This guarantees convergence without coordination.';
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
  text1.textContent =
    "Each peer tracks logical time for all known peers. " +
    "This establishes causal ordering: if A happens-before B, " +
    "then A's effects are applied before B's during merge. " +
    "Concurrent operations are ordered deterministically by node ID.";
  box1.appendChild(text1);
  conceptsGrid.appendChild(box1);

  const box2 = createElement('div', { class: 'concept-box' });
  box2.appendChild(createElement('h3', {}, ['Geometric Operations']));
  const text2 = createElement('p', {});
  text2.textContent =
    'State changes are geometric transformations in Clifford algebra: ' +
    'addition (translation), multiplication (scaling), ' +
    'geometric_product (rotation + scaling). ' +
    'The geometric product ab encodes both the inner and outer products.';
  box2.appendChild(text2);
  conceptsGrid.appendChild(box2);

  const box3 = createElement('div', { class: 'concept-box' });
  box3.appendChild(createElement('h3', {}, ['Eventual Consistency']));
  const text3 = createElement('p', {});
  text3.textContent =
    'CRDTs guarantee that all peers will eventually converge to the same state, ' +
    'regardless of the order messages are received. ' +
    'The key: operations are commutative and associative ' +
    'when properly ordered by causal history.';
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

async function main() {
  // Initialize the WASM module
  await init();

  state.initialized = true;
  initializePeers();
  render();

  console.log('Cliffy CRDT Playground initialized');
  console.log('Using real cliffy-protocols WASM bindings');
  console.log('Available types: GeometricCRDT, VectorClock, OperationType, generateNodeId');
}

main().catch((err) => {
  console.error('Failed to initialize:', err);
  const app = document.getElementById('app');
  if (app) {
    app.textContent = `Failed to initialize: ${err.message}`;
  }
});
