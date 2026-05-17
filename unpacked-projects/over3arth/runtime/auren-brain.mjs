#!/usr/bin/env node
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { realms } from '../src/data/over3arthContent.js';
import { getNeuralSpaceLane, neuralSpaceLanes } from '../src/data/neuralSpacePro.js';
import { getGrayScapeModule, grayScapeModules } from '../src/data/grayscapeSuperApp.js';
import { createBrainResponse, detectBrainTarget, gateWorldNames, getVesselName } from '../src/lib/voiceBrains.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const memoryPath = path.join(root, 'runtime/auren-brain-memory.json');
const MAX_BODY_BYTES = 1_800_000;
const PUBLIC_GATE_NAME = process.env.AUREN_GATE_NAME || 'MetrAIyux Gate';
const PUBLIC_GATE_CHANNEL = process.env.AUREN_GATE_CHANNEL || 'AurenBrain';

const defaultProviderConfig = {
  openaiModel: process.env.AUREN_OPENAI_MODEL || 'gpt-5.2',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiMode: process.env.AUREN_OPENAI_MODE || 'responses',
  compatBaseUrl: process.env.AUREN_OPENAI_COMPAT_BASE_URL || '',
  compatApiKey: process.env.AUREN_OPENAI_COMPAT_API_KEY || process.env.LMSTUDIO_API_KEY || 'not-needed',
  compatModel: process.env.AUREN_OPENAI_COMPAT_MODEL || process.env.LMSTUDIO_MODEL || '',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.AUREN_OLLAMA_MODEL || process.env.OLLAMA_MODEL || '',
  ttsModel: process.env.AUREN_TTS_MODEL || 'gpt-4o-mini-tts',
  sttModel: process.env.AUREN_STT_MODEL || 'gpt-4o-transcribe',
  ttsVoice: process.env.AUREN_TTS_VOICE || 'nova',
  neuralRuntimeUrl: process.env.NEURALSPACE_RUNTIME_URL || 'http://127.0.0.1:4121/runtime/standalone-apps/NeuralSpacePro'
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['target', 'response', 'actions', 'memoryWrites', 'mood', 'confidence'],
  properties: {
    target: { type: 'string', enum: ['vessel', 'overearth'] },
    response: { type: 'string' },
    actions: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'payload', 'reason'],
        properties: {
          type: {
            type: 'string',
            enum: [
              'none',
              'self_correct',
              'recommend_next',
              'capture_note',
              'sync_neural_runtime',
              'open_neural_lane',
              'neural_research',
              'neural_build',
              'travel_realm',
              'travel_gate',
              'generate_mission',
              'seal_quest',
              'ritual_pulse',
              'focus_pulse',
              'rename_vessel',
              'summarize_memory',
              'explain_capabilities',
              'open_grayscape_module',
              'grayscape_task',
              'grayscape_journal',
              'grayscape_sync'
            ]
          },
          payload: { type: 'object', additionalProperties: true },
          reason: { type: 'string' }
        }
      }
    },
    memoryWrites: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'text'],
        properties: {
          type: { type: 'string', enum: ['preference', 'fact', 'goal', 'correction', 'note'] },
          text: { type: 'string' }
        }
      }
    },
    mood: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  }
};

function json(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(payload, null, 2));
}

function binary(res, statusCode, buffer, contentType) {
  res.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store'
  });
  res.end(buffer);
}

function publicGatePayload(internalProvider = 'local-fallback') {
  const modelBacked = internalProvider && !['local', 'local-fallback', 'browser-fallback'].includes(internalProvider);
  return {
    name: PUBLIC_GATE_NAME,
    channel: PUBLIC_GATE_CHANNEL,
    mode: modelBacked ? 'company-gated-engine' : 'onboard-core',
    label: `${PUBLIC_GATE_NAME} / ${PUBLIC_GATE_CHANNEL}`
  };
}

function publicProviderLabel() {
  return `${PUBLIC_GATE_NAME} / ${PUBLIC_GATE_CHANNEL}`;
}

