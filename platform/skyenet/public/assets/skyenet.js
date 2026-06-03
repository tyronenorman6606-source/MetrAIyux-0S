const tokenKeys = [
  'METRAIYUX_GATE_SESSION',
  'SKYGATEFS27_GATE_SESSION',
  'SKYE_GATE_SESSION'
];

function storedToken() {
  const bridgeSession = window.MetrAIyuxGateBridge?.current?.();
  if (bridgeSession?.token) return bridgeSession.token.replace(/^Bearer\s+/i, '').trim();
  for (const key of tokenKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!value) continue;
    try {
      const parsed = JSON.parse(value);
      const token = String(parsed.token || parsed.session || parsed.sessionToken || '').replace(/^Bearer\s+/i, '').trim();
      if (token) return token;
    } catch {}
    return value.replace(/^Bearer\s+/i, '').trim();
  }
  return '';
}

function persistSharedGateToken(token) {
  const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
  if (!clean) return '';
  const session = { token: clean, source: 'skyenet-console', platform_id: 'skyenet', usage_lane: 'platform-control', issued_at: new Date().toISOString() };
  if (window.MetrAIyuxGateBridge?.persist) window.MetrAIyuxGateBridge.persist(session, { silent: true });
  else {
    const raw = JSON.stringify(session);
    localStorage.setItem('METRAIYUX_GATE_SESSION', raw);
    sessionStorage.setItem('METRAIYUX_GATE_SESSION', raw);
  }
  return clean;
}

function authHeaders(token) {
  const out = new Headers({ accept: 'application/json' });
  if (token) {
    out.set('authorization', `Bearer ${token}`);
    out.set('x-skye-gate-session', token);
    out.set('x-free99-gate-session', token);
  }
  return out;
}

function workspaceQuery() {
  const params = new URLSearchParams(window.location.search);
  const workspace = params.get('workspace_id') || params.get('workspace') || '';
  return workspace ? `?workspace_id=${encodeURIComponent(workspace)}` : '';
}

function text(value, fallback = '') {
  return String(value ?? fallback ?? '').trim();
}

function bytes(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function dateLabel(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function setMessage(selector, message) {
  const node = document.querySelector(selector);
  if (node) node.textContent = message;
}

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text != null) node.textContent = options.text;
  if (options.html != null) node.innerHTML = options.html;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value != null) node.setAttribute(key, value);
    }
  }
  for (const child of children) node.append(child);
  return node;
}

