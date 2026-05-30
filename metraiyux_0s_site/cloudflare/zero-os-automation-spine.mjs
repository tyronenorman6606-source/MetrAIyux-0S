const PROVIDER_BASE = '/api/0s/providers';
const AUTOMATION_BASE = '/api/0s/automation';
const RECEIPT_PREFIX = '0s-provider-runtime:receipt:';
const RECEIPT_INDEX_KEY = '0s-provider-runtime:receipts:index';
const GRANT_PREFIX = '0s-provider-runtime:grant:';
const GRANT_INDEX_KEY = '0s-provider-runtime:grants:index';
const DEAD_PREFIX = '0s-provider-runtime:dead-letter:';
const DEAD_INDEX_KEY = '0s-provider-runtime:dead-letters:index';
const COMMAND_BRIDGE_PREFIX = '0s-command-bridge:event:';
const TTL_YEAR = 60 * 60 * 24 * 365;
const MAX_INDEX = 250;

const CLOSURE_TODO = Object.freeze([
  ['provider-registry', 'P0', 'One shared redacted provider registry for the whole 0S.'],
  ['provider-execution-spine', 'P0', 'Shared provider execution endpoint with receipts and no app-local auth.'],
  ['owner-approval-grants', 'P0', 'Scoped owner automation grants up to 72 hours.'],
  ['twilio-platform-runtime', 'P0', 'Twilio execution through the shared provider spine with consent and receipts.'],
  ['fs27-metering-chargeback', 'P0', 'Customer/workspace/client/app usage metadata on every provider action.'],
  ['retry-dead-letter', 'P0', 'Durable dead-letter and retry receipts.'],
  ['command-bridge-all-provider-events', 'P1', 'Provider actions mirrored into Command Bridge.'],
  ['app-lane-adoption', 'P1', 'All 0S app lanes call this runtime for external actions.'],
  ['smoke-and-stress', 'P0', 'Non-browser smoke and stress receipts.'],
  ['valuation-truth-refresh', 'P2', 'Truth/valuation refresh after receipts are green.']
]);

const CLOSURE_STATUS = Object.freeze({
  'provider-registry': 'implemented_smoked_stressed',
  'provider-execution-spine': 'core_provider_actions_implemented_smoked_stressed',
  'owner-approval-grants': 'implemented_smoked_stressed',
  'twilio-platform-runtime': 'sms_voice_and_status_implemented_smoked_stressed',
  'fs27-metering-chargeback': 'implemented_static_checked',
  'retry-dead-letter': 'implemented_smoked_stressed',
  'command-bridge-all-provider-events': 'implemented_smoked_stressed_for_provider_runtime',
  'app-lane-adoption': 'major_lanes_implemented_more_edges_remaining',
  'smoke-and-stress': 'implemented_smoked_stressed_for_current_runtime_slice',
  'valuation-truth-refresh': 'pending'
});

const PROVIDERS = Object.freeze([
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'communications',
    required: {
      account_sid: ['TWILIO_ACCOUNT_SID', 'SKYGATEFS13_TWILIO_ACCOUNT_SID'],
      auth_token: ['TWILIO_AUTH_TOKEN', 'SKYGATEFS13_TWILIO_AUTH_TOKEN'],
      from: ['TWILIO_FROM', 'TWILIO_FROM_NUMBER', 'TWILIO_PHONE_NUMBER', 'SKYGATEFS13_TWILIO_PHONE_NUMBER']
    },
    optional: {
      api_base: ['TWILIO_API_BASE'],
      default_to: ['TWILIO_DEFAULT_TO', 'TWILIO_TO_NUMBER', 'SKYEROUTEX_TWILIO_TO_NUMBER']
    },
    actions: ['twilio.sms.send', 'twilio.voice.call', 'twilio.message.status']
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'communications',
    required: {
      api_key: ['RESEND_API_KEY', 'BACKUP_RESEND_API_TOKEN', 'backup_resend_api_token', 'bacup_resend_api_token'],
      from: ['RESEND_FROM_EMAIL', 'RESEND_FROM', 'MAIL_FROM']
    },
    optional: { api_base: ['RESEND_API_BASE'], alert_to: ['OWNER_ALERT_EMAIL', 'RESEND_TO_EMAIL', 'ADMIN_NOTIFY_EMAIL'] },
    actions: ['resend.email.send', 'resend.domains.list']
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    required: { secret_key: ['STRIPE_SECRET_KEY', 'STRIPE_SECRET', 'STRIPE_SECRET_KEY_LIVE', 'SKYGATEFS13_STRIPE_SECRET_KEY'] },
    optional: { webhook_secret: ['STRIPE_WEBHOOK_SECRET'], api_base: ['STRIPE_API_BASE'] },
    actions: ['stripe.account.retrieve', 'stripe.balance.retrieve', 'stripe.checkout.create', 'stripe.checkout.retrieve', 'stripe.webhook.lifecycle', 'stripe.refund.create', 'stripe.refund.retrieve', 'stripe.refund.review', 'stripe.dispute.evidence.submit', 'stripe.payment_intent.create', 'stripe.payment_intent.retrieve', 'stripe.payment_intent.capture', 'stripe.terminal.reader.process_payment_intent']
  },
  {
    id: 'paypal',
    name: 'PayPal',
    category: 'payments',
    required: { client_id: ['PAYPAL_CLIENT_ID'], client_secret: ['PAYPAL_CLIENT_SECRET'] },
    optional: { webhook_id: ['PAYPAL_WEBHOOK_ID'], api_base: ['PAYPAL_ENDPOINT_BASE', 'PAYPAL_API_BASE'] },
    actions: ['paypal.identity.userinfo', 'paypal.checkout.order.create', 'paypal.refund.create', 'paypal.dispute.evidence.submit', 'paypal.webhook.verify']
  },
  {
    id: 'ups',
    name: 'UPS',
    category: 'shipping',
    required: { client_id: ['UPS_CLIENT_ID'], client_secret: ['UPS_CLIENT_SECRET'], account_number: ['UPS_ACCOUNT_NUMBER'] },
    optional: { api_base: ['UPS_ENDPOINT_BASE', 'UPS_API_BASE'] },
    actions: ['ups.account.health', 'ups.shipment.create', 'ups.rate.quote']
  },
  {
    id: 'google_merchant',
    name: 'Google Merchant Center',
    category: 'commerce-channel',
    required: { access_token: ['GOOGLE_MERCHANT_ACCESS_TOKEN'], merchant_id: ['GOOGLE_MERCHANT_ID'] },
    optional: { api_base: ['GOOGLE_MERCHANT_API_BASE'] },
    actions: ['google_merchant.authinfo.get', 'google_merchant.products.batch']
  },
  {
    id: 'meta_catalog',
    name: 'Meta Catalog',
    category: 'commerce-channel',
    required: { access_token: ['META_CATALOG_ACCESS_TOKEN'], catalog_id: ['META_CATALOG_ID'] },
    optional: { api_base: ['META_CATALOG_API_BASE'] },
    actions: ['meta_catalog.catalog.get', 'meta_catalog.products.batch']
  },
  {
    id: 'tiktok_catalog',
    name: 'TikTok Catalog',
    category: 'commerce-channel',
    required: { access_token: ['TIKTOK_CATALOG_ACCESS_TOKEN'], catalog_id: ['TIKTOK_CATALOG_ID'] },
    optional: { api_base: ['TIKTOK_CATALOG_API_BASE'] },
    actions: ['tiktok_catalog.catalog.get', 'tiktok_catalog.products.upload']
  },
  {
    id: 'mapbox',
    name: 'Mapbox',
    category: 'route-intelligence',
    required: { token: ['MAPBOX_ACCESS_TOKEN', 'MAPBOX_API_KEY', 'mapbox_api_key', 'SKYEROUTEX_MAPBOX_ACCESS_TOKEN'] },
    optional: { api_base: ['MAPBOX_API_BASE'] },
    actions: ['mapbox.route.enrich', 'mapbox.geocode']
  },
  {
    id: 'cloudflare-r2',
    name: 'Cloudflare R2 / S3',
    category: 'storage',
    required: {
      account_id: ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID'],
      bucket: ['STORAGE_BUCKET', 'CLOUDFLARE_R2_BUCKET', 'R2_BUCKET', 'S3_BUCKET'],
      access_key: ['STORAGE_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'S3_ACCESS_KEY'],
      secret_key: ['STORAGE_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY', 'S3_SECRET_KEY']
    },
    optional: { endpoint: ['STORAGE_ENDPOINT'], prefix: ['STORAGE_PREFIX'], region: ['STORAGE_REGION', 'R2_REGION', 'S3_REGION', 'AWS_REGION'] },
    actions: ['storage.object.put', 'storage.object.receipt']
  },
  {
    id: 'checkr',
    name: 'Checkr',
    category: 'compliance',
    required: { api_key: ['CHECKR_API_KEY'], package_id: ['CHECKR_PACKAGE', 'CHECKR_PACKAGE_ID'] },
    optional: { api_base: ['CHECKR_API_BASE'], webhook_secret: ['CHECKR_WEBHOOK_SECRET'] },
    actions: ['checkr.background_check.request']
  },
  {
    id: 'certn',
    name: 'Certn',
    category: 'compliance',
    required: { api_key: ['CERTN_API_KEY', 'CERTN_TOKEN'], owner_id: ['CERTN_OWNER_ID'] },
    optional: { api_base: ['CERTN_API_BASE'] },
    actions: ['certn.background_check.request']
  },
  {
    id: 'fs27-gateway',
    name: 'FS27/SkyGate Gateway',
    category: 'metering-auth',
    required: { origin: ['SKYGATEFS27_ORIGIN', 'SKYGATEFS27_WORKER_ORIGIN'] },
    optional: { mirror_secret: ['SKYGATE_EVENT_MIRROR_SECRET', 'SKYGATEFS27_EVENT_MIRROR_SECRET'] },
    actions: ['fs27.event.mirror', 'fs27.usage.meter']
  },
  {
    id: 'skymail',
    name: 'SkyeMail',
    category: 'communications',
    required: { api_url: ['SKYMAIL_API_URL', 'SKYMAIL_PUBLIC_URL', 'SKYEMAIL_API_URL'] },
    optional: { api_token: ['SKYMAIL_API_TOKEN', 'SKYEMAIL_API_TOKEN', 'SKYMAIL_SERVICE_TOKEN', 'SKYE_MAIL_SERVICE_TOKEN'] },
    actions: ['skymail.mailbox.provision', 'skymail.mailbox.status', 'skymail.mailbox.offboarding', 'skymail.thread.attach', 'skymail.system_message.send']
  },
  {
    id: 'relay13',
    name: 'Relay13 / ConnectLog',
    category: 'communications',
    required: { origin: ['RELAY13_WORKER_ORIGIN', 'RELAY13_ORIGIN'] },
    optional: { admin_token: ['RELAY13_PLATFORM_ADMIN_TOKEN', 'RELAY13_ADMIN_TOKEN'], api_key: ['RELAY13_API_KEY', 'CONNECTLOG_RELAY13_API_KEY'] },
    actions: ['relay13.conversation.create', 'relay13.message.send', 'relay13.thread.attach']
  },
  {
    id: 'skynet',
    name: 'SkyeNet Deploy Runtime',
    category: 'deployment',
    required: { receipts_kv: ['SKYENET_RECEIPTS_KV', 'SKYENET_DEPLOY_RECEIPTS_KV', 'ROUTING_KV', 'FS27_ROUTING_KV'] },
    optional: { asset_bucket: ['DEPLOYMENT_ASSET_BUCKET', 'DEPLOYMENT_ASSETS_BUCKET', 'ZERO_OS_DEPLOYMENT_BUCKET'] },
    actions: ['skynet.workspace.created', 'skynet.workspace.updated', 'skynet.deploy.init', 'skynet.deploy.upload', 'skynet.deploy.complete', 'skynet.deploy.route', 'skynet.source.transfer', 'skynet.env.upsert']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai-generation',
    required: { api_key: ['OPENAI_API_KEY'] },
    optional: { api_base: ['OPENAI_API_BASE', 'OPENAI_BASE_URL'] },
    actions: ['openai.image.generate', 'openai.chat.complete']
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'ai-generation',
    required: { api_key: ['ANTHROPIC_API_KEY'] },
    optional: { api_base: ['ANTHROPIC_API_BASE'], model: ['ANTHROPIC_MODEL'] },
    actions: ['anthropic.chat.complete']
  },
  {
    id: 'gemini',
    name: 'Gemini',
    category: 'ai-generation',
    required: { api_key: ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'] },
    optional: { api_base: ['GEMINI_API_BASE'], model: ['GEMINI_MODEL'], embedding_model: ['GEMINI_EMBEDDING_MODEL'] },
    actions: ['gemini.chat.complete', 'gemini.embedding.create']
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs Music',
    category: 'ai-generation',
    required: { api_key: ['ELEVENLABS_API_KEY_2', 'ELEVEN_LABS_API_KEY_2', 'ELEVENLABS_MUSIC_API_KEY_2', 'ELEVEN_API_KEY_2', 'eleven_labs_api_key_2', 'ELEVENLABS_API_KEY', 'ELEVENLABS_MUSIC_API_KEY', 'ELEVEN_API_KEY'] },
    optional: { music_generate_url: ['ELEVENLABS_MUSIC_GENERATE_URL'] },
    actions: ['elevenlabs.music.generate']
  },
  {
    id: 'stability',
    name: 'Stability AI Stable Audio',
    category: 'ai-generation',
    required: { api_key: ['STABILITY_API_KEY', 'STABILITY_API_KEY_2', 'STABILITYAI_API_KEY', 'STABILITYAI_API_KEY_2', 'STABILITY_AI_API_KEY', 'STABILITY_AI_API_KEY_2', 'STABILITY_KEY', 'STABILITY_KEY_2', 'Stability_api_key', 'Stability_api_key_2', 'stability_api_key', 'stability_api_key_2'] },
    optional: { audio_generate_url: ['STABILITY_AUDIO_GENERATE_URL', 'STABILITY_MUSIC_GENERATE_URL'] },
    actions: ['stability.audio.generate']
  },
  {
    id: 'fediverse',
    name: 'Mastodon/Pixelfed Fediverse',
    category: 'publishing',
    required: {},
    optional: {
      default_instance: ['FEDIVERSE_INSTANCE_URL', 'MASTODON_INSTANCE_URL', 'PIXELFED_INSTANCE_URL'],
      access_token: ['FEDIVERSE_ACCESS_TOKEN', 'MASTODON_ACCESS_TOKEN', 'PIXELFED_ACCESS_TOKEN']
    },
    actions: ['fediverse.media.upload', 'fediverse.status.publish', 'fediverse.feed.sync']
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    required: {
      calendar_id: ['FOUNDER_GOOGLE_CALENDAR_ID', 'GOOGLE_CALENDAR_ID', 'GOOGLE_CALENDARID', 'CALENDAR_ID'],
      client_email: ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_CALENDAR_CLIENT_EMAIL'],
      private_key: ['GOOGLE_PRIVATE_KEY', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'GOOGLE_CALENDAR_PRIVATE_KEY']
    },
    optional: { api_base: ['GOOGLE_CALENDAR_API_BASE'], token_url: ['GOOGLE_OAUTH_TOKEN_URL'], timezone: ['FOUNDER_CALENDAR_TIMEZONE', 'GOOGLE_CALENDAR_TIMEZONE', 'TZ'] },
    actions: ['google.calendar.event.create', 'google.calendar.events.list']
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare API',
    category: 'deploy-provider',
    required: { token: ['CLOUDFLARE_API_TOKEN', 'CF_API_TOKEN'] },
    optional: { api_base: ['CLOUDFLARE_API_BASE'], zone_id: ['CLOUDFLARE_ZONE_ID'] },
    actions: ['cloudflare.token.verify', 'cloudflare.custom_hostname.create', 'cloudflare.custom_hostname.status']
  },
  {
    id: 'dns',
    name: 'DNS over HTTPS',
    category: 'domain-verification',
    required: {},
    optional: { api_base: ['DNS_OVER_HTTPS_API_BASE'] },
    actions: ['dns.txt.lookup']
  },
  {
    id: 'semrush',
    name: 'SEMrush',
    category: 'search-data',
    required: { api_key: ['SEMRUSH_API_KEY'] },
    optional: { api_base: ['SEMRUSH_API_BASE'], database: ['SEMRUSH_DATABASE'] },
    actions: ['semrush.domain_organic.pull']
  },
  {
    id: 'google-search-console',
    name: 'Google Search Console',
    category: 'search-data',
    required: { access_token: ['GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN', 'GSC_ACCESS_TOKEN'] },
    optional: { api_base: ['GOOGLE_SEARCH_CONSOLE_API_BASE'] },
    actions: ['gsc.search_analytics.query']
  },
  {
    id: 'netlify',
    name: 'Netlify Deploy API',
    category: 'deployment',
    required: {
      auth_token: ['NETLIFY_AUTH_TOKEN', 'MUSIC_NEXUS_DROPS_NETLIFY_AUTH_TOKEN', 'SKYGATEFS13_NETLIFY_AUTH_TOKEN', 'SKYGATEFS13_TARGET_NETLIFY_AUTH_TOKEN'],
      site_id: ['NETLIFY_SITE_ID', 'MUSIC_NEXUS_DROPS_NETLIFY_SITE_ID', 'SKYGATEFS13_TARGET_NETLIFY_SITE_ID', 'SKYEVAULT_DROP_NETLIFY_SITE_ID']
    },
    optional: { api_base: ['NETLIFY_API_BASE'] },
    actions: ['netlify.deploy.create', 'netlify.deploy.get', 'netlify.deploy.file.upload']
  },
  {
    id: 'social-webhook',
    name: 'Social/Webhook Provider',
    category: 'publishing',
    required: { endpoint: ['SOCIAL_PUBLISH_WEBHOOK_ENDPOINT', 'CONTENT_PROVIDER_WEBHOOK_ENDPOINT'] },
    optional: { secret: ['SOCIAL_PUBLISH_WEBHOOK_SECRET', 'CONTENT_PROVIDER_WEBHOOK_SECRET'] },
    actions: ['social.post.publish', 'content.dispatch']
  },
  {
    id: 'commerce-http',
    name: 'Commerce HTTP Dispatch',
    category: 'commerce-automation',
    required: {},
    optional: { default_secret: ['COMMERCE_HTTP_SIGNING_SECRET'], routex_url: ['ROUTEX_INGEST_URL'], routex_token: ['ROUTEX_INGEST_TOKEN'] },
    actions: ['commerce.signed_json.post', 'commerce.routex.handoff', 'commerce.webhook.deliver', 'commerce.url.fetch_html', 'shopify.graphql.import']
  }
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session,x-0s-gate-session'
    }
  });
}

function clean(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  const random = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}

function store(env) {
  return env.ZERO_OS_AUTOMATION_KV || env.AUTOMATION_KV || env.SITE_EVENTS_KV || null;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function firstEnv(env, names) {
  for (const name of names || []) {
    const value = env?.[name];
    if (String(value || '').trim()) return String(value).trim();
  }
  return '';
}

function envGroupStatus(env, aliases) {
  const hit = (aliases || []).find((name) => String(env?.[name] || '').trim());
  return { configured: Boolean(hit), source: hit || null, aliases };
}

function providerStatus(env, def) {
  const required = Object.fromEntries(Object.entries(def.required || {}).map(([key, aliases]) => [key, envGroupStatus(env, aliases)]));
  const optional = Object.fromEntries(Object.entries(def.optional || {}).map(([key, aliases]) => [key, envGroupStatus(env, aliases)]));
  const missing = Object.entries(required).filter(([, value]) => !value.configured).map(([key]) => key);
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    configured: missing.length === 0,
    missing,
    required_env: Object.fromEntries(Object.entries(required).map(([key, value]) => [key, { configured: value.configured, aliases: value.aliases }])),
    optional_env: Object.fromEntries(Object.entries(optional).map(([key, value]) => [key, { configured: value.configured, aliases: value.aliases }])),
    actions: def.actions
  };
}

