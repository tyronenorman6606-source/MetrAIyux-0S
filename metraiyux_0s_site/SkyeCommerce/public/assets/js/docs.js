(() => {
  const form = document.getElementById('docs-context-form');
  const grid = document.getElementById('docs-template-grid');
  const statusId = 'docs-status';

  function params() {
    const values = new FormData(form);
    const query = new URLSearchParams();
    query.set('jurisdiction', values.get('jurisdiction') || 'US-AZ');
    if (values.get('storeSlug')) query.set('storeSlug', values.get('storeSlug'));
    query.set('returnTo', '/SkyeCommerce/docs/');
    return query;
  }

  function riskClass(risk = '') {
    if (risk === 'high') return 'doc-risk-high';
    if (risk === 'medium') return 'doc-risk-medium';
    return 'doc-risk-low';
  }

  function render(data) {
    if (!grid) return;
    grid.innerHTML = (data.templates || []).map((template) => `
      <article class="card doc-card">
        <div class="eyebrow">${window.SKYECOM.escapeHtml(template.jurisdiction)} · ${window.SKYECOM.escapeHtml(template.category)}</div>
        <h3>${window.SKYECOM.escapeHtml(template.title)}</h3>
        <p class="muted">${window.SKYECOM.escapeHtml(template.use)}</p>
        <div class="doc-chip ${riskClass(template.risk)}">risk: ${window.SKYECOM.escapeHtml(template.risk)}</div>
        <div class="button-row">
          <a class="button" href="${window.SKYECOM.escapeHtml(template.sovereignDocsUrl)}">Open guided builder</a>
          <a class="ghost-button" href="${window.SKYECOM.escapeHtml(template.skyeDocxMaxUrl)}">Open in SkyeDocxMax</a>
        </div>
      </article>
    `).join('');
  }

  async function load() {
    try {
      const res = await window.SKYECOM.api(`/api/docs/sovereigndocs-kit?${params().toString()}`);
      render(res);
      window.SKYECOM.status(statusId, `${res.templates.length} SovereignDocs commerce templates loaded from the shared 0S lane.`, 'good');
    } catch (error) {
      window.SKYECOM.status(statusId, window.SKYECOM.escapeHtml(error.message || error), 'bad');
    }
  }

  form?.addEventListener('input', () => load());
  document.addEventListener('DOMContentLoaded', load);
})();
