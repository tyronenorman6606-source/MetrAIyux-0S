const SAAS_EVENT_TTL = 60 * 60 * 24 * 365;

const PLAN_CATALOG = {
  'starter-command': {
    id: 'starter-command',
    name: 'Starter Command',
    status: 'active',
    limits: {commands: 600, ai_credits: 25000, vault_mb: 1024, mailboxes: 1, seats: 2, proof_exports: 50},
    free99: ['skyeprofitconsole', 'skyesplitengine', 'skyemediacenter', 'content-forge'],
    paid_boundary: 'provider, AI, outbound mail, payment, identity, custody, and tenant resale work require entitlement'
  },
  'growth-cabinet': {
    id: 'growth-cabinet',
    name: 'Growth Cabinet',
    status: 'active',
    limits: {commands: 2500, ai_credits: 75000, vault_mb: 5120, mailboxes: 3, seats: 5, proof_exports: 250},
    free99: ['skyeprofitconsole', 'skyesplitengine', 'skyemediacenter', 'content-forge'],
    paid_boundary: 'provider, AI, outbound mail, payment, identity, custody, and tenant resale work require entitlement'
  },
  'routex-workforce-command': {
    id: 'routex-workforce-command',
    name: 'RouteX Workforce Command',
    status: 'owner_approval_required',
    limits: {commands: 3500, ai_credits: 100000, vault_mb: 10240, mailboxes: 5, seats: 8, proof_exports: 500},
    free99: ['skyeprofitconsole', 'skyesplitengine', 'skyemediacenter', 'content-forge'],
    paid_boundary: 'live workforce provider, route, identity, and notification actions require configured production secrets'
  },
  'autonomous-office': {
    id: 'autonomous-office',
    name: 'Autonomous Office',
    status: 'active',
    limits: {commands: 6000, ai_credits: 150000, vault_mb: 20480, mailboxes: 8, seats: 15, proof_exports: 1000},
    free99: ['skyeprofitconsole', 'skyesplitengine', 'skyemediacenter', 'content-forge'],
    paid_boundary: 'provider, AI, outbound mail, payment, identity, custody, and tenant resale work require entitlement'
  },
  'enterprise-command': {
    id: 'enterprise-command',
    name: 'Enterprise Command',
    status: 'quote_owner_approval_required',
    limits: {commands: 10000, ai_credits: 250000, vault_mb: 51200, mailboxes: 25, seats: 50, proof_exports: 2500},
    free99: ['skyeprofitconsole', 'skyesplitengine', 'skyemediacenter', 'content-forge'],
    paid_boundary: 'custom written limits, white-label policy, and tenant resale require owner-approved terms'
  }
};

const SKYEMERIT_RULES = [
  {code:'SKYEMERIT-FIRST-23', title:'First-Time Spark', rate_bps:2300, floor_cents:0, cap_cents:670000, min_transaction_cents:1, max_transaction_cents:670000},
  {code:'SKYEMERIT-FIRST-28', title:'First-Time Lift', rate_bps:2800, floor_cents:0, cap_cents:940000, min_transaction_cents:670001, max_transaction_cents:940000},
  {code:'SKYEMERIT-FIRST-31', title:'First-Time SkyeLine', rate_bps:3100, floor_cents:0, cap_cents:940000, min_transaction_cents:940001, max_transaction_cents:null},
  {code:'SKYEMERIT-SKYELINE-22', title:'SkyeLine Guard 22', rate_bps:2200, floor_cents:300000, cap_cents:1000000, min_transaction_cents:300001, max_transaction_cents:null}
];

const ROUTE_HEALTH = [
  {id:'signup', route:'/api/saas/signup', auth:'shared FS27/SkyGate/Free99 gate', storage:'SAAS_KV or SITE_EVENTS_KV'},
  {id:'workspace', route:'/api/saas/workspaces', auth:'shared FS27/SkyGate/Free99 gate', storage:'SAAS_KV or SITE_EVENTS_KV'},
  {id:'customer-command', route:'/api/saas/customer-command', auth:'shared FS27/SkyGate/Free99 gate', storage:'SAAS_KV or SITE_EVENTS_KV + 0S Command Bridge'},
  {id:'customer-visuals', route:'/api/saas/customer-visuals', auth:'shared FS27/SkyGate/Free99 gate', storage:'SAAS_KV or SITE_EVENTS_KV'},
  {id:'skymail-status', route:'/api/saas/skymail/status', auth:'shared FS27/SkyGate/Free99 gate', storage:'SkyeMail service summary when configured'},
  {id:'key-card', route:'/api/saas/key-card', auth:'shared FS27/SkyGate/Free99 gate', storage:'SAAS_KV or SITE_EVENTS_KV'}
];

