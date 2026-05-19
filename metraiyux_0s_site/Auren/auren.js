const STORAGE_KEY = 'auren-central-intelligence-v1';
const OVER3ARTH_KEY = 'over3arth-state-v1';
const GRAY_KEYS = {
  tasks: 'grayscape_tasks_v1',
  journal: 'grayscape_journal_v1',
  vault: 'grayscape_vault_v1',
  vaultLock: 'grayscape_vault_locked_v1',
  profile: 'grayscape_profile_v1',
  events: 'grayscape_mobile_events',
  notes: 'grayscape_mobile_notes',
  decrees: 'grayscape_mobile_decrees',
  goals: 'grayscape_mobile_goals',
  rituals: 'grayscape_mobile_rituals'
};

const realms = [
  {
    id: 'body',
    name: 'Body Temple',
    sigil: 'BT',
    color: '#40f4ff',
    promise: 'Strength, vitality, sleep, food, movement, and physical discipline.',
    starterGoal: 'Train my body into a reliable vessel of energy.'
  },
  {
    id: 'wealth',
    name: 'Wealth Forge',
    sigil: 'WF',
    color: '#ffdb70',
    promise: 'Money skills, income systems, savings, sales, assets, and financial command.',
    starterGoal: 'Build income momentum with repeatable daily money moves.'
  },
  {
    id: 'craft',
    name: 'Craft Citadel',
    sigil: 'CC',
    color: '#a986ff',
    promise: 'Career, business, learning, mastery, shipping, skill, and public proof.',
    starterGoal: 'Ship visible proof of my strongest skill every week.'
  },
  {
    id: 'mind',
    name: 'Mind Observatory',
    sigil: 'MO',
    color: '#78a8ff',
    promise: 'Focus, study, attention, emotional regulation, planning, and mental clarity.',
    starterGoal: 'Command my attention instead of letting noise command me.'
  },
  {
    id: 'heart',
    name: 'Heart Dominion',
    sigil: 'HD',
    color: '#ff669d',
    promise: 'Relationships, communication, family, friendship, intimacy, repair, and belonging.',
    starterGoal: 'Show up with more presence and cleaner communication.'
  },
  {
    id: 'spirit',
    name: 'Spirit Nexus',
    sigil: 'SN',
    color: '#8effb1',
    promise: 'Meaning, values, faith, identity, gratitude, purpose, and inner alignment.',
    starterGoal: 'Return to the values that make me powerful under pressure.'
  }
];

const gateNames = {
  realms: 'Realm Atlas',
  anchors: 'Anchor Fields',
  codex: 'Codex Vault',
  quests: 'Quest Wilds',
  ritual: 'Ritual Flame',
  focus: 'Focus Chamber',
  affirm: 'Signal Shrine',
  notes: 'Memory Sea',
  review: 'Review Moon',
  ascend: 'Ascension Gate',
  ledger: 'Proof Ledger'
};

const questTemplates = [
  'Do the smallest visible action toward this goal for 13 minutes.',
  'Write the if-then plan for the obstacle that usually steals momentum.',
  'Create one piece of proof: a message sent, a rep logged, a draft made, a task completed.',
  'Remove one friction point from the environment around this goal.',
  'Capture one lesson from today and convert it into tomorrow first move.',
  'Ask what would make this 10 percent easier to repeat, then do that.'
];

const affirmations = [
  'My power is not fantasy. It is focus, repetition, repair, and proof.',
  'I turn intention into behavior, behavior into evidence, and evidence into identity.',
  'I can honor the obstacle without obeying it.',
  'Every completed action is a vote for the world I claim to live in.',
  'I do not need perfect energy to begin. Beginning creates energy.',
  'My attention is sacred. Where I place it, I create movement.'
];

const grayModules = [
  {
    id: 'nexus',
    label: 'Nexus',
    realmId: 'craft',
    gateId: 'codex',
    color: '#ffdb70',
    keywords: ['grayscape', 'gray scape', 'nexus', 'superapp', 'personal portal'],
    gameplay: 'Home portal for Forge, Command, Tasks, Journal, Vault, Settings, and About.'
  },
  {
    id: 'forge',
    label: 'Node Pro Forge',
    realmId: 'craft',
    gateId: 'codex',
    color: '#40f4ff',
    keywords: ['forge', 'node pro', 'nodes', 'visual planner', 'planner'],
    gameplay: 'Project cards, graph links, timers, notes, and planning maps.'
  },
  {
    id: 'command',
    label: 'Command Calendar',
    realmId: 'mind',
    gateId: 'review',
    color: '#ffdb70',
    keywords: ['calendar', 'command', 'founder messages', 'decrees', 'rituals'],
    gameplay: 'Founder messages, decrees, calendar events, rituals, and treasury goals.'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    realmId: 'body',
    gateId: 'quests',
    color: '#ffdb70',
    keywords: ['tasks', 'task', 'todo', 'to do', 'decree'],
    gameplay: 'Quick local execution captures stored as GrayScape task records.'
  },
  {
    id: 'journal',
    label: 'Journal',
    realmId: 'mind',
    gateId: 'notes',
    color: '#a986ff',
    keywords: ['journal', 'entry', 'write', 'reflection'],
    gameplay: 'Dated reflection, mood, and operator notes as a searchable local record.'
  },
  {
    id: 'vault',
    label: 'Vault',
    realmId: 'wealth',
    gateId: 'ledger',
    color: '#ff669d',
    keywords: ['vault', 'locked', 'private', 'keys', 'bank', 'password'],
    gameplay: 'Device-side private storage for notes, keys, and locked local records.'
  },
  {
    id: 'settings',
    label: 'Settings',
    realmId: 'mind',
    gateId: 'anchors',
    color: '#8effb1',
    keywords: ['settings', 'profile', 'tagline', 'reset'],
    gameplay: 'Display name, tagline, local reset, and device control.'
  }
];

const neuralLanes = [
  {
    id: 'chat',
    label: 'Neural Core',
    short: 'Core',
    gateId: 'focus',
    color: '#40f4ff',
    keywords: ['neural', 'neuralspace', 'chat', 'assistant', 'core', 'companion'],
    purpose: 'Direct conversation inside the world instead of a disconnected chat box.'
  },
  {
    id: 'knowledge',
    label: 'Knowledge Vault',
    short: 'Vault',
    gateId: 'codex',
    color: '#ffdb70',
    keywords: ['knowledge', 'vault', 'memory fabric', 'brain drive', 'pack'],
    purpose: 'Core, arch, memory, brain, design, ops, webcreator, and pack rooms.'
  },
  {
    id: 'runtime',
    label: 'Runtime Spire',
    short: 'Run',
    gateId: 'focus',
    color: '#8effb1',
    keywords: ['runtime', 'worker', 'health', 'status', 'sync runtime'],
    purpose: 'Health, sessions, queue, projects, and handoff memory from a local worker.'
  },
  {
    id: 'build',
    label: 'Build Forge',
    short: 'Build',
    gateId: 'quests',
    color: '#ffb43f',
    keywords: ['build', 'website', 'generate', 'project', 'forge'],
    purpose: 'Website and artifact generation as queued local proof work.'
  },
  {
    id: 'research',
    label: 'Research Well',
    short: 'Research',
    gateId: 'notes',
    color: '#ff669d',
    keywords: ['research', 'session', 'archive', 'study', 'investigate'],
    purpose: 'Conversations and observations archived as research sessions.'
  },
  {
    id: 'handoff',
    label: 'Handoff Docks',
    short: 'Handoff',
    gateId: 'ledger',
    color: '#a986ff',
    keywords: ['handoff', 'review board', 'execution board', 'dispatch board', 'timeline'],
    purpose: 'Review, execution, dispatch, and timeline records for downstream operators.'
  },
  {
    id: 'map',
    label: 'Neural Map',
    short: 'Map',
    gateId: 'realms',
    color: '#78a8ff',
    keywords: ['map', 'neural map', 'constellation', 'travel'],
    purpose: 'A spatial view of the assistant lanes around the world.'
  }
];

