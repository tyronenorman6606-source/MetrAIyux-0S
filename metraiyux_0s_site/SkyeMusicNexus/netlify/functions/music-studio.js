// SkyeMusicNexus Native Creation Studio function
// CommonJS Netlify Function, proof-safe by default.
//
// Responsibilities:
// - Require a gate/session token.
// - Save/load creation project metadata.
// - Queue export manifests.
// - Generate Release Forge handoff lines.
// - Record native creation modules; do not claim DSP distribution, legal review, or real payout movement.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { requireSkyGate } = require("./_lib/skygate-auth");

const MUSIC_NEXUS_DIR =
  process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), "skye-music-nexus");
const LEDGER_PATH = path.join(MUSIC_NEXUS_DIR, "studio-ledger.json");
const KAIXU_DAW_MODEL_ALIASES = new Set(["kaixu-6.7-nano", "kaixu-6.7-mini", "kaixu-6.7", "kaixu-6.7-pro", "kaixu-6.7-max"]);
const DAW_ASSISTANT_DAILY_LIMITS = Object.freeze({
  "free-beta": 24,
  "artist-pro": 72,
  label: 160,
  "owner-review": 240
});

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function readBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (error) {
    return {};
  }
}

function normalizeLedger(ledger) {
  const next = ledger && typeof ledger === "object" ? ledger : {};
  for (const key of ["projects", "exports", "engines", "assistantRuns", "aiUsage"]) {
    if (!Array.isArray(next[key])) next[key] = [];
  }
  return next;
}