function cleanText(value = '', max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanId(value = '', fallback = 'item', max = 120) {
  const cleaned = cleanText(value, max).replace(/[^A-Za-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

function cleanEmail(value = '') {
  return cleanText(value, 254).toLowerCase();
}

function slugify(value = '', fallback = 'customer-workspace') {
  return cleanText(value || fallback, 100).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function now() {
  return new Date().toISOString();
}

function id(prefix = 'saas') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function shortHash(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 8);
}

function reply(deps, data, status = 200) {
  if (typeof deps.json === 'function') return deps.json(data, status);
  return Response.json(data, {status});
}

async function bodyJson(deps, request) {
  if (typeof deps.readJson === 'function') return deps.readJson(request);
  try { return await request.json(); } catch { return {}; }
}

function saasStore(env) {
  return env.SAAS_KV || env.SITE_EVENTS_KV || env.ZERO_OS_AUTOMATION_KV || env.AUTOMATION_KV || null;
}

function storageName(env) {
  if (env.SAAS_KV) return 'SAAS_KV';
  if (env.SITE_EVENTS_KV) return 'SITE_EVENTS_KV';
  if (env.ZERO_OS_AUTOMATION_KV) return 'ZERO_OS_AUTOMATION_KV';
  if (env.AUTOMATION_KV) return 'AUTOMATION_KV';
  return 'unavailable';
}

async function kvGet(kv, key, fallback = null) {
  if (!kv?.get) return fallback;
  const data = await kv.get(key, {type:'json'}).catch(() => null);
  return data ?? fallback;
}

async function kvPut(kv, key, value, ttl = SAAS_EVENT_TTL) {
  if (!kv?.put) return {ok:false, stored:false, error:'saas_storage_not_configured'};
  await kv.put(key, JSON.stringify(value), {expirationTtl:ttl});
  return {ok:true, stored:true, key};
}

async function kvList(kv, prefix, limit = 100) {
  if (!kv?.list) return [];
  const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 100));
  const listed = await kv.list({prefix, limit:safeLimit}).catch(() => ({keys:[]}));
  const rows = await Promise.all((listed.keys || []).map(async (key) => {
    const item = await kvGet(kv, key.name, null);
    return item ? {...item, kv_key:key.name} : null;
  }));
  return rows
    .filter(Boolean)
    .sort((a, b) => String(b.created_at || b.updated_at || b.event_ts || '').localeCompare(String(a.created_at || a.updated_at || a.event_ts || '')))
    .slice(0, safeLimit);
}

function actorFromAuth(auth = {}) {
  return cleanText(auth.actor || auth.identity?.email || auth.gate?.data?.email || auth.gate?.data?.username || auth.gate?.data?.sub || 'shared-gate-user', 180);
}

function planFor(planId) {
  return PLAN_CATALOG[cleanId(planId, 'starter-command')] || PLAN_CATALOG['starter-command'];
}

function identityFromInput(input = {}, auth = {}) {
  const ownerEmail = cleanEmail(input.email || input.customer_email || input.billing_email || input.approval_email || auth.identity?.email || '');
  const companyName = cleanText(input.company_name || input.company || input.brand_name || input.client || ownerEmail.split('@')[0] || 'Customer Workspace', 180);
  const workspaceSlug = slugify(input.workspace_slug || input.client_slug || companyName);
  const planId = cleanId(input.plan || input.plan_id || 'starter-command', 'starter-command');
  const suffix = shortHash(`${workspaceSlug}:${ownerEmail}:${planId}`);
  const workspaceId = cleanId(input.workspace_id || input.workspace || input.id || `ws_${workspaceSlug}_${suffix}`, `ws_${suffix}`, 180);
  const customerId = cleanId(input.customer_id || `cust_${workspaceSlug}_${suffix}`, `cust_${suffix}`, 180);
  return {
    customer_id: customerId,
    workspace_id: workspaceId,
    workspace_slug: workspaceSlug,
    company_name: companyName,
    owner_email: ownerEmail,
    plan_id: planId,
    gate_username: ownerEmail,
    requested_skyemail: cleanEmail(input.skyemail || input.skyemail_alias || input.mailbox_email || input.email || ''),
    generated_at: now()
  };
}

function workspaceKeys(workspaceId, slug = '') {
  return {
    byId: `saas:workspace:${cleanId(workspaceId, 'workspace')}`,
    bySlug: `saas:workspace-slug:${slugify(slug || workspaceId)}`
  };
}

async function loadWorkspace(kv, workspaceIdOrSlug = '') {
  const keyId = cleanId(workspaceIdOrSlug, '');
  if (!keyId) return null;
  const direct = await kvGet(kv, `saas:workspace:${keyId}`, null);
  if (direct) return direct;
  const slug = slugify(workspaceIdOrSlug);
  const bySlug = await kvGet(kv, `saas:workspace-slug:${slug}`, null);
  if (bySlug?.workspace_id) return kvGet(kv, `saas:workspace:${bySlug.workspace_id}`, null);
  return null;
}

async function saveWorkspace(kv, workspace) {
  const keys = workspaceKeys(workspace.workspace_id, workspace.workspace_slug);
  const primary = await kvPut(kv, keys.byId, workspace);
  if (!primary.ok) return primary;
  await kvPut(kv, keys.bySlug, {workspace_id:workspace.workspace_id, workspace_slug:workspace.workspace_slug, updated_at:workspace.updated_at});
  return primary;
}

function buildKeyCard(workspace, env) {
  const mailbox = cleanEmail(workspace.skyemail?.mailbox_email || workspace.identity?.requested_skyemail || '');
  return {
    id:`key_card_${workspace.workspace_id}`,
    type:'saas.skyemail.key_card',
    workspace_id:workspace.workspace_id,
    workspace_slug:workspace.workspace_slug,
    company_name:workspace.company_name,
    mailbox_email:mailbox,
    status:mailbox ? 'mailbox_pointer_recorded_provider_status_required' : 'mailbox_not_requested',
    gate:'FS27/SkyGate/Free99',
    credential_storage:'no_mail_password_stored_in_saas',
    citadel_backup_target:Boolean(env.CITADELDB || env.CITADEL_DB || env.CITADELDB_WORKER || env.CITADELDB_ORIGIN),
    skymail_service_configured:Boolean(env.SKYEMAIL_PLATFORM_WORKER || env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN || env.SKYEMAIL_SERVICE_TOKEN),
    updated_at:now()
  };
}

function skyePayUrl(planId = 'starter-command', client = 'metraiyux-0s') {
  const offers = {
    'starter-command':'metraiyux-starter-command',
    'growth-cabinet':'metraiyux-growth-cabinet',
    'routex-workforce-command':'metraiyux-routex-workforce-command',
    'autonomous-office':'metraiyux-autonomous-office',
    'enterprise-command':'metraiyux-enterprise-command'
  };
  const url = new URL('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html');
  url.searchParams.set('client', client || 'metraiyux-0s');
  url.searchParams.set('offer', offers[planId] || offers['starter-command']);
  url.searchParams.set('skyemerit_code', 'SKYEMERIT-FIRST-BEST');
  return url.toString();
}

function calculateSkyeMerit(rule, subtotalCents) {
  const max = rule.max_transaction_cents == null ? null : Number(rule.max_transaction_cents);
  const applies = subtotalCents >= Number(rule.min_transaction_cents || 0) && (max == null || subtotalCents <= max);
  const eligible = applies ? Math.max(0, Math.min(subtotalCents, Number(rule.cap_cents || 0)) - Number(rule.floor_cents || 0)) : 0;
  const discount = Math.round(eligible * Number(rule.rate_bps || 0) / 10000);
  return {
    code:rule.code,
    title:rule.title,
    rate_bps:rule.rate_bps,
    applies,
    eligible_cents:eligible,
    discount_cents:discount,
    payable_cents:Math.max(0, subtotalCents - discount)
  };
}

function selectSkyeMerit(code = 'SKYEMERIT-FIRST-BEST', subtotalCents = 0) {
  const candidates = code === 'SKYEMERIT-FIRST-BEST'
    ? SKYEMERIT_RULES.slice(0, 3)
    : SKYEMERIT_RULES.filter((rule) => rule.code === code);
  return (candidates.length ? candidates : SKYEMERIT_RULES.slice(0, 3))
    .map((rule) => calculateSkyeMerit(rule, subtotalCents))
    .sort((a, b) => b.discount_cents - a.discount_cents)[0];
}

async function appendSaasEvent(env, deps, event = {}) {
  const kv = saasStore(env);
  const createdAt = cleanText(event.created_at || now(), 80);
  const eventId = cleanId(event.id || id('saas_evt'), 'saas_evt');
  const workspaceId = cleanId(event.workspace_id || event.entity_id || 'platform', 'platform');
  const normalized = {
    id:eventId,
    schema:'metraiyux.0s.saas.event.v1',
    source_app:'saas',
    lane:event.lane || 'saas',
    type:event.type || event.event_type || 'saas.event',
    event_type:event.event_type || event.type || 'saas.event',
    workspace_id:workspaceId,
    status:event.status || 'recorded',
    actor:event.actor || actorFromAuth(deps.auth),
    summary:cleanText(event.summary || event.message || event.type || 'SaaS event', 500),
    metadata:event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
    created_at:createdAt,
    event_ts:createdAt
  };
  const key = `saas:event:${workspaceId}:${createdAt}:${eventId}`;
  const stored = await kvPut(kv, key, normalized);
  if (typeof deps.commandBridgeAppendEvent === 'function') {
    await deps.commandBridgeAppendEvent(env, {
      id:eventId,
      type:normalized.type,
      event_type:normalized.event_type,
      source_app:'saas',
      source_surface:normalized.lane,
      lane:normalized.lane,
      status:normalized.status,
      summary:normalized.summary,
      actor:normalized.actor,
      entity:{kind:'workspace', id:workspaceId, label:event.company_name || ''},
      ids:{workspace_id:workspaceId, customer_id:event.customer_id || ''},
      metadata:normalized.metadata
    }, deps.auth || {}).catch(() => null);
  }
  return {...stored, event:normalized};
}

async function liveSkyMailStatus(env, deps, workspace, mailboxOverride = '') {
  const mailboxEmail = cleanEmail(mailboxOverride || workspace?.skyemail?.mailbox_email || workspace?.identity?.requested_skyemail || '');
  const serviceToken = typeof deps.founderSkyEmailServiceToken === 'function'
    ? cleanText(deps.founderSkyEmailServiceToken(env), 3000)
    : cleanText(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN || env.SKYEMAIL_SERVICE_TOKEN || '', 3000);
  const base = {
    ok:false,
    workspace_id:workspace?.workspace_id || '',
    mailbox_email:mailboxEmail,
    service_configured:Boolean(serviceToken || env.SKYEMAIL_PLATFORM_WORKER),
    status:mailboxEmail ? 'provider_status_unverified' : 'mailbox_not_requested',
    provider_call_made:false,
    updated_at:now()
  };
  if (!serviceToken || typeof deps.founderSkyEmailServiceSummary !== 'function') {
    return {...base, error:serviceToken ? 'skymail_summary_helper_unavailable' : 'skymail_service_token_not_configured'};
  }
  const params = new URLSearchParams();
  if (workspace?.workspace_id) params.set('workspace_id', workspace.workspace_id);
  if (workspace?.workspace_slug) params.set('workspace_slug', workspace.workspace_slug);
  if (mailboxEmail) {
    params.set('email', mailboxEmail);
    params.set('mailbox_email', mailboxEmail);
  }
  const summary = await deps.founderSkyEmailServiceSummary(env, params, serviceToken).catch((error) => ({
    ok:false,
    data:{error:error?.message || String(error)}
  }));
  if (!summary.ok) {
    return {
      ...base,
      error:summary.data?.error || 'skymail_summary_unavailable',
      route:summary.route || ''
    };
  }
  const data = summary.data || {};
  const mailbox = data.mailbox || data.workspace_mailbox || data.summary?.mailbox || {};
  const counts = data.counts || data.summary?.counts || data.mailbox_counts || {};
  return {
    ok:true,
    workspace_id:workspace?.workspace_id || data.workspace_id || '',
    mailbox_email:cleanEmail(mailbox.mailbox_email || mailbox.email || data.mailbox_email || mailboxEmail),
    provider:mailbox.provider || data.provider || 'skymail',
    status:mailbox.provisioning_status || mailbox.status || data.status || 'live_summary_returned',
    provisioning_status:mailbox.provisioning_status || data.provisioning_status || '',
    aliases:data.aliases || mailbox.aliases || [],
    counts,
    recent_messages:data.recent_messages || data.messages || [],
    route:summary.route || '',
    provider_call_made:true,
    service_configured:true,
    updated_at:now()
  };
}

function routeCommand(command = '') {
  const text = String(command || '').toLowerCase();
  if (/post|social|content|blog|marketing/.test(text)) return {primary:'marketing-brain', secondary:'qa-brain', approval_required:true};
  if (/hire|candidate|recruit|staff|worker/.test(text)) return {primary:'staffing-brain', secondary:'operations-brain', approval_required:true};
  if (/contract|legal|compliance|filing|claim/.test(text)) return {primary:'compliance-brain', secondary:'qa-brain', approval_required:true};
  if (/invoice|price|billing|payment/.test(text)) return {primary:'finance-brain', secondary:'operations-brain', approval_required:true};
  if (/lead|sale|proposal|close/.test(text)) return {primary:'revenue-brain', secondary:'client-success-brain', approval_required:false};
  if (/email|inbox|mail|reply|thread/.test(text)) return {primary:'skyemail-communications-brain', secondary:'client-success-brain', approval_required:false};
  return {primary:'site-operator-brain', secondary:'central-company-command-brain', approval_required:false};
}

function eventMix(events = []) {
  const counts = new Map();
  for (const event of events) counts.set(event.type || event.event_type || 'event', (counts.get(event.type || event.event_type || 'event') || 0) + 1);
  return [...counts.entries()].map(([label, value]) => ({label, value})).sort((a, b) => b.value - a.value);
}

function countByStatus(rows = []) {
  const counts = new Map();
  for (const row of rows) counts.set(row.status || 'recorded', (counts.get(row.status || 'recorded') || 0) + 1);
  return [...counts.entries()].map(([label, value]) => ({label, value, tone:label.includes('failed') || label.includes('error') ? 'danger' : 'mint'}));
}

async function buildVisuals(env, deps, workspace, url) {
  const kv = saasStore(env);
  const workspaceId = cleanId(workspace.workspace_id, 'workspace');
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50) || 50));
  const [commands, events, billings, skyemeritIssued] = await Promise.all([
    kvList(kv, `saas:command:${workspaceId}:`, limit),
    kvList(kv, `saas:event:${workspaceId}:`, limit),
    kvList(kv, `saas:billing:${workspaceId}:`, limit),
    kvList(kv, `saas:skyemerit:${workspaceId}:`, 25)
  ]);
  let bridgePayload = {ok:false, events:[], summary:{total:0, by_lane:{}, by_app:{}, money_cents:0}};
  if (typeof deps.commandBridgeEventsPayload === 'function') {
    const bridgeUrl = new URL('https://saas.local/api/0s-command-bridge/events');
    bridgeUrl.searchParams.set('entity', workspaceId);
    bridgeUrl.searchParams.set('limit', String(limit));
    bridgePayload = await deps.commandBridgeEventsPayload(env, bridgeUrl).catch(() => bridgePayload);
  }
  const skymail = await liveSkyMailStatus(env, deps, workspace);
  const plan = planFor(workspace.plan_id);
  const commandCount = commands.length;
  const eventCount = events.length + (bridgePayload.summary?.total || 0);
  const billableIntentCents = billings.reduce((sum, row) => sum + Number(row.amount_cents || row.total_cents || 0), 0);
  const messageCount = Number(skymail.counts?.messages || skymail.counts?.total || skymail.recent_messages?.length || 0) || 0;
  const progress = [
    {label:'Commands', used:commandCount, limit:plan.limits.commands, unit:'', status:'from customer-command receipts'},
    {label:'AI credits', used:Number(workspace.usage?.ai_credits_used || 0), limit:plan.limits.ai_credits, unit:'', status:'metered by FS27 gate when provider usage posts'},
    {label:'Vault storage', used:Number(workspace.usage?.vault_mb_used || 0), limit:plan.limits.vault_mb, unit:'mb', status:'workspace storage meter'},
    {label:'Mailboxes', used:skymail.mailbox_email ? 1 : 0, limit:plan.limits.mailboxes, unit:'', status:skymail.status}
  ];
  const timeline = [
    ...commands.map((row) => ({
      status:row.status || 'recorded',
      title:row.command || row.summary || 'Customer command',
      detail:`Route: ${row.route?.primary || 'site-operator-brain'}`,
      time:row.created_at
    })),
    ...events.map((row) => ({
      status:row.status || 'event',
      title:row.summary || row.type || 'SaaS event',
      detail:row.lane || row.type || '',
      time:row.created_at || row.event_ts
    })),
    ...bridgePayload.events.map((row) => ({
      status:row.status || 'bridge',
      title:row.summary || row.type || '0S Command Bridge event',
      detail:`${row.source_app || '0s'} / ${row.lane || 'lane'}`,
      time:row.created_at || row.event_ts
    }))
  ].sort((a, b) => String(b.time || '').localeCompare(String(a.time || ''))).slice(0, 30);
  return {
    ok:true,
    schema:'metraiyux.0s.saas.customer-visuals.v1',
    generated_at:now(),
    storage:storageName(env),
    workspace:{
      workspace_id:workspace.workspace_id,
      workspace_slug:workspace.workspace_slug,
      company_name:workspace.company_name,
      plan_id:workspace.plan_id,
      status:workspace.status,
      activation:workspace.activation || 'shared gate workspace record is live; provider actions require configured services'
    },
    kpis:[
      {label:'Commands', value:String(commandCount), detail:'stored customer-command receipts', tone:'cyan'},
      {label:'0S Events', value:String(eventCount), detail:'SaaS events plus Command Bridge entity events', tone:'mint'},
      {label:'SkyeMail', value:skymail.ok ? 'Live' : 'Pending', detail:skymail.mailbox_email || skymail.error || skymail.status, tone:skymail.ok ? 'mint' : 'gold'},
      {label:'Billing Intent', value:billableIntentCents ? `$${(billableIntentCents / 100).toLocaleString()}` : String(billings.length), detail:'stored checkout intent receipts', tone:'violet'},
      {label:'SkyeMerit', value:String(skyemeritIssued.length), detail:'issued through Worker storage', tone:'gold'},
      {label:'Mail Messages', value:String(messageCount), detail:skymail.ok ? 'from SkyeMail summary' : 'waiting on provider summary', tone:'cyan'}
    ],
    progress,
    bars:[
      {label:'Commands', value:commandCount, limit:Math.max(plan.limits.commands, 1), unit:''},
      {label:'0S events', value:eventCount, limit:Math.max(plan.limits.commands, 1), unit:''},
      {label:'Proof exports', value:Number(workspace.usage?.proof_exports || 0), limit:plan.limits.proof_exports, unit:''},
      {label:'Mail messages', value:messageCount, limit:Math.max(100, messageCount), unit:''}
    ],
    donut:countByStatus([...commands, ...events]),
    event_mix:eventMix([...events, ...bridgePayload.events]),
    timeline,
    sovereign_stack:[
      {label:'Shared gate', value:'FS27/SkyGate/Free99', status:'required'},
      {label:'SaaS storage', value:storageName(env), status:kv ? 'configured' : 'missing'},
      {label:'Command Bridge', value:env.SITE_EVENTS_KV ? 'SITE_EVENTS_KV' : 'unavailable', status:env.SITE_EVENTS_KV ? 'live' : 'missing'},
      {label:'SkyeMail', value:skymail.service_configured ? 'service configured' : 'service token missing', status:skymail.status},
      {label:'Citadel backup', value:(env.CITADELDB || env.CITADEL_DB || env.CITADELDB_WORKER || env.CITADELDB_ORIGIN) ? 'configured' : 'not configured on this Worker', status:'configuration-derived'},
      {label:'AI meter', value:'FS27 gate lane', status:'no outside AI call from SaaS adapter'}
    ],
    route_health:ROUTE_HEALTH.map((route) => ({...route, status:kv ? 'wired' : 'storage_missing', events:route.id === 'customer-command' ? commandCount : eventCount})),
    flows:[
      {id:'signup', label:'Signup receipts', screen:'signup.html', api:'/api/saas/signup', status:'Worker-backed', count:workspace.signup_id ? 1 : 0},
      {id:'workspace', label:'Workspace records', screen:'workspace-setup.html', api:'/api/saas/workspaces', status:'Worker-backed', count:1},
      {id:'command', label:'Customer commands', screen:'customer-dashboard.html', api:'/api/saas/customer-command', status:'Worker-backed', count:commandCount},
      {id:'skymail', label:'SkyeMail summary', screen:'customer-data.html', api:'/api/saas/skymail/status', status:skymail.status, count:skymail.ok ? 1 : 0}
    ],
    audit_events:[...events, ...commands].slice(0, 40).map((row) => ({
      status:row.status || 'recorded',
      action:row.type || row.event_type || row.command || 'event',
      route:row.route?.primary || row.api_route || row.lane || '',
      createdAt:row.created_at || row.event_ts,
      actor:row.actor || ''
    })),
    skymail
  };
}

