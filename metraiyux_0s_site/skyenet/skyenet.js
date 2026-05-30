const state = {
  token: '',
  status: null,
  routes: null,
  observability: null,
  cost: null,
  dashboard: null,
  dropFiles: [],
  dropMeta: null
};

const els = {
  authPanel: document.querySelector('#authPanel'),
  manualToken: document.querySelector('#manualToken'),
  saveTokenButton: document.querySelector('#saveTokenButton'),
  statusDot: document.querySelector('#statusDot'),
  statusText: document.querySelector('#statusText'),
  metricHosting: document.querySelector('#metricHosting'),
  metricFunctions: document.querySelector('#metricFunctions'),
  metricRoutes: document.querySelector('#metricRoutes'),
  metricFree99: document.querySelector('#metricFree99'),
  workspaceForm: document.querySelector('#workspaceForm'),
  workspaceButton: document.querySelector('#workspaceButton'),
  workspaceId: document.querySelector('#workspaceId'),
  planName: document.querySelector('#planName'),
  deployWorkspaceId: document.querySelector('#deployWorkspaceId'),
  deployPlanName: document.querySelector('#deployPlanName'),
  workspacePanel: document.querySelector('#workspacePanel'),
  deploymentPanel: document.querySelector('#deploymentPanel'),
  receiptPanel: document.querySelector('#receiptPanel'),
  truthList: document.querySelector('#truthList'),
  routeList: document.querySelector('#routeList'),
  costPanel: document.querySelector('#costPanel'),
  observabilityPanel: document.querySelector('#observabilityPanel'),
  deployForm: document.querySelector('#deployForm'),
  deployLog: document.querySelector('#deployLog'),
  publishResult: document.querySelector('#publishResult'),
  deploymentId: document.querySelector('#deploymentId'),
  projectId: document.querySelector('#projectId'),
  mountPath: document.querySelector('#mountPath'),
  routeHost: document.querySelector('#routeHost'),
  dropZone: document.querySelector('#dropZone'),
  buildFiles: document.querySelector('#buildFiles'),
  fileSummary: document.querySelector('#fileSummary'),
  dropStats: document.querySelector('#dropStats'),
  surfacePreview: document.querySelector('#surfacePreview'),
  skrucibleEnhance: document.querySelector('#skrucibleEnhance'),
  deployButton: document.querySelector('#deployButton'),
  refreshButton: document.querySelector('#refreshButton')
};

const tokenKeys = [
  'adminBrainToken',
  'metraiyux_admin_session',
  'metraiyux_0s_gate_session',
  'skye_gate_session',
  'skygate_session',
  'quantumskyes_mcp_owner_token'
];

const buildRootNames = new Set(['dist', 'build', 'out', 'public', 'site', 'www', 'static']);

function nowDeploymentId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `dep_${stamp}`;
}

function hostGuess() {
  return window.location.hostname || 'metraiyux-0s-full-system.graylondonskyes.workers.dev';
}

function slugValue(value, fallback = 'site') {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

function normalizeHostInput(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return hostGuess();
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname;
  } catch {}
  return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '') || hostGuess();
}

function normalizeMountInput(value, projectId) {
  const fallback = `/skyenet/${projectId || 'site'}`;
  const raw = String(value || fallback)
    .trim()
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  const parts = raw.replace(/^\/+/, '').replace(/\/+$/, '').split('/').filter(Boolean);
  const encoded = (parts.length ? parts : fallback.replace(/^\/+/, '').split('/'))
    .map((part) => {
      try { return encodeURIComponent(decodeURIComponent(part)); }
      catch { return encodeURIComponent(part); }
    })
    .join('/');
  return `/${encoded}`;
}

function workspaceQuery() {
  const params = new URLSearchParams();
  const workspaceId = String(els.workspaceId?.value || 'default-workspace').trim();
  if (workspaceId) params.set('workspaceId', workspaceId);
  return params.toString();
}

function loadToken() {
  for (const key of tokenKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) return value.replace(/^Bearer\s+/i, '').trim();
  }
  return '';
}

function authHeaders(extra = {}) {
  const headers = new Headers(extra);
  if (state.token) {
    headers.set('Authorization', `Bearer ${state.token}`);
    headers.set('x-skye-gate-session', state.token);
  }
  return headers;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(path, options = {}, attempt = 0) {
  const headers = authHeaders(options.headers || {});
  const timeoutMs = Number(options.timeoutMs || 45000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
  let response = null;
  try {
    response = await fetch(path, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal
    });
  } catch (error) {
    if (attempt < 2) {
      await delay(650 * (attempt + 1));
      return api(path, options, attempt + 1);
    }
    const timedOut = error?.name === 'AbortError';
    throw new Error(timedOut ? `SkyeNet request timed out after ${timeoutMs}ms: ${path}` : error.message);
  } finally {
    clearTimeout(timer);
  }
  let body = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => null);
  } else {
    body = { ok: response.ok, text: await response.text().catch(() => '') };
  }
  if (response.status === 401 || response.status === 403) {
    els.authPanel.hidden = false;
  }
  if (response.status >= 500 && attempt < 2) {
    await delay(650 * (attempt + 1));
    return api(path, options, attempt + 1);
  }
  if (!response.ok) {
    const error = new Error(body?.error || body?.skynet?.error || `HTTP ${response.status}`);
    error.body = body;
    error.status = response.status;
    throw error;
  }
  return body;
}