function providerCatalog(env) {
  const providers = PROVIDERS.map((def) => providerStatus(env, def));
  return {
    ok: true,
    schema: 'metraiyux.0s.provider-registry.v1',
    generated_at: now(),
    owner_runtime_rule: 'Provider runtime belongs to the whole 0S; Founder Command is only the owner cockpit.',
    execution_semantics: {
      executed_true: 'The runtime sets executed:true only for a completed sandbox receipt, a completed internal receipt executor run, or a real provider/backend response.',
      external_provider_call: 'provider_call_made:true is the only receipt claim that a live external provider boundary was crossed.',
      sandbox_receipts: 'sandbox:true receipts prove routing, consent, grants, mirrors, storage, and payload shaping without sending to the external provider.'
    },
    storage: store(env)?.put ? 'kv' : 'unavailable',
    providers,
    summary: {
      total: providers.length,
      configured: providers.filter((item) => item.configured).length,
      missing: providers.filter((item) => !item.configured).length
    }
  };
}

function providerDef(idOrAction) {
  const providerId = clean(idOrAction, 80).split('.')[0];
  return PROVIDERS.find((item) => item.id === providerId || item.actions.includes(clean(idOrAction, 120))) || null;
}

async function kvGet(key, env) {
  const kv = store(env);
  if (!kv?.get) return null;
  return kv.get(key, { type: 'json' }).catch(async () => {
    const raw = await kv.get(key).catch(() => null);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
}

async function kvPut(key, value, env, ttl = TTL_YEAR) {
  const kv = store(env);
  if (!kv?.put) return false;
  await kv.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined);
  return true;
}

async function readIndex(env, key) {
  const value = await kvGet(key, env);
  return Array.isArray(value) ? value : [];
}

async function pushIndex(env, key, item) {
  const current = await readIndex(env, key);
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, MAX_INDEX);
  await kvPut(key, next, env);
  return next;
}

function listParam(url, name, fallback = '') {
  const value = url.searchParams.get(name);
  return value == null ? fallback : value;
}

function normalizeList(value) {
  if (value === '*' || value === 'all') return ['*'];
  if (Array.isArray(value)) return value.map((item) => clean(item, 120)).filter(Boolean);
  return String(value || '').split(',').map((item) => clean(item, 120)).filter(Boolean);
}

function includesScope(list, value) {
  const cleanValue = clean(value, 120);
  return !list?.length || list.includes('*') || !cleanValue || list.includes(cleanValue);
}

function actor(auth = {}) {
  return clean(auth.actor || auth.identity?.email || auth.gate?.data?.email || auth.gate?.data?.username || auth.gate?.data?.sub || '0s-gate-actor', 240);
}

function makeGrant(body = {}, auth = {}) {
  const durationHours = Math.max(0.05, Math.min(72, Number(body.duration_hours ?? body.durationHours ?? 24) || 24));
  const createdAt = now();
  const expiresAt = body.expires_at
    ? new Date(Math.min(new Date(body.expires_at).getTime(), Date.now() + 72 * 60 * 60 * 1000)).toISOString()
    : new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  return {
    id: clean(body.id, 140) || id('auto_grant'),
    schema: 'metraiyux.0s.automation-grant.v1',
    status: 'active',
    actor: actor(auth),
    created_at: createdAt,
    expires_at: expiresAt,
    duration_hours: durationHours,
    allow_live: body.allow_live !== false,
    providers: normalizeList(body.providers || body.provider_ids || body.provider_id || '*'),
    actions: normalizeList(body.actions || body.action || '*'),
    app_ids: normalizeList(body.app_ids || body.app_id || '*'),
    workspace_ids: normalizeList(body.workspace_ids || body.workspace_id || '*'),
    customer_ids: normalizeList(body.customer_ids || body.customer_id || '*'),
    client_ids: normalizeList(body.client_ids || body.client_id || '*'),
    max_actions: Math.max(1, Math.min(10000, Number(body.max_actions || 100) || 100)),
    max_cost_cents: Math.max(0, Math.min(10000000, Number(body.max_cost_cents ?? body.maxCostCents ?? 0) || 0)),
    used_actions: 0,
    used_cost_cents: 0,
    note: clean(body.note || body.reason || 'Owner-approved 0S automation grant.', 1000),
    revoked_at: null
  };
}

function grantActive(grant) {
  return Boolean(grant && grant.status === 'active' && !grant.revoked_at && new Date(grant.expires_at).getTime() > Date.now());
}

function grantAllows(grant, request) {
  if (!grantActive(grant)) return { ok: false, error: 'automation_grant_inactive_or_expired' };
  if (!grant.allow_live && request.live) return { ok: false, error: 'automation_grant_live_execution_disabled' };
  if (!includesScope(grant.providers, request.provider_id)) return { ok: false, error: 'automation_grant_provider_scope_denied' };
  if (!includesScope(grant.actions, request.action)) return { ok: false, error: 'automation_grant_action_scope_denied' };
  if (!includesScope(grant.app_ids, request.app_id)) return { ok: false, error: 'automation_grant_app_scope_denied' };
  if (!includesScope(grant.workspace_ids, request.workspace_id)) return { ok: false, error: 'automation_grant_workspace_scope_denied' };
  if (!includesScope(grant.customer_ids, request.customer_id)) return { ok: false, error: 'automation_grant_customer_scope_denied' };
  if (!includesScope(grant.client_ids, request.client_id)) return { ok: false, error: 'automation_grant_client_scope_denied' };
  if ((Number(grant.used_actions || 0) + 1) > Number(grant.max_actions || 0)) return { ok: false, error: 'automation_grant_action_cap_exceeded' };
  const nextCost = Number(grant.used_cost_cents || 0) + Number(request.estimated_cost_cents || 0);
  if (grant.max_cost_cents > 0 && nextCost > grant.max_cost_cents) return { ok: false, error: 'automation_grant_cost_cap_exceeded' };
  return { ok: true };
}

async function updateGrantUsage(env, grantId, receipt) {
  if (!grantId) return null;
  const grant = await kvGet(`${GRANT_PREFIX}${grantId}`, env);
  if (!grant) return null;
  grant.used_actions = Number(grant.used_actions || 0) + 1;
  grant.used_cost_cents = Number(grant.used_cost_cents || 0) + Number(receipt.estimated_cost_cents || 0);
  grant.updated_at = now();
  await kvPut(`${GRANT_PREFIX}${grant.id}`, grant, env);
  await pushIndex(env, GRANT_INDEX_KEY, grant);
  return grant;
}

function estimateCostCents(env, providerId, action, payload = {}) {
  const explicit = Number(payload.cost_cents ?? payload.estimated_cost_cents);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  if (providerId === 'twilio' && action.includes('sms')) return Math.max(0, Number(env.TWILIO_SMS_BILL_CENTS || env.ZERO_OS_SMS_BILL_CENTS || 2) || 2);
  if (providerId === 'twilio' && action.includes('voice')) return Math.max(0, Number(env.TWILIO_VOICE_MINUTE_BILL_CENTS || env.ZERO_OS_VOICE_MINUTE_BILL_CENTS || 5) || 5);
  if (providerId === 'resend') return Math.max(0, Number(env.RESEND_EMAIL_BILL_CENTS || env.ZERO_OS_EMAIL_BILL_CENTS || 1) || 1);
  return Math.max(0, Number(env.ZERO_OS_PROVIDER_DEFAULT_BILL_CENTS || 0) || 0);
}

function normalizeExecution(body = {}, auth = {}) {
  const action = clean(body.action || body.type || body.provider_action || 'internal.receipt', 120);
  const inferredProvider = providerDef(action)?.id || clean(body.provider_id || body.provider || action.split('.')[0] || 'internal', 80);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  return {
    id: clean(body.id, 140) || id('provider_exec'),
    idempotency_key: clean(body.idempotency_key || body.idempotencyKey || '', 180),
    provider_id: clean(body.provider_id || body.provider || inferredProvider, 80),
    action,
    app_id: clean(body.app_id || body.app || body.source_app || 'metraiyux-0s', 100),
    workspace_id: clean(body.workspace_id || body.workspace || body.ws_id || '', 160),
    customer_id: clean(body.customer_id || body.customer || '', 160),
    client_id: clean(body.client_id || body.client || '', 160),
    usage_lane: clean(body.usage_lane || body.lane || action.replace(/[^a-z0-9._:-]+/gi, '-'), 100),
    live: body.live === true || body.mode === 'live',
    sandbox: body.sandbox === true || body.mode === 'sandbox' || body.execution_mode === 'sandbox_mock',
    approval_grant_id: clean(body.approval_grant_id || body.grant_id || body.automation_grant_id || '', 160),
    owner_approved: body.owner_approved === true || body.operator_approved === true || body.approved === true,
    retry_of: clean(body.retry_of || body.retryOf || '', 160),
    retry_attempt: Math.max(0, Number(body.retry_attempt || body.retryAttempt || 0) || 0),
    payload,
    consent: body.consent && typeof body.consent === 'object' ? body.consent : {},
    requested_by: actor(auth),
    created_at: now()
  };
}

function redactPhone(value) {
  const text = clean(value, 80);
  if (!text) return '';
  return text.length <= 4 ? '***' : `${text.slice(0, 2)}***${text.slice(-4)}`;
}

function publicProviderResult(data = {}) {
  const paymentIntent = typeof data.payment_intent === 'string'
    ? data.payment_intent
    : data.payment_intent?.id || data.payment_intent_id || '';
  return {
    id: clean(data.sid || data.id || data.message_id || data.provider_id || '', 180),
    status: clean(data.status || data.state || 'accepted', 80),
    object: clean(data.object || data.type || '', 80),
    url: clean(data.url || '', 500),
    payment_status: clean(data.payment_status || '', 80),
    payment_intent_id: clean(paymentIntent, 220),
    amount_total: Number(data.amount_total || data.amount || 0) || 0,
    amount_capturable: Number(data.amount_capturable || 0) || 0,
    amount_received: Number(data.amount_received || 0) || 0,
    currency: clean(data.currency || '', 20),
    client_reference_id: clean(data.client_reference_id || '', 220),
    capture_method: clean(data.capture_method || '', 80),
    livemode: data.livemode === true
  };
}

function basicAuth(user, pass) {
  const raw = `${user}:${pass}`;
  const encoded = typeof btoa === 'function' ? btoa(raw) : Buffer.from(raw).toString('base64');
  return `Basic ${encoded}`;
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  const chunk = 0x8000;
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  for (let index = 0; index < array.length; index += chunk) binary += String.fromCharCode(...array.subarray(index, index + chunk));
  return btoa(binary);
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeJson(value) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function base64ToBytes(value = '') {
  const text = String(value || '').includes(',') ? String(value || '').split(',').pop() : String(value || '');
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(text, 'base64'));
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function pemToPkcs8Bytes(pem) {
  return base64ToBytes(String(pem || '').replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, ''));
}

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256HexBytes(bytes) {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return hex(new Uint8Array(digest));
  }
  let hash = 2166136261;
  for (const byte of bytes || []) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  const seed = (hash >>> 0).toString(16).padStart(8, '0');
  return seed.repeat(8).slice(0, 64);
}

async function sha256Hex(text) {
  return sha256HexBytes(new TextEncoder().encode(String(text || '')));
}

async function hmacBytes(keyBytes, text) {
  if (globalThis.crypto?.subtle) {
    const key = await globalThis.crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(text || ''))));
  }
  const seed = await sha256Hex(`${Array.from(keyBytes || []).join(',')}:${text}`);
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(seed.slice((index * 2) % seed.length, ((index * 2) % seed.length) + 2).padEnd(2, '0'), 16) || 0;
  }
  return bytes;
}

async function hmacHex(keyBytes, text) {
  return hex(await hmacBytes(keyBytes, text));
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function encodePathPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQuery(searchParams) {
  return [...searchParams.entries()]
    .sort(([ak, av], [bk, bv]) => ak === bk ? av.localeCompare(bv) : ak.localeCompare(bk))
    .map(([key, value]) => `${encodePathPart(key)}=${encodePathPart(value)}`)
    .join('&');
}

async function s3SigningKey(secret, dateStamp, region) {
  const kDate = await hmacBytes(new TextEncoder().encode(`AWS4${secret}`), dateStamp);
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, 's3');
  return hmacBytes(kService, 'aws4_request');
}