async function handleCreateWorkspace(request, env, deps) {
  const kv = saasStore(env);
  const body = await bodyJson(deps, request);
  const identity = identityFromInput(body, deps.auth);
  const plan = planFor(identity.plan_id);
  const existing = await loadWorkspace(kv, identity.workspace_id);
  const createdAt = existing?.created_at || now();
  const mailboxEmail = cleanEmail(body.mailbox_email || body.skyemail || body.skyemail_alias || identity.requested_skyemail || '');
  const workspace = {
    schema:'metraiyux.0s.saas.workspace.v1',
    type:'customer_workspace',
    id:identity.workspace_id,
    workspace_id:identity.workspace_id,
    workspace_slug:identity.workspace_slug,
    customer_id:identity.customer_id,
    company_name:identity.company_name,
    owner_email:identity.owner_email,
    plan_id:plan.id,
    status:'workspace_recorded_live',
    activation:'shared_gate_workspace_live_storage',
    actor:actorFromAuth(deps.auth),
    identity,
    profile:body.profile || body.company_profile || {},
    services:Array.isArray(body.services) ? body.services : String(body.services || '').split(',').map((item) => cleanText(item, 100)).filter(Boolean),
    onboarding:body.onboarding || {},
    usage:existing?.usage || {ai_credits_used:0, vault_mb_used:0, proof_exports:0},
    limits:plan.limits,
    skyemail:{
      mailbox_email:mailboxEmail,
      status:mailboxEmail ? 'mailbox_requested_provider_confirmation_required' : 'not_requested',
      provider:'skymail',
      source:'saas_workspace_record'
    },
    modules:['skyemail','command-bridge','company-knowledge','skyeprofitconsole-free99','skyesplitengine-free99','skyemediacenter-free99','skydocxmax'],
    created_at:createdAt,
    updated_at:now()
  };
  const stored = await saveWorkspace(kv, workspace);
  if (!stored.ok) return reply(deps, {ok:false, error:stored.error, storage:storageName(env)}, 503);
  const keyCard = buildKeyCard(workspace, env);
  await kvPut(kv, `saas:key-card:${workspace.workspace_id}`, keyCard);
  await appendSaasEvent(env, deps, {
    id:id('workspace_evt'),
    type:'saas.workspace.recorded',
    lane:'saas-workspace',
    workspace_id:workspace.workspace_id,
    customer_id:workspace.customer_id,
    company_name:workspace.company_name,
    status:'recorded',
    summary:`Workspace recorded for ${workspace.company_name}`,
    metadata:{plan_id:workspace.plan_id, mailbox_requested:Boolean(mailboxEmail)}
  });
  return reply(deps, {
    ok:true,
    workspace,
    key_card:keyCard,
    storage:storageName(env),
    skymail_status:await liveSkyMailStatus(env, deps, workspace),
    next:{dashboard:`/saas/customer-dashboard.html?workspace=${encodeURIComponent(workspace.workspace_id)}`, visuals:`/saas/customer-data.html?workspace=${encodeURIComponent(workspace.workspace_id)}`}
  }, existing ? 200 : 201);
}

