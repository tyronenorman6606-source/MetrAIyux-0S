(function(){
  const data = window.METRAIYUX_SKYEWAY_ROUTES || { routes: [], categories: {}, total: 0 };
  const pageSize = 84;
  const priority = [
    'SkyeWay',
    'Platform Apps',
    'Client Apps',
    'Free99 Apps',
    'SovereignDocs',
    'Valley Verified',
    'Valley Verified Businesses',
    'Valley Verified Markets',
    'Valley Verified Niches',
    'Live Surfaces',
    'SkyeMail',
    'Client and SaaS',
    'Sales and Revenue',
    'MCP and Developer Tools',
    'Brains, Proof, and Infra',
    'Governance and Legal',
    'Operating Rooms',
    'Public Content',
    '0S Core',
    'Root',
    'Source Mirrors',
    'Workers and SDK'
  ];

  const routes = (data.routes || []).map(route => ({
    href: route[0],
    title: route[1],
    category: route[2],
    folder: route[3],
    gatePolicy: route[4] || 'fs27-owner-gated',
    haystack: `${route[0]} ${route[1]} ${route[2]} ${route[3]} ${route[4] || ''}`.toLowerCase()
  }));

  const state = {
    query: '',
    category: 'All',
    page: 1,
    filtered: routes
  };

  const els = {
    search: document.querySelector('[data-skyeway-search]'),
    category: document.querySelector('[data-skyeway-category]'),
    filters: document.querySelector('[data-skyeway-filters]'),
    results: document.querySelector('[data-skyeway-results]'),
    status: document.querySelector('[data-skyeway-status]'),
    page: document.querySelector('[data-skyeway-page]'),
    prev: document.querySelector('[data-skyeway-prev]'),
    next: document.querySelector('[data-skyeway-next]'),
    copy: document.querySelector('[data-skyeway-copy]'),
    generated: document.querySelector('[data-skyeway-generated]')
  };

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function formatNumber(value){
    return Number(value || 0).toLocaleString();
  }

  function categoryCount(name){
    return routes.filter(route => route.category === name).length;
  }

  function setText(selector, value){
    document.querySelectorAll(selector).forEach(node => {
      node.textContent = value;
    });
  }

  function gateLabel(policy){
    if(String(policy || '').startsWith('public-')) return 'Public';
    if(String(policy || '').includes('free99')) return 'FS27 / Free99';
    if(String(policy || '').includes('client-app')) return 'FS27 client app';
    if(String(policy || '').includes('admin')) return 'FS27 owner';
    return 'FS27 gated';
  }

  function sortCategories(names){
    return [...names].sort((a, b) => {
      const pa = priority.indexOf(a);
      const pb = priority.indexOf(b);
      if(pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return a.localeCompare(b);
    });
  }

  function bootStats(){
    const categoryNames = Object.keys(data.categories || {});
    setText('[data-skyeway-total]', formatNumber(routes.length));
    setText('[data-skyeway-category-count]', formatNumber(categoryNames.length));
    setText('[data-skyeway-platform-count]', formatNumber(categoryCount('Platform Apps') + categoryCount('Live Surfaces') + categoryCount('SkyeMail')));
    setText('[data-skyeway-free99-count]', formatNumber(categoryCount('Free99 Apps') + categoryCount('SovereignDocs')));
    setText('[data-skyeway-valley-count]', formatNumber(categoryCount('Valley Verified') + categoryCount('Valley Verified Businesses') + categoryCount('Valley Verified Markets') + categoryCount('Valley Verified Niches')));
    if(els.generated && data.generatedAt){
      const date = new Date(data.generatedAt);
      els.generated.textContent = Number.isNaN(date.getTime()) ? data.generatedAt : date.toLocaleString();
    }
  }

  function bootCategories(){
    const categoryNames = sortCategories(Object.keys(data.categories || {}));
    if(els.category){
      els.category.innerHTML = [
        '<option value="All">All surfaces</option>',
        ...categoryNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)} (${formatNumber(data.categories[name])})</option>`)
      ].join('');
    }
    if(els.filters){
      els.filters.innerHTML = [
        `<button class="skyeway-filter is-active" type="button" data-skyeway-filter="All">All <b>${formatNumber(routes.length)}</b></button>`,
        ...categoryNames.map(name => `<button class="skyeway-filter" type="button" data-skyeway-filter="${escapeHtml(name)}">${escapeHtml(name)} <b>${formatNumber(data.categories[name])}</b></button>`)
      ].join('');
    }
  }

  function updateFilterButtons(){
    document.querySelectorAll('[data-skyeway-filter]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.skyewayFilter === state.category);
    });
  }

  function applyFilters(){
    const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    state.filtered = routes.filter(route => {
      if(state.category !== 'All' && route.category !== state.category) return false;
      return tokens.every(token => route.haystack.includes(token));
    });
    const maxPage = Math.max(1, Math.ceil(state.filtered.length / pageSize));
    state.page = Math.min(state.page, maxPage);
    render();
  }

  function render(){
    updateFilterButtons();
    const total = state.filtered.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    const start = (state.page - 1) * pageSize;
    const pageRoutes = state.filtered.slice(start, start + pageSize);
    if(els.status){
      const category = state.category === 'All' ? 'all categories' : state.category;
      els.status.textContent = `${formatNumber(total)} linked surfaces across ${category}`;
    }
    if(els.page) els.page.textContent = `${state.page} / ${maxPage}`;
    if(els.prev) els.prev.disabled = state.page <= 1;
    if(els.next) els.next.disabled = state.page >= maxPage;
    if(!els.results) return;

    if(!pageRoutes.length){
      els.results.innerHTML = '<p class="skyeway-empty">No matching 0S surface found.</p>';
      return;
    }

    els.results.innerHTML = pageRoutes.map(route => [
      `<a class="skyeway-result" href="${escapeHtml(route.href)}">`,
      `  <span>${escapeHtml(route.category)} · ${escapeHtml(gateLabel(route.gatePolicy))}</span>`,
      `  <strong>${escapeHtml(route.title)}</strong>`,
      `  <small>${escapeHtml(route.href)}</small>`,
      '</a>'
    ].join('')).join('');
  }

  function bindEvents(){
    els.search?.addEventListener('input', event => {
      state.query = event.target.value.trim();
      state.page = 1;
      applyFilters();
    });
    els.category?.addEventListener('change', event => {
      state.category = event.target.value || 'All';
      state.page = 1;
      applyFilters();
    });
    els.filters?.addEventListener('click', event => {
      const button = event.target.closest('[data-skyeway-filter]');
      if(!button) return;
      state.category = button.dataset.skyewayFilter || 'All';
      state.page = 1;
      if(els.category) els.category.value = state.category;
      applyFilters();
    });
    els.prev?.addEventListener('click', () => {
      state.page = Math.max(1, state.page - 1);
      render();
      els.results?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    els.next?.addEventListener('click', () => {
      const maxPage = Math.max(1, Math.ceil(state.filtered.length / pageSize));
      state.page = Math.min(maxPage, state.page + 1);
      render();
      els.results?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    els.copy?.addEventListener('click', async () => {
      const lines = state.filtered.map(route => route.href).join('\n');
      try{
        await navigator.clipboard.writeText(lines);
        els.copy.textContent = 'Copied current links';
        window.setTimeout(() => { els.copy.textContent = 'Copy current links'; }, 1800);
      }catch(_error){
        els.copy.textContent = 'Copy unavailable';
        window.setTimeout(() => { els.copy.textContent = 'Copy current links'; }, 1800);
      }
    });
  }

  bootStats();
  bootCategories();
  bindEvents();
  applyFilters();
})();