function readLedger() {
  try {
    if (!fs.existsSync(LEDGER_PATH)) {
      return normalizeLedger({});
    }

    return normalizeLedger(JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8")));
  } catch (error) {
    return normalizeLedger({ readError: error.message });
  }
}

function writeLedger(ledger) {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

function upsertProject(ledger, project) {
  const next = {
    ...project,
    id: project.id || `studio_${Date.now()}`,
    updatedAt: new Date().toISOString()
  };

  ledger.projects = [next, ...ledger.projects.filter((item) => item.id !== next.id)].slice(0, 250);
  return next;
}

function queueExport(ledger, payload) {
  const project = payload.project || {};
  const exportJob = {
    id: `studio_export_${Date.now()}`,
    projectId: project.id || payload.projectId || "unknown_project",
    artistId: project.artistId || payload.artistId || "unknown_artist",
    releaseId: project.releaseId || payload.releaseId || "unknown_release",
    exportTargets: payload.exportTargets || ["mp3-preview", "wav-master"],
    releaseForgeLine: payload.releaseForgeLine || null,
    status: "queued_proof_export",
    boundary: "This queues an export manifest. Wire ffmpeg/audio worker for real transcoding.",
    createdAt: new Date().toISOString()
  };

  ledger.exports = [exportJob, ...ledger.exports].slice(0, 250);
  return exportJob;
}

function cleanText(value, fallback = "", max = 600) {
  const text = String(value == null ? "" : value).trim();
  return (text || fallback).slice(0, max);
}

function dayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function actorHash(event) {
  const headers = event.headers || {};
  const raw = headers.authorization || headers.Authorization || headers["x-skye-gate-session"] || headers["x-free99-gate-session"] || "gate-session";
  return crypto.createHash("sha256").update(String(raw)).digest("hex").slice(0, 18);
}

function dawAssistantPolicy() {
  return {
    modelFamily: "kAIxU",
    exposedModels: Array.from(KAIXU_DAW_MODEL_ALIASES),
    rawProviderModelsExposed: false,
    providerHooksCallableFromDaw: false,
    providerCalledByAssistant: false,
    dailyLimits: DAW_ASSISTANT_DAILY_LIMITS,
    billingRule: "Paid/live generation must be queued through approved kAIxU packages or owner review; the DAW assistant only writes planning receipts."
  };
}

function rateLimitDawAssistant(ledger, event, body) {
  const actor = actorHash(event);
  const day = dayStamp();
  const budgetTier = Object.prototype.hasOwnProperty.call(DAW_ASSISTANT_DAILY_LIMITS, body.budgetTier)
    ? body.budgetTier
    : "free-beta";
  const limit = DAW_ASSISTANT_DAILY_LIMITS[budgetTier];
  ledger.aiUsage = ledger.aiUsage.filter((row) => row && row.day === day).slice(0, 500);
  const used = ledger.aiUsage.filter((row) => row.actor === actor && row.action === "dawAssistant").length;
  if (used >= limit) {
    return {
      ok: false,
      actor,
      day,
      budgetTier,
      limit,
      used,
      remaining: 0
    };
  }
  const receipt = {
    id: `daw_ai_use_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    actor,
    day,
    action: "dawAssistant",
    budgetTier,
    modelAlias: cleanText(body.modelAlias || body.modelId || "kaixu-6.7-nano", "kaixu-6.7-nano", 80),
    at: new Date().toISOString()
  };
  ledger.aiUsage.unshift(receipt);
  return { ok: true, actor, day, budgetTier, limit, used: used + 1, remaining: Math.max(0, limit - used - 1), receipt };
}

function buildDawAssistant(body, rateLimit) {
  const project = body.project || {};
  const requestedAlias = cleanText(body.modelAlias || body.modelId || body.model || "kaixu-6.7-nano", "kaixu-6.7-nano", 80);
  const modelAlias = KAIXU_DAW_MODEL_ALIASES.has(requestedAlias) ? requestedAlias : "kaixu-6.7-nano";
  const task = cleanText(body.task || "arrangement", "arrangement", 120);
  const tracks = Array.isArray(project.tracks) ? project.tracks : [];
  const timeline = project.timeline || {};
  const beats = Math.max(16, Math.min(1024, Number(timeline.beats || 16) || 16));
  const targetTracks = tracks.length ? tracks.slice().sort((a, b) => (a.regions || []).length - (b.regions || []).length).slice(0, 3) : [];
  const regionSuggestions = targetTracks.map((track, index) => ({
    trackId: track.id || `track_${index + 1}`,
    name: task === "mix-notes" ? `${track.name || "Track"} reference balance` : `${track.name || "Track"} kAIxU section`,
    start: Math.min(beats - 1, (index + 1) * 4),
    length: Math.min(8, beats)
  }));
  return {
    id: `daw_assist_${Date.now()}`,
    task,
    modelAlias,
    modelFamily: "kAIxU",
    title: cleanText(project.title || "Nexus native session", "Nexus native session", 220),
    summary: `${modelAlias} prepared a DAW ${task} pass for ${cleanText(project.title || "Nexus native session", "Nexus native session", 160)}.`,
    arrangementActions: [
      `Timeline: ${timeline.bars || Math.ceil(beats / 4)} bars / ${project.tempoKey || "tempo unset"}.`,
      "Promote imported audio to music-assets before release handoff.",
      "Keep every queued export tied to Release Forge and rights review.",
      "Use kAIxU model aliases only; private provider routing stays hidden behind the shared 0S gate."
    ],
    mixActions: [
      "Use pan plus gain before any heavy processing request.",
      "Render a stereo browser WAV for review, then queue paid/offline exports for masters and stems."
    ],
    exportActions: [
      "Queue WAV master, MP3 preview, stem archive, and Release Forge line together.",
      "Do not dispatch live provider generation from DAW controls; use paid package or owner-review lanes."
    ],
    regionSuggestions,
    promptEcho: cleanText(body.prompt || "", "", 800),
    rateLimit,
    hiddenProviderRouting: true,
    providerCalled: false,
    rawModelExposed: false,
    secretValuesReturned: false,
    createdAt: new Date().toISOString()
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod === "GET") {
    const gateResponse = requireSkyGate(event, { roles: ["admin", "artist"] });
    if (gateResponse) return gateResponse;

    const ledger = readLedger();
    return json(200, {
      ok: true,
      projects: ledger.projects,
      exports: ledger.exports,
      engines: ledger.engines,
      assistantRuns: ledger.assistantRuns,
      assistantPolicy: dawAssistantPolicy()
    });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const gateResponse = requireSkyGate(event, { roles: ["admin", "artist"] });
  if (gateResponse) return gateResponse;

  const body = readBody(event);
  const action = body.action || "saveProject";
  const ledger = readLedger();

  if (action === "saveProject") {
    const project = upsertProject(ledger, body.project || body);
    writeLedger(ledger);

    return json(200, {
      ok: true,
      status: "STUDIO_PROJECT_SAVED",
      project
    });
  }

  if (action === "queueExport" || action === "queueDawExport") {
    const exportJob = queueExport(ledger, body);
    writeLedger(ledger);

    return json(200, {
      ok: true,
      status: "EXPORT_MANIFEST_QUEUED",
      exportJob
    });
  }

  if (action === "dawAssistant" || action === "assistantSuggest") {
    const rateLimit = rateLimitDawAssistant(ledger, event, body);
    if (!rateLimit.ok) {
      writeLedger(ledger);
      return json(429, {
        ok: false,
        error: "DAW kAIxU assistant daily limit reached.",
        rateLimit,
        assistantPolicy: dawAssistantPolicy()
      });
    }
    const assist = buildDawAssistant(body, rateLimit);
    ledger.assistantRuns = [assist, ...ledger.assistantRuns].slice(0, 250);
    writeLedger(ledger);
    return json(200, {
      ok: true,
      status: "DAW_KAIXU_ASSIST_READY",
      assist,
      rateLimit,
      assistantPolicy: dawAssistantPolicy()
    });
  }

  if (action === "registerEngine") {
    const engine = {
      id: body.id || `engine_${Date.now()}`,
      name: body.name,
      license: body.license,
      repo: body.repo,
      mode: body.mode,
      registeredAt: new Date().toISOString()
    };

    ledger.engines = [engine, ...ledger.engines.filter((item) => item.name !== engine.name)].slice(0, 50);
    writeLedger(ledger);

    return json(200, {
      ok: true,
      status: "ENGINE_REGISTERED",
      engine
    });
  }

  return json(400, {
    ok: false,
    error: `Unknown studio action: ${action}`
  });
};
