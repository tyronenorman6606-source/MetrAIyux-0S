import crypto from 'node:crypto';
import {
  findFileInFolder,
  listJsonFilesByPrefix,
  downloadJsonFile,
  upsertJsonFile,
  createJsonFile,
  updateJsonFile
} from './google-drive.js';
import { safeId } from './security.js';

export const CONFIG_FILE = 'skye-upload-vault-config.json';
export const LEDGER_FILE = 'skye-upload-vault-ledger.json';
export const RECEIPT_PREFIX = 'skye-upload-vault-receipt-';
export const SESSION_PREFIX = 'skye-upload-vault-session-';
export const EVENT_PREFIX = 'skye-upload-vault-event-';
export const MAINTENANCE_PREFIX = 'skye-upload-vault-maintenance-';

const DEFAULT_CHUNK_MB = 8;
const MAX_OBJECT_BYTES = 5 * 1024 * 1024 * 1024 * 1024;
const DEFAULT_BLOCKED_EXTENSIONS = ['.exe', '.msi', '.bat', '.cmd', '.scr', '.ps1', '.vbs', '.js', '.jar', '.com', '.sh'];
const DEFAULT_MAX_FILES_PER_SUBMISSION = 25;
const DEFAULT_MAX_TOTAL_SUBMISSION_GB = 5000;

function bootstrapConfig() {
  const raw = process.env.R2_CONFIG_JSON || process.env.GOOGLE_DRIVE_CONFIG_JSON;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      const err = new Error('R2_CONFIG_JSON contains invalid JSON.');
      err.statusCode = 500;
      throw err;
    }
  }
  return {
    brandName: 'SkyeVault-Drop',
    supportEmail: '',
    publicHeadline: 'I built SkyeVault-Drop so client files, media, and repo snapshots stop drifting through inboxes and land in one receipt-backed vault.',
    publicSubheadline: 'The surface beside this copy is the actual intake room: add context, send the package, and keep the proof receipts clean. I route files through routing gates into Cloudflare R2, write the ledger receipt, and review the archive from the operator side.',
    publicInstructions: 'Add the project details, attach the files or sanitized repo zip, confirm permission, and keep this page open until every file says complete.',
    retentionNotice: 'Uploaded files are used for intake, production, review, delivery, and proof. Tell your project contact before sending anything that needs special handling.',
    requireUsageRights: true,
    requireRetentionAck: true,
    requireClientName: true,
    requireClientEmail: true,
    requireProjectName: true,
    routingMode: 'priority',
    chunkSizeMb: DEFAULT_CHUNK_MB,
    blockedExtensions: DEFAULT_BLOCKED_EXTENSIONS,
    maxFilesPerSubmission: DEFAULT_MAX_FILES_PER_SUBMISSION,
    maxTotalSubmissionGb: DEFAULT_MAX_TOTAL_SUBMISSION_GB,
    destinations: []
  };
}

export function getConfigFolderId() {
  const id = process.env.R2_CONFIG_PREFIX || process.env.R2_CONFIG_FOLDER_ID || process.env.GOOGLE_CONFIG_FOLDER_ID;
  if (!id) {
    const error = new Error('R2_CONFIG_PREFIX is not configured.');
    error.statusCode = 500;
    throw error;
  }
  return id;
}

function normalizeBlockedExtensions(input) {
  const list = Array.isArray(input) ? input : DEFAULT_BLOCKED_EXTENSIONS;
  return [...new Set(list
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean)
    .map((item) => item.startsWith('.') ? item : `.${item}`))].slice(0, 80);
}

function normalizePositiveNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function eventFileName(event) {
  const created = String(event.createdAt || new Date().toISOString()).replace(/[:.]/g, '-');
  const id = crypto.randomBytes(6).toString('hex');
  return `${EVENT_PREFIX}${created}-${safeId(event.type || 'event')}-${id}.json`;
}

export function normalizeDestination(input, index = 0) {
  const id = safeId(input.id || input.name || `destination-${index + 1}`);
  return {
    id,
    name: String(input.name || id || `Destination ${index + 1}`).trim().slice(0, 120),
    folderId: String(input.folderId || '').trim(),
    enabled: input.enabled !== false,
    priority: Number.isFinite(Number(input.priority)) ? Number(input.priority) : index + 1,
    role: ['primary', 'fallback', 'archive', 'project'].includes(input.role) ? input.role : 'project',
    description: String(input.description || '').trim().slice(0, 240),
    maxFileSizeGb: Number.isFinite(Number(input.maxFileSizeGb)) && Number(input.maxFileSizeGb) > 0 ? Number(input.maxFileSizeGb) : 5000,
    accept: String(input.accept || '*').trim() || '*'
  };
}

