const SESSION_STORE_KEY = 'cdv-resumable-sessions-v2';
const PENDING_FINALIZATION_KEY = 'cdv-pending-finalizations-v1';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RETRYABLE_UPLOAD_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const state = {
  config: null,
  files: [],
  rows: new Map(),
  uploading: false,
  receipts: [],
  pendingFinalizations: [],
  clientVaultItems: [],
  requestIds: new Map(),
  fingerprints: new Map(),
  submissionId: '',
  uploadAbortController: null,
  pauseRequested: false
};

const form = document.querySelector('#uploadForm');
const fileInput = document.querySelector('#fileInput');
const dropzone = document.querySelector('#dropzone');
const fileList = document.querySelector('#fileList');
const template = document.querySelector('#fileTemplate');
const statusBox = document.querySelector('#status');
const destinationSelect = document.querySelector('#destinationSelect');
const portalKeyWrap = document.querySelector('#portalKeyWrap');
const brandName = document.querySelector('#brandName');
const navBrandName = document.querySelector('#navBrandName');
const publicHeadline = document.querySelector('#publicHeadline');
const publicSubheadline = document.querySelector('#publicSubheadline');
const publicInstructions = document.querySelector('#publicInstructions');
const retentionNotice = document.querySelector('#retentionNotice');
const destinationCount = document.querySelector('#destinationCount');
const destinationSummary = document.querySelector('#destinationSummary');
const chunkSizeLabel = document.querySelector('#chunkSizeLabel');
const portalModeLabel = document.querySelector('#portalModeLabel');
const queueSummary = document.querySelector('#queueSummary');
const selectedSize = document.querySelector('#selectedSize');
const clearQueue = document.querySelector('#clearQueue');
const receiptPanel = document.querySelector('#receiptPanel');
const receiptList = document.querySelector('#receiptList');
const pendingPanel = document.querySelector('#pendingPanel');
const pendingList = document.querySelector('#pendingList');
const retryPending = document.querySelector('#retryPending');
const pauseUpload = document.querySelector('#pauseUpload');
const copyReceipts = document.querySelector('#copyReceipts');
const downloadReceipts = document.querySelector('#downloadReceipts');
const turnstileWrap = document.querySelector('#turnstileWrap');
const clientVaultForm = document.querySelector('#clientVaultForm');
const clientVaultKeyWrap = document.querySelector('#clientVaultKeyWrap');
const clientVaultList = document.querySelector('#clientVaultList');
const clientVaultCount = document.querySelector('#clientVaultCount');
const clearClientVault = document.querySelector('#clearClientVault');

function showStatus(message, type = '') {
  if (!statusBox) return;
  statusBox.className = `status-card ${type}`.trim();
  statusBox.textContent = message;
  statusBox.classList.remove('hidden');
}

function hideStatus() {
  if (!statusBox) return;
  statusBox.classList.add('hidden');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 'on';
}

function setText(node, value) {
  if (node && value) node.textContent = value;
}

function setRowProgress(file, percent, label) {
  const row = state.rows.get(file);
  if (!row) return;
  row.querySelector('.progress span').style.width = `${Math.max(0, Math.min(100, percent))}%`;
  row.querySelector('.progress-label').textContent = label;
}


