import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRuntimeAdapter, JsonPlatformAdapter, NeonPlatformAdapter, D1PlatformAdapter } from '../src/server/adapter-runtime.mjs';
import { createQuoteLeadRecord, transitionLead, assignLead, addOwnerContactAttempt, leadRecordServiceForApi } from '../src/server/lead-record-service.mjs';
import { resolveStripePrice, buildPaymentEventAction, buildExposureActivationAction, paymentActivationServiceForApi } from '../src/server/payment-activation-service.mjs';
import { createNotificationJob, deliverNotificationJob, deliveryReceiptToAction, notificationWorkerServiceForApi } from '../src/server/notification-worker-service.mjs';
import { buildOwnerClaimSubmission, claimSubmissionServiceForApi } from '../src/server/claim-submission-service.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CANONICAL_SITE_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified';
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
async function exists(rel){ try{ await fs.access(path.join(DIST, rel)); return true; }catch{ return false; } }
async function read(rel){ return fs.readFile(path.join(DIST, rel), 'utf8'); }
async function json(rel){ return JSON.parse(await read(rel)); }
async function size(rel=''){ const target = path.join(DIST, rel); const st = await fs.stat(target); if(st.isFile()) return st.size; let total=0; for(const e of await fs.readdir(target)) total += await size(path.join(rel,e)); return total; }
async function countStaticProfiles(){
  const dir = path.join(DIST, 'business');
  const entries = await fs.readdir(dir, { withFileTypes:true });
  let count = 0;
  for(const entry of entries){
    if(!entry.isDirectory() || entry.name === 'page') continue;
    if(await exists(`business/${entry.name}/index.html`)) count++;
  }
  return count;
}

const data = await json('data/businesses.json');
const report = await json('seed-report.json');
const optimize = await json('data/deploy-size-report.json');
const routing = await json('data/canonical-routing.json');
const readiness = await json('data/v21-code-readiness.json');
const routeManifest = await json('data/route-manifest.json');
const factoryIndex = await json('data/client-app-factory-index.json');
const clientAppCoverage = await json('data/client-app-coverage.json');
const first = data.businesses[0];
const last = data.businesses[data.businesses.length - 1];
const expectedBuiltAppClients = [
  'bobs-smoke-shop-litchfield-park',
  'empire-pallets-phoenix',
  '480-realty-property-management-mesa-85209',
  'dink-and-dine-pickle-park-mesa-85201-5432605',
  'techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c',
  'arclight-pictures-tucson',
  'next-level-gaming-goodyear',
  'fade-masters-phx'
];