async function signS3Request({ method, url, headers = {}, body = new Uint8Array(), accessKeyId, secretAccessKey, region }) {
  const target = new URL(url);
  const payloadHash = await sha256HexBytes(body);
  const amz = amzDate();
  const requestHeaders = { ...headers, host: target.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amz };
  const lowerMap = new Map(Object.entries(requestHeaders).map(([key, value]) => [key.toLowerCase(), String(value).trim().replace(/\s+/g, ' ')]));
  const names = [...lowerMap.keys()].sort();
  const canonicalHeaders = names.map((name) => `${name}:${lowerMap.get(name)}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalUri = target.pathname.split('/').map(encodePathPart).join('/').replace(/%2F/g, '/');
  const canonicalRequest = [method.toUpperCase(), canonicalUri || '/', canonicalQuery(target.searchParams), canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const dateStamp = amz.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amz, scope, await sha256Hex(canonicalRequest)].join('\n');
  const signature = await hmacHex(await s3SigningKey(secretAccessKey, dateStamp, region), stringToSign);
  return {
    ...requestHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function paramsFromObject(source = {}, allowed = null) {
  const params = new URLSearchParams();
  const allow = Array.isArray(allowed) && allowed.length ? new Set(allowed) : null;
  for (const [key, value] of Object.entries(source || {})) {
    if (allow && !allow.has(key)) continue;
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return params;
}

function appendStripeParam(params, key, value) {
  if (value === undefined || value === null || value === '') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendStripeParam(params, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) appendStripeParam(params, `${key}[${childKey}]`, childValue);
    return;
  }
  params.set(key, String(value));
}

function stripeParamsFromObject(source = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(source || {})) appendStripeParam(params, key, value);
  return params;
}

async function callTwilioSms(env, request) {
  const sid = firstEnv(env, PROVIDERS[0].required.account_sid);
  const token = firstEnv(env, PROVIDERS[0].required.auth_token);
  const from = firstEnv(env, PROVIDERS[0].required.from);
  const apiBase = firstEnv(env, PROVIDERS[0].optional.api_base) || 'https://api.twilio.com';
  const to = clean(request.payload.to || request.payload.phone || request.payload.recipient || firstEnv(env, PROVIDERS[0].optional.default_to), 80);
  const body = clean(request.payload.body || request.payload.message || request.payload.text || '', 1400);
  if (!to) return { ok: false, status: 400, error: 'twilio_recipient_required' };
  if (!body) return { ok: false, status: 400, error: 'twilio_message_required' };
  const consent = request.consent.sms_opt_in ?? request.consent.smsOptIn ?? request.payload.sms_opt_in ?? request.payload.smsOptIn;
  if (consent !== true) return { ok: false, status: 409, error: 'sms_consent_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `twilio_sandbox_${request.id}`, status: 'sandbox_executed', to: redactPhone(to), from: redactPhone(from || '+10000000000') } };
  }
  if (!sid || !token || !from) return { ok: false, status: 503, error: 'twilio_not_configured' };
  const account = encodeURIComponent(sid);
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/2010-04-01/Accounts/${account}/Messages.json`, {
    method: 'POST',
    headers: { authorization: basicAuth(sid, token), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'twilio_send_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callTwilioVoice(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'twilio');
  const sid = firstEnv(env, def.required.account_sid);
  const token = firstEnv(env, def.required.auth_token);
  const from = firstEnv(env, def.required.from);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.twilio.com';
  const to = clean(request.payload.to || request.payload.phone || request.payload.recipient || firstEnv(env, def.optional.default_to), 80);
  const url = clean(request.payload.url || request.payload.twiml_url || request.payload.voice_url || '', 1200);
  const twiml = clean(request.payload.twiml || '', 5000);
  if (!to) return { ok: false, status: 400, error: 'twilio_voice_recipient_required' };
  if (!url && !twiml) return { ok: false, status: 400, error: 'twilio_voice_url_or_twiml_required' };
  const consent = request.consent.voice_opt_in ?? request.consent.voiceOptIn ?? request.payload.voice_opt_in ?? request.payload.voiceOptIn;
  if (consent !== true) return { ok: false, status: 409, error: 'voice_consent_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `twilio_voice_sandbox_${request.id}`, status: 'sandbox_executed', to: redactPhone(to), from: redactPhone(from || '+10000000000') } };
  }
  if (!sid || !token || !from) return { ok: false, status: 503, error: 'twilio_not_configured' };
  const body = new URLSearchParams({ To: to, From: from });
  if (url) body.set('Url', url);
  if (twiml) body.set('Twiml', twiml);
  const account = encodeURIComponent(sid);
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/2010-04-01/Accounts/${account}/Calls.json`, {
    method: 'POST',
    headers: { authorization: basicAuth(sid, token), 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'twilio_voice_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callTwilioMessageStatus(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'twilio');
  const sid = firstEnv(env, def.required.account_sid);
  const token = firstEnv(env, def.required.auth_token);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.twilio.com';
  const messageSid = clean(request.payload.message_sid || request.payload.messageSid || request.payload.sid || request.payload.id || '', 220);
  if (!messageSid) return { ok: false, status: 400, error: 'twilio_message_sid_required' };
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: messageSid,
        status: clean(request.payload.status || 'delivered', 80),
        object: 'message',
        provider: 'twilio'
      }
    };
  }
  if (!sid || !token) return { ok: false, status: 503, error: 'twilio_not_configured' };
  const account = encodeURIComponent(sid);
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/2010-04-01/Accounts/${account}/Messages/${encodeURIComponent(messageSid)}.json`, {
    method: 'GET',
    headers: { authorization: basicAuth(sid, token) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'twilio_status_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callResendEmail(env, request) {
  const key = firstEnv(env, PROVIDERS[1].required.api_key);
  const from = firstEnv(env, PROVIDERS[1].required.from) || clean(request.payload.from || request.payload.fromEmail || '', 240);
  const apiBase = firstEnv(env, PROVIDERS[1].optional.api_base) || 'https://api.resend.com';
  const rawTo = request.payload.to || request.payload.email || '';
  const to = Array.isArray(rawTo) ? rawTo.map((item) => clean(item, 240)).filter(Boolean).slice(0, 25) : clean(rawTo, 240);
  const subject = clean(request.payload.subject || '0S notification', 240);
  const text = clean(request.payload.text || request.payload.body || request.payload.message || '', 5000);
  const html = clean(request.payload.html || '', 20000);
  if (!to || (Array.isArray(to) ? !to.some((item) => item.includes('@')) : !to.includes('@'))) return { ok: false, status: 400, error: 'email_recipient_required' };
  if (!text && !html) return { ok: false, status: 400, error: 'email_body_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `resend_sandbox_${request.id}`, status: 'sandbox_executed', to } };
  }
  if (!key || !from) return { ok: false, status: 503, error: 'resend_not_configured' };
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/emails`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, subject, ...(html ? { html } : { text }) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'resend_send_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callResendDomainsList(env, request) {
  const key = firstEnv(env, PROVIDERS[1].required.api_key);
  const apiBase = firstEnv(env, PROVIDERS[1].optional.api_base) || 'https://api.resend.com';
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `resend_domains_sandbox_${request.id}`,
        status: 'listed',
        object: 'resend.domains',
        count: 1,
        domains: [{ id: 'domain_sandbox', name: 'sandbox.example', status: 'verified' }]
      }
    };
  }
  if (!key) return { ok: false, status: 503, error: 'resend_not_configured' };
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/domains`, {
    headers: { authorization: `Bearer ${key}`, accept: 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'resend_domains_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const domains = Array.isArray(data.data) ? data.data : (Array.isArray(data.domains) ? data.domains : []);
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(data.id || 'resend_domains', 180),
      status: 'listed',
      object: 'resend.domains',
      count: domains.length,
      domains: domains.slice(0, 25).map((domain) => ({
        id: clean(domain.id || '', 180),
        name: clean(domain.name || domain.domain || '', 240),
        status: clean(domain.status || '', 80)
      }))
    }
  };
}

async function callSocialWebhook(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'social-webhook');
  const endpoint = firstEnv(env, def.required.endpoint);
  const secret = firstEnv(env, def.optional.secret);
  const content = clean(request.payload.content || request.payload.text || request.payload.body || request.payload.message || '', 8000);
  if (!content && !request.payload.asset) return { ok: false, status: 400, error: 'content_payload_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `content_sandbox_${request.id}`, status: 'sandbox_executed', object: request.action } };
  }
  if (!endpoint) return { ok: false, status: 503, error: 'social_webhook_not_configured' };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { 'x-0s-webhook-secret': secret } : {})
    },
    body: JSON.stringify({
      schema: 'metraiyux.0s.content-dispatch.v1',
      action: request.action,
      app_id: request.app_id,
      workspace_id: request.workspace_id,
      customer_id: request.customer_id,
      client_id: request.client_id,
      payload: request.payload,
      created_at: now()
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error || data.message || 'content_webhook_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callStripeCheckout(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'stripe');
  const secret = firstEnv(env, def.required.secret_key);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.stripe.com';
  const rawParams = request.payload.params && typeof request.payload.params === 'object' ? request.payload.params : request.payload;
  const successUrl = clean(rawParams.success_url || rawParams.successUrl || '', 800);
  const cancelUrl = clean(rawParams.cancel_url || rawParams.cancelUrl || '', 800);
  if (!successUrl || !cancelUrl) return { ok: false, status: 400, error: 'stripe_checkout_urls_required' };
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `stripe_sandbox_${request.id}`,
        status: 'open',
        object: 'checkout.session',
        url: successUrl.replace('{CHECKOUT_SESSION_ID}', `stripe_sandbox_${request.id}`),
        payment_status: 'unpaid',
        payment_intent_id: `pi_sandbox_${request.id}`,
        amount_total: Number(rawParams.amount_total || 0) || 0,
        currency: clean(rawParams.currency || 'usd', 20),
        client_reference_id: clean(rawParams.client_reference_id || '', 220)
      }
    };
  }
  if (!secret) return { ok: false, status: 503, error: 'stripe_not_configured' };
  const params = stripeParamsFromObject(rawParams);
  if (!params.get('mode')) params.set('mode', 'payment');
  const idempotencyKey = clean(request.payload.idempotency_key || request.payload.idempotencyKey || '', 255);
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/v1/checkout/sessions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/x-www-form-urlencoded', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}) },
    body: params
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'stripe_checkout_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function stripeFetch(env, method, path, body = null, extraHeaders = {}) {
  const def = PROVIDERS.find((item) => item.id === 'stripe');
  const secret = firstEnv(env, def.required.secret_key);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.stripe.com';
  if (!secret) return { ok: false, status: 503, error: 'stripe_not_configured' };
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...extraHeaders
    },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'stripe_request_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callStripeCheckoutRetrieve(env, request) {
  const sessionId = clean(request.payload.session_id || request.payload.sessionId || request.payload.id || '', 220);
  if (!sessionId) return { ok: false, status: 400, error: 'stripe_checkout_session_id_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: sessionId, status: 'complete', object: 'checkout.session', payment_status: 'paid', payment_intent_id: request.payload.payment_intent_id || `pi_sandbox_${request.id}` } };
  }
  return stripeFetch(env, 'GET', `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

async function callStripeAccountRetrieve(env, request) {
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `acct_sandbox_${request.id}`,
        status: 'active',
        object: 'account',
        livemode: false
      }
    };
  }
  const result = await stripeFetch(env, 'GET', '/v1/account');
  if (!result.ok) return result;
  return {
    ...result,
    result: {
      ...result.result,
      status: result.result?.status || 'active',
      object: result.result?.object || 'account'
    }
  };
}

async function callStripeBalanceRetrieve(env, request) {
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `balance_sandbox_${request.id}`,
        status: 'available',
        object: 'balance',
        available_count: 1,
        pending_count: 0,
        livemode: false
      }
    };
  }
  const result = await stripeFetch(env, 'GET', '/v1/balance');
  if (!result.ok) return result;
  return {
    ...result,
    result: {
      ...result.result,
      id: result.result?.id || 'balance',
      status: result.result?.status || 'available',
      object: result.result?.object || 'balance'
    }
  };
}

async function callStripeWebhookLifecycle(env, request) {
  const eventType = clean(request.payload.event_type || request.payload.type || '', 160);
  const objectId = clean(request.payload.object_id || request.payload.session_id || request.payload.subscription_id || request.payload.id || '', 220);
  if (!eventType) return { ok: false, status: 400, error: 'stripe_webhook_event_type_required' };
  if (!objectId) return { ok: false, status: 400, error: 'stripe_webhook_object_id_required' };
  return {
    ok: true,
    status: 200,
    sandbox: request.sandbox === true,
    provider_call_made: false,
    result: {
      id: clean(request.payload.event_id || objectId, 220),
      status: eventType,
      object: 'stripe.webhook.lifecycle',
      stripe_object: clean(request.payload.object_type || request.payload.object || '', 120),
      payment_status: clean(request.payload.payment_status || '', 80),
      client_reference_id: clean(request.payload.client_reference_id || '', 220)
    }
  };
}

async function callStripePaymentIntentCreate(env, request) {
  const amount = Math.max(0, Math.trunc(Number(request.payload.amount || request.payload.amount_cents || request.payload.amountCents || 0)));
  const currency = clean(request.payload.currency || env.STRIPE_CURRENCY || 'usd', 20).toLowerCase();
  if (!amount) return { ok: false, status: 400, error: 'stripe_payment_intent_amount_required' };
  const params = stripeParamsFromObject({
    amount,
    currency,
    capture_method: request.payload.capture_method || request.payload.captureMethod || '',
    description: request.payload.description || '',
    metadata: request.payload.metadata || {}
  });
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `pi_sandbox_${request.id}`,
        status: request.payload.capture_method === 'manual' || request.payload.captureMethod === 'manual' ? 'requires_capture' : 'requires_payment_method',
        object: 'payment_intent',
        amount_total: amount,
        amount_capturable: request.payload.capture_method === 'manual' || request.payload.captureMethod === 'manual' ? amount : 0,
        amount_received: 0,
        currency,
        capture_method: request.payload.capture_method || request.payload.captureMethod || ''
      }
    };
  }
  const idempotencyKey = clean(request.payload.idempotency_key || request.payload.idempotencyKey || '', 255);
  return stripeFetch(env, 'POST', '/v1/payment_intents', params, idempotencyKey ? { 'idempotency-key': idempotencyKey } : {});
}

async function callStripePaymentIntentRetrieve(env, request) {
  const paymentIntentId = clean(request.payload.payment_intent || request.payload.payment_intent_id || request.payload.paymentIntentId || request.payload.id || '', 220);
  if (!paymentIntentId) return { ok: false, status: 400, error: 'stripe_payment_intent_id_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: paymentIntentId, status: request.payload.status || 'requires_capture', object: 'payment_intent', amount_capturable: Number(request.payload.amount_capturable || request.payload.amount_to_capture || 0) || 0, amount_received: 0, currency: clean(request.payload.currency || 'usd', 20), capture_method: clean(request.payload.capture_method || 'manual', 80) } };
  }
  return stripeFetch(env, 'GET', `/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`);
}

async function callStripePaymentIntentCapture(env, request) {
  const paymentIntentId = clean(request.payload.payment_intent || request.payload.payment_intent_id || request.payload.paymentIntentId || request.payload.id || '', 220);
  if (!paymentIntentId) return { ok: false, status: 400, error: 'stripe_payment_intent_id_required' };
  const params = paramsFromObject(request.payload, ['amount_to_capture', 'application_fee_amount', 'final_capture', 'statement_descriptor', 'metadata[source]', 'metadata[app_id]', 'metadata[workspace_id]']);
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: paymentIntentId, status: 'succeeded', object: 'payment_intent', amount_received: Number(request.payload.amount_to_capture || 0) || 0, currency: clean(request.payload.currency || 'usd', 20), capture_method: 'manual' } };
  }
  return stripeFetch(env, 'POST', `/v1/payment_intents/${encodeURIComponent(paymentIntentId)}/capture`, params);
}

async function callStripeTerminalReaderProcessPaymentIntent(env, request) {
  const amount = Math.max(0, Math.trunc(Number(request.payload.amount || request.payload.amount_cents || request.payload.amountCents || 0)));
  const currency = clean(request.payload.currency || env.STRIPE_CURRENCY || 'usd', 20).toLowerCase();
  const readerId = clean(request.payload.reader_id || request.payload.readerId || '', 220);
  const orderRef = clean(request.payload.order_ref || request.payload.orderRef || request.payload.cart_id || request.payload.cartId || request.id, 220);
  if (!readerId) return { ok: false, status: 400, error: 'stripe_terminal_reader_id_required' };
  if (!amount) return { ok: false, status: 400, error: 'stripe_terminal_amount_required' };
  if (request.sandbox) {
    const paymentIntentId = `pi_terminal_sandbox_${request.id}`;
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: paymentIntentId,
        status: 'processing',
        object: 'terminal.reader.process_payment_intent',
        payment_intent_id: paymentIntentId,
        reader_id: readerId,
        amount_total: amount,
        currency,
        order_ref: orderRef
      }
    };
  }
  const createParams = stripeParamsFromObject({
    amount,
    currency,
    'payment_method_types[]': 'card_present',
    capture_method: clean(request.payload.capture_method || request.payload.captureMethod || 'automatic', 40),
    'metadata[order_ref]': orderRef,
    'metadata[source]': clean(request.app_id || 'metraiyux-0s', 120),
    'metadata[workspace_id]': request.workspace_id,
    'metadata[customer_id]': request.customer_id
  });
  const idempotencyKey = clean(request.payload.idempotency_key || request.payload.idempotencyKey || `terminal-${orderRef}-${readerId}`, 255);
  const intent = await stripeFetch(env, 'POST', '/v1/payment_intents', createParams, idempotencyKey ? { 'idempotency-key': idempotencyKey } : {});
  if (!intent.ok) return intent;
  const paymentIntentId = intent.result?.id || '';
  if (!paymentIntentId) return { ok: false, status: 502, error: 'stripe_terminal_payment_intent_missing', provider_call_made: true, result: intent.result };
  const reader = await stripeFetch(env, 'POST', `/v1/terminal/readers/${encodeURIComponent(readerId)}/process_payment_intent`, new URLSearchParams({ payment_intent: paymentIntentId }).toString());
  if (!reader.ok) return reader;
  return {
    ...reader,
    result: {
      id: paymentIntentId,
      status: reader.result?.status || 'processing',
      object: 'terminal.reader.process_payment_intent',
      payment_intent_id: paymentIntentId,
      reader_id: readerId,
      amount_total: amount,
      currency,
      intent: intent.result,
      reader: reader.result
    }
  };
}

async function callStripeRefundCreate(env, request) {
  const paymentIntentId = clean(request.payload.payment_intent || request.payload.payment_intent_id || request.payload.paymentIntentId || '', 220);
  const chargeId = clean(request.payload.charge || request.payload.charge_id || request.payload.chargeId || '', 220);
  const amount = Math.max(0, Math.trunc(Number(request.payload.amount || request.payload.amount_cents || request.payload.amountCents || 0)));
  if (!paymentIntentId && !chargeId) return { ok: false, status: 400, error: 'stripe_refund_payment_intent_or_charge_required' };
  const params = paramsFromObject({
    payment_intent: paymentIntentId,
    charge: chargeId,
    amount: amount || '',
    reason: clean(request.payload.reason || 'requested_by_customer', 80),
    'metadata[source]': clean(request.payload.source || request.app_id || 'metraiyux-0s', 120),
    'metadata[workspace_id]': request.workspace_id,
    'metadata[customer_id]': request.customer_id,
    'metadata[client_id]': request.client_id
  });
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `re_sandbox_${request.id}`, status: 'succeeded', object: 'refund' } };
  }
  const idempotencyKey = clean(request.payload.idempotency_key || request.payload.idempotencyKey || '', 255);
  return stripeFetch(env, 'POST', '/v1/refunds', params, idempotencyKey ? { 'idempotency-key': idempotencyKey } : {});
}

async function callStripeRefundRetrieve(env, request) {
  const refundId = clean(request.payload.refund_id || request.payload.refundId || request.payload.id || '', 220);
  if (!refundId) return { ok: false, status: 400, error: 'stripe_refund_id_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: refundId, status: 'succeeded', object: 'refund' } };
  }
  return stripeFetch(env, 'GET', `/v1/refunds/${encodeURIComponent(refundId)}`);
}

async function callStripeDisputeEvidenceSubmit(env, request) {
  const disputeId = clean(request.payload.dispute_id || request.payload.disputeId || request.payload.provider_dispute_id || request.payload.providerDisputeId || request.payload.id || '', 220);
  if (!disputeId) return { ok: false, status: 400, error: 'stripe_dispute_id_required' };
  const evidence = request.payload.evidence && typeof request.payload.evidence === 'object' ? request.payload.evidence : request.payload;
  const fields = {
    'evidence[customer_communication]': evidence.customer_communication || evidence.customerCommunication || evidence.sections?.customerCommunication || '',
    'evidence[refund_policy]': evidence.refund_policy || evidence.refundPolicy || evidence.sections?.refundPolicy || '',
    'evidence[shipping_documentation]': evidence.shipping_documentation || evidence.shippingDocumentation || JSON.stringify(evidence.sections?.fulfillmentProof || evidence.fulfillmentProof || []),
    'evidence[uncategorized_text]': evidence.summary || evidence.merchantStatement || evidence.uncategorized_text || 'Evidence packet submitted from the 0S provider runtime.',
    submit: request.payload.submit === false ? '' : 'true'
  };
  const params = paramsFromObject(fields);
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: disputeId, status: 'evidence_submitted', object: 'dispute' } };
  }
  return stripeFetch(env, 'POST', `/v1/disputes/${encodeURIComponent(disputeId)}`, params);
}

function endpointBaseFrom(def, env, payload = {}, fallback = '') {
  return clean(payload.endpoint_base || payload.endpointBase || firstEnv(env, def.optional?.api_base || []) || fallback, 1000).replace(/\/+$/, '');
}

function payloadBody(payload = {}) {
  if (payload.body && typeof payload.body === 'object') return payload.body;
  const body = { ...payload };
  delete body.endpoint_base;
  delete body.endpointBase;
  delete body.idempotency_key;
  delete body.idempotencyKey;
  return body;
}

function cleanArray(value = [], max = 25) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

async function paypalAccessToken(env, def, apiBase) {
  const clientId = firstEnv(env, def.required.client_id);
  const clientSecret = firstEnv(env, def.required.client_secret);
  if (!clientId || !clientSecret) return { ok: false, status: 503, error: 'paypal_not_configured' };
  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: basicAuth(clientId, clientSecret), 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) return { ok: false, status: response.status || 502, error: clean(data.error_description || data.error || 'paypal_oauth_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, access_token: data.access_token, provider_call_made: true };
}

function paypalCheckoutUrl(data = {}) {
  const link = Array.isArray(data.links) ? data.links.find((item) => item?.rel === 'approve') : null;
  return clean(link?.href || data.url || '', 1200);
}

function paypalResult(action, data = {}, fallbackId = '') {
  if (action === 'paypal.webhook.verify') {
    return { id: clean(data.id || fallbackId, 180), status: clean(data.verification_status || data.status || 'verified', 120), object: 'paypal.webhook', verification_status: clean(data.verification_status || '', 80) };
  }
  if (action === 'paypal.dispute.evidence.submit') {
    return { id: clean(data.id || data.dispute_id || fallbackId, 180), status: clean(data.status || 'evidence_submitted', 120), object: 'paypal.dispute' };
  }
  if (action === 'paypal.refund.create') {
    return { id: clean(data.id || fallbackId, 180), status: clean(data.status || 'refund_created', 120), object: 'paypal.refund' };
  }
  if (action === 'paypal.checkout.order.create') {
    return { id: clean(data.id || fallbackId, 180), status: clean(data.status || 'CREATED', 120), object: 'paypal.checkout.order', url: paypalCheckoutUrl(data) };
  }
  return { id: clean(data.user_id || data.payer_id || data.id || fallbackId, 180), status: clean(data.status || 'ok', 120), object: 'paypal.identity' };
}

async function callPaypal(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'paypal');
  const action = request.action;
  const apiBase = endpointBaseFrom(def, env, request.payload, 'https://api-m.paypal.com');
  if (request.sandbox) {
    const sandboxId = action === 'paypal.checkout.order.create' ? `paypal_order_sandbox_${request.id}` : `paypal_sandbox_${request.id}`;
    return { ok: true, sandbox: true, provider_call_made: false, result: { ...paypalResult(action, { id: sandboxId, status: action === 'paypal.webhook.verify' ? 'SUCCESS' : 'sandbox_executed', verification_status: 'SUCCESS', links: [{ rel: 'approve', href: `https://paypal-sandbox.example/checkout/${request.id}` }] }, sandboxId) } };
  }
  const token = await paypalAccessToken(env, def, apiBase);
  if (!token.ok) return token;
  const headers = { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json', accept: 'application/json' };
  let path = '/v1/identity/oauth2/userinfo?schema=paypalv1.1';
  let method = 'GET';
  let body = null;
  if (action === 'paypal.checkout.order.create') {
    path = '/v2/checkout/orders';
    method = 'POST';
    body = payloadBody(request.payload);
  } else if (action === 'paypal.refund.create') {
    const captureId = clean(request.payload.capture_id || request.payload.captureId || request.payload.provider_reference || request.payload.providerReference || request.payload.id || '', 240);
    if (!captureId) return { ok: false, status: 400, error: 'paypal_capture_id_required' };
    const amountCents = Math.max(0, Number(request.payload.amount_cents || request.payload.amountCents || 0) || 0);
    path = `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`;
    method = 'POST';
    body = payloadBody(request.payload);
    if (!body.amount && amountCents) body.amount = { value: (amountCents / 100).toFixed(2), currency_code: clean(request.payload.currency || 'USD', 12).toUpperCase() };
  } else if (action === 'paypal.dispute.evidence.submit') {
    const disputeId = clean(request.payload.dispute_id || request.payload.disputeId || request.payload.provider_dispute_id || request.payload.providerDisputeId || request.payload.id || '', 240);
    if (!disputeId) return { ok: false, status: 400, error: 'paypal_dispute_id_required' };
    path = `/v1/customer/disputes/${encodeURIComponent(disputeId)}/provide-evidence`;
    method = 'POST';
    body = payloadBody(request.payload);
  } else if (action === 'paypal.webhook.verify') {
    const webhookId = firstEnv(env, def.optional.webhook_id) || clean(request.payload.webhook_id || request.payload.webhookId || '', 240);
    if (!webhookId) return { ok: false, status: 400, error: 'paypal_webhook_id_required' };
    path = '/v1/notifications/verify-webhook-signature';
    method = 'POST';
    body = {
      auth_algo: request.payload.auth_algo || request.payload.authAlgo || '',
      cert_url: request.payload.cert_url || request.payload.certUrl || '',
      transmission_id: request.payload.transmission_id || request.payload.transmissionId || '',
      transmission_sig: request.payload.transmission_sig || request.payload.transmissionSig || '',
      transmission_time: request.payload.transmission_time || request.payload.transmissionTime || '',
      webhook_id: webhookId,
      webhook_event: request.payload.webhook_event || request.payload.webhookEvent || {}
    };
  }
  const response = await fetch(`${apiBase}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error_description || data.error || 'paypal_request_failed', 500), provider_call_made: true, result: paypalResult(action, data, request.id) };
  return { ok: true, status: response.status, provider_call_made: true, result: paypalResult(action, data, request.id) };
}

async function upsAccessToken(env, def, apiBase) {
  const clientId = firstEnv(env, def.required.client_id);
  const clientSecret = firstEnv(env, def.required.client_secret);
  if (!clientId || !clientSecret) return { ok: false, status: 503, error: 'ups_not_configured' };
  const response = await fetch(`${apiBase}/security/v1/oauth/token`, {
    method: 'POST',
    headers: { authorization: basicAuth(clientId, clientSecret), 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) return { ok: false, status: response.status || 502, error: clean(data.response?.errors?.[0]?.message || data.error_description || data.error || 'ups_oauth_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, access_token: data.access_token, provider_call_made: true };
}

function upsLabel(data = {}) {
  const results = data?.ShipmentResponse?.ShipmentResults || data?.shipmentResponse?.shipmentResults || data || {};
  const packageResults = Array.isArray(results.PackageResults) ? results.PackageResults[0] : results.PackageResults;
  const labelImage = packageResults?.ShippingLabel?.GraphicImage || packageResults?.shippingLabel?.graphicImage || '';
  return {
    tracking_number: clean(results.ShipmentIdentificationNumber || packageResults?.TrackingNumber || results.trackingNumber || '', 120),
    label_url: labelImage ? `data:application/pdf;base64,${clean(labelImage, 200000)}` : clean(results.labelUrl || '', 1200)
  };
}

function upsRates(data = {}, fallbackCurrency = 'USD') {
  const ratedShipment = data?.RateResponse?.RatedShipment || data?.rateResponse?.ratedShipment || data?.RatedShipment || data?.ratedShipment || [];
  const list = Array.isArray(ratedShipment) ? ratedShipment : (ratedShipment ? [ratedShipment] : []);
  return list.map((entry, index) => {
    const total = entry.TotalCharges || entry.totalCharges || entry.NegotiatedRateCharges?.TotalCharge || entry.negotiatedRateCharges?.totalCharge || {};
    const service = entry.Service || entry.service || {};
    const code = clean(service.Code || service.code || entry.serviceCode || `rate_${index + 1}`, 80).toLowerCase();
    return {
      provider: 'ups',
      serviceCode: code,
      serviceLabel: clean(service.Description || service.description || code.toUpperCase(), 120),
      rateCents: Math.round(Number(total.MonetaryValue || total.monetaryValue || total.value || 0) * 100),
      currency: clean(total.CurrencyCode || total.currencyCode || fallbackCurrency || 'USD', 20).toUpperCase(),
      estimatedDays: Number(entry.GuaranteedDelivery?.BusinessDaysInTransit || entry.guaranteedDelivery?.businessDaysInTransit || 0) || 0,
      packageCount: 0,
      source: 'ups_provider_rate'
    };
  }).filter((rate) => rate.rateCents > 0);
}

async function callUps(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'ups');
  const action = request.action;
  const apiBase = endpointBaseFrom(def, env, request.payload, 'https://onlinetools.ups.com');
  if (request.sandbox) {
    const object = action === 'ups.shipment.create' ? 'ups.shipment' : (action === 'ups.rate.quote' ? 'ups.rate' : 'ups.account');
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `ups_sandbox_${request.id}`, status: 'sandbox_executed', object, tracking_number: action === 'ups.shipment.create' ? `1Z${request.id.slice(-12)}` : '', label_url: action === 'ups.shipment.create' ? `data:application/pdf;base64,${bytesToBase64(new TextEncoder().encode('UPS sandbox label'))}` : '', rates: action === 'ups.rate.quote' ? [{ provider: 'ups', serviceCode: 'ground', serviceLabel: 'GROUND', rateCents: 999, currency: 'USD', estimatedDays: 3, packageCount: 1, source: 'ups_provider_rate' }] : [] } };
  }
  const token = await upsAccessToken(env, def, apiBase);
  if (!token.ok) return token;
  const headers = { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json', accept: 'application/json' };
  let path = '/api/rating/v2403/Shop';
  let body = payloadBody(request.payload);
  if (action === 'ups.shipment.create') path = '/api/shipments/v2403/ship';
  if (action === 'ups.rate.quote') path = clean(request.payload.rate_path || request.payload.ratePath || '/api/rating/v2403/Rate', 300);
  if (action === 'ups.account.health' && !body.RateRequest) body = { RateRequest: { Request: { TransactionReference: { CustomerContext: '0s-provider-health' } } } };
  const response = await fetch(`${apiBase}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.response?.errors?.[0]?.message || data.message || data.error || 'ups_request_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const label = action === 'ups.shipment.create' ? upsLabel(data) : {};
  const rates = action === 'ups.rate.quote' || action === 'ups.account.health' ? upsRates(data, request.payload.currency || 'USD') : [];
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(label.tracking_number || data.id || request.id, 180), status: 'executed', object: action === 'ups.shipment.create' ? 'ups.shipment' : (action === 'ups.rate.quote' ? 'ups.rate' : 'ups.account'), tracking_number: label.tracking_number || '', label_url: label.label_url || '', rates } };
}