const defaultRuntimeUrl = 'http://127.0.0.1:4121/runtime/standalone-apps/NeuralSpacePro';

let state = loadState();
let renderQueued = false;

const refs = {};

document.addEventListener('DOMContentLoaded', () => {
  bindRefs();
  bindEvents();
  hydrateSelects();
  bootLivingField();
  syncGrayScapeFromStorage({ silent: true, save: false });
  render();
});

function bindRefs() {
  [
    'signalLine',
    'vesselCharge',
    'runtimePill',
    'commandForm',
    'commandInput',
    'metricCharge',
    'metricOpenQuests',
    'metricGray',
    'metricNeural',
    'metricMemory',
    'systemList',
    'chatLog',
    'nextMoveTitle',
    'nextMove',
    'missionButton',
    'proofButton',
    'focusButton',
    'realmGrid',
    'questForm',
    'questTitle',
    'questRealm',
    'questEvidence',
    'ritualForm',
    'ritualRealm',
    'ritualText',
    'proofList',
    'grayModules',
    'grayTaskForm',
    'grayTaskTitle',
    'grayTaskDue',
    'grayTaskList',
    'grayJournalForm',
    'grayJournalTitle',
    'grayJournalText',
    'grayVaultForm',
    'grayVaultTitle',
    'grayVaultText',
    'neuralLanes',
    'researchForm',
    'researchTitle',
    'researchNotes',
    'buildForm',
    'buildName',
    'buildBrief',
    'handoffForm',
    'handoffTitle',
    'handoffNotes',
    'noteForm',
    'noteTitle',
    'noteText',
    'importOver3arth',
    'syncGray',
    'snapshotButton',
    'memoryList',
    'snapshotList',
    'profileForm',
    'profileName',
    'profileVessel',
    'profileWorld',
    'runtimeUrl',
    'exportButton',
    'importFile',
    'resetButton',
    'toast',
    'livingField',
    'cursorField'
  ].forEach((id) => {
    refs[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
  });

  document.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => handleCommand(button.dataset.command, 'quick'));
  });

  refs.commandForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = refs.commandInput.value.trim();
    if (!value) return;
    refs.commandInput.value = '';
    handleCommand(value, 'typed');
  });

  refs.missionButton.addEventListener('click', () => handleCommand('forge a mission', 'button'));
  refs.proofButton.addEventListener('click', () => handleCommand('seal proof', 'button'));
  refs.focusButton.addEventListener('click', () => handleCommand('start 13 minute focus pulse', 'button'));

  refs.questForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const quest = addQuest({
      title: refs.questTitle.value,
      realm: refs.questRealm.value,
      evidence: refs.questEvidence.value || 'Leave a visible receipt.',
      detail: 'Manual quest forged through Auren.',
      source: 'auren-manual'
    });
    refs.questTitle.value = '';
    refs.questEvidence.value = '';
    addLedger('quest', 'Quest forged', quest.title);
    answer(`Quest forged in ${realmName(quest.realm)}: "${quest.title}".`, 'quest_forged');
    saveAndRender();
  });

  refs.ritualForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const ritual = addRitual(refs.ritualRealm.value, refs.ritualText.value || 'One clean signal today.');
    refs.ritualText.value = '';
    answer(`Ritual sealed for ${realmName(ritual.realm)}. Auren will read it as today signal.`, 'ritual_sealed');
    saveAndRender();
  });

  refs.grayTaskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const task = addGrayTask(refs.grayTaskTitle.value, refs.grayTaskDue.value);
    refs.grayTaskTitle.value = '';
    refs.grayTaskDue.value = '';
    answer(`GrayScape task captured: "${task.title}".`, 'grayscape_task');
    saveAndRender();
  });

  refs.grayJournalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const entry = addGrayJournal(refs.grayJournalText.value, refs.grayJournalTitle.value || 'Auren Journal Capture');
    refs.grayJournalTitle.value = '';
    refs.grayJournalText.value = '';
    answer(`GrayScape journal saved: "${entry.title}".`, 'grayscape_journal');
    saveAndRender();
  });

  refs.grayVaultForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const item = addVaultItem(refs.grayVaultTitle.value, refs.grayVaultText.value);
    refs.grayVaultTitle.value = '';
    refs.grayVaultText.value = '';
    answer(`Vault item stored locally: "${item.title}".`, 'vault_item');
    saveAndRender();
  });

  refs.researchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const session = addResearchSession(refs.researchTitle.value, refs.researchNotes.value);
    refs.researchTitle.value = '';
    refs.researchNotes.value = '';
    answer(`Research session archived: "${session.title}".`, 'research_session');
    saveAndRender();
  });

  refs.buildForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const build = addBuild(refs.buildName.value, refs.buildBrief.value);
    refs.buildName.value = '';
    refs.buildBrief.value = '';
    answer(`Build queued in Build Forge: "${build.name}".`, 'build_queued');
    saveAndRender();
  });

  refs.handoffForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const handoff = addHandoff(refs.handoffTitle.value, refs.handoffNotes.value);
    refs.handoffTitle.value = '';
    refs.handoffNotes.value = '';
    answer(`Handoff packet created: "${handoff.title}".`, 'handoff_created');
    saveAndRender();
  });

  refs.noteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const note = addMemory(refs.noteText.value, refs.noteTitle.value || 'Auren memory', 'manual');
    refs.noteTitle.value = '';
    refs.noteText.value = '';
    answer(`Memory stored: "${note.title}".`, 'memory_saved');
    saveAndRender();
  });

  refs.importOver3arth.addEventListener('click', () => {
    const result = importOver3arthStorage();
    answer(result.message, 'over3arth_import');
    saveAndRender();
  });

  refs.syncGray.addEventListener('click', () => {
    const result = syncGrayScapeFromStorage({ silent: false, save: true });
    answer(result.message, 'grayscape_sync');
    saveAndRender();
  });

  refs.snapshotButton.addEventListener('click', () => {
    const snapshot = createSnapshot('Manual Auren snapshot');
    toast(`Snapshot stored: ${formatDate(snapshot.createdAt)}`);
    saveAndRender();
  });

  refs.profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.profile.name = refs.profileName.value.trim() || 'Gray';
    state.profile.vesselName = refs.profileVessel.value.trim() || 'Auren';
    state.profile.worldName = refs.profileWorld.value.trim() || 'New Earth Prime';
    state.settings.runtimeUrl = refs.runtimeUrl.value.trim() || defaultRuntimeUrl;
    answer(`${state.profile.vesselName} identity updated. ${state.profile.worldName} remains the active world.`, 'identity_saved');
    saveAndRender();
  });

  refs.exportButton.addEventListener('click', exportPacket);
  refs.importFile.addEventListener('change', importPacket);
  refs.resetButton.addEventListener('click', resetState);

  window.addEventListener('pointermove', moveCursorField, { passive: true });
}

function hydrateSelects() {
  const options = realms.map((realm) => `<option value="${escapeHtml(realm.id)}">${escapeHtml(realm.name)}</option>`).join('');
  refs.questRealm.innerHTML = options;
  refs.ritualRealm.innerHTML = options;
}

function createDefaultState() {
  const createdAt = nowIso();
  return {
    version: 1,
    activeTab: 'core',
    activeRealm: 'craft',
    activeGrayModule: 'nexus',
    activeNeuralLane: 'chat',
    profile: {
      name: 'Gray',
      vesselName: 'Auren',
      worldName: 'New Earth Prime',
      primeIntention: 'Build the life and operating system through action, memory, and proof.'
    },
    settings: {
      runtimeUrl: defaultRuntimeUrl
    },
    goals: [
      seedGoal('craft', 'Ship one visible Auren proof surface'),
      seedGoal('mind', 'Keep the central intelligence grounded and non-repetitive'),
      seedGoal('wealth', 'Turn proof into usable operating value')
    ],
    quests: [
      {
        id: uid('quest'),
        title: 'Create one piece of proof for Auren central intelligence',
        realm: 'craft',
        detail: 'A visible app, command route, or saved receipt counts.',
        evidence: 'Leave a visible receipt.',
        source: 'auren-seed',
        done: false,
        createdAt
      }
    ],
    rituals: [],
    focusSessions: [],
    proofs: [],
    notes: [
      {
        id: uid('note'),
        title: 'Auren seed identity',
        text: 'Auren unifies Over3arth, GrayScape, and NeuralSpacePro as one local-first command intelligence.',
        source: 'seed',
        createdAt
      }
    ],
    ledger: [],
    grayTasks: [],
    grayJournal: [],
    grayVault: [],
    grayCalendarEvents: [],
    neuralSessions: [],
    neuralBuilds: [],
    neuralHandoffs: [],
    runtime: {
      online: false,
      checkedAt: '',
      summary: {}
    },
    chat: [
      {
        id: uid('chat'),
        role: 'auren',
        text: 'Auren is online. I can route worlds, capture GrayScape records, archive NeuralSpace sessions, queue builds, and keep proof visible.',
        source: 'boot',
        createdAt
      }
    ],
    snapshots: []
  };
}

