const state = {
  config: null,
  ledger: [],
  sessions: [],
  events: [],
  vaultFilters: {
    query: '',
    client: '',
    status: ''
  }
};

const adminToken = document.querySelector('#adminToken');
const loadButton = document.querySelector('#loadConfig');
const saveButton = document.querySelector('#saveConfig');
const testButton = document.querySelector('#testDestinations');
const addButton = document.querySelector('#addDestination');
const notificationButton = document.querySelector('#testNotifications');
const healthButton = document.querySelector('#runHealth');
const maintenanceButton = document.querySelector('#runMaintenance');
const backupButton = document.querySelector('#runBackup');
const exportPanel = document.querySelector('#exportPanel');
const exportButtons = {
  ledgerCsv: document.querySelector('#exportLedgerCsv'),
  ledgerJson: document.querySelector('#exportLedgerJson'),
  sessionsCsv: document.querySelector('#exportSessionsCsv'),
  eventsCsv: document.querySelector('#exportEventsCsv'),
  allJson: document.querySelector('#exportAllJson')
};
const logoutButton = document.querySelector('#logoutOperator');
const workspace = document.querySelector('#adminWorkspace');
const ledgerPanel = document.querySelector('#ledgerPanel');
const eventsPanel = document.querySelector('#eventsPanel');
const statusBox = document.querySelector('#adminStatus');
const destinationList = document.querySelector('#destinationList');
const destinationTemplate = document.querySelector('#destinationTemplate');
const ledgerList = document.querySelector('#ledgerList');
const eventsList = document.querySelector('#eventsList');
const sessionsPanel = document.querySelector('#sessionsPanel');
const sessionsList = document.querySelector('#sessionsList');
const healthPanel = document.querySelector('#healthPanel');
const healthList = document.querySelector('#healthList');
const maintenancePanel = document.querySelector('#maintenancePanel');
const maintenanceList = document.querySelector('#maintenanceList');
const vaultFileCount = document.querySelector('#vaultFileCount');
const vaultTotalSize = document.querySelector('#vaultTotalSize');
const vaultLatestFile = document.querySelector('#vaultLatestFile');
const vaultClientCount = document.querySelector('#vaultClientCount');
const vaultSearch = document.querySelector('#vaultSearch');
const vaultClientFilter = document.querySelector('#vaultClientFilter');
const vaultStatusFilter = document.querySelector('#vaultStatusFilter');
const vaultClearFilters = document.querySelector('#vaultClearFilters');
const skyeSecureConsoleUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-secret-packs/app.html';

const fields = {
  brandName: document.querySelector('#configBrandName'),
  supportEmail: document.querySelector('#configSupportEmail'),
  publicHeadline: document.querySelector('#configPublicHeadline'),
  publicSubheadline: document.querySelector('#configPublicSubheadline'),
  publicInstructions: document.querySelector('#configPublicInstructions'),
  retentionNotice: document.querySelector('#configRetentionNotice'),
  requireUsageRights: document.querySelector('#configRequireUsageRights'),
  requireRetentionAck: document.querySelector('#configRequireRetentionAck'),
  requireClientName: document.querySelector('#configRequireClientName'),
  requireClientEmail: document.querySelector('#configRequireClientEmail'),
  requireProjectName: document.querySelector('#configRequireProjectName'),
  blockedExtensions: document.querySelector('#configBlockedExtensions'),
  routingMode: document.querySelector('#configRoutingMode'),
  chunkSizeMb: document.querySelector('#configChunkSize'),
  maxFilesPerSubmission: document.querySelector('#configMaxFilesPerSubmission'),
  maxTotalSubmissionGb: document.querySelector('#configMaxTotalSubmissionGb')
};

