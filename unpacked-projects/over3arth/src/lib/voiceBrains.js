import { findNeuralSpaceLane } from '../data/neuralSpacePro.js';

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

export function createBrainResponse({ transcript, target, state, stats, selectedRealm, activeGate, gates, realms, vesselName }) {
  const text = normalizeTranscript(transcript);
  const realm = selectedRealm || {};
  const gate = activeGate || {};
  const name = vesselName || DEFAULT_VESSEL_NAME;

  const rename = extractVesselName(text);
  if (rename) {
    return {
      target: 'vessel',
      action: 'rename_vessel',
      payload: { name: rename },
      response: `Name accepted. I am ${rename}. Say my name and I will surface.`
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
      response: `${neuralLane.label} is folding into Overearth. ${neuralLane.response}`
    };
  }

  const realmMatch = findRealmMatch(text, realms || [], realm);
  if (realmMatch) {
    return {
      target,
      action: 'travel_realm',
      payload: { realmId: realmMatch.id },
      response: target === 'overearth'
        ? `${realmMatch.name} is opening on the globe. I am moving the world charge there.`
        : `I feel ${realmMatch.name}. Moving my body of light there now.`
    };
  }

  const gateMatch = findGateMatch(text, gates);
  if (gateMatch) {
    return {
      target,
      action: 'travel_gate',
      payload: { gateId: gateMatch.id },
      response: target === 'overearth'
        ? `${gateMatch.worldName || gateMatch.label} is now the active world.`
        : `I found the ${gateMatch.worldName || gateMatch.label}. I am crossing into it.`
    };
  }

  if (includesAny(text, ['seal', 'complete', 'done', 'finished', 'proof'])) {
    return {
      target,
      action: 'seal_quest',
      response: target === 'overearth'
        ? 'I will convert the active quest into proof and raise the field.'
        : 'I am sealing the nearest proof thread. Let the world remember it.'
    };
  }

  if (includesAny(text, ['mission', 'quest', 'what should i do', 'give me something', 'next move'])) {
    return {
      target,
      action: 'generate_mission',
      response: target === 'overearth'
        ? `I am forging a mission inside ${realm.name || 'the active realm'}.`
        : `Give me one clean move. I will carry it through ${realm.name || 'this realm'}.`
    };
  }

  if (includesAny(text, ['ritual', 'flame', 'start my day', 'daily'])) {
    return {
      target,
      action: 'ritual_pulse',
      response: 'Ritual flame caught. I am writing today into the world engine.'
    };
  }

  if (includesAny(text, ['focus', 'lock in', 'timer', 'deep work'])) {
    return {
      target,
      action: 'focus_pulse',
      response: `${name} is entering focus posture. Thirteen minutes is enough to create proof.`
    };
  }

  if (includesAny(text, ['status', 'charge', 'how are we', 'how is the world', 'report'])) {
    return {
      target: 'overearth',
      action: 'world_status',
      response: `World charge is ${stats.energy} percent. You have ${stats.completedQuests} sealed proofs and ${stats.activeGoals} active reality threads. The active world is ${gate.worldName || gate.label || 'Overearth'} inside ${realm.name || 'New Earth'}.`
    };
  }

  if (target === 'overearth') {
    return {
      target,
      action: 'none',
      response: `I hear you. ${realm.name || 'This realm'} is asking for proof, not more planning. Ask me for a mission, a status report, or a realm jump.`
    };
  }

  return {
    target,
    action: 'none',
    response: `${name} is listening. Send me to a realm, ask for a mission, or tell me to seal proof.`
  };
}

function normalizeTranscript(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
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