async function callGoogleMerchant(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'google_merchant');
  const token = firstEnv(env, def.required.access_token);
  const merchantId = clean(request.payload.merchant_id || request.payload.merchantId || firstEnv(env, def.required.merchant_id), 120);
  const apiBase = endpointBaseFrom(def, env, request.payload, 'https://shoppingcontent.googleapis.com');
  const action = request.action;
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: `google_merchant_sandbox_${request.id}`, status: 'sandbox_executed', object: action === 'google_merchant.authinfo.get' ? 'google_merchant.authinfo' : 'google_merchant.products.batch', entries: action === 'google_merchant.products.batch' ? [{ batchId: 1, merchantId }] : [] } };
  if (!token || !merchantId) return { ok: false, status: 503, error: 'google_merchant_not_configured' };
  const path = action === 'google_merchant.authinfo.get' ? '/content/v2.1/accounts/authinfo' : '/content/v2.1/products/batch';
  const response = await fetch(`${apiBase}${path}`, {
    method: action === 'google_merchant.authinfo.get' ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: action === 'google_merchant.authinfo.get' ? undefined : JSON.stringify(payloadBody(request.payload))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'google_merchant_request_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.id || `google_merchant_${request.id}`, 180), status: 'executed', object: action === 'google_merchant.authinfo.get' ? 'google_merchant.authinfo' : 'google_merchant.products.batch', entries: cleanArray(data.entries, 100), accountIdentifiers: cleanArray(data.accountIdentifiers, 100) } };
}

async function callMetaCatalog(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'meta_catalog');
  const token = firstEnv(env, def.required.access_token);
  const catalogId = clean(request.payload.catalog_id || request.payload.catalogId || firstEnv(env, def.required.catalog_id), 180);
  const apiBase = endpointBaseFrom(def, env, request.payload, 'https://graph.facebook.com');
  const action = request.action;
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: catalogId || `meta_catalog_sandbox_${request.id}`, status: 'sandbox_executed', object: action === 'meta_catalog.catalog.get' ? 'meta_catalog.catalog' : 'meta_catalog.products.batch', handles: [] } };
  if (!token || !catalogId) return { ok: false, status: 503, error: 'meta_catalog_not_configured' };
  const path = action === 'meta_catalog.catalog.get' ? `/v20.0/${encodeURIComponent(catalogId)}` : `/v20.0/${encodeURIComponent(catalogId)}/batch`;
  const response = await fetch(`${apiBase}${path}`, {
    method: action === 'meta_catalog.catalog.get' ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: action === 'meta_catalog.catalog.get' ? undefined : JSON.stringify(payloadBody(request.payload))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'meta_catalog_request_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.id || catalogId, 180), status: clean(data.success === false ? 'failed' : 'executed', 80), object: action === 'meta_catalog.catalog.get' ? 'meta_catalog.catalog' : 'meta_catalog.products.batch', handles: cleanArray(data.handles || data.responses, 100) } };
}

async function callTiktokCatalog(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'tiktok_catalog');
  const token = firstEnv(env, def.required.access_token);
  const catalogId = clean(request.payload.catalog_id || request.payload.catalogId || firstEnv(env, def.required.catalog_id), 180);
  const apiBase = endpointBaseFrom(def, env, request.payload, 'https://business-api.tiktok.com');
  const action = request.action;
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: catalogId || `tiktok_catalog_sandbox_${request.id}`, status: 'sandbox_executed', object: action === 'tiktok_catalog.catalog.get' ? 'tiktok_catalog.catalog' : 'tiktok_catalog.products.upload', request_id: `tt_req_${request.id}` } };
  if (!token || !catalogId) return { ok: false, status: 503, error: 'tiktok_catalog_not_configured' };
  const path = action === 'tiktok_catalog.catalog.get' ? '/open_api/v1.3/catalog/get/' : '/open_api/v1.3/catalog/product/upload/';
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(action === 'tiktok_catalog.catalog.get' ? { catalog_id: catalogId } : payloadBody(request.payload))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code && Number(data.code) !== 0) return { ok: false, status: response.status || 502, error: clean(data.message || data.msg || 'tiktok_catalog_request_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.data?.catalog_id || catalogId, 180), status: 'executed', object: action === 'tiktok_catalog.catalog.get' ? 'tiktok_catalog.catalog' : 'tiktok_catalog.products.upload', request_id: clean(data.request_id || data.log_id || '', 180) } };
}

async function callMapboxRoute(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'mapbox');
  const token = firstEnv(env, def.required.token);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.mapbox.com';
  const profile = clean(request.payload.profile || 'driving', 80);
  const rawCoordinates = request.payload.coordinates || request.payload.waypoints || request.payload.points || '';
  const coordinates = Array.isArray(rawCoordinates)
    ? rawCoordinates.map((point) => Array.isArray(point) ? `${Number(point[0])},${Number(point[1])}` : clean(point, 80)).join(';')
    : clean(rawCoordinates, 1200);
  if (!coordinates || !coordinates.includes(';')) return { ok: false, status: 400, error: 'mapbox_two_coordinates_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `mapbox_sandbox_${request.id}`, status: 'sandbox_executed', object: 'route', distance_meters: 13000, duration_seconds: 1800 } };
  }
  if (!token) return { ok: false, status: 503, error: 'mapbox_not_configured' };
  const url = new URL(`${apiBase.replace(/\/+$/, '')}/directions/v5/mapbox/${encodeURIComponent(profile)}/${encodeURIComponent(coordinates)}`);
  url.searchParams.set('access_token', token);
  url.searchParams.set('geometries', clean(request.payload.geometries || 'geojson', 40));
  url.searchParams.set('overview', clean(request.payload.overview || 'full', 40));
  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'mapbox_route_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const route = Array.isArray(data.routes) ? data.routes[0] || {} : {};
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.uuid || data.code || request.id, 180), status: clean(data.code || 'Ok', 80), object: 'route', distance_meters: Number(route.distance || 0), duration_seconds: Number(route.duration || 0) } };
}

async function callMapboxGeocode(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'mapbox');
  const token = firstEnv(env, def.required.token);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.mapbox.com';
  const address = clean(request.payload.address || request.payload.query || request.payload.place || '', 800);
  const limit = Math.max(1, Math.min(10, Number(request.payload.limit || 1) || 1));
  if (!address) return { ok: false, status: 400, error: 'mapbox_geocode_address_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `mapbox_geocode_sandbox_${request.id}`, status: 'sandbox_executed', object: 'geocode', coordinates: [-112.074, 33.448], address } };
  }
  if (!token) return { ok: false, status: 503, error: 'mapbox_not_configured' };
  const url = `${apiBase.replace(/\/+$/, '')}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${encodeURIComponent(token)}&limit=${encodeURIComponent(String(limit))}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'mapbox_geocode_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const feature = Array.isArray(data.features) ? data.features[0] || {} : {};
  const center = Array.isArray(feature.center) ? feature.center.slice(0, 2).map(Number) : [];
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(feature.id || data.uuid || request.id, 180),
      status: 'Ok',
      object: 'geocode',
      coordinates: center,
      place_name: clean(feature.place_name || '', 500),
      address
    }
  };
}

async function callCheckrBackground(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'checkr');
  const apiKey = firstEnv(env, def.required.api_key);
  const packageId = clean(request.payload.package_id || request.payload.package || firstEnv(env, def.required.package_id), 160);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.checkr.com';
  const candidateId = clean(request.payload.candidate_id || request.payload.candidateId || '', 220);
  const email = clean(request.payload.email || request.payload.candidate_email || '', 240);
  if (!candidateId && !email) return { ok: false, status: 400, error: 'checkr_candidate_id_or_email_required' };
  if (!packageId) return { ok: false, status: 400, error: 'checkr_package_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `checkr_sandbox_${request.id}`, status: 'invitation_created', object: 'invitation' } };
  }
  if (!apiKey) return { ok: false, status: 503, error: 'checkr_not_configured' };
  const params = paramsFromObject({ candidate_id: candidateId, package: packageId, email });
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/v1/invitations`, {
    method: 'POST',
    headers: { authorization: basicAuth(apiKey, ''), 'content-type': 'application/x-www-form-urlencoded' },
    body: params
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error || data.message || 'checkr_invite_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callCertnBackground(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'certn');
  const apiKey = firstEnv(env, def.required.api_key);
  const ownerId = clean(request.payload.owner_id || request.payload.ownerId || firstEnv(env, def.required.owner_id), 220);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.certn.co';
  const industry = clean(request.payload.industry || env.CERTN_INDUSTRY || 'hr', 40) === 'pm' ? 'pm' : 'hr';
  const email = clean(request.payload.email || request.payload.candidate_email || '', 240);
  if (!email) return { ok: false, status: 400, error: 'certn_email_required' };
  if (!ownerId) return { ok: false, status: 400, error: 'certn_owner_id_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `certn_sandbox_${request.id}`, status: 'invited', object: 'application_invite' } };
  }
  if (!apiKey) return { ok: false, status: 503, error: 'certn_not_configured' };
  const requestFlag = clean(request.payload.request_flag || env.CERTN_REQUEST_FLAG || 'request_softcheck', 80);
  const body = { [requestFlag]: true, email, owner_id: ownerId, tag: clean(request.payload.tag || `0s-${request.id}`, 180) };
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/api/v1/${industry}/applications/invite/`, {
    method: 'POST',
    headers: { authorization: `Token ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error || data.message || 'certn_invite_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: publicProviderResult(data) };
}

async function callStorageReceipt(env, request) {
  const key = clean(request.payload.key || request.payload.path || request.payload.object_key || `${request.app_id}/${request.id}.json`, 800);
  const bodyBytes = request.payload.content_base64
    ? base64ToBytes(request.payload.content_base64)
    : new TextEncoder().encode(typeof request.payload.content === 'string' ? request.payload.content : JSON.stringify(request.payload.content ?? request.payload));
  const contentType = clean(request.payload.content_type || request.payload.contentType || 'application/json; charset=utf-8', 120);
  if (!key) return { ok: false, status: 400, error: 'storage_key_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `storage_sandbox_${request.id}`, status: 'sandbox_executed', object: 'storage.object', url: key } };
  }
  const bucket = env.ZERO_OS_PROVIDER_R2 || env.DEPLOYMENT_ASSET_BUCKET || env.DEPLOYMENT_ASSETS_BUCKET || env.R2_BUCKET_BINDING || null;
  if (bucket?.put) {
    await bucket.put(key, bodyBytes, { httpMetadata: { contentType } });
    return { ok: true, status: 200, provider_call_made: true, result: { id: key, status: 'stored', object: 'storage.object', url: key, bytes: bodyBytes.byteLength } };
  }
  const def = PROVIDERS.find((item) => item.id === 'cloudflare-r2');
  const accountId = firstEnv(env, def.required.account_id);
  const bucketName = clean(request.payload.bucket || firstEnv(env, def.required.bucket), 220);
  const accessKeyId = firstEnv(env, def.required.access_key);
  const secretAccessKey = firstEnv(env, def.required.secret_key);
  const endpointBase = firstEnv(env, def.optional.endpoint) || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const region = firstEnv(env, def.optional.region) || 'auto';
  if (!endpointBase || !bucketName || !accessKeyId || !secretAccessKey) return { ok: false, status: 503, error: 'storage_binding_or_s3_credentials_not_configured' };
  const endpoint = new URL(endpointBase.replace(/\/+$/, ''));
  endpoint.pathname = [endpoint.pathname.replace(/\/+$/g, ''), bucketName, ...key.split('/').map(encodePathPart)].filter(Boolean).join('/');
  const sha256 = await sha256HexBytes(bodyBytes);
  const metadata = request.payload.metadata && typeof request.payload.metadata === 'object' ? request.payload.metadata : {};
  const headers = {
    'content-type': contentType || 'application/octet-stream',
    'x-amz-meta-sha256': sha256,
    ...Object.fromEntries(Object.entries(metadata).slice(0, 20).map(([metaKey, value]) => [`x-amz-meta-${clean(metaKey, 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`, clean(value, 500)]))
  };
  const signedHeaders = await signS3Request({ method: 'PUT', url: endpoint.toString(), headers, body: bodyBytes, accessKeyId, secretAccessKey, region });
  const response = await fetch(endpoint.toString(), { method: 'PUT', headers: signedHeaders, body: bodyBytes });
  const text = await response.text().catch(() => '');
  if (!response.ok) return { ok: false, status: response.status, error: clean(text || `storage_put_failed_${response.status}`, 500), provider_call_made: true, result: { id: key, status: 'failed', object: 'storage.object' } };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: key, status: 'stored', object: 'storage.object', url: key, bucket: bucketName, bytes: bodyBytes.byteLength, sha256 } };
}

async function callSkyeMail(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'skymail');
  const apiUrl = firstEnv(env, def.required.api_url);
  const serviceBinding = env.SKYEMAIL_PLATFORM_WORKER || env.SKYMAIL_PLATFORM_WORKER || null;
  const token = firstEnv(env, def.optional.api_token);
  const action = request.action;
  const object = action.replace('skymail.', '');
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `skymail_sandbox_${request.id}`, status: 'sandbox_executed', object } };
  }
  if (!apiUrl && !serviceBinding?.fetch) return { ok: false, status: 503, error: 'skymail_not_configured' };
  const path = clean(request.payload.path || ({
    'skymail.mailbox.provision': '/workspace-provision',
    'skymail.mailbox.status': '/workspace-mailbox-summary',
    'skymail.mailbox.offboarding': '/mailbox-offboarding',
    'skymail.thread.attach': '/thread-attach',
    'skymail.system_message.send': '/system-message'
  })[action] || '/workspace-provision', 300);
  const method = clean(request.payload.method || (action === 'skymail.mailbox.status' ? 'GET' : 'POST'), 10).toUpperCase();
  const target = new URL(path, `${(apiUrl || 'https://skyemail-platform.internal').replace(/\/+$/, '')}/`);
  const bodyPayload = request.payload.body && typeof request.payload.body === 'object' ? request.payload.body : { ...request.payload };
  delete bodyPayload.path;
  delete bodyPayload.method;
  const runtimeCorrelation = {
    provider_runtime_receipt_id: request.id,
    provider_runtime_action: request.action,
    usage_lane: request.usage_lane,
    app_id: request.app_id,
    workspace_id: request.workspace_id,
    customer_id: request.customer_id,
    callback_path: `${AUTOMATION_BASE}/provider-callbacks`
  };
  bodyPayload.provider_runtime_receipt_id ||= request.id;
  bodyPayload.provider_runtime = {
    ...(bodyPayload.provider_runtime && typeof bodyPayload.provider_runtime === 'object' ? bodyPayload.provider_runtime : {}),
    ...runtimeCorrelation
  };
  bodyPayload.metadata = {
    ...(bodyPayload.metadata && typeof bodyPayload.metadata === 'object' ? bodyPayload.metadata : {}),
    ...runtimeCorrelation
  };
  const headers = {
    accept: 'application/json',
    ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
    ...(token ? { 'x-skymail-service-token': token, ...(action === 'skymail.mailbox.status' ? { authorization: `Bearer ${token}` } : {}) } : {})
  };
  if (method === 'GET') {
    for (const [key, value] of Object.entries(bodyPayload)) if (value !== undefined && value !== null && String(value) !== '') target.searchParams.set(key, String(value));
  }
  const init = { method, headers, body: method === 'GET' ? undefined : JSON.stringify(bodyPayload) };
  const response = serviceBinding?.fetch
    ? await serviceBinding.fetch(new Request(new URL(`${target.pathname}${target.search}`, 'https://skyemail-platform.internal').toString(), init))
    : await fetch(target.toString(), init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) return { ok: false, status: response.status, error: clean(data.error || data.message || 'skymail_request_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const mailbox = data.mailbox?.mailbox || data.mailbox || {};
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(data.id || data.workspace_id || mailbox.id || mailbox.mailbox_email || request.id, 220),
      status: clean(data.status || mailbox.status || data.provisioning_status || 'ok', 120),
      object,
      mailbox_email: clean(mailbox.mailbox_email || mailbox.email || data.mailbox_email || '', 240),
      mailbox: mailbox && typeof mailbox === 'object' ? {
        id: clean(mailbox.id || '', 180),
        mailbox_email: clean(mailbox.mailbox_email || mailbox.email || data.mailbox_email || '', 240),
        workspace_id: clean(mailbox.workspace_id || data.workspace_id || request.workspace_id || '', 180),
        status: clean(mailbox.status || data.status || '', 120),
        provisioning_status: clean(mailbox.provisioning_status || '', 160),
        provider: clean(mailbox.provider || '', 120)
      } : null,
      workspace_id: clean(data.workspace_id || mailbox.workspace_id || request.workspace_id || '', 180),
      skymail_url: clean(data.skymail_url || data.url || '', 500)
    }
  };
}

