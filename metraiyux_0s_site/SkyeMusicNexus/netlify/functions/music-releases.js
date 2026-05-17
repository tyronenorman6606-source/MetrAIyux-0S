'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const MUSIC_NEXUS_DIR =
  process.env.MUSIC_NEXUS_DATA_DIR || path.join(os.tmpdir(), 'skye-music-nexus');

function releasesFile() {
  return path.join(MUSIC_NEXUS_DIR, 'releases.json');
}

function ensureFile(filePath, defaultValue) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2) + '\n', 'utf8');
  }
}

function loadReleases() {
  const file = releasesFile();
  ensureFile(file, []);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveReleases(releases) {
  const file = releasesFile();
  ensureFile(file, []);
  fs.writeFileSync(file, JSON.stringify(releases, null, 2) + '\n', 'utf8');
}

function makeId() {
  return crypto.randomBytes(8).toString('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeWorkflowStatus(value) {
  const next = String(value || '').trim().toLowerCase();
  const allowed = ['draft', 'ready', 'scheduled', 'dispatched', 'blocked', 'completed'];
  return allowed.includes(next) ? next : 'draft';
}

function normalizeTargets(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function inferWorkflowTargets(release) {
  const base = [];
  const targets = Array.isArray(release.distributionTargets) ? release.distributionTargets : [];
  if (targets.length) base.push('AE-FlowPro');
  if ((release.analytics && Number(release.analytics.streams || 0) > 0) || release.status === 'live') {
    base.push('SkyeProofx');
    base.push('skyeroutex-workforce-command-v0.4.0');
  }
  if (release.type === 'album' || release.type === 'ep') {
    base.push('SkyeWebCreatorMax');
  }
  return [...new Set(base)];
}

function makeOperationsWorkflow(release, payload = {}) {
  const status = normalizeWorkflowStatus(payload.status);
  return {
    id: payload.workflowId ? String(payload.workflowId) : `ops_${makeId()}`,
    queuedAt: nowIso(),
    updatedAt: nowIso(),
    status,
    owner: payload.owner ? String(payload.owner).trim() : '',
    checkpoint: payload.checkpoint ? String(payload.checkpoint).trim() : 'intake',
    notes: payload.notes ? String(payload.notes).trim() : '',
    targets: normalizeTargets(payload.targets).length ? normalizeTargets(payload.targets) : inferWorkflowTargets(release),
    steps: {
      queued: true,
      scheduled: status === 'scheduled' || status === 'dispatched' || status === 'completed',
      dispatched: status === 'dispatched' || status === 'completed',
      blocked: status === 'blocked',
      completed: status === 'completed',
    },
  };
}

function summarizeOperationsBoard(releases) {
  const workflows = releases
    .filter((release) => release.operationsWorkflow)
    .map((release) => ({
      releaseId: release.id,
      title: release.title,
      artistId: release.artistId,
      releaseStatus: release.status,
      type: release.type,
      analytics: release.analytics || { streams: 0, downloads: 0, saves: 0 },
      workflow: release.operationsWorkflow,
    }));

  const summary = {
    total: workflows.length,
    draft: 0,
    ready: 0,
    scheduled: 0,
    dispatched: 0,
    blocked: 0,
    completed: 0,
    liveReleases: 0,
  };

  for (const item of workflows) {
    if (summary[item.workflow.status] !== undefined) summary[item.workflow.status] += 1;
    if (item.releaseStatus === 'live') summary.liveReleases += 1;
  }

  workflows.sort((left, right) => {
    const leftTime = Date.parse(left.workflow.updatedAt || left.workflow.queuedAt || 0);
    const rightTime = Date.parse(right.workflow.updatedAt || right.workflow.queuedAt || 0);
    return rightTime - leftTime;
  });

  return { summary, workflows };
}

function summarizeWorkflowEventType(event) {
  const category = String(event?.category || '').trim().toLowerCase();
  if (['submission', 'review', 'publish', 'analytics', 'operations'].includes(category)) {
    return category;
  }
  return 'activity';
}

function appendWorkflowEvent(release, category, detail = {}) {
  const timeline = Array.isArray(release.workflowTimeline) ? release.workflowTimeline.slice() : [];
  timeline.push({
    id: `evt_${makeId()}`,
    category: summarizeWorkflowEventType({ category }),
    at: nowIso(),
    note: detail.note ? String(detail.note).trim() : '',
    outcome: detail.outcome ? String(detail.outcome).trim() : '',
    actor: detail.actor ? String(detail.actor).trim() : '',
    status: detail.status ? String(detail.status).trim() : '',
  });
  release.workflowTimeline = timeline.slice(-100);
  return release;
}

function handleWorkflowTimeline(params) {
  const releases = loadReleases();
  const releaseId = params.id ? String(params.id).trim() : '';
  const limit = Math.max(1, Math.min(100, Number.parseInt(String(params.limit || '25'), 10) || 25));
  const events = [];

  for (const release of releases) {
    if (releaseId && release.id !== releaseId) continue;
    const timeline = Array.isArray(release.workflowTimeline) ? release.workflowTimeline : [];
    for (const event of timeline) {
      const category = summarizeWorkflowEventType(event);
      if (category === 'activity') continue;
      events.push({
        id: event.id || `evt_${makeId()}`,
        releaseId: release.id,
        title: release.title,
        artistId: release.artistId,
        releaseStatus: release.status,
        category,
        note: String(event.note || '').trim(),
        outcome: String(event.outcome || '').trim(),
        actor: String(event.actor || '').trim(),
        status: String(event.status || '').trim(),
        at: event.at || release.updatedAt || release.publishedAt || release.submittedAt || nowIso(),
      });
    }
  }

  events.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
  const timeline = events.slice(0, limit);
  const summary = {
    total: events.length,
    submission: events.filter((item) => item.category === 'submission').length,
    review: events.filter((item) => item.category === 'review').length,
    publish: events.filter((item) => item.category === 'publish').length,
    analytics: events.filter((item) => item.category === 'analytics').length,
    operations: events.filter((item) => item.category === 'operations').length,
  };

  return respond(200, { ok: true, timeline, summary, generatedAt: nowIso() });
}

// ---------------------------------------------------------------------------
// JSON response helper
// ---------------------------------------------------------------------------

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Action: submit release
// ---------------------------------------------------------------------------

function handleSubmit(payload) {
  const { artistId, title, type, tracks, releaseDate, distributionTargets } = payload;

  if (!artistId || !title || !type) {
    return respond(400, { ok: false, error: 'artistId, title, and type are required' });
  }

  const validTypes = ['single', 'ep', 'album'];
  if (!validTypes.includes(type)) {
    return respond(400, { ok: false, error: `type must be one of: ${validTypes.join(', ')}` });
  }

  const releases = loadReleases();

  const release = {
    id: makeId(),
    artistId: String(artistId).trim(),
    title: String(title).trim(),
    type,
    tracks: Array.isArray(tracks)
      ? tracks.map((t) => ({
          title: String(t.title || '').trim(),
          duration: t.duration !== undefined ? t.duration : null,
        }))
      : [],
    releaseDate: releaseDate ? String(releaseDate) : null,
    distributionTargets: Array.isArray(distributionTargets) ? distributionTargets : [],
    status: 'submitted',
    analytics: { streams: 0, downloads: 0, saves: 0 },
    submittedAt: nowIso(),
    publishedAt: null,
    workflowTimeline: [],
  };

  appendWorkflowEvent(release, 'submission', {
    outcome: 'submitted',
    status: release.status,
    note: `Release submitted for ${release.type} distribution review`,
    actor: release.artistId,
  });

  releases.push(release);
  saveReleases(releases);

  return respond(201, { ok: true, release });
}

// ---------------------------------------------------------------------------
// Action: list releases
// ---------------------------------------------------------------------------

function handleList(params) {
  let releases = loadReleases();

  const artistId = params.artistId ? params.artistId.trim() : '';
  const status = params.status ? params.status.trim() : '';

  if (artistId) {
    releases = releases.filter((r) => r.artistId === artistId);
  }

  if (status) {
    releases = releases.filter((r) => r.status === status);
  }

  return respond(200, { ok: true, releases, total: releases.length });
}

// ---------------------------------------------------------------------------
// Action: get release
// ---------------------------------------------------------------------------

function handleGet(params) {
  const { id } = params;
  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const releases = loadReleases();
  const release = releases.find((r) => r.id === id);
  if (!release) {
    return respond(404, { ok: false, error: 'Release not found' });
  }

  return respond(200, { ok: true, release });
}

// ---------------------------------------------------------------------------
// Action: review release
// ---------------------------------------------------------------------------

function handleReview(payload, params) {
  const id = (payload && payload.id) || (params && params.id);
  const decision = (payload && payload.decision) || (params && params.decision);
  const notes = (payload && payload.notes) || '';

  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  if (!decision || !['approve', 'reject'].includes(decision)) {
    return respond(400, { ok: false, error: 'decision must be "approve" or "reject"' });
  }

  const releases = loadReleases();
  const idx = releases.findIndex((r) => r.id === id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Release not found' });
  }

  releases[idx].status = decision === 'approve' ? 'approved' : 'rejected';
  releases[idx].reviewNotes = notes ? String(notes) : '';
  releases[idx].reviewedAt = nowIso();
  appendWorkflowEvent(releases[idx], 'review', {
    outcome: decision,
    status: releases[idx].status,
    note: notes ? String(notes) : `Release ${decision}d by operator`,
  });

  saveReleases(releases);

  return respond(200, { ok: true, release: releases[idx] });
}

// ---------------------------------------------------------------------------
// Action: publish release
// ---------------------------------------------------------------------------

function handlePublish(payload, params) {
  const id = (payload && payload.id) || (params && params.id);

  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const releases = loadReleases();
  const idx = releases.findIndex((r) => r.id === id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Release not found' });
  }

  if (releases[idx].status !== 'approved') {
    return respond(409, {
      ok: false,
      error: `Release must be in "approved" status before publishing (current: "${releases[idx].status}")`,
    });
  }

  releases[idx].status = 'live';
  releases[idx].publishedAt = nowIso();
  appendWorkflowEvent(releases[idx], 'publish', {
    outcome: 'published',
    status: releases[idx].status,
    note: 'Release moved live and distribution workflow can continue downstream',
  });

  saveReleases(releases);

  return respond(200, { ok: true, release: releases[idx] });
}

// ---------------------------------------------------------------------------
// Action: report-streams
// ---------------------------------------------------------------------------

function handleReportStreams(payload, params) {
  const id = (payload && payload.id) || (params && params.id);

  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const releases = loadReleases();
  const idx = releases.findIndex((r) => r.id === id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Release not found' });
  }

  const { streams, downloads, saves } = payload || {};

  const analytics = releases[idx].analytics || { streams: 0, downloads: 0, saves: 0 };

  if (streams !== undefined && !isNaN(Number(streams))) {
    analytics.streams = (analytics.streams || 0) + Number(streams);
  }
  if (downloads !== undefined && !isNaN(Number(downloads))) {
    analytics.downloads = (analytics.downloads || 0) + Number(downloads);
  }
  if (saves !== undefined && !isNaN(Number(saves))) {
    analytics.saves = (analytics.saves || 0) + Number(saves);
  }

  releases[idx].analytics = analytics;
  releases[idx].lastStreamReport = nowIso();
  appendWorkflowEvent(releases[idx], 'analytics', {
    outcome: 'stream-report',
    status: releases[idx].status,
    note: `Streams +${Number(streams || 0) || 0}, downloads +${Number(downloads || 0) || 0}, saves +${Number(saves || 0) || 0}`,
  });

  saveReleases(releases);

  return respond(200, { ok: true, release: releases[idx] });
}

function handleOperationsBoard(params) {
  const releases = loadReleases();
  let { workflows, summary } = summarizeOperationsBoard(releases);
  const status = params.status ? String(params.status).trim().toLowerCase() : '';
  if (status) {
    workflows = workflows.filter((item) => item.workflow.status === status);
    summary = {
      ...summary,
      total: workflows.length,
    };
  }
  return respond(200, { ok: true, ...summary, workflows });
}

function handleQueueOperations(payload, params) {
  const id = (payload && payload.id) || (params && params.id);
  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const releases = loadReleases();
  const idx = releases.findIndex((release) => release.id === id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Release not found' });
  }

  const release = releases[idx];
  if (!['approved', 'live'].includes(release.status)) {
    return respond(409, { ok: false, error: 'Release must be approved or live before queueing operations' });
  }

  if (release.operationsWorkflow) {
    return respond(409, { ok: false, error: 'Operations workflow already exists for this release' });
  }

  release.operationsWorkflow = makeOperationsWorkflow(release, payload);
  appendWorkflowEvent(release, 'operations', {
    outcome: 'queued',
    status: release.operationsWorkflow.status,
    note: `Operations queued at ${release.operationsWorkflow.checkpoint || 'intake'}`,
    actor: release.operationsWorkflow.owner,
  });
  releases[idx] = release;
  saveReleases(releases);

  return respond(201, { ok: true, release, workflow: release.operationsWorkflow });
}

function handleUpdateOperations(payload, params) {
  const id = (payload && payload.id) || (params && params.id);
  if (!id) {
    return respond(400, { ok: false, error: 'id is required' });
  }

  const releases = loadReleases();
  const idx = releases.findIndex((release) => release.id === id);
  if (idx === -1) {
    return respond(404, { ok: false, error: 'Release not found' });
  }

  const release = releases[idx];
  if (!release.operationsWorkflow) {
    return respond(409, { ok: false, error: 'Operations workflow has not been queued for this release' });
  }

  const workflow = { ...release.operationsWorkflow };
  if (payload.owner !== undefined) workflow.owner = String(payload.owner || '').trim();
  if (payload.checkpoint !== undefined) workflow.checkpoint = String(payload.checkpoint || '').trim();
  if (payload.notes !== undefined) workflow.notes = String(payload.notes || '').trim();
  if (payload.targets !== undefined) {
    const nextTargets = normalizeTargets(payload.targets);
    workflow.targets = nextTargets.length ? nextTargets : workflow.targets;
  }
  if (payload.status !== undefined) workflow.status = normalizeWorkflowStatus(payload.status);
  workflow.updatedAt = nowIso();
  workflow.steps = {
    queued: true,
    scheduled: workflow.status === 'scheduled' || workflow.status === 'dispatched' || workflow.status === 'completed',
    dispatched: workflow.status === 'dispatched' || workflow.status === 'completed',
    blocked: workflow.status === 'blocked',
    completed: workflow.status === 'completed',
  };

  release.operationsWorkflow = workflow;
  appendWorkflowEvent(release, 'operations', {
    outcome: 'updated',
    status: workflow.status,
    note: workflow.notes || `Operations updated to ${workflow.status}`,
    actor: workflow.owner,
  });
  releases[idx] = release;
  saveReleases(releases);

  return respond(200, { ok: true, release, workflow });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

module.exports.handler = async (event) => {
  try {
    const method = (event.httpMethod || 'GET').toUpperCase();
    const params = event.queryStringParameters || {};

    if (method === 'GET') {
      const denied = requireSkyGate(event);
      if (denied) return denied;
      const action = params.action || 'list';
      if (action === 'list') return handleList(params);
      if (action === 'get') return handleGet(params);
      if (action === 'operations-board') return handleOperationsBoard(params);
      if (action === 'workflow-timeline') return handleWorkflowTimeline(params);
      return respond(400, { ok: false, error: `Unknown GET action: ${action}` });
    }

    if (method === 'POST') {
      const denied = requireSkyGate(event);
      if (denied) return denied;
      const payload = parseBody(event);
      if (payload === null) {
        return respond(400, { ok: false, error: 'Invalid JSON body' });
      }
      const action = payload.action || params.action || '';
      if (action === 'submit') return handleSubmit(payload);
      if (action === 'review') return handleReview(payload, params);
      if (action === 'publish') return handlePublish(payload, params);
      if (action === 'report-streams') return handleReportStreams(payload, params);
      if (action === 'queue-operations') return handleQueueOperations(payload, params);
      if (action === 'update-operations') return handleUpdateOperations(payload, params);
      return respond(400, { ok: false, error: `Unknown POST action: ${action}` });
    }

    return respond(405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return respond(500, { ok: false, error: err.message || 'Internal server error' });
  }
};
