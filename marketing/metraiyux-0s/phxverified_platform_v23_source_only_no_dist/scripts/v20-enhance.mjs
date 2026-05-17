import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leadRoutingServiceForApi, routeLead } from '../src/server/lead-routing-service.mjs';
import { ownerMessagingServiceForApi, OWNER_MESSAGE_TEMPLATES } from '../src/server/owner-messaging-service.mjs';
import { revenueAttributionServiceForApi } from '../src/server/revenue-attribution-service.mjs';
import { listContracts } from '../src/server/contracts.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://phxverified.local').replace(/\/$/, '');
const generated_at = new Date().toISOString();
const V20_SURFACES = ['/quote-router/','/lead-routing-service/','/ae-assignments/','/owner-messaging/','/revenue-attribution/'];

async function ensureDir(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(rel, body){ const file = path.join(DIST, rel); await ensureDir(path.dirname(file)); await fs.writeFile(file, body); }
async function readJson(rel, fallback = {}){ try{ return JSON.parse(await fs.readFile(path.join(DIST, rel), 'utf8')); }catch{ return fallback; } }
async function readText(rel, fallback = ''){ try{ return await fs.readFile(path.join(DIST, rel), 'utf8'); }catch{ return fallback; } }
function html(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function metric(label, value){ return `<div class="metric"><span>${html(value)}</span><small>${html(label)}</small></div>`; }
function page({ title, description, body }){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(title)}</title><meta name="description" content="${html(description)}"><meta name="robots" content="noindex,nofollow,noarchive"><link rel="canonical" href="${SITE_URL}/"><link rel="stylesheet" href="/assets/styles.css"></head><body class="internal-page"><header class="topbar"><a class="brand" href="/"><span class="logo-orb"></span><span>PHX Verified</span></a><nav><a href="/directory/">Directory</a><a href="/admin-console/">Admin Console</a><a href="/lead-routing-service/">Lead Routing</a><a href="/revenue-attribution/">Revenue</a></nav></header><main>${body}</main><footer class="footer"><p>PHX Verified Network · v20 operational code surface · upstream auth expected.</p></footer><script src="/assets/app.js" defer></script></body></html>`;
}

const businesses = await readJson('data/businesses.json', { businesses:[] });
const sample = businesses.businesses?.[0] || {};
const sampleLead = { buyer_name:'Sample Buyer', buyer_contact:'buyer@example.com', city:sample.city || 'Phoenix', category:sample.category || 'Business Services', details:`Need ${sample.category || 'service'} help from verified local providers with a clear response path.`, timeline:'this week', budget:'open' };
const sampleRoute = routeLead(sampleLead, businesses.businesses || [], { limit:8, minScore:10 });
const contracts = listContracts();
const v20Contracts = contracts.filter(c => ['quote_request','lead_route_decision','ae_assignment','owner_message','notification_delivery_event','revenue_attribution_event'].includes(c.type));

const leadRoutingModel = {
  version:'20.0.0', generated_at,
  purpose:'Ranks quote/lead requests against seeded businesses, stages quote_request and lead_route_decision actions, and keeps delivery claims separate from routing suggestions.',
  service:leadRoutingServiceForApi(),
  contracts:v20Contracts.filter(c => ['quote_request','lead_route_decision','ae_assignment'].includes(c.type)),
  sample_lead:sampleLead,
  sample_route:sampleRoute,
  anti_theater_rules:['A route is not a delivered lead.','Owner contact requires message/delivery action proof.','AEs must update lead status after outreach.','Listings without contact data are penalized.']
};
const quoteRouterModel = {
  version:'20.0.0', generated_at,
  endpoint:'/.netlify/functions/phx-lead',
  operations:['GET service model','POST operation=quote_request','POST operation=route_quote'],
  input_fields:['buyer_name','buyer_contact','city','category','details','timeline','budget','business_ids'],
  output_actions:['quote_request','lead_route_decision'],
  sample:selectedSample(sampleRoute)
};
const aeAssignmentModel = {
  version:'20.0.0', generated_at,
  action:'ae_assignment',
  assignment_rules:['territory can be city/category based','priority should follow verification/contact readiness/revenue opportunity','stage changes are stored as runtime events','upstream auth owns AE identity'],
  default_stages:['new_assignment','contact_pending','claimed_interest','cleanup_needed','proposal_sent','paid_pending_activation','active_customer','lost_or_archived']
};
const ownerMessagingModel = {
  version:'20.0.0', generated_at,
  service:ownerMessagingServiceForApi(),
  templates:OWNER_MESSAGE_TEMPLATES,
  delivery_boundary:'owner_message stores a draft/intent. notification_delivery_event is required for provider delivery proof.'
};
const revenueAttributionModel = {
  version:'20.0.0', generated_at,
  service:revenueAttributionServiceForApi(),
  attribution_keys:['business_id','ae_id','lead_id','payment_order_id','product','tier','source'],
  payout_boundary:'revenue_attribution_event can estimate/account for revenue, but payout proof must come from payment/provider ledgers.'
};
const codeReadiness = {
  version:'20.0.0', generated_at,
  added_modules:['src/server/lead-routing-service.mjs','src/server/owner-messaging-service.mjs','src/server/revenue-attribution-service.mjs','netlify/functions/phx-lead.mjs'],
  added_actions:v20Contracts.map(c => c.type),
  added_surfaces:V20_SURFACES,
  production_boundary:['requires upstream auth headers','requires live provider email/SMS adapter for real delivery','requires payment webhook proof before revenue is treated as collected','requires AE/admin approval before owner delivery']
};

function selectedSample(route){
  return { lead_id:route.lead_id, selected:route.selected.slice(0,5), decision:route.decision };
}

const models = {
  'lead-routing-service-model':leadRoutingModel,
  'quote-router-model':quoteRouterModel,
  'ae-assignment-model':aeAssignmentModel,
  'owner-messaging-model':ownerMessagingModel,
  'revenue-attribution-model':revenueAttributionModel,
  'v20-code-readiness':codeReadiness
};
for(const [name, model] of Object.entries(models)){
  await write(`data/${name}.json`, JSON.stringify(model, null, 2));
  await write(`api/${name}.json`, JSON.stringify(model, null, 2));
}

await write('quote-router/index.html', page({ title:'Quote Router | PHX Verified', description:'Quote intake and route-decision code layer for PHX Verified.', body:`<section class="hero glass subhero"><div><p class="eyebrow">v20 quote routing</p><h1>Buyer requests now become routable quote packets.</h1><p class="hero-text">The platform can stage quote_request actions, rank seeded providers, create lead_route_decision records, and keep AE/admin approval between matching and owner delivery.</p><div class="hero-actions"><a class="btn primary" href="/data/quote-router-model.json">Open quote router JSON</a><a class="btn" href="/.netlify/functions/phx-lead">Lead function model</a></div></div><aside class="hero-card">${metric('published businesses',(businesses.businesses?.length || 0).toLocaleString())}${metric('sample matches',sampleRoute.selected.length)}${metric('endpoint','phx-lead')}</aside></section><section class="section glass"><p class="eyebrow">Sample route</p><div class="cards">${sampleRoute.selected.slice(0,6).map(row=>`<article class="mini-card"><strong>${html(row.name)}</strong><p>${html(row.city)} · ${html(row.category)} · score ${html(row.score)}</p><small>${html(row.reasons.slice(0,3).join(', '))}</small></article>`).join('')}</div></section>` }));

await write('lead-routing-service/index.html', page({ title:'Lead Routing Service | PHX Verified', description:'Lead scoring and routing service model for PHX Verified.', body:`<section class="hero glass subhero"><div><p class="eyebrow">lead-routing-service.mjs</p><h1>Lead routing is now code-backed.</h1><p class="hero-text">Routes score city/category/relevance/contact readiness/verification signals and create explicit action records instead of pretending a match is a delivered lead.</p><div class="hero-actions"><a class="btn primary" href="/data/lead-routing-service-model.json">Open service JSON</a><a class="btn" href="/quote-router/">Quote router</a></div></div><aside class="hero-card">${metric('actions',leadRoutingModel.service.actions.length)}${metric('anti-theater rules',leadRoutingModel.anti_theater_rules.length)}</aside></section><section class="section glass"><p class="eyebrow">Rules</p><ul class="file-list">${leadRoutingModel.anti_theater_rules.map(x=>`<li>${html(x)}</li>`).join('')}</ul></section>` }));

await write('ae-assignments/index.html', page({ title:'AE Assignments | PHX Verified', description:'AE assignment action model for PHX Verified account work.', body:`<section class="hero glass subhero"><div><p class="eyebrow">AE assignment engine</p><h1>Accounts and lead work can now be assigned as action records.</h1><p class="hero-text">The ae_assignment contract gives upstream-auth AEs a concrete workflow for territory, priority, stage, next action, product, and due date.</p><div class="hero-actions"><a class="btn primary" href="/data/ae-assignment-model.json">Open AE assignment JSON</a><a class="btn" href="/accounts/">Account workbench</a></div></div><aside class="hero-card">${metric('stages',aeAssignmentModel.default_stages.length)}${metric('contract','ae_assignment')}</aside></section><section class="section glass"><div class="pipeline-grid">${aeAssignmentModel.default_stages.map((stage,i)=>`<div><strong>${String(i+1).padStart(2,'0')}</strong><p>${html(stage)}</p></div>`).join('')}</div></section>` }));

await write('owner-messaging/index.html', page({ title:'Owner Messaging | PHX Verified', description:'Owner outreach draft and delivery receipt model for PHX Verified.', body:`<section class="hero glass subhero"><div><p class="eyebrow">owner messaging</p><h1>Owner outreach now has drafts and delivery-event boundaries.</h1><p class="hero-text">AEs can generate owner_message actions, but delivery proof only exists when a notification_delivery_event is recorded by a provider worker.</p><div class="hero-actions"><a class="btn primary" href="/data/owner-messaging-model.json">Open owner messaging JSON</a><a class="btn" href="/owner-crm/">Owner CRM</a></div></div><aside class="hero-card">${metric('templates',Object.keys(OWNER_MESSAGE_TEMPLATES).length)}${metric('delivery proof','separate event')}</aside></section><section class="section glass"><div class="cards">${Object.entries(OWNER_MESSAGE_TEMPLATES).map(([id,t])=>`<article class="mini-card"><strong>${html(id)}</strong><p>${html(t.subject)}</p><small>${html(t.channel)}</small></article>`).join('')}</div></section>` }));

await write('revenue-attribution/index.html', page({ title:'Revenue Attribution | PHX Verified', description:'Revenue attribution event model for exposure products and AE tracking.', body:`<section class="hero glass subhero"><div><p class="eyebrow">revenue attribution</p><h1>Revenue can now be attributed without faking payout proof.</h1><p class="hero-text">Payment/provider facts, admin exposure activation, AE assignment, and revenue attribution are separate events so the platform can track value cleanly.</p><div class="hero-actions"><a class="btn primary" href="/data/revenue-attribution-model.json">Open revenue JSON</a><a class="btn" href="/paid-exposure-ledger/">Paid exposure ledger</a></div></div><aside class="hero-card">${metric('attribution keys',revenueAttributionModel.attribution_keys.length)}${metric('default commission','13%')}</aside></section><section class="section glass"><p>${html(revenueAttributionModel.payout_boundary)}</p></section>` }));

const routeManifest = await readJson('data/route-manifest.json', { surfaces:[], internal_noindex_surfaces:[], generated_routes:{} });
routeManifest.surfaces = Array.from(new Set([...(routeManifest.surfaces || []), ...V20_SURFACES])).sort();
routeManifest.internal_noindex_surfaces = Array.from(new Set([...(routeManifest.internal_noindex_surfaces || []), ...V20_SURFACES])).sort();
routeManifest.v20_code_surfaces = V20_SURFACES;
routeManifest.v20_code_modules = codeReadiness.added_modules;
const generated = routeManifest.generated_routes || {};
generated.v20_code_surfaces = V20_SURFACES.length;
generated.total = Object.entries(generated).filter(([k]) => k !== 'total').reduce((sum, [, value]) => sum + Number(value || 0), 0);
routeManifest.generated_routes = generated;
routeManifest.routes = { ...(routeManifest.routes || {}), v20_code_surfaces:V20_SURFACES.length };
await write('data/route-manifest.json', JSON.stringify(routeManifest, null, 2));

let robots = await readText('robots.txt');
for(const surface of V20_SURFACES){ if(!robots.includes(`Disallow: ${surface}`)) robots += `\nDisallow: ${surface}`; }
await write('robots.txt', robots.trim() + '\n');

const apiIndex = await readJson('data/platform-api-index.json', { endpoints:[] });
const additions = Object.keys(models).map(name => ({ name, url:`/api/${name}.json`, internal:true, version:'20.0.0' }));
apiIndex.endpoints = Array.from(new Map([...(apiIndex.endpoints || []), ...additions].map(e => [e.url, e])).values());
apiIndex.version = '20.0.0';
apiIndex.updated_at = generated_at.slice(0,10);
await write('data/platform-api-index.json', JSON.stringify(apiIndex, null, 2));
await write('api/platform-api-index.json', JSON.stringify(apiIndex, null, 2));

console.log(`v20 enhancement wrote ${V20_SURFACES.length} operational code surfaces and ${Object.keys(models).length} data/API models.`);