function publicFailures(failures = []) {
  if (!failures.length) return [];
  return [{
    gate: publicProviderLabel(),
    error: 'A private backing engine did not answer, so the company gate used the onboard core.'
  }];
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('request-too-large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function ensureMemory() {
  try {
    const raw = await fs.readFile(memoryPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      exchanges: Array.isArray(parsed.exchanges) ? parsed.exchanges : [],
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      updatedAt: parsed.updatedAt || null
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const empty = { exchanges: [], facts: [], updatedAt: null };
    await writeMemory(empty);
    return empty;
  }
}

async function writeMemory(memory) {
  await fs.mkdir(path.dirname(memoryPath), { recursive: true });
  await fs.writeFile(memoryPath, `${JSON.stringify(memory, null, 2)}\n`, 'utf8');
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function textOf(item) {
  if (!item) return '';
  return [
    item.title,
    item.text,
    item.detail,
    item.evidence,
    item.command,
    item.response,
    item.why,
    item.desiredOutcome,
    item.intent,
    item.output,
    item.type
  ].filter(Boolean).join(' ');
}

function scoreText(query, value) {
  const q = normalize(query).split(' ').filter((part) => part.length > 2);
  const text = normalize(value);
  if (!q.length || !text) return 0;
  return q.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function buildGameGates() {
  return Object.entries(gateWorldNames).map(([id, worldName]) => ({
    id,
    label: worldName.replace(/ (Atlas|Fields|Vault|Wilds|Flame|Chamber|Shrine|Sea|Moon|Gate|Ledger)$/u, ''),
    worldName
  }));
}

function getRealmById(id) {
  return realms.find((realm) => realm.id === id) || realms[0];
}

function retrieveMemory({ message, state = {}, runtimeMemory = {}, activeRealmId }) {
  const query = message || '';
  const notes = safeArray(state.notes).map((item) => ({ ...item, kind: 'note', text: textOf(item) }));
  const quests = safeArray(state.quests).map((item) => ({ ...item, kind: item.done ? 'proof' : 'quest', text: textOf(item) }));
  const goals = safeArray(state.goals).map((item) => ({ ...item, kind: 'goal', text: textOf(item) }));
  const brain = safeArray(state.brainMemory).map((item) => ({ ...item, kind: 'brainMemory', text: textOf(item) }));
  const facts = safeArray(runtimeMemory.facts).map((item) => ({ ...item, kind: `service:${item.type || 'fact'}`, text: item.text }));
  const exchanges = safeArray(runtimeMemory.exchanges).map((item) => ({ ...item, kind: 'service:exchange', text: `${item.command} ${item.response}` }));
  const candidates = [...notes, ...quests, ...goals, ...brain, ...facts, ...exchanges];
  return candidates
    .map((item) => {
      const realmBoost = activeRealmId && item.realm === activeRealmId ? 2 : 0;
      const doneBoost = item.kind === 'quest' ? 1 : 0;
      return { ...item, score: scoreText(query, item.text) + realmBoost + doneBoost };
    })
    .filter((item) => item.score > 0 || ['quest', 'goal', 'note', 'service:fact'].includes(item.kind))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((item) => ({
      kind: item.kind,
      id: item.id || '',
      realm: item.realm || '',
      text: String(item.text || '').slice(0, 420),
      score: item.score
    }));
}

function compactWorldState(payload, runtimeMemory, neuralStatus) {
  const state = payload.state || {};
  const stats = payload.stats || {};
  const selectedRealm = payload.selectedRealm || getRealmById(payload.selectedRealmId || 'craft');
  const activeGate = payload.activeGate || {};
  const activeNeuralLane = payload.activeNeuralLane || getNeuralSpaceLane(payload.neuralLaneId || 'chat');
  const activeGrayScapeModule = payload.activeGrayScapeModule || getGrayScapeModule(payload.grayScapeModuleId || 'nexus');
  const openQuests = safeArray(state.quests).filter((quest) => !quest.done);
  const priorityQuest = openQuests.find((quest) => quest.realm === selectedRealm.id) || openQuests[0] || null;
  const recentProofs = safeArray(state.quests).filter((quest) => quest.done).slice(0, 5);
  const recentNotes = safeArray(state.notes).slice(0, 8);
  const activeGoals = safeArray(state.goals).filter((goal) => goal.status !== 'complete').slice(0, 8);
  const retrieved = retrieveMemory({
    message: payload.message,
    state,
    runtimeMemory,
    activeRealmId: selectedRealm.id
  });

  return {
    profile: {
      name: state.profile?.name || 'World Forger',
      worldName: state.profile?.worldName || 'New Earth Prime',
      vesselName: getVesselName(state),
      primeIntention: state.profile?.primeIntention || ''
    },
    target: payload.target || detectBrainTarget(payload.message, getVesselName(state), 'vessel'),
    selectedRealm,
    activeGate,
    activeNeuralLane,
    availableRealms: realms.map(({ id, name, promise, starterGoal }) => ({ id, name, promise, starterGoal })),
    availableGates: buildGameGates(),
    availableNeuralLanes: neuralSpaceLanes.map(({ id, label, gameplay, keywords }) => ({ id, label, gameplay, keywords })),
    activeGrayScapeModule,
    availableGrayScapeModules: grayScapeModules.map(({ id, label, gameplay, keywords }) => ({ id, label, gameplay, keywords })),
    grayScapeSignal: payload.grayScapeSignal || { online: false },
    stats,
    priorityQuest,
    openQuestCount: openQuests.length,
    activeGoals,
    recentNotes,
    recentProofs,
    retrieved,
    neuralStatus,
    recentBrainMemory: safeArray(state.brainMemory).slice(0, 8),
    serviceFacts: safeArray(runtimeMemory.facts).slice(0, 12)
  };
}

function systemPrompt() {
  return [
    'You are Auren, an embodied energy-vessel assistant living above Overearth.',
    'You are not a generic chatbot. You are a game companion, world brain, and operator assistant.',
    'You must be direct, adaptive, warm, and non-repetitive. Never loop the same sentence.',
    'Read the supplied world state, memory, active realm, quest/proof state, and NeuralSpace runtime before answering.',
    'For most replies, use this shape: what I see, what I would do next, where I can route you.',
    'When the user criticizes you for being dumb/repetitive, acknowledge it and self-correct using current state.',
    'Do not claim real provider execution, deployment, medical/legal/financial certainty, or external actions unless an action is returned.',
    'Return strict JSON only. No markdown. No extra keys.',
    'Available action types include capture_note, sync_neural_runtime, open_neural_lane, neural_research, neural_build, open_grayscape_module, grayscape_task, grayscape_journal, grayscape_sync, travel_realm, travel_gate, generate_mission, seal_quest, ritual_pulse, focus_pulse, rename_vessel, recommend_next, summarize_memory, explain_capabilities, self_correct, none.',
    'Only include actions that the app should actually execute.'
  ].join('\n');
}

function userPrompt({ message, world }) {
  return JSON.stringify({
    userMessage: message,
    world,
    requiredJsonShape: responseSchema
  });
}

function parseJsonText(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('empty-model-response');
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('invalid-json-model-response');
  }
}

function extractResponsesText(payload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of safeArray(payload.output)) {
    for (const content of safeArray(item.content)) {
      if (content.type === 'output_text' || content.type === 'text') chunks.push(content.text);
    }
  }
  return chunks.filter(Boolean).join('\n');
}

function normalizeBrainPayload(candidate, fallbackTarget = 'vessel') {
  const firstAction = safeArray(candidate.actions)[0];
  return {
    target: candidate.target === 'overearth' ? 'overearth' : fallbackTarget,
    response: String(candidate.response || '').trim() || 'I am online, but my response came back empty. Ask me again with one clean command.',
    actions: safeArray(candidate.actions).map((action) => ({
      type: action.type || 'none',
      payload: action.payload && typeof action.payload === 'object' ? action.payload : {},
      reason: String(action.reason || '').trim()
    })),
    action: firstAction?.type || 'none',
    payload: firstAction?.payload || {},
    memoryWrites: safeArray(candidate.memoryWrites).map((item) => ({
      type: item.type || 'note',
      text: String(item.text || '').trim()
    })).filter((item) => item.text),
    mood: String(candidate.mood || 'focused'),
    confidence: Number.isFinite(candidate.confidence) ? candidate.confidence : 0.6
  };
}

async function callOpenAIResponses({ message, world, config }) {
  const response = await fetch(`${config.openaiBaseUrl.replace(/\/$/u, '')}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: config.openaiModel,
      input: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPrompt({ message, world }) }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'auren_brain_response',
          strict: false,
          schema: responseSchema
        }
      }
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `openai-responses-${response.status}`);
  return parseJsonText(extractResponsesText(payload));
}

async function callOpenAIChat({ message, world, config, baseUrl, apiKey, model }) {
  const response = await fetch(`${baseUrl.replace(/\/$/u, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPrompt({ message, world }) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.74
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `openai-chat-${response.status}`);
  return parseJsonText(payload.choices?.[0]?.message?.content || '');
}

async function callOllama({ message, world, config }) {
  const response = await fetch(`${config.ollamaBaseUrl.replace(/\/$/u, '')}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPrompt({ message, world }) }
      ],
      options: { temperature: 0.74 }
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `ollama-${response.status}`);
  return parseJsonText(payload.message?.content || payload.response || '');
}

async function getNeuralStatus(config) {
  try {
    const response = await fetch(`${config.neuralRuntimeUrl.replace(/\/$/u, '')}/health`, { signal: AbortSignal.timeout(1200) });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error('neural-offline');
    return {
      online: true,
      mode: payload.mode || payload.workerMode || 'local-runtime',
      summary: payload.runtimeSummary || {
        projectCount: payload.projectCount,
        queueDepth: payload.queueDepth,
        handoffPackCount: payload.handoffPackCount
      }
    };
  } catch {
    return { online: false, mode: 'offline', summary: {} };
  }
}

function localFallback(payload, world) {
  const state = payload.state || {};
  const target = payload.target || world.target || detectBrainTarget(payload.message, getVesselName(state), 'vessel');
  const result = createBrainResponse({
    transcript: payload.message,
    target,
    state,
    stats: payload.stats || {},
    selectedRealm: world.selectedRealm,
    activeGate: world.activeGate,
    gates: buildGameGates(),
    realms,
    vesselName: getVesselName(state),
    activeNeuralLane: world.activeNeuralLane,
    neuralRuntime: world.neuralStatus,
    activeGrayScapeModule: world.activeGrayScapeModule,
    grayScapeSignal: world.grayScapeSignal
  });
  return {
    ...result,
    actions: result.action && result.action !== 'none'
      ? [{ type: result.action, payload: result.payload || {}, reason: 'onboard gate action' }]
      : [],
    memoryWrites: [],
    mood: 'local',
    confidence: 0.48
  };
}

async function resolveBrain(payload, config) {
  const runtimeMemory = await ensureMemory();
  const neuralStatus = await getNeuralStatus(config);
  const world = compactWorldState(payload, runtimeMemory, neuralStatus);
  const failures = [];
  let provider = 'local';
  let raw;

  if (process.env.OPENAI_API_KEY) {
    try {
      provider = `openai:${config.openaiMode}`;
      raw = config.openaiMode === 'chat'
        ? await callOpenAIChat({ message: payload.message, world, config, baseUrl: config.openaiBaseUrl, apiKey: process.env.OPENAI_API_KEY, model: config.openaiModel })
        : await callOpenAIResponses({ message: payload.message, world, config });
    } catch (error) {
      failures.push({ provider, error: error.message });
      try {
        provider = 'openai:chat-fallback';
        raw = await callOpenAIChat({ message: payload.message, world, config, baseUrl: config.openaiBaseUrl, apiKey: process.env.OPENAI_API_KEY, model: config.openaiModel });
      } catch (chatError) {
        failures.push({ provider, error: chatError.message });
      }
    }
  }

  if (!raw && config.compatBaseUrl && config.compatModel) {
    try {
      provider = 'openai-compatible';
      raw = await callOpenAIChat({ message: payload.message, world, config, baseUrl: config.compatBaseUrl, apiKey: config.compatApiKey, model: config.compatModel });
    } catch (error) {
      failures.push({ provider, error: error.message });
    }
  }

  if (!raw && config.ollamaModel) {
    try {
      provider = 'ollama';
      raw = await callOllama({ message: payload.message, world, config });
    } catch (error) {
      failures.push({ provider, error: error.message });
    }
  }

  if (!raw) {
    provider = 'local-fallback';
    raw = localFallback(payload, world);
  }

  const normalized = normalizeBrainPayload(raw, world.target);
  const exchange = {
    id: `auren_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: publicProviderLabel(),
    gate: publicGatePayload(provider),
    command: payload.message,
    response: normalized.response,
    actions: normalized.actions,
    target: normalized.target,
    createdAt: new Date().toISOString()
  };
  const facts = [
    ...runtimeMemory.facts,
    ...normalized.memoryWrites.map((item) => ({
      id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...item,
      createdAt: new Date().toISOString()
    }))
  ].slice(-180);
  await writeMemory({
    exchanges: [exchange, ...runtimeMemory.exchanges].slice(0, 240),
    facts,
    updatedAt: exchange.createdAt
  });

  return {
    ok: true,
    provider: publicProviderLabel(),
    gate: publicGatePayload(provider),
    ...normalized,
    retrieved: world.retrieved,
    neuralStatus,
    failures: publicFailures(failures)
  };
}

async function handleSpeech(body, config) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, status: 501, error: 'company-gate-voice-key-required' };
  }
  const text = String(body.text || '').trim();
  if (!text) return { ok: false, status: 400, error: 'text-required' };
  const response = await fetch(`${config.openaiBaseUrl.replace(/\/$/u, '')}/audio/speech`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: config.ttsModel,
      voice: body.voice || config.ttsVoice,
      input: text.slice(0, 2000),
      response_format: 'mp3'
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, status: response.status, error: detail || `tts-${response.status}` };
  }
  return {
    ok: true,
    contentType: response.headers.get('content-type') || 'audio/mpeg',
    buffer: Buffer.from(await response.arrayBuffer())
  };
}

