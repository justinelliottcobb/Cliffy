/**
 * Cliffy P2P Sync Demo
 *
 * Demonstrates:
 * - Simulated WebRTC-style peer discovery
 * - Real-time state synchronization across peers
 * - Delta compression and efficient state transfer
 * - Network partition handling and recovery
 * - Vector clock-based causal ordering
 */

import init, {
  behavior,
  GeometricCRDT,
  VectorClock,
  OperationType,
  generateNodeId,
} from '@cliffy-ga/core';

// =============================================================================
// Types
// =============================================================================

interface Peer {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  crdt: GeometricCRDT;
  clock: VectorClock;
  status: 'connected' | 'syncing' | 'offline';
  isLocal: boolean;
  isPartitioned: boolean;
  lastSync: number;
  operationCount: number;
}

interface Connection {
  from: string;
  to: string;
  active: boolean;
  syncing: boolean;
}

interface Delta {
  id: string;
  from: string;
  to: string;
  direction: 'outgoing' | 'incoming';
  size: number;
  timestamp: number;
  operations: number;
}

interface SyncState {
  peers: Map<string, Peer>;
  connections: Connection[];
  deltas: Delta[];
  localPeerId: string;
  totalSyncs: number;
  totalBytesTransferred: number;
  sharedCounter: number;
}

// =============================================================================
// State Management
// =============================================================================

const state: SyncState = {
  peers: new Map(),
  connections: [],
  deltas: [],
  localPeerId: '',
  totalSyncs: 0,
  totalBytesTransferred: 0,
  sharedCounter: 0,
};

// FRP Behaviors (initialized after WASM init)
let counterBehavior: ReturnType<typeof behavior<number>>;
let syncStatusBehavior: ReturnType<typeof behavior<string>>;

// Peer colors
const PEER_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7'];

// =============================================================================
// Peer Management
// =============================================================================

function createPeer(id: string, name: string, isLocal: boolean, index: number): Peer {
  // Position peers in a circle
  const angle = (index * Math.PI * 2) / 4 + Math.PI / 4;
  const radius = 120;
  const centerX = 300;
  const centerY = 150;

  return {
    id,
    name,
    color: PEER_COLORS[index % PEER_COLORS.length],
    position: {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    },
    crdt: new GeometricCRDT(id),
    clock: new VectorClock(id),
    status: 'connected',
    isLocal,
    isPartitioned: false,
    lastSync: Date.now(),
    operationCount: 0,
  };
}

function initializePeers(): void {
  state.peers.clear();
  state.connections = [];

  // Create local peer
  state.localPeerId = generateNodeId();
  const localPeer = createPeer(state.localPeerId, 'Local', true, 0);
  state.peers.set(state.localPeerId, localPeer);

  // Create remote peers
  const remoteNames = ['Peer A', 'Peer B', 'Peer C'];
  for (let i = 0; i < remoteNames.length; i++) {
    const id = generateNodeId();
    const peer = createPeer(id, remoteNames[i], false, i + 1);
    state.peers.set(id, peer);
  }

  // Create mesh connections
  const peerIds = Array.from(state.peers.keys());
  for (let i = 0; i < peerIds.length; i++) {
    for (let j = i + 1; j < peerIds.length; j++) {
      state.connections.push({
        from: peerIds[i],
        to: peerIds[j],
        active: true,
        syncing: false,
      });
    }
  }
}

// =============================================================================
// Sync Operations
// =============================================================================

function localIncrement(): void {
  const localPeer = state.peers.get(state.localPeerId);
  if (!localPeer) return;

  state.sharedCounter++;
  localPeer.operationCount++;
  localPeer.clock.increment();

  localPeer.crdt.addOperation(
    OperationType.Insert,
    state.sharedCounter,
    1,
    0
  );

  counterBehavior.set(state.sharedCounter);

  // Trigger sync to connected peers
  triggerSync(state.localPeerId);
}

function triggerSync(fromPeerId: string): void {
  const fromPeer = state.peers.get(fromPeerId);
  if (!fromPeer || fromPeer.isPartitioned) return;

  syncStatusBehavior.set('syncing');

  // Find connected peers and sync
  for (const conn of state.connections) {
    if (!conn.active) continue;

    let targetId = '';
    if (conn.from === fromPeerId) targetId = conn.to;
    else if (conn.to === fromPeerId) targetId = conn.from;
    else continue;

    const targetPeer = state.peers.get(targetId);
    if (!targetPeer || targetPeer.isPartitioned) continue;

    // Mark connection as syncing
    conn.syncing = true;

    // Simulate network delay
    setTimeout(() => {
      performSync(fromPeerId, targetId);
      conn.syncing = false;
    }, 100 + Math.random() * 200);
  }

  setTimeout(() => {
    syncStatusBehavior.set('idle');
  }, 500);
}

