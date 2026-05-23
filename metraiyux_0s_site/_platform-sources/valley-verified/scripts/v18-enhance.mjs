import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exposureCatalogForApi } from '../src/server/exposure-service.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = process.env.SITE_URL || 'https://valleyverified.local';
const generated_at = new Date().toISOString();

async function ensureDir(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(rel, body){ const file = path.join(DIST, rel); await ensureDir(path.dirname(file)); await fs.writeFile(file, body); }
async function readJson(rel, fallback = {}){ try{ return JSON.parse(await fs.readFile(path.join(DIST, rel), 'utf8')); }catch{ return fallback; } }
function html(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function metric(label, value){ return `<div class="metric"><span>${html(value)}</span><small>${html(label)}</small></div>`; }
function page({ title, description, body }){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(title)}</title><meta name="description" content="${html(description)}"><meta name="robots" content="noindex,nofollow,noarchive"><link rel="canonical" href="${SITE_URL}/"><link rel="stylesheet" href="/assets/styles.css"></head><body class="internal-page"><header class="topbar"><a class="brand" href="/"><span class="logo-orb"></span><span>Valley Verified</span></a><nav><a href="/directory/">Directory</a><a href="/ae-command/">AE</a><a href="/mutation-service/">Mutation</a><a href="/runtime-adapter/">Runtime</a></nav></header><main>${body}</main><footer class="footer"><p>Valley Verified Network · v18 runtime code surface · upstream auth expected.</p></footer><script src="/assets/app.js" defer></script></body></html>`;
}

const businesses = await readJson('data/businesses.json', { businesses:[] });
const seedReport = await readJson('seed-report.json', { records:{} });
const exposureCatalog = exposureCatalogForApi();
const runtimeAdapterModel = {
  version:'18.0.0',
  generated_at,
  purpose:'Concrete runtime adapter bridge for JSON-file local proof and Cloudflare D1 binding implementation.',
  adapters:[
    { name:'JsonPlatformAdapter', mode:'local_proof_and_single_node_runtime', file:'.phx-runtime/platform-db.json', supports:['putAction','getAction','listActions','putState','getState','appendEvent','delivery_receipts'] },
    { name:'D1PlatformAdapter', mode:'cloudflare_d1_binding', supports:['putAction','getAction','listActions','putState','getState','appendEvent'] },
    { name:'AdapterActionStore', mode:'store_bridge', purpose:'Lets MutationService use the adapter as its action store.' },
    { name:'AdapterStateStore', mode:'state_bridge', purpose:'Lets state projection persist through the adapter.' }
  ],
  code_modules:['src/server/adapter-runtime.mjs','src/server/admin-api.mjs','src/server/notification-service.mjs','src/server/exposure-service.mjs','netlify/functions/phx-admin.mjs']
};
const adminApiModel = {
  version:'18.0.0',
  generated_at,
  endpoint:'/.netlify/functions/phx-admin',
  auth:'upstream headers only: x-upstream-user-id, x-upstream-user-email, x-upstream-roles',
  operations:['approve_action','reject_action','replay_actions','export_change_set','process_outbox','create_exposure_order'],
  safe_rules:['GET queue and state summaries can be read through upstream identity.','Admin operations require admin role.','Exposure orders create sponsor_intent actions only; billing completion is not claimed.','Outbox processing defaults to dry-run unless explicitly disabled and target URL is configured.']
};
const notificationModel = {
  version:'18.0.0',
  generated_at,
  service:'notification-service',
  mode:'signed_webhook_delivery_with_dry_run_default',
  functions:['verifyWebhookJob','deliverWebhookJob','processWebhookOutbox','resolveWebhookTarget'],
  environment:['PHX_WEBHOOK_SECRET','PHX_WEBHOOK_URL','PHX_WEBHOOK_<TARGET>_URL'],
  rule:'Outbox jobs are created by mutations; delivery receipts are recorded separately so provider failures never corrupt action state.'
};
const exposureOrderModel = {
  version:'18.0.0',
  generated_at,
  service:'exposure-service',
  catalog:exposureCatalog.products,
  workflow:['validate exposure product','create sponsor_intent action envelope','queue action for review','wait for payment provider checkout wiring','wait for payment webhook','reserve inventory','admin approve placement'],
  public_claim_limit:'Pricing/order intent code exists. It does not claim paid placement is active until billing provider and approval projection are wired.'
};

await write('data/runtime-adapter-model.json', JSON.stringify(runtimeAdapterModel, null, 2));
await write('data/admin-api-model.json', JSON.stringify(adminApiModel, null, 2));
await write('data/notification-service-model.json', JSON.stringify(notificationModel, null, 2));
await write('data/exposure-order-model.json', JSON.stringify(exposureOrderModel, null, 2));
await write('api/runtime-adapter-model.json', JSON.stringify(runtimeAdapterModel, null, 2));
await write('api/admin-api-model.json', JSON.stringify(adminApiModel, null, 2));
await write('api/notification-service-model.json', JSON.stringify(notificationModel, null, 2));
await write('api/exposure-order-model.json', JSON.stringify(exposureOrderModel, null, 2));
await write('api/exposure-products.json', JSON.stringify(exposureCatalog, null, 2));

await write('runtime-adapter/index.html', page({ title:'Runtime Adapter | Valley Verified', description:'Valley Verified v18 runtime adapter bridge for JSON local proof and Cloudflare D1 persistence.', body:`<section class="hero glass subhero"><div><p class="eyebrow">v18 runtime adapter</p><h1>The platform now has a concrete persistence bridge.</h1><p class="hero-text">This adds a real adapter layer for local JSON proof and D1 runtime persistence, plus bridge stores so the mutation service can use adapters without rewriting contracts.</p><div class="hero-actions"><a class="btn primary" href="/data/runtime-adapter-model.json">Open adapter JSON</a><a class="btn" href="/admin-api/">Admin API</a></div></div><aside class="hero-card">${metric('published businesses', (businesses.businesses?.length || seedReport.records?.published || 0).toLocaleString())}${metric('adapter implementations', runtimeAdapterModel.adapters.length)}${metric('new modules', runtimeAdapterModel.code_modules.length)}</aside></section><section class="section glass"><p class="eyebrow">Adapters</p><div class="cards">${runtimeAdapterModel.adapters.map(row => `<article class="mini-card"><h3>${html(row.name)}</h3><p>${html(row.mode || row.purpose)}</p></article>`).join('')}</div></section>` }));

await write('admin-api/index.html', page({ title:'Admin API | Valley Verified', description:'Valley Verified v18 upstream-auth admin operation endpoint for approvals, replay, change-sets, outbox processing, and exposure order intake.', body:`<section class="hero glass subhero"><div><p class="eyebrow">v18 admin API</p><h1>Admin operations now have one code entrypoint.</h1><p class="hero-text">The admin endpoint orchestrates approvals, rejections, replay, change-set export, outbox processing, and exposure-order intake without adding local auth.</p><div class="hero-actions"><a class="btn primary" href="/data/admin-api-model.json">Open admin API JSON</a><a class="btn" href="/policy-engine/">Policy</a></div></div><aside class="hero-card">${metric('operations', adminApiModel.operations.length)}${metric('auth mode', 'upstream')}${metric('endpoint', 'phx-admin')}</aside></section><section class="section glass"><p class="eyebrow">Operations</p><div class="pipeline-grid">${adminApiModel.operations.map((op, i) => `<div><strong>${String(i+1).padStart(2,'0')}</strong><p>${html(op.replaceAll('_',' '))}</p></div>`).join('')}</div></section>` }));

await write('notification-service/index.html', page({ title:'Notification Service | Valley Verified', description:'Signed webhook outbox processor for Valley Verified operational notifications.', body:`<section class="hero glass subhero"><div><p class="eyebrow">v18 webhook delivery</p><h1>Outbox jobs can now be processed safely.</h1><p class="hero-text">Mutations create signed jobs; the notification service validates signatures, resolves target URLs, sends only when configured, and records delivery receipts.</p><div class="hero-actions"><a class="btn primary" href="/data/notification-service-model.json">Open notification JSON</a><a class="btn" href="/webhook-outbox/">Outbox model</a></div></div><aside class="hero-card">${metric('delivery mode', 'dry-run default')}${metric('functions', notificationModel.functions.length)}${metric('receipt safe', 'yes')}</aside></section>` }));

await write('exposure-orders/index.html', page({ title:'Exposure Orders | Valley Verified', description:'Exposure product order-intent service for Valley Verified sponsor/profile/lead routing products.', body:`<section class="hero glass subhero"><div><p class="eyebrow">v18 exposure orders</p><h1>Paid exposure now has order-intent code.</h1><p class="hero-text">The platform can create sponsor-intent action envelopes from priced products while keeping billing completion and placement approval honest.</p><div class="hero-actions"><a class="btn primary" href="/data/exposure-order-model.json">Open order JSON</a><a class="btn" href="/pricing/">Pricing page</a></div></div><aside class="hero-card">${metric('products', exposureCatalog.products.length)}${metric('billing claim', 'not faked')}${metric('review', 'required')}</aside></section><section class="section glass"><p class="eyebrow">Catalog</p><div class="cards">${exposureCatalog.products.map(item => `<article class="mini-card"><h3>${html(item.product.replaceAll('_',' '))}</h3><p>${html(item.description)}</p><strong>$${item.monthly_price}/mo</strong></article>`).join('')}</div></section>` }));

console.log(`✅ v18 enhancement wrote runtime adapter, admin API, notification, and exposure-order surfaces for ${(businesses.businesses?.length || 0).toLocaleString()} businesses.`);