async function callRelay13(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'relay13');
  const origin = firstEnv(env, def.required.origin);
  const adminToken = firstEnv(env, def.optional.admin_token);
  const apiKey = firstEnv(env, def.optional.api_key);
  const action = request.action;
  const object = action.replace('relay13.', '');
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `relay13_sandbox_${request.id}`, status: 'sandbox_executed', object } };
  }
  if (!origin) return { ok: false, status: 503, error: 'relay13_not_configured' };
  const conversationId = clean(request.payload.conversation_id || request.payload.conversationId || request.client_id || '', 180);
  const path = clean(request.payload.path || ({
    'relay13.conversation.create': '/api/v1/conversations',
    'relay13.message.send': conversationId ? `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages` : '/api/v1/conversations/messages',
    'relay13.thread.attach': '/api/v1/connectlog/scan'
  })[action] || '/api/v1/conversations', 400);
  const bodyPayload = request.payload.body && typeof request.payload.body === 'object' ? request.payload.body : { ...request.payload };
  delete bodyPayload.path;
  const runtimeCorrelation = {
    provider_runtime_receipt_id: request.id,
    provider_runtime_action: request.action,
    usage_lane: request.usage_lane,
    app_id: request.app_id,
    workspace_id: request.workspace_id,
    customer_id: request.customer_id,
    callback_path: `${AUTOMATION_BASE}/provider-callbacks`
  };
  bodyPayload.provider_runtime_receipt_id ||= request.id;
  bodyPayload.metadata = {
    ...(bodyPayload.metadata && typeof bodyPayload.metadata === 'object' ? bodyPayload.metadata : {}),
    ...runtimeCorrelation
  };
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    ...(adminToken ? { authorization: `Bearer ${adminToken}` } : {}),
    ...(apiKey ? { 'x-relay13-api-key': apiKey } : {})
  };
  const response = await fetch(new URL(path, `${origin.replace(/\/+$/, '')}/`).toString(), { method: clean(request.payload.method || 'POST', 10).toUpperCase(), headers, body: JSON.stringify(bodyPayload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) return { ok: false, status: response.status, error: clean(data.error || data.message || 'relay13_request_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const item = data.conversation || data.message || data.thread || data;
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(item.id || data.conversation_id || data.message_id || data.id || request.id, 220),
      status: clean(item.status || data.status || 'ok', 120),
      object,
      conversation_id: clean(data.conversation_id || item.conversation_id || conversationId || '', 180),
      workspace_id: clean(data.workspace_id || item.workspace_id || request.workspace_id || '', 180)
    }
  };
}

async function callSkyeNetRuntime(env, request) {
  const object = request.action.replace('skynet.', '');
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `skynet_sandbox_${request.id}`, status: 'sandbox_executed', object } };
  }
  return {
    ok: true,
    status: 200,
    provider_call_made: false,
    result: {
      id: clean(request.payload.deployment_id || request.payload.deploymentId || request.payload.project || request.id, 220),
      status: clean(request.payload.status || 'receipted', 120),
      object,
      project: clean(request.payload.project || request.payload.project_id || '', 180),
      route: clean(request.payload.route || request.payload.mount_path || request.payload.url || '', 500)
    }
  };
}

function openAiApiRoot(env, def) {
  return (firstEnv(env, def.optional.api_base) || 'https://api.openai.com').replace(/\/+$/, '').replace(/\/v1$/i, '');
}

async function callOpenAiImage(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'openai');
  const apiKey = firstEnv(env, def.required.api_key);
  const apiBase = openAiApiRoot(env, def);
  const prompt = clean(request.payload.prompt || request.payload.description || '', 4000);
  if (!prompt) return { ok: false, status: 400, error: 'openai_image_prompt_required' };
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `openai_image_sandbox_${request.id}`, status: 'sandbox_executed', object: 'image' } };
  }
  if (!apiKey) return { ok: false, status: 503, error: 'openai_not_configured' };
  const body = {
    model: clean(request.payload.model || env.OPENAI_IMAGE_MODEL || 'gpt-image-1', 80),
    prompt,
    size: clean(request.payload.size || '1024x1024', 40),
    n: Math.max(1, Math.min(4, Number(request.payload.n || 1) || 1))
  };
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/v1/images/generations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'openai_image_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const first = Array.isArray(data.data) ? data.data[0] || {} : {};
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.id || request.id, 180), status: 'generated', object: 'image', url: clean(first.url || '', 1200), b64_json_present: Boolean(first.b64_json) } };
}

async function callOpenAiChat(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'openai');
  const apiKey = firstEnv(env, def.required.api_key);
  const apiBase = openAiApiRoot(env, def);
  const messages = Array.isArray(request.payload.messages) ? request.payload.messages : [];
  if (!messages.length) return { ok: false, status: 400, error: 'openai_chat_messages_required' };
  const model = clean(request.payload.model || env.OPENAI_MODEL || 'gpt-4.1-mini', 80);
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `openai_chat_sandbox_${request.id}`,
        status: 'sandbox_executed',
        object: 'chat.completion',
        model,
        message_content: clean(request.payload.mock_content || request.payload.sandbox_content || '{"reply":"Sandbox Auren response.","issues":[],"actions":[]}', 12000)
      }
    };
  }
  if (!apiKey) return { ok: false, status: 503, error: 'openai_not_configured' };
  const body = {
    model,
    messages,
    temperature: Number.isFinite(Number(request.payload.temperature)) ? Number(request.payload.temperature) : 0.35,
    ...(request.payload.response_format ? { response_format: request.payload.response_format } : {}),
    ...(request.payload.max_tokens ? { max_tokens: Math.max(1, Math.min(4096, Number(request.payload.max_tokens) || 1024)) } : {})
  };
  const response = await fetch(`${apiBase}/v1/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'openai_chat_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const choice = Array.isArray(data.choices) ? data.choices[0] || {} : {};
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(data.id || request.id, 180),
      status: clean(choice.finish_reason || 'completed', 120),
      object: clean(data.object || 'chat.completion', 120),
      model: clean(data.model || model, 120),
      message_content: clean(choice.message?.content || '', 12000),
      usage: data.usage && typeof data.usage === 'object' ? data.usage : null
    }
  };
}

function anthropicApiRoot(env, def) {
  return (firstEnv(env, def.optional.api_base) || 'https://api.anthropic.com').replace(/\/+$/, '');
}

async function callAnthropicChat(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'anthropic');
  const apiKey = firstEnv(env, def.required.api_key);
  const apiBase = anthropicApiRoot(env, def);
  const messages = Array.isArray(request.payload.messages) ? request.payload.messages : [];
  if (!messages.length) return { ok: false, status: 400, error: 'anthropic_chat_messages_required' };
  const model = clean(request.payload.model || firstEnv(env, def.optional.model) || 'claude-3-5-sonnet-20241022', 120);
  const systemParts = [];
  const outMsgs = [];
  for (const item of messages) {
    const role = clean(item.role || 'user', 40).toLowerCase();
    const content = clean(item.content || '', 12000);
    if (!content) continue;
    if (role === 'system' || role === 'developer') systemParts.push(content);
    else if (role === 'assistant') outMsgs.push({ role: 'assistant', content });
    else outMsgs.push({ role: 'user', content });
  }
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `anthropic_chat_sandbox_${request.id}`, status: 'sandbox_executed', object: 'chat.completion', model, message_content: clean(request.payload.mock_content || request.payload.sandbox_content || 'Sandbox Anthropic response.', 12000), usage: { input_tokens: 0, output_tokens: 0 } } };
  }
  if (!apiKey) return { ok: false, status: 503, error: 'anthropic_not_configured' };
  const body = {
    model,
    max_tokens: Math.max(1, Math.min(4096, Number(request.payload.max_tokens || request.payload.max_output_tokens || 1024) || 1024)),
    temperature: Number.isFinite(Number(request.payload.temperature)) ? Number(request.payload.temperature) : 0.35,
    messages: outMsgs
  };
  if (systemParts.length) body.system = systemParts.join('\n\n');
  const response = await fetch(`${apiBase}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'anthropic_chat_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const text = Array.isArray(data.content) ? data.content.map((item) => item?.text || '').join('') : '';
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.id || request.id, 180), status: clean(data.stop_reason || 'completed', 120), object: 'chat.completion', model: clean(data.model || model, 120), message_content: clean(text, 12000), usage: data.usage && typeof data.usage === 'object' ? data.usage : null } };
}

function geminiApiRoot(env, def) {
  return (firstEnv(env, def.optional.api_base) || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
}

function geminiPayloadFromMessages(messages = [], maxTokens = 1024, temperature = 0.35) {
  const systemParts = [];
  const contents = [];
  for (const item of messages) {
    const role = clean(item.role || 'user', 40).toLowerCase();
    const text = clean(item.content || '', 12000);
    if (!text) continue;
    if (role === 'system' || role === 'developer') systemParts.push(text);
    else if (role === 'assistant') contents.push({ role: 'model', parts: [{ text }] });
    else contents.push({ role: 'user', parts: [{ text }] });
  }
  const body = { contents, generationConfig: { maxOutputTokens: maxTokens, temperature } };
  if (systemParts.length) body.systemInstruction = { parts: [{ text: systemParts.join('\n\n') }] };
  return body;
}

async function callGeminiChat(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'gemini');
  const apiKey = firstEnv(env, def.required.api_key);
  const apiBase = geminiApiRoot(env, def);
  const messages = Array.isArray(request.payload.messages) ? request.payload.messages : [];
  if (!messages.length) return { ok: false, status: 400, error: 'gemini_chat_messages_required' };
  const model = clean(request.payload.model || firstEnv(env, def.optional.model) || 'gemini-2.5-flash', 120);
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `gemini_chat_sandbox_${request.id}`, status: 'sandbox_executed', object: 'chat.completion', model, message_content: clean(request.payload.mock_content || request.payload.sandbox_content || 'Sandbox Gemini response.', 12000), usage: { input_tokens: 0, output_tokens: 0 } } };
  }
  if (!apiKey) return { ok: false, status: 503, error: 'gemini_not_configured' };
  const body = geminiPayloadFromMessages(messages, Math.max(1, Math.min(4096, Number(request.payload.max_tokens || request.payload.max_output_tokens || 1024) || 1024)), Number.isFinite(Number(request.payload.temperature)) ? Number(request.payload.temperature) : 0.35);
  const response = await fetch(`${apiBase}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'gemini_chat_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const candidate = Array.isArray(data.candidates) ? data.candidates[0] || {} : {};
  const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
  const text = parts.map((part) => part?.text || '').join('');
  const usage = data.usageMetadata || {};
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.responseId || request.id, 180), status: clean(candidate.finishReason || 'completed', 120), object: 'chat.completion', model, message_content: clean(text, 12000), usage: { input_tokens: usage.promptTokenCount || 0, output_tokens: usage.candidatesTokenCount || 0 } } };
}

async function callGeminiEmbedding(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'gemini');
  const apiKey = firstEnv(env, def.required.api_key);
  const apiBase = geminiApiRoot(env, def);
  const input = clean(request.payload.input || request.payload.text || '', 12000);
  if (!input) return { ok: false, status: 400, error: 'gemini_embedding_input_required' };
  const model = clean(request.payload.model || firstEnv(env, def.optional.embedding_model) || 'gemini-embedding-001', 120);
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `gemini_embedding_sandbox_${request.id}`, status: 'sandbox_executed', object: 'embedding', model, dimensions: 3, embedding: [0.13, 0.27, 0.42], usage: { input_tokens: Math.max(1, Math.ceil(input.length / 4)), output_tokens: 0 } } };
  }
  if (!apiKey) return { ok: false, status: 503, error: 'gemini_not_configured' };
  const body = { content: { parts: [{ text: input }] } };
  if (request.payload.taskType || request.payload.task_type) body.taskType = clean(request.payload.taskType || request.payload.task_type, 120);
  if (request.payload.title) body.title = clean(request.payload.title, 240);
  const response = await fetch(`${apiBase}/models/${encodeURIComponent(model)}:embedContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'gemini_embedding_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  const values = Array.isArray(data.embedding?.values) ? data.embedding.values : [];
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.name || request.id, 180), status: 'embedded', object: 'embedding', model, dimensions: values.length, embedding: values.slice(0, 3072), usage: { input_tokens: Math.max(1, Math.ceil(input.length / 4)), output_tokens: 0 } } };
}

async function musicAudioProviderResponse(response, includeAudioBase64) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}));
    return {
      content_type: contentType,
      provider_json: payload,
      audio_base64: clean(payload.audio || payload.audio_base64 || payload.audioBase64 || '', 16 * 1024 * 1024),
      bytes: 0,
      audio_returned: Boolean(payload.audio || payload.audio_base64 || payload.audioBase64)
    };
  }
  const buffer = await response.arrayBuffer();
  const bytes = buffer.byteLength;
  const shouldReturnAudio = includeAudioBase64 !== false && bytes <= 8 * 1024 * 1024;
  return {
    content_type: contentType || 'audio/mpeg',
    provider_json: null,
    audio_base64: shouldReturnAudio ? bytesToBase64(new Uint8Array(buffer)) : '',
    bytes,
    audio_returned: shouldReturnAudio
  };
}

function musicAudioSandboxResult(request, providerId) {
  return {
    ok: true,
    sandbox: true,
    provider_call_made: false,
    result: {
      id: `${providerId}_audio_sandbox_${request.id}`,
      status: 'sandbox_executed',
      object: 'music.audio',
      provider: providerId,
      content_type: 'audio/mpeg',
      bytes: 0,
      audio_base64: '',
      audio_returned: false
    }
  };
}

async function callElevenLabsMusic(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'elevenlabs');
  const apiKey = firstEnv(env, def.required.api_key);
  const endpoint = clean(request.payload.endpoint || firstEnv(env, def.optional.music_generate_url) || 'https://api.elevenlabs.io/v1/music', 1200);
  const prompt = clean(request.payload.prompt || request.payload.description || '', 4000);
  if (!prompt) return { ok: false, status: 400, error: 'elevenlabs_music_prompt_required' };
  if (request.sandbox) return musicAudioSandboxResult(request, 'elevenlabs');
  if (!apiKey) return { ok: false, status: 503, error: 'elevenlabs_not_configured' };
  const durationSeconds = Math.max(8, Math.min(300, Number(request.payload.duration_seconds || request.payload.durationSeconds || request.payload.duration || 60) || 60));
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'audio/mpeg', 'xi-api-key': apiKey },
    body: JSON.stringify({
      prompt,
      music_length_ms: durationSeconds * 1000,
      model_id: clean(request.payload.model_id || request.payload.modelId || request.payload.model || '', 120) || undefined,
      force_instrumental: request.payload.force_instrumental === true || request.payload.forceInstrumental === true || request.payload.instrumental === true || undefined
    })
  });
  const parsed = await musicAudioProviderResponse(response, request.payload.include_audio_base64 !== false && request.payload.includeAudioBase64 !== false);
  if (!response.ok) return { ok: false, status: response.status, error: clean(parsed.provider_json?.error || parsed.provider_json?.message || 'elevenlabs_music_failed', 500), provider_call_made: true, result: publicProviderResult(parsed.provider_json || {}) };
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(parsed.provider_json?.id || request.id, 180),
      status: 'generated',
      object: 'music.audio',
      provider: 'elevenlabs',
      content_type: parsed.content_type,
      bytes: parsed.bytes,
      audio_base64: parsed.audio_base64,
      audio_returned: parsed.audio_returned,
      provider_json: parsed.provider_json ? clean(JSON.stringify(parsed.provider_json), 1200) : ''
    }
  };
}

async function callStabilityAudio(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'stability');
  const apiKey = firstEnv(env, def.required.api_key);
  const endpoint = clean(request.payload.endpoint || firstEnv(env, def.optional.audio_generate_url) || 'https://api.stability.ai/v2beta/audio/stable-audio-2/text-to-audio', 1200);
  const prompt = clean(request.payload.prompt || request.payload.description || '', 4000);
  if (!prompt) return { ok: false, status: 400, error: 'stability_audio_prompt_required' };
  if (request.sandbox) return musicAudioSandboxResult(request, 'stability');
  if (!apiKey) return { ok: false, status: 503, error: 'stability_not_configured' };
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('duration', String(Math.max(8, Math.min(300, Number(request.payload.duration_seconds || request.payload.durationSeconds || request.payload.duration || 60) || 60))));
  form.append('output_format', clean(request.payload.output_format || request.payload.outputFormat || 'mp3', 20));
  const model = clean(request.payload.model || request.payload.model_id || request.payload.modelId || '', 80);
  if (model) form.append('model', model);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, accept: 'audio/*, application/json' },
    body: form
  });
  const parsed = await musicAudioProviderResponse(response, request.payload.include_audio_base64 !== false && request.payload.includeAudioBase64 !== false);
  if (!response.ok) return { ok: false, status: response.status, error: clean(parsed.provider_json?.error || parsed.provider_json?.message || 'stability_audio_failed', 500), provider_call_made: true, result: publicProviderResult(parsed.provider_json || {}) };
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(parsed.provider_json?.id || request.id, 180),
      status: 'generated',
      object: 'music.audio',
      provider: 'stability',
      content_type: parsed.content_type,
      bytes: parsed.bytes,
      audio_base64: parsed.audio_base64,
      audio_returned: parsed.audio_returned,
      provider_json: parsed.provider_json ? clean(JSON.stringify(parsed.provider_json), 1200) : ''
    }
  };
}

function fediverseBaseUrl(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'fediverse');
  return clean(request.payload.instance_url || request.payload.instanceUrl || firstEnv(env, def.optional.default_instance), 1200).replace(/\/+$/, '');
}

function fediverseToken(env, request, kind = 'write') {
  const def = PROVIDERS.find((item) => item.id === 'fediverse');
  const dynamicKey = kind === 'read'
    ? clean(request.payload.read_token_env_key || request.payload.readTokenEnvKey || request.payload.token_env_key || request.payload.tokenEnvKey || '', 160)
    : clean(request.payload.token_env_key || request.payload.tokenEnvKey || '', 160);
  return dynamicKey ? firstEnv(env, [dynamicKey]) : firstEnv(env, def.optional.access_token);
}

async function fediverseJson(response, fallback) {
  const text = await response.text().catch(() => '');
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: clean(text, 1000) }; }
  if (!response.ok) {
    return { ok: false, status: response.status, error: clean(data.error || data.error_description || data.message || fallback || `fediverse_http_${response.status}`, 500), data };
  }
  return { ok: true, status: response.status, data };
}