async function handleSignup(request, env, deps) {
  const kv = saasStore(env);
  const body = await bodyJson(deps, request);
  if (body.legal_acknowledgment !== true && body.legal_acknowledgment !== 'yes' && body.legal_acknowledgment !== 'true') {
    return reply(deps, {ok:false, error:'legal_acknowledgment_required'}, 400);
  }
  const identity = identityFromInput(body, deps.auth);
  const signup = {
    schema:'metraiyux.0s.saas.signup.v1',
    id:id('signup'),
    type:'signup_intent',
    status:'recorded_live',
    actor:actorFromAuth(deps.auth),
    identity,
    full_name:cleanText(body.full_name || body.name || '', 180),
    phone:cleanText(body.phone || '', 80),
    primary_need:cleanText(body.primary_need || '', 1000),
    legal_acknowledgment:true,
    created_at:now()
  };
  const stored = await kvPut(kv, `saas:signup:${identity.workspace_id}:${signup.created_at}:${signup.id}`, signup);
  if (!stored.ok) return reply(deps, {ok:false, error:stored.error, storage:storageName(env)}, 503);
  const skyemerit = {
    schema:'metraiyux.0s.saas.skyemerit.v1',
    id:id('skyemerit'),
    type:'skyemerit_pack',
    status:'issued_live',
    workspace_id:identity.workspace_id,
    email:identity.owner_email,
    pack_id:'SKYEMERIT-FIRST-PACK',
    selected:selectSkyeMerit('SKYEMERIT-FIRST-BEST', 0),
    credit_cents:600,
    gate_required:true,
    actor:actorFromAuth(deps.auth),
    created_at:now()
  };
  await kvPut(kv, `saas:skyemerit:${identity.workspace_id}:${skyemerit.created_at}:${skyemerit.id}`, skyemerit);
  await appendSaasEvent(env, deps, {
    type:'saas.signup.recorded',
    lane:'saas-signup',
    workspace_id:identity.workspace_id,
    customer_id:identity.customer_id,
    company_name:identity.company_name,
    status:'recorded',
    summary:`Signup intent recorded for ${identity.company_name}`
  });
  return reply(deps, {ok:true, signup, identity, skyemerit, storage:storageName(env)}, 201);
}

