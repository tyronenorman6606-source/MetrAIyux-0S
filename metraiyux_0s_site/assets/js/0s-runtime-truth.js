(function(){
  'use strict';

  const script = document.currentScript;
  const surfaceId = script?.dataset.surfaceId || document.documentElement.dataset.surfaceId || 'home-shell';
  const registryPath = script?.dataset.registry || '/audits/0S_SURFACE_STATUS.json';
  const repairHref = script?.dataset.repairHref || '/audits/0S_SURFACE_FUNCTIONALITY_AUDIT_2026-05-19.md#phase-4-ui-truth-layer';
  const statusClass = {
    'Production live': 'os-runtime-status-live',
    'Gate required': 'os-runtime-status-gated',
    'Local only': 'os-runtime-status-local',
    'Static proof': 'os-runtime-status-static',
    'Proof only': 'os-runtime-status-proof',
    'Backend missing': 'os-runtime-status-broken',
    'Partial': 'os-runtime-status-partial'
  };
  const runtimeState = {
    record: null,
    health: { label: 'Checking', kind: 'pending' },
    issues: []
  };
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function tags(record){
    return Array.isArray(record?.statusTags) ? record.statusTags : [];
  }

  function inferAuth(record){
    const recordTags = tags(record);
    if(recordTags.includes('GATED')) return 'Gate/session required';
    if(recordTags.includes('LOCAL')) return 'Local device only';
    if(recordTags.includes('STATIC') || recordTags.includes('PROOF_ONLY')) return 'No workflow auth';
    return 'Public read, protected writes';
  }

  function inferStorage(record){
    const recordTags = tags(record);
    if(recordTags.includes('LOCAL')) return 'Browser-local/exportable';
    if(recordTags.includes('STATIC') || recordTags.includes('PROOF_ONLY')) return 'Static proof/data';
    if(record?.apiBase) return 'Worker/KV/provider path';
    return 'No shared backend storage';
  }

  function modeLabel(record){
    const recordTags = tags(record);
    return recordTags.length ? recordTags.join(' / ') : 'STATIC';
  }

  function healthPath(apiBase){
    if(!apiBase) return '';
    return `${String(apiBase).replace(/\/$/, '')}/health`;
  }

  function classifyHealthStatus(status){
    if(status >= 200 && status < 300) return { label: `Backend health ${status}`, kind: 'live' };
    if(status === 401 || status === 403) return { label: `Backend gated ${status}`, kind: 'gated' };
    if(status === 404) return { label: 'Backend not mounted', kind: 'missing' };
    if(status === 503) return { label: 'Backend missing config', kind: 'missing' };
    if(status === 405) return { label: 'Health method mismatch', kind: 'partial' };
    return { label: `Backend returned ${status}`, kind: 'partial' };
  }

  async function loadRegistry(){
    if(window.__metraiyuxRuntimeRegistry) return window.__metraiyuxRuntimeRegistry;
    const response = await nativeFetch(registryPath, {
      cache: 'no-store',
      headers: { accept: 'application/json', 'x-metraiyux-runtime-probe': '1' }
    });
    if(!response.ok) throw new Error(`registry ${response.status}`);
    const data = await response.json();
    const registry = new Map((data.surfaces || []).map(record => [record.id, record]));
    window.__metraiyuxRuntimeRegistry = registry;
    return registry;
  }

  async function probeHealth(record){
    if(!nativeFetch) return { label: 'Browser fetch unavailable', kind: 'missing' };
    const path = record?.healthPath || healthPath(record?.apiBase);
    if(!path) return { label: 'No backend mounted', kind: 'none' };
    try{
      const response = await nativeFetch(path, {
        cache: 'no-store',
        headers: { accept: 'application/json', 'x-metraiyux-runtime-probe': '1' }
      });
      return classifyHealthStatus(response.status);
    }catch(_err){
      return { label: 'Network unavailable', kind: 'missing' };
    }
  }

  function renderTruth(){
    const record = runtimeState.record || {
      id: surfaceId,
      name: surfaceId,
      runtimeBadge: 'Backend missing',
      statusTags: ['BROKEN'],
      proof: 'Surface registry did not load.'
    };
    const badge = record.runtimeBadge || 'Static proof';
    const cls = statusClass[badge] || 'os-runtime-status-static';
    const el = document.querySelector('[data-os-runtime-truth]') || document.createElement('aside');
    el.className = 'os-runtime-truth';
    el.dataset.osRuntimeTruth = 'true';
    el.setAttribute('aria-label', '0S runtime truth');
    el.innerHTML = `
      <div class="os-runtime-truth__inner">
        <div class="os-runtime-truth__head">
          <div class="os-runtime-truth__title">
            <strong>${escapeHtml(record.name || surfaceId)}</strong>
            <span>${escapeHtml(record.publicRoute || location.pathname)}</span>
          </div>
          <span class="os-runtime-truth__badge ${cls}">${escapeHtml(badge)}</span>
        </div>
        <div class="os-runtime-truth__grid">
          <div class="os-runtime-truth__cell"><span>Mode</span><b>${escapeHtml(modeLabel(record))}</b></div>
          <div class="os-runtime-truth__cell"><span>Backend</span><b>${escapeHtml(record.apiBase || 'No 0S API mounted')}</b></div>
          <div class="os-runtime-truth__cell"><span>Auth</span><b>${escapeHtml(inferAuth(record))}</b></div>
          <div class="os-runtime-truth__cell"><span>Storage</span><b>${escapeHtml(inferStorage(record))}</b></div>
        </div>
        <div class="os-runtime-truth__foot">
          <span>${escapeHtml(runtimeState.health.label)}. ${escapeHtml(record.proof || '')}</span>
          <a href="${escapeHtml(repairHref)}">Repair notes</a>
        </div>
      </div>
    `;
    if(!el.parentNode) document.body.prepend(el);
    document.body.classList.add('os-runtime-truth-mounted');
  }

  function shouldNormalizeEmptyStates(record, health){
    if(!record?.apiBase) return false;
    return health.kind === 'missing';
  }

  function normalizeEmptyStates(record, health){
    if(!shouldNormalizeEmptyStates(record, health)) return;
    const emptyNodes = [...document.querySelectorAll('.empty,.empty-state,[data-empty-state]')];
    emptyNodes.forEach(node => {
      const text = node.textContent.trim();
      if(!/^No\b[\s\S]{0,80}\byet\.?$/i.test(text) && !/^No records yet\.?$/i.test(text)) return;
      node.dataset.originalEmptyText = text;
      node.classList.add('os-runtime-empty-warning');
      if(node.children.length){
        const heading = node.querySelector('h1,h2,h3,h4,strong,b') || node;
        heading.textContent = 'Backend not mounted';
      }else{
        node.textContent = 'Backend not mounted';
      }
    });
  }

  function describeApiError(input, init, responseOrError){
    const url = typeof input === 'string' || input instanceof URL
      ? new URL(String(input), location.href)
      : new URL(input?.url || location.href, location.href);
    const method = init?.method || input?.method || 'GET';
    if(responseOrError instanceof Response){
      const status = responseOrError.status;
      const labels = {
        401: 'Auth required',
        403: 'Access denied',
        404: 'API route not mounted',
        405: 'Method not allowed',
        503: 'Backend missing configuration'
      };
      return {
        status,
        method,
        path: url.pathname,
        label: labels[status] || `API returned ${status}`,
        detail: `${method} ${url.pathname} returned ${status}`
      };
    }
    return {
      status: 0,
      method,
      path: url.pathname,
      label: 'Network error',
      detail: `${method} ${url.pathname} could not reach the backend`
    };
  }

  function renderApiError(target, issue){
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if(!host) return;
    host.innerHTML = `
      <div class="os-runtime-api-error">
        <strong>${escapeHtml(issue.label || 'API error')}</strong>
        <span>${escapeHtml(issue.detail || '')}</span>
      </div>
    `;
  }

  function renderIssueToast(){
    if(!runtimeState.issues.length) return;
    const host = document.querySelector('[data-os-runtime-api-errors]') || document.createElement('div');
    host.className = 'os-runtime-api-errors';
    host.dataset.osRuntimeApiErrors = 'true';
    host.innerHTML = runtimeState.issues.slice(0, 3).map(issue => `
      <div class="os-runtime-api-error">
        <strong>${escapeHtml(issue.status ? `${issue.status} ${issue.label}` : issue.label)}</strong>
        <span>${escapeHtml(issue.detail)}</span>
      </div>
    `).join('');
    if(!host.parentNode) document.body.appendChild(host);
  }

  function isRuntimeProbe(input, init){
    const headers = new Headers(init?.headers || input?.headers || {});
    return headers.get('x-metraiyux-runtime-probe') === '1';
  }

  function shouldMonitorApi(input, init){
    if(isRuntimeProbe(input, init)) return false;
    try{
      const url = typeof input === 'string' || input instanceof URL
        ? new URL(String(input), location.href)
        : new URL(input?.url || location.href, location.href);
      return url.origin === location.origin && url.pathname.startsWith('/api/');
    }catch(_err){
      return false;
    }
  }

  function reportIssue(issue){
    runtimeState.issues.unshift(issue);
    runtimeState.issues = runtimeState.issues.slice(0, 5);
    ready(renderIssueToast);
  }

  function installFetchMonitor(){
    if(!nativeFetch || window.__metraiyuxRuntimeFetchMonitor) return;
    window.__metraiyuxRuntimeFetchMonitor = true;
    window.fetch = async function(input, init){
      try{
        const response = await nativeFetch(input, init);
        if(shouldMonitorApi(input, init) && [401, 403, 404, 405, 503].includes(response.status)){
          reportIssue(describeApiError(input, init, response));
        }
        return response;
      }catch(error){
        if(shouldMonitorApi(input, init)) reportIssue(describeApiError(input, init, error));
        throw error;
      }
    };
  }

  window.MetrAIyuxRuntimeTruth = {
    describeApiError,
    renderApiError,
    getState: () => ({ ...runtimeState })
  };

  installFetchMonitor();
  ready(async () => {
    try{
      const registry = await loadRegistry();
      runtimeState.record = registry.get(surfaceId) || registry.get('home-shell');
    }catch(_err){
      runtimeState.record = {
        id: surfaceId,
        name: surfaceId,
        runtimeBadge: 'Backend missing',
        statusTags: ['BROKEN'],
        proof: 'Surface status registry could not be loaded.'
      };
    }
    renderTruth();
    runtimeState.health = await probeHealth(runtimeState.record);
    renderTruth();
    normalizeEmptyStates(runtimeState.record, runtimeState.health);
  });
})();