async function fediverseUploadMedia(env, request, token, base) {
  const mediaUrl = clean(request.payload.media_url || request.payload.mediaUrl || '', 1200);
  if (!mediaUrl) return { ok: true, media_ids: [], provider_call_made: false };
  if (!/^https?:\/\//i.test(mediaUrl)) return { ok: false, status: 400, error: 'fediverse_media_url_must_be_http' };
  const source = await fetch(mediaUrl);
  if (!source.ok) return { ok: false, status: source.status, error: `media_fetch_failed_${source.status}`, provider_call_made: true };
  const blob = await source.blob();
  const name = mediaUrl.split('/').pop()?.split('?')[0] || 'music-nexus-media.bin';
  const form = new FormData();
  form.append('file', blob, clean(name, 180));
  const altText = clean(request.payload.alt_text || request.payload.altText || '', 1200);
  if (altText) form.append('description', altText);
  const response = await fetch(`${base}/api/v2/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form });
  const parsed = await fediverseJson(response, 'fediverse_media_upload_failed');
  if (!parsed.ok) return { ...parsed, provider_call_made: true };
  const id = clean(parsed.data?.id || '', 180);
  return { ok: true, status: parsed.status, media_ids: id ? [id] : [], provider_call_made: true };
}

async function callFediverseMediaUpload(env, request) {
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: `fediverse_media_sandbox_${request.id}`, status: 'sandbox_executed', object: 'fediverse.media', media_ids: [`media_sandbox_${request.id}`] } };
  const base = fediverseBaseUrl(env, request);
  const token = fediverseToken(env, request, 'write');
  if (!base) return { ok: false, status: 400, error: 'fediverse_instance_url_required' };
  if (!token) return { ok: false, status: 202, error: 'fediverse_provider_token_required', result: { id: request.id, status: 'provider-token-required', object: 'fediverse.media' } };
  const uploaded = await fediverseUploadMedia(env, request, token, base);
  if (!uploaded.ok) return { ok: false, status: uploaded.status || 500, error: uploaded.error || 'fediverse_media_upload_failed', provider_call_made: uploaded.provider_call_made === true, result: { id: request.id, status: 'failed', object: 'fediverse.media' } };
  return { ok: true, status: uploaded.status || 200, provider_call_made: uploaded.provider_call_made === true, result: { id: uploaded.media_ids[0] || request.id, status: 'uploaded', object: 'fediverse.media', media_ids: uploaded.media_ids } };
}

async function callFediverseStatusPublish(env, request) {
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: `fediverse_status_sandbox_${request.id}`, status: 'sandbox_executed', object: 'fediverse.status', status_url: `https://fediverse-sandbox.example/@skye/${request.id}` } };
  const base = fediverseBaseUrl(env, request);
  const token = fediverseToken(env, request, 'write');
  const statusText = clean(request.payload.status_text || request.payload.statusText || request.payload.caption || request.payload.text || '', 950);
  if (!base) return { ok: false, status: 400, error: 'fediverse_instance_url_required' };
  if (!statusText) return { ok: false, status: 400, error: 'fediverse_status_text_required' };
  if (!token) return { ok: false, status: 202, error: 'fediverse_provider_token_required', result: { id: request.id, status: 'provider-token-required', object: 'fediverse.status' } };
  const uploaded = await fediverseUploadMedia(env, request, token, base);
  if (!uploaded.ok) return { ok: false, status: uploaded.status || 500, error: uploaded.error || 'fediverse_media_upload_failed', provider_call_made: uploaded.provider_call_made === true, result: { id: request.id, status: 'failed', object: 'fediverse.status' } };
  const params = new URLSearchParams();
  params.set('status', statusText);
  params.set('visibility', clean(request.payload.visibility || 'unlisted', 40));
  params.set('language', clean(request.payload.language || 'en', 20));
  for (const id of uploaded.media_ids || []) params.append('media_ids[]', id);
  const response = await fetch(`${base}/api/v1/statuses`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': clean(request.payload.idempotency_key || request.payload.idempotencyKey || request.id, 180) },
    body: params
  });
  const parsed = await fediverseJson(response, 'fediverse_status_publish_failed');
  if (!parsed.ok) return { ok: false, status: parsed.status || 500, error: parsed.error, provider_call_made: true, result: publicProviderResult(parsed.data || {}) };
  return {
    ok: true,
    status: parsed.status,
    provider_call_made: true,
    result: {
      id: clean(parsed.data?.id || request.id, 180),
      status: 'published',
      object: 'fediverse.status',
      provider: clean(request.payload.platform || 'fediverse', 80),
      status_url: clean(parsed.data?.url || parsed.data?.uri || '', 1000),
      media_ids: uploaded.media_ids || [],
      raw_visibility: clean(parsed.data?.visibility || '', 80)
    }
  };
}

async function callFediverseFeedSync(env, request) {
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: `fediverse_feed_sandbox_${request.id}`, status: 'sandbox_executed', object: 'fediverse.feed', source_url: 'https://fediverse-sandbox.example/api/v1/timelines/public', statuses: [] } };
  const base = fediverseBaseUrl(env, request);
  if (!base) return { ok: false, status: 400, error: 'fediverse_instance_url_required' };
  const limit = Math.min(20, Math.max(1, Number(request.payload.limit || 8) || 8));
  const hashtag = clean(request.payload.hashtag || '', 80).replace(/^#/, '').replace(/[^A-Za-z0-9_]/g, '');
  const token = fediverseToken(env, request, 'read');
  const feedUrl = hashtag ? `${base}/api/v1/timelines/tag/${encodeURIComponent(hashtag)}?limit=${limit}` : `${base}/api/v1/timelines/public?limit=${limit}&local=true`;
  const response = await fetch(feedUrl, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const parsed = await fediverseJson(response, 'fediverse_feed_sync_failed');
  if (!parsed.ok) return { ok: false, status: parsed.status || 500, error: parsed.error, provider_call_made: true, result: publicProviderResult(parsed.data || {}) };
  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  return {
    ok: true,
    status: parsed.status,
    provider_call_made: true,
    result: {
      id: clean(request.id, 180),
      status: 'synced',
      object: 'fediverse.feed',
      source_url: feedUrl,
      statuses: rows.slice(0, limit).map((status) => ({
        id: clean(status.id || '', 180),
        url: clean(status.url || status.uri || '', 1000),
        account: status.account ? { id: clean(status.account.id || '', 180), acct: clean(status.account.acct || status.account.username || '', 180), displayName: clean(status.account.display_name || status.account.username || '', 180), avatar: clean(status.account.avatar || '', 1000) } : null,
        createdAt: clean(status.created_at || '', 80),
        contentHtml: clean(status.content || '', 4000),
        visibility: clean(status.visibility || '', 80),
        replies: Number(status.replies_count || 0) || 0,
        boosts: Number(status.reblogs_count || 0) || 0,
        favourites: Number(status.favourites_count || 0) || 0,
        media: Array.isArray(status.media_attachments) ? status.media_attachments.slice(0, 6).map((item) => ({ id: clean(item.id || '', 180), type: clean(item.type || '', 80), url: clean(item.url || item.preview_url || '', 1000), description: clean(item.description || '', 1000) })) : []
      }))
    }
  };
}

async function callCloudflareTokenVerify(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'cloudflare');
  const token = firstEnv(env, def.required.token);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.cloudflare.com/client/v4';
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: `cloudflare_token_sandbox_${request.id}`, status: 'verified', object: 'cloudflare.token' } };
  if (!token) return { ok: false, status: 503, error: 'cloudflare_not_configured' };
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/user/tokens/verify`, {
    headers: { authorization: `Bearer ${token}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.errors?.[0]?.message || data.message || 'cloudflare_token_verify_failed', 500), provider_call_made: true, result: publicProviderResult(data.result || data) };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.result?.id || request.id, 180), status: clean(data.result?.status || 'verified', 80), object: 'cloudflare.token' } };
}

function cloudflareCertificateResult(data = {}) {
  const result = data.result || data;
  const ssl = result.ssl || {};
  const records = [];
  const pushRecord = (item = {}) => {
    if (!item) return;
    const name = item.txt_name || item.name || item.cname_name || '';
    const value = item.txt_value || item.value || item.cname_target || '';
    if (name || value) records.push({ type: item.type || (item.txt_name ? 'TXT' : 'CNAME'), name: clean(name, 500), value: clean(value, 1000) });
  };
  if (Array.isArray(ssl.validation_records)) ssl.validation_records.forEach(pushRecord);
  pushRecord(ssl.validation_record);
  return {
    id: clean(result.id || '', 180),
    status: clean(ssl.status || result.status || 'pending_validation', 120),
    object: 'cloudflare.custom_hostname',
    external_hostname_id: clean(result.id || '', 180),
    validation_records: records
  };
}

async function callCloudflareCustomHostname(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'cloudflare');
  const token = firstEnv(env, def.required.token);
  const zoneId = clean(request.payload.zone_id || request.payload.zoneId || firstEnv(env, def.optional.zone_id), 180);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.cloudflare.com/client/v4';
  const action = request.action;
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `cf_custom_hostname_sandbox_${request.id}`, status: 'pending_validation', object: 'cloudflare.custom_hostname', external_hostname_id: `cf_custom_hostname_sandbox_${request.id}`, validation_records: [{ type: 'TXT', name: '_cf-custom-hostname.example.com', value: 'sandbox-validation' }] } };
  }
  if (!token || !zoneId) return { ok: false, status: 503, error: 'cloudflare_zone_not_configured' };
  let path = `/zones/${encodeURIComponent(zoneId)}/custom_hostnames`;
  let method = 'POST';
  let body = request.payload.body && typeof request.payload.body === 'object' ? request.payload.body : {};
  if (action === 'cloudflare.custom_hostname.status') {
    const hostnameId = clean(request.payload.external_hostname_id || request.payload.externalHostnameId || request.payload.id || '', 220);
    if (!hostnameId) return { ok: false, status: 400, error: 'cloudflare_custom_hostname_id_required' };
    path = `/zones/${encodeURIComponent(zoneId)}/custom_hostnames/${encodeURIComponent(hostnameId)}`;
    method = 'GET';
    body = null;
  }
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: 'application/json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) return { ok: false, status: response.status, error: clean(data.errors?.[0]?.message || data.message || 'cloudflare_custom_hostname_failed', 500), provider_call_made: true, result: cloudflareCertificateResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: cloudflareCertificateResult(data) };
}

function dnsTxtAnswers(data = {}) {
  const answers = Array.isArray(data.Answer) ? data.Answer : [];
  return answers
    .filter((answer) => String(answer.type || '') === '16' || String(answer.type || '').toUpperCase() === 'TXT')
    .map((answer) => clean(answer.data || answer.value || '', 1000).replace(/^TXT\s+/i, '').replace(/^"|"$/g, '').replace(/"\s+"/g, '').trim())
    .filter(Boolean);
}

async function callDnsTxtLookup(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'dns');
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://cloudflare-dns.com/dns-query';
  const recordName = clean(request.payload.record_name || request.payload.recordName || request.payload.name || '', 500).replace(/\.$/, '');
  if (!recordName) return { ok: false, status: 400, error: 'dns_record_name_required' };
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: recordName, status: 'queried', object: 'dns.txt', record_name: recordName, answers: request.payload.expected_value ? [clean(request.payload.expected_value, 1000)] : ['sandbox-validation'] } };
  const url = new URL(apiBase);
  url.searchParams.set('name', recordName);
  url.searchParams.set('type', 'TXT');
  const response = await fetch(url.toString(), { headers: { accept: 'application/dns-json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || 'dns_txt_lookup_failed', 500), provider_call_made: true, result: { id: recordName, status: 'failed', object: 'dns.txt', record_name: recordName, answers: [] } };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: recordName, status: 'queried', object: 'dns.txt', record_name: recordName, answers: dnsTxtAnswers(data) } };
}

async function callSemrushDomainOrganic(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'semrush');
  const key = firstEnv(env, def.required.api_key);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.semrush.com/';
  const domain = clean(request.payload.domain || '', 240);
  if (!domain) return { ok: false, status: 400, error: 'semrush_domain_required' };
  const database = clean(request.payload.database || firstEnv(env, def.optional.database) || 'us', 40);
  const displayLimit = Math.max(1, Math.min(5000, Number(request.payload.display_limit || request.payload.limit || 1) || 1));
  if (request.sandbox) {
    const csv = `Ph;Po;Nq;Cp;Ur;Tr\n${domain};1;10;0.1;https://${domain}/;1\n`;
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `semrush_sandbox_${request.id}`, status: 'pulled', object: 'semrush.domain_organic', bytes: csv.length, csv } };
  }
  if (!key) return { ok: false, status: 503, error: 'semrush_not_configured' };
  const params = new URLSearchParams({
    type: clean(request.payload.type || 'domain_organic', 80),
    key,
    display_limit: String(displayLimit),
    export_columns: clean(request.payload.export_columns || request.payload.exportColumns || 'Ph,Po,Nq,Cp,Ur,Tr', 120),
    domain,
    database
  });
  const response = await fetch(`${apiBase}${apiBase.includes('?') ? '&' : '?'}${params.toString()}`);
  const csv = await response.text().catch(() => '');
  if (!response.ok || /^ERROR/i.test(csv)) return { ok: false, status: response.status || 502, error: clean(csv || 'semrush_pull_failed', 500), provider_call_made: true, result: { id: request.id, status: 'failed', object: 'semrush.domain_organic' } };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: `semrush_${request.id}`, status: 'pulled', object: 'semrush.domain_organic', bytes: csv.length, csv: clean(csv, 200000) } };
}

async function callGoogleSearchConsoleQuery(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'google-search-console');
  const token = firstEnv(env, def.required.access_token);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://searchconsole.googleapis.com/webmasters/v3';
  const siteUrl = clean(request.payload.siteUrl || request.payload.site_url || '', 500);
  if (!siteUrl) return { ok: false, status: 400, error: 'gsc_site_url_required' };
  const endDate = clean(request.payload.endDate || request.payload.end_date || new Date().toISOString().slice(0, 10), 40);
  const startDate = clean(request.payload.startDate || request.payload.start_date || new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10), 40);
  const rowLimit = Math.max(1, Math.min(25000, Number(request.payload.rowLimit || request.payload.row_limit || 1000) || 1000));
  if (request.sandbox) return { ok: true, sandbox: true, provider_call_made: false, result: { id: `gsc_sandbox_${request.id}`, status: 'queried', object: 'gsc.search_analytics', rows: [] } };
  if (!token) return { ok: false, status: 503, error: 'gsc_not_configured' };
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions: Array.isArray(request.payload.dimensions) ? request.payload.dimensions : ['query', 'page'], rowLimit })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.message || 'gsc_query_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: `gsc_${request.id}`, status: 'queried', object: 'gsc.search_analytics', rows: Array.isArray(data.rows) ? data.rows.slice(0, rowLimit) : [] } };
}

function googleCalendarConfig(env) {
  const def = PROVIDERS.find((item) => item.id === 'google-calendar');
  const calendarId = firstEnv(env, def.required.calendar_id);
  const clientEmail = firstEnv(env, def.required.client_email);
  const privateKey = firstEnv(env, def.required.private_key);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://www.googleapis.com/calendar/v3';
  const tokenUrl = firstEnv(env, def.optional.token_url) || 'https://oauth2.googleapis.com/token';
  const timezone = firstEnv(env, def.optional.timezone) || 'America/Phoenix';
  const missing = [];
  if (!calendarId) missing.push('GOOGLE_CALENDAR_ID');
  if (!clientEmail) missing.push('GOOGLE_CLIENT_EMAIL');
  if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');
  return { configured: !missing.length, missing, calendarId, clientEmail, privateKey, apiBase, tokenUrl, timezone };
}

