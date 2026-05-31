(() => {
  'use strict';

  const STORE = 'valleyVerified.brain.v1';
  const PUBLIC_INDEX = 'brain-public-index.json';
  const ADMIN_INDEX = 'brain-admin-index.json';
  const ADMIN_ROUTES = new Set([
    'owner-crm', 'owner-verification', 'owner-messaging', 'claim-submissions', 'claims-ledger',
    'accounts', 'activation', 'lifecycle', 'ae-command', 'pipeline', 'ae-work-orders', 'ae-assignments',
    'outreach', 'lead-inbox', 'lead-routing', 'lead-records', 'lead-routing-service', 'admin-review',
    'admin-actions', 'admin-console', 'admin-api', 'admin-batch', 'action-queue', 'approval-flow',
    'audit', 'protected-admin', 'operator', 'import-health', 'dry-run', 'crawl', 'routing', 'verification',
    'fraud-defense', 'duplicates', 'platform', 'data', 'backend', 'db-contracts', 'runtime-state'
  ]);
  const PUBLIC_QUICK_ACTIONS = [
    ['Find providers', 'Find a verified provider near me'],
    ['Get matched', 'I need a quote or provider match'],
    ['Claim listing', 'How do I claim or update a business listing?'],
    ['Advertise', 'How do exposure and paid placement work?']
  ];
  const ADMIN_QUICK_ACTIONS = [
    ['How to use this', 'How do I use this workspace?'],
    ['Next action', 'What should I do next on this route?'],
    ['Data sources', 'Which data files feed this route?'],
    ['Export packet', 'What should I export or send after review?']
  ];
  const PROOF_ONLY_BOUNDARY = {
    boundary: 'proof_only',
    proof_only: true,
    worker_confirmed: false,
    worker_receipt: null
  };
  const WORKER_CONFIRMED_BOUNDARY = 'worker_confirmed';

  const model = {
    mode: 'public',
    publicIndex: null,
    adminIndex: null,
    adminAuthorized: false,
    searchIndex: null,
    messages: []
  };

  ready(boot);

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  async function boot() {
    model.publicIndex = await loadJson(dataUrl(PUBLIC_INDEX), fallbackPublicIndex());
    if (isAdminRoute()) model.adminIndex = await loadAdminIndex();
    renderDock();
    bindGlobalOpen();
  }

  function renderDock() {
    if (document.querySelector('[data-valley-brain-dock]')) return;
    const dock = document.createElement('div');
    dock.className = 'vv-brain-dock';
    dock.dataset.valleyBrainDock = 'ready';
    dock.innerHTML = `
      <div class="vv-brain-launchers">${launcherMarkup()}</div>
      <section class="vv-brain-panel" hidden aria-live="polite">
        <div class="vv-brain-head">
          <div><p class="vv-brain-kicker" data-brain-kicker>Visitor brain</p><h2 data-brain-title>Valley Brain</h2></div>
          <button class="vv-brain-close" type="button" aria-label="Close Valley Brain">×</button>
        </div>
        <div class="vv-brain-context" data-brain-context></div>
        <form class="vv-admin-login" data-admin-login hidden>
          <div class="vv-admin-login-actions">
            <button type="submit">Use shared 0S gate</button>
            <button type="button" data-admin-forget>Clear session view</button>
          </div>
          <p data-admin-login-status></p>
        </form>
        <div class="vv-brain-feed" data-brain-feed></div>
        <div class="vv-brain-suggestions" data-brain-suggestions></div>
        <form class="vv-brain-form" data-brain-form>
          <input name="question" autocomplete="off" placeholder="Ask for a route, provider, CRM step, claim help, or lead handoff" />
          <button type="submit">Ask</button>
        </form>
        <details class="vv-brain-relay">
          <summary data-relay-summary>Send request into the relay lane</summary>
          <form data-relay-form>
            <div class="vv-brain-fields">
              <input name="name" placeholder="Name" autocomplete="name" />
              <input name="email" placeholder="Email" autocomplete="email" />
              <input name="phone" placeholder="Phone" autocomplete="tel" />
              <input name="company" placeholder="Business / company" autocomplete="organization" />
            </div>
            <textarea name="message" placeholder="What should Valley Verified route or follow up on?"></textarea>
            <button type="submit">Capture lead</button>
            <p data-relay-status></p>
          </form>
        </details>
      </section>`;
    document.body.append(dock);

    bindLaunchers(dock);
    dock.querySelector('.vv-brain-close')?.addEventListener('click', () => {
      panel().hidden = true;
    });
    dock.querySelector('[data-brain-form]')?.addEventListener('submit', ask);
    dock.querySelector('[data-relay-form]')?.addEventListener('submit', captureRelay);
    dock.querySelector('[data-admin-login]')?.addEventListener('submit', submitAdminLogin);
    dock.querySelector('[data-admin-forget]')?.addEventListener('click', forgetAdminToken);
  }

  function launcherMarkup() {
    return `
      <button class="vv-brain-launcher" type="button" data-open-brain="public">Valley Brain</button>
      ${isAdminRoute() ? (model.adminAuthorized
        ? '<button class="vv-brain-launcher admin" type="button" data-open-brain="admin">Admin Brain</button>'
        : '<button class="vv-brain-launcher admin-login" type="button" data-open-admin-login>Admin Login</button>') : ''}`;
  }

  function bindLaunchers(root = document) {
    root.querySelectorAll('[data-open-brain]').forEach(button => {
      button.addEventListener('click', () => openBrain(button.dataset.openBrain || 'public'));
    });
    root.querySelectorAll('[data-open-admin-login]').forEach(button => {
      button.addEventListener('click', openAdminLogin);
    });
  }

  function refreshLaunchers() {
    const host = document.querySelector('.vv-brain-launchers');
    if (!host) return;
    host.innerHTML = launcherMarkup();
    bindLaunchers(host);
  }

  function bindGlobalOpen() {
    window.addEventListener('valley-brain:open', (event) => {
      const detail = event.detail || {};
      const requestedMode = detail.mode || (model.adminAuthorized ? 'admin' : 'public');
      openBrain(requestedMode, detail.question || '');
    });
  }

  function openBrain(mode = 'public', seedQuestion = '') {
    if (mode === 'admin' && !model.adminAuthorized) return;
    model.mode = mode === 'admin' && model.adminAuthorized ? 'admin' : 'public';
    const p = panel();
    p.hidden = false;
    setAdminLoginVisible(false);
    setBrainControlsVisible(true);
    const admin = model.mode === 'admin';
    p.querySelector('[data-brain-kicker]').textContent = admin ? 'Admin-only route helper' : 'Visitor discovery helper';
    p.querySelector('[data-brain-title]').textContent = admin ? 'Valley Admin Brain' : 'Valley Brain';
    p.querySelector('[data-relay-summary]').textContent = admin ? 'Save operator note / relay packet' : 'Send request into the relay lane';
    renderContext();
    model.messages = [];
    if (seedQuestion) {
      p.querySelector('[name="question"]').value = seedQuestion;
      p.querySelector('[data-brain-form]').requestSubmit();
      return;
    }
    renderMessages();
    renderSuggestions();
  }

  function openAdminLogin() {
    const p = panel();
    p.hidden = false;
    model.mode = 'admin-login';
    p.querySelector('[data-brain-kicker]').textContent = 'Operator access';
    p.querySelector('[data-brain-title]').textContent = 'Admin Login';
    const context = p.querySelector('[data-brain-context]');
    context.innerHTML = '<strong>Admin Brain is gated</strong><span>Use the shared 0S/FS27 gate session to unlock the admin menu on this browser.</span>';
    setBrainControlsVisible(false);
    setAdminLoginVisible(true);
  }

  async function submitAdminLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-admin-login-status]');
    const gate = currentGateSession();
    if (!gate?.token) {
      status.textContent = 'No shared 0S gate session found. Opening the FS27 login.';
      setTimeout(() => {
        const login = new URL('/admin/login.html', location.origin);
        login.searchParams.set('return', location.pathname + location.search + location.hash);
        location.href = login.toString();
      }, 450);
      return;
    }
    status.textContent = 'Checking owner gate...';
    status.textContent = 'Loading admin brain...';
    model.adminIndex = await loadAdminIndex();
    if (!model.adminAuthorized) {
      status.textContent = 'The shared 0S gate session is not authorized for Valley admin access.';
      return;
    }
    form.reset();
    status.textContent = '';
    refreshLaunchers();
    openBrain('admin');
  }

  function forgetAdminToken() {
    try {
      sessionStorage.removeItem('valleyVerified.adminToken');
      sessionStorage.removeItem('metraiyux.adminToken');
      localStorage.removeItem('valleyVerified.adminToken');
    } catch {}
    model.adminAuthorized = false;
    model.adminIndex = null;
    refreshLaunchers();
    openAdminLogin();
    const status = panel().querySelector('[data-admin-login-status]');
    if (status) status.textContent = 'Local admin token aliases cleared. Shared gate session remains the authority.';
  }

  function setAdminLoginVisible(visible) {
    const form = panel().querySelector('[data-admin-login]');
    if (form) form.hidden = !visible;
  }

  function setBrainControlsVisible(visible) {
    ['[data-brain-feed]', '[data-brain-suggestions]', '[data-brain-form]', '.vv-brain-relay'].forEach(selector => {
      const node = panel().querySelector(selector);
      if (node) node.hidden = !visible;
    });
  }

  async function ask(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.question;
    const question = text(input.value);
    if (!question) return;
    addMessage('me', question);
    input.value = '';
    const answer = await answerQuestion(question);
    addMessage('brain', answer);
  }

  async function answerQuestion(question) {
    const admin = model.mode === 'admin';
    const index = admin ? (model.adminIndex || fallbackAdminIndex()) : (model.publicIndex || fallbackPublicIndex());
    const route = currentRoute();
    const lower = question.toLowerCase();

    if (admin && /how|use|tutorial|lost|what.*do|next|crm|workspace|dashboard/.test(lower)) {
      return adminWorkflowAnswer(index, route, question);
    }

    if (!admin && /quote|match|provider|near|find|service|barber|home|auto|beauty|legal|food|event|health|real estate|business service/.test(lower)) {
      const matches = await providerMatches(question);
      if (matches.length) {
        return htmlBlock('Provider matches', [
          'I found published Valley routes from the seed index. Open the best fit, save it, or request a Worker-confirmed relay receipt before treating it as a captured lead.',
          linkList(matches.map(item => [item.name, item.url, [item.city, item.category].filter(Boolean).join(' / ')]))
        ]);
      }
    }

    if (!admin && /claim|owner|update|correct|wrong|listing/.test(lower)) {
      return htmlBlock('Claim or update a listing', [
        'Use the claim lane when a business owner needs corrections, ownership review, or verification support. Browser-built claim packets are proof-only until an authenticated Worker receipt exists.',
        linkList([
          ['Claim lane', link('/valley-verified/claim/'), 'Build a claim packet'],
          ['For businesses', link('/valley-verified/for-businesses/'), 'Owner-facing route'],
          ['Directory', link('/valley-verified/directory/'), 'Find the listing first']
        ])
      ]);
    }

    if (/advertis|sponsor|exposure|pricing|paid|placement/.test(lower)) {
      return htmlBlock(admin ? 'Exposure operator route' : 'Exposure routes', [
        admin
          ? 'Use revenue, sponsor, activation, and owner CRM together: check sellable inventory, confirm the account, then prepare an activation packet.'
          : 'Visitors can review exposure options and send interest into the relay lane. Paid placement still needs owner/admin approval.',
        linkList(admin ? [
          ['Pricing', link('/valley-verified/pricing/'), 'Exposure products'],
          ['Sponsor inventory', link('/valley-verified/sponsor/'), 'Sellable surface model'],
          ['Owner CRM', link('/valley-verified/owner-crm/'), 'Admin account route'],
          ['Revenue readiness', link('/valley-verified/revenue/'), 'Operator money path']
        ] : [
          ['Pricing', link('/valley-verified/pricing/'), 'Exposure products'],
          ['Advertise', link('/valley-verified/advertise/'), 'Public interest route'],
          ['For businesses', link('/valley-verified/for-businesses/'), 'Owner-facing route']
        ])
      ]);
    }

    const hits = searchKnowledge(index, question).slice(0, 5);
    if (hits.length) {
      return htmlBlock(admin ? 'Admin route matches' : 'Valley route matches', [
        hits[0].answer || 'These are the best build-known Valley routes for that request.',
        linkList(hits.map(hit => [hit.title, link(hit.href), hit.description || hit.kind || 'build-known route']))
      ]);
    }

    return htmlBlock(admin ? 'Admin fallback' : 'Visitor fallback', [
      admin
        ? 'I do not have a precise match in the build index. Start with the current route guide, inspect the listed data sources, then capture an operator note so the next build can improve this path.'
        : 'I can route you through the directory, match engine, claim lane, pricing, or relay capture. Send the request below if you want the Worker relay to confirm the lead.',
      linkList(admin ? adminDefaultLinks() : publicDefaultLinks())
    ]);
  }

  function adminWorkflowAnswer(index, route, question) {
    const workflow = (index.workflows || []).find(item => cleanRoute(item.route) === route) || (index.workflows || [])[0] || {};
    const steps = workflow.steps || [
      'Check the loaded source feeds for missing data.',
      'Filter the queue to the strongest feed.',
      'Open the record, then mark Claim, Ready, or Block.',
      'Prepare or export the packet after review.'
    ];
    return htmlBlock(workflow.title || 'Admin workflow', [
      workflow.summary || 'This admin route is fed by generated seed artifacts and browser-local proof-only operator actions.',
      `<ol>${steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>`,
      linkList((workflow.links || adminDefaultLinks()).map(item => Array.isArray(item) ? item : [item.label, item.href, item.description]))
    ]);
  }

  async function providerMatches(question) {
    const tokens = tokenSet(question).filter(token => token.length > 2);
    if (!model.searchIndex) {
      const data = await loadJson(dataUrl('search-index.json'), { records: [] });
      model.searchIndex = Array.isArray(data.records) ? data.records : [];
    }
    const scored = [];
    for (const item of model.searchIndex.slice(0, 5000)) {
      const hay = [item.name, item.category, item.subcategory, item.niche, item.city, item.text].map(text).join(' ').toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0);
      if (score > 0) scored.push({ ...item, score });
    }
    return scored
      .sort((a, b) => b.score - a.score || Number(b.verification_score || 0) - Number(a.verification_score || 0))
      .slice(0, 5)
      .map(item => ({
        name: item.name || item.id,
        city: item.city || '',
        category: item.category || item.niche || '',
        url: link(item.url || `/business/${item.id}/`)
      }));
  }

  async function captureRelay(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-relay-status]') || form.parentElement.querySelector('[data-relay-status]');
    const data = new FormData(form);
    const lead = {
      id: `vvrelay_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: model.mode === 'admin' ? 'valley_verified.admin_brain_note' : 'valley_verified.public_relay_lead',
      created_at: new Date().toISOString(),
      ...PROOF_ONLY_BOUNDARY,
      mode: model.mode,
      route: currentRoute(),
      source_url: location.href,
      page_title: document.title,
      contact: {
        name: text(data.get('name')),
        email: text(data.get('email')),
        phone: text(data.get('phone')),
        company: text(data.get('company'))
      },
      message: text(data.get('message')),
      transcript: model.messages.slice(-8)
    };
    saveLocalLead(lead);
    status.textContent = 'Saved proof-only locally. Sending to the 0S relay Worker...';
    try {
      const endpoint = relayEndpoint();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(lead)
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        const receipt = {
          endpoint,
          status: res.status,
          lead_id: body.lead?.id || lead.id,
          confirmed_at: new Date().toISOString()
        };
        saveLocalLead({ ...lead, boundary: WORKER_CONFIRMED_BOUNDARY, proof_only: false, worker_confirmed: true, worker_receipt: receipt });
        status.textContent = `Worker-confirmed relay receipt: ${receipt.lead_id}`;
      } else {
        status.textContent = `Proof-only local capture saved. Production relay said: ${body.error || res.status}`;
      }
    } catch (error) {
      status.textContent = `Proof-only local capture saved. Production relay unavailable here: ${error.message || 'network error'}`;
    }
    form.reset();
  }

  function renderContext() {
    const admin = model.mode === 'admin';
    const index = admin ? model.adminIndex : model.publicIndex;
    const route = currentRoute();
    const workflow = admin && index?.workflows?.find(item => cleanRoute(item.route) === route);
    const context = panel().querySelector('[data-brain-context]');
    context.innerHTML = admin && workflow
      ? `<strong>${esc(workflow.title)}</strong><span>${esc(workflow.summary || 'Seed/proof-only admin route.')}</span>`
      : `<strong>${esc(index?.site?.name || 'Valley Verified')}</strong><span>${esc(index?.site?.generated_at || index?.generated_at || 'seed index')}</span>`;
  }

  function renderSuggestions() {
    const quick = model.mode === 'admin' ? ADMIN_QUICK_ACTIONS : PUBLIC_QUICK_ACTIONS;
    const host = panel().querySelector('[data-brain-suggestions]');
    host.innerHTML = quick.map(([label, prompt]) => `<button type="button" data-prompt="${esc(prompt)}">${esc(label)}</button>`).join('');
    host.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
      const input = panel().querySelector('[name="question"]');
      input.value = button.dataset.prompt || '';
      panel().querySelector('[data-brain-form]').requestSubmit();
    }));
  }

  function renderMessages() {
    const feed = panel().querySelector('[data-brain-feed]');
    feed.innerHTML = model.messages.map(message => `<article class="vv-brain-message ${esc(message.role)}">${message.html || esc(message.text)}</article>`).join('');
    feed.scrollTop = feed.scrollHeight;
  }

  function addMessage(role, value) {
    model.messages.push(role === 'brain' ? { role, html: value } : { role, text: value });
    model.messages = model.messages.slice(-18);
    renderMessages();
  }

  function searchKnowledge(index, query) {
    const tokens = tokenSet(query);
    return (index.entries || [])
      .map(entry => {
        const hay = [entry.title, entry.description, entry.answer, entry.kind, ...(entry.keywords || [])].map(text).join(' ').toLowerCase();
        const score = tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0);
        return { ...entry, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));
  }

  function htmlBlock(title, parts) {
    return `<div class="vv-brain-answer"><h3>${esc(title)}</h3>${parts.map(part => String(part).startsWith('<') ? part : `<p>${esc(part)}</p>`).join('')}</div>`;
  }

  function linkList(items) {
    return `<div class="vv-brain-links">${items.filter(Boolean).map(([label, href, note]) => `<a href="${esc(link(href || '/valley-verified/'))}"><strong>${esc(label || href)}</strong><span>${esc(note || href || '')}</span></a>`).join('')}</div>`;
  }

  function publicDefaultLinks() {
    return [
      ['Directory', link('/valley-verified/directory/'), 'Search listings'],
      ['Match', link('/valley-verified/match/'), 'Rank providers for a request'],
      ['Claim', link('/valley-verified/claim/'), 'Owner correction and verification'],
      ['Pricing', link('/valley-verified/pricing/'), 'Exposure products']
    ];
  }

  function adminDefaultLinks() {
    return [
      ['Owner CRM', link('/valley-verified/owner-crm/'), 'Account readiness'],
      ['Admin Review', link('/valley-verified/admin-review/'), 'Review packets and approvals'],
      ['Lead Inbox', link('/valley-verified/lead-inbox/'), 'Routing lanes'],
      ['Data map', link('/valley-verified/data/'), 'Generated artifacts']
    ];
  }

  function loadJson(url, fallback) {
    return fetch(url, { cache: 'no-store' }).then(res => res.ok ? res.json() : fallback).catch(() => fallback);
  }

  async function loadAdminIndex() {
    try {
      const res = await fetch(adminIndexUrl(), {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: operatorAuthHeaders()
      });
      if (!res.ok) {
        model.adminAuthorized = false;
        return null;
      }
      const data = await res.json();
      model.adminAuthorized = true;
      document.documentElement.dataset.valleyAdminBrain = 'authorized';
      return data;
    } catch {
      model.adminAuthorized = false;
      return null;
    }
  }

  function adminIndexUrl() {
    return `${location.origin}/api/valley-verified/admin-brain-index`;
  }

  function operatorAuthHeaders() {
    const bridgeHeaders = gateBridge()?.headers?.({
      'x-skye-platform': 'valley-verified',
      'x-skye-usage-lane': 'valley-admin-brain'
    }) || {};
    const token = currentGateSession()?.token || '';
    return token ? { ...bridgeHeaders, authorization: `Bearer ${token}`, 'x-skye-gate-session': token } : bridgeHeaders;
  }

  function gateBridge() {
    return window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  }

  function currentGateSession() {
    const session = gateBridge()?.current?.() || null;
    return session && session.token ? session : null;
  }

  function dataUrl(file) {
    return `${mountPath()}/data/${file}`.replace(/\/{2,}/g, '/valley-verified/');
  }

  function relayEndpoint() {
    const same = `${location.origin}/api/valley-verified/relay-leads`;
    if (/metraiyux-0s-full-system/i.test(location.hostname) || location.hostname === '127.0.0.1' || location.hostname === 'localhost') return same;
    return 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/valley-verified/relay-leads';
  }

  function mountPath() {
    if (location.pathname.startsWith('/valley-verified/skyenet/valley-verified')) return '/valley-verified/skyenet/valley-verified';
    if (location.pathname.startsWith('/valley-verified/valley-verified')) return '/valley-verified/valley-verified';
    return '';
  }

  function link(href) {
    const value = text(href || '/valley-verified/');
    const mount = mountPath();
    if (!value) return mount || '/valley-verified/';
    if (/^https?:\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:')) return value;
    if (value.startsWith('/skyenet/valley-verified/')) return value;
    if (value.startsWith('/valley-verified/')) return mount === '/valley-verified/skyenet/valley-verified' ? `${mount}${value.slice('/valley-verified/valley-verified'.length)}` : value;
    return `${mount}${value.startsWith('/valley-verified/') ? value : `/${value}`}`.replace(/\/{2,}/g, '/valley-verified/');
  }

  function isAdminRoute() {
    return ADMIN_ROUTES.has(currentRoute());
  }

  function currentRoute() {
    const parts = location.pathname.split('/valley-verified/').filter(Boolean);
    const index = parts.indexOf('valley-verified');
    return cleanRoute(index >= 0 ? (parts[index + 1] || '') : (parts[0] || ''));
  }

  function cleanRoute(value) {
    return text(value).replace(/^\/+|\/+$/g, '').split('/valley-verified/')[0] || 'home';
  }

  function tokenSet(value) {
    return [...new Set(text(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).filter(token => !['the', 'and', 'for', 'with', 'what', 'how', 'does', 'this', 'that', 'need'].includes(token)))];
  }

  function saveLocalLead(lead) {
    try {
      const key = `${STORE}.relay`;
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([lead, ...rows].slice(0, 60)));
    } catch {}
  }

  function panel() {
    return document.querySelector('.vv-brain-panel');
  }

  function text(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function esc(value) {
    return text(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  function fmt(value) {
    return Number(value || 0).toLocaleString();
  }

  function fallbackPublicIndex() {
    return { generated_at: '', site: { name: 'Valley Verified' }, counts: {}, entries: [] };
  }

  function fallbackAdminIndex() {
    return { generated_at: '', site: { name: 'Valley Verified Admin' }, counts: {}, entries: [], workflows: [] };
  }
})();
