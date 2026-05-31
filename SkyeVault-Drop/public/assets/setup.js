const checklistItems = [
  ['cloudflare-account', 'Use/select the Cloudflare account that owns the vault.'],
  ['r2-bucket', 'Create or confirm the private R2 bucket.'],
  ['r2-token', 'Create an R2 API token/access key for this bucket.'],
  ['r2-prefixes', 'Choose config, primary intake, overflow, and backup prefixes.'],
  ['github-repo', 'Push this package to a private GitHub repo.'],
  ['netlify-site', 'Create a Netlify site from the GitHub repo.'],
  ['env-vars', 'Add the generated environment variables in Netlify.'],
  ['redeploy', 'Trigger a fresh Netlify deploy after adding env vars.'],
  ['diagnostics', 'Run live diagnostics from this setup page.'],
  ['small-upload', 'Upload one small proof file through the client portal.'],
  ['large-upload', 'Upload one real large-video proof before trusting it with client 4K footage.'],
  ['notification-test', 'Send one operator notification test and verify it arrives.'],
  ['repo-snapshot', 'Run one sanitized repo snapshot dry run from a source repo that uses this vault.']
];

const stateKey = 'cdv-setup-command-center-v2';
const checklistKey = 'cdv-setup-checklist-v1';
const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const defaults = {
  siteOrigin: '',
  customOrigin: '',
  operatorSessionSecretValue: '',
  receiptSigningSecretValue: '',
  portalKeyValue: '',
  serviceAccountEmail: '',
  configFolderId: '',
  r2BucketValue: 'client-drop-vault',
  brandNameValue: 'SkyeVault-Drop',
  supportEmailValue: '',
  publicHeadlineValue: 'Files, media, and repo packages land in one receipt-backed vault.',
  publicSubheadlineValue: 'Choose the room: upload files, recover vault items, review repo workflow, or read the proof route. No giant scroll, no loose handoff.',
  publicInstructionsValue: 'Add project context, attach files or a sanitized repo package, confirm permission, and keep this tab open until the receipt finishes.',
  retentionNoticeValue: 'Vault uploads are used for intake, production, review, delivery, and proof. Keep secrets, private keys, databases, dependency folders, and generated state in a separate secret-boundary package.',
  requireUsageRightsValue: true,
  requireRetentionAckValue: true,
  requireClientNameValue: true,
  requireClientEmailValue: true,
  requireProjectNameValue: true,
  blockedExtensionsValue: '.exe,.msi,.bat,.cmd,.scr,.ps1,.vbs,.js,.jar,.com,.sh',
  routingModeValue: 'priority',
  chunkSizeValue: 8,
  maxFilesPerSubmissionValue: 25,
  maxTotalSubmissionGbValue: 5000,
  privateKeyValue: '',
  notifyWebhookUrl: '',
  notifyWebhookSecret: '',
  resendApiKey: '',
  notifyEmailTo: '',
  notifyEmailFrom: '',
  clientReceiptEmails: 'false',
  clientReceiptEmailFrom: '',
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  scannerMode: 'none',
  scannerWebhookUrl: '',
  scannerWebhookSecret: '',
  scanBlockFlagged: 'false',
  backupFolderId: '',
  destinations: [
    {
      id: 'primary',
      name: 'Primary Client Intake',
      folderId: '',
      enabled: true,
      priority: 1,
      role: 'primary',
      description: 'Main intake folder for website assets, documents, images, and video.',
      maxFileSizeGb: 5000,
      accept: '*'
    },
    {
      id: 'overflow',
      name: 'Overflow Intake',
      folderId: '',
      enabled: true,
      priority: 2,
      role: 'fallback',
      description: 'Fallback folder used when the primary destination cannot receive uploads.',
      maxFileSizeGb: 5000,
      accept: '*'
    }
  ]
};

let setupState = loadState();

function loadState() {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(stateKey)) || {}) };
  } catch {
    return { ...defaults };
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(collectState()));
}

function loadChecklist() {
  try {
    return JSON.parse(localStorage.getItem(checklistKey)) || {};
  } catch {
    return {};
  }
}

function saveChecklist(values) {
  localStorage.setItem(checklistKey, JSON.stringify(values));
}