async function handleTranscribe(body, config) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, status: 501, error: 'company-gate-voice-key-required' };
  }
  const audioBase64 = String(body.audioBase64 || '').trim();
  if (!audioBase64) return { ok: false, status: 400, error: 'audio-required' };
  const mimeType = body.mimeType || 'audio/webm';
  const extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3' : 'webm';
  const audio = Buffer.from(audioBase64, 'base64');
  const form = new FormData();
  form.set('model', body.model || config.sttModel);
  form.set('file', new Blob([audio], { type: mimeType }), `auren-input.${extension}`);
  const response = await fetch(`${config.openaiBaseUrl.replace(/\/$/u, '')}/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form
  });
  const payload = await response.json();
  if (!response.ok) return { ok: false, status: response.status, error: payload.error?.message || `stt-${response.status}` };
  return { ok: true, text: payload.text || payload.output_text || '' };
}

async function statusPayload(config) {
  const memory = await ensureMemory();
  const neuralStatus = await getNeuralStatus(config);
  return {
    ok: true,
    gate: publicGatePayload(
      process.env.OPENAI_API_KEY || (config.compatBaseUrl && config.compatModel) || config.ollamaModel
        ? 'private-engine'
        : 'local-fallback'
    ),
    providerOrder: [publicProviderLabel()],
    voice: {
      tts: Boolean(process.env.OPENAI_API_KEY),
      stt: Boolean(process.env.OPENAI_API_KEY),
      ttsModel: config.ttsModel,
      sttModel: config.sttModel
    },
    memory: {
      exchanges: memory.exchanges.length,
      facts: memory.facts.length,
      path: memoryPath
    },
    neuralStatus
  };
}

export function createAurenBrainServer(options = {}) {
  const config = { ...defaultProviderConfig, ...options };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    try {
      if (req.method === 'GET' && url.pathname === '/api/auren/status') {
        json(res, 200, await statusPayload(config));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auren/chat') {
        const body = await readJsonBody(req);
        if (!String(body.message || '').trim()) {
          json(res, 400, { ok: false, error: 'message-required' });
          return;
        }
        json(res, 200, await resolveBrain(body, config));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auren/speech') {
        const result = await handleSpeech(await readJsonBody(req), config);
        if (!result.ok) json(res, result.status || 500, result);
        else binary(res, 200, result.buffer, result.contentType);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/auren/transcribe') {
        const result = await handleTranscribe(await readJsonBody(req), config);
        json(res, result.ok ? 200 : result.status || 500, result);
        return;
      }
      json(res, 404, { ok: false, error: 'not-found', path: url.pathname });
    } catch (error) {
      json(res, error.message === 'request-too-large' ? 413 : 500, { ok: false, error: error.message });
    }
  });
  return { server, config };
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const host = process.env.AUREN_BRAIN_HOST || '127.0.0.1';
  const port = Number(process.env.AUREN_BRAIN_PORT || 4130);
  const { server, config } = createAurenBrainServer();
  server.listen(port, host, () => {
    console.log(JSON.stringify({
      ok: true,
      app: 'AurenBrain',
      url: `http://${host}:${port}`,
      gate: publicGatePayload(
        process.env.OPENAI_API_KEY || (config.compatBaseUrl && config.compatModel) || config.ollamaModel
          ? 'private-engine'
          : 'local-fallback'
      ),
      memoryPath
    }));
  });
}
