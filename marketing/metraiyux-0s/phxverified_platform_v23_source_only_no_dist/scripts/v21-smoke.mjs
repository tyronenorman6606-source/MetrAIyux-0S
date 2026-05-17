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
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
async function exists(rel){ try{ await fs.access(path.join(DIST, rel)); return true; }catch{ return false; } }
async function read(rel){ return fs.readFile(path.join(DIST, rel), 'utf8'); }
async function json(rel){ return JSON.parse(await read(rel)); }
async function size(rel=''){ const target = path.join(DIST, rel); const st = await fs.stat(target); if(st.isFile()) return st.size; let total=0; for(const e of await fs.readdir(target)) total += await size(path.join(rel,e)); return total; }

const data = await json('data/businesses.json');
const report = await json('seed-report.json');
const optimize = await json('data/deploy-size-report.json');
const routing = await json('data/canonical-routing.json');
const readiness = await json('data/v21-code-readiness.json');
const routeManifest = await json('data/route-manifest.json');
const first = data.businesses[0];
const last = data.businesses[data.businesses.length - 1];

ok(['21.0.0','22.0.0','23.0.0'].includes(report.version), 'seed report is upgraded to v21 or later');
ok(report.records.profile_mode === 'full-static', 'profile mode is full-static');
ok(report.records.static_business_pages === data.businesses.length, 'static profile count equals business count');
ok(routing.mode === 'full-static', 'canonical routing declares full-static mode');
ok(routing.records.length === data.businesses.length, 'canonical routing covers every business');
ok(await exists(`business/${first.id}/index.html`), 'first business has static HTML');
ok(await exists(`business/${last.id}/index.html`), 'last business has static HTML');
const firstHtml = await read(`business/${first.id}/index.html`);
const lastHtml = await read(`business/${last.id}/index.html`);
ok(firstHtml.includes(`<link rel="canonical" href="https://phxverified.netlify.app/business/${first.id}/"`) || firstHtml.includes(`/business/${first.id}/`), 'first static profile has unique canonical URL');
ok(lastHtml.includes(`/business/${last.id}/`), 'last static profile has unique canonical URL');
ok(firstHtml.includes('application/ld+json'), 'static profile includes LocalBusiness structured data');
ok(firstHtml.includes('Claim / update') && firstHtml.includes('Request quote'), 'static profile includes owner claim and quote actions');
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

const jsonAdapter = new JsonPlatformAdapter(path.join(ROOT, '.tmp-v21-adapter.json'));
ok(createRuntimeAdapter({ PHX_RUNTIME_DRIVER:'json', PHX_RUNTIME_DB_FILE:path.join(ROOT, '.tmp-v21-adapter-2.json') }) instanceof JsonPlatformAdapter, 'runtime factory creates JSON adapter');
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