export function normalizeConfig(input = {}) {
  const destinations = Array.isArray(input.destinations) ? input.destinations.map(normalizeDestination) : [];
  const seen = new Set();
  const cleanDestinations = destinations.map((destination, index) => {
    let id = destination.id || `destination-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return { ...destination, id };
  });

  return {
    brandName: String(input.brandName || 'SkyeVault-Drop').trim().slice(0, 140),
    supportEmail: String(input.supportEmail || '').trim().slice(0, 160),
    publicHeadline: String(input.publicHeadline || 'I built SkyeVault-Drop so client files, media, and repo snapshots stop drifting through inboxes and land in one receipt-backed vault.').trim().slice(0, 260),
    publicSubheadline: String(input.publicSubheadline || 'The surface beside this copy is the actual intake room: add context, send the package, and keep the proof receipts clean. I route files through routing gates into Cloudflare R2, write the ledger receipt, and review the archive from the operator side.').trim().slice(0, 360),
    publicInstructions: String(input.publicInstructions || 'Add the project details, attach the files or sanitized repo zip, confirm permission, and keep this page open until every file says complete.').trim().slice(0, 420),
    retentionNotice: String(input.retentionNotice || 'Uploaded files are used for intake, production, review, delivery, and proof. Tell your project contact before sending anything that needs special handling.').trim().slice(0, 420),
    requireUsageRights: input.requireUsageRights !== false,
    requireRetentionAck: input.requireRetentionAck !== false,
    requireClientName: input.requireClientName !== false,
    requireClientEmail: input.requireClientEmail !== false,
    requireProjectName: input.requireProjectName !== false,
    routingMode: ['priority', 'manual'].includes(input.routingMode) ? input.routingMode : 'priority',
    chunkSizeMb: normalizeChunkSize(input.chunkSizeMb),
    blockedExtensions: normalizeBlockedExtensions(input.blockedExtensions),
    maxFilesPerSubmission: Math.floor(normalizePositiveNumber(input.maxFilesPerSubmission, DEFAULT_MAX_FILES_PER_SUBMISSION, 1, 200)),
    maxTotalSubmissionGb: normalizePositiveNumber(input.maxTotalSubmissionGb, DEFAULT_MAX_TOTAL_SUBMISSION_GB, 1, 5000),
    destinations: cleanDestinations,
    updatedAt: input.updatedAt || null,
    updatedBy: input.updatedBy || null
  };
}

export function normalizeChunkSize(value) {
  const mb = Number(value || DEFAULT_CHUNK_MB);
  if (!Number.isFinite(mb)) return DEFAULT_CHUNK_MB;
  const clamped = Math.min(128, Math.max(1, mb));
  const bytes = Math.floor(clamped * 1024 * 1024);
  const multiple = 256 * 1024;
  return Math.max(1, Math.floor(bytes / multiple) * multiple / 1024 / 1024);
}

export async function loadConfig() {
  const fallback = normalizeConfig(bootstrapConfig());
  try {
    const folderId = getConfigFolderId();
    const file = await findFileInFolder(folderId, CONFIG_FILE);
    if (!file) return { config: fallback, source: 'env-bootstrap' };
    const driveConfig = await downloadJsonFile(file.id, fallback);
    return { config: normalizeConfig(driveConfig), source: 'cloudflare-r2', configFileId: file.id };
  } catch (error) {
    if (error.statusCode === 500) throw error;
    return { config: fallback, source: 'env-bootstrap-after-drive-read-error', warning: error.message };
  }
}

export async function saveConfig(config, updatedBy = 'admin') {
  const normalized = normalizeConfig({ ...config, updatedAt: new Date().toISOString(), updatedBy });
  const missing = normalized.destinations.filter((destination) => !destination.folderId);
  if (missing.length) {
    const error = new Error(`Every destination must have a folderId. Missing: ${missing.map((d) => d.name).join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  const folderId = getConfigFolderId();
  const saved = await upsertJsonFile(folderId, CONFIG_FILE, normalized);
  return { config: normalized, saved };
}


export async function loadReceipt(receiptId) {
  const folderId = getConfigFolderId();
  const id = safeId(receiptId);
  if (!id) return null;
  const file = await findFileInFolder(folderId, `${RECEIPT_PREFIX}${id}.json`);
  if (!file) return null;
  const receipt = await downloadJsonFile(file.id, null);
  return { receipt, file };
}

export async function writeAuditEvent(type, detail = {}) {
  const folderId = getConfigFolderId();
  const event = {
    app: 'client-drop-vault',
    eventVersion: 1,
    type: safeId(type || 'event'),
    createdAt: new Date().toISOString(),
    detail
  };
  const saved = await createJsonFile(folderId, eventFileName(event), event);
  return { event, saved };
}

export async function writeAuditEventSafe(type, detail = {}) {
  try {
    return await writeAuditEvent(type, detail);
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export async function loadAuditEvents(limit = 80) {
  const folderId = getConfigFolderId();
  const files = await listJsonFilesByPrefix(folderId, EVENT_PREFIX, Math.min(250, Math.max(1, Number(limit || 80))));
  const events = [];
  for (const file of files.slice(0, Math.min(120, Number(limit || 80)))) {
    try {
      const event = await downloadJsonFile(file.id, null);
      if (event?.type) events.push({ ...event, eventFileId: file.id, eventModifiedTime: file.modifiedTime });
    } catch {
      events.push({ type: 'unreadable', createdAt: file.createdTime || file.modifiedTime, eventFileId: file.id });
    }
  }
  return events.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function loadLedger() {
  const folderId = getConfigFolderId();
  const receiptFiles = await listJsonFilesByPrefix(folderId, RECEIPT_PREFIX, 250).catch(() => []);
  const receiptEntries = [];

  for (const file of receiptFiles.slice(0, 120)) {
    try {
      const receipt = await downloadJsonFile(file.id, null);
      const entry = receipt?.entry || receipt;
      if (entry?.id) receiptEntries.push({ ...entry, receiptFileId: file.id, receiptSignature: receipt.receiptSignature || entry.receiptSignature });
    } catch {
      // A bad receipt file should not break the admin dashboard.
    }
  }

  const summaryFile = await findFileInFolder(folderId, LEDGER_FILE);
  let summaryEntries = [];
  if (summaryFile) {
    const ledger = await downloadJsonFile(summaryFile.id, { entries: [] });
    summaryEntries = Array.isArray(ledger.entries) ? ledger.entries : [];
  }

  const merged = new Map();
  for (const entry of [...summaryEntries, ...receiptEntries]) {
    if (entry?.id) merged.set(entry.id, entry);
  }
  const entries = [...merged.values()].sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));

  return {
    entries,
    source: receiptEntries.length ? 'receipts+summary' : (summaryFile ? 'cloudflare-r2-summary' : 'new'),
    fileId: summaryFile?.id || null,
    receiptCount: receiptEntries.length
  };
}

function receiptSecret() {
  return process.env.RECEIPT_SIGNING_SECRET || process.env.ADMIN_TOKEN || 'development-only-receipt-secret';
}

export function receiptIdFor(sessionId, driveFileId) {
  const digest = crypto.createHash('sha256').update(`${sessionId}:${driveFileId}`).digest('hex').slice(0, 24);
  return `cdv_${digest}`;
}

export function signReceipt(entry) {
  const payload = JSON.stringify({
    id: entry.id,
    sessionId: entry.sessionId,
    destinationId: entry.destinationId,
    driveFileId: entry.driveFile?.id || '',
    fileName: entry.fileName,
    fileSize: entry.fileSize,
    completedAt: entry.completedAt
  });
  return crypto.createHmac('sha256', receiptSecret()).update(payload).digest('hex');
}

export async function saveReceipt(entry) {
  const folderId = getConfigFolderId();
  const receiptFileName = `${RECEIPT_PREFIX}${entry.id}.json`;
  const existing = await findFileInFolder(folderId, receiptFileName);
  if (existing) {
    const receipt = await downloadJsonFile(existing.id, null);
    return { created: false, receipt, saved: existing };
  }
  const receiptSignature = signReceipt(entry);
  const receipt = {
    app: 'client-drop-vault',
    receiptVersion: 1,
    receiptSignature,
    createdAt: new Date().toISOString(),
    entry: { ...entry, receiptSignature }
  };
  const saved = await createJsonFile(folderId, receiptFileName, receipt);
  return { created: true, receipt, saved };
}


export function sessionManifestFileName(sessionId) {
  return `${SESSION_PREFIX}${safeId(sessionId)}.json`;
}

function redactSessionManifest(input = {}) {
  const manifest = {
    app: 'client-drop-vault',
    manifestVersion: 1,
    status: input.status || 'pending',
    sessionId: safeId(input.sessionId),
    createdAt: input.createdAt || new Date().toISOString(),
    completedAt: input.completedAt || null,
    receiptId: input.receiptId || null,
    destination: input.destination ? {
      id: input.destination.id,
      name: input.destination.name,
      role: input.destination.role,
      priority: input.destination.priority,
      folderId: input.destination.folderId
    } : null,
    file: input.file ? {
      name: input.file.name,
      size: Number(input.file.size || 0),
      mimeType: input.file.mimeType || 'application/octet-stream',
      fingerprint: input.file.fingerprint || null
    } : null,
    intake: input.intake || {},
    policy: input.policy || {},
    attempts: input.attempts || [],
    uploadUrlHash: input.uploadUrlHash || null,
    lastError: input.lastError || null,
    driveFileId: input.driveFileId || null
  };
  return manifest;
}

export async function saveSessionManifest(manifest) {
  const folderId = getConfigFolderId();
  const normalized = redactSessionManifest(manifest);
  if (!normalized.sessionId) {
    const error = new Error('Session manifest is missing a sessionId.');
    error.statusCode = 500;
    throw error;
  }
  const saved = await createJsonFile(folderId, sessionManifestFileName(normalized.sessionId), normalized);
  return { manifest: normalized, saved };
}

export async function loadSessionManifest(sessionId) {
  const folderId = getConfigFolderId();
  const file = await findFileInFolder(folderId, sessionManifestFileName(sessionId));
  if (!file) return null;
  const manifest = await downloadJsonFile(file.id, null);
  return { manifest, file };
}

export async function markSessionManifestComplete(sessionId, patch = {}) {
  const record = await loadSessionManifest(sessionId);
  if (!record) {
    const error = new Error('Upload session manifest was not found. The upload may have been created by an older package or outside this portal.');
    error.statusCode = 409;
    throw error;
  }
  const manifest = redactSessionManifest({
    ...record.manifest,
    ...patch,
    status: 'complete',
    completedAt: patch.completedAt || record.manifest.completedAt || new Date().toISOString(),
    intake: { ...(record.manifest.intake || {}), ...(patch.intake || {}) },
    file: { ...(record.manifest.file || {}), ...(patch.file || {}) },
    destination: patch.destination || record.manifest.destination,
    policy: { ...(record.manifest.policy || {}), ...(patch.policy || {}) }
  });
  const saved = await updateJsonFile(record.file.id, manifest);
  return { manifest, saved, file: record.file };
}


export async function updateSessionManifestStatus(sessionId, status, patch = {}) {
  const record = await loadSessionManifest(sessionId);
  if (!record) return null;
  const manifest = redactSessionManifest({
    ...record.manifest,
    ...patch,
    status,
    lastError: patch.lastError ?? record.manifest.lastError ?? null,
    policy: { ...(record.manifest.policy || {}), ...(patch.policy || {}) }
  });
  const saved = await updateJsonFile(record.file.id, manifest);
  return { manifest, saved, file: record.file };
}

export async function writeMaintenanceReport(report = {}) {
  const folderId = getConfigFolderId();
  const createdAt = report.createdAt || new Date().toISOString();
  const safeCreated = String(createdAt).replace(/[:.]/g, '-');
  const name = `${MAINTENANCE_PREFIX}${safeCreated}.json`;
  const body = {
    app: 'client-drop-vault',
    reportVersion: 1,
    createdAt,
    ...report
  };
  const saved = await createJsonFile(folderId, name, body);
  return { report: body, saved };
}

export async function loadSessionManifests(limit = 80) {
  const folderId = getConfigFolderId();
  const files = await listJsonFilesByPrefix(folderId, SESSION_PREFIX, Math.min(250, Math.max(1, Number(limit || 80))));
  const manifests = [];
  for (const file of files.slice(0, Math.min(120, Number(limit || 80)))) {
    try {
      const manifest = await downloadJsonFile(file.id, null);
      if (manifest?.sessionId) manifests.push({ ...manifest, manifestFileId: file.id, manifestModifiedTime: file.modifiedTime });
    } catch {
      manifests.push({ sessionId: file.name, status: 'unreadable', manifestFileId: file.id });
    }
  }
  return manifests.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function appendLedger(entry) {
  const folderId = getConfigFolderId();
  const receiptResult = await saveReceipt(entry);
  const receiptEntry = receiptResult.receipt?.entry || entry;
  const current = await loadLedger().catch(() => ({ entries: [] }));
  const byId = new Map();
  for (const item of [receiptEntry, ...current.entries]) {
    if (item?.id) byId.set(item.id, item);
  }
  const entries = [...byId.values()]
    .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
    .slice(0, 2500);
  const ledger = {
    app: 'client-drop-vault',
    updatedAt: new Date().toISOString(),
    receiptBacked: true,
    entries
  };

  let saved = null;
  let ledgerWarning = null;
  try {
    saved = await upsertJsonFile(folderId, LEDGER_FILE, ledger);
  } catch (error) {
    ledgerWarning = `Receipt was saved, but summary ledger update failed: ${error.message}`;
  }

  return {
    saved,
    receiptSaved: receiptResult.saved,
    receiptSignature: receiptResult.receipt?.receiptSignature || receiptResult.receipt?.entry?.receiptSignature || null,
    receiptCreated: receiptResult.created,
    entryCount: entries.length,
    ledgerWarning
  };
}

export function publicConfig(config) {
  return {
    brandName: config.brandName,
    supportEmail: config.supportEmail,
    publicHeadline: config.publicHeadline,
    publicSubheadline: config.publicSubheadline,
    publicInstructions: config.publicInstructions,
    retentionNotice: config.retentionNotice,
    requireUsageRights: config.requireUsageRights,
    requireRetentionAck: config.requireRetentionAck,
    requireClientName: config.requireClientName,
    requireClientEmail: config.requireClientEmail,
    requireProjectName: config.requireProjectName,
    routingMode: config.routingMode,
    chunkSizeMb: config.chunkSizeMb,
    blockedExtensions: config.blockedExtensions,
    maxFilesPerSubmission: config.maxFilesPerSubmission,
    maxTotalSubmissionGb: config.maxTotalSubmissionGb,
    portalKeyRequired: Boolean(process.env.CLIENT_PORTAL_KEY),
    destinations: config.destinations
      .filter((destination) => destination.enabled)
      .sort((a, b) => Number(a.priority) - Number(b.priority))
      .map((destination) => ({
        id: destination.id,
        name: destination.name,
        role: destination.role,
        description: destination.description,
        maxFileSizeGb: destination.maxFileSizeGb,
        accept: destination.accept,
        priority: destination.priority
      }))
  };
}

export function chooseDestinations(config, selectedDestinationId, failedDestinationIds = []) {
  const failed = new Set((failedDestinationIds || []).map(String));
  const enabled = config.destinations
    .filter((destination) => destination.enabled && destination.folderId && !failed.has(destination.id))
    .sort((a, b) => Number(a.priority) - Number(b.priority));

  if (selectedDestinationId) {
    const selected = enabled.find((destination) => destination.id === selectedDestinationId);
    const rest = enabled.filter((destination) => destination.id !== selectedDestinationId);
    return selected ? [selected, ...rest] : rest;
  }

  return enabled;
}

function fileExtension(fileName) {
  const match = String(fileName || '').toLowerCase().match(/\.[a-z0-9]{1,12}$/);
  return match ? match[0] : '';
}

export function assertFileAllowed(destination, fileSize, mimeType, fileName, config = {}) {
  const size = Number(fileSize);
  if (!Number.isFinite(size) || size <= 0) {
    const error = new Error('File size is invalid.');
    error.statusCode = 400;
    throw error;
  }
  if (size > MAX_OBJECT_BYTES) {
    const error = new Error('Cloudflare R2 supports individual objects up to 5 TB. This file is larger than that ceiling.');
    error.statusCode = 413;
    throw error;
  }
  const blockedExtensions = new Set(config.blockedExtensions || DEFAULT_BLOCKED_EXTENSIONS);
  const ext = fileExtension(fileName);
  if (ext && blockedExtensions.has(ext)) {
    const error = new Error(`This portal blocks ${ext} files by policy. Package source code or executable materials in a reviewed zip when needed.`);
    error.statusCode = 415;
    throw error;
  }
  const destinationMax = Number(destination.maxFileSizeGb || 5000) * 1024 * 1024 * 1024;
  if (size > destinationMax) {
    const error = new Error(`${destination.name} allows files up to ${destination.maxFileSizeGb} GB.`);
    error.statusCode = 413;
    throw error;
  }
  const accept = String(destination.accept || '*').trim();
  if (accept && accept !== '*') {
    const terms = accept.split(',').map((term) => term.trim().toLowerCase()).filter(Boolean);
    const lowerName = String(fileName || '').toLowerCase();
    const lowerMime = String(mimeType || '').toLowerCase();
    const allowed = terms.some((term) => {
      if (term === '*') return true;
      if (term.endsWith('/*')) return lowerMime.startsWith(term.slice(0, -1));
      if (term.startsWith('.')) return lowerName.endsWith(term);
      return lowerMime === term;
    });
    if (!allowed) {
      const error = new Error(`${destination.name} does not accept this file type.`);
      error.statusCode = 415;
      throw error;
    }
  }
}

export function newSessionId() {
  return `cdv_${crypto.randomBytes(18).toString('hex')}`;
}