function performSync(fromId: string, toId: string): void {
  const fromPeer = state.peers.get(fromId);
  const toPeer = state.peers.get(toId);

  if (!fromPeer || !toPeer) return;
  if (fromPeer.isPartitioned || toPeer.isPartitioned) return;

  // Simulate delta calculation
  const opsDiff = Math.abs(fromPeer.operationCount - toPeer.operationCount);
  const deltaSize = opsDiff * 24 + 8; // Simulated byte size

  // Record delta
  const delta: Delta = {
    id: generateNodeId(),
    from: fromId,
    to: toId,
    direction: fromId === state.localPeerId ? 'outgoing' : 'incoming',
    size: deltaSize,
    timestamp: Date.now(),
    operations: opsDiff,
  };

  state.deltas.unshift(delta);
  if (state.deltas.length > 15) {
    state.deltas.pop();
  }

  // Merge states
  const maxOps = Math.max(fromPeer.operationCount, toPeer.operationCount);
  fromPeer.operationCount = maxOps;
  toPeer.operationCount = maxOps;

  // Update clocks
  fromPeer.clock.merge(toPeer.clock);
  toPeer.clock.merge(fromPeer.clock);

  // Merge CRDTs
  fromPeer.crdt.merge(toPeer.crdt);
  toPeer.crdt.merge(fromPeer.crdt);

  // Update sync stats
  fromPeer.lastSync = Date.now();
  toPeer.lastSync = Date.now();
  fromPeer.status = 'connected';
  toPeer.status = 'connected';

  state.totalSyncs++;
  state.totalBytesTransferred += deltaSize;
}

function togglePartition(peerId: string): void {
  const peer = state.peers.get(peerId);
  if (!peer || peer.isLocal) return;

  peer.isPartitioned = !peer.isPartitioned;
  peer.status = peer.isPartitioned ? 'offline' : 'connected';

  // Update connections
  for (const conn of state.connections) {
    if (conn.from === peerId || conn.to === peerId) {
      conn.active = !peer.isPartitioned;
    }
  }
}

function simulateRemoteActivity(): void {
  for (const peer of state.peers.values()) {
    if (peer.isLocal || peer.isPartitioned) continue;

    // Random chance of activity
    if (Math.random() < 0.02) {
      peer.operationCount++;
      peer.clock.increment();
      peer.crdt.addOperation(
        OperationType.Insert,
        peer.operationCount,
        1,
        0
      );

      // Trigger sync from this peer
      triggerSync(peer.id);
    }
  }
}

// =============================================================================
// DOM Helpers
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

