import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createExposureCheckoutSession, DryRunPaymentAdapter, verifyStripeWebhookSignature, verifyPhxPaymentSignature, handlePaymentWebhook, createPaymentEventAction } from '../src/server/payment-service.mjs';
import { MemoryActionStore } from '../src/server/storage.mjs';
import { MemoryPlatformStateStore } from '../src/server/state-store.mjs';
import { handleAdminRequest } from '../src/server/admin-api.mjs';
import { handler as paymentHandler } from '../netlify/functions/phx-payment.mjs';
import { createActionEnvelope } from '../src/server/contracts.mjs';

let pass = 0;
let fail = 0;
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
async function exists(file){ try{ await fs.access(file); return true; }catch{ return false; } }
const actor = { id:'owner-1', email:'owner@example.com', roles:'owner admin ae buyer system', allowLocal:true };

ok(await exists('dist/payment-service/index.html'), 'Payment service page exists');
ok(await exists('dist/admin-console/index.html'), 'Admin console page exists');
ok(await exists('dist/assets/admin-console.js'), 'Admin console browser asset exists');
ok(await exists('dist/data/payment-service-model.json'), 'Payment service model export exists');
ok(await exists('dist/api/payment-service-model.json'), 'Payment service API export exists');

const checkout = await createExposureCheckoutSession({ business_id:'demo-business', product:'verified_profile_upgrade', tier:'starter', buyer_contact:'owner@example.com', customer_email:'owner@example.com', actor }, { adapter:new DryRunPaymentAdapter() });
ok(checkout.status === 'checkout_created_unpaid', 'Dry-run checkout session is created but unpaid');
ok(checkout.checkout_session.payment_status === 'unpaid', 'Checkout creation does not fake paid status');
ok(checkout.exposure_order.action.action_type === 'sponsor_intent', 'Checkout links to sponsor_intent action');

const stripeSecret = 'whsec_test_secret';
const raw = JSON.stringify({ id:'evt_1', type:'checkout.session.completed', data:{ object:{ client_reference_id:'pay-order-1', payment_status:'paid', amount_total:4900, currency:'usd', metadata:{ payment_order_id:'pay-order-1', exposure_order_id:'exposure-1', business_id:'demo-business', product:'verified_profile_upgrade', tier:'starter' } } } });
const timestamp = Math.floor(Date.now()/1000);
const stripeSig = crypto.createHmac('sha256', stripeSecret).update(`${timestamp}.${raw}`).digest('hex');
ok(verifyStripeWebhookSignature(raw, `t=${timestamp},v1=${stripeSig}`, stripeSecret), 'Stripe webhook signature verifier accepts valid signature');
ok(!verifyStripeWebhookSignature(raw, `t=${timestamp},v1=${'0'.repeat(64)}`, stripeSecret), 'Stripe webhook signature verifier rejects invalid signature');

const phxSecret = 'local-payment-secret';
const phxRaw = JSON.stringify({ event_id:'evt-local', payment_order_id:'pay-order-2', business_id:'demo-business', product:'category_boost', tier:'growth', payment_status:'paid', amount_paid_cents:14900 });
const phxSig = crypto.createHmac('sha256', phxSecret).update(phxRaw).digest('hex');
ok(verifyPhxPaymentSignature(phxRaw, `sha256=${phxSig}`, phxSecret), 'PHX payment signature verifier accepts valid signature');
ok(!verifyPhxPaymentSignature(phxRaw, 'sha256=bad', phxSecret), 'PHX payment signature verifier rejects invalid signature');

const store = new MemoryActionStore();
const webhookResult = await handlePaymentWebhook({ provider:'dry-run', rawBody:phxRaw, headers:{}, actor:{ id:'payment-provider', roles:'system', allowLocal:true } }, { store });
ok(webhookResult.action.action_type === 'payment_event', 'Payment webhook creates payment_event action');
ok((await store.list('payment-events')).length === 1, 'Payment event action stores in payment-events queue');

const state = new MemoryPlatformStateStore();
await state.applyAction(webhookResult.action, { decision:'approved', reviewer:'system' });
const summary = await state.summary();
ok(summary.counts.payment_events === 1, 'State projector records payment event');
ok((await state.read()).sponsor_intents['demo-business'].status === 'paid_pending_admin_activation', 'Payment event marks sponsor intent paid pending admin activation');
const activation = createActionEnvelope({ type:'exposure_activation', actor, payload:{ business_id:'demo-business', product:'category_boost', tier:'growth', payment_order_id:'pay-order-2', placement_status:'active', reviewer:'admin@example.com' }, source:'v19-smoke' });
await state.applyAction(activation, { decision:'approved', reviewer:'admin@example.com' });
ok((await state.read()).exposure_activations['demo-business'].placement_status === 'active', 'Exposure activation action projects active placement state');

const adminCheckout = await handleAdminRequest({ method:'POST', headers:{ 'x-upstream-user-id':'owner-1', 'x-upstream-user-email':'owner@example.com', 'x-upstream-roles':'owner admin ae buyer' }, body:JSON.stringify({ operation:'create_checkout_session', payload:{ business_id:'demo-business', product:'verified_profile_upgrade', tier:'starter', buyer_contact:'owner@example.com', customer_email:'owner@example.com' } }) }, { store:new MemoryActionStore(), stateStore:new MemoryPlatformStateStore(), businessIndex:{ assert:async()=>true }, env:{ PHX_PAYMENT_PROVIDER:'dry-run' } });
ok(adminCheckout.statusCode === 202, 'Admin API create_checkout_session returns accepted');

const serviceGet = await paymentHandler({ httpMethod:'GET', headers:{}, queryStringParameters:{}, body:'' });
ok(serviceGet.statusCode === 200 && JSON.parse(serviceGet.body).service.providers.includes('stripe'), 'Payment Netlify function exposes service model');
const noAuthCheckout = await paymentHandler({ httpMethod:'POST', headers:{}, queryStringParameters:{}, body:JSON.stringify({ operation:'create_checkout_session', payload:{ business_id:'demo-business', product:'verified_profile_upgrade', tier:'starter', buyer_contact:'owner@example.com' } }) });
ok(noAuthCheckout.statusCode === 401, 'Payment checkout endpoint rejects missing upstream identity');
const webhookAccepted = await paymentHandler({ httpMethod:'POST', headers:{}, queryStringParameters:{ operation:'webhook', provider:'dry-run' }, body:phxRaw });
ok(webhookAccepted.statusCode === 202, 'Payment webhook endpoint accepts dry-run provider event for proof');

if(fail){ console.error(`☐ v19 smoke failed: ${fail} failed / ${pass} passed`); process.exit(1); }
console.log(`✅ v19 smoke passed: ${pass} checks passed`);