function randomToken(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeOrigin(value) {
  const raw = String(value || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return raw;
  }
}

function normalizePrivateKey(raw) {
  return String(raw || '').trim().replace(/\r\n/g, '\n').replace(/\n/g, '\\n');
}

function safeEnv(value) {
  const stringValue = String(value || '');
  if (!stringValue) return '';
  if (/\s|"|'|\{|\}|\n/.test(stringValue)) return JSON.stringify(stringValue);
  return stringValue;
}

function cleanId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function collectDestinations() {
  return qa('.setup-destination-card').map((card, index) => {
    const read = (field) => q(`[data-field="${field}"]`, card);
    const id = cleanId(read('id').value || `destination-${index + 1}`);
    return {
      id,
      name: read('name').value.trim() || id || `Destination ${index + 1}`,
      folderId: read('folderId').value.trim(),
      enabled: read('enabled').checked,
      priority: Number(read('priority').value || index + 1),
      role: read('role').value || 'project',
      description: read('description').value.trim(),
      maxFileSizeGb: Number(read('maxFileSizeGb').value || 5000),
      accept: read('accept').value.trim() || '*'
    };
  });
}

function collectState() {
  return {
    siteOrigin: q('#siteOrigin').value.trim(),
    customOrigin: q('#customOrigin').value.trim(),
    operatorSessionSecretValue: q('#operatorSessionSecretValue').value.trim(),
    receiptSigningSecretValue: q('#receiptSigningSecretValue').value.trim(),
    portalKeyValue: q('#portalKeyValue').value.trim(),
    serviceAccountEmail: q('#serviceAccountEmail').value.trim(),
    configFolderId: q('#configFolderId').value.trim(),
    r2BucketValue: q('#r2BucketValue')?.value.trim() || 'client-drop-vault',
    brandNameValue: q('#brandNameValue').value.trim(),
    supportEmailValue: q('#supportEmailValue').value.trim(),
    publicHeadlineValue: q('#publicHeadlineValue').value.trim(),
    publicSubheadlineValue: q('#publicSubheadlineValue').value.trim(),
    publicInstructionsValue: q('#publicInstructionsValue').value.trim(),
    retentionNoticeValue: q('#retentionNoticeValue').value.trim(),
    requireUsageRightsValue: q('#requireUsageRightsValue').checked,
    requireRetentionAckValue: q('#requireRetentionAckValue').checked,
    requireClientNameValue: q('#requireClientNameValue').checked,
    requireClientEmailValue: q('#requireClientEmailValue').checked,
    requireProjectNameValue: q('#requireProjectNameValue').checked,
    blockedExtensionsValue: q('#blockedExtensionsValue').value.trim(),
    routingModeValue: q('#routingModeValue').value,
    chunkSizeValue: Number(q('#chunkSizeValue').value || 8),
    maxFilesPerSubmissionValue: Number(q('#maxFilesPerSubmissionValue').value || 25),
    maxTotalSubmissionGbValue: Number(q('#maxTotalSubmissionGbValue').value || 5000),
    privateKeyValue: q('#privateKeyValue').value,
    notifyWebhookUrl: q('#notifyWebhookUrl')?.value.trim() || '',
    notifyWebhookSecret: q('#notifyWebhookSecret')?.value.trim() || '',
    resendApiKey: q('#resendApiKey')?.value.trim() || '',
    notifyEmailTo: q('#notifyEmailTo')?.value.trim() || '',
    notifyEmailFrom: q('#notifyEmailFrom')?.value.trim() || '',
    clientReceiptEmails: q('#clientReceiptEmails')?.value || 'false',
    clientReceiptEmailFrom: q('#clientReceiptEmailFrom')?.value.trim() || '',
    turnstileSiteKey: q('#turnstileSiteKey')?.value.trim() || '',
    turnstileSecretKey: q('#turnstileSecretKey')?.value.trim() || '',
    scannerMode: q('#scannerMode')?.value || 'none',
    scannerWebhookUrl: q('#scannerWebhookUrl')?.value.trim() || '',
    scannerWebhookSecret: q('#scannerWebhookSecret')?.value.trim() || '',
    scanBlockFlagged: q('#scanBlockFlagged')?.value || 'false',
    backupFolderId: q('#backupFolderId')?.value.trim() || '',
    destinations: collectDestinations()
  };
}

function buildVaultConfig(state) {
  return {
    brandName: state.brandNameValue || 'SkyeVault-Drop',
    supportEmail: state.supportEmailValue || '',
    publicHeadline: state.publicHeadlineValue || 'Files, media, and repo packages land in one receipt-backed vault.',
    publicSubheadline: state.publicSubheadlineValue || 'Choose the room: upload files, recover vault items, review repo workflow, or read the proof route. No giant scroll, no loose handoff.',
    publicInstructions: state.publicInstructionsValue || 'Add project context, attach files or a sanitized repo package, confirm permission, and keep this tab open until the receipt finishes.',
    retentionNotice: state.retentionNoticeValue || 'Vault uploads are used for intake, production, review, delivery, and proof. Keep secrets, private keys, databases, dependency folders, and generated state in a separate secret-boundary package.',
    requireUsageRights: state.requireUsageRightsValue !== false,
    requireRetentionAck: state.requireRetentionAckValue !== false,
    requireClientName: state.requireClientNameValue !== false,
    requireClientEmail: state.requireClientEmailValue !== false,
    requireProjectName: state.requireProjectNameValue !== false,
    blockedExtensions: String(state.blockedExtensionsValue || '').split(',').map((item) => item.trim()).filter(Boolean),
    routingMode: state.routingModeValue || 'priority',
    chunkSizeMb: Number(state.chunkSizeValue || 8),
    maxFilesPerSubmission: Number(state.maxFilesPerSubmissionValue || 25),
    maxTotalSubmissionGb: Number(state.maxTotalSubmissionGbValue || 5000),
    destinations: state.destinations.map((destination, index) => ({
      id: cleanId(destination.id || `destination-${index + 1}`),
      name: destination.name || `Destination ${index + 1}`,
      folderId: destination.folderId || 'replace-folder-id',
      enabled: destination.enabled !== false,
      priority: Number(destination.priority || index + 1),
      role: destination.role || 'project',
      description: destination.description || '',
      maxFileSizeGb: Number(destination.maxFileSizeGb || 5000),
      accept: destination.accept || '*'
    }))
  };
}

function buildOutputs() {
  const state = collectState();
  const origins = [normalizeOrigin(state.siteOrigin), normalizeOrigin(state.customOrigin)].filter(Boolean);
  const vaultConfig = buildVaultConfig(state);
  const envLines = [
    ['ALLOWED_ORIGINS', origins.join(',')],
    ['OPERATOR_SESSION_SECRET', state.operatorSessionSecretValue || 'generate-a-long-random-operator-session-secret'],
    ['CLIENT_PORTAL_KEY', state.portalKeyValue || 'replace-with-client-upload-code'],
    ['R2_ACCESS_KEY_ID', state.serviceAccountEmail || 'replace-with-r2-access-key-id'],
    ['R2_SECRET_ACCESS_KEY', state.privateKeyValue || 'replace-with-r2-secret-access-key'],
    ['R2_BUCKET', state.r2BucketValue || 'client-drop-vault'],
    ['R2_CONFIG_PREFIX', state.configFolderId || 'vault-system'],
    ['RECEIPT_SIGNING_SECRET', state.receiptSigningSecretValue || 'generate-a-separate-long-random-receipt-secret'],
    ['NOTIFY_WEBHOOK_URL', state.notifyWebhookUrl],
    ['NOTIFY_WEBHOOK_SECRET', state.notifyWebhookSecret],
    ['RESEND_API_KEY', state.resendApiKey],
    ['NOTIFY_EMAIL_TO', state.notifyEmailTo],
    ['NOTIFY_EMAIL_FROM', state.notifyEmailFrom],
    ['CLIENT_RECEIPT_EMAILS', state.clientReceiptEmails || 'false'],
    ['CLIENT_RECEIPT_EMAIL_FROM', state.clientReceiptEmailFrom],
    ['TURNSTILE_SITE_KEY', state.turnstileSiteKey],
    ['TURNSTILE_SECRET_KEY', state.turnstileSecretKey],
    ['SCAN_MODE', state.scannerMode || 'none'],
    ['SCANNER_WEBHOOK_URL', state.scannerWebhookUrl],
    ['SCANNER_WEBHOOK_SECRET', state.scannerWebhookSecret],
    ['SCAN_BLOCK_FLAGGED', state.scanBlockFlagged || 'false'],
    ['BACKUP_PREFIX', state.backupFolderId],
    ['UPLOAD_SESSION_RATE_LIMIT', '30'],
    ['UPLOAD_SESSION_RATE_WINDOW_MS', '600000'],
    ['STATUS_RATE_LIMIT', '80'],
    ['STATUS_RATE_WINDOW_MS', '600000'],
    ['PORTAL_KEY_MAX_FAILURES', '8'],
    ['PORTAL_KEY_LOCKOUT_MS', '900000'],
    ['STALE_SESSION_HOURS', '72'],
    ['MAINTENANCE_CRON', '0 3 * * *'],
    ['R2_CONFIG_JSON', JSON.stringify(vaultConfig)]
  ];

  q('#envOutput').textContent = envLines.map(([key, value]) => `${key}=${safeEnv(value)}`).join('\n');
  q('#jsonOutput').textContent = JSON.stringify(vaultConfig, null, 2);
  q('#commandOutput').textContent = [
    'npm install',
    'npm run smoke',
    'npm run check',
    '',
    '# After Netlify env vars are configured:',
    'npm run live:r2-smoke',
    '',
    '# Browser proof:',
    '# 1. Open /setup.html and run diagnostics.',
    '# 2. Open /admin.html and run Health preflight + Test R2 access.',
    '# 3. Run Test notification from /admin.html if you configured notifications.',
    '# 3b. Run Maintenance once to confirm stale-session reporting works.',
    '# 3c. Run Backup metadata and download CSV/JSON exports from /admin.html.',
    '# 3d. Optional: npm i -D playwright && npx playwright install chromium && npm run e2e:browser.',
    '# 4. Open / and upload a small proof file.',
    '# 5. Use Pause current upload, then press Start secure upload again to verify resume.',
    '# 6. Upload one real large video before sending the link to clients.',
    '',
    '# Repo snapshot proof from a source repo with the helper installed:',
    'npm run vault:dry-run',
    'npm run vault:push'
  ].join('\n');

  q('#diagnosticOrigin').value = q('#diagnosticOrigin').value || normalizeOrigin(state.siteOrigin) || window.location.origin;
}

function renderChecklist() {
  const saved = loadChecklist();
  const wrap = q('#setupChecklist');
  wrap.replaceChildren();
  for (const [id, label] of checklistItems) {
    const row = document.createElement('label');
    row.className = 'check-row setup-check-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(saved[id]);
    input.addEventListener('change', () => {
      const current = loadChecklist();
      current[id] = input.checked;
      saveChecklist(current);
      renderChecklistMeter();
    });
    const span = document.createElement('span');
    span.textContent = label;
    row.append(input, span);
    wrap.append(row);
  }
  renderChecklistMeter();
}

function renderChecklistMeter() {
  const saved = loadChecklist();
  const total = checklistItems.length;
  const done = checklistItems.filter(([id]) => saved[id]).length;
  q('.setup-progress-panel .panel-heading h2').textContent = `Deployment checklist — ${done}/${total} complete`;
}

function renderDestination(destination = {}, index = 0) {
  const template = q('#setupDestinationTemplate');
  const card = template.content.firstElementChild.cloneNode(true);
  const values = {
    id: destination.id || `destination-${index + 1}`,
    name: destination.name || `Destination ${index + 1}`,
    folderId: destination.folderId || '',
    enabled: destination.enabled !== false,
    priority: destination.priority || index + 1,
    role: destination.role || 'project',
    description: destination.description || '',
    maxFileSizeGb: destination.maxFileSizeGb || 5000,
    accept: destination.accept || '*'
  };
  for (const [field, value] of Object.entries(values)) {
    const input = q(`[data-field="${field}"]`, card);
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = Boolean(value);
    else input.value = value;
  }
  q('.destination-title', card).textContent = `${values.priority}. ${values.name}`;
  q('.remove-setup-destination', card).addEventListener('click', () => {
    card.remove();
    saveState();
    buildOutputs();
  });
  qa('input,select,textarea', card).forEach((input) => {
    input.addEventListener('input', () => {
      const priority = q('[data-field="priority"]', card).value || index + 1;
      const name = q('[data-field="name"]', card).value || 'Destination';
      q('.destination-title', card).textContent = `${priority}. ${name}`;
      saveState();
      buildOutputs();
    });
  });
  q('#setupDestinationList').append(card);
}

function renderDestinations(destinations) {
  q('#setupDestinationList').replaceChildren();
  const list = destinations?.length ? destinations : defaults.destinations;
  list.forEach(renderDestination);
}

function hydrate() {
  for (const [key, value] of Object.entries(setupState)) {
    if (key === 'destinations') continue;
    const input = q(`#${key}`);
    if (input) {
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = value || '';
    }
  }
  renderDestinations(setupState.destinations);
  renderChecklist();
  buildOutputs();
}

function addDestination() {
  const count = qa('.setup-destination-card').length;
  renderDestination(
    {
      id: `project-${count + 1}`,
      name: `Project Intake ${count + 1}`,
      folderId: '',
      enabled: true,
      priority: count + 1,
      role: 'project',
      description: 'Project-specific intake folder.',
      maxFileSizeGb: 5000,
      accept: '*'
    },
    count
  );
  saveState();
  buildOutputs();
}

async function copyOutput(id, button) {
  const text = q(`#${id}`).textContent;
  await navigator.clipboard.writeText(text);
  const original = button.textContent;
  button.textContent = 'Copied';
  setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function renderDiagnostics(data) {
  const wrap = q('#diagnosticResults');
  wrap.classList.remove('hidden');
  wrap.replaceChildren();

  const status = document.createElement('div');
  status.className = data.ok ? 'diagnostic-status ok' : 'diagnostic-status bad';
  status.textContent = data.ok ? 'Diagnostics request completed.' : `Diagnostics failed: ${data.error || 'Unknown error'}`;
  wrap.append(status);

  for (const check of data.checks || []) {
    const row = document.createElement('div');
    row.className = `diagnostic-row ${check.ok ? 'ok' : check.required ? 'bad' : 'warn'}`;
    const strong = document.createElement('strong');
    strong.textContent = `${check.ok ? '✅' : check.required ? '❌' : '⚠️'} ${check.name}`;
    const p = document.createElement('p');
    p.textContent = check.detail || '';
    row.append(strong, p);
    wrap.append(row);
  }

  if (data.runtime) {
    const pre = document.createElement('pre');
    pre.className = 'code-output diagnostics-json';
    pre.textContent = JSON.stringify(data.runtime, null, 2);
    wrap.append(pre);
  }
}

async function runDiagnostics() {
  const origin = normalizeOrigin(q('#diagnosticOrigin').value) || window.location.origin;
  const token = q('#diagnosticToken').value.trim();
  const liveTest = q('#diagnosticLiveTest').checked;
  const wrap = q('#diagnosticResults');
  wrap.classList.remove('hidden');
  wrap.textContent = 'Running diagnostics…';
  try {
    const response = await fetch(`${origin}/api/setup-diagnostics`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? {
          authorization: `Bearer ${token}`,
          'x-admin-token': token,
          'x-free99-admin-code': token,
          'x-free99-gate-session': token,
          'x-skye-gate-session': token
        } : {})
      },
      body: JSON.stringify({ liveTest })
    });
    const data = await response.json().catch(() => ({ ok: false, error: 'Diagnostics response was not JSON.' }));
    renderDiagnostics(data);
  } catch (error) {
    renderDiagnostics({ ok: false, error: error.message, checks: [] });
  }
}

