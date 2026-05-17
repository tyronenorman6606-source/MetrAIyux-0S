export const grayScapeBasePath = '/grayscape';

export const grayScapeSummary = {
  product: 'GrayScape',
  edition: 'THE NEXUS SuperApp',
  version: 'founder-messages-reboot',
  storagePrefix: 'grayscape',
  gateName: 'GrayScape Nexus'
};

export const grayScapeModules = [
  {
    id: 'nexus',
    label: 'Nexus',
    shortLabel: 'Nexus',
    path: 'index.html',
    gateId: 'codex',
    realmId: 'craft',
    color: '#f4c75b',
    keywords: ['grayscape', 'gray scape', 'nexus', 'superapp', 'super app', 'personal portal'],
    gameplay: 'The Nexus is the GrayScape home portal: a 3D launcher for Forge, Command, Tasks, Journal, Vault, Settings, and About.',
    response: 'GrayScape Nexus is open as a world-stage inside Overearth.'
  },
  {
    id: 'forge',
    label: 'Node Pro Forge',
    shortLabel: 'Forge',
    path: 'grayscape-nodepro.html',
    gateId: 'codex',
    realmId: 'craft',
    color: '#61f6ff',
    keywords: ['forge', 'node pro', 'nodepro', 'visual planner', 'nodes', 'planner'],
    gameplay: 'Node Pro turns projects, cards, notes, graph links, timers, and visual planning into a living operator map.',
    response: 'Node Pro Forge is the planning room for cards, graph links, projects, and execution notes.'
  },
  {
    id: 'command',
    label: 'Command Calendar',
    shortLabel: 'Command',
    path: 'grayscape-calendar.html',
    gateId: 'review',
    realmId: 'mind',
    color: '#ffcb47',
    keywords: ['command calendar', 'calendar', 'founder messages', 'messages from the founder', 'decrees', 'treasury', 'rituals'],
    gameplay: 'Command Calendar carries founder messages, decrees, rituals, treasury goals, calendar events, and daily command rhythm.',
    response: 'Command Calendar is the time-and-message layer for GrayScape.'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    shortLabel: 'Tasks',
    path: 'tasks.html',
    gateId: 'quests',
    realmId: 'body',
    color: '#ffd36a',
    keywords: ['tasks', 'task', 'todo', 'to do', 'decree'],
    gameplay: 'Tasks are quick local execution captures stored as GrayScape task records.',
    response: 'GrayScape Tasks is ready for quick capture and completion.'
  },
  {
    id: 'journal',
    label: 'Journal',
    shortLabel: 'Journal',
    path: 'journal.html',
    gateId: 'notes',
    realmId: 'mind',
    color: '#b991ff',
    keywords: ['journal', 'entry', 'write', 'reflection', 'founder journal'],
    gameplay: 'Journal stores dated reflection, mood, and founder-operator notes as a searchable local record.',
    response: 'GrayScape Journal is the written memory layer.'
  },
  {
    id: 'vault',
    label: 'Vault',
    shortLabel: 'Vault',
    path: 'vault.html',
    gateId: 'ledger',
    realmId: 'wealth',
    color: '#ff6f91',
    keywords: ['vault', 'locked', 'secret', 'private', 'keys', 'bank', 'password'],
    gameplay: 'Vault stores local locked items and operator notes behind a simple device-side lock flag.',
    response: 'GrayScape Vault is the private storage chamber.'
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    path: 'settings.html',
    gateId: 'anchors',
    realmId: 'mind',
    color: '#8fffe4',
    keywords: ['settings', 'profile', 'tagline', 'reset data'],
    gameplay: 'Settings controls the GrayScape display name, tagline, and local reset surface.',
    response: 'GrayScape Settings is the profile and device-control room.'
  },
  {
    id: 'about',
    label: 'About',
    shortLabel: 'About',
    path: 'about.html',
    gateId: 'codex',
    realmId: 'craft',
    color: '#ffffff',
    keywords: ['about', 'upgrade notes', 'superdock', 'command palette'],
    gameplay: 'About explains the SuperDock, command palette, install, export, and import layers.',
    response: 'GrayScape About is the integration note chamber.'
  }
];

export function getGrayScapeModule(id) {
  return grayScapeModules.find((module) => module.id === id) || grayScapeModules[0];
}

export function getGrayScapeModuleUrl(id) {
  const module = getGrayScapeModule(id);
  return `${grayScapeBasePath}/${module.path}`;
}

export function findGrayScapeModule(value = '') {
  const text = normalize(value);
  if (!text) return null;
  const generic = new Set(['grayscape', 'gray scape', 'superapp', 'super app', 'personal portal']);
  const scored = grayScapeModules.map((module) => {
    let score = 0;
    if (text.includes(module.id)) score += 8;
    if (text.includes(normalize(module.label))) score += 10;
    for (const keyword of module.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (!text.includes(normalizedKeyword)) continue;
      score += generic.has(normalizedKeyword) ? 1 : 4;
    }
    return { module, score };
  }).sort((a, b) => b.score - a.score);
  if (scored[0]?.score > 1) return scored[0].module;
  if (text.includes('grayscape') || text.includes('gray scape')) return getGrayScapeModule('nexus');
  return null;
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