function seedGoal(realm, title) {
  return {
    id: uid('goal'),
    title,
    realm,
    status: 'active',
    createdAt: nowIso()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

function normalizeState(candidate) {
  const fallback = createDefaultState();
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  return {
    ...fallback,
    ...source,
    profile: { ...fallback.profile, ...(source.profile || {}) },
    settings: { ...fallback.settings, ...(source.settings || {}) },
    goals: arrayOf(source.goals),
    quests: arrayOf(source.quests),
    rituals: arrayOf(source.rituals),
    focusSessions: arrayOf(source.focusSessions),
    proofs: arrayOf(source.proofs),
    notes: arrayOf(source.notes),
    ledger: arrayOf(source.ledger),
    grayTasks: arrayOf(source.grayTasks),
    grayJournal: arrayOf(source.grayJournal),
    grayVault: arrayOf(source.grayVault),
    grayCalendarEvents: arrayOf(source.grayCalendarEvents),
    neuralSessions: arrayOf(source.neuralSessions),
    neuralBuilds: arrayOf(source.neuralBuilds),
    neuralHandoffs: arrayOf(source.neuralHandoffs),
    chat: arrayOf(source.chat).length ? arrayOf(source.chat) : fallback.chat,
    snapshots: arrayOf(source.snapshots),
    runtime: { ...fallback.runtime, ...(source.runtime || {}) },
    activeTab: source.activeTab || 'core',
    activeRealm: realmById(source.activeRealm)?.id || 'craft',
    activeGrayModule: grayModuleById(source.activeGrayModule)?.id || 'nexus',
    activeNeuralLane: neuralLaneById(source.activeNeuralLane)?.id || 'chat'
  };
}

function saveState() {
  const payload = {
    ...state,
    updatedAt: nowIso()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function saveAndRender() {
  saveState();
  scheduleRender();
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  window.requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  const stats = calculateStats();
  refs.metricCharge.textContent = `${stats.charge}%`;
  refs.vesselCharge.textContent = `${stats.charge}%`;
  refs.metricOpenQuests.textContent = String(stats.openQuests);
  refs.metricGray.textContent = String(stats.grayRecords);
  refs.metricNeural.textContent = String(stats.neuralRecords);
  refs.metricMemory.textContent = String(stats.memoryCells);
  refs.signalLine.textContent = createSignalLine(stats);

  refs.profileName.value = state.profile.name || 'Gray';
  refs.profileVessel.value = state.profile.vesselName || 'Auren';
  refs.profileWorld.value = state.profile.worldName || 'New Earth Prime';
  refs.runtimeUrl.value = state.settings.runtimeUrl || defaultRuntimeUrl;
  refs.questRealm.value = state.activeRealm;
  refs.ritualRealm.value = state.activeRealm;

  renderTabs();
  renderRuntime(stats);
  renderSystems(stats);
  renderChat();
  renderNextMove();
  renderRealms();
  renderProofList();
  renderGrayModules();
  renderGrayTaskList();
  renderNeuralLanes();
  renderMemory();
  renderSnapshots();
}

function renderTabs() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === state.activeTab);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `tab-${state.activeTab}`);
  });
}

function renderRuntime(stats) {
  refs.runtimePill.classList.toggle('online', Boolean(state.runtime.online));
  refs.runtimePill.classList.toggle('offline', Boolean(state.runtime.checkedAt && !state.runtime.online));
  refs.runtimePill.querySelector('b').textContent = state.runtime.online ? 'Runtime live' : stats.memoryCells > 1 ? 'Local core' : 'Warming';
}

function renderSystems(stats) {
  const systems = [
    {
      id: 'over3arth',
      label: 'Over3arth Core',
      active: state.activeTab === 'world',
      detail: `${stats.activeGoals} goals, ${stats.openQuests} open proof, ${stats.charge}% charge`
    },
    {
      id: 'grayscape',
      label: 'GrayScape SuperApp',
      active: state.activeTab === 'grayscape',
      detail: `${state.grayTasks.length} tasks, ${state.grayJournal.length} journal entries, ${state.grayVault.length} vault items`
    },
    {
      id: 'neuralspace',
      label: 'NeuralSpacePro',
      active: state.activeTab === 'neural',
      detail: `${neuralLaneById(state.activeNeuralLane).label}, ${state.neuralSessions.length} sessions, ${state.neuralBuilds.length} builds`
    },
    {
      id: 'memory',
      label: 'Auren Memory',
      active: state.activeTab === 'memory',
      detail: `${state.notes.length} notes, ${state.chat.length} chat cells, ${state.snapshots.length} snapshots`
    },
    {
      id: 'zero',
      label: '0S Mount',
      active: false,
      detail: 'Standalone app route in metraiyux_0s_site/Auren'
    }
  ];
  refs.systemList.innerHTML = systems.map((system) => `
    <button class="system-card ${system.active ? 'active' : ''}" type="button" data-system="${escapeHtml(system.id)}">
      <strong>${escapeHtml(system.label)}</strong>
      <small>${escapeHtml(system.detail)}</small>
    </button>
  `).join('');
  refs.systemList.querySelectorAll('[data-system]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.system === 'over3arth' ? 'world' : button.dataset.system === 'zero' ? 'core' : button.dataset.system;
      setTab(tab === 'neuralspace' ? 'neural' : tab);
    });
  });
}

function renderChat() {
  refs.chatLog.innerHTML = state.chat.slice(-18).map((entry) => `
    <article class="chat-entry ${entry.role === 'user' ? 'user' : 'auren'}">
      <span>${entry.role === 'user' ? 'You' : escapeHtml(state.profile.vesselName || 'Auren')} / ${escapeHtml(entry.source || 'local')}</span>
      <p>${escapeHtml(entry.text)}</p>
    </article>
  `).join('');
  refs.chatLog.scrollTop = refs.chatLog.scrollHeight;
}

function renderNextMove() {
  const quest = priorityQuest();
  const realm = realmById(state.activeRealm);
  refs.nextMoveTitle.textContent = quest ? 'Nearest proof' : 'Open command';
  refs.nextMove.innerHTML = quest
    ? `
      <strong>${escapeHtml(quest.title)}</strong>
      <p>${escapeHtml(quest.detail || realm.promise)}</p>
      <div class="pill-row">
        <span class="data-pill">${escapeHtml(realm.name)}</span>
        <span class="data-pill">${escapeHtml(quest.evidence || 'Leave a visible receipt')}</span>
      </div>
    `
    : `
      <strong>${escapeHtml(realm.starterGoal)}</strong>
      <p>${escapeHtml(realm.promise)}</p>
      <div class="pill-row">
        <span class="data-pill">No open quest in this realm</span>
        <span class="data-pill">Auren can forge one now</span>
      </div>
    `;
}