async function handleCustomerCommand(request, env, deps) {
  const kv = saasStore(env);
  const body = await bodyJson(deps, request);
  const workspaceId = cleanId(body.workspace_id || body.workspace || '', '');
  if (!workspaceId) return reply(deps, {ok:false, error:'workspace_id_required'}, 400);
  const workspace = await loadWorkspace(kv, workspaceId);
  if (!workspace) return reply(deps, {ok:false, error:'workspace_not_found', workspace_id:workspaceId}, 404);
  const createdAt = now();
  const command = {
    schema:'metraiyux.0s.saas.customer-command.v1',
    id:id('cmd'),
    type:'customer_workspace_command',
    workspace_id:workspace.workspace_id,
    customer_id:workspace.customer_id,
    company_name:workspace.company_name,
    command:cleanText(body.command || body.message || '', 2000),
    priority:cleanText(body.priority || 'normal', 40),
    status:'recorded_live',
    route:routeCommand(body.command || body.message || ''),
    actor:actorFromAuth(deps.auth),
    created_at:createdAt
  };
  const stored = await kvPut(kv, `saas:command:${workspace.workspace_id}:${createdAt}:${command.id}`, command);
  if (!stored.ok) return reply(deps, {ok:false, error:stored.error, storage:storageName(env)}, 503);
  await appendSaasEvent(env, deps, {
    id:command.id,
    type:'saas.customer_command.recorded',
    lane:'customer-command',
    workspace_id:workspace.workspace_id,
    customer_id:workspace.customer_id,
    company_name:workspace.company_name,
    status:command.status,
    summary:command.command || 'Customer command recorded',
    metadata:{priority:command.priority, route:command.route.primary}
  });
  if (typeof deps.mirrorSkygateEvent === 'function' && deps.ctx?.waitUntil) {
    deps.ctx.waitUntil(deps.mirrorSkygateEvent(env, {
      type:'saas.customer_command.recorded',
      lane:'customer-command',
      status:'recorded',
      resource_type:'workspace',
      resource_id:workspace.workspace_id,
      summary:command.command || 'Customer command recorded',
      meta:{command_id:command.id, route:command.route.primary}
    }, deps.auth?.gate || null).catch(() => null));
  }
  return reply(deps, {ok:true, command, storage:storageName(env)}, 201);
}

