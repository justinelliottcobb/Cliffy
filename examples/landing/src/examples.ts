export interface Example {
  slug: string;
  name: string;
  description: string;
  category: 'basics' | 'forms' | 'distributed' | 'tools' | 'advanced';
  features: string[];
}

export const categories = [
  { id: 'all', name: 'All Examples' },
  { id: 'basics', name: 'Getting Started' },
  { id: 'forms', name: 'Forms & Lists' },
  { id: 'distributed', name: 'Distributed State' },
  { id: 'tools', name: 'Creative Tools' },
  { id: 'advanced', name: 'Advanced' },
] as const;

export const examples: Example[] = [
  {
    slug: 'tsx-counter',
    name: 'Counter',
    description: 'Basic counter demonstrating Behavior state, map() for derived values, and event handlers.',
    category: 'basics',
    features: ['Behavior', 'map()', 'Event handlers'],
  },
  {
    slug: 'tsx-todo',
    name: 'Todo List',
    description: 'List management with filtering, derived state, and form handling.',
    category: 'forms',
    features: ['combine()', 'List state', 'Filtering'],
  },
  {
    slug: 'tsx-forms',
    name: 'Form Validation',
    description: 'Form validation patterns with real-time feedback and combined validation state.',
    category: 'forms',
    features: ['Input binding', 'Validation', 'combine()'],
  },
  {
    slug: 'whiteboard',
    name: 'Collaborative Whiteboard',
    description: 'Real-time collaborative drawing canvas with geometric transformations.',
    category: 'tools',
    features: ['Canvas', 'Collaboration', 'Rotors'],
  },
  {
    slug: 'design-tool',
    name: 'Design Tool',
    description: 'Shape manipulation using geometric algebra rotors with undo/redo via versors.',
    category: 'tools',
    features: ['Rotors', 'Undo/Redo', 'Versors'],
  },
  {
    slug: 'crdt-playground',
    name: 'CRDT Playground',
    description: 'Interactive exploration of conflict-free replicated data types and geometric merging.',
    category: 'distributed',
    features: ['CRDT', 'Lattice join', 'Merge'],
  },
  {
    slug: 'document-editor',
    name: 'Document Editor',
    description: 'CRDT-based collaborative text editing with presence indicators.',
    category: 'distributed',
    features: ['Text CRDT', 'Presence', 'Sync'],
  },
  {
    slug: 'p2p-sync',
    name: 'P2P Sync',
    description: 'Peer-to-peer synchronization with network partition simulation.',
    category: 'distributed',
    features: ['P2P', 'Partitions', 'Recovery'],
  },
  {
    slug: 'multiplayer-game',
    name: 'Multiplayer Game',
    description: 'Entity interpolation with latency simulation and physics via rotors.',
    category: 'advanced',
    features: ['Interpolation', 'Latency', 'Physics'],
  },
  {
    slug: 'geometric-transforms',
    name: 'Geometric Transforms',
    description: 'Visualizing rotations and transformations using geometric algebra rotors.',
    category: 'advanced',
    features: ['Rotors', 'Visualization', 'GA3'],
  },
  {
    slug: 'gpu-benchmark',
    name: 'GPU Benchmark',
    description: 'WebGPU vs CPU performance comparison for geometric operations.',
    category: 'advanced',
    features: ['WebGPU', 'SIMD', 'Benchmarks'],
  },
  {
    slug: 'testing-showcase',
    name: 'Testing Showcase',
    description: 'Demonstrating algebraic testing patterns with cliffy-test.',
    category: 'advanced',
    features: ['Invariants', 'Property testing', 'Manifolds'],
  },
];