function bindEvents() {
  q('#generateTokens').addEventListener('click', () => {
    q('#operatorSessionSecretValue').value = randomToken(36);
    q('#receiptSigningSecretValue').value = randomToken(36);
    q('#portalKeyValue').value = `client-${randomToken(12)}`;
    if (q('#notifyWebhookSecret')) q('#notifyWebhookSecret').value = randomToken(24);
    saveState();
    buildOutputs();
  });

  q('#addSetupDestination').addEventListener('click', addDestination);
  q('#refreshOutput').addEventListener('click', () => {
    saveState();
    buildOutputs();
  });
  q('#resetChecklist').addEventListener('click', () => {
    saveChecklist({});
    renderChecklist();
  });
  q('#runDiagnostics').addEventListener('click', runDiagnostics);
  const logout = q('#logoutOperator');
  if (logout) {
    logout.addEventListener('click', async () => {
      await fetch('/api/operator-logout', { method: 'POST' }).catch(() => null);
      window.location.href = '/operator.html?return=/setup.html';
    });
  }

  qa('#siteOrigin,#customOrigin,#operatorSessionSecretValue,#receiptSigningSecretValue,#portalKeyValue,#serviceAccountEmail,#configFolderId,#r2BucketValue,#brandNameValue,#supportEmailValue,#publicHeadlineValue,#publicSubheadlineValue,#publicInstructionsValue,#retentionNoticeValue,#requireUsageRightsValue,#requireRetentionAckValue,#requireClientNameValue,#requireClientEmailValue,#requireProjectNameValue,#blockedExtensionsValue,#routingModeValue,#chunkSizeValue,#privateKeyValue,#notifyWebhookUrl,#notifyWebhookSecret,#resendApiKey,#notifyEmailTo,#notifyEmailFrom').forEach((input) => {
    input.addEventListener('input', () => {
      saveState();
      buildOutputs();
    });
  });

  qa('.copy-btn').forEach((button) => {
    button.addEventListener('click', () => copyOutput(button.dataset.copyTarget, button));
  });
}

hydrate();
bindEvents();
