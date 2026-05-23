'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const MEDIA_CENTER_DIR =
  process.env.MEDIA_CENTER_DATA_DIR || path.join(os.tmpdir(), 'skye-media-center');
const ASSETS_FILE = path.join(MEDIA_CENTER_DIR, 'assets.json');
const FILES_DIR = path.join(MEDIA_CENTER_DIR, 'files');
const WORKFLOW_EVENTS_FILE = path.join(MEDIA_CENTER_DIR, 'workflow-events.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDirs() {
  if (!fs.existsSync(MEDIA_CENTER_DIR)) fs.mkdirSync(MEDIA_CENTER_DIR, { recursive: true });
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });
}

function readAssets() {
  ensureDirs();
  if (!fs.existsSync(ASSETS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAssets(assets) {
  ensureDirs();
  fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf8');
}

function readWorkflowEvents() {
  ensureDirs();
  if (!fs.existsSync(WORKFLOW_EVENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(WORKFLOW_EVENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeWorkflowEvents(events) {
  ensureDirs();
  fs.writeFileSync(WORKFLOW_EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Skye-Gate-Session, X-Skye-Gate-Source, X-Skye-Media-Center-Free99',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

function now() {
  return new Date().toISOString();
}

const VALID_TYPES = new Set(['image', 'video', 'audio', 'document']);
const VALID_UPLOAD_STATUSES = new Set(['draft', 'published']);
const VALID_MANAGE_STATUSES = new Set(['draft', 'archived', 'published', 'scheduled', 'active']);
const VALID_REVIEW_STATUSES = new Set(['draft', 'ready', 'approved', 'blocked', 'dispatched']);
const VALID_EXECUTION_STATUSES = new Set(['queued', 'active', 'blocked', 'completed']);
const VALID_DISPATCH_STATUSES = new Set(['queued', 'scheduled', 'published', 'cancelled', 'completed', 'blocked']);

function inferMimeType(filename, fallback) {
  const lower = String(filename || '').toLowerCase();
  if (fallback) return String(fallback).trim();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function defaultReviewState() {
  return {
    status: 'draft',
    owner: '',
    checkpoint: 'intake',
    notes: '',
    updatedAt: null,
  };
}

function normalizeReviewState(review) {
  const source = review && typeof review === 'object' ? review : {};
  const status = VALID_REVIEW_STATUSES.has(String(source.status || '').toLowerCase())
    ? String(source.status).toLowerCase()
    : 'draft';
  return {
    status,
    owner: String(source.owner || '').trim(),
    checkpoint: String(source.checkpoint || (status === 'draft' ? 'intake' : status)).trim() || 'intake',
    notes: String(source.notes || '').trim(),
    updatedAt: source.updatedAt || null,
  };
}

function ensureReviewState(asset) {
  asset.review = normalizeReviewState(asset.review);
  return asset.review;
}

function defaultExecutionState() {
  return {
    status: 'queued',
    owner: '',
    checkpoint: 'publish-prep',
    notes: '',
    targets: [],
    updatedAt: null,
  };
}

function normalizeExecutionTargets(targets) {
  return Array.isArray(targets)
    ? targets
        .map((target) => String(target || '').trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
}

function normalizeExecutionState(execution) {
  const source = execution && typeof execution === 'object' ? execution : {};
  const status = VALID_EXECUTION_STATUSES.has(String(source.status || '').toLowerCase())
    ? String(source.status).toLowerCase()
    : 'queued';
  return {
    status,
    owner: String(source.owner || '').trim(),
    checkpoint: String(source.checkpoint || (status === 'completed' ? 'completed' : 'publish-prep')).trim() || 'publish-prep',
    notes: String(source.notes || '').trim(),
    targets: normalizeExecutionTargets(source.targets),
    updatedAt: source.updatedAt || null,
  };
}

function ensureExecutionState(asset) {
  asset.execution = normalizeExecutionState(asset.execution);
  return asset.execution;
}

function defaultDispatchState() {
  return {
    status: 'queued',
    owner: '',
    checkpoint: 'publish-queue',
    notes: '',
    targets: [],
    updatedAt: null,
    publishedEntryId: null,
  };
}

function normalizeDispatchState(dispatch) {
  const source = dispatch && typeof dispatch === 'object' ? dispatch : {};
  const status = VALID_DISPATCH_STATUSES.has(String(source.status || '').toLowerCase())
    ? String(source.status).toLowerCase()
    : 'queued';
  return {
    status,
    owner: String(source.owner || '').trim(),
    checkpoint: String(source.checkpoint || (status === 'published' ? 'published' : 'publish-queue')).trim() || 'publish-queue',
    notes: String(source.notes || '').trim(),
    targets: normalizeExecutionTargets(source.targets),
    updatedAt: source.updatedAt || null,
    publishedEntryId: source.publishedEntryId || null,
  };
}

function ensureDispatchState(asset) {
  asset.dispatch = normalizeDispatchState(asset.dispatch);
  return asset.dispatch;
}

function inferExecutionTargets(asset) {
  const tags = Array.isArray(asset.tags) ? asset.tags.map((tag) => String(tag || '').toLowerCase()) : [];
  const text = [
    asset.title,
    asset.description,
    asset.filename,
    ...tags,
  ].join(' ').toLowerCase();
  const targets = ['SkyeWebCreatorMax'];
  if (/\b(proof|contract|invoice|compliance|policy|evidence)\b/.test(text)) targets.push('SkyeProofx');
  if (/\b(lead|crm|campaign|sales|launch)\b/.test(text)) targets.push('SkyeLeadVault');
  if (/\b(activation|publish|release|drop|distribution)\b/.test(text)) targets.push('AE-FlowPro');
  return [...new Set(targets)].slice(0, 6);
}

function inferDispatchTargets(asset) {
  const execution = ensureExecutionState(asset);
  if (execution.targets && execution.targets.length) return execution.targets;
  return inferExecutionTargets(asset);
}

function appendWorkflowEvent(asset, event) {
  const events = readWorkflowEvents();
  events.unshift({
    id: generateId(),
    assetId: asset.id,
    title: asset.title,
    filename: asset.filename,
    type: asset.type,
    event,
    owner: asset.dispatch?.owner || asset.execution?.owner || asset.review?.owner || '',
    status:
      asset.dispatch?.status ||
      asset.execution?.status ||
      asset.review?.status ||
      asset.status ||
      '',
    checkpoint:
      asset.dispatch?.checkpoint ||
      asset.execution?.checkpoint ||
      asset.review?.checkpoint ||
      '',
    target: (asset.dispatch?.targets || asset.execution?.targets || []).join(', '),
    occurredAt: now(),
    notes:
      asset.dispatch?.notes ||
      asset.execution?.notes ||
      asset.review?.notes ||
      '',
  });
  writeWorkflowEvents(events.slice(0, 120));
}

function handleExecutionBoard() {
  const assets = readAssets()
    .filter((asset) => asset.status !== 'archived' && asset.execution)
    .map((asset) => ({ ...asset, review: normalizeReviewState(asset.review), execution: normalizeExecutionState(asset.execution) }));

  const counts = {
    total: assets.length,
    queued: 0,
    active: 0,
    blocked: 0,
    completed: 0,
    unassigned: 0,
  };

  for (const asset of assets) {
    const execution = asset.execution || defaultExecutionState();
    counts[execution.status] = (counts[execution.status] || 0) + 1;
    if (!execution.owner) counts.unassigned++;
  }

  const queue = assets
    .sort((left, right) => {
      const leftTime = left.execution && left.execution.updatedAt ? new Date(left.execution.updatedAt).getTime() : 0;
      const rightTime = right.execution && right.execution.updatedAt ? new Date(right.execution.updatedAt).getTime() : 0;
      return rightTime - leftTime || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .map((asset) => ({
      id: asset.id,
      title: asset.title,
      filename: asset.filename,
      type: asset.type,
      status: asset.status,
      review: asset.review,
      execution: asset.execution,
      updatedAt: asset.updatedAt,
    }));

  return respond(200, { counts, queue });
}

function handleDispatchBoard() {
  const assets = readAssets()
    .filter((asset) => asset.status !== 'archived' && asset.dispatch)
    .map((asset) => ({
      ...asset,
      review: normalizeReviewState(asset.review),
      execution: normalizeExecutionState(asset.execution),
      dispatch: normalizeDispatchState(asset.dispatch),
    }));

  const counts = {
    total: assets.length,
    queued: 0,
    scheduled: 0,
    published: 0,
    cancelled: 0,
    completed: 0,
    blocked: 0,
    unassigned: 0,
  };

  for (const asset of assets) {
    const dispatch = asset.dispatch || defaultDispatchState();
    counts[dispatch.status] = (counts[dispatch.status] || 0) + 1;
    if (!dispatch.owner) counts.unassigned++;
  }

  const queue = assets
    .sort((left, right) => {
      const leftTime = left.dispatch && left.dispatch.updatedAt ? new Date(left.dispatch.updatedAt).getTime() : 0;
      const rightTime = right.dispatch && right.dispatch.updatedAt ? new Date(right.dispatch.updatedAt).getTime() : 0;
      return rightTime - leftTime || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .map((asset) => ({
      id: asset.id,
      title: asset.title,
      filename: asset.filename,
      type: asset.type,
      status: asset.status,
      review: asset.review,
      execution: asset.execution,
      dispatch: asset.dispatch,
      updatedAt: asset.updatedAt,
    }));

  return respond(200, { counts, queue });
}

function handleWorkflowTimeline() {
  const events = readWorkflowEvents().sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  );
  const summary = {
    total: events.length,
    archive: 0,
    review: 0,
    execution: 0,
    dispatch: 0,
  };

  const items = events.map((event) => {
    let type = event.event;
    if (event.event === 'asset-archived') summary.archive += 1;
    if (event.event === 'review-updated') summary.review += 1;
    if (event.event === 'execution-updated') summary.execution += 1;
    if (event.event === 'dispatch-updated') summary.dispatch += 1;
    return {
      id: event.id,
      assetId: event.assetId,
      title: event.title,
      filename: event.filename,
      type,
      owner: event.owner || null,
      status: event.status || null,
      checkpoint: event.checkpoint || null,
      target: event.target || null,
      notes: event.notes || null,
      occurredAt: event.occurredAt,
    };
  });

  return respond(200, {
    ok: true,
    workflowTimeline: {
      summary,
      items,
      latestEventAt: items[0]?.occurredAt || null,
    },
  });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handleList(query) {
  let assets = readAssets().filter((a) => a.status !== 'archived');

  const { type, search, tag } = query;

  if (type && VALID_TYPES.has(type)) {
    assets = assets.filter((a) => a.type === type);
  }

  if (tag) {
    const tagLower = tag.toLowerCase();
    assets = assets.filter(
      (a) => Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase() === tagLower)
    );
  }

  if (search) {
    const term = search.toLowerCase();
    assets = assets.filter(
      (a) =>
        (a.title && a.title.toLowerCase().includes(term)) ||
        (a.description && a.description.toLowerCase().includes(term)) ||
        (Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase().includes(term)))
    );
  }

  // Sort newest first
  assets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  assets = assets.map((asset) => ({ ...asset, review: normalizeReviewState(asset.review) }));

  return respond(200, { assets });
}

function handleGet(query) {
  const { id } = query;
  if (!id) return respond(400, { error: 'id is required' });

  const assets = readAssets();
  const asset = assets.find((a) => a.id === id);
  if (!asset) return respond(404, { error: 'Asset not found' });

  ensureReviewState(asset);
  return respond(200, { asset });
}

function handleReviewBoard() {
  const assets = readAssets()
    .filter((asset) => asset.status !== 'archived')
    .map((asset) => ({ ...asset, review: normalizeReviewState(asset.review) }));

  const counts = {
    total: assets.length,
    draft: 0,
    ready: 0,
    approved: 0,
    blocked: 0,
    dispatched: 0,
    unassigned: 0,
  };

  for (const asset of assets) {
    const review = asset.review || defaultReviewState();
    counts[review.status] = (counts[review.status] || 0) + 1;
    if (!review.owner) counts.unassigned++;
  }

  const queue = assets
    .sort((left, right) => {
      const leftTime = left.review && left.review.updatedAt ? new Date(left.review.updatedAt).getTime() : 0;
      const rightTime = right.review && right.review.updatedAt ? new Date(right.review.updatedAt).getTime() : 0;
      return rightTime - leftTime || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .map((asset) => ({
      id: asset.id,
      title: asset.title,
      filename: asset.filename,
      type: asset.type,
      status: asset.status,
      review: asset.review,
      updatedAt: asset.updatedAt,
    }));

  return respond(200, { counts, queue });
}

function handleUpload(body) {
  const { title, type, content_base64, filename, tags, description, status, mimeType } = body;

  if (!title) return respond(400, { error: 'title is required' });
  if (!type || !VALID_TYPES.has(type))
    return respond(400, { error: 'type must be one of: image, video, audio, document' });
  if (!filename) return respond(400, { error: 'filename is required' });
  if (!content_base64) return respond(400, { error: 'content_base64 is required' });

  const normalizedStatus = VALID_UPLOAD_STATUSES.has(String(status || '').toLowerCase())
    ? String(status).toLowerCase()
    : 'draft';
  ensureDirs();

  const id = generateId();
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storedName = `${id}-${safeFilename}`;
  const filePath = path.join(FILES_DIR, storedName);

  let fileBuffer;
  try {
    fileBuffer = Buffer.from(content_base64, 'base64');
  } catch {
    return respond(400, { error: 'content_base64 is not valid base64' });
  }

  fs.writeFileSync(filePath, fileBuffer);

  const asset = {
    id,
    title,
    type,
    filename: safeFilename,
    filePath: path.relative(MEDIA_CENTER_DIR, filePath),
    fileSize: fileBuffer.length,
    tags: Array.isArray(tags) ? tags : [],
    description: description || '',
    status: normalizedStatus,
    publishedAt: normalizedStatus === 'published' ? now() : null,
    createdAt: now(),
    updatedAt: now(),
    review: defaultReviewState(),
    mimeType: inferMimeType(safeFilename, mimeType),
    url: `/.netlify/functions/media-file?id=${id}`,
  };

  const assets = readAssets();
  assets.push(asset);
  writeAssets(assets);
  appendWorkflowEvent(asset, 'asset-uploaded');

  return respond(201, { asset });
}

function handleUpdate(body) {
  const { id, title, tags, description, status } = body;
  if (!id) return respond(400, { error: 'id is required' });

  const assets = readAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return respond(404, { error: 'Asset not found' });

  const asset = assets[idx];

  if (title !== undefined) asset.title = title;
  if (tags !== undefined) asset.tags = Array.isArray(tags) ? tags : [];
  if (description !== undefined) asset.description = description;
  if (status !== undefined) {
    if (!VALID_MANAGE_STATUSES.has(status)) return respond(400, { error: 'Invalid status value' });
    asset.status = status;
    asset.publishedAt = status === 'published' ? asset.publishedAt || now() : null;
  }
  asset.updatedAt = now();
  ensureReviewState(asset);

  assets[idx] = asset;
  writeAssets(assets);

  return respond(200, { asset });
}

function handleReviewUpdate(body) {
  const { id, status, owner, checkpoint, notes } = body;
  if (!id) return respond(400, { error: 'id is required' });

  const assets = readAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return respond(404, { error: 'Asset not found' });

  const asset = assets[idx];
  const review = ensureReviewState(asset);

  if (status !== undefined) {
    const normalizedStatus = String(status || '').toLowerCase();
    if (!VALID_REVIEW_STATUSES.has(normalizedStatus)) {
      return respond(400, { error: 'Invalid review status value' });
    }
    review.status = normalizedStatus;
  }
  if (owner !== undefined) review.owner = String(owner || '').trim();
  if (checkpoint !== undefined) review.checkpoint = String(checkpoint || '').trim();
  if (notes !== undefined) review.notes = String(notes || '').trim();
  review.updatedAt = now();

  asset.review = review;
  asset.updatedAt = now();
  assets[idx] = asset;
  writeAssets(assets);
  appendWorkflowEvent(asset, 'review-updated');

  return respond(200, { asset, review });
}

function handleExecutionUpdate(body) {
  const { id, status, owner, checkpoint, notes, targets } = body;
  if (!id) return respond(400, { error: 'id is required' });

  const assets = readAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return respond(404, { error: 'Asset not found' });

  const asset = assets[idx];
  const review = ensureReviewState(asset);
  const execution = ensureExecutionState(asset);

  if (!['approved', 'dispatched'].includes(review.status)) {
    return respond(409, { error: 'Asset review must be approved or dispatched before execution can be queued' });
  }

  if (status !== undefined) {
    const normalizedStatus = String(status || '').toLowerCase();
    if (!VALID_EXECUTION_STATUSES.has(normalizedStatus)) {
      return respond(400, { error: 'Invalid execution status value' });
    }
    execution.status = normalizedStatus;
  }
  if (owner !== undefined) execution.owner = String(owner || '').trim();
  if (checkpoint !== undefined) execution.checkpoint = String(checkpoint || '').trim() || execution.checkpoint;
  if (notes !== undefined) execution.notes = String(notes || '').trim();
  if (targets !== undefined) execution.targets = normalizeExecutionTargets(targets);
  if (!execution.targets.length) execution.targets = inferExecutionTargets(asset);
  execution.updatedAt = now();

  asset.execution = execution;
  asset.updatedAt = now();
  assets[idx] = asset;
  writeAssets(assets);
  appendWorkflowEvent(asset, 'execution-updated');

  return respond(200, { asset, execution });
}

function handleDispatchUpdate(body) {
  const { id, status, owner, checkpoint, notes, targets, publishedEntryId } = body;
  if (!id) return respond(400, { error: 'id is required' });

  const assets = readAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return respond(404, { error: 'Asset not found' });

  const asset = assets[idx];
  const review = ensureReviewState(asset);
  const execution = ensureExecutionState(asset);
  const dispatch = ensureDispatchState(asset);

  if (!['approved', 'dispatched'].includes(review.status)) {
    return respond(409, { error: 'Asset review must be approved before dispatch can be updated' });
  }
  if (!['active', 'completed'].includes(execution.status)) {
    return respond(409, { error: 'Asset execution must be active or completed before dispatch can be updated' });
  }

  if (status !== undefined) {
    const normalizedStatus = String(status || '').toLowerCase();
    if (!VALID_DISPATCH_STATUSES.has(normalizedStatus)) {
      return respond(400, { error: 'Invalid dispatch status value' });
    }
    dispatch.status = normalizedStatus;
  }
  if (owner !== undefined) dispatch.owner = String(owner || '').trim();
  if (checkpoint !== undefined) dispatch.checkpoint = String(checkpoint || '').trim() || dispatch.checkpoint;
  if (notes !== undefined) dispatch.notes = String(notes || '').trim();
  if (targets !== undefined) dispatch.targets = normalizeExecutionTargets(targets);
  if (!dispatch.targets.length) dispatch.targets = inferDispatchTargets(asset);
  if (publishedEntryId !== undefined) dispatch.publishedEntryId = publishedEntryId || null;
  dispatch.updatedAt = now();

  asset.dispatch = dispatch;
  asset.updatedAt = now();
  assets[idx] = asset;
  writeAssets(assets);
  appendWorkflowEvent(asset, 'dispatch-updated');

  return respond(200, { asset, dispatch });
}

function handleDelete(query) {
  const { id } = query;
  if (!id) return respond(400, { error: 'id is required' });

  const assets = readAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx === -1) return respond(404, { error: 'Asset not found' });

  assets[idx].status = 'archived';
  assets[idx].updatedAt = now();
  writeAssets(assets);
  appendWorkflowEvent(assets[idx], 'asset-archived');

  return respond(200, { message: 'Asset archived', id, asset: assets[idx] });
}

// ---------------------------------------------------------------------------
// Handler entry point
// ---------------------------------------------------------------------------

module.exports.handler = async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return respond(204, {});
  }

  const method = event.httpMethod;
  const query = event.queryStringParameters || {};
  const action = query.action;
  const gateDenied = requireSkyGate(event);
  if (gateDenied) return gateDenied;

  try {
    if (method === 'GET') {
      if (!action || action === 'list') return handleList(query);
      if (action === 'get') return handleGet(query);
      if (action === 'review-board') return handleReviewBoard();
      if (action === 'execution-board') return handleExecutionBoard();
      if (action === 'dispatch-board') return handleDispatchBoard();
      if (action === 'workflow-timeline') return handleWorkflowTimeline();
      return respond(400, { error: `Unknown GET action: ${action}` });
    }

    if (method === 'POST') {
      const body = parseBody(event);
      const bodyAction = body.action || action;
      if (!bodyAction || bodyAction === 'upload') return handleUpload(body);
      return respond(400, { error: `Unknown POST action: ${bodyAction}` });
    }

    if (method === 'PUT') {
      const body = parseBody(event);
      const bodyAction = body.action || action;
      if (!bodyAction || bodyAction === 'update') return handleUpdate(body);
      if (bodyAction === 'review') return handleReviewUpdate(body);
      if (bodyAction === 'execution') return handleExecutionUpdate(body);
      if (bodyAction === 'dispatch') return handleDispatchUpdate(body);
      return respond(400, { error: `Unknown PUT action: ${bodyAction}` });
    }

    if (method === 'DELETE') {
      return handleDelete(query);
    }

    return respond(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('[media-assets] Unhandled error:', err);
    return respond(500, { error: 'Internal server error', detail: err.message });
  }
};