async function googleCalendarAccessToken(env) {
  const config = googleCalendarConfig(env);
  if (!config.configured) return { ok: false, configured: false, missing: config.missing, error: 'google_calendar_not_configured' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: config.tokenUrl,
    iat: issuedAt,
    exp: issuedAt + 3600
  };
  const unsigned = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(claim)}`;
  try {
    const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8Bytes(config.privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
    const assertion = `${unsigned}.${bytesToBase64Url(signature)}`;
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString()
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) return { ok: false, configured: true, status: response.status, error: clean(data.error_description || data.error || 'google_oauth_failed', 500) };
    return { ok: true, configured: true, accessToken: data.access_token, calendarId: config.calendarId, timezone: config.timezone, apiBase: config.apiBase };
  } catch (error) {
    return { ok: false, configured: true, error: clean(error?.message || 'google_calendar_token_failed', 500) };
  }
}

async function callGoogleCalendar(env, request) {
  const action = request.action;
  if (request.sandbox) {
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `google_calendar_sandbox_${request.id}`,
        status: 'sandbox_executed',
        object: action === 'google.calendar.events.list' ? 'calendar.events' : 'calendar.event',
        htmlLink: ''
      }
    };
  }
  const token = await googleCalendarAccessToken(env);
  if (!token.ok) return { ok: false, status: token.status || 503, error: token.error || 'google_calendar_not_configured', provider_call_made: false, result: { id: '', status: 'failed', object: action.replace('google.', '') } };
  if (action === 'google.calendar.events.list') {
    const timeMin = clean(request.payload.timeMin || request.payload.time_min || new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), 80);
    const timeMax = clean(request.payload.timeMax || request.payload.time_max || new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(), 80);
    const maxResults = Math.min(100, Math.max(1, Number(request.payload.limit || request.payload.maxResults || 25) || 25));
    const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: String(maxResults) });
    const response = await fetch(`${token.apiBase.replace(/\/+$/, '')}/calendars/${encodeURIComponent(token.calendarId)}/events?${params.toString()}`, {
      headers: { authorization: `Bearer ${token.accessToken}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.error || 'google_calendar_list_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
    return {
      ok: true,
      status: response.status,
      provider_call_made: true,
      result: {
        id: token.calendarId,
        status: 'listed',
        object: 'calendar.events',
        calendar_id: token.calendarId,
        count: Array.isArray(data.items) ? data.items.length : 0,
        events: Array.isArray(data.items) ? data.items.slice(0, 25).map((item) => ({
          id: clean(item.id || '', 180),
          summary: clean(item.summary || '', 240),
          status: clean(item.status || '', 80),
          htmlLink: clean(item.htmlLink || '', 800),
          start: item.start || null,
          end: item.end || null,
          attendees: Array.isArray(item.attendees) ? item.attendees.slice(0, 25).map((attendee) => ({ email: clean(attendee.email || '', 240), responseStatus: clean(attendee.responseStatus || '', 80) })) : []
        })) : []
      }
    };
  }
  const startAt = clean(request.payload.start_at || request.payload.startAt || '', 120);
  const endAt = clean(request.payload.end_at || request.payload.endAt || '', 120);
  if (!startAt || !endAt) return { ok: false, status: 400, error: 'google_calendar_start_and_end_required' };
  const attendee = clean(request.payload.attendee_email || request.payload.attendeeEmail || request.payload.email || '', 240);
  const payload = {
    summary: clean(request.payload.summary || request.payload.topic || request.payload.title || '0S calendar event', 240),
    description: clean(request.payload.description || request.payload.notes || '', 5000),
    start: { dateTime: startAt, timeZone: clean(request.payload.timezone || request.payload.timeZone || token.timezone, 120) || token.timezone },
    end: { dateTime: endAt, timeZone: clean(request.payload.timezone || request.payload.timeZone || token.timezone, 120) || token.timezone },
    attendees: attendee ? [{ email: attendee }] : [],
    reminders: { useDefault: true },
    extendedProperties: { private: request.payload.metadata && typeof request.payload.metadata === 'object' ? request.payload.metadata : {} }
  };
  const sendUpdates = clean(request.payload.sendUpdates || request.payload.send_updates || 'all', 20);
  const response = await fetch(`${token.apiBase.replace(/\/+$/, '')}/calendars/${encodeURIComponent(token.calendarId)}/events?sendUpdates=${encodeURIComponent(sendUpdates)}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token.accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: clean(data.error?.message || data.error || 'google_calendar_event_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
  return {
    ok: true,
    status: response.status,
    provider_call_made: true,
    result: {
      id: clean(data.id || request.id, 180),
      status: clean(data.status || 'created', 80),
      object: 'calendar.event',
      htmlLink: clean(data.htmlLink || '', 800),
      hangoutLink: clean(data.hangoutLink || '', 800),
      start: data.start || null,
      end: data.end || null,
      attendees: Array.isArray(data.attendees) ? data.attendees.slice(0, 25).map((attendeeItem) => ({ email: clean(attendeeItem.email || '', 240), responseStatus: clean(attendeeItem.responseStatus || '', 80) })) : []
    }
  };
}

async function callNetlifyDeploy(env, request) {
  const def = PROVIDERS.find((item) => item.id === 'netlify');
  const token = firstEnv(env, def.required.auth_token);
  const defaultSiteId = firstEnv(env, def.required.site_id);
  const apiBase = firstEnv(env, def.optional.api_base) || 'https://api.netlify.com/api/v1';
  const action = request.action;
  if (action === 'netlify.deploy.create') {
    const siteId = clean(request.payload.site_id || request.payload.siteId || defaultSiteId, 240);
    const files = request.payload.files && typeof request.payload.files === 'object' ? request.payload.files : {};
    const qs = new URLSearchParams();
    const branch = clean(request.payload.branch || '', 120);
    const title = clean(request.payload.title || request.payload.name || '', 240);
    if (branch) qs.set('branch', branch);
    if (title) qs.set('title', title);
    const sandboxRequired = Object.values(files).map((item) => clean(item, 500)).filter(Boolean);
    if (!siteId) return { ok: false, status: 400, error: 'netlify_site_id_required' };
    if (request.sandbox) {
      return { ok: true, sandbox: true, provider_call_made: false, result: { id: `netlify_sandbox_${request.id}`, deploy_id: `netlify_sandbox_${request.id}`, state: 'created', status: 'created', object: 'netlify.deploy', required: sandboxRequired, url: `https://netlify-sandbox.example/${request.id}`, ssl_url: `https://netlify-sandbox.example/${request.id}`, deploy_ssl_url: `https://netlify-sandbox.example/${request.id}` } };
    }
    if (!token) return { ok: false, status: 503, error: 'netlify_not_configured' };
    const response = await fetch(`${apiBase.replace(/\/+$/, '')}/sites/${encodeURIComponent(siteId)}/deploys${qs.toString() ? `?${qs.toString()}` : ''}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ async: request.payload.async !== false, files, draft: request.payload.draft === true })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'netlify_deploy_create_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
    const url = clean(data.ssl_url || data.deploy_ssl_url || data.url || '', 800);
    return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.id || data.deploy_id || request.id, 220), deploy_id: clean(data.id || data.deploy_id || request.id, 220), state: clean(data.state || 'created', 120), status: clean(data.state || 'created', 120), object: 'netlify.deploy', required: Array.isArray(data.required) ? data.required.slice(0, 250).map((item) => clean(item, 500)) : [], url, ssl_url: clean(data.ssl_url || url, 800), deploy_ssl_url: clean(data.deploy_ssl_url || url, 800), error_message: clean(data.error_message || '', 500) } };
  }
  const deployId = clean(request.payload.deploy_id || request.payload.deployId || request.payload.id || '', 240);
  if (!deployId) return { ok: false, status: 400, error: 'netlify_deploy_id_required' };
  if (action === 'netlify.deploy.get') {
    const siteId = clean(request.payload.site_id || request.payload.siteId || '', 240);
    if (request.sandbox) {
      return { ok: true, sandbox: true, provider_call_made: false, result: { id: deployId, deploy_id: deployId, state: request.payload.state || 'ready', status: request.payload.state || 'ready', object: 'netlify.deploy', required: [], url: `https://netlify-sandbox.example/${deployId}`, ssl_url: `https://netlify-sandbox.example/${deployId}`, deploy_ssl_url: `https://netlify-sandbox.example/${deployId}` } };
    }
    if (!token) return { ok: false, status: 503, error: 'netlify_not_configured' };
    const path = siteId
      ? `/sites/${encodeURIComponent(siteId)}/deploys/${encodeURIComponent(deployId)}`
      : `/deploys/${encodeURIComponent(deployId)}`;
    const response = await fetch(`${apiBase.replace(/\/+$/, '')}${path}`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: response.status, error: clean(data.message || data.error || 'netlify_deploy_get_failed', 500), provider_call_made: true, result: publicProviderResult(data) };
    const url = clean(data.ssl_url || data.deploy_ssl_url || data.url || '', 800);
    return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(data.id || deployId, 220), deploy_id: clean(data.id || deployId, 220), state: clean(data.state || 'unknown', 120), status: clean(data.state || 'unknown', 120), object: 'netlify.deploy', required: Array.isArray(data.required) ? data.required.slice(0, 250).map((item) => clean(item, 500)) : [], url, ssl_url: clean(data.ssl_url || url, 800), deploy_ssl_url: clean(data.deploy_ssl_url || url, 800), error_message: clean(data.error_message || data.message || '', 500) } };
  }
  const filePath = clean(request.payload.path || request.payload.file_path || request.payload.filePath || '', 800);
  if (!filePath) return { ok: false, status: 400, error: 'netlify_file_path_required' };
  const contentType = clean(request.payload.content_type || request.payload.contentType || 'application/octet-stream', 120);
  const bodyBytes = request.payload.content_base64
    ? base64ToBytes(request.payload.content_base64)
    : new TextEncoder().encode(typeof request.payload.content === 'string' ? request.payload.content : JSON.stringify(request.payload.content ?? ''));
  if (request.sandbox) {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `${deployId}:${filePath}`, status: 'uploaded', object: 'netlify.deploy.file', bytes: bodyBytes.byteLength } };
  }
  if (!token) return { ok: false, status: 503, error: 'netlify_not_configured' };
  const uploadPath = filePath.replace(/^\/+/, '').split('/').map((part) => encodeURIComponent(part)).join('/');
  const response = await fetch(`${apiBase.replace(/\/+$/, '')}/deploys/${encodeURIComponent(deployId)}/files/${uploadPath}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
    body: bodyBytes
  });
  const text = await response.text().catch(() => '');
  if (!response.ok) return { ok: false, status: response.status, error: clean(text || 'netlify_file_upload_failed', 500), provider_call_made: true, result: { id: `${deployId}:${filePath}`, status: 'failed', object: 'netlify.deploy.file' } };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: `${deployId}:${filePath}`, status: 'uploaded', object: 'netlify.deploy.file', bytes: bodyBytes.byteLength } };
}

function httpsTarget(rawUrl = '', label = 'url') {
  const value = clean(rawUrl, 2000);
  let target;
  try {
    target = new URL(value);
  } catch {
    return { ok: false, error: `${label}_invalid` };
  }
  if (target.protocol !== 'https:') return { ok: false, error: `${label}_must_be_https` };
  return { ok: true, url: target.toString() };
}

function safeDispatchHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {}).slice(0, 40)) {
    const cleanKey = clean(key, 120).toLowerCase();
    if (!/^[a-z0-9-]+$/.test(cleanKey)) continue;
    if (['host', 'content-length', 'connection'].includes(cleanKey)) continue;
    out[cleanKey] = clean(value, 2000);
  }
  return out;
}

async function textJsonResponse(response, maxText = 200000) {
  const text = await response.text().catch(() => '');
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: clean(text, maxText) }; }
  return { text: clean(text, maxText), data };
}

async function signedJsonHeaders(secret, body, eventType, headers = {}, options = {}) {
  const signingSecret = clean(secret, 2000);
  if (!signingSecret || signingSecret.length < 16) return { ok: false, error: 'commerce_signing_secret_required' };
  const signatureScheme = clean(options.signature_scheme || options.signatureScheme || '', 80).toLowerCase();
  const timestamp = clean(options.timestamp || now(), 80);
  const signingPayload = signatureScheme === 'skyeroutex' ? `${timestamp}.${body}` : body;
  const signature = await hmacHex(new TextEncoder().encode(signingSecret), signingPayload);
  return {
    ok: true,
    headers: {
      'content-type': 'application/json',
      'user-agent': 'SkyeCommerce-ProviderRuntime/1.0',
      'x-skye-event': clean(eventType || 'commerce.provider', 160),
      ...(signatureScheme === 'skyeroutex'
        ? { 'x-skyeroutex-timestamp': timestamp, 'x-skyeroutex-signature': `sha256=${signature}` }
        : { 'x-skye-signature': `sha256=${signature}` }),
      ...safeDispatchHeaders(headers)
    }
  };
}

async function callCommerceHttp(env, request) {
  const action = request.action;
  const target = httpsTarget(request.payload.url || request.payload.endpoint || firstEnv(env, ['ROUTEX_INGEST_URL']), 'commerce_http_url');
  if (!target.ok) return { ok: false, status: 400, error: target.error };
  if (request.sandbox) {
    const object = action.replace('commerce.', '').replace('shopify.', 'shopify.');
    return {
      ok: true,
      sandbox: true,
      provider_call_made: false,
      result: {
        id: `commerce_http_sandbox_${request.id}`,
        status: action === 'commerce.url.fetch_html' ? 'fetched' : 'delivered',
        object,
        http_status: 200,
        provider_reference: `commerce_http_sandbox_${request.id}`,
        response: action === 'commerce.url.fetch_html' ? { raw: '<html><head><title>Sandbox storefront</title></head><body></body></html>' } : { ok: true }
      }
    };
  }

  if (action === 'commerce.url.fetch_html') {
    const response = await fetch(target.url, { headers: { 'user-agent': clean(request.payload.user_agent || request.payload.userAgent || 'SkyeCommerce-ProviderRuntimeIngest/1.0', 160) } });
    const parsed = await textJsonResponse(response);
    if (!response.ok) return { ok: false, status: response.status, error: clean(parsed.text || 'commerce_url_fetch_failed', 500), provider_call_made: true, result: { id: request.id, status: 'failed', object: 'url.fetch_html', http_status: response.status } };
    return { ok: true, status: response.status, provider_call_made: true, result: { id: request.id, status: 'fetched', object: 'url.fetch_html', http_status: response.status, response: { raw: parsed.text } } };
  }

  let init = { method: clean(request.payload.method || 'POST', 12).toUpperCase(), headers: safeDispatchHeaders(request.payload.headers || {}) };
  if (action === 'commerce.signed_json.post') {
    const body = JSON.stringify(request.payload.body || request.payload.payload || {});
    const signed = await signedJsonHeaders(request.payload.secret || firstEnv(env, ['COMMERCE_HTTP_SIGNING_SECRET']), body, request.payload.event_type || request.payload.eventType || 'commerce.sync', request.payload.headers || {}, request.payload);
    if (!signed.ok) return { ok: false, status: 400, error: signed.error };
    init = { method: 'POST', headers: signed.headers, body };
  } else if (action === 'commerce.routex.handoff') {
    const token = clean(request.payload.auth_token || request.payload.authToken || firstEnv(env, ['ROUTEX_INGEST_TOKEN']), 2000);
    if (!token || token.length < 16) return { ok: false, status: 400, error: 'routex_ingest_token_required' };
    init = { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'user-agent': 'SkyeCommerce-RoutexProviderRuntime/1.0' }, body: JSON.stringify(request.payload.body || request.payload.payload || {}) };
  } else if (action === 'commerce.webhook.deliver') {
    init.body = typeof request.payload.body === 'string' ? request.payload.body : JSON.stringify(request.payload.body || {});
    if (!init.headers['content-type']) init.headers['content-type'] = 'application/json';
  } else if (action === 'shopify.graphql.import') {
    const token = clean(request.payload.access_token || request.payload.accessToken || '', 4000);
    if (!token) return { ok: false, status: 400, error: 'shopify_access_token_required' };
    init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-shopify-access-token': token },
      body: JSON.stringify({ query: request.payload.query || '', variables: request.payload.variables || {} })
    };
  } else {
    return { ok: false, status: 501, error: 'commerce_http_action_not_supported' };
  }

  const response = await fetch(target.url, init);
  const parsed = await textJsonResponse(response);
  const providerReference = response.headers.get('x-request-id') || response.headers.get('x-skye-ref') || parsed.data?.id || parsed.data?.routePacketId || parsed.data?.workOrderId || parsed.data?.jobId || parsed.data?.request_id || '';
  if (!response.ok) return { ok: false, status: response.status, error: clean(parsed.text || 'commerce_http_dispatch_failed', 500), provider_call_made: true, result: { id: clean(providerReference || request.id, 180), status: 'failed', object: action.replace('commerce.', '').replace('shopify.', 'shopify.'), http_status: response.status, provider_reference: clean(providerReference, 240), response: parsed.data || {} } };
  return { ok: true, status: response.status, provider_call_made: true, result: { id: clean(providerReference || request.id, 180), status: action === 'shopify.graphql.import' ? 'imported' : 'delivered', object: action.replace('commerce.', '').replace('shopify.', 'shopify.'), http_status: response.status, provider_reference: clean(providerReference, 240), response: parsed.data || {} } };
}

async function callProvider(env, request) {
  if (request.provider_id === 'twilio' && request.action === 'twilio.sms.send') return callTwilioSms(env, request);
  if (request.provider_id === 'twilio' && request.action === 'twilio.voice.call') return callTwilioVoice(env, request);
  if (request.provider_id === 'twilio' && request.action === 'twilio.message.status') return callTwilioMessageStatus(env, request);
  if (request.provider_id === 'resend' && request.action === 'resend.email.send') return callResendEmail(env, request);
  if (request.provider_id === 'resend' && request.action === 'resend.domains.list') return callResendDomainsList(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.account.retrieve') return callStripeAccountRetrieve(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.balance.retrieve') return callStripeBalanceRetrieve(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.checkout.create') return callStripeCheckout(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.checkout.retrieve') return callStripeCheckoutRetrieve(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.webhook.lifecycle') return callStripeWebhookLifecycle(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.payment_intent.create') return callStripePaymentIntentCreate(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.payment_intent.retrieve') return callStripePaymentIntentRetrieve(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.payment_intent.capture') return callStripePaymentIntentCapture(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.terminal.reader.process_payment_intent') return callStripeTerminalReaderProcessPaymentIntent(env, request);
  if (request.provider_id === 'stripe' && ['stripe.refund.create', 'stripe.refund.review'].includes(request.action)) return callStripeRefundCreate(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.refund.retrieve') return callStripeRefundRetrieve(env, request);
  if (request.provider_id === 'stripe' && request.action === 'stripe.dispute.evidence.submit') return callStripeDisputeEvidenceSubmit(env, request);
  if (request.provider_id === 'paypal' && request.action.startsWith('paypal.')) return callPaypal(env, request);
  if (request.provider_id === 'ups' && request.action.startsWith('ups.')) return callUps(env, request);
  if (request.provider_id === 'google_merchant' && request.action.startsWith('google_merchant.')) return callGoogleMerchant(env, request);
  if (request.provider_id === 'meta_catalog' && request.action.startsWith('meta_catalog.')) return callMetaCatalog(env, request);
  if (request.provider_id === 'tiktok_catalog' && request.action.startsWith('tiktok_catalog.')) return callTiktokCatalog(env, request);
  if (request.provider_id === 'mapbox' && request.action === 'mapbox.route.enrich') return callMapboxRoute(env, request);
  if (request.provider_id === 'mapbox' && request.action === 'mapbox.geocode') return callMapboxGeocode(env, request);
  if (request.provider_id === 'checkr' && request.action === 'checkr.background_check.request') return callCheckrBackground(env, request);
  if (request.provider_id === 'certn' && request.action === 'certn.background_check.request') return callCertnBackground(env, request);
  if (request.provider_id === 'cloudflare-r2' && ['storage.object.put', 'storage.object.receipt'].includes(request.action)) return callStorageReceipt(env, request);
  if (request.provider_id === 'skymail' && request.action.startsWith('skymail.')) return callSkyeMail(env, request);
  if (request.provider_id === 'relay13' && request.action.startsWith('relay13.')) return callRelay13(env, request);
  if (request.provider_id === 'skynet' && request.action.startsWith('skynet.')) return callSkyeNetRuntime(env, request);
  if (request.provider_id === 'openai' && request.action === 'openai.image.generate') return callOpenAiImage(env, request);
  if (request.provider_id === 'openai' && request.action === 'openai.chat.complete') return callOpenAiChat(env, request);
  if (request.provider_id === 'anthropic' && request.action === 'anthropic.chat.complete') return callAnthropicChat(env, request);
  if (request.provider_id === 'gemini' && request.action === 'gemini.chat.complete') return callGeminiChat(env, request);
  if (request.provider_id === 'gemini' && request.action === 'gemini.embedding.create') return callGeminiEmbedding(env, request);
  if (request.provider_id === 'elevenlabs' && request.action === 'elevenlabs.music.generate') return callElevenLabsMusic(env, request);
  if (request.provider_id === 'stability' && request.action === 'stability.audio.generate') return callStabilityAudio(env, request);
  if (request.provider_id === 'fediverse' && request.action === 'fediverse.media.upload') return callFediverseMediaUpload(env, request);
  if (request.provider_id === 'fediverse' && request.action === 'fediverse.status.publish') return callFediverseStatusPublish(env, request);
  if (request.provider_id === 'fediverse' && request.action === 'fediverse.feed.sync') return callFediverseFeedSync(env, request);
  if (request.provider_id === 'cloudflare' && request.action === 'cloudflare.token.verify') return callCloudflareTokenVerify(env, request);
  if (request.provider_id === 'cloudflare' && request.action.startsWith('cloudflare.custom_hostname.')) return callCloudflareCustomHostname(env, request);
  if (request.provider_id === 'dns' && request.action === 'dns.txt.lookup') return callDnsTxtLookup(env, request);
  if (request.provider_id === 'semrush' && request.action === 'semrush.domain_organic.pull') return callSemrushDomainOrganic(env, request);
  if (request.provider_id === 'google-search-console' && request.action === 'gsc.search_analytics.query') return callGoogleSearchConsoleQuery(env, request);
  if (request.provider_id === 'google-calendar' && request.action.startsWith('google.calendar.')) return callGoogleCalendar(env, request);
  if (request.provider_id === 'netlify' && request.action.startsWith('netlify.deploy.')) return callNetlifyDeploy(env, request);
  if (request.provider_id === 'social-webhook' && ['content.dispatch', 'social.post.publish'].includes(request.action)) return callSocialWebhook(env, request);
  if (request.provider_id === 'commerce-http' && ['commerce.signed_json.post', 'commerce.routex.handoff', 'commerce.webhook.deliver', 'commerce.url.fetch_html', 'shopify.graphql.import'].includes(request.action)) return callCommerceHttp(env, request);
  if (request.sandbox || request.action === 'internal.receipt') {
    return { ok: true, sandbox: true, provider_call_made: false, result: { id: `${request.provider_id}_sandbox_${request.id}`, status: 'sandbox_executed' } };
  }
  return { ok: false, status: 501, error: 'provider_action_not_yet_executable_by_spine' };
}

async function mirrorCommandBridge(env, receipt, auth) {
  const kv = store(env);
  if (!kv?.put) return { ok: false, skipped: true, reason: 'kv_unavailable' };
  const createdAt = now();
  const event = {
    schema: 'metraiyux.0s.command-bridge.event.v1',
    id: `cmd_evt_${receipt.id}`,
    type: '0s.provider_execution',
    event_type: '0s.provider_execution',
    created_at: createdAt,
    event_ts: createdAt,
    source_app: receipt.app_id || '0s-provider-runtime',
    source_surface: '/api/0s/automation/execute',
    lane: 'automation',
    status: receipt.status,
    summary: `${receipt.provider_id}.${receipt.action} ${receipt.status}`,
    actor: actor(auth),
    entity: { kind: 'provider_receipt', id: receipt.id, label: receipt.action },
    ids: {
      receipt_id: receipt.id,
      workspace_id: receipt.workspace_id || '',
      customer_id: receipt.customer_id || '',
      client_id: receipt.client_id || '',
      provider_id: receipt.provider_id
    },
    crm: { contact_email: '', contact_name: '', account: receipt.client_id || receipt.customer_id || '', stage: receipt.status, owner: actor(auth) },
    money: { amount_cents: receipt.estimated_cost_cents || 0, currency: 'USD', provider: receipt.provider_id },
    links: [{ label: 'Provider receipt', href: `/api/0s/automation/receipts?id=${encodeURIComponent(receipt.id)}`, kind: 'receipt' }],
    metadata: {
      action: receipt.action,
      executed: String(receipt.executed),
      provider_call_made: String(receipt.provider_call_made),
      usage_lane: receipt.usage_lane
    },
    raw_private_payload_stored: false
  };
  await kv.put(`${COMMAND_BRIDGE_PREFIX}${event.created_at}:${event.id}`, JSON.stringify(event), { expirationTtl: TTL_YEAR });
  return { ok: true, event_id: event.id };
}

async function mirrorFs27(env, deps, receipt, auth) {
  if (!deps?.mirrorSkygateEvent) return { ok: false, skipped: true, reason: 'mirror_helper_unavailable' };
  return deps.mirrorSkygateEvent(env, {
    actor: actor(auth),
    type: '0s.provider_execution',
    ws_id: receipt.workspace_id || receipt.id,
    meta: {
      receipt_id: receipt.id,
      provider_id: receipt.provider_id,
      action: receipt.action,
      app_id: receipt.app_id,
      workspace_id: receipt.workspace_id,
      customer_id: receipt.customer_id,
      client_id: receipt.client_id,
      usage_lane: receipt.usage_lane,
      status: receipt.status,
      executed: receipt.executed,
      provider_call_made: receipt.provider_call_made,
      billable: true,
      estimated_cost_cents: receipt.estimated_cost_cents,
      chargeback_ready: true
    }
  }, auth.gate || null).catch((error) => ({ ok: false, error: clean(error?.message || error, 300) }));
}

async function storeReceipt(env, receipt) {
  const stored = await kvPut(`${RECEIPT_PREFIX}${receipt.id}`, receipt, env);
  if (stored) await pushIndex(env, RECEIPT_INDEX_KEY, receipt);
  return stored;
}

async function storeDeadLetter(env, receipt, request, reason) {
  const receiptSnapshot = { ...receipt };
  delete receiptSnapshot.dead_letter;
  const item = {
    id: receipt.id,
    schema: 'metraiyux.0s.provider-dead-letter.v1',
    status: 'dead_letter',
    reason: clean(reason || receipt.error || 'provider_execution_failed', 500),
    receipt: receiptSnapshot,
    retry_count: 0,
    retryHistory: [],
    request: {
      ...request,
      payload: {
        ...request.payload,
        body: request.payload?.body ? '[redacted-body-stored-in-receipt-boundary]' : request.payload?.body,
        message: request.payload?.message ? '[redacted-message-stored-in-receipt-boundary]' : request.payload?.message,
        messages: request.payload?.messages ? '[redacted-messages-stored-in-receipt-boundary]' : request.payload?.messages,
        prompt: request.payload?.prompt ? '[redacted-prompt-stored-in-receipt-boundary]' : request.payload?.prompt,
        text: request.payload?.text ? '[redacted-text-stored-in-receipt-boundary]' : request.payload?.text,
        html: request.payload?.html ? '[redacted-html-stored-in-receipt-boundary]' : request.payload?.html,
        content: request.payload?.content ? '[redacted-content-stored-in-receipt-boundary]' : request.payload?.content,
        content_base64: request.payload?.content_base64 ? '[redacted-content-base64-stored-in-receipt-boundary]' : request.payload?.content_base64,
        secret: request.payload?.secret ? '[redacted-secret-stored-in-receipt-boundary]' : request.payload?.secret,
        token: request.payload?.token ? '[redacted-token-stored-in-receipt-boundary]' : request.payload?.token,
        auth_token: request.payload?.auth_token ? '[redacted-auth-token-stored-in-receipt-boundary]' : request.payload?.auth_token,
        authToken: request.payload?.authToken ? '[redacted-auth-token-stored-in-receipt-boundary]' : request.payload?.authToken,
        access_token: request.payload?.access_token ? '[redacted-access-token-stored-in-receipt-boundary]' : request.payload?.access_token,
        accessToken: request.payload?.accessToken ? '[redacted-access-token-stored-in-receipt-boundary]' : request.payload?.accessToken,
        headers: request.payload?.headers ? '[redacted-headers-stored-in-receipt-boundary]' : request.payload?.headers
      }
    },
    created_at: now()
  };
  const stored = await kvPut(`${DEAD_PREFIX}${item.id}`, item, env);
  if (stored) await pushIndex(env, DEAD_INDEX_KEY, item);
  return { id: item.id, status: item.status, reason: item.reason, stored };
}

function executionBoundaryFields(execution = {}, result = {}, ok = false) {
  const providerCallMade = Boolean(result?.provider_call_made);
  const action = clean(execution.action || '', 120);
  let executionMode = 'not_executed';
  let executedTrueScope = 'not_executed';
  if (ok && providerCallMade) {
    executionMode = 'live_provider_call';
    executedTrueScope = 'external_provider_call_confirmed';
  } else if (ok && action === 'internal.receipt') {
    executionMode = 'internal_receipt_executor';
    executedTrueScope = 'internal_receipt_executor';
  } else if (ok && result?.sandbox) {
    executionMode = 'sandbox_receipt';
    executedTrueScope = 'sandbox_receipt_only';
  } else if (ok) {
    executionMode = 'internal_runtime_receipt';
    executedTrueScope = 'internal_runtime_receipt';
  } else if (providerCallMade) {
    executionMode = 'live_provider_call_failed';
  } else {
    executionMode = 'blocked_or_failed_before_provider_call';
  }
  return {
    execution_mode: executionMode,
    executed_true_scope: executedTrueScope,
    external_provider_call_made: providerCallMade,
    external_provider_boundary: providerCallMade ? 'crossed' : 'not_crossed',
    external_boundary_note: providerCallMade
      ? 'A real external provider/backend HTTP boundary was called by the shared 0S provider runtime.'
      : 'No external provider/backend call is claimed by this receipt; inspect sandbox and provider_call_made separately.'
  };
}

async function executeAction(env, deps, requestBody, auth, options = {}) {
  const execution = normalizeExecution(requestBody, auth);
  execution.estimated_cost_cents = estimateCostCents(env, execution.provider_id, execution.action, execution.payload);
  const def = providerDef(execution.provider_id) || providerDef(execution.action);
  const provider = def ? providerStatus(env, def) : null;
  let grant = null;
  let grantDecision = { ok: false, error: 'no_automation_grant_supplied' };
  if (execution.approval_grant_id) {
    grant = await kvGet(`${GRANT_PREFIX}${execution.approval_grant_id}`, env);
    grantDecision = grantAllows(grant, execution);
  }
  const operatorApproved = options.operator_ok && execution.owner_approved;
  const liveAllowed = execution.live && (grantDecision.ok || operatorApproved);
  const base = {
    id: execution.id,
    schema: 'metraiyux.0s.provider-execution-receipt.v1',
    provider_id: execution.provider_id,
    provider_configured: provider?.configured === true,
    action: execution.action,
    app_id: execution.app_id,
    workspace_id: execution.workspace_id,
    customer_id: execution.customer_id,
    client_id: execution.client_id,
    usage_lane: execution.usage_lane,
    approval_grant_id: execution.approval_grant_id || null,
    actor: actor(auth),
    requested_live: execution.live,
    sandbox: execution.sandbox,
    estimated_cost_cents: execution.estimated_cost_cents,
    created_at: now()
  };
  if (execution.retry_of) {
    base.retry_of = execution.retry_of;
    base.retry_attempt = execution.retry_attempt || 1;
  }
  if (execution.live && !liveAllowed) {
    const receipt = {
      ...base,
      ok: false,
      executed: false,
      provider_call_made: false,
      external_provider_call_made: false,
      external_provider_boundary: 'not_crossed',
      execution_mode: 'blocked_pending_owner_approval',
      executed_true_scope: 'not_executed',
      status: 'approval_required',
      error: grantDecision.error || 'owner_approval_required',
      next: 'Create an owner automation grant or send owner_approved:true from an operator session.'
    };
    receipt.stored = await storeReceipt(env, receipt);
    await storeDeadLetter(env, receipt, execution, receipt.error);
    receipt.command_bridge = await mirrorCommandBridge(env, receipt, auth);
    receipt.fs27_mirror = await mirrorFs27(env, deps, receipt, auth);
    return { response: { ok: false, receipt }, status: 202 };
  }
  if (!execution.live && !execution.sandbox && execution.action !== 'internal.receipt') {
    const receipt = {
      ...base,
      ok: true,
      executed: false,
      provider_call_made: false,
      external_provider_call_made: false,
      external_provider_boundary: 'not_crossed',
      execution_mode: 'queued_for_owner_approval',
      executed_true_scope: 'not_executed',
      status: 'queued_for_owner_approval',
      next: 'Set live:true with an active owner automation grant to execute externally.'
    };
    receipt.stored = await storeReceipt(env, receipt);
    receipt.command_bridge = await mirrorCommandBridge(env, receipt, auth);
    receipt.fs27_mirror = await mirrorFs27(env, deps, receipt, auth);
    return { response: { ok: true, queued: true, receipt }, status: 202 };
  }
  const result = await callProvider(env, execution);
  const ok = result.ok === true;
  const receipt = {
    ...base,
    ok,
    executed: ok,
    provider_call_made: Boolean(result.provider_call_made),
    ...executionBoundaryFields(execution, result, ok),
    provider_result: result.result || null,
    status: ok ? (result.sandbox ? 'executed_sandbox' : 'executed') : 'failed',
    error: ok ? '' : clean(result.error || 'provider_execution_failed', 500),
    http_status: result.status || (ok ? 200 : 500),
    completed_at: now()
  };
  receipt.stored = await storeReceipt(env, receipt);
  if (ok) receipt.grant_usage = await updateGrantUsage(env, execution.approval_grant_id, receipt);
  if (!ok) receipt.dead_letter = await storeDeadLetter(env, receipt, execution, receipt.error);
  receipt.command_bridge = await mirrorCommandBridge(env, receipt, auth);
  receipt.fs27_mirror = await mirrorFs27(env, deps, receipt, auth);
  return { response: { ok, receipt }, status: ok ? 200 : receipt.http_status || 500 };
}

async function listReceipts(env, url) {
  const idParam = clean(listParam(url, 'id'), 160);
  if (idParam) {
    const receipt = await kvGet(`${RECEIPT_PREFIX}${idParam}`, env);
    return { ok: Boolean(receipt), receipt };
  }
  const limit = Math.max(1, Math.min(250, Number(listParam(url, 'limit', '100')) || 100));
  const items = (await readIndex(env, RECEIPT_INDEX_KEY)).slice(0, limit);
  return { ok: true, count: items.length, items };
}

export async function recordZeroOsProviderUsageCallback(env, deps = {}, body = {}, auth = {}) {
  const receiptId = clean(body.receipt_id || body.receiptId || body.provider_runtime_receipt_id || body.providerRuntimeReceiptId || body.id, 180);
  if (!receiptId) return { response: { ok: false, error: 'provider_runtime_receipt_id_required' }, status: 400 };
  const receipt = await kvGet(`${RECEIPT_PREFIX}${receiptId}`, env);
  if (!receipt) return { response: { ok: false, error: 'provider_runtime_receipt_not_found', receipt_id: receiptId }, status: 404 };
  const callback = {
    id: clean(body.callback_id || body.callbackId || id('provider_callback'), 180),
    schema: 'metraiyux.0s.provider-usage-callback.v1',
    receipt_id: receiptId,
    provider_id: clean(body.provider_id || body.providerId || receipt.provider_id, 120),
    action: clean(body.action || receipt.action, 180),
    usage_lane: clean(body.usage_lane || body.usageLane || receipt.usage_lane, 180),
    status: clean(body.status || body.provider_status || body.providerStatus || 'provider_callback_recorded', 180),
    provider_call_made: body.provider_call_made !== false && body.providerCallMade !== false,
    provider_message_id: clean(body.provider_message_id || body.providerMessageId || body.message_id || body.messageId || '', 240),
    provider_conversation_id: clean(body.provider_conversation_id || body.providerConversationId || body.conversation_id || body.conversationId || '', 240),
    http_status: Number(body.http_status || body.httpStatus || 0) || null,
    provider_result: body.provider_result && typeof body.provider_result === 'object' ? publicProviderResult(body.provider_result) : null,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    recorded_by: actor(auth),
    recorded_at: now()
  };
  const callbacks = Array.isArray(receipt.provider_callbacks) ? receipt.provider_callbacks : [];
  receipt.provider_callbacks = [callback, ...callbacks.filter((item) => item.id !== callback.id)].slice(0, 50);
  receipt.provider_callback_count = receipt.provider_callbacks.length;
  receipt.provider_callback_last = callback;
  receipt.provider_callback_call_made = receipt.provider_callback_call_made || callback.provider_call_made;
  receipt.updated_at = now();
  receipt.stored = await kvPut(`${RECEIPT_PREFIX}${receipt.id}`, receipt, env);
  await pushIndex(env, RECEIPT_INDEX_KEY, receipt);
  const mirrorReceipt = {
    ...receipt,
    status: callback.status,
    provider_call_made: callback.provider_call_made,
    usage_lane: callback.usage_lane || receipt.usage_lane
  };
  callback.command_bridge = await mirrorCommandBridge(env, {
    ...mirrorReceipt,
    id: `${receipt.id}:${callback.id}`,
    action: `${receipt.action}.callback`
  }, auth);
  callback.fs27_mirror = await mirrorFs27(env, deps, mirrorReceipt, auth);
  await kvPut(`${RECEIPT_PREFIX}${receipt.id}`, receipt, env);
  return { response: { ok: true, receipt, callback }, status: 200 };
}

async function retryDeadLetter(env, deps, body, auth) {
  const targetId = clean(body.id || body.receipt_id || body.dead_letter_id, 160);
  if (!targetId) return { response: { ok: false, error: 'dead_letter_id_required' }, status: 400 };
  const dead = await kvGet(`${DEAD_PREFIX}${targetId}`, env);
  if (!dead?.request) return { response: { ok: false, error: 'dead_letter_not_found' }, status: 404 };
  const retryAttempt = Number(dead.retry_count || 0) + 1;
  const retryBody = {
    ...dead.request,
    ...(body.overrides && typeof body.overrides === 'object' ? body.overrides : {}),
    id: id('provider_retry'),
    retry_of: targetId,
    retry_attempt: retryAttempt,
    owner_approved: body.owner_approved !== false,
    sandbox: body.sandbox ?? dead.request.sandbox,
    live: body.live ?? dead.request.live
  };
  const result = await executeAction(env, deps, retryBody, auth, { operator_ok: true });
  const retryReceipt = result.response?.receipt || null;
  const retryEntry = {
    attempt: retryAttempt,
    status: retryReceipt?.executed ? 'retried_and_closed' : 'retry_failed',
    receipt_id: retryReceipt?.id || '',
    queued_at: retryBody.created_at || now(),
    completed_at: retryReceipt?.completed_at || now(),
    actor: actor(auth),
    execution_mode: retryReceipt?.execution_mode || '',
    external_provider_call_made: Boolean(retryReceipt?.external_provider_call_made || retryReceipt?.provider_call_made),
    error: retryReceipt?.error || ''
  };
  dead.retry_count = retryAttempt;
  dead.status = retryEntry.status;
  dead.last_retry_at = retryEntry.completed_at;
  dead.last_retry_receipt_id = retryEntry.receipt_id;
  dead.retryHistory = [retryEntry, ...(Array.isArray(dead.retryHistory) ? dead.retryHistory : [])].slice(0, 25);
  await kvPut(`${DEAD_PREFIX}${targetId}`, dead, env);
  await pushIndex(env, DEAD_INDEX_KEY, dead);
  result.response.retry_of = targetId;
  result.response.retry_attempt = retryAttempt;
  return result;
}

async function requireGate(request, env, deps, label) {
  if (!deps?.requireGateAuth) return { ok: false, response: json({ ok: false, error: 'Shared gate helper unavailable.' }, 500) };
  return deps.requireGateAuth(request, env, label);
}

async function requireOperator(request, env, deps, label) {
  if (!deps?.requireOperatorAuth) return { ok: false, response: json({ ok: false, error: 'Operator auth helper unavailable.' }, 500) };
  return deps.requireOperatorAuth(request, env, label);
}

export function zeroOsProviderCatalog(env = {}) {
  return providerCatalog(env);
}

export async function createZeroOsAutomationGrant(env, body = {}, auth = {}) {
  if (!store(env)?.put) {
    return { ok: false, status: 503, error: 'automation_storage_not_configured' };
  }
  const grant = makeGrant(body, auth);
  await kvPut(`${GRANT_PREFIX}${grant.id}`, grant, env);
  await pushIndex(env, GRANT_INDEX_KEY, grant);
  return { ok: true, status: 201, grant };
}

export async function executeZeroOsAutomationAction(env, deps = {}, requestBody = {}, auth = {}, options = {}) {
  return executeAction(env, deps, requestBody, auth, options);
}

export function providerRuntimeAppPublic(env = {}) {
  const catalog = providerCatalog(env);
  return {
    id: 'zeroOsProviderRuntime',
    name: '0S Provider Runtime',
    base: AUTOMATION_BASE,
    aliases: [PROVIDER_BASE, `${AUTOMATION_BASE}/execute`, `${AUTOMATION_BASE}/grants`],
    health: `${AUTOMATION_BASE}/status`,
    mounted: true,
    status: 'LIVE/GATED',
    routing_model: '0s_builtin_provider_runtime',
    service_binding: null,
    origin_env: null,
    target_base: AUTOMATION_BASE,
    note: `Whole-0S provider registry, approval grants, execution receipts, retry/dead-letter, FS27 mirror, and Command Bridge mirror. ${catalog.summary.configured}/${catalog.summary.total} providers configured.`
  };
}

export async function handleZeroOsAutomationRoute(request, env, ctx, url, deps = {}) {
  const isProvider = url.pathname.startsWith(PROVIDER_BASE);
  const isAutomation = url.pathname.startsWith(AUTOMATION_BASE);
  if (!isProvider && !isAutomation) return null;
  if (request.method === 'OPTIONS') return json({ ok: true });

  if (isProvider) {
    const auth = await requireOperator(request, env, deps, '0S provider registry');
    if (!auth.ok) return auth.response;
    if (url.pathname === `${PROVIDER_BASE}/status` || url.pathname === `${PROVIDER_BASE}/catalog` || url.pathname === PROVIDER_BASE) {
      return json(providerCatalog(env));
    }
    return json({ ok: false, error: 'provider_runtime_route_not_found', path: url.pathname }, 404);
  }

  if (url.pathname === `${AUTOMATION_BASE}/execute` && request.method === 'POST') {
    const auth = await requireGate(request, env, deps, '0S automation execution');
    if (!auth.ok) return auth.response;
    const body = await readJson(request);
    let operatorOk = false;
    if (!body.approval_grant_id && (body.owner_approved || body.operator_approved || body.approved)) {
      const operator = await requireOperator(request, env, deps, '0S automation owner execution');
      operatorOk = operator.ok === true;
    }
    const result = await executeAction(env, deps, body, auth, { operator_ok: operatorOk });
    return json(result.response, result.status);
  }

  const auth = await requireOperator(request, env, deps, '0S automation control');
  if (!auth.ok) return auth.response;

  if ((url.pathname === AUTOMATION_BASE || url.pathname === `${AUTOMATION_BASE}/status`) && request.method === 'GET') {
    const catalog = providerCatalog(env);
    const grants = await readIndex(env, GRANT_INDEX_KEY);
    const receipts = await readIndex(env, RECEIPT_INDEX_KEY);
    const dead = await readIndex(env, DEAD_INDEX_KEY);
    return json({
      ok: true,
      schema: 'metraiyux.0s.automation-runtime-status.v1',
      generated_at: now(),
      runtime_scope: 'whole-0s',
      founder_command_role: 'owner cockpit only',
      storage: store(env)?.put ? 'kv' : 'unavailable',
      providers: catalog.summary,
      grants: { total: grants.length, active: grants.filter(grantActive).length },
      receipts: { total: receipts.length, executed: receipts.filter((item) => item.executed).length },
      dead_letters: { total: dead.length },
      execution_semantics: {
        executed_true: 'Completed sandbox receipts, internal receipt executor runs, and real provider/backend responses can set executed:true.',
        external_provider_call: 'Only provider_call_made:true means an external provider/backend boundary was crossed.',
        retry: 'Dead-letter retries create a fresh receipt linked by retry_of and keep the original failed receipt immutable.'
      },
      routes: {
        providers: `${PROVIDER_BASE}/status`,
        grants: `${AUTOMATION_BASE}/grants`,
        execute: `${AUTOMATION_BASE}/execute`,
        receipts: `${AUTOMATION_BASE}/receipts`,
        provider_callbacks: `${AUTOMATION_BASE}/provider-callbacks`,
        dead_letters: `${AUTOMATION_BASE}/dead-letters`,
        retry: `${AUTOMATION_BASE}/retry`
      }
    });
  }

  if (url.pathname === `${AUTOMATION_BASE}/checklist` && request.method === 'GET') {
    return json({
      ok: true,
      schema: 'metraiyux.0s.provider-automation-closure-todo.v1',
      rule: 'Provider runtime belongs to the whole 0S; Founder Command is the owner cockpit over it.',
      items: CLOSURE_TODO.map(([id, priority, definition]) => ({ id, priority, status: CLOSURE_STATUS[id] || 'pending', definition_of_done: definition }))
    });
  }

  if (url.pathname === `${AUTOMATION_BASE}/grants` && request.method === 'POST') {
    const created = await createZeroOsAutomationGrant(env, await readJson(request), auth);
    if (!created.ok) return json({ ok: false, error: created.error }, created.status || 500);
    return json({ ok: true, grant: created.grant }, 201);
  }

  if (url.pathname === `${AUTOMATION_BASE}/grants` && request.method === 'GET') {
    const items = await readIndex(env, GRANT_INDEX_KEY);
    return json({ ok: true, count: items.length, items });
  }

  const revoke = url.pathname.match(/^\/api\/0s\/automation\/grants\/([^/]+)\/revoke$/);
  if (revoke && request.method === 'POST') {
    const grant = await kvGet(`${GRANT_PREFIX}${decodeURIComponent(revoke[1])}`, env);
    if (!grant) return json({ ok: false, error: 'automation_grant_not_found' }, 404);
    grant.status = 'revoked';
    grant.revoked_at = now();
    grant.revoked_by = actor(auth);
    await kvPut(`${GRANT_PREFIX}${grant.id}`, grant, env);
    await pushIndex(env, GRANT_INDEX_KEY, grant);
    return json({ ok: true, grant });
  }

  if (url.pathname === `${AUTOMATION_BASE}/receipts` && request.method === 'GET') {
    return json(await listReceipts(env, url));
  }

  if (url.pathname === `${AUTOMATION_BASE}/provider-callbacks` && request.method === 'POST') {
    const result = await recordZeroOsProviderUsageCallback(env, deps, await readJson(request), auth);
    return json(result.response, result.status);
  }

  if (url.pathname === `${AUTOMATION_BASE}/dead-letters` && request.method === 'GET') {
    const items = await readIndex(env, DEAD_INDEX_KEY);
    return json({ ok: true, count: items.length, items });
  }

  if (url.pathname === `${AUTOMATION_BASE}/retry` && request.method === 'POST') {
    const result = await retryDeadLetter(env, deps, await readJson(request), auth);
    return json(result.response, result.status);
  }

  return json({ ok: false, error: 'automation_runtime_route_not_found', path: url.pathname }, 404);
}