function renderRealms() {
  refs.realmGrid.innerHTML = realms.map((realm) => {
    const metrics = realmMetrics(realm.id);
    return `
      <article class="realm-card ${state.activeRealm === realm.id ? 'active' : ''}" style="--realm-color:${realm.color}">
        <button type="button" data-realm="${escapeHtml(realm.id)}">
          <div class="card-topline"><span>${escapeHtml(realm.sigil)}</span><strong>${escapeHtml(realm.name)}</strong></div>
          <p>${escapeHtml(realm.promise)}</p>
          <div class="card-meter" title="${metrics.charge}% charge"><i style="--value:${metrics.charge}%"></i></div>
          <div class="pill-row">
            <span class="data-pill">${metrics.goals} goals</span>
            <span class="data-pill">${metrics.open} open</span>
            <span class="data-pill">${metrics.proofs} proof</span>
          </div>
        </button>
      </article>
    `;
  }).join('');
  refs.realmGrid.querySelectorAll('[data-realm]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeRealm = button.dataset.realm;
      addLedger('route', 'Realm selected', realmName(state.activeRealm));
      saveAndRender();
    });
  });
}

function renderProofList() {
  const proofs = [...state.proofs, ...state.quests.filter((quest) => quest.done)].slice(0, 14);
  refs.proofList.innerHTML = proofs.length ? proofs.map((proof) => `
    <article class="list-item">
      <div class="list-row">
        <strong>${escapeHtml(proof.title)}</strong>
        <small>${escapeHtml(formatDate(proof.doneAt || proof.createdAt))}</small>
      </div>
      <p>${escapeHtml(proof.evidence || proof.detail || 'Proof sealed locally.')}</p>
    </article>
  `).join('') : emptyLine('No sealed proof yet.');
}

function renderGrayModules() {
  refs.grayModules.innerHTML = grayModules.map((module) => {
    const active = state.activeGrayModule === module.id;
    const count = module.id === 'tasks'
      ? state.grayTasks.length
      : module.id === 'journal'
        ? state.grayJournal.length
        : module.id === 'vault'
          ? state.grayVault.length
          : module.id === 'command'
            ? state.grayCalendarEvents.length
            : 0;
    return `
      <article class="module-card ${active ? 'active' : ''}">
        <button type="button" data-gray-module="${escapeHtml(module.id)}">
          <div class="card-topline"><span style="color:${module.color}">${escapeHtml(module.label.slice(0, 2).toUpperCase())}</span><strong>${escapeHtml(module.label)}</strong></div>
          <p>${escapeHtml(module.gameplay)}</p>
          <div class="pill-row">
            <span class="data-pill">${escapeHtml(gateNames[module.gateId] || 'Gate')}</span>
            <span class="data-pill">${count} records</span>
          </div>
        </button>
      </article>
    `;
  }).join('');
  refs.grayModules.querySelectorAll('[data-gray-module]').forEach((button) => {
    button.addEventListener('click', () => {
      const module = grayModuleById(button.dataset.grayModule);
      state.activeGrayModule = module.id;
      state.activeRealm = module.realmId;
      addLedger('route', 'GrayScape module selected', module.label);
      saveAndRender();
    });
  });
}

function renderGrayTaskList() {
  refs.grayTaskList.innerHTML = state.grayTasks.length ? state.grayTasks.slice(0, 12).map((task) => `
    <article class="list-item">
      <div class="list-row">
        <strong>${escapeHtml(task.title)}</strong>
        <button class="mini-action" type="button" data-done-task="${escapeHtml(task.id)}">${task.done ? 'Done' : 'Seal'}</button>
      </div>
      <p>${escapeHtml(task.due ? `Due ${task.due}` : 'No due date')} / ${escapeHtml(task.source || 'Auren')}</p>
    </article>
  `).join('') : emptyLine('No GrayScape tasks captured yet.');
  refs.grayTaskList.querySelectorAll('[data-done-task]').forEach((button) => {
    button.addEventListener('click', () => {
      const task = state.grayTasks.find((item) => item.id === button.dataset.doneTask);
      if (!task || task.done) return;
      task.done = true;
      task.doneAt = nowIso();
      addLedger('grayscape', 'GrayScape task sealed', task.title);
      writeGrayTasksToStorage();
      saveAndRender();
    });
  });
}

function renderNeuralLanes() {
  refs.neuralLanes.innerHTML = neuralLanes.map((lane) => {
    const active = state.activeNeuralLane === lane.id;
    const count = lane.id === 'research'
      ? state.neuralSessions.length
      : lane.id === 'build'
        ? state.neuralBuilds.length
        : lane.id === 'handoff'
          ? state.neuralHandoffs.length
          : lane.id === 'runtime'
            ? Number(Boolean(state.runtime.checkedAt))
            : 0;
    return `
      <article class="lane-card ${active ? 'active' : ''}">
        <button type="button" data-lane="${escapeHtml(lane.id)}">
          <div class="card-topline"><span style="color:${lane.color}">${escapeHtml(lane.short)}</span><strong>${escapeHtml(lane.label)}</strong></div>
          <p>${escapeHtml(lane.purpose)}</p>
          <div class="pill-row">
            <span class="data-pill">${escapeHtml(gateNames[lane.gateId] || 'Gate')}</span>
            <span class="data-pill">${count} records</span>
          </div>
        </button>
      </article>
    `;
  }).join('');
  refs.neuralLanes.querySelectorAll('[data-lane]').forEach((button) => {
    button.addEventListener('click', () => {
      const lane = neuralLaneById(button.dataset.lane);
      state.activeNeuralLane = lane.id;
      addLedger('route', 'Neural lane selected', lane.label);
      saveAndRender();
    });
  });
}

function renderMemory() {
  const records = [
    ...state.notes.map((item) => ({ ...item, kind: 'note' })),
    ...state.neuralSessions.map((item) => ({ ...item, kind: 'research' })),
    ...state.ledger.slice(0, 20).map((item) => ({ ...item, kind: item.type || 'ledger', text: item.detail || item.title }))
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 28);
  refs.memoryList.innerHTML = records.length ? records.map((item) => `
    <article class="list-item">
      <div class="list-row">
        <strong>${escapeHtml(item.title || item.kind)}</strong>
        <small>${escapeHtml(formatDate(item.createdAt))}</small>
      </div>
      <p>${escapeHtml(item.text || item.detail || item.notes || '')}</p>
      <div class="pill-row"><span class="data-pill">${escapeHtml(item.kind)}</span><span class="data-pill">${escapeHtml(item.source || 'local')}</span></div>
    </article>
  `).join('') : emptyLine('Auren memory is waiting for signal.');
}

function renderSnapshots() {
  refs.snapshotList.innerHTML = state.snapshots.length ? state.snapshots.slice(0, 10).map((snapshot) => `
    <article class="list-item">
      <div class="list-row">
        <strong>${escapeHtml(snapshot.reason)}</strong>
        <button class="restore-button" type="button" data-restore="${escapeHtml(snapshot.id)}">Restore</button>
      </div>
      <p>${escapeHtml(formatDate(snapshot.createdAt))} / ${snapshot.counts?.quests || 0} quests / ${snapshot.counts?.notes || 0} notes</p>
    </article>
  `).join('') : emptyLine('No snapshots yet.');
  refs.snapshotList.querySelectorAll('[data-restore]').forEach((button) => {
    button.addEventListener('click', () => restoreSnapshot(button.dataset.restore));
  });
}

function calculateStats() {
  const today = todayKey();
  const completedToday = state.quests.filter((quest) => quest.doneAt && quest.doneAt.slice(0, 10) === today).length;
  const todayRitual = state.rituals.some((ritual) => ritual.date === today);
  const activeGoals = state.goals.filter((goal) => goal.status !== 'complete').length;
  const openQuests = state.quests.filter((quest) => !quest.done).length;
  const proofCount = state.quests.filter((quest) => quest.done).length + state.proofs.length;
  const notesThisWeek = state.notes.filter((note) => daysAgo(note.createdAt) <= 7).length;
  const focusMinutes = state.focusSessions.reduce((total, session) => total + Number(session.minutes || 0), 0);
  const grayRecords = state.grayTasks.length + state.grayJournal.length + state.grayVault.length + state.grayCalendarEvents.length;
  const neuralRecords = state.neuralSessions.length + state.neuralBuilds.length + state.neuralHandoffs.length + Number(Boolean(state.runtime.checkedAt));
  const memoryCells = state.notes.length + state.chat.length + state.ledger.length;
  const charge = clamp(
    Math.round(
      (todayRitual ? 22 : 0) +
      Math.min(24, completedToday * 12) +
      Math.min(18, proofCount * 3) +
      Math.min(16, activeGoals * 4) +
      Math.min(10, notesThisWeek * 3) +
      Math.min(10, focusMinutes / 8) +
      Math.min(12, grayRecords) +
      Math.min(12, neuralRecords * 2)
    ),
    0,
    100
  );
  return {
    charge,
    activeGoals,
    openQuests,
    proofCount,
    notesThisWeek,
    focusMinutes,
    grayRecords,
    neuralRecords,
    memoryCells
  };
}