async function apiJson(path, token) {
  const response = await fetch(path, { headers: authHeaders(token) });
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  if (!response.ok || body?.ok === false) {
    const detail = body?.error || body?.skynet?.error || body?.code || body?.text || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return body.skynet || body;
}

async function apiRequest(path, token, options = {}) {
  const headers = authHeaders(token);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  if (!response.ok || body?.ok === false) {
    const detail = body?.error || body?.skynet?.error || body?.code || body?.text || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return body.skynet || body;
}

function contentTypeForPath(pathname, fallback = '') {
  const clean = String(pathname || '').toLowerCase();
  if (fallback) return fallback;
  if (clean.endsWith('.html')) return 'text/html; charset=utf-8';
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (clean.endsWith('.json') || clean.endsWith('.webmanifest')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.ico')) return 'image/x-icon';
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mp4')) return 'video/mp4';
  if (clean.endsWith('.txt') || clean.endsWith('.md')) return 'text/plain; charset=utf-8';
  if (clean.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (clean.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
}

async function apiUpload(path, token, file, relPath) {
  const headers = authHeaders(token);
  headers.set('content-type', contentTypeForPath(relPath, file.type || ''));
  const response = await fetch(path, { method: 'PUT', headers, body: file });
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  if (!response.ok || body?.ok === false) {
    const detail = body?.error || body?.skynet?.error || body?.code || body?.text || `HTTP ${response.status}`;
    throw new Error(`${detail} while uploading ${relPath}`);
  }
  return body.skynet || body;
}

function relativeFilePath(file) {
  return String(file.webkitRelativePath || file.name || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function stripSharedSelectionRoot(items) {
  if (!items.length) return items;
  const first = items[0].rel.split('/')[0];
  if (!first || !items.every((item) => item.rel === first || item.rel.startsWith(`${first}/`))) return items;
  return items.map((item) => ({ ...item, rel: item.rel === first ? item.rel : item.rel.slice(first.length + 1) })).filter((item) => item.rel);
}

function normalizeBuildFiles(fileList) {
  let items = stripSharedSelectionRoot(Array.from(fileList || [])
    .map((file) => ({ file, rel: relativeFilePath(file) }))
    .filter((item) => item.rel && !item.rel.endsWith('/')));
  if (items.some((item) => item.rel === 'index.html')) return items;
  for (const root of ['dist', 'build', 'out', 'public']) {
    if (!items.some((item) => item.rel === `${root}/index.html`)) continue;
    return items
      .filter((item) => item.rel.startsWith(`${root}/`))
      .map((item) => ({ ...item, rel: item.rel.slice(root.length + 1) }))
      .filter((item) => item.rel);
  }
  return items;
}

function isSafePrivateSourcePath(rel) {
  const normalized = String(rel || '').replace(/\\/g, '/');
  if (!normalized || normalized.includes('../')) return false;
  if (/(^|\/)(\.git|node_modules|\.wrangler|\.next\/cache|dist\/cache|tmp|temp)(\/|$)/i.test(normalized)) return false;
  if (/(^|\/)\.env(\.|$|\/)/i.test(normalized)) return false;
  if (/(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|\.npmrc|\.pypirc|\.netrc)(\/|$)/i.test(normalized)) return false;
  if (/\.(pem|key|p12|pfx|crt|sqlite|sqlite3|db)$/i.test(normalized)) return false;
  return true;
}

function normalizePrivateSourceFiles(fileList) {
  return stripSharedSelectionRoot(Array.from(fileList || [])
    .map((file) => ({ file, rel: relativeFilePath(file) }))
    .filter((item) => item.rel && !item.rel.endsWith('/')))
    .filter((item) => isSafePrivateSourcePath(item.rel));
}

function deploymentId() {
  return `dep_${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
}

function setDeployProgress(done, total, message = '') {
  const progress = document.querySelector('#deployProgress');
  const status = document.querySelector('#deployStatus');
  if (progress) {
    progress.max = Math.max(1, total || 1);
    progress.value = Math.max(0, Math.min(progress.max, done || 0));
  }
  if (status && message) status.textContent = message;
}

async function uploadFileBatch(endpoint, token, params, items, label) {
  let cursor = 0;
  let done = 0;
  const total = items.length;
  const workers = Array.from({ length: Math.max(1, Math.min(4, total || 1)) }, async () => {
    while (cursor < total) {
      const item = items[cursor++];
      const query = new URLSearchParams({ ...params, path: item.rel });
      await apiUpload(`${endpoint}?${query.toString()}`, token, item.file, item.rel);
      done += 1;
      setDeployProgress(done, total, `${label}: ${done}/${total}`);
    }
  });
  await Promise.all(workers);
}

function syncDeployMount(projectId) {
  const form = document.querySelector('#deployForm');
  const mountInput = form?.querySelector('[name="mount_path"]');
  const urlMode = form?.querySelector('[name="url_mode"]')?.value || '';
  if (!mountInput || mountInput.dataset.touched === 'true') return;
  mountInput.value = urlMode === 'subdomain' ? '/' : `/${projectId || 'project'}`;
}

async function publishPackageFromConsole(form, token) {
  const data = Object.fromEntries(new FormData(form).entries());
  const projectId = text(data.project_id);
  const workspaceId = text(data.workspace_id || 'default-workspace');
  const planName = text(data.plan_name || 'free99');
  const id = deploymentId();
  const publicFiles = normalizeBuildFiles(form.querySelector('#publicBuildInput')?.files || []);
  const sourceFiles = normalizePrivateSourceFiles(form.querySelector('#privateSourceInput')?.files || []);
  const publicAccess = Boolean(form.querySelector('[name="public_access"]')?.checked);
  const mountPath = text(data.mount_path || `/${projectId}`).startsWith('/') ? text(data.mount_path || `/${projectId}`) : `/${text(data.mount_path || projectId)}`;
  if (!token) throw new Error('A shared gate session is required before publishing.');
  if (!projectId) throw new Error('Project is required.');
  if (!publicFiles.some((item) => item.rel === 'index.html')) throw new Error('The public build folder needs a root index.html.');

  setDeployProgress(0, publicFiles.length, 'Preparing workspace...');
  await apiRequest('/api/skyenet/workspace', token, {
    method: 'POST',
    body: { workspace_id: workspaceId, plan_name: planName, display_name: workspaceId }
  });
  await apiRequest('/api/skyenet/deploy/init', token, {
    method: 'POST',
    body: { workspace_id: workspaceId, plan_name: planName, project_id: projectId, deployment_id: id, title: projectId }
  });
  await uploadFileBatch('/api/skyenet/deploy/upload', token, { workspaceId, projectId, deploymentId: id }, publicFiles, 'Uploading public build');
  setDeployProgress(publicFiles.length, publicFiles.length, 'Completing public deployment...');
  await apiRequest('/api/skyenet/deploy/complete', token, {
    method: 'POST',
    body: { workspace_id: workspaceId, plan_name: planName, project_id: projectId, deployment_id: id, files: publicFiles.map((item) => item.rel) }
  });

  if (sourceFiles.length) {
    setDeployProgress(0, sourceFiles.length, 'Uploading private full source package...');
    await uploadFileBatch('/api/skyenet/source-upload', token, { workspaceId, projectId, deploymentId: id }, sourceFiles, 'Uploading private source');
    setDeployProgress(sourceFiles.length, sourceFiles.length, 'Completing private source package...');
    await apiRequest('/api/skyenet/source-complete', token, {
      method: 'POST',
      body: {
        workspace_id: workspaceId,
        plan_name: planName,
        project_id: projectId,
        deployment_id: id,
        files: sourceFiles.map((item) => item.rel),
        meta: { upload_mode: 'browser-folder-source-root', public_asset_exposure: false }
      }
    });
  }

  const route = await apiRequest('/api/skyenet/deploy/route', token, {
    method: 'POST',
    body: {
      workspace_id: workspaceId,
      plan_name: planName,
      hostname: text(data.hostname || 'skyenet.graylondonskyes.workers.dev'),
      mount_path: mountPath,
      ...(text(data.url_mode) ? { url_mode: text(data.url_mode) } : {}),
      project_id: projectId,
      deployment_id: id,
      public_access: publicAccess,
      default_auth: publicAccess ? 'public' : 'gate'
    }
  });
  setDeployProgress(1, 1, `Published ${route.live_url || projectId}.`);
  return {
    ok: true,
    project_id: projectId,
    workspace_id: workspaceId,
    deployment_id: id,
    public_files: publicFiles.length,
    private_source_files: sourceFiles.length,
    private_source_uploaded: sourceFiles.length > 0,
    public_asset_exposure: false,
    live_url: route.live_url || '',
    route_key: route.key || ''
  };
}

function renderAccount(dashboard) {
  const node = document.querySelector('#accountOutput');
  if (!node) return;
  const workspace = dashboard.workspace || {};
  const usage = dashboard.usage || {};
  const auth = dashboard.auth || {};
  const caps = workspace.caps || {};
  node.replaceChildren(
    el('div', {}, [
      el('span', { text: 'Workspace' }),
      el('strong', { text: text(workspace.display_name || workspace.workspace_id, 'SkyeNet workspace') })
    ]),
    el('div', {}, [
      el('span', { text: 'Plan' }),
      el('strong', { text: text(caps.label || workspace.plan_name, 'Free99 capped workspace') })
    ]),
    el('div', {}, [
      el('span', { text: 'Account' }),
      el('strong', { text: text(auth.email || auth.customer_id, 'Shared gate account') })
    ]),
    el('div', {}, [
      el('span', { text: 'Deployments' }),
      el('strong', { text: `${usage.monthly_deployments || 0} this month` })
    ]),
    el('div', {}, [
      el('span', { text: 'Routes' }),
      el('strong', { text: `${usage.routes || 0} total` })
    ]),
    el('div', {}, [
      el('span', { text: 'Source' }),
      el('strong', { text: 'Gated download + transfer' })
    ])
  );
}

function sourceTransferOptions(deployment) {
  const methods = deployment?.source_custody?.methods;
  if (Array.isArray(methods) && methods.length) return methods;
  return [
    { id: 'download', label: 'Direct gated download' },
    { id: 'instant-download-link', label: 'Instant gated link' },
    { id: 'skyedrive', label: 'SkyeDrive' },
    { id: 'skyevault', label: 'SkyeVault' },
    { id: 'secure-skye-pack', label: 'Secure .skye pack' }
  ];
}

function renderDeployments(dashboard) {
  const node = document.querySelector('#deploymentList');
  if (!node) return;
  const deployments = Array.isArray(dashboard.deployments) ? dashboard.deployments : [];
  if (!deployments.length) {
    node.replaceChildren(el('p', { text: 'No deployments found for this workspace yet.' }));
    return;
  }
  node.replaceChildren(...deployments.map((deployment) => {
    const privateSource = Boolean(deployment.source_custody?.private_full_project_package);
    const button = el('button', {
      text: privateSource ? 'Download full project' : 'Download deployed files',
      attrs: {
        type: 'button',
        'data-source-download': deployment.source_download_url || '',
        'data-source-name': `${deployment.project_id || 'skyenet'}-${deployment.deployment_id || 'deploy'}-source.tar`
      }
    });
    if (!deployment.source_download_url) button.disabled = true;
    const transferSelect = el('select', {
      className: 'transfer-select',
      attrs: {
        'aria-label': 'Source transfer method',
        'data-source-transfer-method': `${deployment.project_id || ''}:${deployment.deployment_id || ''}`
      }
    }, sourceTransferOptions(deployment).map((method) => el('option', {
      text: method.label || method.id,
      attrs: { value: method.id || method.method || 'download' }
    })));
    const transferButton = el('button', {
      text: 'Queue transfer',
      attrs: {
        type: 'button',
        'data-source-transfer': deployment.source_transfer_url || '/api/skyenet/source-transfer',
        'data-workspace-id': deployment.workspace_id || dashboard.workspace?.workspace_id || '',
        'data-project-id': deployment.project_id || '',
        'data-deployment-id': deployment.deployment_id || ''
      }
    });
    const functionsButton = el('button', {
      text: 'Function grants',
      attrs: {
        type: 'button',
        'data-function-action': 'load',
        'data-workspace-id': deployment.workspace_id || dashboard.workspace?.workspace_id || '',
        'data-project-id': deployment.project_id || '',
        'data-deployment-id': deployment.deployment_id || ''
      }
    });
    if (!deployment.functions?.function_count) functionsButton.disabled = true;
    const rollbackButton = el('button', {
      text: 'Rollback route',
      attrs: {
        type: 'button',
        'data-rollback-deployment': deployment.deployment_id || '',
        'data-workspace-id': deployment.workspace_id || dashboard.workspace?.workspace_id || '',
        'data-project-id': deployment.project_id || '',
        'data-route-key': deployment.route_key || '',
        'data-live-url': deployment.live_url || ''
      }
    });
    if (!deployment.route_key) rollbackButton.disabled = true;
    return el('article', { className: 'list-item' }, [
      el('div', {}, [
        el('span', { text: text(deployment.status, 'deployment') }),
        el('strong', { text: text(deployment.project_id, 'project') }),
        el('small', { text: `${text(deployment.deployment_id, 'deployment')} - ${bytes(deployment.total_bytes)} - ${deployment.file_count || 0} files` }),
        el('small', { text: privateSource
          ? `Private source package: ${deployment.source_custody?.private_source_file_count || 0} files - ${bytes(deployment.source_custody?.private_source_total_bytes)}`
          : 'Private source package not recorded; download falls back to public deployed files.' }),
        deployment.functions?.function_count
          ? el('small', { text: `Functions: ${deployment.functions.function_count} - ${deployment.functions.signed ? 'signed' : 'unsigned'} - ${deployment.functions.storage_verified ? 'storage verified' : 'storage pending'}` })
          : el('small', { text: 'No active function bundle recorded.' }),
        deployment.live_url ? el('a', { text: deployment.live_url, attrs: { href: deployment.live_url } }) : el('small', { text: 'No live URL recorded' })
      ]),
      el('div', { className: 'item-actions' }, [button, transferSelect, transferButton, functionsButton, rollbackButton])
    ]);
  }));
}

function renderRoutes(dashboard) {
  const node = document.querySelector('#routeList');
  if (!node) return;
  const routes = Array.isArray(dashboard.routes) ? dashboard.routes : [];
  if (!routes.length) {
    node.replaceChildren(el('p', { text: 'No live routes recorded for this workspace.' }));
    return;
  }
  node.replaceChildren(...routes.slice(0, 12).map((row) => {
    const route = row.route || {};
    const live = route.live_url || route.url || '';
    return el('article', { className: 'list-item compact' }, [
      el('span', { text: route.public_access === false ? 'Gated' : 'Public' }),
      el('strong', { text: text(route.project_id, 'project') }),
      el('small', { text: `${text(route.hostname, 'host')}${text(route.mount_path, '/')}` }),
      live ? el('a', { text: live, attrs: { href: live } }) : el('small', { text: text(row.key, 'route record') })
    ]);
  }));
}

function renderReceipts(dashboard) {
  const node = document.querySelector('#receiptList');
  if (!node) return;
  const receipts = Array.isArray(dashboard.receipts) ? dashboard.receipts : [];
  if (!receipts.length) {
    node.replaceChildren(el('p', { text: 'No receipts recorded yet.' }));
    return;
  }
  node.replaceChildren(...receipts.slice(0, 12).map((receipt) => el('article', { className: 'list-item compact' }, [
    el('span', { text: text(receipt.type, 'receipt') }),
    el('strong', { text: text(receipt.project_id || receipt.id, 'SkyeNet event') }),
    el('small', { text: dateLabel(receipt.created_at) || text(receipt.deployment_id, '') })
  ])));
}

function syncFunctionDefaults(dashboard = null) {
  const form = document.querySelector('#functionFilterForm');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const firstFunctionDeployment = Array.isArray(dashboard?.deployments)
    ? dashboard.deployments.find((deployment) => deployment.functions?.function_count)
    : null;
  const firstDeployment = firstFunctionDeployment || (Array.isArray(dashboard?.deployments) ? dashboard.deployments[0] : null);
  const workspace = params.get('workspace_id') || params.get('workspace') || firstDeployment?.workspace_id || dashboard?.workspace?.workspace_id || document.querySelector('#deployForm [name="workspace_id"]')?.value || '';
  const project = params.get('project_id') || firstDeployment?.project_id || document.querySelector('#deployForm [name="project_id"]')?.value || '';
  const deployment = params.get('deployment_id') || firstDeployment?.deployment_id || '';
  if (form.elements.workspace_id && !form.elements.workspace_id.value) form.elements.workspace_id.value = workspace;
  if (form.elements.project_id && !form.elements.project_id.value) form.elements.project_id.value = project;
  if (form.elements.deployment_id && !form.elements.deployment_id.value) form.elements.deployment_id.value = deployment;
}

function functionQuery(form = document.querySelector('#functionFilterForm')) {
  const query = new URLSearchParams();
  if (!form) return query;
  for (const [key, value] of new FormData(form).entries()) {
    const clean = text(value);
    if (clean) query.set(key, clean);
  }
  return query;
}

function renderFunctionStatus(data = {}, envData = {}) {
  const node = document.querySelector('#functionList');
  if (!node) return;
  const bundle = data.function_bundle || null;
  const functions = Array.isArray(bundle?.functions) ? bundle.functions : [];
  const envRecords = Array.isArray(envData.env) ? envData.env : [];
  const envKeys = new Set(envRecords.map((record) => record.key).filter(Boolean));
  setMessage('#functionStatus', bundle
    ? `${functions.length || bundle.function_count || 0} functions loaded. Runtime ${data.runtime_configured ? 'configured' : 'not configured'}.`
    : 'No function bundle recorded for this deployment.');
  if (!bundle || !functions.length) {
    node.replaceChildren(el('p', { text: 'No active uploaded functions found for this deployment.' }));
    return;
  }
  const header = el('article', { className: 'list-item compact' }, [
    el('span', { text: text(bundle.status, 'bundle') }),
    el('strong', { text: text(bundle.bundle_id, 'function bundle') }),
    el('small', { text: `${bundle.signed ? 'Signed' : 'Unsigned'} - ${bundle.storage_verified ? 'Storage verified' : 'Storage pending'} - ${bundle.public_asset_exposure === false ? 'Private bundle storage' : 'Storage exposure needs review'}` }),
    el('small', { text: `Policy: ${text(bundle.runtime_policy?.env, 'deny-by-default')} env, ${text(bundle.runtime_policy?.egress, 'deny')} egress` })
  ]);
  const rows = functions.map((fn) => {
    const grants = Array.isArray(fn.limits?.env_grants) ? fn.limits.env_grants : [];
    const missing = grants.filter((key) => !envKeys.has(key));
    const ungranted = envRecords.map((record) => record.key).filter((key) => key && !grants.includes(key));
    return el('article', { className: 'list-item' }, [
      el('div', {}, [
        el('span', { text: fn.name || 'function' }),
        el('strong', { text: fn.bundle_path || 'functions/<name>.mjs' }),
        el('small', { text: `Routes: ${(fn.routes || []).join(', ') || 'none recorded'}` }),
        el('small', { text: `Granted env: ${grants.length ? grants.join(', ') : 'none'}` }),
        missing.length ? el('small', { text: `Grant missing from registry: ${missing.join(', ')}` }) : el('small', { text: 'All granted env keys are present in the registry.' }),
        ungranted.length ? el('small', { text: `Registered but not granted here: ${ungranted.slice(0, 8).join(', ')}` }) : el('small', { text: 'No extra registered env keys for this project.' })
      ])
    ]);
  });
  node.replaceChildren(header, ...rows);
}

async function refreshFunctionStatus(token = storedToken()) {
  const form = document.querySelector('#functionFilterForm');
  if (!form) return null;
  if (!token) {
    setMessage('#functionStatus', 'Paste a shared gate session first.');
    return null;
  }
  syncFunctionDefaults();
  const query = functionQuery(form);
  if (!query.get('project_id') || !query.get('deployment_id')) {
    setMessage('#functionStatus', 'Project and deployment are required.');
    return null;
  }
  setMessage('#functionStatus', 'Loading function env grants...');
  const envParams = new URLSearchParams();
  if (query.get('workspace_id')) envParams.set('workspace_id', query.get('workspace_id'));
  envParams.set('project_id', query.get('project_id'));
  const [status, envData] = await Promise.all([
    apiJson(`/api/skyenet/functions-status?${query.toString()}`, token),
    apiJson(`/api/skyenet/env?${envParams.toString()}`, token).catch(() => ({ env: [] }))
  ]);
  renderFunctionStatus(status, envData);
  return status;
}

function setFunctionFormFromButton(button) {
  const form = document.querySelector('#functionFilterForm');
  if (!form) return;
  if (form.elements.workspace_id) form.elements.workspace_id.value = button.dataset.workspaceId || form.elements.workspace_id.value || '';
  if (form.elements.project_id) form.elements.project_id.value = button.dataset.projectId || form.elements.project_id.value || '';
  if (form.elements.deployment_id) form.elements.deployment_id.value = button.dataset.deploymentId || form.elements.deployment_id.value || '';
}

async function rollbackDeployment(button, token = storedToken()) {
  if (!token) throw new Error('A shared gate session is required before rollback.');
  const deploymentId = button.dataset.rollbackDeployment || '';
  const projectId = button.dataset.projectId || '';
  if (!deploymentId || !projectId) throw new Error('Project and deployment are required for rollback.');
  const ok = window.confirm(`Switch the live route back to ${projectId}/${deploymentId}?`);
  if (!ok) return null;
  setMessage('#rollbackStatus', 'Switching live route...');
  const result = await apiRequest('/api/skyenet/rollback', token, {
    method: 'POST',
    body: {
      workspace_id: button.dataset.workspaceId || undefined,
      project_id: projectId,
      deployment_id: deploymentId,
      route_key: button.dataset.routeKey || undefined
    }
  });
  const output = document.querySelector('#rollbackResult');
  if (output) output.textContent = JSON.stringify(result, null, 2);
  setMessage('#rollbackStatus', `Rollback active for ${projectId}/${deploymentId}.`);
  await renderDashboard(token).catch(() => null);
  return result;
}

function syncFormsDefaults(dashboard = null) {
  const form = document.querySelector('#formsFilterForm');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const firstDeployment = Array.isArray(dashboard?.deployments) ? dashboard.deployments[0] : null;
  const workspace = params.get('workspace_id') || params.get('workspace') || firstDeployment?.workspace_id || dashboard?.workspace?.workspace_id || document.querySelector('#deployForm [name="workspace_id"]')?.value || '';
  const project = params.get('project_id') || firstDeployment?.project_id || document.querySelector('#deployForm [name="project_id"]')?.value || '';
  const deployment = params.get('deployment_id') || firstDeployment?.deployment_id || '';
  if (form.elements.workspace_id && !form.elements.workspace_id.value) form.elements.workspace_id.value = workspace;
  if (form.elements.project_id && !form.elements.project_id.value) form.elements.project_id.value = project;
  if (form.elements.deployment_id && !form.elements.deployment_id.value) form.elements.deployment_id.value = deployment;
}

function formsQuery(form = document.querySelector('#formsFilterForm')) {
  const query = new URLSearchParams();
  if (!form) return query;
  for (const [key, value] of new FormData(form).entries()) {
    const clean = text(value);
    if (clean) query.set(key, clean);
  }
  if (!query.has('limit')) query.set('limit', '50');
  return query;
}

function renderFormsInbox(data = {}) {
  const node = document.querySelector('#formsInboxList');
  if (!node) return;
  const submissions = Array.isArray(data.submissions) ? data.submissions : [];
  const counts = data.counts || {};
  setMessage('#formsStatus', `${counts.total || submissions.length || 0} submissions loaded.`);
  if (!submissions.length) {
    node.replaceChildren(el('p', { text: 'No submissions found for this deployment.' }));
    return;
  }
  node.replaceChildren(...submissions.map((submission) => el('article', { className: 'list-item' }, [
    el('div', {}, [
      el('span', { text: submission.spam_detected ? 'Spam' : text(submission.status, 'new') }),
      el('strong', { text: `${text(submission.form_name, 'form')} / ${text(submission.submission_id, 'submission')}` }),
      el('small', { text: `${dateLabel(submission.received_at) || 'No date'} - ${submission.file_count || 0} files - ${submission.notification_status || 'notification pending'}` }),
      el('small', { text: (submission.spam_reasons || []).join(', ') || 'clean' })
    ]),
    el('div', { className: 'item-actions' }, [
      el('button', { text: 'Open', attrs: { type: 'button', 'data-form-action': 'open', 'data-receipt-key': submission.key || '' } }),
      el('button', { text: 'Read', attrs: { type: 'button', 'data-form-action': 'read', 'data-receipt-key': submission.key || '' } }),
      el('button', { text: 'Notify', attrs: { type: 'button', 'data-form-action': 'notify', 'data-receipt-key': submission.key || '' } })
    ])
  ])));
}

function renderFormsDetail(data = {}) {
  const detail = document.querySelector('#formsDetail');
  if (!detail) return;
  detail.textContent = JSON.stringify(data, null, 2);
  const submission = data.submission || data;
  const files = Array.isArray(submission.files) ? submission.files : [];
  const panel = document.querySelector('#formsInboxList');
  if (!panel || !files.length) return;
  const actions = el('article', { className: 'list-item compact' }, [
    el('span', { text: 'Private files' }),
    el('strong', { text: `${files.length} stored attachment${files.length === 1 ? '' : 's'}` }),
    el('div', { className: 'item-actions' }, files.slice(0, 6).map((file) => el('button', {
      text: file.name || 'Download',
      attrs: {
        type: 'button',
        'data-form-action': 'download-file',
        'data-file-key': file.key || '',
        'data-file-name': file.name || 'form-upload'
      }
    })))
  ]);
  panel.prepend(actions);
}

async function refreshFormsInbox(token = storedToken()) {
  const form = document.querySelector('#formsFilterForm');
  if (!form) return null;
  if (!token) {
    setMessage('#formsStatus', 'Paste a shared gate session first.');
    return null;
  }
  syncFormsDefaults();
  const query = formsQuery(form);
  if (!query.get('project_id') || !query.get('deployment_id')) {
    setMessage('#formsStatus', 'Project and deployment are required.');
    return null;
  }
  setMessage('#formsStatus', 'Loading form submissions...');
  const data = await apiJson(`/api/skyenet/forms-inbox?${query.toString()}`, token);
  renderFormsInbox(data);
  return data;
}

async function openFormSubmission(receiptKey, token = storedToken()) {
  const query = formsQuery();
  query.set('receipt_key', receiptKey);
  const data = await apiJson(`/api/skyenet/forms-submission?${query.toString()}`, token);
  renderFormsDetail(data);
  return data;
}

async function updateFormSubmission(receiptKey, token = storedToken()) {
  const query = formsQuery();
  const result = await apiRequest('/api/skyenet/forms-submission', token, {
    method: 'PATCH',
    body: {
      workspace_id: query.get('workspace_id') || undefined,
      project_id: query.get('project_id'),
      deployment_id: query.get('deployment_id'),
      receipt_key: receiptKey,
      status: 'read',
      spam_status: 'not_spam',
      note: 'Marked read from SkyeNet console'
    }
  });
  renderFormsDetail(result);
  await refreshFormsInbox(token);
  return result;
}

async function notifyFormSubmission(receiptKey, token = storedToken()) {
  const query = formsQuery();
  const result = await apiRequest('/api/skyenet/forms-notify', token, {
    method: 'POST',
    body: {
      workspace_id: query.get('workspace_id') || undefined,
      project_id: query.get('project_id'),
      deployment_id: query.get('deployment_id'),
      receipt_key: receiptKey
    }
  });
  renderFormsDetail(result);
  await refreshFormsInbox(token);
  return result;
}

async function downloadFormFile(fileKey, filename, token = storedToken()) {
  const query = formsQuery();
  query.set('file_key', fileKey);
  const response = await fetch(`/api/skyenet/forms-file?${query.toString()}`, { headers: authHeaders(token) });
  if (!response.ok) {
    const detail = await response.json().catch(async () => ({ error: await response.text().catch(() => '') }));
    throw new Error(detail.error || detail.code || `Form file download failed with HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = downloadNameFromDisposition(response.headers.get('content-disposition'), filename || 'form-upload');
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  setMessage('#formsStatus', `Downloaded ${anchor.download}.`);
}

function selectedEnvProject() {
  const input = document.querySelector('#envForm [name="project_id"]');
  return text(input?.value || new URLSearchParams(window.location.search).get('project_id') || '');
}

function envQuery(projectId = selectedEnvProject()) {
  const params = new URLSearchParams(window.location.search);
  const query = new URLSearchParams();
  const workspace = params.get('workspace_id') || params.get('workspace') || '';
  if (workspace) query.set('workspace_id', workspace);
  if (projectId) query.set('project_id', projectId);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

function renderEnvVars(data = {}) {
  const node = document.querySelector('#envList');
  if (!node) return;
  const vars = Array.isArray(data.env) ? data.env : [];
  if (!vars.length) {
    node.replaceChildren(el('p', { text: selectedEnvProject() ? 'No env variables recorded for this project.' : 'Enter a project slug to manage env variables.' }));
    return;
  }
  node.replaceChildren(...vars.map((record) => el('article', { className: 'list-item compact' }, [
    el('span', { text: record.scope || 'production' }),
    el('strong', { text: record.key || 'ENV_KEY' }),
    el('small', { text: `${record.secret === false ? 'Plain' : 'Secret'} - ${record.value_preview || 'redacted'} - ${dateLabel(record.updated_at)}` })
  ])));
}

function renderSupportProfile(profile = {}) {
  const node = document.querySelector('#supportProfile');
  if (!node) return;
  const emails = Array.isArray(profile.emails) ? profile.emails : [];
  const phones = Array.isArray(profile.phones) ? profile.phones : [];
  const rows = [
    el('article', { className: 'list-item compact' }, [
      el('span', { text: 'Approved profile' }),
      el('strong', { text: text(profile.organization, 'Skyes Over London LC') }),
      profile.source
        ? el('a', { text: 'Source page', attrs: { href: profile.source } })
        : el('small', { text: 'Source page unavailable' })
    ])
  ];
  if (profile.public_site) {
    rows.push(el('article', { className: 'list-item compact' }, [
      el('span', { text: 'Public site' }),
      el('strong', { text: profile.public_site }),
      el('a', { text: 'Open site', attrs: { href: profile.public_site } })
    ]));
  }
  for (const record of emails) {
    rows.push(el('article', { className: 'list-item compact' }, [
      el('span', { text: record.label || 'Email' }),
      el('strong', { text: record.value || '' }),
      record.href ? el('a', { text: 'Email', attrs: { href: record.href } }) : el('small', { text: 'No email link' })
    ]));
  }
  for (const record of phones) {
    rows.push(el('article', { className: 'list-item compact' }, [
      el('span', { text: record.label || 'Phone' }),
      el('strong', { text: record.value || record.e164 || '' }),
      record.href ? el('a', { text: 'Call', attrs: { href: record.href } }) : el('small', { text: 'No phone link' })
    ]));
  }
  node.replaceChildren(...rows);
}

async function refreshSupportProfile() {
  if (!document.querySelector('#supportProfile')) return null;
  try {
    const response = await fetch('/support.json', { headers: { accept: 'application/json' } });
    const body = await response.json();
    if (!response.ok || body?.ok === false) throw new Error(body?.error || `Support profile failed with HTTP ${response.status}`);
    renderSupportProfile(body);
    return body;
  } catch (error) {
    setMessage('#supportProfile', error.message);
    return null;
  }
}

async function refreshEnvVars(token = storedToken(), projectId = selectedEnvProject()) {
  if (!document.querySelector('#envList')) return null;
  if (!token) {
    setMessage('#envList', 'Paste a shared gate session first.');
    return null;
  }
  if (!projectId) {
    renderEnvVars({ env: [] });
    return null;
  }
  const data = await apiJson(`/api/skyenet/env${envQuery(projectId)}`, token);
  renderEnvVars(data);
  return data;
}

async function renderDashboard(token = storedToken()) {
  if (!token) {
    setMessage('#deploymentList', 'Paste a shared gate session or use the shared gate login.');
    setMessage('#routeList', 'Waiting for gate session.');
    setMessage('#receiptList', 'Waiting for gate session.');
    setMessage('#exportStatus', 'Paste a shared gate session before exporting customer data.');
    setMessage('#functionStatus', 'Paste a shared gate session before loading function grants.');
    setMessage('#rollbackStatus', 'Paste a shared gate session before rollback.');
    return null;
  }
  const dashboard = await apiJson(`/api/skyenet/dashboard${workspaceQuery()}`, token);
  renderAccount(dashboard);
  renderDeployments(dashboard);
  renderRoutes(dashboard);
  renderReceipts(dashboard);
  syncFunctionDefaults(dashboard);
  syncFormsDefaults(dashboard);
  return dashboard;
}

async function renderStatus(token = storedToken()) {
  const output = document.querySelector('#statusOutput');
  if (!output) return;
  try {
    const data = await apiJson(`/api/skyenet/status${workspaceQuery()}`, token);
    output.textContent = JSON.stringify({
      service: data.service || 'skyenet',
      status: data.status || '',
      configured: data.configured || null,
      capabilities: {
        static_drop_hosting: data.capabilities?.static_drop_hosting,
        self_service_workspace: data.capabilities?.self_service_workspace,
        source_downloads: data.capabilities?.source_downloads,
        source_transfers: data.capabilities?.source_transfers,
        netlify_style_deploy_file_downloads: data.capabilities?.netlify_style_deploy_file_downloads,
        private_full_project_source_packages: data.capabilities?.private_full_project_source_packages,
        env_variable_registry: data.capabilities?.env_variable_registry,
        source_bundle_format: data.capabilities?.source_bundle_format,
        source_secure_pack_extension: data.capabilities?.source_secure_pack_extension
      }
    }, null, 2);
  } catch (error) {
    output.textContent = error.message;
  }
}

function downloadNameFromDisposition(header, fallback) {
  const match = String(header || '').match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match) return fallback;
  try { return decodeURIComponent(match[1].replace(/"/g, '')); } catch { return match[1].replace(/"/g, ''); }
}

async function downloadSource(url, token, fallbackName) {
  const status = document.querySelector('#sourceStatus');
  if (!token) throw new Error('A shared gate session is required before source download.');
  const target = new URL(url, window.location.origin);
  status.textContent = 'Preparing source download...';
  const response = await fetch(target.toString(), { headers: authHeaders(token) });
  if (!response.ok) {
    const detail = await response.json().catch(async () => ({ error: await response.text().catch(() => '') }));
    throw new Error(detail.error || detail.code || `Source download failed with HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const filename = downloadNameFromDisposition(response.headers.get('content-disposition'), fallbackName || 'skyenet-source.tar');
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  status.textContent = `Downloaded ${filename}.`;
}

function exportQuery(form) {
  const query = new URLSearchParams();
  for (const [key, value] of new FormData(form).entries()) {
    const clean = text(value);
    if (clean) query.set(key, clean);
  }
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
}

function syncExportDefaults() {
  const form = document.querySelector('#exportForm');
  if (!form) return;
  const params = new URLSearchParams(window.location.search);
  const workspaceInput = form.querySelector('[name="workspace_id"]');
  const projectInput = form.querySelector('[name="project_id"]');
  const workspace = params.get('workspace_id') || params.get('workspace') || document.querySelector('#deployForm [name="workspace_id"]')?.value || '';
  const project = params.get('project_id') || document.querySelector('#envForm [name="project_id"]')?.value || document.querySelector('#deployForm [name="project_id"]')?.value || '';
  if (workspaceInput && !workspaceInput.value) workspaceInput.value = workspace;
  if (projectInput && !projectInput.value) projectInput.value = project;
}

async function requestCustomerExport(form, token) {
  const status = document.querySelector('#exportStatus');
  if (!token) throw new Error('A shared gate session is required before exporting customer data.');
  syncExportDefaults();
  if (status) status.textContent = 'Requesting customer export...';
  const response = await fetch(`/api/skyenet/export${exportQuery(form)}`, { headers: authHeaders(token) });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const detail = contentType.includes('json')
      ? await response.json().catch(() => ({}))
      : { error: await response.text().catch(() => '') };
    throw new Error(detail.error || detail.code || `Customer export failed with HTTP ${response.status}`);
  }
  if (contentType.includes('application/json')) {
    const body = await response.json();
    if (body?.ok === false) throw new Error(body.error || body.code || 'Customer export failed.');
    const data = body.skynet || body;
    if (status) status.textContent = data.export_url || data.download_url ? 'Customer export is ready.' : 'Customer export response received.';
    return { kind: 'json', data };
  }
  const blob = await response.blob();
  const filename = downloadNameFromDisposition(response.headers.get('content-disposition'), 'skyenet-customer-export.json');
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  if (status) status.textContent = `Downloaded ${filename}.`;
  return { kind: 'download', filename, bytes: blob.size };
}

async function transferSource(button, token) {
  const status = document.querySelector('#sourceStatus');
  if (!token) throw new Error('A shared gate session is required before source transfer.');
  const select = button.parentElement?.querySelector('[data-source-transfer-method]');
  const headers = authHeaders(token);
  headers.set('content-type', 'application/json');
  status.textContent = 'Storing source transfer artifact...';
  const response = await fetch(button.dataset.sourceTransfer || '/api/skyenet/source-transfer', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      workspace_id: button.dataset.workspaceId || '',
      project_id: button.dataset.projectId || '',
      deployment_id: button.dataset.deploymentId || '',
      method: select?.value || 'secure-skye-pack'
    })
  });
  const body = await response.json().catch(async () => ({ error: await response.text().catch(() => '') }));
  if (!response.ok || body?.ok === false) {
    throw new Error(body.error || body.code || `Source transfer failed with HTTP ${response.status}`);
  }
  const storageLabel = body.storage?.key ? ` Stored at ${body.storage.key}.` : '';
  status.textContent = `Source transfer ${body.status || 'recorded'}: ${body.method?.label || select?.value || 'transfer'}.${storageLabel}`;
}

async function refresh(token = storedToken()) {
  syncExportDefaults();
  syncFunctionDefaults();
  syncFormsDefaults();
  if (document.querySelector('#exportStatus') && token) setMessage('#exportStatus', 'Ready to request a customer export.');
  await Promise.allSettled([renderStatus(token), renderDashboard(token), refreshEnvVars(token), refreshSupportProfile()]);
  await refreshFunctionStatus(token).catch((error) => setMessage('#functionStatus', error.message));
  await refreshFormsInbox(token).catch((error) => setMessage('#formsStatus', error.message));
}

const form = document.querySelector('#tokenForm');
if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = document.querySelector('#tokenInput')?.value?.trim() || '';
    if (token) {
      refresh(persistSharedGateToken(token));
    }
  });
}

const envForm = document.querySelector('#envForm');
if (envForm) {
  envForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.querySelector('#envStatus');
    const token = storedToken();
    const data = Object.fromEntries(new FormData(envForm).entries());
    data.secret = Boolean(envForm.querySelector('[name="secret"]')?.checked);
    try {
      if (!token) throw new Error('A shared gate session is required before saving env variables.');
      status.textContent = 'Saving env variable...';
      const result = await apiRequest('/api/skyenet/env', token, { method: 'POST', body: data });
      status.textContent = `Saved ${result.env?.key || data.key}. Values stay redacted in this console.`;
      envForm.querySelector('[name="value"]').value = '';
      await refreshEnvVars(token, data.project_id);
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

const exportForm = document.querySelector('#exportForm');
if (exportForm) {
  syncExportDefaults();
  exportForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = exportForm.querySelector('button[type="submit"]');
    const resultNode = document.querySelector('#exportResult');
    const token = storedToken();
    button.disabled = true;
    try {
      const result = await requestCustomerExport(exportForm, token);
      if (resultNode) resultNode.textContent = JSON.stringify(result.data || result, null, 2);
    } catch (error) {
      setMessage('#exportStatus', error.message);
      if (resultNode) resultNode.textContent = JSON.stringify({ ok: false, error: error.message }, null, 2);
    } finally {
      button.disabled = false;
    }
  });
}

const deployForm = document.querySelector('#deployForm');
if (deployForm) {
  const projectInput = deployForm.querySelector('[name="project_id"]');
  const mountInput = deployForm.querySelector('[name="mount_path"]');
  const modeInput = deployForm.querySelector('[name="url_mode"]');
  projectInput?.addEventListener('input', () => syncDeployMount(projectInput.value));
  modeInput?.addEventListener('change', () => {
    mountInput.dataset.touched = '';
    syncDeployMount(projectInput?.value || '');
  });
  mountInput?.addEventListener('input', () => { mountInput.dataset.touched = 'true'; });
  deployForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = deployForm.querySelector('button[type="submit"]');
    const resultNode = document.querySelector('#deployResult');
    const token = storedToken();
    button.disabled = true;
    try {
      const result = await publishPackageFromConsole(deployForm, token);
      if (resultNode) resultNode.textContent = JSON.stringify(result, null, 2);
      const projectField = envForm?.querySelector('[name="project_id"]');
      if (projectField && !projectField.value) projectField.value = result.project_id;
      const exportProjectField = exportForm?.querySelector('[name="project_id"]');
      const exportWorkspaceField = exportForm?.querySelector('[name="workspace_id"]');
      if (exportProjectField && !exportProjectField.value) exportProjectField.value = result.project_id;
      if (exportWorkspaceField && !exportWorkspaceField.value) exportWorkspaceField.value = result.workspace_id;
      await refresh(token);
    } catch (error) {
      setMessage('#deployStatus', error.message);
      if (resultNode) resultNode.textContent = JSON.stringify({ ok: false, error: error.message }, null, 2);
    } finally {
      button.disabled = false;
    }
  });
}

const functionFilterForm = document.querySelector('#functionFilterForm');
if (functionFilterForm) {
  syncFunctionDefaults();
  functionFilterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = functionFilterForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await refreshFunctionStatus(storedToken());
    } catch (error) {
      setMessage('#functionStatus', error.message);
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-function-action]');
  if (!button) return;
  event.preventDefault();
  button.disabled = true;
  try {
    setFunctionFormFromButton(button);
    await refreshFunctionStatus(storedToken());
  } catch (error) {
    setMessage('#functionStatus', error.message);
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-rollback-deployment]');
  if (!button) return;
  event.preventDefault();
  button.disabled = true;
  try {
    await rollbackDeployment(button, storedToken());
  } catch (error) {
    setMessage('#rollbackStatus', error.message);
  } finally {
    button.disabled = false;
  }
});

const formsFilterForm = document.querySelector('#formsFilterForm');
if (formsFilterForm) {
  syncFormsDefaults();
  formsFilterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = formsFilterForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await refreshFormsInbox(storedToken());
    } catch (error) {
      setMessage('#formsStatus', error.message);
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-form-action]');
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.formAction;
  button.disabled = true;
  try {
    if (action === 'open') await openFormSubmission(button.dataset.receiptKey || '');
    if (action === 'read') await updateFormSubmission(button.dataset.receiptKey || '');
    if (action === 'notify') await notifyFormSubmission(button.dataset.receiptKey || '');
    if (action === 'download-file') await downloadFormFile(button.dataset.fileKey || '', button.dataset.fileName || 'form-upload');
  } catch (error) {
    setMessage('#formsStatus', error.message);
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-source-download]');
  if (!button) return;
  event.preventDefault();
  button.disabled = true;
  try {
    await downloadSource(button.dataset.sourceDownload, storedToken(), button.dataset.sourceName);
  } catch (error) {
    setMessage('#sourceStatus', error.message);
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-source-transfer]');
  if (!button) return;
  event.preventDefault();
  button.disabled = true;
  try {
    await transferSource(button, storedToken());
  } catch (error) {
    setMessage('#sourceStatus', error.message);
  } finally {
    button.disabled = false;
  }
});

refresh();

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
