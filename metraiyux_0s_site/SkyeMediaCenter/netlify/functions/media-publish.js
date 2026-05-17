'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { requireSkyGate } = require('./_lib/skygate-auth');

const MEDIA_CENTER_DIR =
  process.env.MEDIA_CENTER_DATA_DIR || path.join(os.tmpdir(), 'skye-media-center');
const ASSETS_FILE = path.join(MEDIA_CENTER_DIR, 'assets.json');
const PUBLISH_FILE = path.join(MEDIA_CENTER_DIR, 'publish-queue.json');
const WORKFLOW_EVENTS_FILE = path.join(MEDIA_CENTER_DIR, 'workflow-events.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDirs() {
  if (!fs.existsSync(MEDIA_CENTER_DIR)) fs.mkdirSync(MEDIA_CENTER_DIR, { recursive: true });
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

function readPublishQueue() {
  ensureDirs();
  if (!fs.existsSync(PUBLISH_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PUBLISH_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writePublishQueue(queue) {
  ensureDirs();
  fs.writeFileSync(PUBLISH_FILE, JSON.stringify(queue, null, 2), 'utf8');
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Skye-Gate-Session, X-Skye-Gate-Source, X-Skye-Media-Center-Free99',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function now() {
  return new Date().toISOString();
}

function generateId() {
  return crypto.randomBytes(10).toString('hex');
}

const VALID_TARGETS = new Set(['web', 'social', 'email']);

function normalizeTargets(targets) {
  return Array.isArray(targets)
    ? targets.map((target) => String(target || '').trim()).filter(Boolean).slice(0, 8)
    : [];
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

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function handlePublish(body) {
  const { assetId, publishTarget, scheduledAt } = body;

  if (!assetId) return respond(400, { error: 'assetId is required' });
  if (!publishTarget || !VALID_TARGETS.has(publishTarget)) {
    return respond(400, { error: 'publishTarget must be one of: web, social, email' });
  }

  // Verify asset exists
  const assets = readAssets();
  const assetIdx = assets.findIndex((a) => a.id === assetId);
  if (assetIdx === -1) return respond(404, { error: 'Asset not found' });

  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
  const publishStatus = isScheduled ? 'scheduled' : 'published';
  const publishedAt = isScheduled ? null : now();

  // Update the asset record
  assets[assetIdx].status = publishStatus;
  assets[assetIdx].publishedAt = publishedAt;
  assets[assetIdx].updatedAt = now();
  writeAssets(assets);

  // Add to publish queue
  const queue = readPublishQueue();
  const entry = {
    id: generateId(),
    assetId,
    publishTarget,
    status: publishStatus,
    scheduledAt: scheduledAt || null,
    publishedAt,
    createdAt: now(),
    updatedAt: now(),
  };
  queue.push(entry);
  writePublishQueue(queue);

  const asset = assets[assetIdx];
  asset.dispatch = {
    status: publishStatus,
    owner: 'media-publish',
    checkpoint: isScheduled ? 'publish-scheduled' : 'published-live',
    notes: isScheduled
      ? `Queued for ${publishTarget} publish at ${scheduledAt}`
      : `Published to ${publishTarget}`,
    targets: normalizeTargets([publishTarget]),
    updatedAt: now(),
    publishedEntryId: entry.id,
  };
  if (asset.execution && asset.execution.status === 'active') {
    asset.execution.status = 'completed';
    asset.execution.checkpoint = 'published';
    asset.execution.updatedAt = now();
  }
  writeAssets(assets);
  appendWorkflowEvent(asset, 'dispatch-updated');

  return respond(200, { entry, asset: assets[assetIdx] });
}

function handleList(query) {
  const { status } = query;
  const VALID_STATUSES = new Set(['scheduled', 'published', 'cancelled']);

  let queue = readPublishQueue();

  if (status && VALID_STATUSES.has(status)) {
    queue = queue.filter((e) => e.status === status);
  }

  // For scheduled items, check if their scheduledAt has passed and auto-promote
  const nowTs = new Date();
  let changed = false;
  queue = queue.map((entry) => {
    if (
      entry.status === 'scheduled' &&
      entry.scheduledAt &&
      new Date(entry.scheduledAt) <= nowTs
    ) {
      entry.status = 'published';
      entry.publishedAt = now();
      entry.updatedAt = now();
      changed = true;

      // Also update asset
      const assets = readAssets();
      const idx = assets.findIndex((a) => a.id === entry.assetId);
      if (idx !== -1) {
        assets[idx].status = 'published';
        assets[idx].publishedAt = entry.publishedAt;
        assets[idx].updatedAt = entry.updatedAt;
        writeAssets(assets);
      }
    }
    return entry;
  });

  if (changed) writePublishQueue(queue);

  // Re-filter after auto-promotion
  if (status && VALID_STATUSES.has(status)) {
    queue = queue.filter((e) => e.status === status);
  }

  // Sort newest first
  queue.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return respond(200, { entries: queue });
}

function handleCancel(body, query) {
  const assetId = body.assetId || query.assetId;
  if (!assetId) return respond(400, { error: 'assetId is required' });

  const queue = readPublishQueue();
  let cancelled = 0;

  const updated = queue.map((entry) => {
    if (entry.assetId === assetId && entry.status === 'scheduled') {
      cancelled++;
      return { ...entry, status: 'cancelled', updatedAt: now() };
    }
    return entry;
  });

  if (cancelled === 0) {
    return respond(404, { error: 'No scheduled publish entries found for this asset' });
  }

  writePublishQueue(updated);

  // Revert asset status to draft if it was scheduled
  const assets = readAssets();
  const assetIdx = assets.findIndex((a) => a.id === assetId);
  if (assetIdx !== -1 && assets[assetIdx].status === 'scheduled') {
    assets[assetIdx].status = 'draft';
    assets[assetIdx].publishedAt = null;
    assets[assetIdx].updatedAt = now();
    assets[assetIdx].dispatch = {
      status: 'cancelled',
      owner: 'media-publish',
      checkpoint: 'publish-cancelled',
      notes: 'Scheduled publish cancelled',
      targets: normalizeTargets(
        updated.filter((entry) => entry.assetId === assetId).map((entry) => entry.publishTarget)
      ),
      updatedAt: now(),
      publishedEntryId: null,
    };
    writeAssets(assets);
    appendWorkflowEvent(assets[assetIdx], 'dispatch-updated');
  }

  return respond(200, { message: `Cancelled ${cancelled} scheduled publish entry/entries`, assetId });
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
  const gateDenied = requireSkyGate(event);
  if (gateDenied) return gateDenied;

  try {
    if (method === 'GET') {
      return handleList(query);
    }

    if (method === 'POST') {
      const body = parseBody(event);
      const action = body.action || query.action;

      if (action === 'cancel') return handleCancel(body, query);

      // Default POST: queue a publish
      return handlePublish(body);
    }

    return respond(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('[media-publish] Unhandled error:', err);
    return respond(500, { error: 'Internal server error', detail: err.message });
  }
};