function createSignalLine(stats) {
  const realm = realmById(state.activeRealm);
  const module = grayModuleById(state.activeGrayModule);
  const lane = neuralLaneById(state.activeNeuralLane);
  return `${state.profile.worldName} reads at ${stats.charge}% charge. ${realm.name} is active, ${module.label} is linked, and ${lane.label} is the current assistant lane.`;
}

async function handleCommand(raw, source = 'typed') {
  const command = String(raw || '').trim();
  if (!command) return;
  appendChat('user', command, source);
  refs.runtimePill.classList.remove('offline');
  refs.runtimePill.querySelector('b').textContent = 'Thinking';
  try {
    const result = await routeCommand(command);
    appendChat('auren', result.response, result.source || 'AurenBrain');
    if (result.tab) state.activeTab = result.tab;
    if (result.toast) toast(result.toast);
  } catch (error) {
    appendChat('auren', `I hit a local fault: ${error.message}. The app state is still intact.`, 'fault');
  }
  saveAndRender();
}

async function routeCommand(command) {
  const text = normalize(command);
  const requestedName = extractOperatorName(command);
  if (requestedName) {
    state.profile.name = requestedName;
    addLedger('identity', 'Operator name set', requestedName);
    return { response: `Got it. I will call you ${requestedName}.`, tab: 'core', source: 'identity' };
  }

  const requestedVessel = extractVesselName(command);
  if (requestedVessel) {
    state.profile.vesselName = requestedVessel;
    addLedger('identity', 'Vessel name set', requestedVessel);
    return { response: `Name accepted. I am ${requestedVessel}.`, tab: 'settings', source: 'identity' };
  }

  if (hasAny(text, ['import over3arth', 'read over3arth', 'sync over3arth', 'pull over3arth'])) {
    const result = importOver3arthStorage();
    return { response: result.message, tab: 'memory', source: 'over3arth' };
  }

  if (hasAny(text, ['sync grayscape', 'read grayscape', 'refresh grayscape', 'grayscape status'])) {
    const result = syncGrayScapeFromStorage({ silent: false, save: false });
    return { response: result.message, tab: 'grayscape', source: 'grayscape' };
  }

  if (hasAny(text, ['sync runtime', 'runtime status', 'check runtime', 'ping runtime', 'worker status'])) {
    const result = await syncRuntime();
    return { response: result.message, tab: 'neural', source: 'runtime' };
  }

  const grayModule = findGrayModule(text);
  if (grayModule && !hasAny(text, ['knowledge vault'])) {
    state.activeGrayModule = grayModule.id;
    state.activeRealm = grayModule.realmId;
    addLedger('route', 'GrayScape module opened', grayModule.label);
    return {
      response: `${grayModule.label} is active. ${grayModule.gameplay}`,
      tab: 'grayscape',
      source: 'grayscape-route'
    };
  }

  const lane = findNeuralLane(text);
  if (lane) {
    state.activeNeuralLane = lane.id;
    addLedger('route', 'Neural lane opened', lane.label);
    if (lane.id === 'runtime') {
      const result = await syncRuntime();
      return { response: `${lane.label} is active. ${result.message}`, tab: 'neural', source: 'neural-route' };
    }
    return { response: `${lane.label} is active. ${lane.purpose}`, tab: 'neural', source: 'neural-route' };
  }

  const realm = findRealm(text);
  if (realm) {
    state.activeRealm = realm.id;
    addLedger('route', 'Realm opened', realm.name);
    return { response: `${realm.name} is active. ${realm.promise}`, tab: 'world', source: 'realm-route' };
  }

  if (hasAny(text, ['capture task', 'add task', 'grayscape task', 'gray task'])) {
    const title = extractAfter(command, ['capture task', 'add task', 'grayscape task', 'gray task']) || priorityQuest()?.title || 'Auren proof move';
    const task = addGrayTask(title);
    return { response: `GrayScape task captured: "${task.title}".`, tab: 'grayscape', source: 'grayscape-task' };
  }

  if (hasAny(text, ['journal this', 'capture journal', 'grayscape journal'])) {
    const content = extractAfter(command, ['journal this', 'capture journal', 'grayscape journal']) || command;
    const entry = addGrayJournal(content, 'Auren Capture');
    return { response: `GrayScape journal saved: "${entry.title}".`, tab: 'grayscape', source: 'grayscape-journal' };
  }

  if (hasAny(text, ['vault this', 'save vault', 'store vault'])) {
    const title = extractAfter(command, ['vault this', 'save vault', 'store vault']) || 'Auren vault capture';
    const item = addVaultItem(title, command);
    return { response: `Vault item stored locally: "${item.title}".`, tab: 'grayscape', source: 'vault' };
  }

  if (hasAny(text, ['research', 'archive chat', 'study this', 'investigate'])) {
    const session = addResearchSession(command.slice(0, 72), command);
    state.activeNeuralLane = 'research';
    return { response: `Research Well archived this as "${session.title}".`, tab: 'neural', source: 'research' };
  }

  if (hasAny(text, ['build website', 'build app', 'queue build', 'generate website', 'build forge'])) {
    const name = extractAfter(command, ['build website', 'build app', 'queue build', 'generate website', 'build forge']) || 'Auren local build';
    const build = addBuild(name, command);
    state.activeNeuralLane = 'build';
    return { response: `Build Forge queued "${build.name}".`, tab: 'neural', source: 'build' };
  }

  if (hasAny(text, ['handoff', 'review board', 'execution board', 'dispatch board'])) {
    const handoff = addHandoff(command.slice(0, 72), command);
    state.activeNeuralLane = 'handoff';
    return { response: `Handoff Docks created packet "${handoff.title}".`, tab: 'neural', source: 'handoff' };
  }

  const memoryText = extractMemoryText(command);
  if (memoryText) {
    const note = addMemory(memoryText, 'Auren memory', 'command');
    return { response: `Stored that in Memory Sea: "${note.text.slice(0, 160)}".`, tab: 'memory', source: 'memory' };
  }

  if (hasAny(text, ['affirm', 'mantra', 'signal shrine'])) {
    const affirmation = forgeAffirmation();
    const note = addMemory(affirmation, 'Auren affirmation', 'affirmation');
    addLedger('affirmation', 'Affirmation forged', affirmation);
    return { response: affirmation, tab: 'memory', source: note.source };
  }

  if (hasAny(text, ['seal', 'complete', 'done', 'finished', 'proof'])) {
    const proof = sealPriorityProof();
    return {
      response: proof
        ? `Proof sealed: "${proof.title}". ${realmName(proof.realm)} gained charge.`
        : `I do not see an open quest to seal. Ask me to forge a mission in ${realmName(state.activeRealm)}.`,
      tab: 'world',
      source: 'proof'
    };
  }

  if (hasAny(text, ['forge mission', 'generate mission', 'give me a mission', 'create quest', 'make a quest', 'next quest'])) {
    const quest = addQuestFromActiveRealm();
    return { response: `Mission forged in ${realmName(quest.realm)}: "${quest.title}".`, tab: 'world', source: 'mission' };
  }

  if (hasAny(text, ['ritual', 'daily', 'start my day', 'flame'])) {
    const ritual = addRitual(state.activeRealm, `Auren pulse: ${priorityQuest()?.title || realmById(state.activeRealm).starterGoal}`);
    return { response: `Ritual pulse sealed for ${realmName(ritual.realm)}.`, tab: 'world', source: 'ritual' };
  }

  if (hasAny(text, ['focus', 'timer', 'lock in', 'deep work'])) {
    const session = addFocusPulse(13);
    return { response: `Focus pulse opened for ${session.minutes} minutes in ${realmName(session.realm)}: "${session.intent}".`, tab: 'world', source: 'focus' };
  }

  if (hasAny(text, ['status', 'report', 'charge', 'how are we', 'what can you do', 'who are you', 'help'])) {
    return { response: describeStatus(), tab: 'core', source: 'status' };
  }

  return { response: answerOpenEnded(command), tab: 'core', source: 'local-core' };
}