function randomId(prefix = 'req') {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function clientRequestId(file) {
  if (!state.requestIds.has(file)) state.requestIds.set(file, randomId('cdvreq'));
  return state.requestIds.get(file);
}

function activeSubmissionId() {
  if (!state.submissionId) state.submissionId = randomId('cdvsub');
  return state.submissionId;
}


function hexFromBuffer(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function mergeRanges(ranges) {
  const sorted = ranges
    .map(([start, end]) => [Math.max(0, Math.floor(start)), Math.max(0, Math.floor(end))])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push(range);
  }
  return merged;
}

async function computeFileFingerprint(file) {
  if (state.fingerprints.has(file)) return state.fingerprints.get(file);
  if (!crypto?.subtle) return null;

  const fullHashLimit = 16 * 1024 * 1024;
  const sampleSize = 1024 * 1024;
  const mode = file.size <= fullHashLimit ? 'full' : 'sampled-head-middle-tail';
  const ranges = mode === 'full'
    ? [[0, file.size]]
    : mergeRanges([
      [0, Math.min(sampleSize, file.size)],
      [Math.max(0, Math.floor(file.size / 2) - Math.floor(sampleSize / 2)), Math.min(file.size, Math.floor(file.size / 2) + Math.ceil(sampleSize / 2))],
      [Math.max(0, file.size - sampleSize), file.size]
    ]);

  const chunks = [];
  let bytesHashed = 0;
  for (const [start, end] of ranges) {
    const array = new Uint8Array(await file.slice(start, end).arrayBuffer());
    chunks.push(array);
    bytesHashed += array.byteLength;
  }

  const joined = new Uint8Array(bytesHashed);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const digest = await crypto.subtle.digest('SHA-256', joined);
  const fingerprint = {
    algorithm: 'SHA-256',
    mode,
    value: hexFromBuffer(digest),
    bytesHashed,
    generatedAt: new Date().toISOString(),
    note: mode === 'full'
      ? 'Full browser-side SHA-256 of the selected file.'
      : 'Large-file sample fingerprint using head, middle, and tail byte ranges. This is a manifest identity check, not antivirus or full forensic hashing.'
  };
  state.fingerprints.set(file, fingerprint);
  return fingerprint;
}

function totalSelectedBytes() {
  return state.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
}

function fileExtension(name) {
  const clean = String(name || '').toLowerCase();
  const index = clean.lastIndexOf('.');
  return index >= 0 ? clean.slice(index) : '';
}

function validateSelectedFiles() {
  const errors = [];
  const config = state.config || {};
  const maxFiles = Number(config.maxFilesPerSubmission || 0);
  const maxTotalBytes = Number(config.maxTotalSubmissionGb || 0) * 1024 * 1024 * 1024;
  const blocked = new Set((config.blockedExtensions || []).map((item) => String(item).toLowerCase()));
  if (maxFiles && state.files.length > maxFiles) errors.push(`This portal allows ${maxFiles} file${maxFiles === 1 ? '' : 's'} per submission. Split the package or zip related folders.`);
  if (maxTotalBytes && totalSelectedBytes() > maxTotalBytes) errors.push(`This submission is over the configured ${config.maxTotalSubmissionGb} GB total package limit.`);
  for (const file of state.files) {
    const ext = fileExtension(file.name);
    if (ext && blocked.has(ext)) errors.push(`${file.name} uses blocked extension ${ext}.`);
  }
  return errors;
}

function updateQueueSummary() {
  if (!queueSummary || !selectedSize) return;
  const count = state.files.length;
  const total = totalSelectedBytes();
  queueSummary.textContent = count ? `${count} file${count === 1 ? '' : 's'} queued` : 'No files selected';
  selectedSize.textContent = `${formatBytes(total)} selected`;
}

function destinationLimitForCurrentSelection() {
  if (!destinationSelect) return null;
  const selectedId = destinationSelect.value;
  const destinations = state.config?.destinations || [];
  if (selectedId) {
    const selected = destinations.find((destination) => destination.id === selectedId);
    return selected?.maxFileSizeGb || null;
  }
  const enabledLimits = destinations.map((destination) => Number(destination.maxFileSizeGb || 0)).filter(Boolean);
  return enabledLimits.length ? Math.max(...enabledLimits) : null;
}

function renderFiles() {
  if (!fileList || !template) return;
  fileList.innerHTML = '';
  state.rows.clear();
  const maxGb = destinationLimitForCurrentSelection();
  const blocked = new Set((state.config?.blockedExtensions || []).map((item) => String(item).toLowerCase()));
  const maxBytes = maxGb ? maxGb * 1024 * 1024 * 1024 : null;

  for (const file of state.files) {
    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelector('.file-name').textContent = file.name;
    const details = [`${formatBytes(file.size)}`, file.type || 'application/octet-stream'];
    const ext = fileExtension(file.name);
    if (maxBytes && file.size > maxBytes) details.push(`over ${maxGb} GB destination limit`);
    if (ext && blocked.has(ext)) details.push(`blocked extension ${ext}`);
    row.querySelector('.file-meta').textContent = details.join(' · ');
    if ((maxBytes && file.size > maxBytes) || (ext && blocked.has(ext))) row.classList.add('file-warning');
    row.querySelector('.remove-file').addEventListener('click', () => {
      if (state.uploading) return;
      state.files = state.files.filter((candidate) => candidate !== file);
      renderFiles();
    });
    fileList.append(row);
    state.rows.set(file, row);
  }
  updateQueueSummary();
}

function addFiles(fileListObject) {
  const incoming = Array.from(fileListObject || []).filter((file) => file.size > 0);
  const existingKeys = new Set(state.files.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  const unique = incoming.filter((file) => !existingKeys.has(`${file.name}:${file.size}:${file.lastModified}`));
  state.files = [...state.files, ...unique];
  renderFiles();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Request failed with ${response.status}.`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function formPayload(file, failedDestinationIds = []) {
  const data = new FormData(form);
  return {
    clientName: data.get('clientName'),
    clientEmail: data.get('clientEmail'),
    clientPhone: data.get('clientPhone'),
    websiteUrl: data.get('websiteUrl'),
    projectName: data.get('projectName'),
    clientReference: data.get('clientReference'),
    assetType: data.get('assetType'),
    deadline: data.get('deadline'),
    notes: data.get('notes'),
    clientRequestId: clientRequestId(file),
    submissionId: activeSubmissionId(),
    submissionFileCount: state.files.length,
    submissionTotalBytes: totalSelectedBytes(),
    portalKey: data.get('portalKey'),
    companyWebsite: data.get('companyWebsite'),
    turnstileToken: data.get('turnstileToken'),
    destinationId: data.get('destinationId'),
    usageRightsAccepted: normalizeBoolean(data.get('usageRightsAccepted')),
    retentionAcknowledged: normalizeBoolean(data.get('retentionAcknowledged')),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    fileFingerprint: state.fingerprints.get(file) || null,
    failedDestinationIds
  };
}

function loadStoredSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_STORE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    const now = Date.now();
    for (const [key, value] of Object.entries(parsed)) {
      if (!value?.storedAt || now - Number(value.storedAt) > SESSION_TTL_MS) delete parsed[key];
    }
    localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return {};
  }
}

function saveStoredSessions(store) {
  localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(store));
}

function fileSessionKey(file, payload) {
  const raw = [
    file.name,
    file.size,
    file.lastModified,
    payload.destinationId || 'auto',
    payload.clientEmail || '',
    payload.projectName || '',
    payload.clientReference || ''
  ].join('|');
  return `file:${btoa(unescape(encodeURIComponent(raw))).replace(/=+$/g, '')}`;
}

function rememberSession(file, payload, session) {
  const store = loadStoredSessions();
  store[fileSessionKey(file, payload)] = {
    storedAt: Date.now(),
    session,
    payload: {
      destinationId: payload.destinationId || '',
      clientEmail: payload.clientEmail || '',
      projectName: payload.projectName || '',
      clientReference: payload.clientReference || ''
    }
  };
  saveStoredSessions(store);
}

function getRememberedSession(file, payload) {
  const store = loadStoredSessions();
  const entry = store[fileSessionKey(file, payload)];
  return entry?.session || null;
}

function clearRememberedSession(file, payload) {
  const store = loadStoredSessions();
  delete store[fileSessionKey(file, payload)];
  saveStoredSessions(store);
}

function parseUploadedOffset(rangeHeader) {
  const match = String(rangeHeader || '').match(/bytes=0-(\d+)/i);
  return match ? Number(match[1]) + 1 : 0;
}

async function queryUploadOffset(session, file) {
  if (session.storageProvider === 'cloudflare-r2') {
    return 0;
  }
  const response = await fetch(session.uploadUrl, {
    method: 'PUT',
    headers: {
      'content-range': `bytes */${file.size}`
    }
  });

  if (response.status === 308) {
    return parseUploadedOffset(response.headers.get('range') || response.headers.get('Range'));
  }

  if (response.status === 404 || response.status === 410) {
    const error = new Error('Stored upload session expired. Creating a fresh session.');
    error.staleSession = true;
    throw error;
  }

  if (response.ok) return 0;

  const text = await response.text().catch(() => '');
  const error = new Error(`Could not query saved upload session. Storage returned ${response.status}. ${text.slice(0, 180)}`);
  error.staleSession = response.status === 403;
  throw error;
}

async function createUploadSession(file, failedDestinationIds) {
  const body = formPayload(file, failedDestinationIds);
  const headers = body.portalKey ? { 'x-portal-key': body.portalKey } : {};
  return api('/api/upload-session', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

async function uploadChunks(file, session, startAt = 0) {
  if (session.storageProvider === 'cloudflare-r2' && session.uploadMode === 's3-multipart') {
    return uploadR2Multipart(file, session);
  }

  state.uploadAbortController = new AbortController();
  const chunkSize = Math.max(256 * 1024, Number(session.chunkSize || 8 * 1024 * 1024));
  let start = Math.max(0, Number(startAt || 0));
  let finalDriveFile = null;
  let retryCount = 0;

  while (start < file.size) {
    if (state.pauseRequested) {
      const error = new Error('Upload paused. Press Start secure upload again to resume from the saved storage session.');
      error.paused = true;
      throw error;
    }
    const end = Math.min(start + chunkSize, file.size) - 1;
    const chunk = file.slice(start, end + 1, file.type || 'application/octet-stream');
    const percent = (start / file.size) * 100;
    setRowProgress(file, percent, `Uploading to ${session.destination.name} · ${Math.floor(percent)}%`);

    let response;
    try {
      response = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'content-range': `bytes ${start}-${end}/${file.size}`
        },
        body: chunk,
        signal: state.uploadAbortController.signal
      });
    } catch (error) {
      if (state.pauseRequested || error.name === 'AbortError') {
        const paused = new Error('Upload paused. Press Start secure upload again to resume from the saved storage session.');
        paused.paused = true;
        throw paused;
      }
      if (retryCount < 5) {
        retryCount += 1;
        setRowProgress(file, percent, `Network retry ${retryCount}/5`);
        await sleep(Math.min(10000, 700 * 2 ** retryCount));
        continue;
      }
      throw error;
    }

    if (response.status === 308) {
      retryCount = 0;
      start = parseUploadedOffset(response.headers.get('range') || response.headers.get('Range')) || end + 1;
      continue;
    }

    if (response.ok) {
      retryCount = 0;
      const text = await response.text();
      finalDriveFile = text ? JSON.parse(text) : null;
      start = end + 1;
      continue;
    }

    if (RETRYABLE_UPLOAD_STATUSES.has(response.status) && retryCount < 5) {
      retryCount += 1;
        setRowProgress(file, percent, `Storage retry ${retryCount}/5 after ${response.status}`);
      await sleep(Math.min(10000, 700 * 2 ** retryCount));
      continue;
    }

    const text = await response.text().catch(() => '');
    const error = new Error(`Storage upload failed with ${response.status}. ${text.slice(0, 240)}`);
    error.status = response.status;
    error.staleSession = response.status === 404 || response.status === 410;
    throw error;
  }

  state.uploadAbortController = null;
  if (!finalDriveFile?.id) throw new Error('Storage did not return a final file ID after upload.');
  setRowProgress(file, 100, 'Finalizing ledger');
  return finalDriveFile;
}

async function uploadR2Multipart(file, session) {
  state.uploadAbortController = new AbortController();
  const parts = Array.isArray(session.parts) && session.parts.length
    ? session.parts
    : [{ partNumber: 1, start: 0, end: file.size - 1, size: file.size, uploadUrl: session.uploadUrl }];
  const completedParts = [];
  let retryCount = 0;

  for (const part of parts) {
    if (state.pauseRequested) {
      const error = new Error('Upload paused. Press Start secure upload again to restart this file upload.');
      error.paused = true;
      throw error;
    }
    const start = Number(part.start || 0);
    const end = Number(part.end ?? (file.size - 1));
    const chunk = file.slice(start, end + 1, file.type || 'application/octet-stream');
    const percent = (start / file.size) * 100;
    setRowProgress(file, percent, `Uploading to ${session.destination.name} · ${Math.floor(percent)}%`);

    while (true) {
      let response;
      try {
        response = await fetch(part.uploadUrl, {
          method: 'PUT',
          body: chunk,
          signal: state.uploadAbortController.signal
        });
      } catch (error) {
        if (state.pauseRequested || error.name === 'AbortError') {
          const paused = new Error('Upload paused. Press Start secure upload again to restart this file upload.');
          paused.paused = true;
          throw paused;
        }
        if (retryCount < 5) {
          retryCount += 1;
          setRowProgress(file, percent, `Network retry ${retryCount}/5`);
          await sleep(Math.min(10000, 700 * 2 ** retryCount));
          continue;
        }
        throw error;
      }

      if (response.ok) {
        retryCount = 0;
        completedParts.push({
          partNumber: Number(part.partNumber),
          eTag: (response.headers.get('etag') || response.headers.get('ETag') || '').replace(/^"|"$/g, '')
        });
        break;
      }

      if (RETRYABLE_UPLOAD_STATUSES.has(response.status) && retryCount < 5) {
        retryCount += 1;
        setRowProgress(file, percent, `R2 retry ${retryCount}/5 after ${response.status}`);
        await sleep(Math.min(10000, 700 * 2 ** retryCount));
        continue;
      }

      const text = await response.text().catch(() => '');
      const error = new Error(`Cloudflare R2 upload failed with ${response.status}. ${text.slice(0, 240)}`);
      error.status = response.status;
      throw error;
    }
  }

  state.uploadAbortController = null;
  setRowProgress(file, 100, 'Finalizing ledger');
  return {
    ...(session.r2Object || {}),
    id: session.objectKey,
    key: session.objectKey,
    bucket: session.bucket,
    uploadId: session.uploadId,
    parts: completedParts,
    name: file.name,
    size: String(file.size),
    mimeType: file.type || 'application/octet-stream'
  };
}

async function getSessionForFile(file, failedDestinationIds) {
  setRowProgress(file, 0, 'Building upload manifest fingerprint');
  await computeFileFingerprint(file);
  const payload = formPayload(file, failedDestinationIds);
  const remembered = getRememberedSession(file, payload);
  if (remembered && !failedDestinationIds.includes(remembered.destination?.id)) {
    try {
      const offset = await queryUploadOffset(remembered, file);
      if (remembered.submissionId) state.submissionId = remembered.submissionId;
      setRowProgress(file, (offset / file.size) * 100, `Resuming saved session · ${Math.floor((offset / file.size) * 100)}%`);
      return { session: remembered, offset, reused: true };
    } catch (error) {
      clearRememberedSession(file, payload);
      if (!error.staleSession) throw error;
    }
  }

  const session = await createUploadSession(file, failedDestinationIds);
  rememberSession(file, payload, session);
  return { session, offset: 0, reused: false };
}

async function uploadOne(file) {
  const failedDestinationIds = [];
  const initialPayload = formPayload(file, failedDestinationIds);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { session, offset, reused } = await getSessionForFile(file, failedDestinationIds);
    try {
      setRowProgress(file, offset, reused ? `Resumed: ${session.destination.name}` : `Session ready: ${session.destination.name}`);
      const driveFile = await uploadChunks(file, session, offset);
      const receipt = await completeUploadWithRetry(file, session, driveFile);
      clearRememberedSession(file, initialPayload);
      setRowProgress(file, 100, `Complete · ${session.destination.name}`);
      return { file, session, receipt };
    } catch (error) {
      const payload = formPayload(file, failedDestinationIds);
      if (!error.paused) clearRememberedSession(file, payload);
      if (error.paused) throw error;
      if (error.noFallback) throw error;
      if (error.staleSession) {
        setRowProgress(file, 0, 'Saved session expired; creating a fresh session');
        continue;
      }
      failedDestinationIds.push(session.destination.id);
      if (attempt >= 3) throw error;
      setRowProgress(file, 0, `Retrying fallback after ${session.destination.name} failed`);
    }
  }
  throw new Error(`Upload failed for ${file.name}.`);
}

function renderDestinationSummary(destinations = []) {
  if (!destinationSummary) return;
  destinationSummary.textContent = '';
  if (!destinations.length) {
    const warning = document.createElement('p');
    warning.className = 'notice-copy warning-copy';
    warning.textContent = 'This portal is not fully configured yet. Contact the project operator before uploading production files.';
    destinationSummary.append(warning);
    return;
  }
  for (const destination of destinations.slice(0, 4)) {
    const item = document.createElement('div');
    item.className = 'destination-pill';
    const title = document.createElement('strong');
    title.textContent = destination.name;
    const meta = document.createElement('span');
    meta.textContent = `${destination.role || 'project'} · up to ${destination.maxFileSizeGb || 5000} GB`;
    item.append(title, meta);
    destinationSummary.append(item);
  }
}


function loadPendingFinalizations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_FINALIZATION_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function savePendingFinalizations(items) {
  localStorage.setItem(PENDING_FINALIZATION_KEY, JSON.stringify(items.slice(0, 50)));
}

function addPendingFinalization(file, session, driveFile, payload, error) {
  const pending = loadPendingFinalizations();
  const key = `${session.sessionId}:${driveFile?.id || ''}`;
  const entry = {
    key,
    createdAt: new Date().toISOString(),
    lastError: error?.message || 'Receipt finalization failed.',
    file: {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified || null
    },
    payload,
    session,
    driveFile
  };
  const filtered = pending.filter((item) => item.key !== key);
  filtered.unshift(entry);
  savePendingFinalizations(filtered);
  state.pendingFinalizations = filtered;
  renderPendingFinalizations();
}

function removePendingFinalization(key) {
  const pending = loadPendingFinalizations().filter((item) => item.key !== key);
  savePendingFinalizations(pending);
  state.pendingFinalizations = pending;
  renderPendingFinalizations();
}

function renderPendingFinalizations() {
  if (!pendingList || !pendingPanel) return;
  state.pendingFinalizations = loadPendingFinalizations();
  pendingList.textContent = '';
  for (const item of state.pendingFinalizations) {
    const row = document.createElement('article');
    row.className = 'receipt-row pending-row';
    const title = document.createElement('strong');
    title.textContent = item.file?.name || item.payload?.fileName || 'Uploaded file';
    const meta = document.createElement('p');
    meta.textContent = `${formatBytes(item.file?.size || item.payload?.fileSize)} · ${item.session?.destination?.name || item.payload?.destinationName || 'Vault storage'} · pending receipt`;
    const problem = document.createElement('p');
    problem.className = 'receipt-id';
    problem.textContent = `Last error: ${item.lastError || 'Unknown finalization error'}`;
    row.append(title, meta, problem);
    pendingList.append(row);
  }
  pendingPanel.classList.toggle('hidden', state.pendingFinalizations.length === 0);
}

async function completeUploadBody(body, session, driveFile) {
  const headers = body.portalKey ? { 'x-portal-key': body.portalKey } : {};
  return api('/api/upload-complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...body,
      sessionId: session.sessionId,
      destinationId: session.destination.id,
      destinationName: session.destination.name,
      driveFileId: driveFile?.id,
      driveFile
    })
  });
}

async function completeUploadWithRetry(file, session, driveFile, maxAttempts = 4) {
  const body = formPayload(file, []);
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await completeUploadBody(body, session, driveFile);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      setRowProgress(file, 100, `Receipt retry ${attempt}/${maxAttempts - 1}`);
      await sleep(Math.min(8000, 600 * 2 ** attempt));
    }
  }
  addPendingFinalization(file, session, driveFile, body, lastError);
  const error = new Error('File reached vault storage, but receipt finalization failed. Do not re-upload it; use the receipt recovery panel to retry finalization.');
  error.noFallback = true;
  throw error;
}

async function retryPendingFinalizations() {
  if (!retryPending) return;
  const pending = loadPendingFinalizations();
  if (!pending.length) return;
  retryPending.disabled = true;
  try {
    for (const item of pending) {
      try {
        const receipt = await completeUploadBody(item.payload, item.session, item.driveFile);
        state.receipts.push({ file: item.file || {}, session: item.session, receipt });
        removePendingFinalization(item.key);
        renderReceipts();
      } catch (error) {
        item.lastError = error.message;
        item.lastTriedAt = new Date().toISOString();
        const current = loadPendingFinalizations().filter((candidate) => candidate.key !== item.key);
        current.unshift(item);
        savePendingFinalizations(current);
        renderPendingFinalizations();
      }
    }
  } finally {
    retryPending.disabled = false;
  }
}

function renderReceipts() {
  if (!receiptList || !receiptPanel) return;
  receiptList.textContent = '';
  for (const item of state.receipts) {
    const entry = item.receipt?.entry || {};
    const row = document.createElement('article');
    row.className = 'receipt-row';
    const title = document.createElement('strong');
    title.textContent = entry.fileName || item.file.name;
    const meta = document.createElement('p');
    meta.textContent = `${formatBytes(entry.fileSize || item.file.size)} · ${entry.destinationName || item.session.destination.name} · ${entry.completedAt || 'completed'}`;
    const receiptId = document.createElement('p');
    receiptId.className = 'receipt-id';
    const submission = entry.submissionId ? `Submission: ${entry.submissionId} · ` : '';
    const fp = entry.fileFingerprint?.value ? ` · fp ${String(entry.fileFingerprint.value).slice(0, 12)}…` : '';
    receiptId.textContent = `${submission}Receipt ID: ${entry.id || item.session.sessionId}${entry.receiptSignature ? ` · signature ${String(entry.receiptSignature).slice(0, 16)}…` : ''}${fp}`;
    row.append(title, meta, receiptId);
    const download = item.receipt?.download;
    if (download?.downloadUrl) {
      const actions = document.createElement('div');
      actions.className = 'vault-file-actions';
      const link = document.createElement('a');
      link.className = 'secondary-btn compact';
      link.href = download.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Download';
      actions.append(link);
      if (download.expiresAt) {
        const expiry = document.createElement('p');
        expiry.className = 'receipt-id';
        expiry.textContent = `Link expires ${download.expiresAt}`;
        actions.append(expiry);
      }
      row.append(actions);
    }
    receiptList.append(row);
  }
  receiptPanel.classList.toggle('hidden', state.receipts.length === 0);
}

function clientVaultPayload(action, receiptId = '') {
  if (!clientVaultForm) return { action, receiptId };
  const data = new FormData(clientVaultForm);
  return {
    action,
    receiptId,
    clientEmail: data.get('clientEmail'),
    portalKey: data.get('portalKey')
  };
}

async function clientVaultApi(body) {
  const headers = body.portalKey ? { 'x-portal-key': body.portalKey } : {};
  return api('/api/client-vault', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

function vaultRestoreHint(fileName = '') {
  const name = String(fileName || '').toLowerCase();
  if (name.endsWith('.zip.enc')) {
    return {
      button: 'Download encrypted artifact',
      note: 'This is protected repo data. Download the matching direct restore kit, then decrypt it into the real ZIP before unzipping.'
    };
  }
  if (name.includes('direct-restore-kit') && name.endsWith('.zip')) {
    return {
      button: 'Download restore kit',
      note: 'This small ZIP contains the restore guide and key material needed to unlock the encrypted repo artifact.'
    };
  }
  if (name.endsWith('.skyesecrets')) {
    return {
      button: 'Download control pack',
      note: 'This is an encrypted SkyeSecure control pack. Use the owner-approved unlock lane before restoring its contents.'
    };
  }
  return {
    button: 'Download',
    note: ''
  };
}

function renderClientVaultItems(items = []) {
  state.clientVaultItems = items;
  if (!clientVaultList || !clientVaultCount) return;
  clientVaultList.textContent = '';
  clientVaultCount.textContent = items.length ? `${items.length} item${items.length === 1 ? '' : 's'}` : 'No files';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'muted big-copy';
    empty.textContent = 'No completed vault receipts were found for that email.';
    clientVaultList.append(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement('article');
    row.className = 'client-vault-row';
    const main = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.fileName || 'Vault file';
    const meta = document.createElement('p');
    meta.textContent = `${formatBytes(item.fileSize)} · ${item.projectName || 'No project label'} · ${item.completedAt || 'completed'}`;
    const proof = document.createElement('p');
    proof.className = 'receipt-id';
    const fp = item.fileFingerprint?.value ? ` · fp ${String(item.fileFingerprint.value).slice(0, 12)}…` : '';
    proof.textContent = `Receipt ${item.id}${item.scan?.status ? ` · scan ${item.scan.status}` : ''}${fp}`;
    const restoreHint = vaultRestoreHint(item.fileName);
    main.append(title, meta, proof);
    if (restoreHint.note) {
      const note = document.createElement('p');
      note.className = 'vault-restore-note';
      note.textContent = restoreHint.note;
      main.append(note);
    }

    const actions = document.createElement('div');
    actions.className = 'vault-file-actions';
    const download = document.createElement('button');
    download.className = 'secondary-btn compact';
    download.type = 'button';
    download.textContent = restoreHint.button;
    download.addEventListener('click', async () => {
      download.disabled = true;
      download.textContent = 'Preparing...';
      try {
        const result = await clientVaultApi(clientVaultPayload('download', item.id));
        window.open(result.downloadUrl, '_blank', 'noopener');
        showStatus(`Download link ready for ${result.item?.fileName || item.fileName}.`, 'success');
      } catch (error) {
        showStatus(error.message || 'Could not create download link.', 'error');
      } finally {
        download.disabled = false;
        download.textContent = restoreHint.button;
      }
    });
    actions.append(download);
    row.append(main, actions);
    clientVaultList.append(row);
  }
}

async function openClientVault() {
  const body = clientVaultPayload('list');
  const result = await clientVaultApi(body);
  renderClientVaultItems(result.items || []);
  showStatus(result.count ? 'Vault files loaded.' : 'No matching vault files found.', result.count ? 'success' : '');
}


function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (window.turnstile) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

async function renderTurnstile(siteKey) {
  if (!turnstileWrap || !siteKey) return;
  turnstileWrap.classList.remove('hidden');
  turnstileWrap.textContent = '';
  const target = document.createElement('div');
  turnstileWrap.append(target);
  await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
  if (!window.turnstile?.render) throw new Error('Human verification could not load. Refresh the page and try again.');
  window.turnstile.render(target, {
    sitekey: siteKey,
    callback: (token) => {
      const input = form.querySelector('input[name="turnstileToken"]');
      if (input) input.value = token;
    },
    'expired-callback': () => {
      const input = form.querySelector('input[name="turnstileToken"]');
      if (input) input.value = '';
    }
  });
}

async function loadPublicConfig() {
  const data = await api('/api/public-config');
  state.config = data.config;
  const config = state.config;
  if (config.brandName) {
    setText(brandName, config.brandName);
    setText(navBrandName, config.brandName.replace(/^Skyes Over London\s*/i, '') || config.brandName);
    document.title = config.brandName;
  }
  setText(publicHeadline, config.publicHeadline);
  setText(publicSubheadline, config.publicSubheadline);
  setText(publicInstructions, config.publicInstructions);
  setText(retentionNotice, config.retentionNotice);
  if (portalKeyWrap) portalKeyWrap.classList.toggle('hidden', !config.portalKeyRequired);
  if (destinationSelect) {
    destinationSelect.innerHTML = '<option value="">Auto route</option>';
    for (const destination of config.destinations || []) {
      const option = document.createElement('option');
      option.value = destination.id;
      option.textContent = `${destination.name}${destination.role === 'fallback' ? ' · fallback' : ''}`;
      destinationSelect.append(option);
    }
  }
  setText(destinationCount, String((config.destinations || []).length));
  setText(chunkSizeLabel, `${config.chunkSizeMb || 8} MB`);
  setText(portalModeLabel, config.portalKeyRequired ? 'Code protected' : 'Open link');
  if (clientVaultKeyWrap) clientVaultKeyWrap.classList.toggle('hidden', !config.portalKeyRequired);
  if (queueSummary && config.maxFilesPerSubmission) queueSummary.title = `${config.maxFilesPerSubmission} file submission limit · ${config.maxTotalSubmissionGb || 5000} GB total package limit`;
  if (config.turnstileSiteKey) {
    renderTurnstile(config.turnstileSiteKey).catch((error) => showStatus(error.message, 'error'));
  } else if (turnstileWrap) {
    turnstileWrap.classList.add('hidden');
    turnstileWrap.textContent = '';
  }
  renderDestinationSummary(config.destinations || []);
  renderFiles();
}

if (fileInput) fileInput.addEventListener('change', (event) => addFiles(event.target.files));
if (destinationSelect) destinationSelect.addEventListener('change', renderFiles);
if (clearQueue) {
  clearQueue.addEventListener('click', () => {
    if (state.uploading) return;
    state.files = [];
    if (fileInput) fileInput.value = '';
    renderFiles();
  });
}

if (dropzone) {
  for (const eventName of ['dragenter', 'dragover']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragging');
    });
  }

  for (const eventName of ['dragleave', 'drop']) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragging');
    });
  }

  dropzone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.uploading) return;
    if (!state.files.length) {
      showStatus('Choose at least one file before starting.', 'error');
      return;
    }
    const policyErrors = validateSelectedFiles();
    if (policyErrors.length) {
      showStatus(policyErrors.join(' '), 'error');
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    state.uploading = true;
    state.pauseRequested = false;
    state.submissionId = Object.keys(loadStoredSessions()).length ? (state.submissionId || randomId('cdvsub')) : randomId('cdvsub');
    state.receipts = [];
    renderReceipts();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    if (pauseUpload) pauseUpload.disabled = false;
    for (const button of form.querySelectorAll('.remove-file, #clearQueue')) button.disabled = true;
    hideStatus();

    try {
      for (const file of state.files) {
        const result = await uploadOne(file);
        state.receipts.push(result);
        renderReceipts();
      }
      showStatus('All uploads finished. Files were delivered and recorded in the intake ledger.', 'success');
    } catch (error) {
      showStatus(error.message || 'Upload failed.', 'error');
    } finally {
      state.uploading = false;
      state.uploadAbortController = null;
      if (pauseUpload) pauseUpload.disabled = true;
      if (submitButton) submitButton.disabled = false;
      for (const button of form.querySelectorAll('.remove-file, #clearQueue')) button.disabled = false;
    }
  });
}

if (retryPending) {
  retryPending.addEventListener('click', () => {
    retryPendingFinalizations().catch((error) => showStatus(error.message, 'error'));
  });
}

if (pauseUpload) {
  pauseUpload.addEventListener('click', () => {
    if (!state.uploading) return;
    state.pauseRequested = true;
    if (state.uploadAbortController) state.uploadAbortController.abort();
    showStatus('Pausing after the current network call. Press Start secure upload again to resume.', '');
  });
}

function receiptExportPayload() {
  return {
    app: 'client-drop-vault',
    exportedAt: new Date().toISOString(),
    submissionId: state.submissionId || '',
    receipts: state.receipts.map((item) => item.receipt?.entry || item.receipt || {})
  };
}

if (copyReceipts) {
  copyReceipts.addEventListener('click', async () => {
    const payload = JSON.stringify(receiptExportPayload(), null, 2);
    await navigator.clipboard.writeText(payload);
    showStatus('Receipt JSON copied.', 'success');
  });
}

if (downloadReceipts) {
  downloadReceipts.addEventListener('click', () => {
    const payload = JSON.stringify(receiptExportPayload(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-drop-vault-receipts-${state.submissionId || Date.now()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}

if (clientVaultForm) {
  clientVaultForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!clientVaultForm.checkValidity()) {
      clientVaultForm.reportValidity();
      return;
    }
    const button = clientVaultForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      await openClientVault();
    } catch (error) {
      renderClientVaultItems([]);
      showStatus(error.message || 'Could not open vault view.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  });
}

if (clearClientVault) {
  clearClientVault.addEventListener('click', () => {
    renderClientVaultItems([]);
    if (clientVaultCount) clientVaultCount.textContent = 'Locked';
    if (clientVaultForm) clientVaultForm.reset();
  });
}

renderPendingFinalizations();

loadPublicConfig().catch((error) => {
  showStatus(error.message || 'Could not load upload portal configuration.', 'error');
});