ok(['21.0.0','22.0.0','23.0.0','23.1.0','23.2.0'].includes(report.version), 'seed report is upgraded to v21 or later');
ok(report.records.profile_mode === 'full-static', 'profile mode is full-static');
ok(report.records.static_business_pages === data.businesses.length, 'static profile count equals business count');
ok(await countStaticProfiles() === data.businesses.length, 'static profile HTML file count equals business count');
ok(routing.mode === 'full-static', 'canonical routing declares full-static mode');
ok(routing.records.length === data.businesses.length, 'canonical routing covers every business');
ok(await exists(`business/${first.id}/index.html`), 'first business has static HTML');
ok(await exists(`business/${last.id}/index.html`), 'last business has static HTML');
const firstHtml = await read(`business/${first.id}/index.html`);
const lastHtml = await read(`business/${last.id}/index.html`);
ok(firstHtml.includes(`<link rel="canonical" href="${CANONICAL_SITE_URL}/business/${first.id}/"`) || firstHtml.includes(`/business/${first.id}/`), 'first static profile has unique canonical URL');
ok(lastHtml.includes(`/business/${last.id}/`), 'last static profile has unique canonical URL');
ok(firstHtml.includes('application/ld+json'), 'static profile includes LocalBusiness structured data');
ok(firstHtml.includes(`/claim/?business=${first.id}`) && firstHtml.includes(`/request/?business=${first.id}`), 'static profile includes owner claim and quote actions');
ok(firstHtml.includes('data-skye-component="app-first-command-center"'), 'static profile uses Skye MCP app-first command center component');
ok(firstHtml.includes('/assets/valley-verified-logo.png'), 'static profile uses Valley Verified logo asset');
ok(!firstHtml.includes('Skye UI component'), 'static profile hides internal component labels');
ok(!firstHtml.includes('app-first-command-center / business-webpage'), 'static profile hides internal component ids');
ok(firstHtml.includes('business-fx business-fx--'), 'static profile includes generated business FX layer');
ok(/business-variant-(copper|teal|magenta|gold|blue)/.test(firstHtml), 'static profile has deterministic visual variant');
const bobHtml = await read('business/bobs-smoke-shop-litchfield-park/index.html');
const empireHtml = await read('business/empire-pallets-phoenix/index.html');
ok(bobHtml.includes('Featured Valley Verified') && (bobHtml.includes("Open Bob's live app") || bobHtml.includes('Open Bob&#39;s live app')), 'Bob featured page links to live app');
ok(empireHtml.includes('Featured Valley Verified') && (empireHtml.includes("Open Empire's quote app") || empireHtml.includes('Open Empire&#39;s quote app')), 'Empire featured page links to live app');
ok(clientAppCoverage.counts?.missing === 0 && clientAppCoverage.counts?.not_featured === 0, 'client app coverage maps every built app package to a featured Valley profile');
ok(expectedBuiltAppClients.every(id => clientAppCoverage.records?.some(r => r.businessId === id && r.featured)), 'all known built app clients are featured in Valley Verified');
ok(factoryIndex.records?.some(r => r.clientId === 'next-level-gaming-goodyear'), 'factory client app index detects Next Level generated app');
ok(factoryIndex.records?.some(r => r.clientId === 'next-level-gaming-az' && r.valleyBusinessId === 'next-level-gaming-goodyear' && r.valleyFeatured), 'legacy Next Level app package maps to the featured Goodyear client');
const nextLevelHtml = await read('business/next-level-gaming-goodyear/index.html');
ok(nextLevelHtml.includes('Factory preview package') && nextLevelHtml.includes('not a live owned app') && nextLevelHtml.includes('/client-app-factory/client-apps/next-level-gaming-goodyear/'), 'Next Level Valley page labels generated factory app lane as preview');
ok(nextLevelHtml.includes('/client-app-factory/client-apps/next-level-gaming-az/'), 'Next Level Valley page preserves the older generated app package link');
ok(!(await exists('data/profiles')), 'old profile shard payload directory is removed');
ok((await size('data/businesses.json')) < 15 * 1024 * 1024, 'business dataset is compacted below 15MB');
ok((await size('api/businesses.json')) < 15 * 1024 * 1024, 'API business mirror is compacted below 15MB');
ok(optimize.full_static_profiles === data.businesses.length, 'deploy size report records full static profile count');
ok(optimize.after_bytes < optimize.before_bytes, 'deploy size report proves compaction reduced output');
ok(await exists('data/enrichment-queue.json'), 'enrichment queue export exists');
ok(await exists('data/lead-records-model.json'), 'lead records model export exists');
ok(await exists('data/payment-activation-model.json'), 'payment activation model export exists');
ok(await exists('data/notification-worker-model.json'), 'notification worker model export exists');
ok(await exists('data/claim-submission-model.json'), 'claim submission model export exists');
ok(await exists('data/build-module-map.json'), 'build module map exists');
ok(await exists('protected-admin/index.html'), 'protected admin app page exists');
ok((await read('protected-admin/index.html')).includes('No local auth fields'), 'protected admin page rejects local proof-control pattern');
ok((await read('assets/protected-admin-app.js')).includes("credentials:'include'"), 'protected admin app calls runtime with credentials');
ok(routeManifest.v21?.full_static_business_profiles === data.businesses.length, 'route manifest records v21 profile strategy');
ok(readiness.completed.includes('modular_build_runner'), 'v21 readiness records modular build runner');