function setHealth(status, text) {
  els.statusDot.className = `status-dot ${status || ''}`.trim();
  els.statusText.textContent = text;
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

function capabilityLabel(value) {
  if (value === true) return 'Live';
  if (value === false) return 'No';
  return '--';
}

function renderTruth(statusBody) {
  const data = statusBody?.skynet || statusBody || {};
  const capabilities = data.capabilities || {};
  const targets = data.runtime_targets || {};
  const rows = [
    ['SkyeNet Edge hosting', capabilityLabel(capabilities.static_drop_hosting)],
    ['Folder drop UX', (capabilities.browser_drag_folder_drop && capabilities.drop_root_folder_stripping) ? 'Live' : 'Review'],
    ['Skrucible forge pass', capabilityLabel(capabilities.skrucible_forge_static_surface_pass)],
    ['Managed SkyeNet functions', capabilityLabel(capabilities.first_party_worker_functions)],
    ['Netlify bundle intake', capabilityLabel(capabilities.netlify_function_bundle_converter || capabilities.uploaded_function_bundle_intake)],
    ['Signed runtime v1', capabilityLabel(capabilities.owned_skyenet_functions_runtime_v1 || capabilities.signed_function_bundle_manifest)],
    ['Runtime guardrails', (capabilities.function_runtime_env_isolation && capabilities.function_runtime_timeout_caps && capabilities.function_runtime_egress_default_deny) ? 'Caps active' : 'Review'],
    ['Functions default', capabilities.functions_enabled_default === false ? 'Off' : 'Review'],
    ['Managed functions', capabilities.managed_functions_paid_or_owner_approved_only ? 'Paid/approved only' : 'Review'],
    ['Function receipts', capabilities.function_invocation_receipts_required ? 'Required' : 'Review'],
    ['Abuse kill switch', capabilities.workspace_abuse_kill_switch ? 'Active' : 'Review'],
    ['Billing guard', capabilities.billing_guard_before_scale ? 'Before scale' : 'Review'],
    ['Uploaded isolated functions', capabilities.arbitrary_uploaded_serverless_functions ? 'Live' : 'Controlled preview'],
    ['Sovereign runtime compat', capabilityLabel(capabilities.skynet_sovereign_runtime_compatible || targets.private_runtime_required_for_untrusted_customer_code)],
    ['Fallback origin proxy', capabilityLabel(capabilities.fallback_origin_proxy)],
    ['Route registry', capabilityLabel(capabilities.host_path_routing || capabilities.path_and_host_routing)],
    ['Auth lane', data.auth_lane || 'FS27/SkyGate/Free99']
  ];
  els.truthList.innerHTML = rows.map(([label, value]) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(String(value))}</dd>
    </div>
  `).join('');
  els.metricHosting.textContent = capabilityLabel(capabilities.static_drop_hosting);
  els.metricFunctions.textContent = capabilities.owned_skyenet_functions_runtime_v1 ? 'Signed v1' : (capabilities.arbitrary_uploaded_serverless_functions ? 'Isolated' : 'Managed');
}

function renderRoutes(routesBody) {
  const data = routesBody?.skynet || routesBody || {};
  const routes = Array.isArray(data.routes) ? data.routes : [];
  els.metricRoutes.textContent = String(data.count ?? routes.length ?? 0);
  if (!routes.length) {
    els.routeList.innerHTML = '<div class="empty-state">No route records returned for this operator session.</div>';
    return;
  }
  els.routeList.innerHTML = routes.map((entry) => {
    const route = entry.route || entry;
    const mount = route.mount_path || route.path || '/';
    const host = route.hostname || route.host || 'host';
    const auth = route.default_auth || (route.public_access ? 'public' : 'gate');
    return `
      <article class="route-card">
        <h3>${escapeHtml(host)}${escapeHtml(mount)}</h3>
        <small>${escapeHtml(route.project_id || 'project')} / ${escapeHtml(route.active_deployment_id || route.deployment_id || 'deployment')} / ${escapeHtml(auth)}</small>
        ${route.live_url ? `<a class="route-live-link" href="${escapeHtml(route.live_url)}" target="_blank" rel="noopener">Open live route</a>` : ''}
        <code>${escapeHtml(entry.key || route.key || '')}</code>
      </article>
    `;
  }).join('');
}

function renderCost(costBody) {
  const model = costBody?.skynet?.cost_model || costBody?.cost_model || {};
  const caps = model.free99_policy?.recommended_caps || {};
  const assumptions = model.assumptions || {};
  els.metricFree99.textContent = caps.custom_domains === 0 ? 'Capped' : 'Review';
  const rows = [
    ['Review required', yesNo(model.pricing_review_required)],
    ['Free99 custom domains', String(caps.custom_domains ?? '--')],
    ['Free99 build MB', String(caps.max_static_bundle_mb ?? '--')],
    ['Free99 monthly bandwidth GB', String(caps.max_monthly_bandwidth_gb ?? '--')],
    ['Edge requests', assumptions.worker_requests || '--'],
    ['Asset vault storage', assumptions.r2_storage || '--'],
    ['Route registry reads', assumptions.kv_routing_reads || '--']
  ];
  els.costPanel.innerHTML = rows.map(([label, value]) => `
    <div class="cost-row">
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(value)}</small>
    </div>
  `).join('');
}

function renderObservability(observabilityBody) {
  const data = observabilityBody?.skynet || observabilityBody || {};
  const sinks = data.sinks || {};
  const latest = Array.isArray(data.latest_log_objects) ? data.latest_log_objects : [];
  const rows = [
    ['Analytics Engine', yesNo(sinks.analytics_engine)],
    ['Queue events', yesNo(sinks.queue_events || sinks.queue)],
    ['Runtime archive logs', yesNo(sinks.r2_runtime_logs)],
    ['D1 hourly rollups', yesNo(sinks.d1_hourly_rollups)],
    ['Citadel ingest', yesNo(sinks.citadel_ingest)],
    ['Latest log objects', String(latest.length)]
  ];
  els.observabilityPanel.innerHTML = rows.map(([label, value]) => `
    <article class="observability-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

function renderDashboard(dashboardBody) {
  const data = dashboardBody?.skynet || dashboardBody || {};
  const workspace = data.workspace || {};
  const usage = data.usage || {};
  const deployments = Array.isArray(data.deployments) ? data.deployments : [];
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];
  if (workspace.workspace_id && els.workspaceId) {
    els.workspaceId.value = workspace.workspace_id;
    els.deployWorkspaceId.value = workspace.workspace_id;
  }
  if (workspace.plan_name && els.planName) {
    els.planName.value = workspace.plan_name;
    els.deployPlanName.value = workspace.plan_name;
  }
  const caps = workspace.caps || {};
  els.workspacePanel.innerHTML = `
    <div class="workspace-card">
      <strong>${escapeHtml(workspace.display_name || workspace.workspace_id || 'SkyeNet workspace')}</strong>
      <span>${escapeHtml(workspace.plan_name || 'free99')}</span>
      <small>${escapeHtml(workspace.admin_override ? 'Owner/admin unlocked: Free99 deploy credits do not throttle this session.' : (workspace.owner_email || 'shared gate account'))}</small>
    </div>
    <div class="quota-grid">
      <div><b>${escapeHtml(String(usage.monthly_deployments ?? 0))}</b><span>Deploys this month</span></div>
      <div><b>${escapeHtml(workspace.admin_override ? 'Admin' : String(caps.deployments_per_month ?? '--'))}</b><span>Deploy cap</span></div>
      <div><b>${escapeHtml(String(usage.public_routes ?? 0))}</b><span>Public routes</span></div>
      <div><b>${escapeHtml(workspace.admin_override ? 'Admin' : String(caps.public_routes_per_workspace ?? '--'))}</b><span>Route cap</span></div>
      <div><b>${escapeHtml(bytesLabel(caps.max_static_bundle_bytes))}</b><span>Bundle cap</span></div>
      <div><b>${escapeHtml(String(caps.retention_days ?? '--'))}</b><span>Retention days</span></div>
    </div>
  `;
  els.deploymentPanel.innerHTML = deployments.length ? deployments.map((item) => `
    <article class="route-card deployment-card">
      <h3>${escapeHtml(item.project_id || 'project')}</h3>
      <small>${escapeHtml(item.deployment_id || 'deployment')} / ${escapeHtml(item.status || 'status')} / ${escapeHtml(bytesLabel(item.total_bytes || 0))}</small>
      ${item.live_url ? `<a class="route-live-link" href="${escapeHtml(item.live_url)}" target="_blank" rel="noopener">${escapeHtml(item.live_url)}</a>` : ''}
      <code>${escapeHtml(item.asset_prefix || '')}</code>
    </article>
  `).join('') : '<div class="empty-state">No deployments recorded for this workspace yet.</div>';
  els.receiptPanel.innerHTML = receipts.length ? receipts.map((item) => `
    <article class="receipt-card">
      <strong>${escapeHtml(item.type || 'receipt')}</strong>
      <span>${escapeHtml(item.created_at || '')}</span>
      <small>${escapeHtml([item.project_id, item.deployment_id, item.live_url].filter(Boolean).join(' / ') || item.workspace_id || '')}</small>
    </article>
  `).join('') : '<div class="empty-state">No SkyeNet receipts returned for this workspace.</div>';
}

