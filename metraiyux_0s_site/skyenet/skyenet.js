const state = {
  token: '',
  status: null,
  routes: null,
  observability: null,
  cost: null
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
  truthList: document.querySelector('#truthList'),
  routeList: document.querySelector('#routeList'),
  costPanel: document.querySelector('#costPanel'),
  observabilityPanel: document.querySelector('#observabilityPanel'),
  deployForm: document.querySelector('#deployForm'),
  deployLog: document.querySelector('#deployLog'),
  deploymentId: document.querySelector('#deploymentId'),
  routeHost: document.querySelector('#routeHost'),
  buildFiles: document.querySelector('#buildFiles'),
  fileSummary: document.querySelector('#fileSummary'),
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

function nowDeploymentId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `dep_${stamp}`;
}

function hostGuess() {
  return window.location.hostname || 'metraiyux-0s-full-system.graylondonskyes.workers.dev';
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

async function api(path, options = {}) {
  const headers = authHeaders(options.headers || {});
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include'
  });
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
    ['Managed SkyeNet functions', capabilityLabel(capabilities.first_party_worker_functions)],
    ['Netlify bundle intake', capabilityLabel(capabilities.netlify_function_bundle_converter || capabilities.uploaded_function_bundle_intake)],
    ['Signed runtime v1', capabilityLabel(capabilities.owned_skyenet_functions_runtime_v1 || capabilities.signed_function_bundle_manifest)],
    ['Runtime guardrails', (capabilities.function_runtime_env_isolation && capabilities.function_runtime_timeout_caps && capabilities.function_runtime_egress_default_deny) ? 'Caps active' : 'Review'],
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
        <small>${escapeHtml(route.project_id || 'project')} / ${escapeHtml(route.deployment_id || 'deployment')} / ${escapeHtml(auth)}</small>
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
    const [status, routes, observability, cost] = await Promise.all([
      api('/api/skyenet/status'),
      api('/api/skyenet/routes'),
      api('/api/skyenet/observability'),
      api('/api/skyenet/cost-model')
    ]);
    state.status = status;
    state.routes = routes;
    state.observability = observability;
    state.cost = cost;
    renderTruth(status);
    renderRoutes(routes);
    renderObservability(observability);
    renderCost(cost);
    const lane = status?.skynet?.status || status?.status || 'ready';
    setHealth('ready', `SkyeNet ${lane}`);
  } catch (error) {
    setHealth('error', error.message || 'SkyeNet unavailable');
    els.deployLog.textContent = `Refresh failed: ${error.message}`;
  }
}

function selectedFiles() {
  return [...(els.buildFiles.files || [])].map((file) => {
    const relative = file.webkitRelativePath || file.name;
    return { file, path: relative.replace(/^\/+/, '') };
  });
}

async function deploy(event) {
  event.preventDefault();
  const form = new FormData(els.deployForm);
  const files = selectedFiles();
  if (!files.length) {
    els.deployLog.textContent = 'Choose at least one file before publishing.';
    return;
  }

  const projectId = String(form.get('projectId') || '').trim();
  const deploymentId = String(form.get('deploymentId') || '').trim();
  const routeHost = String(form.get('routeHost') || '').trim();
  const mountPath = String(form.get('mountPath') || '').trim();
  const defaultAuth = String(form.get('defaultAuth') || 'gate');
  const publicAccess = Boolean(form.get('publicAccess')) || defaultAuth === 'public';
  const log = [];
  const write = (line) => {
    log.push(line);
    els.deployLog.textContent = log.join('\n');
  };

  try {
    write(`Init ${projectId}/${deploymentId}`);
    await api('/api/skyenet/deploy/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        deployment_id: deploymentId,
        title: projectId
      })
    });

    for (const item of files) {
      write(`Upload ${item.path}`);
      const params = new URLSearchParams({
        projectId,
        deploymentId,
        path: item.path
      });
      await api(`/api/skyenet/deploy/upload?${params.toString()}`, {
        method: 'PUT',
        headers: { 'content-type': item.file.type || 'application/octet-stream' },
        body: item.file
      });
    }

    write('Complete manifest');
    await api('/api/skyenet/deploy/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        deployment_id: deploymentId,
        files: files.map((item) => item.path)
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
        public_access: publicAccess,
        default_auth: defaultAuth
      })
    });

    const liveUrl = routeResult?.skynet?.live_url || routeResult?.live_url || `https://${routeHost}${mountPath}`;
    write(`Published and routed: ${liveUrl}`);
    await refresh();
  } catch (error) {
    write(`Failed: ${error.message}`);
  }
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
els.deployForm.addEventListener('submit', deploy);
els.buildFiles.addEventListener('change', () => {
  const files = selectedFiles();
  els.fileSummary.textContent = files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected.` : 'Choose a folder or files.';
});

refresh();