async function handleActionEvent(request, env, deps) {
  const body = await bodyJson(deps, request);
  const workspaceId = cleanId(body.workspace_id || body.workspace || body.entity_id || 'platform', 'platform');
  const saved = await appendSaasEvent(env, deps, {
    type:cleanText(body.type || body.action || 'saas.ui.action', 120),
    lane:cleanText(body.lane || body.surface || 'saas-ui', 120),
    workspace_id:workspaceId,
    status:cleanText(body.status || 'recorded', 80),
    summary:cleanText(body.summary || body.action || 'SaaS UI event', 500),
    metadata:body.metadata || body
  });
  return reply(deps, {ok:saved.ok, stored:saved.stored, event:saved.event, error:saved.error || '', storage:storageName(env)}, saved.ok ? 201 : 503);
}

async function handleBillingIntent(request, env, deps) {
  const kv = saasStore(env);
  const body = await bodyJson(deps, request);
  const workspaceId = cleanId(body.workspace_id || body.workspace || body.client_slug || 'metraiyux-0s', 'metraiyux-0s');
  const planId = cleanId(body.plan || body.plan_id || 'starter-command', 'starter-command');
  const subtotalCents = Math.max(0, Math.round(Number(body.subtotal_cents ?? body.amount_cents ?? 0) || 0));
  const merit = selectSkyeMerit(cleanText(body.skyemerit_code || 'SKYEMERIT-FIRST-BEST', 80), subtotalCents);
  const createdAt = now();
  const receipt = {
    schema:'metraiyux.0s.saas.billing-intent.v1',
    id:id('bill'),
    type:'skyepay_billing_intent',
    workspace_id:workspaceId,
    plan_id:planId,
    status:'checkout_intent_recorded_live',
    payment_provider:'skypay',
    provider_session_created:false,
    checkout_url:skyePayUrl(planId, body.client_slug || workspaceId),
    subtotal_cents:subtotalCents,
    skyemerit:merit,
    amount_cents:merit.payable_cents,
    billing_email:cleanEmail(body.billing_email || ''),
    actor:actorFromAuth(deps.auth),
    created_at:createdAt
  };
  const stored = await kvPut(kv, `saas:billing:${workspaceId}:${createdAt}:${receipt.id}`, receipt);
  if (!stored.ok) return reply(deps, {ok:false, error:stored.error, storage:storageName(env)}, 503);
  await appendSaasEvent(env, deps, {
    type:'saas.billing_intent.recorded',
    lane:'billing',
    workspace_id:workspaceId,
    status:'recorded',
    summary:`Billing intent recorded for ${planId}`,
    metadata:{billing_id:receipt.id, plan_id:planId, amount_cents:receipt.amount_cents}
  });
  return reply(deps, {ok:true, billing_intent:receipt, checkout_url:receipt.checkout_url, storage:storageName(env)}, 201);
}

