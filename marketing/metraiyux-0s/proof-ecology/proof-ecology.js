(function () {
  const state = { receipts: [], filtered: [] };
  const grid = document.querySelector('[data-proof-grid]');
  const meta = document.querySelector('[data-proof-meta]');
  const search = document.querySelector('[data-proof-search]');
  const status = document.querySelector('[data-proof-status]');
  const category = document.querySelector('[data-proof-category]');

  function text(value) {
    return String(value == null ? '' : value);
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function setStat(name, value) {
    const node = document.querySelector('[data-ledger-stat="' + name + '"]');
    if (node) node.textContent = value;
  }

  function formatDate(value) {
    if (!value) return 'undated';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().replace('.000Z', 'Z');
  }

  function receiptText(item) {
    return [
      item.title,
      item.category,
      item.status,
      item.source,
      item.summary,
      item.mode,
      (item.urls || []).join(' '),
      (item.highlights || []).join(' ')
    ].join(' ').toLowerCase();
  }

  function renderCard(item) {
    const metrics = [];
    if (item.counts && item.counts.actions) metrics.push(item.counts.actions + ' actions');
    if (item.counts && item.counts.scrollStops) metrics.push(item.counts.scrollStops + ' scroll stops');
    if (item.viewports && item.viewports.length) metrics.push(item.viewports.join(' / '));
    if (item.headless === false) metrics.push('headed');
    if (item.sizeLabel) metrics.push(item.sizeLabel);
    const firstUrl = item.primaryUrl || (item.urls || [])[0] || '';
    return '<article class="proof-ecology-card reveal is-visible" data-status="' + escapeHtml(item.status) + '">' +
      '<div class="proof-card-top">' +
        '<span class="proof-chip" data-status="' + escapeHtml(item.status) + '">' + escapeHtml(item.status) + '</span>' +
        '<span class="proof-date">' + escapeHtml(formatDate(item.generatedAt)) + '</span>' +
      '</div>' +
      '<div>' +
        '<p class="eyebrow">' + escapeHtml(item.category) + '</p>' +
        '<h3>' + escapeHtml(item.title) + '</h3>' +
      '</div>' +
      '<p>' + escapeHtml(item.summary) + '</p>' +
      '<div>' +
        '<div class="proof-metrics">' + metrics.slice(0, 6).map((metric) => '<span>' + escapeHtml(metric) + '</span>').join('') + '</div>' +
        '<p class="proof-path">' + escapeHtml(item.source) + '</p>' +
        '<div class="proof-links">' +
          (firstUrl ? '<a href="' + escapeHtml(firstUrl) + '" target="_blank" rel="noopener">Open live URL</a>' : '') +
          '<a href="proof-ecology/ledger.json" target="_blank" rel="noopener">Ledger JSON</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function applyFilters() {
    const q = (search && search.value || '').trim().toLowerCase();
    const selectedStatus = status && status.value || 'all';
    const selectedCategory = category && category.value || 'all';
    state.filtered = state.receipts.filter((item) => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (q && !receiptText(item).includes(q)) return false;
      return true;
    });
    render();
  }

  function render() {
    if (!grid || !meta) return;
    meta.textContent = state.filtered.length + ' of ' + state.receipts.length + ' published proof receipts visible.';
    grid.innerHTML = state.filtered.map(renderCard).join('');
  }

  function initCategories(receipts) {
    if (!category) return;
    const categories = Array.from(new Set(receipts.map((item) => item.category).filter(Boolean))).sort();
    categories.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      category.appendChild(option);
    });
  }

  fetch('proof-ecology/ledger.json', { cache: 'no-store' })
    .then((response) => response.json())
    .then((ledger) => {
      state.receipts = ledger.receipts || [];
      initCategories(state.receipts);
      setStat('published', ledger.summary && ledger.summary.published || state.receipts.length);
      setStat('pass', ledger.summary && ledger.summary.pass || 0);
      setStat('headed', ledger.summary && ledger.summary.headedBrowser || 0);
      setStat('urls', ledger.summary && ledger.summary.liveUrls || 0);
      const generated = document.querySelector('[data-ledger-generated]');
      if (generated) generated.textContent = 'Generated ' + formatDate(ledger.generatedAt) + ' from ' + (ledger.summary && ledger.summary.scanned || 0) + ' local proof files.';
      applyFilters();
    })
    .catch((error) => {
      if (meta) meta.textContent = 'Could not load the proof ecology ledger: ' + error.message;
    });

  [search, status, category].forEach((control) => {
    if (control) control.addEventListener('input', applyFilters);
  });
})();
