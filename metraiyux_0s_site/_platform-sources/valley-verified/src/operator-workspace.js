(() => {
  'use strict';

  const DATA = '/valley-verified/data/';
  const STORE = 'valleyVerified.operatorWorkspace.v1.';
  const src = (label, file) => ({ label, url: `${DATA}${file}` });

  const groups = {
    owner: [src('Owner CRM', 'owner-crm-index.json'), src('Owner verification', 'owner-verification-packets.json'), src('Owner messaging', 'owner-messaging-model.json')],
    ae: [src('AE pipeline', 'ae-pipeline-board.json'), src('AE work orders', 'ae-work-orders.json'), src('AE assignments', 'ae-assignment-model.json'), src('AE territories', 'ae-territory-plan.json')],
    admin: [src('Admin actions', 'admin-action-packets.json'), src('Admin batches', 'admin-batch-actions.json'), src('Approval workflow', 'approval-workflow.json'), src('Runtime wiring', 'runtime-wiring.json')],
    lifecycle: [src('Lifecycle queue', 'business-lifecycle-queue.json'), src('Activation pipeline', 'activation-pipeline.json'), src('Account scoring', 'account-opportunity-score.json')],
    lead: [src('Lead inbox', 'lead-inbox-queue.json'), src('Lead routing', 'lead-routing-rules.json'), src('Outreach packets', 'outreach-packets.json'), src('Sales playbooks', 'sales-playbooks.json')],
    audit: [src('Moderation queue', 'moderation-queue.json'), src('Duplicate clusters', 'duplicate-clusters.json'), src('Claim status', 'claim-status-index.json'), src('Claims ledger', 'public-claims-ledger.json')],
    import: [src('Import quality', 'import-quality.json'), src('Import dry run', 'import-dry-run.json'), src('Import rejections', 'import-rejections.json'), src('Search index', 'search-index.json')]
  };

  const routes = {
    'owner-crm': ['Owner CRM workspace', 'Owner operations', 'Owner follow-up, claim readiness, cleanup, and verification packets.', [...groups.owner, ...groups.lifecycle]],
    'owner-verification': ['Owner verification workspace', 'Owner proof', 'Owner proof requirements and claim handoff status.', [groups.owner[1], groups.admin[0], groups.audit[2]]],
    'owner-messaging': ['Owner messaging workspace', 'Owner messaging', 'Message contracts, outreach packets, and CRM context.', [groups.owner[2], groups.lead[2], groups.owner[0]]],
    claim: ['Claim intake workspace', 'Owner claims', 'Claim intake, owner proof, and admin review context.', [src('Claim submission model', 'claim-submission-model.json'), groups.owner[1], groups.admin[0]]],
    'claim-submissions': ['Claim submissions workspace', 'Claims', 'Claim submission contracts and review packets.', [src('Claim submission model', 'claim-submission-model.json'), groups.owner[1], groups.admin[0]]],
    'claims-ledger': ['Claims ledger workspace', 'Claims ledger', 'Claim ledger, status, and verification packets.', [groups.audit[3], groups.audit[2], groups.owner[1]]],
    accounts: ['Account workbench', 'Account scoring', 'Ranked account opportunity and lifecycle priority.', [groups.lifecycle[2], groups.lifecycle[0], groups.owner[0], groups.ae[0]]],
    activation: ['Activation workspace', 'Customer activation', 'Activation actions, lifecycle blockers, and scoring.', [groups.lifecycle[1], groups.lifecycle[0], groups.lifecycle[2], groups.admin[2]]],
    lifecycle: ['Lifecycle workspace', 'Business lifecycle', 'Priority, trust tier, and cleanup action queue.', [groups.lifecycle[0], groups.lifecycle[1], groups.audit[0]]],
    'ae-command': ['AE command workspace', 'AE operations', 'Pipeline stages, territories, work orders, and outreach actions.', [...groups.ae, ...groups.lead]],
    pipeline: ['AE pipeline workspace', 'Sales pipeline', 'Pipeline records with score, fit, and next action.', [groups.ae[0], groups.ae[1], groups.lifecycle[2]]],
    'ae-work-orders': ['AE work order workspace', 'Work orders', 'City work orders and AE execution planning.', [groups.ae[1], groups.ae[2], groups.lead[0]]],
    'ae-assignments': ['AE assignment workspace', 'Assignments', 'Assignment contracts, stages, and territories.', [groups.ae[2], groups.ae[3], groups.ae[0]]],
    outreach: ['Outreach workspace', 'Outbound desk', 'Outreach packets, lead routing, and playbooks.', [groups.lead[2], groups.lead[0], groups.lead[1], groups.lead[3]]],
    'lead-inbox': ['Lead inbox workspace', 'Lead routing', 'Lead lanes, candidate counts, and routing status.', [groups.lead[0], groups.lead[1], groups.lifecycle[2]]],
    'lead-routing': ['Lead routing workspace', 'Routing rules', 'Rule-level candidate routing and dispatch context.', [groups.lead[1], groups.lead[0], groups.lead[2]]],
    'lead-records': ['Lead records workspace', 'Lead records', 'Lead contracts, routing lanes, and candidate pools.', [src('Lead records model', 'lead-records-model.json'), groups.lead[0], groups.lead[1]]],
    'lead-routing-service': ['Lead routing service workspace', 'Lead service', 'Service model, routing rules, and inbox queues.', [src('Lead routing service model', 'lead-routing-service-model.json'), groups.lead[1], groups.lead[0]]],
    'admin-review': ['Admin review workspace', 'Admin review', 'Admin packets, quality flags, and approvals.', [...groups.admin, ...groups.audit]],
    'admin-actions': ['Admin actions workspace', 'Admin actions', 'Action packets, batches, and runtime contracts.', [groups.admin[0], groups.admin[1], groups.admin[3], groups.audit[0]]],
    'admin-console': ['Admin console workspace', 'Admin console', 'Proof-safe controls paired with queues and runtime decisions.', [src('Admin console model', 'admin-console-model.json'), ...groups.admin]],
    'admin-api': ['Admin API workspace', 'Admin API', 'Admin API contracts and backend action models.', [src('Admin API model', 'admin-api-model.json'), src('Platform API index', 'platform-api-index.json'), src('Backend action contracts', 'backend-action-contracts.json'), groups.admin[3]]],
    'admin-batch': ['Admin batch workspace', 'Batch operations', 'Batch review, duplicate suppression, and enrichment.', [groups.admin[1], groups.audit[1], groups.owner[1]]],
    'action-queue': ['Action queue workspace', 'Action queue', 'Action packets and lifecycle records as a tracked queue.', [groups.admin[0], groups.lifecycle[0], groups.audit[0]]],
    'approval-flow': ['Approval flow workspace', 'Approvals', 'Approval contracts and change-set context.', [groups.admin[2], src('Admin change-set template', 'admin-change-set-template.json'), groups.admin[0]]],
    audit: ['Audit workspace', 'Audit and trust', 'Moderation, duplicates, claims, and audit decisions.', [...groups.audit, groups.admin[0]]],
    'protected-admin': ['Protected admin workspace', 'Upstream-auth admin', 'Queues and exports beside the protected shell.', [...groups.admin, groups.lifecycle[0], groups.audit[0]]],
    operator: ['Operator import workspace', 'Import operations', 'Import quality, rejection, and search context beside seed normalization.', [...groups.import, groups.admin[0]]]
  };

  const route = currentRoute();
  const config = routes[route];
  if (!config) return;

  const model = { filter: 'all', feeds: [], ledger: readLedger() };
  setDocumentState('loading');
  ready(boot);

  async function boot() {
    addStyles();
    model.feeds = await Promise.all(config[3].map(loadFeed));
    render();
    setDocumentState('ready');
    window.valleyOperatorWorkspace = { route, feeds: model.feeds, exportPacket };
  }

  function currentRoute() {
    const parts = location.pathname.split('/').filter(Boolean);
    const index = parts.indexOf('valley-verified');
    return index >= 0 ? (parts[index + 1] || 'operator') : parts[0];
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  async function loadFeed(feed) {
    try {
      const res = await fetch(feed.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      const records = extract(data).slice(0, 240).map((record, index) => normalize(record, feed.label, index));
      return { ...feed, ok: true, data, records, count: declaredCount(data, records.length), stamp: text(data.updated_at || data.generated_at || data.version || '') };
    } catch (error) {
      return { ...feed, ok: false, records: [], count: 0, stamp: '', error: error.message || 'load failed' };
    }
  }

  function extract(data) {
    if (!data) return [];
    if (Array.isArray(data)) return objects(data);
    if (Array.isArray(data.columns)) {
      return data.columns.flatMap(column => {
        const rows = objects(column.records || column.items || []);
        return rows.length ? rows.map(row => ({ ...row, stage: row.stage || column.stage || column.label, source_group: column.label || column.stage })) : [{ ...column, source_group: column.label || column.stage }];
      });
    }
    if (data.batches && typeof data.batches === 'object') {
      return Object.entries(data.batches).flatMap(([batch, rows]) => objects(rows).map(row => ({ ...row, batch })));
    }
    for (const key of ['records', 'sample', 'packets', 'accounts', 'inbox', 'work_orders', 'tasks', 'rules', 'businesses', 'queue', 'actions', 'items']) {
      const rows = objects(data[key]);
      if (rows.length) return rows;
    }
    const found = [];
    collect(data, found);
    return found.slice(0, 400);
  }

  function collect(value, found, trail = []) {
    if (!value || found.length > 400) return;
    if (Array.isArray(value)) {
      const rows = objects(value);
      if (rows.length) found.push(...rows.map(row => ({ ...row, source_group: trail.slice(-1)[0] || row.source_group })));
      return;
    }
    if (typeof value !== 'object' || trail.length > 4) return;
    for (const [key, child] of Object.entries(value)) collect(child, found, [...trail, key]);
  }

  function objects(value) {
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : [];
  }

  function declaredCount(data, fallback) {
    const values = [data?.stats?.total, data?.stats?.records, data?.stats?.accounts, data?.stats?.tasks, data?.stats?.packets, data?.totals?.total, data?.totals?.records];
    const hit = values.find(value => Number.isFinite(Number(value)));
    return Number(hit ?? (data?.overflow_count ? fallback + Number(data.overflow_count) : fallback));
  }

  function normalize(record, feedLabel, index) {
    const id = text(record.id || record.business_id || record.rule_id || record.lead_lane_id || record.action_id || record.identity_key || `${slug(feedLabel)}-${index}`);
    const flags = Array.isArray(record.flags) ? record.flags.join(', ') : record.flags;
    return {
      id,
      feedLabel,
      feedSlug: slug(feedLabel),
      title: text(record.name || record.business_name || record.title || record.action || record.rule_id || record.lead_lane_id || record.stage || record.batch || id),
      status: text(record.status || record.priority || record.stage || record.trust_tier || record.claim_status || record.routing_status || record.next_action || record.recommended_action || 'review'),
      href: text(record.url || record.claim_packet_url || record.route || record.profile_url || (record.business_id ? `/valley-verified/business/${record.business_id}/` : '')),
      note: text(record.suggested_next_action || record.next_action || record.suggested_resolution || record.recommended_action || record.reason || record.description || flags || ''),
      meta: [record.city, record.category, record.niche, record.source_group, record.batch, record.score ?? record.verification_score ?? record.priority_score, record.candidate_count ? `${record.candidate_count} candidates` : ''].map(text).filter(Boolean).slice(0, 5)
    };
  }

  function render() {
    document.querySelector('.vv-operator-workspace[data-valley-operator-workspace]')?.remove();
    const host = document.querySelector('main') || document.body;
    if (!host) {
      requestAnimationFrame(render);
      return;
    }
    const section = document.createElement('section');
    section.className = 'vv-operator-workspace';
    section.dataset.valleyOperatorWorkspace = 'ready';
    section.innerHTML = markup();
    host.append(section);
    bind(section);
  }

  function setDocumentState(value) {
    if (document.documentElement) document.documentElement.dataset.valleyOperatorWorkspaceState = value;
  }

  function markup() {
    const [title, lane, brief] = config;
    const loaded = model.feeds.filter(feed => feed.ok).length;
    const total = model.feeds.reduce((sum, feed) => sum + Number(feed.count || 0), 0);
    const rows = filteredRows();
    const open = model.ledger.filter(item => item.status !== 'done').length;
    return `
      <div class="vv-operator-shell">
        <div class="vv-op-head">
          <div><p class="vv-op-kicker">${esc(lane)}</p><h2>${esc(title)}</h2><p>${esc(brief)} This route now has its own operator workspace mounted on top of the generated public renderer.</p></div>
          <div class="vv-op-actions"><button class="btn primary" data-op="packet">Prepare packet</button><button class="btn" data-op="download">Export ledger</button></div>
        </div>
        <div class="vv-op-metrics">${metric('Loaded sources', `${loaded}/${model.feeds.length}`)}${metric('Queue records', fmt(total))}${metric('Ledger entries', fmt(model.ledger.length))}${metric('Open actions', fmt(open))}</div>
        ${guideMarkup()}
        <div class="vv-op-filters">${filter('all', 'All queues')}${model.feeds.map(feed => filter(slug(feed.label), feed.label)).join('')}</div>
        <div class="vv-op-layout">
          <section class="vv-op-panel"><div class="vv-op-panel-head"><div><p class="vv-op-kicker">Work queue</p><h3>${rows.length ? `${rows.length} active rows` : 'No rows loaded'}</h3></div><span>${esc(route)}</span></div><div class="vv-op-list">${rows.slice(0, 18).map(row).join('') || '<p class="vv-op-empty">The selected feed did not expose object rows.</p>'}</div></section>
          <aside class="vv-op-panel"><div class="vv-op-panel-head"><div><p class="vv-op-kicker">Source health</p><h3>Route feeds</h3></div></div><div class="vv-source-list">${model.feeds.map(feed).join('')}</div>${noteForm()}<div class="vv-ledger-list">${model.ledger.slice(0, 8).map(ledger).join('') || '<p class="vv-op-empty">No browser-local operator actions yet.</p>'}</div></aside>
        </div>
      </div>`;
  }

  function filteredRows() {
    const rows = model.feeds.flatMap(feed => feed.records.map(record => ({ ...record, feedSlug: slug(feed.label) })));
    return model.filter === 'all' ? rows : rows.filter(row => row.feedSlug === model.filter);
  }

  function metric(label, value) {
    return `<div class="vv-op-metric"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
  }

  function guideMarkup() {
    const guides = {
      'owner-crm': ['Start with contact-ready accounts and recommended product.', 'Open the business or owner packet before outreach.', 'Mark Claim when correction/verification is needed, Ready when it can move, or Block when unsafe.', 'Export the ledger after review.'],
      'admin-review': ['Check source health for moderation, duplicates, and admin packets.', 'Filter to the highest-risk feed first.', 'Open the record, confirm the issue, then mark Ready, Block, or Claim.', 'Export the review packet for the next admin pass.'],
      'lead-inbox': ['Pick a ready lead lane.', 'Open top candidate providers before routing anything.', 'Use Ready only when the lane has real candidate supply.', 'Use the relay lane only after the request has enough real routing context.'],
      'lead-routing': ['Inspect the routing rule and candidate count.', 'Open the matching market/category route for public context.', 'Block lanes that need enrichment before selling lead routing.', 'Export the packet when a lane is ready for upstream form wiring.'],
      'ae-command': ['Prioritize owner-claim-ready and upgrade-ready accounts.', 'Use the generated script angle before calling.', 'Open CRM data when an account needs context.', 'Save a note and export the packet after the call plan is reviewed.'],
      'operator': ['Upload or paste CSV/JSON source rows.', 'Normalize the seed and inspect fields before download.', 'Place reviewed seed files into seed/businesses/inbox/.', 'Run the build so public/admin brains, search, and routes update together.']
    };
    const steps = guides[route] || ['Review the loaded source feeds.', 'Filter to the queue that matches the route.', 'Open the record and choose Claim, Ready, or Block.', 'Save a note or export a packet before leaving.'];
    return `<section class="vv-op-guide"><div><p class="vv-op-kicker">Route guide</p><h3>What to do here</h3><ol>${steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol></div></section>`;
  }

  function filter(value, label) {
    return `<button class="vv-op-filter" data-filter="${esc(value)}" aria-pressed="${model.filter === value ? 'true' : 'false'}">${esc(label)}</button>`;
  }

  function row(item) {
    const entry = model.ledger.find(saved => saved.id === item.id);
    return `<article class="vv-op-row"><div><span class="vv-row-source">${esc(item.feedLabel)}</span><h4>${esc(item.title)}</h4><p>${esc(item.note || 'No next action supplied in source data.')}</p><div class="vv-row-meta">${item.meta.map(part => `<span>${esc(part)}</span>`).join('')}<span>${esc(item.status)}</span>${entry ? `<span>ledger: ${esc(entry.status)}</span>` : ''}</div></div><div class="vv-row-actions">${item.href ? `<a class="btn small" href="${esc(item.href)}">Open</a>` : ''}<button class="btn small" data-row-action="claimed" data-id="${esc(item.id)}" data-title="${esc(item.title)}">Claim</button><button class="btn small" data-row-action="ready" data-id="${esc(item.id)}" data-title="${esc(item.title)}">Ready</button><button class="btn small" data-row-action="blocked" data-id="${esc(item.id)}" data-title="${esc(item.title)}">Block</button></div></article>`;
  }

  function feed(item) {
    return `<article class="vv-source-item"><div><strong>${esc(item.label)}</strong><span>${esc(item.stamp || item.url.replace(DATA, ''))}</span></div><a href="${esc(item.url)}">${esc(item.ok ? `${fmt(item.count)} rows` : item.error)}</a></article>`;
  }

  function noteForm() {
    return `<form class="vv-note-form"><label>Operator note<textarea name="note" placeholder="Record the decision, blocker, or next handoff."></textarea></label><label>Disposition<select name="status"><option value="review">Review</option><option value="claimed">Claimed</option><option value="ready">Ready</option><option value="blocked">Blocked</option><option value="done">Done</option></select></label><button class="btn primary" type="submit">Save note</button></form>`;
  }

  function ledger(item) {
    return `<article class="vv-ledger-item"><strong>${esc(item.title)}</strong><span>${esc(item.status)} / ${esc(item.at)}</span>${item.note ? `<p>${esc(item.note)}</p>` : ''}</article>`;
  }

  function bind(root) {
    root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      model.filter = button.dataset.filter || 'all';
      render();
    }));
    root.querySelectorAll('[data-row-action]').forEach(button => button.addEventListener('click', () => {
      save({ id: button.dataset.id, title: button.dataset.title, status: button.dataset.rowAction, note: `${config[1]}: ${button.dataset.rowAction}` });
      render();
    }));
    root.querySelector('[data-op="download"]')?.addEventListener('click', download);
    root.querySelector('[data-op="packet"]')?.addEventListener('click', () => {
      save({ id: uid(), title: `${config[0]} packet`, status: 'review', note: `Prepared from ${model.feeds.filter(feed => feed.ok).length} source feed(s).` });
      download();
      render();
    });
    root.querySelector('.vv-note-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      save({ id: uid(), title: `${config[0]} note`, status: text(data.get('status') || 'review'), note: text(data.get('note') || '') });
      event.currentTarget.reset();
      render();
    });
  }

  function save(entry) {
    const next = { id: entry.id || uid(), route, lane: config[1], title: entry.title || config[0], status: entry.status || 'review', note: entry.note || '', at: new Date().toISOString() };
    model.ledger = [next, ...model.ledger.filter(item => item.id !== next.id)].slice(0, 120);
    try { localStorage.setItem(STORE + route, JSON.stringify(model.ledger)); } catch {}
  }

  function readLedger() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE + route) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function exportPacket() {
    return { exported_at: new Date().toISOString(), route, lane: config[1], sources: model.feeds.map(({ label, url, ok, count, error }) => ({ label, url, ok, count, error: error || null })), actions: model.ledger };
  }

  function download() {
    const blob = new Blob([JSON.stringify(exportPacket(), null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valley-operator-${route}-${Date.now()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function addStyles() {
    if (document.getElementById('vv-operator-workspace-style')) return;
    const style = document.createElement('style');
    style.id = 'vv-operator-workspace-style';
    style.textContent = `
      .vv-operator-workspace{margin:3rem 0 0;padding:clamp(2rem,5vw,4.5rem) clamp(1rem,4vw,3rem);border-top:1px solid rgba(255,255,255,.14);border-bottom:1px solid rgba(255,255,255,.14);background:linear-gradient(135deg,rgba(9,14,20,.96),rgba(27,34,42,.92));color:#f8f4e9}
      .vv-operator-shell{width:min(1180px,100%);margin:0 auto}.vv-op-head,.vv-op-panel-head,.vv-op-row,.vv-source-item,.vv-ledger-item{display:flex;gap:1rem;align-items:flex-start;justify-content:space-between}.vv-op-head{margin-bottom:1.25rem}.vv-op-head h2{max-width:16ch;margin:0;color:#fff8e8;font-size:clamp(2rem,4vw,3.5rem);line-height:1;letter-spacing:0}.vv-op-head p,.vv-op-row p,.vv-ledger-item p,.vv-op-empty{color:rgba(248,244,233,.72);line-height:1.65}.vv-op-kicker,.vv-row-source{display:block;margin:0 0 .45rem;color:#f5c84c;font-size:.76rem;font-weight:800;letter-spacing:0;text-transform:uppercase}.vv-op-actions,.vv-row-actions,.vv-op-filters{display:flex;flex-wrap:wrap;gap:.55rem}.vv-op-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem;margin:1.5rem 0}.vv-op-metric,.vv-op-panel,.vv-op-row,.vv-source-item,.vv-ledger-item{border:1px solid rgba(255,255,255,.13);border-radius:8px;background:rgba(255,255,255,.055);box-shadow:0 18px 60px rgba(0,0,0,.22)}.vv-op-metric{min-height:6.25rem;padding:1rem}.vv-op-metric strong{display:block;color:#fff;font-size:clamp(1.6rem,3vw,2.5rem);line-height:1}.vv-op-metric span,.vv-source-item span,.vv-ledger-item span,.vv-row-meta span{color:rgba(248,244,233,.66);font-size:.85rem}.vv-op-filter{min-height:2.45rem;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:.55rem .85rem;color:#f8f4e9;background:rgba(255,255,255,.07);cursor:pointer}.vv-op-filter[aria-pressed=true]{color:#141007;background:#f5c84c;border-color:#f5c84c}.vv-op-layout{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(19rem,.7fr);gap:1rem;margin-top:1rem}.vv-op-panel{min-width:0;padding:1rem}.vv-op-list,.vv-source-list,.vv-ledger-list{display:grid;gap:.75rem;margin-top:1rem}.vv-op-row,.vv-source-item,.vv-ledger-item{min-width:0;padding:1rem}.vv-op-row h4,.vv-op-panel h3{margin:0;color:#fff8e8;letter-spacing:0}.vv-row-meta{display:flex;flex-wrap:wrap;gap:.45rem}.vv-row-meta span{padding:.25rem .5rem;border:1px solid rgba(255,255,255,.12);border-radius:999px}.vv-source-item a{color:#f5c84c;font-weight:800;text-decoration:none}.vv-note-form{display:grid;gap:.75rem;margin-top:1rem}.vv-note-form label{display:grid;gap:.35rem;color:rgba(248,244,233,.74);font-weight:700}.vv-note-form textarea,.vv-note-form select{width:100%;min-height:2.75rem;border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:.7rem;color:#fff8e8;background:rgba(0,0,0,.28)}.vv-note-form textarea{min-height:6rem;resize:vertical}@media(max-width:860px){.vv-op-head,.vv-op-panel-head,.vv-op-row,.vv-source-item,.vv-ledger-item{display:grid}.vv-op-metrics,.vv-op-layout{grid-template-columns:1fr}}
      .vv-op-guide{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1rem;align-items:start;margin:0 0 1rem;padding:1rem;border:1px solid rgba(245,200,76,.22);border-radius:8px;background:rgba(245,200,76,.075);box-shadow:0 18px 60px rgba(0,0,0,.16)}.vv-op-guide h3{margin:0 0 .65rem;color:#fff8e8;letter-spacing:0}.vv-op-guide ol{margin:0;padding-left:1.15rem;color:rgba(248,244,233,.78);line-height:1.58}.vv-op-guide li+li{margin-top:.3rem}.vv-op-guide-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.55rem}@media(max-width:860px){.vv-op-guide{grid-template-columns:1fr}.vv-op-guide-actions{justify-content:flex-start}}
    `;
    (document.head || document.documentElement).append(style);
  }

  function text(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
  function slug(value) { return text(value).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'feed'; }
  function fmt(value) { return Number(value || 0).toLocaleString(); }
  function uid() { return window.crypto?.randomUUID ? window.crypto.randomUUID() : `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function esc(value) {
    return text(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }
})();
