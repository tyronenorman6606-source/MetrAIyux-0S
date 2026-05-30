(function () {
  const state = { data: null, filter: 'all' };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function verdictClass(verdict) {
    return String(verdict || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function renderList(selector, items) {
    const target = $(selector);
    if (!target) return;
    target.innerHTML = (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  }

  function renderCounts(data) {
    const counts = (data.claims || []).reduce((memo, claim) => {
      memo.claims += 1;
      if (claim.verdict === 'verified' || claim.verdict === 'stress-backed') memo.verified += 1;
      if (claim.verdict === 'boundary' || (claim.limits || []).length) memo.boundary += 1;
      return memo;
    }, { claims: 0, verified: 0, boundary: 0 });
    Object.entries(counts).forEach(([key, value]) => {
      const node = $(`[data-count="${key}"]`);
      if (node) node.textContent = String(value);
    });
  }

  function renderReceipts(data) {
    const target = $('[data-receipt-grid]');
    if (!target) return;
    target.innerHTML = (data.primaryReceipts || []).map((receipt) => `
      <article class="receipt-card">
        <span>${escapeHtml(receipt.label)}</span>
        <code>${escapeHtml(receipt.path)}</code>
        <p>${escapeHtml(receipt.result)}</p>
      </article>
    `).join('');
  }

  function renderClaims() {
    const target = $('[data-claim-grid]');
    if (!target || !state.data) return;
    const claims = (state.data.claims || []).filter((claim) => state.filter === 'all' || claim.verdict === state.filter);
    target.innerHTML = claims.map((claim) => `
      <article class="claim-card ${verdictClass(claim.verdict)}" data-verdict="${escapeHtml(claim.verdict)}">
        <div class="claim-card-head">
          <span class="badge verdict">${escapeHtml(claim.verdict)}</span>
          <span class="area">${escapeHtml(claim.area)}</span>
        </div>
        <h4>${escapeHtml(claim.claim)}</h4>
        <p><strong>Skeptic challenge:</strong> ${escapeHtml(claim.skepticQuestion)}</p>
        <div class="evidence-stack">
          <strong>Evidence</strong>
          <ul>${(claim.proof || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
        ${(claim.limits || []).length ? `<div class="limit-stack"><strong>Boundary</strong><ul>${claim.limits.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
        <p class="board-line">${escapeHtml(claim.boardRoomLanguage || '')}</p>
      </article>
    `).join('');
  }

  async function fetchJson(route) {
    const response = await fetch(route, { credentials: 'include', headers: { accept: 'application/json' } });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch {
      payload = { raw: text.slice(0, 300) };
    }
    return { ok: response.ok, status: response.status, payload };
  }

  async function refreshLiveChecks() {
    const status = $('[data-live-status]');
    const grid = $('[data-live-checks]');
    if (!status || !grid) return;
    status.textContent = 'Checking live platform services...';
    const routes = [
      ['/api/skymusicnexus/routes/manifest', 'Route manifest'],
      ['/api/skymusicnexus/hub', 'Hub state'],
      ['/api/skymusicnexus/music-assets?action=storage-status', 'Storage status'],
      ['/api/skymusicnexus/observability', 'Observability'],
      ['/api/skymusicnexus/visuals', 'Visual workspace data']
    ];
    const results = await Promise.all(routes.map(async ([route, label]) => {
      try {
        const result = await fetchJson(route);
        return { route, label, ...result };
      } catch (error) {
        return { route, label, ok: false, status: 0, payload: { error: error.message } };
      }
    }));
    const allOk = results.every((item) => item.ok);
    const observability = results.find((item) => item.route.includes('/observability'))?.payload || {};
    const visuals = results.find((item) => item.route.includes('/visuals'))?.payload?.visuals || {};
    const storage = results.find((item) => item.route.includes('storage-status'))?.payload?.storage || observability.storage || {};
    status.textContent = allOk
      ? `Live platform data loaded: storage ${storage.mode || 'unknown'}, activity records ${observability.retained?.auditEvents || 0}, service checks ${(visuals.route_health || []).length || 0}.`
      : `Claim ledger is shown; live check has ${results.filter((item) => !item.ok).length} service check(s) unavailable.`;
    grid.innerHTML = results.map((item) => {
      const detail = item.route.includes('visuals')
        ? `${(item.payload?.visuals?.route_health || []).length || 0} services / ${(item.payload?.visuals?.flows || []).length || 0} flows`
        : item.route.includes('observability')
          ? `${item.payload?.storage?.mode || 'unknown'} / ${item.payload?.retained?.auditEvents || 0} activity records`
          : item.route.includes('storage-status')
            ? `${item.payload?.storage?.mode || 'unknown'} / direct upload ${item.payload?.storage?.directUploadAvailable === true ? 'available' : 'not available'}`
            : item.payload?.base || item.payload?.surface || item.payload?.storage_mode || 'live response';
      return `
        <article class="${item.ok ? 'live-ok' : 'live-fail'}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.status))}</strong>
          <p>${escapeHtml(detail)}</p>
          <code>${escapeHtml(item.route)}</code>
        </article>
      `;
    }).join('');
  }

  function bindFilters() {
    $$('[data-filter-claims]').forEach((button) => {
      button.addEventListener('click', () => {
        state.filter = button.dataset.filterClaims || 'all';
        $$('[data-filter-claims]').forEach((item) => item.classList.toggle('active', item === button));
        renderClaims();
      });
    });
    const refresh = $('[data-action="refresh-live-claims"]');
    if (refresh) refresh.addEventListener('click', refreshLiveChecks);
  }

  async function init() {
    bindFilters();
    try {
      const data = await fetchJson('./data/skeptics-override-claims.json');
      if (!data.ok) throw new Error(`claim ledger returned ${data.status}`);
      state.data = data.payload;
      const verdict = $('[data-verdict-copy]');
      if (verdict) verdict.textContent = state.data.boardRoomVerdict || '';
      renderCounts(state.data);
      renderList('[data-claimable-list]', state.data.claimableNow);
      renderList('[data-boundary-list]', state.data.doNotClaimYet);
      renderReceipts(state.data);
      renderClaims();
    } catch (error) {
      const target = $('[data-claim-grid]');
      if (target) target.innerHTML = `<article class="claim-card boundary"><h4>Claim ledger failed to load.</h4><p>${escapeHtml(error.message)}</p></article>`;
    }
    refreshLiveChecks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