function renderApp(): HTMLElement {
  const container = createElement('div', { class: 'app-container' });

  // Network visualization
  const networkView = createElement('div', { class: 'network-view' });

  // Controls
  const controls = createElement('div', { class: 'controls' });

  const incrementBtn = createElement('button', { class: 'primary' }, ['Increment Counter']);
  incrementBtn.onclick = localIncrement;
  controls.appendChild(incrementBtn);

  const syncAllBtn = createElement('button', {}, ['Force Sync All']);
  syncAllBtn.onclick = () => triggerSync(state.localPeerId);
  controls.appendChild(syncAllBtn);

  const resetBtn = createElement('button', {}, ['Reset Network']);
  resetBtn.onclick = () => {
    initializePeers();
    state.deltas = [];
    state.totalSyncs = 0;
    state.totalBytesTransferred = 0;
    state.sharedCounter = 0;
    counterBehavior.set(0);
  };
  controls.appendChild(resetBtn);

  const counterDisplay = createElement('span', {
    style: 'margin-left: auto; font-size: 1.2em; color: var(--primary);',
  }, [`Counter: ${state.sharedCounter}`]);
  controls.appendChild(counterDisplay);

  networkView.appendChild(controls);

  // Canvas for peer visualization
  const canvas = createElement('div', { class: 'network-canvas' });

  // Draw connections first (so they appear behind nodes)
  for (const conn of state.connections) {
    const fromPeer = state.peers.get(conn.from);
    const toPeer = state.peers.get(conn.to);
    if (!fromPeer || !toPeer) continue;

    const dx = toPeer.position.x - fromPeer.position.x;
    const dy = toPeer.position.y - fromPeer.position.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const line = createElement('div', { class: 'connection-line' });
    line.style.left = `${fromPeer.position.x}px`;
    line.style.top = `${fromPeer.position.y}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}rad)`;

    if (conn.syncing) {
      line.classList.add('syncing');
    } else if (conn.active) {
      line.classList.add('active');
    }

    canvas.appendChild(line);
  }

  // Draw peer nodes
  for (const peer of state.peers.values()) {
    const node = createElement('div', { class: 'peer-node' });
    node.style.left = `${peer.position.x}px`;
    node.style.top = `${peer.position.y}px`;
    node.style.backgroundColor = peer.color;

    if (peer.isLocal) {
      node.classList.add('local');
    }
    if (peer.isPartitioned) {
      node.classList.add('partitioned');
    }

    // Status dot
    const statusDot = createElement('div', { class: 'status-dot' });
    statusDot.classList.add(peer.status);
    node.appendChild(statusDot);

    // Name
    node.appendChild(createElement('span', {}, [peer.name]));

    // Ops count
    const opsSpan = createElement('span', { style: 'font-size: 0.7em; opacity: 0.7;' });
    opsSpan.textContent = `${peer.operationCount} ops`;
    node.appendChild(opsSpan);

    // Click handler for partition toggle
    if (!peer.isLocal) {
      node.onclick = () => togglePartition(peer.id);
      node.title = 'Click to toggle network partition';
    }

    canvas.appendChild(node);
  }

  networkView.appendChild(canvas);

  // Legend
  const legend = createElement('div', { class: 'network-legend' });

  const addLegendItem = (color: string, label: string) => {
    const item = createElement('div', { class: 'legend-item' });
    const dot = createElement('div', { class: 'legend-dot' });
    dot.style.backgroundColor = color;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(label));
    legend.appendChild(item);
  };

  addLegendItem('#44ff88', 'Connected');
  addLegendItem('#ffaa00', 'Syncing');
  addLegendItem('#ff4444', 'Partitioned');
  addLegendItem('white', 'Local Peer');

  networkView.appendChild(legend);
  container.appendChild(networkView);

  // Panels
  const panels = createElement('div', { class: 'panels' });

  // Peers panel
  const peersPanel = createElement('div', { class: 'panel' });
  peersPanel.appendChild(createElement('h2', {}, ['Network Peers']));
  const peerList = createElement('div', { class: 'peer-list' });

  for (const peer of state.peers.values()) {
    const item = createElement('div', { class: 'peer-item' });

    const avatar = createElement('div', { class: 'peer-avatar' });
    avatar.style.backgroundColor = peer.color;
    avatar.textContent = peer.name[0];
    item.appendChild(avatar);

    const info = createElement('div', { class: 'peer-info' });
    info.appendChild(
      createElement('div', { class: 'peer-name' }, [
        peer.name + (peer.isLocal ? ' (You)' : ''),
      ])
    );

    const clockTime = peer.clock.getTime(peer.id);
    info.appendChild(
      createElement('div', { class: 'peer-meta' }, [
        `Clock: ${clockTime} | Ops: ${peer.operationCount}`,
      ])
    );

    item.appendChild(info);

    // Actions for remote peers
    if (!peer.isLocal) {
      const actions = createElement('div', { class: 'peer-actions' });
      const partitionBtn = createElement(
        'button',
        { class: peer.isPartitioned ? 'primary' : 'danger' },
        [peer.isPartitioned ? 'Reconnect' : 'Partition']
      );
      partitionBtn.onclick = (e) => {
        e.stopPropagation();
        togglePartition(peer.id);
      };
      actions.appendChild(partitionBtn);
      item.appendChild(actions);
    }

    peerList.appendChild(item);
  }

  peersPanel.appendChild(peerList);
  panels.appendChild(peersPanel);

  // Stats panel
  const statsPanel = createElement('div', { class: 'panel' });
  statsPanel.appendChild(createElement('h2', {}, ['Sync Statistics']));
  const statsGrid = createElement('div', { class: 'stats-grid' });

  const addStat = (value: string, label: string) => {
    const item = createElement('div', { class: 'stat-item' });
    item.appendChild(createElement('div', { class: 'stat-value' }, [value]));
    item.appendChild(createElement('div', { class: 'stat-label' }, [label]));
    statsGrid.appendChild(item);
  };

  addStat(String(state.totalSyncs), 'Total Syncs');
  addStat(`${(state.totalBytesTransferred / 1024).toFixed(1)}KB`, 'Data Sent');
  addStat(String(state.peers.size), 'Peers');
  addStat(String(state.connections.filter(c => c.active).length), 'Active Links');

  statsPanel.appendChild(statsGrid);

  // State display
  const stateDisplay = createElement('div', { class: 'state-display', style: 'margin-top: 12px;' });
  const localPeer = state.peers.get(state.localPeerId);
  if (localPeer) {
    // Build state display using safe DOM methods
    const counterKey = createElement('span', { class: 'key' }, ['counter:']);
    const counterVal = createElement('span', { class: 'value' }, [` ${state.sharedCounter}`]);
    stateDisplay.appendChild(counterKey);
    stateDisplay.appendChild(counterVal);
    stateDisplay.appendChild(document.createElement('br'));

    const opsKey = createElement('span', { class: 'key' }, ['local_ops:']);
    const opsVal = createElement('span', { class: 'value' }, [` ${localPeer.operationCount}`]);
    stateDisplay.appendChild(opsKey);
    stateDisplay.appendChild(opsVal);
    stateDisplay.appendChild(document.createElement('br'));

    const crdtKey = createElement('span', { class: 'key' }, ['crdt_ops:']);
    const crdtVal = createElement('span', { class: 'value' }, [` ${localPeer.crdt.operationCount}`]);
    stateDisplay.appendChild(crdtKey);
    stateDisplay.appendChild(crdtVal);
  }
  statsPanel.appendChild(stateDisplay);

  panels.appendChild(statsPanel);

  // Delta log panel
  const deltaPanel = createElement('div', { class: 'panel' });
  deltaPanel.appendChild(createElement('h2', {}, ['Delta History']));
  const deltaLog = createElement('div', { class: 'delta-log' });

  for (const delta of state.deltas.slice(0, 10)) {
    const fromPeer = state.peers.get(delta.from);
    const toPeer = state.peers.get(delta.to);

    const item = createElement('div', { class: `delta-item ${delta.direction}` });

    const direction = createElement('span', { class: 'direction' });
    direction.textContent = delta.direction === 'outgoing' ? '→' : '←';
    item.appendChild(direction);

    const text = createElement('span', {});
    text.textContent = `${fromPeer?.name || '?'} → ${toPeer?.name || '?'}`;
    item.appendChild(text);

    const size = createElement('span', { class: 'size' });
    size.textContent = `${delta.size}B`;
    item.appendChild(size);

    deltaLog.appendChild(item);
  }

  if (state.deltas.length === 0) {
    deltaLog.appendChild(createElement('div', { class: 'delta-item' }, ['No syncs yet']));
  }

  deltaPanel.appendChild(deltaLog);
  panels.appendChild(deltaPanel);

  // Concept box
  const conceptPanel = createElement('div', { class: 'panel' });
  const conceptBox = createElement('div', { class: 'concept-box' });
  conceptBox.appendChild(createElement('h3', {}, ['P2P State Synchronization']));
  const conceptP = createElement('p', {});
  conceptP.textContent =
    'Each peer maintains a GeometricCRDT and VectorClock. When state changes, deltas are computed ' +
    'and sent to connected peers. Vector clocks ensure causal ordering, while geometric merge ' +
    'guarantees eventual consistency. Click on remote peers to simulate network partitions.';
  conceptBox.appendChild(conceptP);
  conceptPanel.appendChild(conceptBox);
  panels.appendChild(conceptPanel);

  container.appendChild(panels);
  return container;
}

// =============================================================================
// Main Loop
// =============================================================================

function mainLoop(): void {
  simulateRemoteActivity();

  const app = document.getElementById('app');
  if (app) {
    app.textContent = '';
    app.appendChild(renderApp());
  }

  setTimeout(mainLoop, 100);
}

// =============================================================================
// Initialize
// =============================================================================

async function main() {
  await init();

  // Initialize FRP Behaviors after WASM is ready
  counterBehavior = behavior(0);
  syncStatusBehavior = behavior('idle');

  initializePeers();

  const app = document.getElementById('app');
  if (app) {
    app.appendChild(renderApp());
  }

  console.log('Cliffy P2P Sync Demo initialized');
  console.log('Using GeometricCRDT for distributed state');
  console.log('VectorClocks for causal ordering');
  console.log('Click peers to simulate network partitions');

  mainLoop();
}

main().catch(console.error);