function bytesLabel(bytes) {
  const n = Number(bytes || 0);
  if (!n) return '--';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function refresh() {
  setHealth('', 'Checking SkyeNet...');
  try {
    const query = workspaceQuery();
    const suffix = query ? `?${query}` : '';
    const [status, routes, observability, cost, dashboard] = await Promise.all([
      api(`/api/skyenet/status${suffix}`),
      api(`/api/skyenet/routes${suffix}`),
      api('/api/skyenet/observability'),
      api('/api/skyenet/cost-model')
        .catch((error) => ({ ok: false, error: error.message })),
      api(`/api/skyenet/dashboard${suffix}`)
    ]);
    state.status = status;
    state.routes = routes;
    state.observability = observability;
    state.cost = cost;
    state.dashboard = dashboard;
    renderTruth(status);
    renderRoutes(routes);
    renderObservability(observability);
    renderCost(cost);
    renderDashboard(dashboard);
    const lane = status?.skynet?.status || status?.status || 'ready';
    setHealth('ready', `SkyeNet ${lane}`);
  } catch (error) {
    setHealth('error', error.message || 'SkyeNet unavailable');
    els.deployLog.textContent = `Refresh failed: ${error.message}`;
  }
}

function normalizeUploadPath(pathname) {
  return String(pathname || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim();
}

function stripSharedRoot(items) {
  const cleanItems = items
    .map((item) => ({ ...item, path: normalizeUploadPath(item.path || item.file?.webkitRelativePath || item.file?.name) }))
    .filter((item) => item.file && item.path);
  const roots = cleanItems.map((item) => item.path.split('/')[0]).filter(Boolean);
  const uniqueRoots = [...new Set(roots)];
  const hasRootFile = cleanItems.some((item) => !item.path.includes('/'));
  if (uniqueRoots.length !== 1 || hasRootFile) return { items: cleanItems, strippedRoot: '' };
  const root = uniqueRoots[0];
  const stripped = cleanItems
    .map((item) => ({ ...item, path: item.path.split('/').slice(1).join('/') }))
    .filter((item) => item.path);
  return { items: stripped, strippedRoot: root };
}

function scoreBuildRoot(root) {
  const parts = normalizeUploadPath(root).toLowerCase().split('/').filter(Boolean);
  if (!parts.length) return 0;
  const first = parts[0];
  const last = parts.at(-1);
  const named = buildRootNames.has(first) || buildRootNames.has(last);
  if (!named) return 0;
  let score = buildRootNames.has(first) ? 100 : 70;
  score -= Math.max(0, parts.length - 1) * 4;
  if (first === 'dist' || last === 'dist') score += 10;
  if (first === 'build' || last === 'build') score += 8;
  if (first === 'out' || last === 'out') score += 6;
  return score;
}

function promoteBuildRoot(items) {
  const cleanItems = items
    .map((item) => ({ ...item, path: normalizeUploadPath(item.path || item.file?.webkitRelativePath || item.file?.name) }))
    .filter((item) => item.file && item.path);
  if (cleanItems.some((item) => item.path.toLowerCase() === 'index.html')) {
    return { items: cleanItems, promotedRoot: '', heldBack: [] };
  }

  const candidates = [];
  for (const item of cleanItems) {
    if (!/\/index\.html?$/i.test(item.path)) continue;
    const root = item.path.split('/').slice(0, -1).join('/');
    const score = scoreBuildRoot(root);
    if (score > 0) candidates.push({ root, score, depth: root.split('/').length });
  }
  candidates.sort((a, b) => b.score - a.score || a.depth - b.depth || a.root.localeCompare(b.root));
  const promotedRoot = candidates[0]?.root || '';
  if (!promotedRoot) return { items: cleanItems, promotedRoot: '', heldBack: [] };

  const prefix = `${promotedRoot}/`;
  const promoted = [];
  const heldBack = [];
  for (const item of cleanItems) {
    if (item.path === promotedRoot) continue;
    if (item.path.startsWith(prefix)) {
      const path = item.path.slice(prefix.length);
      if (path) promoted.push({ ...item, path });
    } else {
      heldBack.push(item.path);
    }
  }
  if (!promoted.some((item) => item.path.toLowerCase() === 'index.html')) {
    return { items: cleanItems, promotedRoot: '', heldBack: [] };
  }
  return { items: promoted, promotedRoot, heldBack };
}

function shouldSkipUploadPath(pathname) {
  const path = normalizeUploadPath(pathname).toLowerCase();
  if (!path) return true;
  const parts = path.split('/');
  if (parts.some((part) => ['.git', 'node_modules', '.skyenet', '.wrangler', '.cache'].includes(part))) return true;
  if (parts.some((part) => part === '.ds_store' || part === 'thumbs.db')) return true;
  if (/^(\.env|env\.txt|\.env\.|.*\.(pem|key|p12|pfx|sqlite|db|dump|log))/.test(parts.at(-1) || '')) return true;
  if (/^(cloudflare|runtime|scripts|sql|tests)(\/|$)/.test(path)) return true;
  if (/^netlify\/functions(\/|$)/.test(path)) return true;
  return false;
}

function selectedFiles() {
  const source = state.dropFiles.length
    ? state.dropFiles
    : [...(els.buildFiles.files || [])].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
  const normalized = stripSharedRoot(source);
  const kept = [];
  const skipped = [];
  for (const item of normalized.items) {
    if (shouldSkipUploadPath(item.path)) skipped.push(item.path);
    else kept.push(item);
  }
  const promoted = promoteBuildRoot(kept);
  state.dropMeta = scanFiles(promoted.items, [...skipped, ...promoted.heldBack], normalized.strippedRoot, promoted.promotedRoot);
  return promoted.items;
}

function scanFiles(files, skipped = [], strippedRoot = '', promotedRoot = '') {
  const paths = files.map((item) => item.path);
  const html = paths.filter((path) => /\.html?$/i.test(path));
  const css = paths.filter((path) => /\.css$/i.test(path));
  const js = paths.filter((path) => /\.m?js$/i.test(path));
  const images = paths.filter((path) => /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(path));
  const totalBytes = files.reduce((sum, item) => sum + Number(item.file?.size || item.blob?.size || 0), 0);
  return {
    file_count: files.length,
    skipped_count: skipped.length,
    skipped_files: skipped.slice(0, 40),
    stripped_root: strippedRoot,
    promoted_root: promotedRoot,
    total_bytes: totalBytes,
    total_label: bytesLabel(totalBytes),
    has_index: paths.some((path) => path.toLowerCase() === 'index.html'),
    first_html: html[0] || '',
    html_count: html.length,
    css_count: css.length,
    js_count: js.length,
    image_count: images.length
  };
}

function renderDropSummary() {
  const files = selectedFiles();
  const meta = state.dropMeta || scanFiles(files);
  const fileWord = meta.file_count === 1 ? 'file' : 'files';
  const sourceBits = [
    meta.stripped_root ? `from ${meta.stripped_root}` : '',
    meta.promoted_root ? `${meta.promoted_root} promoted to root` : ''
  ].filter(Boolean);
  els.fileSummary.textContent = meta.file_count
    ? `${meta.file_count} ${fileWord} ready${sourceBits.length ? ` (${sourceBits.join(', ')})` : ''}.`
    : 'Choose a folder or files.';
  els.dropStats.innerHTML = `
    <span>${escapeHtml(String(meta.file_count))} files</span>
    <span>${escapeHtml(meta.total_label)}</span>
    <span>${escapeHtml(meta.has_index ? 'index ready' : 'no index')}</span>
    <span>${escapeHtml(`${meta.html_count} html`)}</span>
    <span>${escapeHtml(`${meta.css_count} css`)}</span>
    <span>${escapeHtml(`${meta.js_count} js`)}</span>
    ${meta.skipped_count ? `<span>${escapeHtml(`${meta.skipped_count} skipped`)}</span>` : ''}
  `;
  const forgeState = els.skrucibleEnhance?.checked ? 'armed' : 'off';
  els.surfacePreview.innerHTML = `
    <div class="preview-browser">
      <div class="preview-dots"><i></i><i></i><i></i></div>
      <strong>${escapeHtml(meta.first_html || 'Surface root')}</strong>
      <small>${escapeHtml(meta.has_index ? (meta.promoted_root ? `root index detected from ${meta.promoted_root}` : 'root index detected') : 'add index.html for clean root routing')}</small>
    </div>
    <div class="preview-forge ${forgeState}">
      <span>Skrucible</span>
      <strong>${escapeHtml(forgeState === 'armed' ? 'Forge pass armed' : 'Forge pass off')}</strong>
      <small>${escapeHtml(meta.skipped_count ? `${meta.skipped_count} private/source paths held back` : 'drop lane clean')}</small>
    </div>
  `;
}

function relativeAssetRef(fromPath, assetPath) {
  const depth = Math.max(0, normalizeUploadPath(fromPath).split('/').length - 1);
  return `${'../'.repeat(depth)}${assetPath}`;
}

function injectIntoHtml(html, htmlPath) {
  const cssRef = relativeAssetRef(htmlPath, 'assets/skyenet-skrucible.css');
  const jsRef = relativeAssetRef(htmlPath, 'assets/skyenet-skrucible.js');
  let next = String(html || '');
  if (!/skyenet-skrucible\.css/i.test(next)) {
    const link = `  <link rel="stylesheet" href="${cssRef}" data-skyenet-skrucible="style">\n`;
    next = /<\/head>/i.test(next) ? next.replace(/<\/head>/i, `${link}</head>`) : `${link}${next}`;
  }
  if (!/skyenet-skrucible\.js/i.test(next)) {
    const script = `  <script src="${jsRef}" defer data-skyenet-skrucible="runtime"></script>\n`;
    next = /<\/body>/i.test(next) ? next.replace(/<\/body>/i, `${script}</body>`) : `${next}\n${script}`;
  }
  if (!/data-skyenet-surface/i.test(next)) {
    next = next.replace(/<html([^>]*)>/i, '<html$1 data-skyenet-surface="skrucible">');
  }
  return next;
}

function generatedFile(path, body, type) {
  return {
    path,
    file: new File([body], path.split('/').pop(), { type }),
    generated: true
  };
}

function generateSkrucibleCss() {
  return `:root{--skynet-forge-ink:#050505;--skynet-forge-paper:#f7f7f8;--skynet-forge-blue:#3b82f6;--skynet-forge-muted:#9a9aa2}html[data-skyenet-surface=skrucible]{background:var(--skynet-forge-ink);scrollbar-color:var(--skynet-forge-blue) rgba(255,255,255,.08)}body{position:relative;min-height:100vh}body::before{content:"";position:fixed;inset:0;z-index:-2;background:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(180deg,rgba(59,130,246,.12),transparent 420px),#050505;background-size:42px 42px,42px 42px,auto,auto;pointer-events:none}body::after{content:"";position:fixed;left:0;right:0;top:0;z-index:-1;height:1px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.74),transparent);pointer-events:none}.skyenet-skrucible-field{position:fixed;inset:0;z-index:-3;width:100%;height:100%;pointer-events:none}.skyenet-forge-badge{position:fixed;right:16px;bottom:16px;z-index:20;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:rgba(5,5,5,.78);backdrop-filter:blur(14px);color:#f7f7f8;padding:9px 12px;font:700 12px/1.1 ui-sans-serif,system-ui,sans-serif;box-shadow:0 14px 36px rgba(0,0,0,.28)}h1,h2,h3{letter-spacing:0;text-wrap:balance}a{color:#8ab4ff}button,input,select,textarea{border-color:rgba(255,255,255,.14)}a,button,input,select,textarea{transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s cubic-bezier(.16,1,.3,1),border-color .18s cubic-bezier(.16,1,.3,1)}a:hover,button:hover{transform:translateY(-1px)}section,main>article,.card,.panel,[class*=card],[class*=panel]{border-radius:min(8px,inherit)}@media (prefers-reduced-motion:reduce){a,button,input,select,textarea{transition:none}.skyenet-skrucible-field{display:none}}`;
}

function generateSkrucibleJs() {
  return `(()=>{if(window.__SKYENET_SKRUCIBLE_FORGE__)return;window.__SKYENET_SKRUCIBLE_FORGE__=true;document.documentElement.dataset.skyenetSurface='skrucible';const c=document.createElement('canvas');c.className='skyenet-skrucible-field';c.setAttribute('aria-hidden','true');document.body.prepend(c);const x=c.getContext('2d');let w=0,h=0,t=0;const lines=Array.from({length:22},(_,i)=>({y:i/22,s:.12+(i%6)*.018,o:.05+(i%5)*.012}));function size(){const d=Math.min(devicePixelRatio||1,1.75);w=innerWidth;h=innerHeight;c.width=Math.max(1,Math.floor(w*d));c.height=Math.max(1,Math.floor(h*d));c.style.width=w+'px';c.style.height=h+'px';x.setTransform(d,0,0,d,0,0)}function draw(){t+=.006;x.clearRect(0,0,w,h);const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'rgba(59,130,246,.08)');g.addColorStop(1,'rgba(255,255,255,.015)');x.fillStyle=g;x.fillRect(0,0,w,h);x.lineWidth=1;for(const p of lines){const y=(p.y*h+Math.sin(t+p.y*8)*22)%h;x.beginPath();x.moveTo(0,y);x.lineTo(w,y+Math.cos(t*p.s)*20);x.strokeStyle='rgba(138,180,255,'+p.o+')';x.stroke()}requestAnimationFrame(draw)}addEventListener('resize',size,{passive:true});size();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)draw();const b=document.createElement('div');b.className='skyenet-forge-badge';b.textContent='SkyeNet x Skrucible';document.body.appendChild(b);})();`;
}

async function prepareFilesForDeploy(rawFiles) {
  const enhance = Boolean(els.skrucibleEnhance?.checked);
  const prepared = [];
  const htmlPaths = [];
  for (const item of rawFiles) {
    if (enhance && /\.html?$/i.test(item.path)) {
      const html = await item.file.text();
      prepared.push(generatedFile(item.path, injectIntoHtml(html, item.path), item.file.type || 'text/html; charset=utf-8'));
      htmlPaths.push(item.path);
    } else {
      prepared.push(item);
    }
  }
  if (enhance) {
    const existing = new Set(prepared.map((item) => item.path.toLowerCase()));
    if (!existing.has('assets/skyenet-skrucible.css')) {
      prepared.push(generatedFile('assets/skyenet-skrucible.css', generateSkrucibleCss(), 'text/css; charset=utf-8'));
    }
    if (!existing.has('assets/skyenet-skrucible.js')) {
      prepared.push(generatedFile('assets/skyenet-skrucible.js', generateSkrucibleJs(), 'text/javascript; charset=utf-8'));
    }
    prepared.push(generatedFile('skyenet-skrucible-manifest.json', JSON.stringify({
      schema: 'skyenet.skrucible.surface_manifest.v1',
      generated_at: new Date().toISOString(),
      enhanced_html: htmlPaths,
      runtime_assets: ['assets/skyenet-skrucible.css', 'assets/skyenet-skrucible.js'],
      source: 'SkyeNet Drop console'
    }, null, 2), 'application/json; charset=utf-8'));
  }
  return {
    files: prepared,
    meta: {
      ...(state.dropMeta || scanFiles(rawFiles)),
      skrucible_forge_pass: enhance,
      skrucible_enhanced_html: htmlPaths.length,
      uploaded_file_count: prepared.length
    }
  };
}

async function filesFromDataTransfer(dataTransfer) {
  const items = [...(dataTransfer?.items || [])];
  const entries = items
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
    .filter(Boolean);
  if (!entries.length) return [...(dataTransfer?.files || [])].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
  const nested = await Promise.all(entries.map((entry) => walkEntry(entry)));
  return nested.flat();
}

async function walkEntry(entry, prefix = '') {
  if (!entry) return [];
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, path: `${prefix}${entry.name}` }];
  }
  if (!entry.isDirectory) return [];
  const reader = entry.createReader();
  const children = [];
  while (true) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    children.push(...batch);
  }
  const nested = await Promise.all(children.map((child) => walkEntry(child, `${prefix}${entry.name}/`)));
  return nested.flat();
}