async function handleSkyeMeritIssue(request, env, deps) {
  const kv = saasStore(env);
  const body = await bodyJson(deps, request);
  const workspaceId = cleanId(body.workspace_id || body.workspace || 'platform', 'platform');
  const subtotalCents = Math.max(0, Math.round(Number(body.subtotal_cents ?? Number(body.subtotal || 0) * 100) || 0));
  const selected = selectSkyeMerit(cleanText(body.code || 'SKYEMERIT-FIRST-BEST', 80), subtotalCents);
  const issued = {
    schema:'metraiyux.0s.saas.skyemerit.v1',
    id:id('skyemerit'),
    type:'skyemerit_pack',
    status:'issued_live',
    workspace_id:workspaceId,
    email:cleanEmail(body.email || body.customer_email || ''),
    pack_id:'SKYEMERIT-FIRST-PACK',
    selected,
    credit_cents:600,
    gate_required:true,
    actor:actorFromAuth(deps.auth),
    created_at:now()
  };
  const stored = await kvPut(kv, `saas:skyemerit:${workspaceId}:${issued.created_at}:${issued.id}`, issued);
  if (!stored.ok) return reply(deps, {ok:false, error:stored.error, storage:storageName(env)}, 503);
  await appendSaasEvent(env, deps, {
    type:'saas.skyemerit.issued',
    lane:'skyemerit',
    workspace_id:workspaceId,
    status:'issued',
    summary:`SkyeMerit pack issued for ${workspaceId}`,
    metadata:{skyemerit_id:issued.id, code:selected.code}
  });
  return reply(deps, {ok:true, skyemerit:issued, storage:storageName(env)}, 201);
}