function answer(text, source = 'Auren') {
  appendChat('auren', text, source);
}

function appendChat(role, text, source = 'local') {
  state.chat.push({
    id: uid('chat'),
    role,
    text: String(text || '').trim(),
    source,
    createdAt: nowIso()
  });
  state.chat = state.chat.slice(-80);
}

function addQuest({ title, realm = state.activeRealm, evidence = '', detail = '', source = 'auren' }) {
  const cleanTitle = String(title || '').trim() || realmById(realm).starterGoal;
  const quest = {
    id: uid('quest'),
    title: cleanTitle,
    realm,
    evidence: evidence || 'Leave a visible receipt.',
    detail: detail || `Linked to ${realmName(realm)}.`,
    source,
    done: false,
    createdAt: nowIso()
  };
  state.quests.unshift(quest);
  return quest;
}

function addQuestFromActiveRealm() {
  const realm = realmById(state.activeRealm);
  const template = questTemplates[Math.floor(Math.random() * questTemplates.length)];
  return addQuest({
    title: `${realm.name} mission: ${template}`,
    realm: realm.id,
    evidence: 'Leave a receipt: a note, screenshot, draft, sent message, decision, or shipped artifact.',
    detail: realm.promise,
    source: 'auren-mission'
  });
}

function sealPriorityProof() {
  const quest = priorityQuest();
  if (!quest) return null;
  quest.done = true;
  quest.doneAt = nowIso();
  const proof = {
    ...quest,
    id: uid('proof'),
    questId: quest.id,
    createdAt: nowIso(),
    title: quest.title
  };
  state.proofs.unshift(proof);
  addLedger('proof', 'Proof sealed', quest.title);
  return proof;
}

function addRitual(realm, text) {
  const ritual = {
    id: uid('ritual'),
    date: todayKey(),
    realm,
    intention: String(text || '').trim(),
    nextAction: priorityQuest()?.title || realmById(realm).starterGoal,
    createdAt: nowIso()
  };
  state.rituals = [ritual, ...state.rituals.filter((item) => item.date !== ritual.date)].slice(0, 120);
  addLedger('ritual', 'Ritual sealed', ritual.intention);
  return ritual;
}

function addFocusPulse(minutes = 13) {
  const session = {
    id: uid('focus'),
    title: `${realmName(state.activeRealm)} focus pulse`,
    realm: state.activeRealm,
    intent: priorityQuest()?.title || realmById(state.activeRealm).starterGoal,
    minutes,
    createdAt: nowIso(),
    completedAt: nowIso()
  };
  state.focusSessions.unshift(session);
  addLedger('focus', 'Focus pulse logged', `${minutes} minutes / ${session.intent}`);
  return session;
}

function addMemory(text, title = 'Auren memory', source = 'local') {
  const note = {
    id: uid('note'),
    title: String(title || 'Auren memory').trim(),
    text: String(text || '').trim(),
    realm: state.activeRealm,
    source,
    createdAt: nowIso()
  };
  if (!note.text) note.text = note.title;
  state.notes.unshift(note);
  state.notes = state.notes.slice(0, 300);
  addLedger('memory', note.title, note.text.slice(0, 240));
  return note;
}

function addGrayTask(title, due = '') {
  const task = {
    id: uid('gtask'),
    title: String(title || '').trim() || 'Auren task',
    due: String(due || ''),
    done: false,
    source: 'Auren',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.grayTasks.unshift(task);
  state.activeGrayModule = 'tasks';
  writeGrayTasksToStorage();
  addLedger('grayscape', 'GrayScape task captured', task.title);
  return task;
}

function addGrayJournal(content, title = 'Auren Journal Capture') {
  const entry = {
    id: uid('gjournal'),
    title: String(title || '').trim() || 'Auren Journal Capture',
    content: String(content || '').trim() || 'Auren captured an empty signal.',
    mood: '',
    date: todayKey(),
    source: 'Auren',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.grayJournal.unshift(entry);
  state.activeGrayModule = 'journal';
  writeGrayJournalToStorage();
  addLedger('grayscape', 'GrayScape journal captured', entry.title);
  return entry;
}

function addVaultItem(title, text = '') {
  const item = {
    id: uid('gvault'),
    title: String(title || '').trim() || 'Auren vault item',
    text: String(text || '').trim(),
    source: 'Auren',
    createdAt: nowIso()
  };
  state.grayVault.unshift(item);
  state.activeGrayModule = 'vault';
  writeGrayVaultToStorage();
  addLedger('grayscape', 'GrayScape vault stored', item.title);
  return item;
}

function addResearchSession(title, notes) {
  const session = {
    id: uid('research'),
    title: String(title || '').trim() || 'Auren research session',
    notes: String(notes || '').trim(),
    laneId: 'research',
    createdAt: nowIso()
  };
  state.neuralSessions.unshift(session);
  state.activeNeuralLane = 'research';
  addLedger('neuralspace', 'Research session archived', session.title);
  return session;
}

function addBuild(name, brief) {
  const build = {
    id: uid('build'),
    name: String(name || '').trim() || 'Auren build',
    brief: String(brief || '').trim(),
    status: 'queued',
    laneId: 'build',
    createdAt: nowIso()
  };
  state.neuralBuilds.unshift(build);
  state.activeNeuralLane = 'build';
  addLedger('neuralspace', 'Build queued', build.name);
  return build;
}

function addHandoff(title, notes) {
  const handoff = {
    id: uid('handoff'),
    title: String(title || '').trim() || 'Auren handoff',
    notes: String(notes || '').trim(),
    status: 'ready',
    laneId: 'handoff',
    createdAt: nowIso()
  };
  state.neuralHandoffs.unshift(handoff);
  state.activeNeuralLane = 'handoff';
  addLedger('neuralspace', 'Handoff packet created', handoff.title);
  return handoff;
}

function addLedger(type, title, detail = '') {
  state.ledger.unshift({
    id: uid('ledger'),
    type,
    title,
    detail,
    realm: state.activeRealm,
    createdAt: nowIso()
  });
  state.ledger = state.ledger.slice(0, 300);
}

function importOver3arthStorage() {
  const raw = localStorage.getItem(OVER3ARTH_KEY);
  if (!raw) return { ok: false, message: 'No Over3arth local state found on this origin yet.' };
  try {
    const parsed = JSON.parse(raw);
    const source = parsed.state || parsed;
    const importedGoals = arrayOf(source.goals).map((goal) => ({
      id: `over_${goal.id || uid('goal')}`,
      externalId: goal.id || '',
      title: goal.title || 'Imported Over3arth goal',
      realm: realmById(goal.realm)?.id || 'craft',
      status: goal.status || 'active',
      source: 'Over3arth',
      createdAt: goal.createdAt || nowIso()
    }));
    const importedQuests = arrayOf(source.quests).map((quest) => ({
      id: `over_${quest.id || uid('quest')}`,
      externalId: quest.id || '',
      title: quest.title || 'Imported Over3arth quest',
      realm: realmById(quest.realm)?.id || 'craft',
      evidence: quest.evidence || 'Imported proof target.',
      detail: quest.detail || '',
      done: Boolean(quest.done),
      doneAt: quest.doneAt || '',
      source: 'Over3arth',
      createdAt: quest.createdAt || nowIso()
    }));
    const importedNotes = arrayOf(source.notes).map((note) => ({
      id: `over_${note.id || uid('note')}`,
      externalId: note.id || '',
      title: 'Over3arth note',
      text: note.text || note.detail || '',
      realm: realmById(note.realm)?.id || 'mind',
      source: 'Over3arth',
      createdAt: note.createdAt || nowIso()
    }));
    state.goals = mergeByExternal(state.goals, importedGoals);
    state.quests = mergeByExternal(state.quests, importedQuests);
    state.notes = mergeByExternal(state.notes, importedNotes);
    if (source.profile?.worldName) state.profile.worldName = source.profile.worldName;
    addLedger('import', 'Over3arth state imported', `${importedGoals.length} goals, ${importedQuests.length} quests, ${importedNotes.length} notes`);
    return { ok: true, message: `Over3arth imported: ${importedGoals.length} goals, ${importedQuests.length} quests, ${importedNotes.length} notes.` };
  } catch (error) {
    return { ok: false, message: `Over3arth import failed: ${error.message}` };
  }
}

function syncGrayScapeFromStorage(options = {}) {
  const { silent = false, save = false } = options;
  const tasksDb = readJson(GRAY_KEYS.tasks, { tasks: [] });
  const journalDb = readJson(GRAY_KEYS.journal, { entries: [] });
  const vaultDb = readJson(GRAY_KEYS.vault, { items: [] });
  const events = readJson(GRAY_KEYS.events, {});
  state.grayTasks = arrayOf(tasksDb.tasks).map(normalizeGrayTask);
  state.grayJournal = arrayOf(journalDb.entries).map(normalizeGrayJournal);
  state.grayVault = arrayOf(vaultDb.items).map(normalizeVaultItem);
  state.grayCalendarEvents = Object.entries(events || {}).flatMap(([date, dayEvents]) => (
    arrayOf(dayEvents).map((event) => ({
      id: event.id || uid('gevent'),
      date,
      title: event.summary || event.title || 'GrayScape event',
      detail: event.description || '',
      type: event.type || 'event',
      createdAt: event.createdAt || nowIso()
    }))
  ));
  const message = `GrayScape linked: ${state.grayTasks.length} tasks, ${state.grayJournal.length} journal entries, ${state.grayVault.length} vault items, ${state.grayCalendarEvents.length} calendar events.`;
  if (!silent) addLedger('grayscape', 'GrayScape storage synced', message);
  if (save) saveState();
  return { ok: true, message };
}

async function syncRuntime() {
  const base = (state.settings.runtimeUrl || defaultRuntimeUrl).replace(/\/$/u, '');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(`${base}/health`, { signal: controller.signal, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `runtime-${response.status}`);
    state.runtime = {
      online: true,
      checkedAt: nowIso(),
      summary: payload.runtimeSummary || payload.summary || {
        sessionCount: payload.sessionCount || payload.projectCount || 0,
        queueDepth: payload.queueDepth || 0,
        handoffPackCount: payload.handoffPackCount || 0
      }
    };
    addLedger('runtime', 'NeuralSpacePro runtime online', base);
    return { ok: true, message: `Runtime Spire is online at ${base}.` };
  } catch (error) {
    state.runtime = {
      online: false,
      checkedAt: nowIso(),
      summary: {},
      error: error.name === 'AbortError' ? 'timeout' : error.message
    };
    addLedger('runtime', 'NeuralSpacePro runtime offline', state.runtime.error);
    return { ok: false, message: `Runtime Spire is staged but not answering at ${base}. Auren is using the onboard local core.` };
  } finally {
    window.clearTimeout(timeout);
  }
}

function writeGrayTasksToStorage() {
  writeJson(GRAY_KEYS.tasks, {
    tasks: state.grayTasks.map((task) => ({
      id: task.id,
      title: task.title,
      due: task.due || '',
      done: Boolean(task.done),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt || nowIso()
    }))
  });
}

function writeGrayJournalToStorage() {
  writeJson(GRAY_KEYS.journal, {
    entries: state.grayJournal.map((entry) => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      mood: entry.mood || '',
      date: entry.date || todayKey(),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt || nowIso()
    }))
  });
}