async function deploy(event) {
  event.preventDefault();
  const form = new FormData(els.deployForm);
  const rawFiles = selectedFiles();
  if (els.publishResult) {
    els.publishResult.hidden = true;
    els.publishResult.innerHTML = '';
  }
  if (!rawFiles.length) {
    els.deployLog.textContent = 'Choose at least one file before publishing.';
    return;
  }

  const projectId = slugValue(form.get('projectId'), 'site');
  const deploymentId = slugValue(form.get('deploymentId'), nowDeploymentId());
  const routeHost = normalizeHostInput(form.get('routeHost'));
  const mountPath = normalizeMountInput(form.get('mountPath'), projectId);
  const defaultAuth = String(form.get('defaultAuth') || 'gate');
  const publicAccess = Boolean(form.get('publicAccess')) || defaultAuth === 'public';
  const workspaceId = String(form.get('workspaceId') || els.workspaceId?.value || 'default-workspace').trim();
  const planName = String(form.get('planName') || els.planName?.value || 'free99').trim();
  const log = [];
  const write = (line) => {
    log.push(line);
    els.deployLog.textContent = log.join('\n');
  };

  try {
    els.deployButton.disabled = true;
    els.projectId.value = projectId;
    els.deploymentId.value = deploymentId;
    els.routeHost.value = routeHost;
    els.mountPath.value = mountPath;
    const prepared = await prepareFilesForDeploy(rawFiles);
    if (!prepared.meta.has_index) {
      write('Failed: no root index.html found. Drop the dist/build/out/public folder, or include index.html at the top of the bundle.');
      renderDropSummary();
      return;
    }
    const files = prepared.files;
    if (prepared.meta.promoted_root) {
      write(`Promoted ${prepared.meta.promoted_root} to deployment root`);
    }
    write(prepared.meta.skrucible_forge_pass
      ? `Skrucible forge pass: ${prepared.meta.skrucible_enhanced_html} HTML surface${prepared.meta.skrucible_enhanced_html === 1 ? '' : 's'} enhanced`
      : 'Skrucible forge pass: off');
    write(`Init ${projectId}/${deploymentId}`);
    await api('/api/skyenet/deploy/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        deployment_id: deploymentId,
        workspace_id: workspaceId,
        plan_name: planName,
        title: projectId
      })
    });

    for (const item of files) {
      write(`Upload ${item.path}`);
      const uploadBody = item.blob || item.file;
      const params = new URLSearchParams({
        projectId,
        deploymentId,
        workspaceId,
        path: item.path
      });
      await api(`/api/skyenet/deploy/upload?${params.toString()}`, {
        method: 'PUT',
        headers: { 'content-type': item.file?.type || item.blob?.type || 'application/octet-stream' },
        body: uploadBody
      });
    }

    write('Complete manifest');
    await api('/api/skyenet/deploy/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        deployment_id: deploymentId,
        workspace_id: workspaceId,
        plan_name: planName,
        files: files.map((item) => item.path),
        meta: {
          source: 'skyenet-console-folder-drop',
          ...prepared.meta
        }
      })
    });

    write(`Route ${routeHost}${mountPath}`);
    const routeResult = await api('/api/skyenet/deploy/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hostname: routeHost,
        mount_path: mountPath,
        project_id: projectId,
        deployment_id: deploymentId,
        workspace_id: workspaceId,
        plan_name: planName,
        public_access: publicAccess,
        default_auth: defaultAuth
      })
    });

    const liveUrl = routeResult?.skynet?.live_url || routeResult?.live_url || `https://${routeHost}${mountPath}`;
    write(`Published and routed: ${liveUrl}`);
    if (els.publishResult) {
      els.publishResult.hidden = false;
      els.publishResult.innerHTML = `
        <span>Live URL</span>
        <a class="direct-live-link" href="${escapeHtml(liveUrl)}" target="_blank" rel="noopener">${escapeHtml(liveUrl)}</a>
      `;
    }
    await refresh();
  } catch (error) {
    write(`Failed: ${error.message}`);
  } finally {
    els.deployButton.disabled = false;
  }
}

