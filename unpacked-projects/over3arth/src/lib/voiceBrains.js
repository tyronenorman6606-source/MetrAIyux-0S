import { findNeuralSpaceLane, getNeuralSpaceLane, neuralSpaceLanes } from '../data/neuralSpacePro.js';
import { findGrayScapeModule, getGrayScapeModule, grayScapeModules } from '../data/grayscapeSuperApp.js';

export const DEFAULT_VESSEL_NAME = 'Auren';

export const gateWorldNames = {
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

export function getVesselName(state) {
  return state?.profile?.vesselName || DEFAULT_VESSEL_NAME;
}

export function detectBrainTarget(transcript, vesselName = DEFAULT_VESSEL_NAME, fallback = 'vessel') {
  const text = normalizeTranscript(transcript);
  if (!text) return fallback;
  if (text.includes('overearth') || text.includes('over earth') || text.includes('world brain') || text.includes('new earth')) return 'overearth';
  if (text.includes('neural space') || text.includes('neuralspace') || text.includes('assistant dimension') || text.includes('local brain')) return 'vessel';
  if (text.includes(normalizeTranscript(vesselName)) || text.includes('energy vessel') || text.includes('vessel') || text.includes('avatar')) return 'vessel';
  return fallback;
}

export function createBrainResponse({
  transcript,
  target,
  state = {},
  stats = {},
  selectedRealm,
  activeGate,
  gates,
  realms,
  vesselName,
  activeNeuralLane,
  neuralRuntime,
  activeGrayScapeModule,
  grayScapeSignal
}) {
  const text = normalizeTranscript(transcript);
  const name = vesselName || DEFAULT_VESSEL_NAME;
  const context = buildBrainContext({ state, stats, selectedRealm, activeGate, activeNeuralLane, neuralRuntime, activeGrayScapeModule, grayScapeSignal, vesselName: name });
  const variant = pickVariant(text, state?.brainMemory, context);

  const rename = extractVesselName(text);
  if (rename) {
    return {
      target: 'vessel',
      action: 'rename_vessel',
      payload: { name: rename },
      response: `Name accepted. I am ${rename}. Say my name and I will surface.`
    };
  }

  const noteText = extractMemoryText(transcript);
  if (noteText) {
    return {
      target,
      action: 'capture_note',
      payload: { note: noteText },
      response: `Stored that in the Memory Sea: "${trimForSpeech(noteText, 140)}" I can use it when I read the next move.`
    };
  }

  if (includesAny(text, ['dumb', 'stupid', 'repeat', 'repeating', 'same thing', 'same shit', 'robot', 'robotic', 'loop'])) {
    return {
      target: 'vessel',
      action: 'self_correct',
      response: [
        `${name} heard that. I was looping instead of reading the room.`,
        `Current read: ${context.worldName} is at ${context.energy}% charge, ${context.realmName} is active, and ${context.priorityQuest ? `the nearest proof is "${context.priorityQuest.title}"` : 'there is no active proof thread yet'}.`,
        `From here I will answer with one observation, one move, and one route instead of repeating the same line.`
      ].join(' ')
    };
  }

  if (includesAny(text, ['what can you do', 'how do you work', 'help', 'commands', 'use you', 'who are you'])) {
    return {
      target: 'vessel',
      action: 'explain_capabilities',
      response: describeCapabilities(context, name, variant)
    };
  }

  if (includesAny(text, ['sync runtime', 'refresh runtime', 'check runtime', 'runtime status', 'worker status'])) {
    return {
      target: 'vessel',
      action: 'sync_neural_runtime',
      payload: { laneId: 'runtime' },
      response: describeRuntime(context)
    };
  }

  if (includesAny(text, ['sync grayscape', 'refresh grayscape', 'grayscape status', 'gray scape status', 'nexus status'])) {
    return {
      target: 'vessel',
      action: 'grayscape_sync',
      payload: { moduleId: context.grayModule.id },
      response: describeGrayScapeStatus(context)
    };
  }

  const wantsGrayTaskCapture = includesAny(text, ['capture task', 'add task']) || /(?:grayscape|gray scape) task(?!s)\s+/.test(text);
  const wantsGrayJournalCapture = includesAny(text, ['capture journal', 'journal this']);

  if (wantsGrayTaskCapture) {
    const title = extractAfterCommand(transcript, ['grayscape task', 'gray scape task', 'capture task', 'add task']) || context.priorityQuest?.title || 'Overearth proof move';
    return {
      target: 'vessel',
      action: 'grayscape_task',
      payload: { title },
      response: `Captured a GrayScape task through ${context.grayModule.label}: "${trimForSpeech(title, 120)}".`
    };
  }

  if (wantsGrayJournalCapture) {
    const entry = extractAfterCommand(transcript, ['grayscape journal', 'gray scape journal', 'capture journal', 'journal this']) || transcript;
    return {
      target: 'vessel',
      action: 'grayscape_journal',
      payload: { title: 'Overearth Capture', content: entry },
      response: 'Saved that into GrayScape Journal. It is now part of the written operator layer.'
    };
  }

  const grayModule = findGrayScapeModule(text);
  if (grayModule && !text.includes('knowledge vault')) {
    return {
      target: 'vessel',
      action: 'open_grayscape_module',
      payload: { moduleId: grayModule.id },
      response: describeGrayScapeModule(grayModule, context, variant)
    };
  }

  const neuralLane = findNeuralSpaceLane(text);
  if (neuralLane) {
    const action = includesAny(text, ['build website', 'build pipeline', 'build forge', 'generate website', 'project archive'])
      ? 'neural_build'
      : includesAny(text, ['research', 'session', 'archive chat', 'study this', 'think with me', 'investigate'])
        ? 'neural_research'
        : 'open_neural_lane';
    return {
      target: 'vessel',
      action,
      payload: { laneId: neuralLane.id },
      response: describeNeuralLane(neuralLane, context, action, variant)
    };
  }

  const realmMatch = findRealmMatch(text, realms || [], context.realm);
  if (realmMatch) {
    return {
      target,
      action: 'travel_realm',
      payload: { realmId: realmMatch.id },
      response: describeRealmTravel(realmMatch, context, target, variant)
    };
  }

  const gateMatch = findGateMatch(text, gates);
  if (gateMatch) {
    return {
      target,
      action: 'travel_gate',
      payload: { gateId: gateMatch.id },
      response: describeGateTravel(gateMatch, context, target, variant)
    };
  }

  if (includesAny(text, ['seal', 'complete', 'done', 'finished', 'proof'])) {
    return {
      target,
      action: 'seal_quest',
      response: context.priorityQuest
        ? `I am sealing "${context.priorityQuest.title}" as proof. After that, ${context.realmName} needs the next visible receipt, not another idea.`
        : `I do not see an open proof close enough to seal. Ask me to forge a mission and I will create one inside ${context.realmName}.`
    };
  }

  if (includesAny(text, ['make a quest', 'create quest', 'forge quest', 'forge a quest', 'generate quest', 'generate mission', 'give me a mission', 'launch mission'])) {
    return {
      target,
      action: 'generate_mission',
      response: `I am forging a mission in ${context.realmName}. It will be small enough to finish today and real enough to leave a receipt.`
    };
  }

  if (includesAny(text, ['mission', 'quest', 'what should i do', 'give me something', 'next move', 'next', 'stuck', 'plan', 'strategy'])) {
    return {
      target,
      action: 'recommend_next',
      response: describeNextMove(context, variant)
    };
  }

  if (includesAny(text, ['ritual', 'flame', 'start my day', 'daily'])) {
    return {
      target,
      action: 'ritual_pulse',
      response: `Ritual flame caught for ${context.realmName}. I am binding it to this move: ${context.priorityQuest?.title || context.realm?.starterGoal || 'one visible proof before the day ends'}.`
    };
  }

  if (includesAny(text, ['focus', 'lock in', 'timer', 'deep work'])) {
    return {
      target,
      action: 'focus_pulse',
      response: `${name} is entering focus posture. Thirteen minutes goes to ${context.priorityQuest?.title || context.realmName}. No tabs, no drift, one receipt.`
    };
  }

  if (includesAny(text, ['status', 'charge', 'how are we', 'how is the world', 'report'])) {
    return {
      target: 'overearth',
      action: 'world_status',
      response: describeWorldStatus(context, variant)
    };
  }

  if (includesAny(text, ['summarize', 'what happened', 'memory', 'remember so far', 'what do you know'])) {
    return {
      target,
      action: 'summarize_memory',
      response: summarizeMemory(context, name)
    };
  }

  if (target === 'overearth') {
    return {
      target,
      action: 'none',
      response: answerOpenEnded(transcript, context, 'overearth', variant)
    };
  }

  return {
    target,
    action: 'none',
    response: answerOpenEnded(transcript, context, 'vessel', variant)
  };
}

function normalizeTranscript(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildBrainContext({ state, stats, selectedRealm, activeGate, activeNeuralLane, neuralRuntime, activeGrayScapeModule, grayScapeSignal, vesselName }) {
  const goals = safeArray(state.goals);
  const quests = safeArray(state.quests);
  const notes = safeArray(state.notes);
  const rituals = safeArray(state.rituals);
  const focusSessions = safeArray(state.focusSessions);
  const brainMemory = safeArray(state.brainMemory);
  const realm = selectedRealm || {};
  const gate = activeGate || {};
  const lane = activeNeuralLane || getNeuralSpaceLane('chat');
  const grayModule = activeGrayScapeModule || getGrayScapeModule('nexus');
  const openQuests = quests.filter((quest) => !quest.done);
  const realmOpenQuests = openQuests.filter((quest) => quest.realm === realm.id);
  const priorityQuest = realmOpenQuests[0] || openQuests[0] || null;
  const recentProof = quests.find((quest) => quest.done) || null;
  const activeGoals = goals.filter((goal) => goal.status !== 'complete');
  const realmGoal = activeGoals.find((goal) => goal.realm === realm.id) || activeGoals[0] || null;
  const recentNote = notes[0] || null;
  const latestMemory = brainMemory[0] || null;

  return {
    state,
    stats,
    vesselName,
    worldName: state?.profile?.worldName || 'Overearth',
    realm,
    realmName: realm.name || 'the active realm',
    gate,
    gateName: gate.worldName || gate.label || 'World',
    lane,
    laneName: lane.label,
    grayModule,
    grayScapeSignal: grayScapeSignal || { online: false },
    energy: Number(stats?.energy || 0),
    completedQuests: Number(stats?.completedQuests || 0),
    activeGoals: Number(stats?.activeGoals || activeGoals.length || 0),
    focusMinutes: Number(stats?.focusMinutes || 0),
    streak: Number(stats?.streak || 0),
    openQuests,
    realmOpenQuests,
    priorityQuest,
    recentProof,
    realmGoal,
    recentNote,
    rituals,
    focusSessions,
    brainMemory,
    latestMemory,
    neuralRuntime: neuralRuntime || { online: false, summary: null }
  };
}

function pickVariant(text, brainMemory = [], context = {}) {
  const memoryCount = safeArray(brainMemory).length;
  const energy = context.energy || 0;
  const lastCommand = normalizeTranscript(safeArray(brainMemory)[0]?.command || '');
  let hash = memoryCount + energy;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 997;
  }
  if (lastCommand && lastCommand === text) return (memoryCount + 1) % 4;
  return (hash + memoryCount) % 4;
}

function describeCapabilities(context, name, variant) {
  const lanes = neuralSpaceLanes.map((lane) => lane.shortLabel).join(', ');
  const grayModules = grayScapeModules.map((module) => module.shortLabel).join(', ');
  const openings = [
    `${name} can do more than answer now.`,
    `Here is what is actually wired, not pretend-magic.`,
    `I have three layers online right now.`,
    `Use me like a companion inside the world, not a search box.`
  ];
  return [
    openings[variant],
    `I can move the avatar through realms, read ${context.realmName}, forge or seal proof quests, log notes, start ritual/focus pulses, route NeuralSpace lanes: ${lanes}, and open GrayScape modules: ${grayModules}.`,
    context.neuralRuntime?.online
      ? `The local runtime is live with ${context.neuralRuntime.summary?.sessionCount || 0} sessions and ${context.neuralRuntime.summary?.queueDepth || 0} queued events.`
      : `The visual brain is staged; the local runtime needs to be running before I can archive or build through NeuralSpace.`
  ].join(' ');
}

function describeGrayScapeStatus(context) {
  const signal = context.grayScapeSignal || {};
  const tasks = signal.tasks || {};
  const journal = signal.journal || {};
  const command = signal.command || {};
  return `GrayScape Nexus is linked. I see ${tasks.open || 0} open tasks, ${journal.entries || 0} journal entries, ${command.founderMessages || 0} founder messages, and the active module is ${context.grayModule.label}.`;
}

function describeGrayScapeModule(module, context, variant) {
  const openings = [
    `${module.label} is opening inside Overearth.`,
    `I am routing the vessel into ${module.label}.`,
    `GrayScape ${module.shortLabel} is becoming the active stage.`,
    `Opening ${module.label} through the Nexus gate.`
  ];
  const signal = context.grayScapeSignal || {};
  const status = module.id === 'tasks'
    ? `${signal.tasks?.open || 0} open tasks are already in that room.`
    : module.id === 'journal'
      ? `${signal.journal?.entries || 0} journal entries are already recorded.`
      : module.id === 'vault'
        ? `Vault is ${signal.vault?.locked ? 'locked' : 'open'} with ${signal.vault?.items || 0} items.`
        : module.id === 'command'
          ? `${signal.command?.founderMessages || 0} founder messages are seeded there.`
          : `It is mapped to ${context.gateName}.`;
  return `${openings[variant]} ${module.gameplay} ${status}`;
}

function describeRuntime(context) {
  if (context.neuralRuntime?.online) {
    const summary = context.neuralRuntime.summary || {};
    return `Runtime Spire is online. I see ${summary.sessionCount || 0} archived sessions, ${summary.projectCount || 0} projects, ${summary.queueDepth || 0} queue events, and ${summary.handoffPackCount || 0} handoffs.`;
  }
  return 'Runtime Spire is the right lane, but I do not have a live worker signal in memory yet. I am checking it now.';
}

function describeNeuralLane(lane, context, action, variant) {
  const actionLine = action === 'neural_build'
    ? `Give me the build brief and I will push it through the local Build Forge.`
    : action === 'neural_research'
      ? `I will archive this exchange as research if the local worker answers.`
      : `I am opening it without pretending it is more than it is.`;
  const stateLine = context.neuralRuntime?.online
    ? `Runtime signal: ${context.neuralRuntime.summary?.sessionCount || 0} sessions, ${context.neuralRuntime.summary?.queueDepth || 0} queued events.`
    : `Runtime signal is not loaded yet, so this is visual-first until sync finishes.`;
  const openings = [
    `${lane.label} is now tied to ${context.gateName}.`,
    `Opening ${lane.label} through ${context.worldName}.`,
    `${lane.label} is the active assistant lane now.`,
    `I am routing you into ${lane.label}, not repeating the intro line.`
  ];
  return `${openings[variant]} ${lane.gameplay} ${actionLine} ${stateLine}`;
}

function describeRealmTravel(realm, context, target, variant) {
  const activeQuest = context.openQuests.find((quest) => quest.realm === realm.id);
  const openings = target === 'overearth'
    ? [`${realm.name} is opening on the globe.`, `Overearth is rotating toward ${realm.name}.`, `World charge is moving into ${realm.name}.`, `${realm.name} is now the field I am reading.`]
    : [`I am moving the vessel into ${realm.name}.`, `${context.vesselName} is crossing into ${realm.name}.`, `The avatar is shifting realms into ${realm.name}.`, `I feel ${realm.name}; moving there now.`];
  return [
    openings[variant],
    realm.promise,
    activeQuest ? `There is already a proof thread there: "${activeQuest.title}".` : `First move there should be: ${realm.starterGoal}.`
  ].join(' ');
}

function describeGateTravel(gate, context, target, variant) {
  const name = gate.worldName || gate.label;
  const openings = target === 'overearth'
    ? [`${name} is active.`, `Overearth is routing through ${name}.`, `${name} is now the front gate.`, `I moved the world focus into ${name}.`]
    : [`I found ${name}.`, `${context.vesselName} is crossing into ${name}.`, `Moving the avatar through ${name}.`, `The vessel is standing at ${name}.`];
  return `${openings[variant]} This gate connects to ${gate.label || 'a world system'}; ask for a next move there and I will make it specific.`;
}

function describeNextMove(context, variant) {
  if (context.priorityQuest) {
    const openings = [
      `Do this next: "${context.priorityQuest.title}".`,
      `The cleanest move is already on the board: "${context.priorityQuest.title}".`,
      `I would not create a new task yet. Finish "${context.priorityQuest.title}".`,
      `Nearest proof thread: "${context.priorityQuest.title}".`
    ];
    return `${openings[variant]} Evidence target: ${context.priorityQuest.evidence || 'leave a receipt'}. After that, seal it and let ${context.realmName} update.`;
  }
  if (context.realmGoal) {
    return `Next move: create one proof for "${context.realmGoal.title}". Keep it under 20 minutes. A sent message, screenshot, draft, or shipped artifact counts.`;
  }
  return `Next move: forge one goal in ${context.realmName}, then ask me to generate a mission. The world has charge, but it needs a target.`;
}

function describeWorldStatus(context, variant) {
  const openings = [
    `${context.worldName} is at ${context.energy}% charge.`,
    `World report: ${context.energy}% charge.`,
    `Overearth readout: ${context.energy}% charge.`,
    `The world is awake at ${context.energy}% charge.`
  ];
  const proofLine = `${context.completedQuests} proofs sealed, ${context.activeGoals} active goals, ${context.focusMinutes} focus minutes.`;
  const actionLine = context.priorityQuest
    ? `Nearest proof is "${context.priorityQuest.title}" in ${context.realmName}.`
    : `No open proof is selected; ${context.realmName} needs a fresh mission.`;
  const memoryLine = context.recentNote ? `Latest memory says: "${trimForSpeech(context.recentNote.text, 110)}"` : 'Memory Sea is quiet right now.';
  return `${openings[variant]} ${proofLine} ${actionLine} ${memoryLine}`;
}

function summarizeMemory(context, name) {
  const parts = [];
  if (context.latestMemory) parts.push(`Last brain exchange: you said "${trimForSpeech(context.latestMemory.command, 90)}".`);
  if (context.recentNote) parts.push(`Latest note: "${trimForSpeech(context.recentNote.text, 100)}".`);
  if (context.recentProof) parts.push(`Latest sealed proof I see: "${context.recentProof.title}".`);
  if (!parts.length) return `${name} does not have much memory yet. Tell me "remember that..." and I will put it in the Memory Sea.`;
  return parts.join(' ');
}

function answerOpenEnded(transcript, context, target, variant) {
  const quote = trimForSpeech(transcript, 80);
  const openings = target === 'overearth'
    ? [
      `I hear the world-question inside that.`,
      `Overearth is reading that as signal, not noise.`,
      `That lands in ${context.realmName}.`,
      `I can work with that.`
    ]
    : [
      `${context.vesselName} heard you.`,
      `That is not a command yet, but it is a signal.`,
      `I am not going to loop on you.`,
      `I am tracking the thread.`
    ];
  const next = context.priorityQuest
    ? `If you want action, tell me "seal proof" or "focus pulse" for "${context.priorityQuest.title}".`
    : `If you want action, tell me "forge a mission" and I will create the first proof move in ${context.realmName}.`;
  return `${openings[variant]} You said: "${quote}". ${next}`;
}

function extractMemoryText(raw = '') {
  const value = String(raw).trim();
  const normalized = normalizeTranscript(value);
  const patterns = [
    /remember(?: that)?\s+(.+)/i,
    /save(?: this| that)?\s+(.+)/i,
    /note(?: this| that)?\s+(.+)/i,
    /log(?: this| that)?\s+(.+)/i
  ];
  if (!includesAny(normalized, ['remember', 'save this', 'save that', 'note this', 'note that', 'log this', 'log that'])) return '';
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractAfterCommand(raw = '', commands = []) {
  const value = String(raw || '').trim();
  const normalized = normalizeTranscript(value);
  for (const command of commands) {
    const commandText = normalizeTranscript(command);
    if (!normalized.includes(commandText)) continue;
    const pattern = new RegExp(`${command.replace(/\s+/g, '\\s+')}\\s*:?\\s*(.*)`, 'i');
    const match = value.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function trimForSpeech(value = '', max = 120) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function extractVesselName(text) {
  const patterns = [
    /(?:call you|name you|your name is|vessel is|energy vessel is)\s+([a-z][a-z0-9-]{1,18})/,
    /(?:call my vessel|name my vessel)\s+([a-z][a-z0-9-]{1,18})/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return titleCase(match[1]);
  }
  return '';
}

function findRealmMatch(text, realms = [], fallbackRealm) {
  const realRealms = realms.length ? realms : [];
  return realRealms.find((realm) => {
    const name = normalizeTranscript(realm.name);
    return text.includes(realm.id) || name.split(' ').some((part) => part.length > 3 && text.includes(part));
  }) || null;
}

function findGateMatch(text, gates = []) {
  return gates.find((gate) => {
    const worldName = normalizeTranscript(gate.worldName || '');
    const label = normalizeTranscript(gate.label || '');
    return text.includes(gate.id) || (label && text.includes(label)) || worldName.split(' ').some((part) => part.length > 3 && text.includes(part));
  }) || null;
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase();
}
