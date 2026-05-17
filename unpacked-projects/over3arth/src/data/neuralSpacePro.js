export const neuralSpaceRuntimeBase = '/runtime/standalone-apps/NeuralSpacePro';

export const neuralSpaceProSummary = {
  product: 'NeuralSpacePro',
  version: '2.3.0',
  buildDate: '2026-05-02',
  platform: 'AbovetheSkye-Platforms/NeuralSpacePro',
  proofStatus: 'partial',
  localRuntimeBase: neuralSpaceRuntimeBase,
  knowledgeTotal: 60,
  memoryFabric: 'Memory Fabric v6.8.1',
  brainDrive: '90GB brain drive'
};

export const neuralSpaceKnowledgeCategories = [
  'core',
  'arch',
  'memory',
  'brain',
  'design',
  'ops',
  'webcreator',
  'pack'
];

export const neuralSpaceRoutes = [
  { method: 'GET', path: '/health', laneId: 'runtime', purpose: 'liveness check' },
  { method: 'GET', path: '/status', laneId: 'runtime', purpose: 'project index' },
  { method: 'GET', path: '/v1/runtime-summary', laneId: 'runtime', purpose: 'session and runtime summary' },
  { method: 'GET', path: '/v1/sessions', laneId: 'research', purpose: 'archived local research sessions' },
  { method: 'POST', path: '/.netlify/functions/gateway-chat', laneId: 'chat', purpose: 'same-origin local research chat proof' },
  { method: 'POST', path: '/build-website', laneId: 'build', purpose: 'trigger local build pipeline proof' },
  { method: 'GET', path: '/queue', laneId: 'build', purpose: 'static build queue state' },
  { method: 'POST', path: '/queue/drain', laneId: 'build', purpose: 'drain local queue events' },
  { method: 'GET', path: '/handoff-packs', laneId: 'handoff', purpose: 'local handoff packet archive' },
  { method: 'GET', path: '/review-board', laneId: 'handoff', purpose: 'review board' },
  { method: 'GET', path: '/execution-board', laneId: 'handoff', purpose: 'execution board' },
  { method: 'GET', path: '/dispatch-board', laneId: 'handoff', purpose: 'dispatch board' },
  { method: 'GET', path: '/workflow-timeline', laneId: 'handoff', purpose: 'workflow timeline' }
];

export const neuralSpaceLanes = [
  {
    id: 'chat',
    label: 'Neural Core',
    shortLabel: 'Core',
    gateId: 'focus',
    color: '#61f6ff',
    position: [-1.7, 0.58, -0.6],
    keywords: ['neural space', 'neuralspace', 'assistant dimension', 'chat core', 'local brain', 'companion', 'chatgpt', 'chat gpt'],
    gameplay: 'The energy vessel routes direct conversation into the local assistant brain.',
    response: 'Neural Core is open. I can hold the conversation as part of the world instead of outside it.'
  },
  {
    id: 'knowledge',
    label: 'Knowledge Vault',
    shortLabel: 'Vault',
    gateId: 'codex',
    color: '#f4c75b',
    position: [1.45, 0.92, -1.2],
    keywords: ['knowledge vault', 'knowledge', 'vault', 'memory fabric', 'brain drive', 'pack'],
    gameplay: 'Sixty registered knowledge sources become explorable memory rooms around Overearth.',
    response: 'Knowledge Vault is surfacing. Core, arch, memory, brain, design, ops, webcreator, and pack rooms are ready.'
  },
  {
    id: 'runtime',
    label: 'Runtime Spire',
    shortLabel: 'Run',
    gateId: 'focus',
    color: '#8fffe4',
    position: [0.08, 1.36, -1.62],
    keywords: ['runtime', 'worker', 'health', 'status', 'local runtime', 'sync runtime'],
    gameplay: 'The local worker becomes the planet nervous system: health, sessions, queue, and project memory.',
    response: 'Runtime Spire is listening for the local worker. When the worker is up, the globe can feel sessions and queue depth.'
  },
  {
    id: 'build',
    label: 'Build Forge',
    shortLabel: 'Forge',
    gateId: 'quests',
    color: '#ffb86b',
    position: [-1.24, -0.82, -0.95],
    keywords: ['build forge', 'build pipeline', 'build website', 'website generation', 'generate website', 'project archive'],
    gameplay: 'Website and artifact generation become quests the vessel can launch from inside the simulation.',
    response: 'Build Forge is hot. Give it a brief and it can create a local proof project through NeuralSpacePro.'
  },
  {
    id: 'research',
    label: 'Research Well',
    shortLabel: 'Research',
    gateId: 'notes',
    color: '#ff6fb1',
    position: [1.72, -0.46, -0.82],
    keywords: ['research', 'session', 'archive chat', 'study this', 'think with me', 'investigate'],
    gameplay: 'Conversations can be archived as research sessions instead of disappearing after the moment.',
    response: 'Research Well is open. I can archive this exchange into the local NeuralSpace session lane.'
  },
  {
    id: 'handoff',
    label: 'Handoff Docks',
    shortLabel: 'Handoff',
    gateId: 'ledger',
    color: '#b991ff',
    position: [-0.05, -1.34, -1.48],
    keywords: ['handoff', 'review board', 'execution board', 'dispatch board', 'workflow timeline', 'operator queue'],
    gameplay: 'Review, execution, dispatch, and timeline data become downstream docks on the world map.',
    response: 'Handoff Docks are visible. Review, execution, dispatch, and timeline lanes can carry work out of the world.'
  },
  {
    id: 'map',
    label: 'Neural Map',
    shortLabel: 'Map',
    gateId: 'realms',
    color: '#76a9ff',
    position: [0.92, 0.04, -2.05],
    keywords: ['neural map', 'map', 'constellation', 'three map', 'galaxy', 'travel map'],
    gameplay: 'The old NeuralSpace Three.js map becomes a constellation layer you travel through around Overearth.',
    response: 'Neural Map is engaged. The assistant lanes are now spatial instead of trapped in a left sidebar.'
  }
];

export function getNeuralSpaceLane(id) {
  return neuralSpaceLanes.find((lane) => lane.id === id) || neuralSpaceLanes[0];
}

export function findNeuralSpaceLane(value = '') {
  const text = normalize(value);
  if (!text) return null;
  return neuralSpaceLanes.find((lane) => lane.keywords.some((keyword) => text.includes(normalize(keyword)))) || null;
}

export function summarizeNeuralSpaceRoutes(laneId) {
  return neuralSpaceRoutes.filter((route) => !laneId || route.laneId === laneId);
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