function showStatus(message, type = '') {
  statusBox.className = `status-card ${type}`.trim();
  statusBox.textContent = message;
  statusBox.classList.remove('hidden');
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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function entrySearchText(entry = {}) {
  const file = entry.driveFile || {};
  return [
    entry.id,
    entry.fileName,
    file.name,
    entry.clientName,
    entry.clientEmail,
    entry.projectName,
    entry.assetType,
    entry.destinationName,
    entry.destinationId,
    entry.submissionId,
    entry.clientReference,
    entry.scan?.status
  ].filter(Boolean).join(' ').toLowerCase();
}

function filteredLedger(entries = state.ledger) {
  const query = normalizeText(state.vaultFilters.query);
  const client = normalizeText(state.vaultFilters.client);
  const status = normalizeText(state.vaultFilters.status);
  return entries.filter((entry) => {
    if (query && !entrySearchText(entry).includes(query)) return false;
    if (client && normalizeText(entry.clientName || entry.clientEmail) !== client) return false;
    if (status && normalizeText(entry.scan?.status || 'unknown') !== status) return false;
    return true;
  });
}

function renderVaultSummary(entries = state.ledger) {
  const visibleEntries = filteredLedger(entries);
  const clients = new Set(entries.map((entry) => normalizeText(entry.clientName || entry.clientEmail)).filter(Boolean));
  const visibleClients = new Set(visibleEntries.map((entry) => normalizeText(entry.clientName || entry.clientEmail)).filter(Boolean));
  const totalBytes = visibleEntries.reduce((sum, entry) => sum + Number(entry.fileSize || entry.driveFile?.size || 0), 0);
  const latest = visibleEntries
    .slice()
    .sort((a, b) => Date.parse(b.completedAt || 0) - Date.parse(a.completedAt || 0))[0];

  if (vaultFileCount) vaultFileCount.textContent = `${visibleEntries.length} of ${entries.length} file${entries.length === 1 ? '' : 's'}`;
  if (vaultTotalSize) vaultTotalSize.textContent = formatBytes(totalBytes);
  if (vaultLatestFile) vaultLatestFile.textContent = latest?.fileName || latest?.driveFile?.name || 'No files loaded';
  if (vaultClientCount) vaultClientCount.textContent = String(visibleClients.size || clients.size || 0);

  if (vaultClientFilter) {
    const previous = vaultClientFilter.value;
    const labels = Array.from(new Map(entries.map((entry) => {
      const label = entry.clientName || entry.clientEmail || '';
      return [normalizeText(label), label];
    }).filter(([key]) => key)).values()).sort((a, b) => a.localeCompare(b));
    vaultClientFilter.textContent = '';
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'All clients';
    vaultClientFilter.append(all);
    for (const label of labels) {
      const option = document.createElement('option');
      option.value = normalizeText(label);
      option.textContent = label;
      vaultClientFilter.append(option);
    }
    vaultClientFilter.value = labels.some((label) => normalizeText(label) === previous) ? previous : '';
    state.vaultFilters.client = vaultClientFilter.value;
  }
}

function stripBearer(value) {
  return String(value || '').replace(/^Bearer\s+/i, '').trim();
}

function storedGateBearer() {
  const keys = [
    'METRAIYUX_GATE_SESSION',
    'SKYGATEFS27_GATE_SESSION',
    'SKYE_GATE_SESSION',
    'metraiyux_admin_session',
    'metraiyux_gate_session',
    'skye_gate_session',
    'skygate_session',
    'skyegate_session',
    'free99_gate_session',
    'zero_os_gate_session'
  ];
  for (const store of [sessionStorage, localStorage]) {
    for (const key of keys) {
      try {
        const token = stripBearer(store.getItem(key));
        if (token) return token;
      } catch (_error) {}
    }
  }
  return '';
}

function skygateBearer() {
  return stripBearer(window.MetrAIyuxGateBridge?.current?.()?.token) || storedGateBearer();
}

function adminAuthHeaders(extra = {}) {
  const bearer = stripBearer(adminToken.value.trim()) || skygateBearer();
  const headers = { ...extra };
  if (bearer) {
    headers.authorization = `Bearer ${bearer}`;
    headers['x-admin-token'] = bearer;
    headers['x-free99-admin-code'] = bearer;
    headers['x-free99-gate-session'] = bearer;
    headers['x-skye-gate-session'] = bearer;
    headers['x-skye-platform'] = 'metraiyux-0s-admin';
    headers['x-skye-usage-lane'] = 'skyevault-admin-dashboard';
  }
  return headers;
}

function isSecretPack(entry = {}) {
  const file = entry.driveFile || {};
  const name = String(entry.fileName || file.name || '').toLowerCase();
  const type = String(entry.assetType || '').toLowerCase();
  return name.endsWith('.skyesecrets') || type.includes('secret pack') || type.includes('skyesecure');
}

function skyeSecureUnlockHref(entry = {}) {
  const file = entry.driveFile || {};
  const params = new URLSearchParams({
    receipt: entry.id || '',
    session: entry.sessionId || '',
    file: entry.fileName || file.name || 'secret-pack.skyesecrets'
  });
  const fingerprint = entry.fileFingerprint?.value || entry.sha256 || '';
  if (fingerprint) params.set('sha256', fingerprint);
  return `${skyeSecureConsoleUrl}?${params.toString()}`;
}

async function api(path, options = {}) {
  const headers = adminAuthHeaders({
    'content-type': 'application/json',
    ...(options.headers || {})
  });
  const response = await fetch(path, {
    ...options,
    headers
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

function destinationFromCard(card) {
  const destination = {};
  for (const input of card.querySelectorAll('[data-field]')) {
    const field = input.dataset.field;
    if (input.type === 'checkbox') destination[field] = input.checked;
    else if (input.type === 'number') destination[field] = Number(input.value || 0);
    else destination[field] = input.value.trim();
  }
  return destination;
}

function collectConfig() {
  return {
    brandName: fields.brandName.value.trim(),
    supportEmail: fields.supportEmail.value.trim(),
    publicHeadline: fields.publicHeadline.value.trim(),
    publicSubheadline: fields.publicSubheadline.value.trim(),
    publicInstructions: fields.publicInstructions.value.trim(),
    retentionNotice: fields.retentionNotice.value.trim(),
    requireUsageRights: fields.requireUsageRights.checked,
    requireRetentionAck: fields.requireRetentionAck.checked,
    requireClientName: fields.requireClientName.checked,
    requireClientEmail: fields.requireClientEmail.checked,
    requireProjectName: fields.requireProjectName.checked,
    blockedExtensions: fields.blockedExtensions.value.split(',').map((item) => item.trim()).filter(Boolean),
    routingMode: fields.routingMode.value,
    chunkSizeMb: Number(fields.chunkSizeMb.value || 8),
    maxFilesPerSubmission: Number(fields.maxFilesPerSubmission.value || 25),
    maxTotalSubmissionGb: Number(fields.maxTotalSubmissionGb.value || 5000),
    destinations: Array.from(destinationList.querySelectorAll('.destination-card')).map(destinationFromCard)
  };
}

function fillField(card, field, value) {
  const input = card.querySelector(`[data-field="${field}"]`);
  if (!input) return;
  if (input.type === 'checkbox') input.checked = Boolean(value);
  else input.value = value ?? '';
}

function renderDestination(destination = {}) {
  const card = destinationTemplate.content.firstElementChild.cloneNode(true);
  fillField(card, 'id', destination.id || '');
  fillField(card, 'name', destination.name || '');
  fillField(card, 'folderId', destination.folderId || '');
  fillField(card, 'enabled', destination.enabled !== false);
  fillField(card, 'priority', destination.priority || destinationList.children.length + 1);
  fillField(card, 'role', destination.role || 'project');
  fillField(card, 'description', destination.description || '');
  fillField(card, 'maxFileSizeGb', destination.maxFileSizeGb || 5000);
  fillField(card, 'accept', destination.accept || '*');

  const title = card.querySelector('.destination-title');
  const updateTitle = () => {
    const config = destinationFromCard(card);
    title.textContent = `${config.name || 'Destination'} · ${config.id || 'no-id'}`;
  };
  card.addEventListener('input', updateTitle);
  card.querySelector('.remove-destination').addEventListener('click', () => card.remove());
  updateTitle();
  destinationList.append(card);
}

function renderConfig(config) {
  fields.brandName.value = config.brandName || '';
  fields.supportEmail.value = config.supportEmail || '';
  fields.publicHeadline.value = config.publicHeadline || '';
  fields.publicSubheadline.value = config.publicSubheadline || '';
  fields.publicInstructions.value = config.publicInstructions || '';
  fields.retentionNotice.value = config.retentionNotice || '';
  fields.requireUsageRights.checked = config.requireUsageRights !== false;
  fields.requireRetentionAck.checked = config.requireRetentionAck !== false;
  fields.requireClientName.checked = config.requireClientName !== false;
  fields.requireClientEmail.checked = config.requireClientEmail !== false;
  fields.requireProjectName.checked = config.requireProjectName !== false;
  fields.blockedExtensions.value = (config.blockedExtensions || []).join(',');
  fields.routingMode.value = config.routingMode || 'priority';
  fields.chunkSizeMb.value = config.chunkSizeMb || 8;
  fields.maxFilesPerSubmission.value = config.maxFilesPerSubmission || 25;
  fields.maxTotalSubmissionGb.value = config.maxTotalSubmissionGb || 5000;
  destinationList.innerHTML = '';
  for (const destination of config.destinations || []) renderDestination(destination);
}

function appendText(tag, text, className = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}



function healthClass(item) {
  if (item.ok) return 'ok';
  return item.severity === 'warning' || item.severity === 'info' ? 'warn' : 'fail';
}

function renderHealth(data = {}) {
  if (!healthList || !healthPanel) return;
  healthPanel.classList.remove('hidden');
  healthList.textContent = '';
  const cards = [];
  for (const item of data.checks || []) cards.push(item);
  for (const destination of data.destinations || []) {
    cards.push({
      name: `Destination: ${destination.name || destination.id}`,
      ok: destination.ok,
      severity: destination.ok ? 'info' : 'required',
      detail: (destination.checks || []).map((check) => `${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.detail}`).join(' | ')
    });
  }
  cards.push({
    name: 'Notifications',
    ok: Boolean(data.notifications?.webhookConfigured || data.notifications?.resendConfigured || data.notifications?.clientReceiptEmailsEnabled),
    severity: 'warning',
    detail: JSON.stringify(data.notifications || {})
  });
  cards.push({
    name: 'Scanner workflow',
    ok: true,
    severity: data.scanner?.mode === 'none' ? 'warning' : 'info',
    detail: JSON.stringify(data.scanner || {})
  });
  cards.push({
    name: 'Abuse controls',
    ok: true,
    severity: 'info',
    detail: JSON.stringify(data.abuse || {})
  });
  for (const item of cards) {
    const card = document.createElement('article');
    card.className = `health-card ${healthClass(item)}`;
    card.append(appendText('strong', item.name || 'Check'), appendText('p', item.detail || 'No detail.'));
    healthList.append(card);
  }
}

function renderMaintenance(data = {}) {
  if (!maintenanceList || !maintenancePanel) return;
  maintenancePanel.classList.remove('hidden');
  maintenanceList.textContent = '';
  const summary = data.summary || {};
  const top = document.createElement('article');
  top.className = 'ledger-row';
  top.append(
    appendText('strong', summary.dryRun ? 'Maintenance dry run' : 'Maintenance sweep complete'),
    appendText('p', `Scanned ${summary.scanned || 0} sessions · stale found ${summary.staleFound || 0} · updated ${summary.staleUpdated || 0} · failures ${summary.updateFailures || 0}`),
    appendText('p', data.report?.saved?.id ? `Report file: ${data.report.saved.id}` : 'No report file was written for this run.')
  );
  maintenanceList.append(top);
  for (const session of summary.staleSessions || []) {
    const row = document.createElement('article');
    row.className = 'ledger-row pending-row';
    row.append(
      appendText('strong', session.fileName || session.sessionId),
      appendText('p', `${session.clientName || 'Unknown client'} · ${session.projectName || 'No project'} · ${session.ageHours} hours old`),
      appendText('p', `Session ${session.sessionId} · previous status ${session.status}`)
    );
    maintenanceList.append(row);
  }
}

function renderSessions(sessions = []) {
  sessionsList.textContent = '';
  if (!sessions.length) {
    sessionsList.append(appendText('p', 'No session manifests recorded yet.', 'muted'));
    return;
  }
  const now = Date.now();
  for (const session of sessions.slice(0, 80)) {
    const row = document.createElement('article');
    row.className = `ledger-row ${session.status === 'pending' ? 'pending-row' : ''}`;
    const title = appendText('strong', session.file?.name || session.sessionId || 'Upload session');
    const ageMs = session.createdAt ? now - Date.parse(session.createdAt) : 0;
    const ageLabel = ageMs > 0 ? `${Math.max(1, Math.round(ageMs / 60000))} min old` : 'age unknown';
    const clientLine = appendText('p', `${session.intake?.clientName || 'Unknown client'} · ${session.intake?.projectName || 'No project label'} · ${formatBytes(session.file?.size || 0)}`);
    const statusLine = appendText('p', `${session.status || 'unknown'} · ${session.destination?.name || session.destination?.id || 'destination'} · ${session.createdAt || ''} · ${ageLabel}`);
    const proofLine = appendText('p', `Session: ${session.sessionId}${session.intake?.submissionId ? ` · submission ${session.intake.submissionId}` : ''}${session.receiptId ? ` · receipt ${session.receiptId}` : ''}${session.file?.fingerprint?.value ? ` · fp ${String(session.file.fingerprint.value).slice(0, 12)}…` : ''}`);
    row.append(title, clientLine, statusLine, proofLine);
    sessionsList.append(row);
  }
}


function renderEvents(events = []) {
  if (!eventsList) return;
  eventsList.textContent = '';
  if (!events.length) {
    eventsList.append(appendText('p', 'No audit events recorded yet.', 'muted'));
    return;
  }
  for (const event of events.slice(0, 80)) {
    const row = document.createElement('article');
    row.className = 'ledger-row';
    const title = appendText('strong', event.type || 'event');
    const detail = event.detail || {};
    const primary = appendText('p', [detail.fileName, detail.destinationName || detail.destinationId, detail.receiptId].filter(Boolean).join(' · ') || 'Operator/system event');
    const meta = appendText('p', `${event.createdAt || ''}${detail.submissionId ? ` · submission ${detail.submissionId}` : ''}${detail.sessionId ? ` · session ${detail.sessionId}` : ''}`);
    row.append(title, primary, meta);
    eventsList.append(row);
  }
}

function renderLedger(entries = []) {
  ledgerList.textContent = '';
  const visibleEntries = filteredLedger(entries);
  renderVaultSummary(entries);
  if (!entries.length) {
    ledgerList.append(appendText('p', 'No uploads recorded yet.', 'muted'));
    return;
  }
  if (!visibleEntries.length) {
    ledgerList.append(appendText('p', 'No vault files match those filters.', 'muted'));
    return;
  }
  for (const entry of visibleEntries.slice(0, 200)) {
    const row = document.createElement('article');
    row.className = 'ledger-row';
    const file = entry.driveFile || {};
    const title = appendText('strong', entry.fileName || file.name || 'Uploaded file');
    const clientLine = appendText(
      'p',
      `${entry.clientName || 'Unknown client'} · ${entry.projectName || 'No project label'} · ${entry.assetType || 'Project asset'} · ${formatBytes(entry.fileSize || file.size)}`
    );
    const detailLine = appendText('p', `${entry.clientEmail || 'No email'}${entry.deadline ? ` · needed by ${entry.deadline}` : ''}${entry.clientReference ? ` · ref ${entry.clientReference}` : ''}`);
    const metaLine = appendText('p', `${entry.destinationName || entry.destinationId || 'Destination'}${entry.submissionId ? ` · submission ${entry.submissionId}` : ''} · ${entry.completedAt || ''}${entry.scan?.status ? ` · scan ${entry.scan.status}` : ''}${entry.receiptSignature ? ` · sig ${String(entry.receiptSignature).slice(0, 16)}…` : ''}`);
    if (file.webViewLink) {
      const separator = document.createTextNode(' ');
      const link = document.createElement('a');
      link.href = file.webViewLink;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Open vault object';
      metaLine.append(separator, link);
    }
    const actions = document.createElement('div');
    actions.className = 'button-row ledger-actions';
    const download = document.createElement('button');
    download.className = 'primary-btn compact';
    download.type = 'button';
    download.textContent = 'Download file';
    download.addEventListener('click', async () => {
      download.disabled = true;
      download.textContent = 'Preparing...';
      try {
        const data = await api('/api/admin-vault-download', {
          method: 'POST',
          body: JSON.stringify({ receiptId: entry.id })
        });
        window.open(data.downloadUrl, '_blank', 'noopener');
        showStatus(`Gate accepted. Temporary signed download ticket ready for ${data.item?.fileName || entry.fileName || 'vault file'}.`, 'success');
      } catch (error) {
        showStatus(error.message, 'error');
      } finally {
        download.disabled = false;
        download.textContent = 'Download file';
      }
    });
    const replay = document.createElement('button');
    replay.className = 'secondary-btn compact';
    replay.type = 'button';
    replay.textContent = 'Replay notification';
    replay.addEventListener('click', () => replayNotification(entry.id, false).catch((error) => showStatus(error.message, 'error')));
    const replayClient = document.createElement('button');
    replayClient.className = 'secondary-btn compact';
    replayClient.type = 'button';
    replayClient.textContent = 'Replay + client receipt';
    replayClient.addEventListener('click', () => replayNotification(entry.id, true).catch((error) => showStatus(error.message, 'error')));
    actions.append(download, replay, replayClient);
    if (isSecretPack(entry)) {
      const unlock = document.createElement('a');
      unlock.className = 'secondary-btn compact';
      unlock.href = skyeSecureUnlockHref(entry);
      unlock.target = '_blank';
      unlock.rel = 'noopener';
      unlock.textContent = 'Unlock in SkyeSecure';
      actions.append(unlock);
    }
    row.append(title, clientLine, detailLine, metaLine, actions);
    ledgerList.append(row);
  }
  if (visibleEntries.length > 200) {
    ledgerList.append(appendText('p', 'Showing first 200 matching files. Narrow the search to see a specific object.', 'muted'));
  }
}

function refreshVaultBrowser() {
  renderLedger(state.ledger);
}


async function downloadAdminExport(type, format) {
  const headers = adminAuthHeaders();
  const response = await fetch(`/api/admin-export?type=${encodeURIComponent(type)}&format=${encodeURIComponent(format)}`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Export failed with ${response.status}.`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `client-drop-vault-${type}-${new Date().toISOString().replace(/[:.]/g, '-')}.${format === 'csv' ? 'csv' : 'json'}`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function replayNotification(receiptId, sendClientReceipt = false) {
  const data = await api('/api/admin-notification-replay', {
    method: 'POST',
    body: JSON.stringify({ receiptId, sendClientReceipt })
  });
  showStatus(data.ok ? `Notification replayed for ${receiptId}.` : `Replay finished with channel failures for ${receiptId}.`, data.ok ? 'success' : 'error');
}

async function loadDashboard() {
  const data = await api('/api/admin-config?ledger=true&sessions=true&events=true');
  state.config = data.config;
  state.ledger = data.ledger?.entries || [];
  state.sessions = data.sessions || [];
  state.events = data.events || [];
  renderConfig(state.config);
  renderSessions(state.sessions);
  renderEvents(state.events);
  renderLedger(state.ledger);
  workspace.classList.remove('hidden');
  sessionsPanel.classList.remove('hidden');
  if (eventsPanel) eventsPanel.classList.remove('hidden');
  if (exportPanel) exportPanel.classList.remove('hidden');
  ledgerPanel.classList.remove('hidden');
  showStatus(`Loaded config from ${data.source}. Actor: ${data.actor?.actor || data.actor?.type || 'admin'}.`, 'success');
}

loadButton.addEventListener('click', () => {
  loadDashboard().catch((error) => showStatus(error.message, 'error'));
});

saveButton.addEventListener('click', async () => {
  try {
    saveButton.disabled = true;
    const data = await api('/api/admin-config', {
      method: 'POST',
      body: JSON.stringify({ config: collectConfig() })
    });
    state.config = data.config;
    renderConfig(state.config);
    showStatus('Saved routing config into the vault.', 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    saveButton.disabled = false;
  }
});

addButton.addEventListener('click', () => renderDestination({
  id: `destination-${destinationList.children.length + 1}`,
  name: `Destination ${destinationList.children.length + 1}`,
  enabled: true,
  priority: destinationList.children.length + 1,
  role: 'project',
  maxFileSizeGb: 5000,
  accept: '*'
}));

testButton.addEventListener('click', async () => {
  try {
    testButton.disabled = true;
    const data = await api('/api/admin-drive-test', {
      method: 'POST',
      body: JSON.stringify({ writeTest: true })
    });
    const cards = Array.from(destinationList.querySelectorAll('.destination-card'));
    for (const result of data.results || []) {
      const card = cards.find((candidate) => destinationFromCard(candidate).id === result.id);
      const output = card?.querySelector('.test-output');
      if (!output) continue;
      output.classList.remove('hidden');
      output.textContent = JSON.stringify(result, null, 2);
    }
    showStatus('R2 access test finished. Review each destination card.', 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    testButton.disabled = false;
  }
});



if (healthButton) {
  healthButton.addEventListener('click', async () => {
    try {
      healthButton.disabled = true;
      const data = await api('/api/admin-health', { method: 'POST', body: JSON.stringify({ writeTest: true }) });
      renderHealth(data);
      showStatus(data.ok ? 'Health preflight passed.' : 'Health preflight found required failures. Review readiness gates.', data.ok ? 'success' : 'error');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      healthButton.disabled = false;
    }
  });
}

if (maintenanceButton) {
  maintenanceButton.addEventListener('click', async () => {
    try {
      maintenanceButton.disabled = true;
      const data = await api('/api/maintenance-sweep', { method: 'POST', body: JSON.stringify({ staleHours: 72, dryRun: false }) });
      renderMaintenance(data);
      showStatus('Maintenance sweep finished. Review stale-session results.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      maintenanceButton.disabled = false;
    }
  });
}


if (backupButton) {
  backupButton.addEventListener('click', async () => {
    try {
      backupButton.disabled = true;
      const data = await api('/api/admin-backup', { method: 'POST', body: JSON.stringify({ includeEvents: true, includeSessions: true }) });
      showStatus(`Metadata backup created: ${data.backup?.name || data.backup?.saved?.id || 'backup file'}.`, 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      backupButton.disabled = false;
    }
  });
}

const exportMap = [
  [exportButtons.ledgerCsv, 'ledger', 'csv'],
  [exportButtons.ledgerJson, 'ledger', 'json'],
  [exportButtons.sessionsCsv, 'sessions', 'csv'],
  [exportButtons.eventsCsv, 'events', 'csv'],
  [exportButtons.allJson, 'all', 'json']
];
for (const [button, type, format] of exportMap) {
  if (!button) continue;
  button.addEventListener('click', async () => {
    try {
      button.disabled = true;
      await downloadAdminExport(type, format);
      showStatus(`Export downloaded: ${type}.${format}.`, 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });
}

if (notificationButton) {
  notificationButton.addEventListener('click', async () => {
    try {
      notificationButton.disabled = true;
      const data = await api('/api/admin-notification-test', { method: 'POST', body: JSON.stringify({}) });
      showStatus(data.configured ? 'Notification test finished. Check configured channels.' : 'No notification channel is configured yet. Add NOTIFY_WEBHOOK_URL or Resend env vars.', data.ok ? 'success' : 'error');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      notificationButton.disabled = false;
    }
  });
}

if (vaultSearch) {
  vaultSearch.addEventListener('input', () => {
    state.vaultFilters.query = vaultSearch.value;
    refreshVaultBrowser();
  });
}

if (vaultClientFilter) {
  vaultClientFilter.addEventListener('change', () => {
    state.vaultFilters.client = vaultClientFilter.value;
    refreshVaultBrowser();
  });
}

if (vaultStatusFilter) {
  vaultStatusFilter.addEventListener('change', () => {
    state.vaultFilters.status = vaultStatusFilter.value;
    refreshVaultBrowser();
  });
}

if (vaultClearFilters) {
  vaultClearFilters.addEventListener('click', () => {
    state.vaultFilters = { query: '', client: '', status: '' };
    if (vaultSearch) vaultSearch.value = '';
    if (vaultClientFilter) vaultClientFilter.value = '';
    if (vaultStatusFilter) vaultStatusFilter.value = '';
    refreshVaultBrowser();
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    await fetch('/api/operator-logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/operator.html?return=/admin.html';
  });
}

loadDashboard().catch((error) => {
  showStatus(error.message || 'Could not load the admin dashboard.', 'error');
});