async function provisionWorkspace() {
  const form = new FormData(els.workspaceForm);
  const workspaceId = String(form.get('workspaceId') || 'default-workspace').trim();
  const planName = String(form.get('planName') || 'free99').trim();
  els.deployWorkspaceId.value = workspaceId;
  els.deployPlanName.value = planName;
  await api('/api/skyenet/workspace', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, plan_name: planName, display_name: workspaceId })
  });
  await refresh();
}

els.deploymentId.value = nowDeploymentId();
els.routeHost.value = hostGuess();
state.token = loadToken();

els.saveTokenButton.addEventListener('click', () => {
  const value = els.manualToken.value.replace(/^Bearer\s+/i, '').trim();
  if (!value) return;
  state.token = value;
  localStorage.setItem('metraiyux_0s_gate_session', value);
  els.authPanel.hidden = true;
  refresh();
});

els.refreshButton.addEventListener('click', refresh);
els.workspaceButton.addEventListener('click', provisionWorkspace);
els.workspaceForm.addEventListener('change', () => {
  els.deployWorkspaceId.value = String(els.workspaceId.value || 'default-workspace').trim();
  els.deployPlanName.value = String(els.planName.value || 'free99').trim();
});
els.deployForm.addEventListener('submit', deploy);
els.projectId.addEventListener('input', () => {
  const slug = slugValue(els.projectId.value || '', '');
  if (slug && (!els.mountPath.value || els.mountPath.value === '/skyenet/demo')) {
    els.mountPath.value = `/skyenet/${slug}`;
  }
});
els.buildFiles.addEventListener('change', () => {
  state.dropFiles = [];
  renderDropSummary();
});
els.skrucibleEnhance.addEventListener('change', renderDropSummary);
els.dropZone.addEventListener('click', (event) => {
  if (event.target !== els.buildFiles) els.buildFiles.click();
});
els.dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    els.buildFiles.click();
  }
});
for (const eventName of ['dragenter', 'dragover']) {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add('is-dragover');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  els.dropZone.addEventListener(eventName, () => {
    els.dropZone.classList.remove('is-dragover');
  });
}
els.dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  els.dropZone.classList.add('is-busy');
  els.fileSummary.textContent = 'Reading dropped folder...';
  try {
    state.dropFiles = await filesFromDataTransfer(event.dataTransfer);
    els.buildFiles.value = '';
    renderDropSummary();
  } catch (error) {
    els.fileSummary.textContent = `Drop failed: ${error.message}`;
  } finally {
    els.dropZone.classList.remove('is-busy');
  }
});

renderDropSummary();
refresh();

// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js