export async function handleSaasSelfServeRoute(request, env, ctx, url, matchedBase = '/api/saas', mount = {}, deps = {}) {
  const localDeps = {...deps, ctx};
  if (request.method === 'OPTIONS') return reply(localDeps, {ok:true});
  const kv = saasStore(env);
  const suffix = url.pathname === matchedBase ? '/' : (url.pathname.slice(matchedBase.length) || '/');

  if (request.method === 'GET' && (suffix === '/' || suffix === '/status' || suffix === '/health')) {
    return reply(localDeps, {
      ok:true,
      schema:'metraiyux.0s.saas.status.v1',
      mode:'builtin_live_saas_adapter',
      app_id:mount.id || 'saas',
      mounted:true,
      storage:storageName(env),
      storage_configured:Boolean(kv),
      external_binding_configured:false,
      shared_gate:true,
      no_app_passwords:true,
      command_bridge:Boolean(env.SITE_EVENTS_KV),
      skymail_service_configured:Boolean(env.SKYEMAIL_PLATFORM_WORKER || env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN || env.SKYEMAIL_SERVICE_TOKEN),
      routes:ROUTE_HEALTH,
      updated_at:now()
    });
  }

  if (request.method === 'GET' && suffix === '/plans') {
    return reply(localDeps, {ok:true, plans:Object.values(PLAN_CATALOG), storage:storageName(env)});
  }

  if (request.method === 'GET' && suffix === '/sovereign-stack') {
    return reply(localDeps, {
      ok:true,
      stack:[
        {id:'gate', name:'FS27/SkyGate/Free99', status:'required'},
        {id:'saas-storage', name:'SaaS live storage', status:kv ? 'configured' : 'missing', binding:storageName(env)},
        {id:'command-bridge', name:'0S Command Bridge', status:env.SITE_EVENTS_KV ? 'configured' : 'missing'},
        {id:'skyemail', name:'SkyeMail', status:(env.SKYEMAIL_PLATFORM_WORKER || env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN || env.SKYEMAIL_SERVICE_TOKEN) ? 'configured' : 'pending_service_token'},
        {id:'citadel', name:'Citadel backup target', status:(env.CITADELDB || env.CITADEL_DB || env.CITADELDB_WORKER || env.CITADELDB_ORIGIN) ? 'configured' : 'not_configured_on_worker'}
      ]
    });
  }

  if (request.method === 'GET' && suffix === '/skyemerit/catalog') {
    return reply(localDeps, {ok:true, rules:SKYEMERIT_RULES, auto_code:'SKYEMERIT-FIRST-BEST'});
  }

  if (request.method === 'GET' && suffix === '/skyemerit/preview') {
    const subtotalCents = Math.max(0, Math.round(Number(url.searchParams.get('subtotal_cents') || Number(url.searchParams.get('subtotal') || 0) * 100) || 0));
    const code = cleanText(url.searchParams.get('code') || 'SKYEMERIT-FIRST-BEST', 80);
    return reply(localDeps, {ok:true, subtotal_cents:subtotalCents, selected:selectSkyeMerit(code, subtotalCents), rules:SKYEMERIT_RULES});
  }

  if (request.method === 'POST' && suffix === '/skyemerit/issue') return handleSkyeMeritIssue(request, env, localDeps);
  if (request.method === 'POST' && suffix === '/signup') return handleSignup(request, env, localDeps);
  if (request.method === 'POST' && suffix === '/workspaces') return handleCreateWorkspace(request, env, localDeps);
  if (request.method === 'POST' && suffix === '/customer-command') return handleCustomerCommand(request, env, localDeps);
  if (request.method === 'POST' && suffix === '/action-event') return handleActionEvent(request, env, localDeps);
  if (request.method === 'POST' && suffix === '/billing/checkout-session') return handleBillingIntent(request, env, localDeps);

  if (request.method === 'GET' && suffix === '/client-preview') {
    const client = cleanText(url.searchParams.get('client') || url.searchParams.get('workspace') || url.searchParams.get('workspace_id') || '', 160);
    if (!client) return reply(localDeps, {ok:false, error:'client_or_workspace_required'}, 400);
    const workspace = await loadWorkspace(kv, client);
    if (!workspace) return reply(localDeps, {ok:false, error:'workspace_not_found', client}, 404);
    return reply(localDeps, {ok:true, workspace, session:{workspace_id:workspace.workspace_id, workspace_slug:workspace.workspace_slug, client:workspace.company_name, email:workspace.owner_email, status:workspace.status, issued_at:now(), shared_gate:true}});
  }

  if (request.method === 'POST' && suffix === '/client-workspace/claim') {
    const body = await bodyJson(localDeps, request);
    const workspaceId = cleanId(body.workspace_id || body.workspace || body.client_id || '', '');
    if (!workspaceId) return reply(localDeps, {ok:false, error:'workspace_id_required'}, 400);
    const workspace = await loadWorkspace(kv, workspaceId);
    if (!workspace) return reply(localDeps, {ok:false, error:'workspace_not_found', workspace_id:workspaceId}, 404);
    const claim = {
      id:id('claim'),
      type:'saas.workspace.claim',
      status:'claimed_live',
      workspace_id:workspace.workspace_id,
      actor:actorFromAuth(localDeps.auth),
      created_at:now()
    };
    await kvPut(kv, `saas:claim:${workspace.workspace_id}:${claim.created_at}:${claim.id}`, claim);
    await appendSaasEvent(env, localDeps, {
      type:'saas.workspace.claimed',
      lane:'workspace-claim',
      workspace_id:workspace.workspace_id,
      status:'claimed',
      summary:`Workspace ${workspace.workspace_id} claimed through shared gate`,
      metadata:{claim_id:claim.id}
    });
    return reply(localDeps, {ok:true, claimed:true, claim, workspace});
  }

  if (request.method === 'GET' && suffix === '/customer-visuals') {
    const workspaceId = cleanId(url.searchParams.get('workspace_id') || url.searchParams.get('workspace') || '', '');
    if (!workspaceId) return reply(localDeps, {ok:false, error:'workspace_id_required'}, 400);
    const workspace = await loadWorkspace(kv, workspaceId);
    if (!workspace) return reply(localDeps, {ok:false, error:'workspace_not_found', workspace_id:workspaceId}, 404);
    return reply(localDeps, {ok:true, visuals:await buildVisuals(env, localDeps, workspace, url)});
  }

  if (request.method === 'GET' && suffix === '/skymail/status') {
    const workspaceId = cleanId(url.searchParams.get('workspace_id') || url.searchParams.get('workspace') || '', '');
    if (!workspaceId) return reply(localDeps, {ok:false, error:'workspace_id_required'}, 400);
    const workspace = await loadWorkspace(kv, workspaceId) || {workspace_id:workspaceId, workspace_slug:workspaceId, skyemail:{mailbox_email:cleanEmail(url.searchParams.get('email') || url.searchParams.get('mailbox_email') || '')}};
    const skymail = await liveSkyMailStatus(env, localDeps, workspace, url.searchParams.get('email') || url.searchParams.get('mailbox_email') || '');
    return reply(localDeps, {ok:true, skymail, workspace_id:workspace.workspace_id});
  }

  if (request.method === 'GET' && suffix === '/key-card') {
    const workspaceId = cleanId(url.searchParams.get('workspace_id') || url.searchParams.get('workspace') || '', '');
    if (!workspaceId) return reply(localDeps, {ok:false, error:'workspace_id_required'}, 400);
    const stored = await kvGet(kv, `saas:key-card:${workspaceId}`, null);
    if (stored) return reply(localDeps, {ok:true, key_card:stored});
    const workspace = await loadWorkspace(kv, workspaceId);
    if (!workspace) return reply(localDeps, {ok:false, error:'workspace_not_found', workspace_id:workspaceId}, 404);
    return reply(localDeps, {ok:true, key_card:buildKeyCard(workspace, env)});
  }

  if (request.method === 'GET' && suffix === '/workspace-stack') {
    const workspaceId = cleanId(url.searchParams.get('workspace_id') || url.searchParams.get('workspace') || '', '');
    if (!workspaceId) return reply(localDeps, {ok:false, error:'workspace_id_required'}, 400);
    const workspace = await loadWorkspace(kv, workspaceId);
    if (!workspace) return reply(localDeps, {ok:false, error:'workspace_not_found', workspace_id:workspaceId}, 404);
    const visuals = await buildVisuals(env, localDeps, workspace, url);
    return reply(localDeps, {ok:true, workspace, sovereign_stack:visuals.sovereign_stack, route_health:visuals.route_health});
  }

  if (request.method === 'GET' && suffix === '/ledger') {
    const workspaceId = cleanId(url.searchParams.get('workspace_id') || url.searchParams.get('workspace') || '', '');
    const limit = Math.max(1, Math.min(250, Number(url.searchParams.get('limit') || 100) || 100));
    const prefixes = workspaceId
      ? [`saas:command:${workspaceId}:`, `saas:event:${workspaceId}:`, `saas:billing:${workspaceId}:`, `saas:claim:${workspaceId}:`, `saas:skyemerit:${workspaceId}:`]
      : ['saas:workspace:', 'saas:signup:', 'saas:command:', 'saas:event:', 'saas:billing:', 'saas:claim:', 'saas:skyemerit:'];
    const rows = (await Promise.all(prefixes.map((prefix) => kvList(kv, prefix, limit)))).flat()
      .sort((a, b) => String(b.created_at || b.updated_at || b.event_ts || '').localeCompare(String(a.created_at || a.updated_at || a.event_ts || '')))
      .slice(0, limit);
    return reply(localDeps, {ok:true, storage:storageName(env), rows, count:rows.length});
  }

  if (suffix === '/client-login') {
    return reply(localDeps, {ok:false, error:'client_password_login_disabled_by_shared_gate', gate:'FS27/SkyGate/Free99'}, 410);
  }

  return reply(localDeps, {ok:false, error:'saas_route_not_found', path:url.pathname, routes:ROUTE_HEALTH.map((route) => route.route)}, 404);
}
