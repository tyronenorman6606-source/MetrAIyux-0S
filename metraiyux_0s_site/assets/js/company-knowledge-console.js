(function () {
  const script = document.currentScript || {};
  const mode = script.dataset?.mode || document.body.dataset.companyKnowledgeMode || 'admin';
  const platformDefault = mode === 'admin';
  const state = {
    bases: [],
    items: [],
    hits: [],
    selectedBaseId: platformDefault ? 'metraiyux-0s' : '',
    endpoint: ''
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    endpoint: $('knowledgeEndpoint'),
    token: $('knowledgeToken'),
    status: $('knowledgeStatus'),
    baseForm: $('knowledgeBaseForm'),
    itemForm: $('knowledgeItemForm'),
    searchForm: $('knowledgeSearchForm'),
    baseScope: $('knowledgeBaseScope'),
    baseId: $('knowledgeBaseId'),
    clientId: $('knowledgeClientId'),
    workspaceId: $('knowledgeWorkspaceId'),
    baseName: $('knowledgeBaseName'),
    baseDescription: $('knowledgeBaseDescription'),
    itemBaseId: $('knowledgeItemBaseId'),
    itemTitle: $('knowledgeItemTitle'),
    itemContent: $('knowledgeItemContent'),
    itemTags: $('knowledgeItemTags'),
    sourceKind: $('knowledgeSourceKind'),
    vaultReceiptId: $('knowledgeVaultReceiptId'),
    driveFileId: $('knowledgeDriveFileId'),
    query: $('knowledgeQuery'),
    baseRows: $('knowledgeBaseRows'),
    itemRows: $('knowledgeItemRows'),
    searchRows: $('knowledgeSearchRows'),
    contextBox: $('knowledgeContext'),
    loadBases: $('loadKnowledgeBases'),
    loadItems: $('loadKnowledgeItems'),
    exportContext: $('exportKnowledgeContext')
  };

  function cleanOrigin(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function slug(value, fallback = '') {
    return String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || fallback;
  }

  function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Number(bytes || 0);
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  function setStatus(message, ok = true) {
    if (!els.status) return;
    els.status.textContent = message;
    els.status.classList.toggle('warning', !ok);
  }

  function activeBearer() {
    const bridge = window.SkygateAuthBridge?.token?.() || window.MetrAIyuxGateBridge?.current?.()?.token || '';
    if (bridge) return bridge;
    return '';
  }

  function authHeaders(extra = {}) {
    const bearer = activeBearer();
    const bridgeHeaders = window.MetrAIyuxGateBridge?.headers?.({
      'x-skye-platform': 'metraiyux-0s',
      'x-skye-usage-lane': 'company-knowledge'
    }) || {};
    return {
      ...extra,
      ...bridgeHeaders,
      ...(bearer ? { authorization: `Bearer ${bearer}`, 'x-skye-gate-session': bearer } : {})
    };
  }

  async function recordKnowledgeTelemetry(eventType, detail = {}) {
    const base = basePayload();
    try {
      const response = await fetch('/api/0s-command-bridge/events', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          source_app: 'company-knowledge',
          source_surface: mode === 'admin' ? 'admin-company-knowledge-console' : 'saas-company-knowledge-console',
          lane: 'company-knowledge',
          event_type: eventType,
          summary: detail.summary || `${eventType} · ${detail.path || base.knowledgeBaseId || 'knowledge-base'}`,
          entity: {
            kind: detail.entity_kind || 'knowledge-base',
            id: detail.entity_id || detail.knowledgeBaseId || base.knowledgeBaseId,
            label: detail.entity_label || base.displayName || base.knowledgeBaseId
          },
          ids: {
            knowledge_base_id: detail.knowledgeBaseId || base.knowledgeBaseId || '',
            knowledge_item_id: detail.knowledgeItemId || detail.itemId || '',
            client_id: detail.clientId || base.clientId || '',
            workspace_id: detail.workspaceId || base.workspaceId || ''
          },
          links: [{ label: 'Company Knowledge', href: `${location.pathname}${location.search}`, kind: 'surface' }],
          metadata: {
            ...detail,
            mode,
            owner_type: base.ownerType,
            pathname: location.pathname,
            title: document.title || ''
          }
        })
      });
      const data = await response.json().catch(() => ({ ok: response.ok, status: response.status }));
      document.dispatchEvent(new CustomEvent('company-knowledge:telemetry', { detail: { ok: Boolean(response.ok && data?.ok !== false), status: response.status, data } }));
      return data;
    } catch (error) {
      return { ok: false, error: error?.message || 'knowledge_telemetry_write_failed' };
    }
  }

  function shouldRecordApi(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'GET') return true;
    return /\/api\/0s\/company-knowledge\/(?:context|status)/.test(path);
  }

  async function api(path, options = {}) {
    const endpoint = state.endpoint || cleanOrigin(els.endpoint?.value || location.origin);
    const response = await fetch(`${endpoint}${path}`, {
      ...options,
      credentials: 'include',
      headers: authHeaders({
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {})
      })
    });
    const data = await response.json().catch(() => ({ ok: false, error: `Invalid JSON response from ${path}` }));
    if (shouldRecordApi(path, options)) {
      recordKnowledgeTelemetry(response.ok && data.ok !== false ? 'company_knowledge.worker_confirmed' : 'company_knowledge.worker_failed', {
        path,
        method: String(options.method || 'GET').toUpperCase(),
        status: response.status,
        ok: response.ok && data.ok !== false,
        knowledgeBaseId: data.base?.id || data.item?.knowledgeBaseId || basePayload().knowledgeBaseId,
        knowledgeItemId: data.item?.id || ''
      });
    }
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed with ${response.status}`);
    return data;
  }

  function applyTenantDefaults() {
    const session = window.MetrAIyuxGateBridge?.current?.() || {};
    const query = new URLSearchParams(location.search);
    const clientId = query.get('clientId') || query.get('client') || session.client_id || session.clientId || '';
    const workspaceId = query.get('workspaceId') || query.get('workspace') || session.workspace_id || session.workspaceId || '';
    if (!platformDefault) {
      if (els.baseScope) els.baseScope.value = 'tenant';
      if (els.clientId && !els.clientId.value) els.clientId.value = clientId;
      if (els.workspaceId && !els.workspaceId.value) els.workspaceId.value = workspaceId;
      const baseId = slug(query.get('baseId') || (clientId ? `tenant-${clientId}` : workspaceId ? `tenant-${workspaceId}` : ''), '');
      if (els.baseId && !els.baseId.value) els.baseId.value = baseId;
      if (els.itemBaseId && !els.itemBaseId.value) els.itemBaseId.value = baseId;
      state.selectedBaseId = baseId;
    }
  }

  function basePayload() {
    const scope = els.baseScope?.value || (platformDefault ? 'platform' : 'tenant');
    const clientId = els.clientId?.value || '';
    const workspaceId = els.workspaceId?.value || '';
    const fallbackBase = scope === 'platform' ? 'metraiyux-0s' : `tenant-${clientId || workspaceId || 'company'}`;
    return {
      ownerType: scope,
      knowledgeBaseId: els.baseId?.value || fallbackBase,
      clientId,
      workspaceId,
      displayName: els.baseName?.value || (scope === 'platform' ? 'MetrAIyux 0S Company Knowledge' : 'Company Knowledge'),
      description: els.baseDescription?.value || ''
    };
  }

  function itemPayload() {
    const base = basePayload();
    return {
      ...base,
      knowledgeBaseId: els.itemBaseId?.value || base.knowledgeBaseId,
      title: els.itemTitle?.value || '',
      content: els.itemContent?.value || '',
      tags: els.itemTags?.value || '',
      source: {
        kind: els.sourceKind?.value || 'manual_drop',
        vaultReceiptId: els.vaultReceiptId?.value || '',
        driveFileId: els.driveFileId?.value || ''
      }
    };
  }

  function renderBases() {
    if (!els.baseRows) return;
    els.baseRows.innerHTML = state.bases.length
      ? state.bases.map((base) => `
        <tr>
          <td><button type="button" class="knowledge-row-button" data-select-base="${escapeHtml(base.id)}">${escapeHtml(base.displayName || base.id)}</button><span>${escapeHtml(base.id)}</span></td>
          <td>${escapeHtml(base.ownerType)}<span>${escapeHtml(base.workspaceId || '')}</span></td>
          <td>${escapeHtml(base.clientId || '')}<span>${escapeHtml(base.valleyBusinessId || '')}</span></td>
          <td>${escapeHtml(String(base.itemCount || 0))}<span>${escapeHtml(formatBytes(base.byteCount || 0))}</span></td>
          <td>${escapeHtml(base.updatedAt || '')}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="5">No knowledge bases loaded.</td></tr>';
    els.baseRows.querySelectorAll('[data-select-base]').forEach((button) => {
      button.addEventListener('click', () => {
        selectBase(button.dataset.selectBase);
      });
    });
  }

  function renderItems() {
    if (!els.itemRows) return;
    els.itemRows.innerHTML = state.items.length
      ? state.items.map((item) => `
        <tr>
          <td><strong>${escapeHtml(item.title || item.id)}</strong><span>${escapeHtml(item.id)}</span></td>
          <td>${escapeHtml((item.tags || []).join(', '))}<span>${escapeHtml(item.source?.kind || '')}</span></td>
          <td>${escapeHtml(formatBytes(item.byteLength || 0))}<span>${escapeHtml(String(item.sha256 || '').slice(0, 16))}</span></td>
          <td>${escapeHtml(item.updatedAt || '')}</td>
          <td><button type="button" class="knowledge-row-button danger" data-delete-item="${escapeHtml(item.id)}">Delete</button></td>
        </tr>
      `).join('')
      : '<tr><td colspan="5">No knowledge items in this base yet.</td></tr>';
    els.itemRows.querySelectorAll('[data-delete-item]').forEach((button) => {
      button.addEventListener('click', () => deleteItem(button.dataset.deleteItem));
    });
  }

  function renderSearch(data = {}) {
    if (!els.searchRows) return;
    state.hits = data.hits || [];
    els.searchRows.innerHTML = state.hits.length
      ? state.hits.map((hit, index) => `
        <article class="knowledge-hit">
          <h3>${index + 1}. ${escapeHtml(hit.title || hit.id)}</h3>
          <p>${escapeHtml(hit.snippet || hit.summary || '')}</p>
          <small>${escapeHtml(hit.id)} · ${escapeHtml(hit.source?.kind || 'manual')} · score ${escapeHtml(hit.score)}</small>
        </article>
      `).join('')
      : '<p>No matching knowledge items found.</p>';
    if (els.contextBox) els.contextBox.textContent = data.context || '';
  }

  function selectBase(baseId) {
    state.selectedBaseId = baseId || '';
    if (els.itemBaseId) els.itemBaseId.value = state.selectedBaseId;
    if (els.baseId) els.baseId.value = state.selectedBaseId;
    loadItems().catch((error) => setStatus(error.message, false));
  }

  async function loadStatus() {
    const data = await api('/api/0s/company-knowledge/status');
    setStatus(`Storage: ${data.storage.primary} objects, ${data.storage.metadata} metadata. Actor: ${data.actor.actor || 'gate-session'}.`);
    return data;
  }

  async function loadBases() {
    const params = new URLSearchParams();
    const payload = basePayload();
    if (payload.knowledgeBaseId) params.set('knowledgeBaseId', payload.knowledgeBaseId);
    if (payload.clientId) params.set('clientId', payload.clientId);
    if (payload.workspaceId) params.set('workspaceId', payload.workspaceId);
    const data = await api(`/api/0s/company-knowledge/bases?${params.toString()}`);
    state.bases = data.bases || [];
    renderBases();
    if (!state.selectedBaseId && state.bases[0]) selectBase(state.bases[0].id);
    setStatus(`Loaded ${state.bases.length} knowledge base${state.bases.length === 1 ? '' : 's'}.`);
    return data;
  }

  async function saveBase(event) {
    event?.preventDefault();
    const data = await api('/api/0s/company-knowledge/bases', {
      method: 'POST',
      body: JSON.stringify(basePayload())
    });
    state.selectedBaseId = data.base.id;
    if (els.itemBaseId) els.itemBaseId.value = data.base.id;
    setStatus(`Saved ${data.base.displayName}.`);
    await loadBases();
    return data;
  }

  async function loadItems() {
    const baseId = state.selectedBaseId || els.itemBaseId?.value || els.baseId?.value || '';
    if (!baseId) {
      setStatus('Select or save a knowledge base first.', false);
      return null;
    }
    const params = new URLSearchParams({ knowledgeBaseId: baseId, limit: '100' });
    const data = await api(`/api/0s/company-knowledge/items?${params.toString()}`);
    state.items = data.items || [];
    renderItems();
    setStatus(`Loaded ${state.items.length} item${state.items.length === 1 ? '' : 's'} from ${data.base.displayName}.`);
    return data;
  }

  async function saveItem(event) {
    event?.preventDefault();
    const payload = itemPayload();
    if (!payload.content && !payload.source.vaultReceiptId && !payload.source.driveFileId) {
      setStatus('Add text content or attach a vault/drive reference.', false);
      return null;
    }
    const path = payload.source.vaultReceiptId ? '/api/0s/company-knowledge/vault-ingest' : '/api/0s/company-knowledge/items';
    const data = await api(path, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.selectedBaseId = data.base.id;
    if (els.itemBaseId) els.itemBaseId.value = data.base.id;
    if (els.itemTitle) els.itemTitle.value = '';
    if (els.itemContent) els.itemContent.value = '';
    if (els.itemTags) els.itemTags.value = '';
    setStatus(`Saved knowledge item ${data.item.title}.`);
    await loadItems();
    await loadBases();
    return data;
  }

  async function deleteItem(itemId) {
    if (!itemId) return;
    const data = await api(`/api/0s/company-knowledge/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
    setStatus(`Deleted ${data.item.title || itemId}.`);
    await loadItems();
    await loadBases();
  }

  async function search(event) {
    event?.preventDefault();
    const payload = {
      ...basePayload(),
      knowledgeBaseId: state.selectedBaseId || els.itemBaseId?.value || els.baseId?.value,
      query: els.query?.value || '',
      limit: 8
    };
    const data = await api('/api/0s/company-knowledge/context', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    renderSearch(data);
    setStatus(`Found ${data.hits.length} matching item${data.hits.length === 1 ? '' : 's'}.`);
    return data;
  }

  function exportContext() {
    const context = els.contextBox?.textContent || '';
    const payload = {
      exportedAt: new Date().toISOString(),
      baseId: state.selectedBaseId,
      query: els.query?.value || '',
      context,
      hits: state.hits
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `company-knowledge-context-${state.selectedBaseId || 'base'}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function bind() {
    els.endpoint?.addEventListener('change', () => {
      state.endpoint = cleanOrigin(els.endpoint.value || location.origin);
      localStorage.setItem('metraiyux.companyKnowledge.endpoint', state.endpoint);
    });
    els.baseForm?.addEventListener('submit', saveBase);
    els.itemForm?.addEventListener('submit', saveItem);
    els.searchForm?.addEventListener('submit', search);
    els.loadBases?.addEventListener('click', () => loadBases().catch((error) => setStatus(error.message, false)));
    els.loadItems?.addEventListener('click', () => loadItems().catch((error) => setStatus(error.message, false)));
    els.exportContext?.addEventListener('click', exportContext);
    els.baseScope?.addEventListener('change', () => {
      if (els.baseScope.value === 'platform') {
        els.baseId.value = 'metraiyux-0s';
        els.itemBaseId.value = 'metraiyux-0s';
      }
    });
  }

  async function boot() {
    state.endpoint = cleanOrigin(localStorage.getItem('metraiyux.companyKnowledge.endpoint') || location.origin);
    if (els.endpoint) els.endpoint.value = state.endpoint;
    applyTenantDefaults();
    bind();
    try {
      await loadStatus();
      await loadBases();
      if (state.selectedBaseId) await loadItems();
    } catch (error) {
      setStatus(error.message || 'Company knowledge could not load. Sign into the shared 0S gate first.', false);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