function writeGrayVaultToStorage() {
  writeJson(GRAY_KEYS.vault, {
    items: state.grayVault.map((item) => ({
      id: item.id,
      title: item.title,
      text: item.text || '',
      createdAt: item.createdAt
    }))
  });
}

function createSnapshot(reason = 'Auren snapshot') {
  const snapshot = {
    id: uid('snapshot'),
    reason,
    createdAt: nowIso(),
    counts: {
      quests: state.quests.length,
      notes: state.notes.length,
      grayTasks: state.grayTasks.length,
      neuralSessions: state.neuralSessions.length
    },
    state: {
      profile: state.profile,
      settings: state.settings,
      activeRealm: state.activeRealm,
      activeGrayModule: state.activeGrayModule,
      activeNeuralLane: state.activeNeuralLane,
      goals: state.goals,
      quests: state.quests,
      rituals: state.rituals,
      focusSessions: state.focusSessions,
      proofs: state.proofs,
      notes: state.notes,
      ledger: state.ledger,
      grayTasks: state.grayTasks,
      grayJournal: state.grayJournal,
      grayVault: state.grayVault,
      grayCalendarEvents: state.grayCalendarEvents,
      neuralSessions: state.neuralSessions,
      neuralBuilds: state.neuralBuilds,
      neuralHandoffs: state.neuralHandoffs,
      chat: state.chat
    }
  };
  state.snapshots.unshift(snapshot);
  state.snapshots = state.snapshots.slice(0, 12);
  addLedger('snapshot', 'Snapshot stored', reason);
  return snapshot;
}

function restoreSnapshot(snapshotId) {
  const snapshot = state.snapshots.find((item) => item.id === snapshotId);
  if (!snapshot) return;
  const keepSnapshots = state.snapshots;
  state = normalizeState({ ...snapshot.state, snapshots: keepSnapshots, activeTab: 'memory' });
  addLedger('snapshot', 'Snapshot restored', snapshot.reason);
  toast(`Restored: ${snapshot.reason}`);
  saveAndRender();
}

