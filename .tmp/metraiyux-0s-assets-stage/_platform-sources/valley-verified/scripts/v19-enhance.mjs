import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paymentServiceForApi } from '../src/server/payment-service.mjs';
import { listContracts } from '../src/server/contracts.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const SITE_URL = (process.env.SITE_URL || 'https://valleyverified.local').replace(/\/$/, '');
const generated_at = new Date().toISOString();
const V18_SURFACES = ['/runtime-adapter/','/admin-api/','/notification-service/','/exposure-orders/'];
const V19_SURFACES = ['/payment-service/','/checkout-service/','/payment-webhooks/','/paid-exposure-ledger/','/admin-console/'];

async function ensureDir(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(rel, body){ const file = path.join(DIST, rel); await ensureDir(path.dirname(file)); await fs.writeFile(file, body); }
async function copy(src, rel){ const file = path.join(DIST, rel); await ensureDir(path.dirname(file)); await fs.copyFile(src, file); }
async function readJson(rel, fallback = {}){ try{ return JSON.parse(await fs.readFile(path.join(DIST, rel), 'utf8')); }catch{ return fallback; } }
async function readText(rel, fallback = ''){ try{ return await fs.readFile(path.join(DIST, rel), 'utf8'); }catch{ return fallback; } }
function html(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function metric(label, value){ return `<div class="metric"><span>${html(value)}</span><small>${html(label)}</small></div>`; }
function page({ title, description, body, script = '' }){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(title)}</title><meta name="description" content="${html(description)}"><meta name="robots" content="noindex,nofollow,noarchive"><link rel="canonical" href="${SITE_URL}/"><link rel="stylesheet" href="/assets/styles.css"></head><body class="internal-page"><header class="topbar"><a class="brand" href="/"><span class="logo-orb"></span><span>Valley Verified</span></a><nav><a href="/directory/">Directory</a><a href="/pricing/">Pricing</a><a href="/admin-api/">Admin API</a><a href="/payment-service/">Payments</a></nav></header><main>${body}</main><footer class="footer"><p>Valley Verified Network · v19 payment/runtime code surface · upstream auth expected.</p></footer><script src="/assets/app.js" defer></script>${script}</body></html>`;
}

const businesses = await readJson('data/businesses.json', { businesses:[] });
const seedReport = await readJson('seed-report.json', { records:{} });
const paymentService = paymentServiceForApi();
const contracts = listContracts();
const paymentContracts = contracts.filter(c => ['sponsor_intent','payment_event','exposure_activation'].includes(c.type));
const products = await readJson('data/exposure-products.json', { products:[] });

const paymentServiceModel = {
  version:'19.0.0',
  generated_at,
  purpose:'Checkout/session creation and verified payment-webhook recording for exposure products without pretending paid placement is active.',
  modules:['src/server/payment-service.mjs','netlify/functions/phx-payment.mjs','src/admin-console.js'],
  providers:['dry-run','stripe'],
  endpoint:'/.netlify/functions/phx-payment',
  operations:['GET service model','POST create_checkout_session with upstream actor','POST ?operation=webhook&provider=stripe or dry-run'],
  rules:paymentService.rules,
  environment:['PHX_PAYMENT_PROVIDER=dry-run|stripe','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PHX_PAYMENT_WEBHOOK_SECRET'],
  contracts:paymentContracts
};
const checkoutServiceModel = {
  version:'19.0.0', generated_at,
  lifecycle:['business owner chooses exposure product','checkout session is created','sponsor_intent action remains queued','payment webhook is verified','payment_event action records paid/unpaid status','admin reviews inventory and approves exposure_activation','runtime state marks placement active/paused/rejected'],
  no_fake_claims:['No checkout session marks a listing paid by itself.','No payment webhook bypasses signature verification.','No paid placement becomes active without exposure_activation.'],
  products:products.products || products.catalog || []
};
const paymentWebhookModel = {
  version:'19.0.0', generated_at,
  supported_providers:['stripe','dry-run/local signed event'],
  verification:['Stripe t=timestamp,v1=signature HMAC-SHA256 check','PHX signed webhook HMAC-SHA256 check for non-dry-run local providers'],
  output_action:'payment_event',
  output_queue:'payment-events',
  state_result:'paid_pending_admin_activation when payment_status is paid'
};
const paidExposureLedger = {
  version:'19.0.0', generated_at,
  ledgers:['payment_events','exposure_activations','sponsor_intents'],
  activation_contract:'exposure_activation',
  admin_requirement:'admin role required',
  sellable_products:(products.products || products.catalog || []).map(p => ({ product:p.product || p.id || p.name || 'product', tier:p.tier || p.status || 'standard', monthly_price:p.monthly_price ?? p.price_monthly ?? 0, setup_price:p.setup_price ?? p.setup_fee ?? 0 }))
};
const adminConsoleModel = {
  version:'19.0.0', generated_at,
  purpose:'Browser-side operational console that calls runtime functions with an FS27 gate token. The function layer strips public x-upstream headers and injects trusted identity after gate introspection.',
  assets:['/assets/admin-console.js'],
  functions:['queueSummary','exposureCatalog','paymentService','createDryRunCheckout','approveAction','processOutbox'],
  limitation:'Browser code cannot create trustworthy auth by itself. Production must configure SKYGATEFS27_ORIGIN and PHX_GATE_AUTH_REQUIRED=true.'
};

await copy(path.join(SRC, 'admin-console.js'), 'assets/admin-console.js');
for(const [name, model] of Object.entries({ 'payment-service-model':paymentServiceModel, 'checkout-service-model':checkoutServiceModel, 'payment-webhook-model':paymentWebhookModel, 'paid-exposure-ledger':paidExposureLedger, 'admin-console-model':adminConsoleModel })){
  await write(`data/${name}.json`, JSON.stringify(model, null, 2));
  await write(`api/${name}.json`, JSON.stringify(model, null, 2));
}

await write('payment-service/index.html', page({ title:'Payment Service | Valley Verified', description:'Valley Verified payment checkout/session and payment-event recording service.', body:`<section class="hero glass subhero"><div><p class="eyebrow">v19 payment service</p><h1>Exposure products now have checkout/session code.</h1><p class="hero-text">The platform can create checkout sessions for sellable exposure products, record verified payment events, and keep paid placement pending until admin activation.</p><div class="hero-actions"><a class="btn primary" href="/data/payment-service-model.json">Open payment JSON</a><a class="btn" href="/admin-console/">Admin console</a></div></div><aside class="hero-card">${metric('providers','dry-run + stripe')}${metric('published businesses',(businesses.businesses?.length || seedReport.records?.published || 0).toLocaleString())}${metric('payment contracts',paymentContracts.length)}</aside></section><section class="section glass"><p class="eyebrow">Rules</p><h2>No fake billing completion</h2><ul class="file-list">${paymentService.rules.map(r=>`<li>${html(r)}</li>`).join('')}</ul></section>` }));

await write('checkout-service/index.html', page({ title:'Checkout Service | Valley Verified', description:'Checkout session lifecycle for Valley Verified exposure products.', body:`<section class="hero glass subhero"><div><p class="eyebrow">checkout lifecycle</p><h1>Owners can start an exposure order without auto-activating anything.</h1><p class="hero-text">Checkout creation queues sponsor intent, payment webhooks record payment facts, and admin activation controls what actually receives paid placement.</p><div class="hero-actions"><a class="btn primary" href="/data/checkout-service-model.json">Open checkout JSON</a><a class="btn" href="/pricing/">Pricing</a></div></div><aside class="hero-card">${metric('lifecycle steps',checkoutServiceModel.lifecycle.length)}${metric('fake claims blocked',checkoutServiceModel.no_fake_claims.length)}</aside></section><section class="section glass"><p class="eyebrow">Lifecycle</p><div class="pipeline-grid">${checkoutServiceModel.lifecycle.map((step,i)=>`<div><strong>${String(i+1).padStart(2,'0')}</strong><p>${html(step)}</p></div>`).join('')}</div></section>` }));

await write('payment-webhooks/index.html', page({ title:'Payment Webhooks | Valley Verified', description:'Verified payment webhook intake for Valley Verified checkout sessions.', body:`<section class="hero glass subhero"><div><p class="eyebrow">payment webhook intake</p><h1>Payment events are verified before they affect runtime state.</h1><p class="hero-text">Stripe signatures and PHX HMAC signatures are checked before creating payment_event actions. Paid still means paid-pending-admin-activation, not automatic sponsor placement.</p><div class="hero-actions"><a class="btn primary" href="/data/payment-webhook-model.json">Open webhook JSON</a><a class="btn" href="/paid-exposure-ledger/">Paid ledger</a></div></div><aside class="hero-card">${metric('output queue','payment-events')}${metric('state result','pending approval')}</aside></section>` }));

await write('paid-exposure-ledger/index.html', page({ title:'Paid Exposure Ledger | Valley Verified', description:'Runtime ledger model for paid exposure, payment events, and admin activation.', body:`<section class="hero glass subhero"><div><p class="eyebrow">paid exposure ledger</p><h1>Payment facts and placement decisions are separate ledgers.</h1><p class="hero-text">This protects the marketplace from accidental overdelivery: money received is one event, inventory/placement approval is a separate admin action.</p><div class="hero-actions"><a class="btn primary" href="/data/paid-exposure-ledger.json">Open ledger JSON</a><a class="btn" href="/exposure-orders/">Exposure orders</a></div></div><aside class="hero-card">${metric('runtime ledgers',paidExposureLedger.ledgers.length)}${metric('admin required','yes')}</aside></section><section class="section glass"><p class="eyebrow">Sellable products</p><div class="cards">${paidExposureLedger.sellable_products.map(p=>`<article class="mini-card"><h3>${html(p.product.replaceAll('_',' '))}</h3><p>${html(p.tier)} · $${html(p.monthly_price)}/mo · setup $${html(p.setup_price)}</p></article>`).join('')}</div></section>` }));

await write('admin-console/index.html', page({ title:'Admin Console | Valley Verified', description:'Runtime admin console wiring for Valley Verified upstream-auth endpoints.', script:'<script src="/assets/admin-console.js" defer></script>', body:`<section class="hero glass subhero"><div><p class="eyebrow">runtime admin console</p><h1>Admin operations now have a browser control surface.</h1><p class="hero-text">This surface calls runtime endpoints through an FS27 gate token. In production, public x-upstream headers are stripped and trusted identity is injected by the gate adapter.</p><div class="hero-actions"><a class="btn primary" href="/data/admin-console-model.json">Open console JSON</a><a class="btn" href="/payment-service/">Payment service</a></div></div><aside class="hero-card">${metric('functions',adminConsoleModel.functions.length)}${metric('auth source','FS27 gate')}</aside></section><section class="split-grid"><article class="glass section"><p class="eyebrow">FS27 gate card</p><label>Gate token<input id="fs27-gate-token" placeholder="Paste session JWT or kx_live key"></label><div class="button-row"><button class="btn" onclick="phxAdminConsole.queueSummary()">Queue summary</button><button class="btn" onclick="phxAdminConsole.exposureCatalog()">Catalog</button><button class="btn" onclick="phxAdminConsole.paymentService()">Payment service</button></div></article><article class="glass section"><p class="eyebrow">Checkout proof</p><label>Business ID<input id="checkout-business-id" value="demo-business"></label><label>Product<input id="checkout-product" value="verified_profile_upgrade"></label><label>Tier<input id="checkout-tier" value="starter"></label><label>Email<input id="checkout-email" value="owner@example.com"></label><div class="button-row"><button class="btn primary" onclick="phxAdminConsole.createDryRunCheckout()">Create checkout session</button><button class="btn" onclick="phxAdminConsole.processOutbox()">Process outbox dry-run</button></div></article></section><section class="section glass"><p class="eyebrow">Action approval</p><label>Action ID<input id="action-id" placeholder="paste queued action id"></label><button class="btn" onclick="phxAdminConsole.approveAction()">Approve action</button><pre id="admin-console-output" class="code-output">{}</pre></section>` }));

const routeManifest = await readJson('data/route-manifest.json', { surfaces:[], internal_noindex_surfaces:[], routes:{} });
routeManifest.surfaces = Array.from(new Set([...(routeManifest.surfaces || []), ...V18_SURFACES, ...V19_SURFACES])).sort();
routeManifest.internal_noindex_surfaces = Array.from(new Set([...(routeManifest.internal_noindex_surfaces || []), ...V18_SURFACES, ...V19_SURFACES])).sort();
routeManifest.v18_code_surfaces = V18_SURFACES;
routeManifest.v19_code_surfaces = V19_SURFACES;
routeManifest.v19_code_modules = paymentServiceModel.modules;
const generated = routeManifest.generated_routes || {};
if(!generated.v18_code_surfaces) generated.v18_code_surfaces = V18_SURFACES.length;
if(!generated.v19_code_surfaces) generated.v19_code_surfaces = V19_SURFACES.length;
const calculatedTotal = Object.entries(generated).filter(([key]) => key !== 'total').reduce((sum, [, value]) => sum + Number(value || 0), 0);
generated.total = calculatedTotal;
routeManifest.generated_routes = generated;
routeManifest.routes = { ...(routeManifest.routes || {}), v18_code_surfaces:V18_SURFACES.length, v19_code_surfaces:V19_SURFACES.length };
await write('data/route-manifest.json', JSON.stringify(routeManifest, null, 2));

let robots = await readText('robots.txt');
for(const surface of [...V18_SURFACES, ...V19_SURFACES]){ if(!robots.includes(`Disallow: ${surface}`)) robots += `\nDisallow: ${surface}`; }
await write('robots.txt', robots.trim() + '\n');

const apiIndex = await readJson('data/platform-api-index.json', { endpoints:[] });
const additions = ['payment-service-model','checkout-service-model','payment-webhook-model','paid-exposure-ledger','admin-console-model'].map(name => ({ name, url:`/api/${name}.json`, internal:true, version:'19.0.0' }));
apiIndex.endpoints = Array.from(new Map([...(apiIndex.endpoints || []), ...additions].map(e => [e.url, e])).values());
apiIndex.version = '19.0.0';
apiIndex.updated_at = generated_at.slice(0,10);
await write('data/platform-api-index.json', JSON.stringify(apiIndex, null, 2));
await write('api/platform-api-index.json', JSON.stringify(apiIndex, null, 2));

console.log(`v19 enhancement wrote ${V19_SURFACES.length} payment/admin code surfaces and 5 data/API models.`);
