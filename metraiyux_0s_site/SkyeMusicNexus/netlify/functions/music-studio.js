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
const { requireSkyGate } = require("./_lib/skygate-auth");

const MUSIC_NEXUS_DIR =
  process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), "skye-music-nexus");
const LEDGER_PATH = path.join(MUSIC_NEXUS_DIR, "studio-ledger.json");

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

function readLedger() {
  try {
    if (!fs.existsSync(LEDGER_PATH)) {
      return { projects: [], exports: [], engines: [] };
    }

    return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
  } catch (error) {
    return { projects: [], exports: [], engines: [], readError: error.message };
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
      engines: ledger.engines
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

  if (action === "queueExport") {
    const exportJob = queueExport(ledger, body);
    writeLedger(ledger);

    return json(200, {
      ok: true,
      status: "EXPORT_MANIFEST_QUEUED",
      exportJob
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