function exportPacket() {
  const payload = {
    app: 'Auren Central Intelligence',
    version: 1,
    exportedAt: nowIso(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `auren-central-intelligence-${todayKey()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast('Auren packet exported.');
}

function importPacket(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const imported = parsed.state || parsed;
      state = normalizeState(imported);
      state.activeTab = 'memory';
      addLedger('import', 'Auren packet imported', file.name);
      toast('Auren packet imported.');
      saveAndRender();
    } catch (error) {
      toast(`Import failed: ${error.message}`);
    } finally {
      refs.importFile.value = '';
    }
  };
  reader.readAsText(file);
}

function resetState() {
  if (!window.confirm('Reset Auren local state on this browser? Export first if you need a packet.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = createDefaultState();
  toast('Auren local state reset.');
  saveAndRender();
}

function setTab(tab) {
  state.activeTab = tab || 'core';
  saveAndRender();
}

function priorityQuest() {
  return state.quests.find((quest) => !quest.done && quest.realm === state.activeRealm) || state.quests.find((quest) => !quest.done) || null;
}

function realmMetrics(realmId) {
  const goals = state.goals.filter((goal) => goal.realm === realmId && goal.status !== 'complete').length;
  const open = state.quests.filter((quest) => quest.realm === realmId && !quest.done).length;
  const proofs = state.quests.filter((quest) => quest.realm === realmId && quest.done).length + state.proofs.filter((proof) => proof.realm === realmId).length;
  const notes = state.notes.filter((note) => note.realm === realmId && daysAgo(note.createdAt) <= 7).length;
  return {
    goals,
    open,
    proofs,
    charge: clamp(10 + goals * 13 + proofs * 9 + notes * 5 - open * 2, 0, 100)
  };
}

function describeStatus() {
  const stats = calculateStats();
  const realm = realmById(state.activeRealm);
  const module = grayModuleById(state.activeGrayModule);
  const lane = neuralLaneById(state.activeNeuralLane);
  const quest = priorityQuest();
  return [
    `${state.profile.vesselName || 'Auren'} is the central intelligence for ${state.profile.worldName}.`,
    `World charge is ${stats.charge}%, with ${stats.openQuests} open proof moves and ${stats.memoryCells} memory cells.`,
    `${realm.name} is active, ${module.label} is the GrayScape room, and ${lane.label} is the NeuralSpace lane.`,
    quest ? `Nearest proof: "${quest.title}".` : `No open quest is selected, so I would forge one in ${realm.name}.`
  ].join(' ');
}

function answerOpenEnded(command) {
  const quest = priorityQuest();
  if (quest) {
    return `I read that as signal. The cleanest route is still "${quest.title}" in ${realmName(quest.realm)}. I can seal it, convert it into a GrayScape task, or archive the thread in NeuralSpace.`;
  }
  return `I heard the thread. ${realmName(state.activeRealm)} needs a target, so my next move would be to forge a small proof mission and attach it to the ledger.`;
}

function forgeAffirmation() {
  const realm = realmById(state.activeRealm);
  const base = affirmations[Math.floor(Math.random() * affirmations.length)];
  return `${base} In ${realm.name}, I move through proof before mood.`;
}

function findRealm(text) {
  return realms.find((realm) => text.includes(normalize(realm.name)) || text.includes(realm.id));
}

function findGrayModule(text) {
  return grayModules.find((module) => module.keywords.some((keyword) => text.includes(normalize(keyword))));
}

function findNeuralLane(text) {
  return neuralLanes.find((lane) => lane.keywords.some((keyword) => text.includes(normalize(keyword))));
}

function realmById(id) {
  return realms.find((realm) => realm.id === id) || realms[2];
}

function grayModuleById(id) {
  return grayModules.find((module) => module.id === id) || grayModules[0];
}

function neuralLaneById(id) {
  return neuralLanes.find((lane) => lane.id === id) || neuralLanes[0];
}

function realmName(id) {
  return realmById(id).name;
}

function arrayOf(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
}

function mergeByExternal(existing, incoming) {
  const seen = new Set(existing.map((item) => item.externalId || item.id));
  const fresh = incoming.filter((item) => {
    const key = item.externalId || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...fresh, ...existing];
}

function normalizeGrayTask(task) {
  return {
    id: task.id || uid('gtask'),
    title: task.title || task.summary || 'GrayScape task',
    due: task.due || task.dueDate || '',
    done: Boolean(task.done),
    source: task.source || 'GrayScape',
    createdAt: toIso(task.createdAt),
    updatedAt: toIso(task.updatedAt || task.createdAt)
  };
}

function normalizeGrayJournal(entry) {
  return {
    id: entry.id || uid('gjournal'),
    title: entry.title || 'GrayScape journal',
    content: entry.content || entry.text || '',
    mood: entry.mood || '',
    date: entry.date || todayKey(),
    source: entry.source || 'GrayScape',
    createdAt: toIso(entry.createdAt),
    updatedAt: toIso(entry.updatedAt || entry.createdAt)
  };
}

function normalizeVaultItem(item) {
  return {
    id: item.id || uid('gvault'),
    title: item.title || item.name || 'Vault item',
    text: item.text || item.content || '',
    source: item.source || 'GrayScape',
    createdAt: toIso(item.createdAt)
  };
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasAny(text, terms) {
  return terms.some((term) => text.includes(normalize(term)));
}

function extractAfter(raw, commands = []) {
  const value = String(raw || '').trim();
  const normalized = normalize(value);
  for (const command of commands) {
    const key = normalize(command);
    const index = normalized.indexOf(key);
    if (index === -1) continue;
    const originalIndex = value.toLowerCase().indexOf(command.toLowerCase());
    if (originalIndex === -1) continue;
    return value.slice(originalIndex + command.length).replace(/^[:\s-]+/u, '').trim();
  }
  return '';
}

function extractMemoryText(raw = '') {
  const value = String(raw || '').trim();
  const patterns = [
    /remember(?: that)?\s+(.+)/i,
    /save(?: this| that)?\s+(.+)/i,
    /note(?: this| that)?\s+(.+)/i,
    /log(?: this| that)?\s+(.+)/i
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractOperatorName(raw = '') {
  const match = String(raw || '').trim().match(/(?:call me|my name is|you can call me)\s+([a-z0-9][a-z0-9 .'-]{1,42})/i);
  if (!match) return '';
  return match[1].replace(/[.!?]+$/g, '').trim().split(/\s+/).slice(0, 4).join(' ');
}

function extractVesselName(raw = '') {
  const match = String(raw || '').trim().match(/(?:call you|name you|your name is|vessel is|energy vessel is)\s+([a-z][a-z0-9-]{1,18})/i);
  return match?.[1] || '';
}

function daysAgo(value) {
  const time = new Date(value || 0).getTime();
  if (Number.isNaN(time) || !time) return 999;
  return Math.floor((Date.now() - time) / 86400000);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function toIso(value) {
  if (!value) return nowIso();
  if (typeof value === 'number') return new Date(value).toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? nowIso() : date.toISOString();
}

function formatDate(value) {
  if (!value) return 'no date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'no date';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function emptyLine(text) {
  return `<article class="list-item"><p>${escapeHtml(text)}</p></article>`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => refs.toast.classList.remove('show'), 2600);
}

function moveCursorField(event) {
  if (!refs.cursorField || window.matchMedia('(pointer: coarse)').matches) return;
  refs.cursorField.style.opacity = '1';
  refs.cursorField.style.transform = `translate3d(${event.clientX - 115}px, ${event.clientY - 115}px, 0)`;
}

function bootLivingField() {
  const canvas = refs.livingField;
  const ctx = canvas?.getContext?.('2d', { alpha: true });
  if (!canvas || !ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let pointerX = 0.5;
  let pointerY = 0.5;
  let running = true;

  function resize() {
    const compact = window.innerWidth <= 760;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.5);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = compact ? 28 : 58;
    particles = Array.from({ length: count }, (_, index) => ({
      x: (index * 97) % Math.max(width, 1),
      y: (index * 53) % Math.max(height, 1),
      r: 1.2 + (index % 4) * 0.48,
      speed: 0.11 + (index % 7) * 0.026,
      color: index % 4
    }));
  }

  function drawWave(time, yBase, color, amp, phase) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 18) {
      const y = yBase + Math.sin(x * 0.008 + time + phase) * amp + Math.cos(x * 0.004 - time * 0.7) * amp * 0.45;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function draw(frame = 0) {
    const time = frame * 0.00036;
    ctx.clearRect(0, 0, width, height);
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, 'rgba(64, 244, 255, 0.075)');
    wash.addColorStop(0.45, 'rgba(255, 219, 112, 0.055)');
    wash.addColorStop(1, 'rgba(169, 134, 255, 0.07)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    const px = (pointerX - 0.5) * 22;
    const py = (pointerY - 0.5) * 18;
    drawWave(time, height * 0.58 + py, 'rgba(64, 244, 255, 0.075)', 26, px * 0.04);
    drawWave(time * 1.22, height * 0.72 - py * 0.45, 'rgba(255, 219, 112, 0.07)', 20, 2.2);
    drawWave(time * 0.9, height * 0.8, 'rgba(255, 102, 157, 0.045)', 24, 4.7);

    particles.forEach((particle, index) => {
      const drift = reduced ? 0 : frame * particle.speed * 0.012;
      const x = (particle.x + drift + px + Math.sin(time + index) * 15) % Math.max(width, 1);
      const y = (particle.y + py + Math.cos(time * 1.4 + index) * 14) % Math.max(height, 1);
      const palette = [
        'rgba(255, 219, 112, 0.33)',
        'rgba(64, 244, 255, 0.31)',
        'rgba(169, 134, 255, 0.29)',
        'rgba(142, 255, 177, 0.25)'
      ];
      ctx.beginPath();
      ctx.arc(x, y, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = palette[particle.color];
      ctx.fill();
    });

    if (running && !reduced) window.requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX / Math.max(1, width);
    pointerY = event.clientY / Math.max(1, height);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduced) window.requestAnimationFrame(draw);
  });
  resize();
  window.requestAnimationFrame(draw);
}