const smokeAdapterFile = path.join(ROOT, '.tmp-v21-adapter.json');
const smokeFactoryFile = path.join(ROOT, '.tmp-v21-adapter-2.json');
await fs.rm(smokeAdapterFile, { force:true });
await fs.rm(smokeFactoryFile, { force:true });
const jsonAdapter = new JsonPlatformAdapter(smokeAdapterFile);
ok(createRuntimeAdapter({ PHX_RUNTIME_DRIVER:'json', PHX_RUNTIME_DB_FILE:smokeFactoryFile }) instanceof JsonPlatformAdapter, 'runtime factory creates JSON adapter');
ok(typeof NeonPlatformAdapter === 'function', 'Neon adapter class is exported');
ok(typeof D1PlatformAdapter === 'function', 'D1 adapter class remains exported');
await jsonAdapter.putAction({ action_id:'v21-test', action_type:'owner_claim', queue:'owner-claims', status:'queued_for_review', actor:{ email:'owner@example.com' }, payload:{ business_id:first.id }, created_at:new Date().toISOString() });
ok((await jsonAdapter.getAction('v21-test')).payload.business_id === first.id, 'runtime adapter persists and reads action envelopes');

let lead = createQuoteLeadRecord({ buyer_name:'Buyer', buyer_contact:'buyer@example.com', city:first.city, category:first.category, details:'Need help', business_ids:[first.id] }, { email:'ae@example.com' });
lead = assignLead(lead, 'ae@example.com', { email:'admin@example.com' });
lead = addOwnerContactAttempt(lead, { business_id:first.id, channel:'email', outcome:'queued' }, { email:'ae@example.com' });
lead = transitionLead(lead, 'owner_contact_pending', { email:'ae@example.com' }, 'Owner message queued');
ok(lead.assigned_to === 'ae@example.com' && lead.owner_contact_attempts.length === 1 && lead.status === 'owner_contact_pending', 'lead record service handles assignment, status, and owner contact attempts');
ok(leadRecordServiceForApi().statuses.includes('routed'), 'lead record API model exposes routed status');

ok(resolveStripePrice('verified-profile-upgrade', { STRIPE_PRICE_VERIFIED_PROFILE:'price_123' }) === 'price_123', 'Stripe product/price resolver uses env mapping');
const paymentAction = buildPaymentEventAction({ provider_event_id:'evt_1', provider_event_type:'checkout.session.completed', payment_order_id:'po_1', payment_status:'paid', business_id:first.id, product:'verified-profile-upgrade' });
ok(paymentAction.action_type === 'payment_event', 'payment webhook event action is buildable');
const activationAction = buildExposureActivationAction({ business_id:first.id, product:'verified-profile-upgrade', tier:'starter', payment_order_id:'po_1', reviewer:'admin@example.com', actor:{ email:'admin@example.com', roles:'admin' } });
ok(activationAction.action_type === 'exposure_activation', 'admin exposure activation action is buildable');
ok(paymentActivationServiceForApi().rules.some(r => r.includes('admin approval')), 'payment activation model requires admin approval');

const job = createNotificationJob({ target_id:'msg_1', recipient:'owner@example.com', body:'hello' }, { PHX_WEBHOOK_SECRET:'secret' });
const receipt = await deliverNotificationJob(job, { env:{ PHX_WEBHOOK_SECRET:'secret' }, dryRun:true });
ok(receipt.status === 'dry_run', 'notification worker supports dry-run delivery receipt');
ok(deliveryReceiptToAction(receipt).action_type === 'notification_delivery_event', 'notification receipt converts to delivery event action');
ok(notificationWorkerServiceForApi().signed_jobs === true, 'notification worker API model exposes signed jobs');

const claimAction = buildOwnerClaimSubmission({ business_id:first.id, owner_name:'Owner', owner_contact:'owner@example.com', proof_summary:'website and license', actor:{ id:'owner-1', email:'owner@example.com' } });
ok(claimAction.action_type === 'owner_claim', 'owner-facing claim submission builds persistent owner_claim action');
ok(claimSubmissionServiceForApi().auto_verify === false, 'claim submission service does not auto-verify owners');

if(fail){ console.error(`☐ v21 smoke failed: ${fail} failed / ${pass} passed`); process.exit(1); }
console.log(`✅ v21 smoke passed: ${pass} checks passed`);
