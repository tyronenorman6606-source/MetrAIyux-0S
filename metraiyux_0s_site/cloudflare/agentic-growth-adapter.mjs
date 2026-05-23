import { resolveKeyGate13Credential } from './key-gate-13th-adapter.mjs';

const JSON_LIMIT = 2 * 1024 * 1024;
const MAX_PAGES = 300;
const MAX_KEYWORDS = 600;
const MAX_ACTIONS = 40;

export const AGENTIC_GROWTH_ROUTE_FAMILIES = [
  'GET /api/agentic-growth/health',
  'GET /api/agentic-growth/v1/schema',
  'GET /api/agentic-growth/v1/ledger',
  'POST /api/agentic-growth/v1/cycles',
  'POST /api/agentic-growth/v1/cycles/pull',
  'POST /api/agentic-growth/v1/ingest',
  'POST /api/agentic-growth/v1/fallback/brief',
  'POST /api/agentic-growth/v1/adapters/static-site/patch',
  'GET /api/agentic-growth/v1/projects',
  'POST /api/agentic-growth/v1/projects',
  'POST /api/agentic-growth/v1/projects/:id/schedule'
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session,x-skygate-session'
    }
  });
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > JSON_LIMIT) throw new Error('Request body is too large for the 0S Agentic Growth lane.');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function cleanText(value, max = 800) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null && item !== '');
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function unique(values) {
  const out = [];
  const seen = new Set();
  for (const item of asArray(values).map(value => cleanText(value)).filter(Boolean)) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function slugify(value, fallback = 'item') {
  const slug = cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function titleCase(value) {
  return cleanText(value)
    .split(' ')
    .filter(Boolean)
    .map(word => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function routeFromParts(parts = []) {
  const route = asArray(parts).map(part => slugify(part, '')).filter(Boolean).join('/');
  return `/${route}`.replace(/\/+$/, '') || '/';
}

function receiptId(prefix) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id}`;
}

function stableHash(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeBusiness(payload = {}) {
  const business = payload.business || payload.client || {};
  const site = payload.site || {};
  const locations = unique([
    ...asArray(business.locations),
    ...asArray(business.serviceAreas),
    ...asArray(payload.locations),
    ...asArray(site.locations)
  ]);
  return {
    name: cleanText(business.name || payload.name || 'Client Business', 180),
    industry: cleanText(business.industry || payload.industry || 'service business', 120),
    domain: cleanText(business.domain || site.liveUrl || site.domain || '', 220),
    previewUrl: cleanText(site.previewUrl || payload.previewUrl || '', 220),
    services: unique([
      ...asArray(business.services),
      ...asArray(business.offers),
      ...asArray(payload.services)
    ]).slice(0, 30),
    locations: locations.slice(0, 30)
  };
}

function normalizeSitePages(payload = {}) {
  const pageInputs = [
    ...asArray(payload.site?.pages),
    ...asArray(payload.pages),
    ...asArray(payload.crawl?.pages)
  ];
  const pages = [];
  const seen = new Set();
  for (const raw of pageInputs.slice(0, MAX_PAGES)) {
    const page = typeof raw === 'string' ? { url: raw } : (raw || {});
    const url = cleanText(page.url || page.path || page.route || '/', 400) || '/';
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pages.push({
      url,
      title: cleanText(page.title || page.metaTitle || '', 180),
      h1: cleanText(page.h1 || page.heading || '', 180),
      text: cleanText(page.text || page.copy || page.content || '', 2500),
      type: cleanText(page.type || page.pageType || inferPageType(url, page), 80),
      clicks: numberOrZero(page.clicks),
      impressions: numberOrZero(page.impressions),
      ctr: numberOrZero(page.ctr),
      position: numberOrZero(page.position)
    });
  }
  return pages;
}

function inferPageType(url, page = {}) {
  const text = `${url} ${page.title || ''} ${page.h1 || ''}`.toLowerCase();
  if (/faq|question/.test(text)) return 'faq';
  if (/case|proof|result|review|testimonial/.test(text)) return 'proof';
  if (/service|solution|offer/.test(text)) return 'service';
  if (/city|location|near-me|area/.test(text)) return 'location';
  if (/contact|book|quote|demo/.test(text)) return 'cta';
  if (url === '/' || /home/.test(text)) return 'home';
  return 'content';
}

function normalizeGscRows(payload = {}) {
  const rows = asArray(payload.gsc?.rows || payload.searchConsole?.rows || payload.sources?.gsc?.rows);
  return rows.map(row => {
    const keys = asArray(row.keys);
    return {
      query: cleanText(row.query || keys[0] || row.keyword || '', 220),
      page: cleanText(row.page || keys[1] || row.url || '', 420),
      clicks: numberOrZero(row.clicks),
      impressions: numberOrZero(row.impressions),
      ctr: numberOrZero(row.ctr),
      position: numberOrZero(row.position)
    };
  }).filter(row => row.query || row.page).slice(0, MAX_KEYWORDS);
}

function parseCsv(text) {
  const lines = String(text ?? '').trim().slice(0, 200000).split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[;,]/).map(item => item.trim().toLowerCase());
  return lines.slice(1, 1001).map(line => {
    const cells = line.split(/[;,]/);
    return headers.reduce((out, header, index) => {
      out[header] = cleanText(cells[index] || '', 600);
      return out;
    }, {});
  });
}

function normalizeSemrushRows(payload = {}) {
  const semrush = payload.semrush || payload.sources?.semrush || {};
  const rows = [
    ...asArray(semrush.rows),
    ...parseCsv(semrush.csv || semrush.export || '')
  ];
  return rows.map(row => ({
    keyword: cleanText(row.keyword || row.ph || row.query || row.Keyword || '', 220),
    url: cleanText(row.url || row.ur || row.page || row.URL || '', 420),
    position: numberOrZero(row.position || row.po || row.Position),
    volume: numberOrZero(row.volume || row.nq || row.search_volume || row.Volume),
    kd: numberOrZero(row.kd || row.keyword_difficulty || row.competition || row.Cp),
    traffic: numberOrZero(row.traffic || row.tr || row.Traffic)
  })).filter(row => row.keyword || row.url).slice(0, MAX_KEYWORDS);
}

function normalizeSerp(payload = {}) {
  const serp = payload.serp || payload.sources?.serp || payload.dataForSeo || {};
  const queries = asArray(serp.queries || serp.results || serp.keywordResults);
  const normalized = [];
  for (const raw of queries.slice(0, 120)) {
    const query = cleanText(raw.keyword || raw.query || raw.searchTerm || '', 220);
    const organic = asArray(raw.organic || raw.items || raw.results).map(item => ({
      rank: numberOrZero(item.rank || item.position || item.rank_group || item.rank_absolute),
      title: cleanText(item.title || '', 220),
      url: cleanText(item.url || item.link || '', 420),
      snippet: cleanText(item.snippet || item.description || '', 500)
    })).filter(item => item.url || item.title);
    const peopleAlsoAsk = unique([
      ...asArray(raw.peopleAlsoAsk),
      ...asArray(raw.people_also_ask),
      ...asArray(raw.questions)
    ]).slice(0, 20);
    const relatedSearches = unique([
      ...asArray(raw.relatedSearches),
      ...asArray(raw.related_searches),
      ...asArray(raw.related)
    ]).slice(0, 20);
    if (query || organic.length || peopleAlsoAsk.length) normalized.push({ query, organic, peopleAlsoAsk, relatedSearches });
  }
  return normalized;
}

function fallbackKeywords(business) {
  const services = business.services.length ? business.services : [business.industry];
  const locations = business.locations.length ? business.locations : ['near me'];
  const keywords = [];
  for (const service of services.slice(0, 12)) {
    keywords.push(service);
    keywords.push(`${service} near me`);
    for (const location of locations.slice(0, 8)) keywords.push(`${service} ${location}`);
  }
  return unique(keywords).slice(0, 160);
}

function collectSnapshot(payload = {}) {
  const business = normalizeBusiness(payload);
  const pages = normalizeSitePages(payload);
  const gscRows = normalizeGscRows(payload);
  const semrushRows = normalizeSemrushRows(payload);
  const serpQueries = normalizeSerp(payload);
  const seedKeywords = unique([
    ...asArray(payload.market?.seedKeywords),
    ...asArray(payload.keywords),
    ...gscRows.map(row => row.query),
    ...semrushRows.map(row => row.keyword),
    ...serpQueries.map(row => row.query)
  ]).filter(Boolean);
  const keywords = (seedKeywords.length ? seedKeywords : fallbackKeywords(business)).slice(0, MAX_KEYWORDS);
  const competitors = unique([
    ...asArray(payload.market?.competitors),
    ...asArray(payload.competitors),
    ...semrushRows.map(row => domainFromUrl(row.url)).filter(Boolean),
    ...serpQueries.flatMap(query => query.organic.map(item => domainFromUrl(item.url))).filter(Boolean)
  ]).slice(0, 80);
  const questions = unique([
    ...asArray(payload.market?.questions),
    ...serpQueries.flatMap(query => query.peopleAlsoAsk)
  ]).slice(0, 160);
  const sourceSummary = {
    gsc: { connected: gscRows.length > 0, rows: gscRows.length },
    semrush: { connected: semrushRows.length > 0, rows: semrushRows.length },
    serp: { connected: serpQueries.length > 0, queries: serpQueries.length },
    site: { connected: pages.length > 0, pages: pages.length },
    fallback: { active: gscRows.length === 0, reason: gscRows.length ? '' : 'No Search Console access detected. Using seed keywords, preview URL, competitors, page inventory, and live SERP/SEMrush data when provided.' }
  };
  return {
    mode: gscRows.length ? 'connected-domain' : 'no-gsc-preview',
    business,
    pages,
    gscRows,
    semrushRows,
    serpQueries,
    keywords,
    competitors,
    questions,
    sources: sourceSummary
  };
}

function pageMatches(pages, terms = []) {
  const cleanTerms = asArray(terms).map(term => slugify(term, '')).filter(Boolean);
  return pages.some(page => {
    const haystack = `${slugify(page.url, '')} ${slugify(page.title, '')} ${slugify(page.h1, '')}`;
    return cleanTerms.every(term => haystack.includes(term));
  });
}

function opportunityScore(base = 30, metrics = {}) {
  const impressions = Math.min(35, Math.log10(numberOrZero(metrics.impressions) + 1) * 10);
  const volume = Math.min(30, Math.log10(numberOrZero(metrics.volume) + 1) * 8);
  const position = metrics.position ? Math.max(0, 22 - Math.abs(numberOrZero(metrics.position) - 8)) : 8;
  const ctrGap = metrics.ctr ? Math.max(0, 12 - numberOrZero(metrics.ctr) * 100) : 6;
  const confidence = Math.min(99, Math.round(base + impressions + volume + position + ctrGap));
  return Math.max(10, confidence);
}

function task(id, type, title, detail, metrics = {}, patch = {}) {
  return {
    id,
    type,
    title,
    detail,
    score: opportunityScore(patch.baseScore || 30, metrics),
    confidence: patch.confidence || (metrics.source ? 'high' : 'medium'),
    source: metrics.source || 'fallback-market-model',
    targetRoute: patch.targetRoute || '',
    ownerAgent: patch.ownerAgent || 'developer-agent',
    status: 'ready_for_owner_review',
    acceptanceCriteria: patch.acceptanceCriteria || [
      'Change is backed by source data or no-domain fallback inputs.',
      'Page keeps 0S/FS27 gate and proof language intact.',
      'Patch is reviewed before auto-apply is enabled.'
    ]
  };
}

function buildActions(snapshot, options = {}) {
  const pages = snapshot.pages;
  const actions = [];
  const services = snapshot.business.services.length ? snapshot.business.services : [snapshot.business.industry];
  const locations = snapshot.business.locations.length ? snapshot.business.locations : [];

  for (const row of snapshot.gscRows) {
    if (row.impressions >= 50 && row.position >= 4 && row.position <= 30) {
      const route = row.page || routeFromParts([row.query]);
      actions.push(task(
        `gsc_lift_${stableHash(row)}`,
        'search_console_lift',
        `Lift ${row.query || route}`,
        `Search Console shows ${row.impressions} impressions at average position ${row.position || 'unknown'} with ${row.clicks} clicks. Improve the target page, title promise, FAQ coverage, and internal links.`,
        {...row, source: 'gsc'},
        {targetRoute: route, ownerAgent: 'developer-agent-serp-page'}
      ));
    }
  }

  for (const row of snapshot.semrushRows.slice(0, 80)) {
    if (row.volume >= 30 || row.position > 10) {
      actions.push(task(
        `semrush_gap_${stableHash(row)}`,
        'keyword_gap',
        `Build or sharpen ${row.keyword || row.url}`,
        `SEMrush data points to ${row.keyword || row.url} with volume ${row.volume || 'unknown'} and position ${row.position || 'unranked'}. Create a focused service, FAQ, or proof section around the intent.`,
        {volume: row.volume, position: row.position, source: 'semrush'},
        {targetRoute: row.url || routeFromParts([row.keyword]), ownerAgent: 'developer-agent-content-structure'}
      ));
    }
  }

  for (const service of services.slice(0, 16)) {
    if (!pageMatches(pages, [service])) {
      const location = locations[0] || '';
      actions.push(task(
        `service_page_${slugify(service)}_${slugify(location, 'market')}`,
        'service_page',
        `Create ${titleCase(service)} service page`,
        `The site inventory does not show a clear ${service} page. Add a page with proof, FAQs, CTAs, and links from the home page plus related location pages.`,
        {source: snapshot.sources.gsc.connected ? 'site_inventory_plus_gsc' : 'no_domain_fallback'},
        {targetRoute: routeFromParts(['services', service, location]), ownerAgent: 'developer-agent-service-pages', baseScore: snapshot.mode === 'no-gsc-preview' ? 44 : 36}
      ));
    }
  }

  for (const location of locations.slice(0, 14)) {
    if (!pageMatches(pages, [location])) {
      actions.push(task(
        `location_page_${slugify(location)}`,
        'location_page',
        `Add ${titleCase(location)} location page`,
        `The market map includes ${location}, but no dedicated location route is visible. Add localized proof, service links, FAQs, and a conversion path.`,
        {source: snapshot.sources.gsc.connected ? 'site_inventory_plus_gsc' : 'no_domain_fallback'},
        {targetRoute: routeFromParts(['locations', location]), ownerAgent: 'developer-agent-location-pages', baseScore: 42}
      ));
    }
  }

  const questions = snapshot.questions.length
    ? snapshot.questions
    : snapshot.keywords.slice(0, 12).map(keyword => `How much does ${keyword} cost?`);
  for (const question of questions.slice(0, 24)) {
    actions.push(task(
      `faq_${stableHash(question)}`,
      'faq',
      `Answer: ${question}`,
      `Add this FAQ to the nearest service page and mark it for follow-up SERP monitoring. Keep the answer specific, proof-backed, and conversion-aware.`,
      {source: snapshot.questions.length ? 'live_serp_people_also_ask' : 'no_domain_fallback'},
      {targetRoute: routeFromParts(['faq', question]), ownerAgent: 'developer-agent-faqs', baseScore: snapshot.questions.length ? 46 : 34}
    ));
  }

  if (!pages.some(page => page.type === 'proof')) {
    actions.push(task(
      'proof_page_system',
      'proof_page',
      'Create proof page and proof blocks',
      'No proof/case-study route is visible. Add a proof page, link it from service pages, and reuse compact proof blocks near CTAs.',
      {source: 'site_inventory'},
      {targetRoute: '/proof/', ownerAgent: 'developer-agent-proof-pages', baseScore: 52}
    ));
  }

  if (!pages.some(page => /quote|book|call|demo|checkout|contact/i.test(`${page.title} ${page.h1} ${page.text}`))) {
    actions.push(task(
      'cta_system',
      'cta',
      'Install conversion CTA system',
      'The page inventory does not show a strong repeated action path. Add quote/book/demo CTAs, sticky mobile action, and proof-adjacent CTA copy.',
      {source: 'site_inventory'},
      {targetRoute: '/', ownerAgent: 'developer-agent-conversion', baseScore: 49}
    ));
  }

  if (pages.length >= 3 || services.length >= 2) {
    actions.push(task(
      'internal_link_map',
      'internal_links',
      'Rebuild internal link map',
      'Create service-to-location, service-to-proof, FAQ-to-service, and home-to-priority-page links. This is the site structure layer the monitoring agents can keep improving.',
      {source: 'site_inventory'},
      {targetRoute: '/', ownerAgent: 'developer-agent-internal-links', baseScore: 45}
    ));
  }

  const deduped = [];
  const seen = new Set();
  for (const action of actions.sort((a, b) => b.score - a.score)) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    deduped.push(action);
    if (deduped.length >= (options.maxActions || MAX_ACTIONS)) break;
  }
  return deduped;
}

function buildPlan(snapshot, actions, label = '') {
  const serviceActions = actions.filter(action => action.type === 'service_page');
  const locationActions = actions.filter(action => action.type === 'location_page');
  const faqActions = actions.filter(action => action.type === 'faq');
  const proofActions = actions.filter(action => action.type === 'proof_page');
  return {
    label: cleanText(label || `${snapshot.business.name} agentic growth cycle`, 180),
    mode: snapshot.mode,
    agenticLayer: {
      auth: 'FS27/SkyGate/Free99 shared gate only',
      autoApply: false,
      ownerApprovalRequired: true,
      monitoringCadence: 'daily market/data scan, weekly developer patch batch, monthly proof audit',
      noDomainFallback: snapshot.mode === 'no-gsc-preview'
    },
    sourceHealth: snapshot.sources,
    developerAgents: [
      {id: 'market-data-agent', job: 'Pull GSC, SEMrush, keyword, and live SERP evidence; fall back to preview-site and competitor inputs when no domain exists.'},
      {id: 'structure-agent', job: 'Turn opportunities into navigation, internal link, service page, location page, and CTA changes.'},
      {id: 'proof-agent', job: 'Keep proof pages, case snippets, receipts, and claim language aligned with source evidence.'},
      {id: 'developer-agent', job: 'Emit static patch manifests and implementation tasks for review before deployment.'}
    ],
    prioritizedActions: actions,
    queues: {
      servicePages: serviceActions.map(action => ({title: action.title, route: action.targetRoute, score: action.score})),
      locationPages: locationActions.map(action => ({title: action.title, route: action.targetRoute, score: action.score})),
      faqs: faqActions.slice(0, 12).map(action => ({question: action.title.replace(/^Answer:\s*/, ''), route: action.targetRoute, score: action.score})),
      proofPages: proofActions.map(action => ({title: action.title, route: action.targetRoute, score: action.score})),
      internalLinks: [
        {from: '/', to: serviceActions[0]?.targetRoute || '/services/', reason: 'home-to-money-page'},
        {from: serviceActions[0]?.targetRoute || '/services/', to: proofActions[0]?.targetRoute || '/proof/', reason: 'service-to-proof'},
        {from: locationActions[0]?.targetRoute || '/locations/', to: serviceActions[0]?.targetRoute || '/services/', reason: 'location-to-service'}
      ].filter(link => link.from && link.to)
    },
    experiments: actions.slice(0, 8).map((action, index) => ({
      id: `agl_exp_${index + 1}`,
      actionId: action.id,
      hypothesis: `${action.title} will improve qualified discovery and CTA movement.`,
      metric: snapshot.sources.gsc.connected ? 'GSC clicks, impressions, CTR, and position delta' : 'preview engagement, SERP visibility checks, inquiry quality, and launch readiness',
      reviewAfter: '14 days after deployment or first indexed crawl'
    })),
    riskControls: [
      'Never publish provider-backed claims without proof.',
      'Never bypass FS27 auth, SkyPay owner approval, or 0S deployment proof.',
      'Treat patch output as a reviewable manifest until an operator enables apply policy.'
    ]
  };
}

function runCycle(payload = {}, options = {}) {
  const snapshot = collectSnapshot(payload);
  const actions = buildActions(snapshot, {maxActions: options.maxActions || payload.options?.maxActions});
  const plan = buildPlan(snapshot, actions, payload.label);
  return {
    ok: true,
    receipt: {
      id: receiptId('agl_0s_cycle'),
      createdAt: new Date().toISOString(),
      inputHash: stableHash(payload),
      mode: snapshot.mode,
      noGscCapable: true,
      auth: 'fs27-gate',
      autoApplied: false
    },
    snapshot: {
      mode: snapshot.mode,
      noGscCapable: true,
      business: snapshot.business,
      sources: snapshot.sources,
      keywordCount: snapshot.keywords.length,
      pageCount: snapshot.pages.length,
      competitorCount: snapshot.competitors.length,
      fallbackNotes: snapshot.sources.fallback.active ? [snapshot.sources.fallback.reason] : []
    },
    plan,
    nextBestInputs: nextBestInputs(snapshot)
  };
}

function nextBestInputs(snapshot) {
  const inputs = [];
  if (!snapshot.sources.gsc.connected) inputs.push('Connect Google Search Console after the owned domain exists; until then keep sending preview URL, seed keywords, competitors, page inventory, SEMrush, and live SERP snapshots.');
  if (!snapshot.sources.serp.connected) inputs.push('Add live SERP snapshots for the top service/location keywords so FAQ and proof tasks can be scored against real results.');
  if (!snapshot.sources.site.connected) inputs.push('Send a crawl or page inventory so developer agents can target existing routes instead of drafting from scratch.');
  if (!snapshot.business.services.length) inputs.push('Add the actual services/offers so fallback keyword expansion stops relying on the industry label.');
  return inputs;
}

function buildStaticPatch(plan, adapter = {}) {
  const topActions = plan.prioritizedActions.slice(0, 12);
  const manifest = {
    product: 'Agentic Growth Layer',
    generatedAt: new Date().toISOString(),
    applyMode: adapter.applyMode || 'review-manifest',
    auth: 'FS27/SkyGate/Free99 gate required',
    autoApply: false,
    routes: topActions.map(action => ({
      id: action.id,
      type: action.type,
      targetRoute: action.targetRoute,
      title: action.title,
      score: action.score,
      ownerAgent: action.ownerAgent
    }))
  };
  const faqHtml = plan.queues.faqs.slice(0, 8).map(item => (
    `<details class="agentic-faq"><summary>${escapeHtml(item.question)}</summary><p>Answer this with local proof, source evidence, and a direct conversion path.</p></details>`
  )).join('\n');
  const linkHtml = plan.queues.internalLinks.map(link => (
    `<li><a href="${escapeAttr(link.to)}">${escapeHtml(link.reason)}</a> from ${escapeHtml(link.from)}</li>`
  )).join('\n');
  return {
    ok: true,
    files: [
      {
        path: adapter.manifestPath || 'agentic-growth/patch-manifest.json',
        type: 'json',
        body: JSON.stringify(manifest, null, 2)
      },
      {
        path: 'agentic-growth/faq-snippet.html',
        type: 'html',
        body: `<section class="agentic-growth-section" data-agentic-layer="faqs">\n${faqHtml}\n</section>\n`
      },
      {
        path: 'agentic-growth/internal-links.html',
        type: 'html',
        body: `<nav class="agentic-related-links" aria-label="Agentic related links"><ul>\n${linkHtml}\n</ul></nav>\n`
      },
      {
        path: 'agentic-growth/agentic-growth.css',
        type: 'css',
        body: '.agentic-growth-section{padding:48px 0}.agentic-faq{border-top:1px solid rgba(0,0,0,.15);padding:14px 0}.agentic-related-links ul{display:grid;gap:8px;padding-left:18px}.agentic-cta{display:inline-flex;align-items:center;min-height:44px;padding:10px 14px;border-radius:6px;background:#111827;color:#fff;text-decoration:none}'
      }
    ],
    instructions: [
      'Review the manifest before applying.',
      'Attach source receipts to every proof or performance claim.',
      'Run live browser proof after deploying changes.'
    ]
  };
}

function escapeHtml(value) {
  return cleanText(value, 1000).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function credentialRef(config = {}) {
  if (!config || typeof config !== 'object') return '';
  if (typeof config.credentialRef === 'object') return config.credentialRef;
  if (typeof config.secretRef === 'object') return config.secretRef;
  return cleanText(config.credentialRef || config.credential_ref || config.secretRef || config.secret_ref || config.keyGateRef || config.key_gate_ref || '', 220);
}

function rawProviderCredentialPaths(payload = {}) {
  const config = payload.sourceConfig || payload.connectors || {};
  const paths = [];
  if (config.gsc?.accessToken || config.gsc?.token) paths.push('sourceConfig.gsc.accessToken');
  if (config.semrush?.apiKey || config.semrush?.api_key || config.semrush?.key) paths.push('sourceConfig.semrush.apiKey');
  if (config.dataForSeo?.login || config.dataForSeo?.password || config.dataForSeo?.credentials) paths.push('sourceConfig.dataForSeo.credentials');
  if (config.stripe?.secretKey || config.stripe?.apiKey) paths.push('sourceConfig.stripe.secretKey');
  if (config.cloudflare?.apiToken || config.cloudflare?.token) paths.push('sourceConfig.cloudflare.apiToken');
  return paths;
}

function sourceConfig(payload = {}, env = {}) {
  const config = payload.sourceConfig || payload.connectors || {};
  const allowEnvProviderSecrets = String(env.AGENTIC_GROWTH_ALLOW_ENV_PROVIDER_SECRETS || '').trim() === '1';
  return {
    gsc: {
      siteUrl: cleanText(config.gsc?.siteUrl || payload.business?.domain || payload.site?.liveUrl || ''),
      credentialRef: credentialRef(config.gsc),
      accessToken: allowEnvProviderSecrets ? cleanText(env.GSC_ACCESS_TOKEN || env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || '') : '',
      startDate: cleanText(config.gsc?.startDate || payload.dates?.startDate || ''),
      endDate: cleanText(config.gsc?.endDate || payload.dates?.endDate || ''),
      rowLimit: Math.min(25000, numberOrZero(config.gsc?.rowLimit || payload.limits?.gscRows || 5000) || 5000)
    },
    semrush: {
      credentialRef: credentialRef(config.semrush),
      apiKey: allowEnvProviderSecrets ? cleanText(env.SEMRUSH_API_KEY || '') : '',
      domain: cleanText(config.semrush?.domain || payload.business?.domain || ''),
      database: cleanText(config.semrush?.database || env.SEMRUSH_DATABASE || 'us'),
      limit: Math.min(5000, numberOrZero(config.semrush?.limit || payload.limits?.semrushRows || 1000) || 1000)
    },
    dataForSeo: {
      credentialRef: credentialRef(config.dataForSeo),
      login: allowEnvProviderSecrets ? cleanText(env.DATAFORSEO_LOGIN || '') : '',
      password: allowEnvProviderSecrets ? cleanText(env.DATAFORSEO_PASSWORD || '') : '',
      keywords: unique(config.dataForSeo?.keywords || payload.market?.seedKeywords || payload.keywords).slice(0, 50),
      locationCode: numberOrZero(config.dataForSeo?.locationCode || env.DATAFORSEO_LOCATION_CODE || 2840) || 2840,
      languageCode: cleanText(config.dataForSeo?.languageCode || env.DATAFORSEO_LANGUAGE_CODE || 'en'),
      device: cleanText(config.dataForSeo?.device || 'desktop')
    }
  };
}

function keyGateWorkspace(payload = {}, auth = {}) {
  return cleanText(
    payload.workspace_id ||
    payload.workspaceId ||
    payload.project?.workspace_id ||
    auth.identity?.workspace_id ||
    auth.identity?.customer_id ||
    auth.gate?.data?.workspace_id ||
    auth.gate?.data?.customer_id ||
    auth.actor ||
    '0s-primary-workspace',
    160
  ).replace(/[^a-zA-Z0-9_.:-]+/g, '-');
}

function credentialRefReceipt(ref) {
  if (!ref) return null;
  if (typeof ref === 'object') {
    return {
      id: cleanText(ref.id || ref.secret_id || ref.secretId || ref.credential_id || ref.credentialId || '', 180),
      workspace_id: cleanText(ref.workspace_id || ref.workspaceId || '', 160),
      vendor_key: cleanText(ref.vendor_key || ref.vendorKey || ref.vendor || '', 80)
    };
  }
  return { id: cleanText(ref, 180) };
}

async function hydrateSourceCredentials(config, payload = {}, env = {}, auth = {}) {
  const workspaceId = keyGateWorkspace(payload, auth);
  const receipts = [];
  async function resolve(vendorKey, ref, apply) {
    if (!ref) return;
    try {
      const resolved = await resolveKeyGate13Credential(env, {
        auth,
        secretRef: ref,
        vendorKey,
        workspaceId,
        appId: 'agentic-growth-layer',
        purpose: `source-pull:${vendorKey}`
      });
      if (resolved.ok) {
        apply(resolved.credential);
        receipts.push({source: vendorKey, ok: true, credentialRef: credentialRefReceipt(ref), broker: 'key-gate-13th'});
      } else {
        receipts.push({source: vendorKey, ok: false, skipped: true, reason: resolved.reason || 'credential_ref_not_resolved', credentialRef: credentialRefReceipt(ref)});
      }
    } catch (error) {
      receipts.push({source: vendorKey, ok: false, error: cleanText(error.message || String(error), 260), credentialRef: credentialRefReceipt(ref), broker: 'key-gate-13th'});
    }
  }
  await resolve('google-search-console', config.gsc.credentialRef, credential => {
    config.gsc.accessToken = typeof credential === 'object' ? cleanText(credential.accessToken || credential.token || '', 8000) : cleanText(credential, 8000);
  });
  await resolve('semrush', config.semrush.credentialRef, credential => {
    config.semrush.apiKey = typeof credential === 'object' ? cleanText(credential.apiKey || credential.api_key || credential.token || '', 8000) : cleanText(credential, 8000);
  });
  await resolve('dataforseo', config.dataForSeo.credentialRef, credential => {
    if (credential && typeof credential === 'object') {
      config.dataForSeo.login = cleanText(credential.login || credential.username || '', 8000);
      config.dataForSeo.password = cleanText(credential.password || credential.token || '', 8000);
    } else {
      const [login, ...rest] = cleanText(credential, 8000).split(':');
      config.dataForSeo.login = login || '';
      config.dataForSeo.password = rest.join(':');
    }
  });
  return receipts;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.json().catch(async () => ({raw: await response.text().catch(() => '')}));
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${url} failed with ${response.status}`);
  return {body, status: response.status};
}

async function pullSources(payload = {}, env = {}, auth = {}) {
  const config = sourceConfig(payload, env);
  const credentialReceipts = await hydrateSourceCredentials(config, payload, env, auth);
  const pulled = {};
  const receipts = [...credentialReceipts];
  if (config.gsc.siteUrl && config.gsc.accessToken) {
    try {
      const endDate = config.gsc.endDate || new Date().toISOString().slice(0, 10);
      const startDate = config.gsc.startDate || new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
      const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.gsc.siteUrl)}/searchAnalytics/query`;
      const {body, status} = await fetchJson(endpoint, {
        method: 'POST',
        headers: {authorization: `Bearer ${config.gsc.accessToken}`, 'content-type': 'application/json'},
        body: JSON.stringify({startDate, endDate, dimensions: ['query', 'page'], rowLimit: config.gsc.rowLimit})
      });
      pulled.gsc = {rows: Array.isArray(body.rows) ? body.rows : []};
      receipts.push({source: 'gsc', ok: true, status, rows: pulled.gsc.rows.length});
    } catch (error) {
      receipts.push({source: 'gsc', ok: false, error: cleanText(error.message, 300)});
    }
  } else {
    receipts.push({source: 'gsc', ok: false, skipped: true, reason: 'missing siteUrl or access token'});
  }
  if (config.semrush.apiKey && config.semrush.domain) {
    try {
      const params = new URLSearchParams({
        type: 'domain_organic',
        key: config.semrush.apiKey,
        display_limit: String(config.semrush.limit),
        export_columns: 'Ph,Po,Nq,Cp,Ur,Tr',
        domain: config.semrush.domain,
        database: config.semrush.database
      });
      const response = await fetch(`https://api.semrush.com/?${params}`);
      const csv = await response.text();
      if (!response.ok || /^ERROR/i.test(csv)) throw new Error(`SEMrush request failed with ${response.status}`);
      pulled.semrush = {csv};
      receipts.push({source: 'semrush', ok: true, status: response.status, bytes: csv.length});
    } catch (error) {
      receipts.push({source: 'semrush', ok: false, error: cleanText(error.message, 300)});
    }
  } else {
    receipts.push({source: 'semrush', ok: false, skipped: true, reason: 'missing domain or SEMrush provider key'});
  }
  if (config.dataForSeo.login && config.dataForSeo.password && config.dataForSeo.keywords.length) {
    try {
      const tasks = config.dataForSeo.keywords.map((keyword, index) => ({
        keyword,
        location_code: config.dataForSeo.locationCode,
        language_code: config.dataForSeo.languageCode,
        device: config.dataForSeo.device,
        tag: `agl-0s-${index + 1}`
      }));
      const {body, status} = await fetchJson('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
        method: 'POST',
        headers: {
          authorization: `Basic ${btoa(`${config.dataForSeo.login}:${config.dataForSeo.password}`)}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(tasks)
      });
      pulled.serp = {
        queries: asArray(body.tasks).map(task => {
          const data = task.data || {};
          const result = task.result?.[0] || {};
          const items = asArray(result.items);
          return {
            keyword: data.keyword || result.keyword || '',
            organic: items.filter(item => item.type === 'organic').map(item => ({
              rank: item.rank_group || item.rank_absolute,
              title: item.title,
              url: item.url,
              snippet: item.description
            })),
            peopleAlsoAsk: items.filter(item => item.type === 'people_also_ask').flatMap(item => item.items || []).map(item => item.title || item.question).filter(Boolean),
            relatedSearches: items.filter(item => item.type === 'related_searches').flatMap(item => item.items || []).map(item => item.title || item.keyword).filter(Boolean)
          };
        })
      };
      receipts.push({source: 'dataforseo', ok: true, status, queries: pulled.serp.queries.length});
    } catch (error) {
      receipts.push({source: 'dataforseo', ok: false, error: cleanText(error.message, 300)});
    }
  } else {
    receipts.push({source: 'dataforseo', ok: false, skipped: true, reason: 'missing credentials or keywords'});
  }
  return {pulled, receipts, pulledAt: new Date().toISOString()};
}

function mergePulled(payload, sourcePull) {
  return {
    ...payload,
    gsc: payload.gsc || sourcePull.pulled.gsc,
    semrush: payload.semrush || sourcePull.pulled.semrush,
    serp: payload.serp || sourcePull.pulled.serp,
    sourcePullReceipt: {pulledAt: sourcePull.pulledAt, receipts: sourcePull.receipts}
  };
}

async function storeReceipt(env, ctx, auth, result) {
  const receipt = result?.receipt;
  if (!receipt) return {stored: false};
  const event = {
    id: receipt.id,
    type: 'agentic_growth.cycle',
    app_id: 'agentic-growth-layer',
    source_app: 'agentic-growth-layer',
    actor: auth.actor || auth.identity?.email || 'fs27-gate-session',
    auth_via: auth.via || 'fs27-gate',
    created_at: receipt.createdAt,
    mode: receipt.mode,
    input_hash: receipt.inputHash,
    summary: {
      business: result.snapshot?.business?.name,
      actions: result.plan?.prioritizedActions?.length || 0,
      keywords: result.snapshot?.keywordCount || 0,
      pages: result.snapshot?.pageCount || 0,
      no_gsc_capable: true
    }
  };
  if (env.SITE_EVENTS_KV?.put) {
    ctx?.waitUntil?.(env.SITE_EVENTS_KV.put(`agentic-growth:${receipt.id}`, JSON.stringify(event), {expirationTtl: 60 * 60 * 24 * 180}));
    return {stored: true, key: `agentic-growth:${receipt.id}`};
  }
  return {stored: false};
}

async function listLedger(env) {
  if (!env.SITE_EVENTS_KV?.list) return [];
  const listed = await env.SITE_EVENTS_KV.list({prefix: 'agentic-growth:', limit: 80});
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await env.SITE_EVENTS_KV.get(key.name, {type: 'json'}).catch(() => null);
    if (item) rows.push({...item, kv_key: key.name});
  }
  return rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function agenticWorkspace(auth, body = {}) {
  return cleanText(
    body.workspace_id ||
    body.workspaceId ||
    body.project?.workspace_id ||
    auth.identity?.workspace_id ||
    auth.identity?.customer_id ||
    auth.gate?.data?.workspace_id ||
    auth.gate?.data?.customer_id ||
    auth.actor ||
    '0s-primary-workspace',
    160
  ).replace(/[^a-zA-Z0-9_.:-]+/g, '-') || '0s-primary-workspace';
}

function projectKey(workspaceId, id) {
  return `agentic-growth:project:${workspaceId}:${id}`;
}

function normalizeProject(auth, body = {}, existing = null) {
  const workspaceId = agenticWorkspace(auth, body);
  const id = cleanText(body.id || body.project_id || body.projectId || existing?.id || `agl_project_${stableHash([workspaceId, body.business?.name || body.name || Date.now()])}`, 160)
    .replace(/[^a-zA-Z0-9_.:-]+/g, '-');
  const credentials = body.credentials || body.credentialRefs || body.sourceConfig || existing?.credentials || {};
  const schedule = body.schedule || existing?.schedule || {};
  const createdAt = existing?.created_at || new Date().toISOString();
  return {
    id,
    workspace_id: workspaceId,
    app_id: 'agentic-growth-layer',
    name: cleanText(body.name || body.business?.name || existing?.name || 'Agentic Growth Project', 180),
    domain: cleanText(body.domain || body.business?.domain || body.site?.liveUrl || existing?.domain || '', 240),
    preview_url: cleanText(body.previewUrl || body.preview_url || body.site?.previewUrl || existing?.preview_url || '', 240),
    business: {
      name: cleanText(body.business?.name || body.name || existing?.business?.name || '', 180),
      industry: cleanText(body.business?.industry || body.industry || existing?.business?.industry || '', 120),
      services: unique(body.business?.services || body.services || existing?.business?.services || []).slice(0, 40),
      locations: unique(body.business?.locations || body.locations || existing?.business?.locations || []).slice(0, 40)
    },
    credentials: {
      gsc: credentialRefReceipt(credentials.gsc?.credentialRef || credentials.gsc?.secretRef || credentials.gsc || ''),
      semrush: credentialRefReceipt(credentials.semrush?.credentialRef || credentials.semrush?.secretRef || credentials.semrush || ''),
      dataForSeo: credentialRefReceipt(credentials.dataForSeo?.credentialRef || credentials.dataForSeo?.secretRef || credentials.dataForSeo || '')
    },
    schedule: {
      enabled: schedule.enabled === true,
      cadence: cleanText(schedule.cadence || 'weekly', 40),
      nextRunAt: cleanText(schedule.nextRunAt || schedule.next_run_at || '', 80),
      lastQueuedAt: existing?.schedule?.lastQueuedAt || null,
      lastQueueReceiptId: existing?.schedule?.lastQueueReceiptId || null
    },
    policy: {
      autoApply: false,
      ownerApprovalRequired: true,
      keyGateRequiredForProviderPulls: true
    },
    created_at: createdAt,
    updated_at: new Date().toISOString(),
    created_by: existing?.created_by || auth.actor || auth.identity?.email || 'fs27-gate-session',
    updated_by: auth.actor || auth.identity?.email || 'fs27-gate-session'
  };
}

async function saveProject(env, project) {
  if (!env.SITE_EVENTS_KV?.put) return {stored: false, project};
  await env.SITE_EVENTS_KV.put(projectKey(project.workspace_id, project.id), JSON.stringify(project), {expirationTtl: 60 * 60 * 24 * 365});
  return {stored: true, project};
}

async function readProject(env, workspaceId, id) {
  if (!env.SITE_EVENTS_KV?.get) return null;
  return env.SITE_EVENTS_KV.get(projectKey(workspaceId, id), {type: 'json'}).catch(() => null);
}

async function listProjects(env, workspaceId = '') {
  if (!env.SITE_EVENTS_KV?.list) return [];
  const prefix = workspaceId ? `agentic-growth:project:${workspaceId}:` : 'agentic-growth:project:';
  const listed = await env.SITE_EVENTS_KV.list({prefix, limit: 120}).catch(() => ({keys: []}));
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await env.SITE_EVENTS_KV.get(key.name, {type: 'json'}).catch(() => null);
    if (item) rows.push({...item, kv_key: key.name});
  }
  return rows.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

function nextRunAt(cadence, from = new Date()) {
  const date = new Date(from);
  const normalized = cleanText(cadence || 'weekly', 40).toLowerCase();
  const days = normalized === 'daily' ? 1 : normalized === 'monthly' ? 30 : normalized === 'monday-wednesday-friday' ? 2 : 7;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function projectDue(project, now) {
  if (!project?.schedule?.enabled) return false;
  const next = project.schedule.nextRunAt || project.schedule.next_run_at || '';
  if (!next) return true;
  return Date.parse(next) <= now.getTime();
}

export async function runAgenticGrowthScheduleTick(env, ctx, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  if (!env.SITE_EVENTS_KV?.list) return {ok: false, skipped: true, reason: 'SITE_EVENTS_KV is not configured.'};
  const projects = await listProjects(env, '');
  const due = projects.filter(project => projectDue(project, now)).slice(0, 20);
  const queued = [];
  for (const project of due) {
    const task = {
      id: receiptId('agl_schedule'),
      type: 'agentic_growth.scheduled_cycle',
      app_id: 'agentic-growth-layer',
      source_app: 'agentic-growth-layer',
      workspace_id: project.workspace_id,
      project_id: project.id,
      task_title: `Agentic Growth scheduled cycle: ${project.name}`,
      status: env.SITE_TASK_QUEUE ? 'queued_for_operator_runtime' : 'queue_not_configured',
      execute: options.execute === true,
      credential_refs: project.credentials,
      policy: project.policy,
      created_at: now.toISOString(),
      source: options.source || 'schedule'
    };
    if (env.SITE_TASK_QUEUE?.send) {
      const send = env.SITE_TASK_QUEUE.send(task);
      ctx?.waitUntil ? ctx.waitUntil(send) : await send;
    }
    if (env.SITE_EVENTS_KV?.put) {
      await env.SITE_EVENTS_KV.put(`agentic-growth:schedule:${task.id}`, JSON.stringify(task), {expirationTtl: 60 * 60 * 24 * 180});
    }
    project.schedule.lastQueuedAt = now.toISOString();
    project.schedule.lastQueueReceiptId = task.id;
    project.schedule.nextRunAt = nextRunAt(project.schedule.cadence, now);
    project.updated_at = now.toISOString();
    await saveProject(env, project);
    queued.push(task);
  }
  return {ok: true, checked: projects.length, due: due.length, queued: queued.length, receipts: queued.map(task => task.id)};
}

function schemaResponse(base = '/api/agentic-growth') {
  return {
    ok: true,
    product: 'Agentic Growth Layer',
    auth: 'FS27/SkyGate/Free99 shared gate only',
    endpoints: {
      health: `GET ${base}/health`,
      schema: `GET ${base}/v1/schema`,
      ledger: `GET ${base}/v1/ledger`,
      projects: `GET ${base}/v1/projects`,
      upsertProject: `POST ${base}/v1/projects`,
      scheduleProject: `POST ${base}/v1/projects/:id/schedule`,
      cycle: `POST ${base}/v1/cycles`,
      connectedCycle: `POST ${base}/v1/cycles/pull`,
      ingest: `POST ${base}/v1/ingest`,
      fallbackBrief: `POST ${base}/v1/fallback/brief`,
      staticPatch: `POST ${base}/v1/adapters/static-site/patch`
    },
    minimumPayload: {
      business: {name: 'Client Business', industry: 'service business', services: ['service one'], locations: ['Phoenix AZ']},
      site: {previewUrl: 'https://client-preview.netlify.app', pages: [{url: '/', title: 'Home', h1: 'Client Business'}]},
      market: {seedKeywords: ['service one phoenix'], competitors: ['https://example-competitor.com']}
    },
    credentialPolicy: {
      broker: 'Key Gate 13th',
      dashboard: '/key-gate-13th/',
      acceptedSourceConfig: {
        gsc: {credentialRef: 'kg13_sec_...', siteUrl: 'sc-domain:example.com'},
        semrush: {credentialRef: 'kg13_sec_...', domain: 'example.com'},
        dataForSeo: {credentialRef: 'kg13_sec_...', keywords: ['service city']}
      },
      rawProviderSecrets: 'rejected on the 0S connected-source endpoint'
    },
    noSearchConsoleMode: 'Supported. The engine uses preview URLs, seed keywords, competitors, SEMrush rows, SERP snapshots, and page inventory until GSC exists.'
  };
}

function healthResponse(base = '/api/agentic-growth') {
  return {
    ok: true,
    app_id: 'agenticGrowth',
    app: 'Agentic Growth Layer',
    base,
    mounted: true,
    status: 'LIVE/GATED/FS27',
    auth_mode: 'fs27_shared_gate_only',
    engine: '0s-cloudflare-agentic-growth-adapter',
    no_gsc_fallback: true,
    credential_broker: 'key-gate-13th',
    raw_provider_payloads: 'rejected on connected source pulls',
    project_schedules: 'SITE_EVENTS_KV project records plus SITE_TASK_QUEUE due-cycle dispatch when configured',
    route_families: AGENTIC_GROWTH_ROUTE_FAMILIES,
    storage: 'SITE_EVENTS_KV receipt ledger when configured',
    checked_at: new Date().toISOString()
  };
}

export async function handleAgenticGrowthRoute(request, env, ctx, url, matchedBase = '/api/agentic-growth', mount = {}, helpers = {}) {
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS') return json({ok: true});
  const auth = await helpers.requireGateAuth?.(request, env, 'Agentic Growth Layer runtime');
  if (!auth?.ok) return auth?.response || json({ok: false, error: 'FS27 gate session required for Agentic Growth Layer.'}, 401);
  const suffix = url.pathname === matchedBase ? '/' : (url.pathname.slice(matchedBase.length) || '/');

  if (method === 'GET' && (suffix === '/' || suffix === '/health')) {
    return json({...healthResponse(matchedBase), auth: {via: auth.via || 'fs27-gate', actor: auth.actor || null}});
  }
  if (method === 'GET' && suffix === '/v1/schema') return json(schemaResponse(matchedBase));
  if (method === 'GET' && suffix === '/v1/ledger') return json({ok: true, items: await listLedger(env), auth: {via: auth.via || 'fs27-gate'}});
  if (method === 'GET' && suffix === '/v1/projects') {
    const workspaceId = agenticWorkspace(auth, {workspace_id: url.searchParams.get('workspace_id') || url.searchParams.get('workspace') || ''});
    return json({ok: true, workspace_id: workspaceId, items: await listProjects(env, workspaceId), auth: {via: auth.via || 'fs27-gate'}});
  }
  if (method !== 'POST') return json({ok: false, error: 'method_not_allowed', route_families: AGENTIC_GROWTH_ROUTE_FAMILIES}, 405);

  let body = {};
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ok: false, error: cleanText(error.message || 'Invalid JSON body.', 300)}, 400);
  }

  let result = null;
  const parts = suffix.split('/').filter(Boolean);
  if (suffix === '/v1/projects') {
    const project = normalizeProject(auth, body);
    const stored = await saveProject(env, project);
    result = {
      ok: true,
      project,
      storage: {stored: stored.stored, key: projectKey(project.workspace_id, project.id)}
    };
  } else if (parts[0] === 'v1' && parts[1] === 'projects' && parts[2] && parts[3] === 'schedule') {
    const workspaceId = agenticWorkspace(auth, body);
    const id = cleanText(parts[2], 160).replace(/[^a-zA-Z0-9_.:-]+/g, '-');
    const existing = await readProject(env, workspaceId, id);
    if (!existing) return json({ok: false, error: 'agentic_growth_project_not_found'}, 404);
    const project = normalizeProject(auth, { ...existing, schedule: {...existing.schedule, ...(body.schedule || body)} }, existing);
    project.schedule.enabled = body.enabled === undefined ? project.schedule.enabled : body.enabled === true;
    project.schedule.cadence = cleanText(body.cadence || body.schedule?.cadence || project.schedule.cadence || 'weekly', 40);
    project.schedule.nextRunAt = cleanText(body.nextRunAt || body.next_run_at || body.schedule?.nextRunAt || project.schedule.nextRunAt || nextRunAt(project.schedule.cadence), 80);
    await saveProject(env, project);
    result = {
      ok: true,
      project,
      schedule: project.schedule,
      storage: {stored: true, key: projectKey(project.workspace_id, project.id)}
    };
  } else if (suffix === '/v1/cycles') {
    result = runCycle(body);
  } else if (suffix === '/v1/cycles/pull') {
    const rawCredentialPaths = rawProviderCredentialPaths(body);
    if (rawCredentialPaths.length) {
      return json({
        ok: false,
        error: 'raw_provider_credentials_rejected',
        message: 'Agentic Growth on 0S accepts Key Gate 13th credentialRef/secretRef values only. Raw provider keys must be stored in /key-gate-13th/ first.',
        key_gate_13th_required: true,
        rejected_paths: rawCredentialPaths
      }, 400);
    }
    const sourcePull = await pullSources(body, env, auth);
    result = runCycle(mergePulled(body, sourcePull));
    result.sourcePullReceipt = {pulledAt: sourcePull.pulledAt, receipts: sourcePull.receipts};
  } else if (suffix === '/v1/ingest') {
    const snapshot = collectSnapshot(body);
    result = {
      ok: true,
      mode: snapshot.mode,
      business: snapshot.business,
      sources: snapshot.sources,
      keywords: snapshot.keywords,
      pages: snapshot.pages,
      competitors: snapshot.competitors,
      questions: snapshot.questions
    };
  } else if (suffix === '/v1/fallback/brief') {
    const cycle = runCycle({...body, gsc: {}, searchConsole: {}, sources: {...(body.sources || {}), gsc: {}}}, {maxActions: body.options?.maxActions || 10});
    result = {
      ok: true,
      mode: cycle.snapshot.mode,
      brief: {
        business: cycle.snapshot.business,
        firstActions: cycle.plan.prioritizedActions.slice(0, 5),
        dataToAskClientFor: cycle.nextBestInputs,
        canStartBeforeDomain: true,
        suggestedOffer: 'No-domain agentic SEO starter: seed market map, preview-site structure, service/location/FAQ drafts, and launch-ready GSC connection path.'
      }
    };
  } else if (suffix === '/v1/adapters/static-site/patch') {
    const cycle = body.plan ? {plan: body.plan, receipt: {id: receiptId('agl_0s_patch'), createdAt: new Date().toISOString(), mode: body.plan.mode || 'patch-only', inputHash: stableHash(body)}} : runCycle(body);
    result = {
      ok: true,
      receipt: cycle.receipt,
      adapter: buildStaticPatch(cycle.plan, body.adapter || {})
    };
  } else {
    return json({ok: false, error: 'agentic_growth_route_not_found', requested_path: url.pathname, base: matchedBase}, 404);
  }

  const storage = await storeReceipt(env, ctx, auth, result);
  if (helpers.mirrorSkygateEvent && result?.receipt) {
    ctx?.waitUntil?.(helpers.mirrorSkygateEvent(env, {
      type: 'agentic_growth.cycle',
      meta: {
        receipt_id: result.receipt.id,
        mode: result.receipt.mode,
        actions: result.plan?.prioritizedActions?.length || 0,
        business: result.snapshot?.business?.name || ''
      }
    }, auth.gate || null));
  }
  return json({
    auth: {
      mode: 'fs27-shared-gate',
      via: auth.via || 'fs27-gate',
      actor: auth.actor || auth.identity?.email || null
    },
    storage,
    ...result
  });
}
