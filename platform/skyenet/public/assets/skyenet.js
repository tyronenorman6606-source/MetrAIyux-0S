const tokenKeys = [
  'metraiyux_0s_gate_session',
  'skye_gate_session',
  'skygate_session',
  'adminBrainToken',
  'quantumskyes_mcp_owner_token'
];

function storedToken() {
  for (const key of tokenKeys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) return value.replace(/^Bearer\s+/i, '').trim();
  }
  return '';
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
    return el('article', { className: 'list-item' }, [
      el('div', {}, [
        el('span', { text: text(deployment.status, 'deployment') }),
        el('strong', { text: text(deployment.project_id, 'project') }),
        el('small', { text: `${text(deployment.deployment_id, 'deployment')} - ${bytes(deployment.total_bytes)} - ${deployment.file_count || 0} files` }),
        el('small', { text: privateSource
          ? `Private source package: ${deployment.source_custody?.private_source_file_count || 0} files - ${bytes(deployment.source_custody?.private_source_total_bytes)}`
          : 'Private source package not recorded; download falls back to public deployed files.' }),
        deployment.live_url ? el('a', { text: deployment.live_url, attrs: { href: deployment.live_url } }) : el('small', { text: 'No live URL recorded' })
      ]),
      el('div', { className: 'item-actions' }, [button, transferSelect, transferButton])
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
    return null;
  }
  const dashboard = await apiJson(`/api/skyenet/dashboard${workspaceQuery()}`, token);
  renderAccount(dashboard);
  renderDeployments(dashboard);
  renderRoutes(dashboard);
  renderReceipts(dashboard);
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
  if (document.querySelector('#exportStatus') && token) setMessage('#exportStatus', 'Ready to request a customer export.');
  await Promise.allSettled([renderStatus(token), renderDashboard(token), refreshEnvVars(token), refreshSupportProfile()]);
}

const form = document.querySelector('#tokenForm');
if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = document.querySelector('#tokenInput')?.value?.trim() || '';
    if (token) {
      localStorage.setItem('skye_gate_session', token.replace(/^Bearer\s+/i, ''));
      refresh(token);
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
