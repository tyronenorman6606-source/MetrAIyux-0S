import crypto from 'node:crypto';
import { buildExposureOrder, findExposureProduct } from './exposure-service.mjs';
import { createActionEnvelope } from './contracts.mjs';
import { requireActionPolicy } from './policy.mjs';

export const PAYMENT_SERVICE_VERSION = '19.0.0';

function nowIso(){ return new Date().toISOString(); }
function stableId(value){ return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24); }
function dollarsToCents(value){ return Math.round(Number(value || 0) * 100); }
function cleanUrl(value, fallback = ''){
  const raw = String(value || '').trim();
  if(!raw) return fallback;
  try{ const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback; }catch{ return fallback; }
}
function normalizeProvider(value){ return String(value || process.env.PHX_PAYMENT_PROVIDER || 'dry-run').toLowerCase().replace(/_/g, '-'); }

export function buildPaymentOrder({ business_id, product, tier, buyer_contact, customer_email = '', success_url = '', cancel_url = '', metadata = {}, actor = {}, source = 'payment-service' } = {}){
  const selected = findExposureProduct(product, tier);
  if(!selected){ const error = new Error(`Unknown exposure product/tier: ${product}/${tier}`); error.status = 400; throw error; }
  const exposure = buildExposureOrder({ business_id, product, tier, buyer_contact, actor, source });
  const order = {
    payment_order_id:`pay-order-${stableId({ business_id, product, tier, buyer_contact, customer_email })}`,
    exposure_order_id:exposure.order.order_id,
    business_id,
    product,
    tier,
    buyer_contact,
    customer_email:customer_email || buyer_contact,
    status:'checkout_required',
    created_at:nowIso(),
    currency:'USD',
    amounts:{ monthly_cents:dollarsToCents(selected.monthly_price), setup_cents:dollarsToCents(selected.setup_price), first_invoice_cents:dollarsToCents(selected.monthly_price + selected.setup_price) },
    success_url:cleanUrl(success_url, 'https://example.com/exposure/success'),
    cancel_url:cleanUrl(cancel_url, 'https://example.com/exposure/cancel'),
    metadata:{ ...metadata, business_id, product, tier },
    exposure_action:exposure.order.action
  };
  return { order, exposure };
}

export class DryRunPaymentAdapter {
  constructor(){ this.provider = 'dry-run'; }
  async createCheckoutSession(order){
    const session = {
      provider:this.provider,
      session_id:`dry-session-${stableId(order)}`,
      checkout_url:`/exposure-orders/?dry_run_session=${encodeURIComponent(order.payment_order_id)}`,
      status:'created_not_paid',
      payment_status:'unpaid',
      amount_total:order.amounts.first_invoice_cents,
      currency:order.currency,
      created_at:nowIso(),
      provider_claim:'No external checkout was called. This is local proof only.'
    };
    return { order:{ ...order, status:'checkout_created', checkout_session:session }, session };
  }
}

export class StripePaymentAdapter {
  constructor({ secretKey = process.env.STRIPE_SECRET_KEY, fetchImpl = globalThis.fetch } = {}){
    if(!secretKey) throw new Error('STRIPE_SECRET_KEY is required for StripePaymentAdapter.');
    if(typeof fetchImpl !== 'function') throw new Error('fetch implementation required for StripePaymentAdapter.');
    this.provider = 'stripe';
    this.secretKey = secretKey;
    this.fetchImpl = fetchImpl;
  }
  async createCheckoutSession(order){
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('success_url', order.success_url);
    params.set('cancel_url', order.cancel_url);
    if(order.customer_email) params.set('customer_email', order.customer_email);
    params.set('client_reference_id', order.payment_order_id);
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price_data][currency]', order.currency.toLowerCase());
    params.set('line_items[0][price_data][recurring][interval]', 'month');
    params.set('line_items[0][price_data][unit_amount]', String(order.amounts.monthly_cents));
    params.set('line_items[0][price_data][product_data][name]', `Valley Verified ${order.product} ${order.tier}`);
    for(const [key, value] of Object.entries(order.metadata || {})) params.set(`metadata[${key}]`, String(value));
    params.set('metadata[payment_order_id]', order.payment_order_id);
    params.set('metadata[exposure_order_id]', order.exposure_order_id);
    const response = await this.fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',
      headers:{ authorization:`Bearer ${this.secretKey}`, 'content-type':'application/x-www-form-urlencoded', 'idempotency-key':order.payment_order_id },
      body:params
    });
    const body = await response.json().catch(async () => ({ raw:await response.text().catch(()=>'') }));
    if(!response.ok){ const error = new Error(`Stripe checkout session failed with status ${response.status}`); error.status = response.status; error.provider_response = body; throw error; }
    const session = { provider:this.provider, session_id:body.id, checkout_url:body.url, status:body.status || 'created', payment_status:body.payment_status || 'unpaid', amount_total:body.amount_total || order.amounts.first_invoice_cents, currency:body.currency || order.currency.toLowerCase(), provider_response:body };
    return { order:{ ...order, status:'checkout_created', checkout_session:session }, session };
  }
}

export function createPaymentAdapter(env = process.env, opts = {}){
  const provider = normalizeProvider(opts.provider || env.PHX_PAYMENT_PROVIDER);
  if(provider === 'stripe') return new StripePaymentAdapter({ secretKey:env.STRIPE_SECRET_KEY, fetchImpl:opts.fetchImpl || globalThis.fetch });
  if(['dry-run','dryrun','local','mock-proof'].includes(provider)) return new DryRunPaymentAdapter();
  throw new Error(`Unsupported payment provider: ${provider}`);
}

export async function createExposureCheckoutSession(input = {}, { env = process.env, adapter = createPaymentAdapter(env), store } = {}){
  const actor = input.actor || {};
  requireActionPolicy({ type:'sponsor_intent', payload:{ business_id:input.business_id, product:input.product, tier:input.tier, buyer_contact:input.buyer_contact || input.customer_email || '' }, actor, source:input.source || 'payment-service' });
  const { order, exposure } = buildPaymentOrder(input);
  const checkout = await adapter.createCheckoutSession(order);
  const record = {
    version:PAYMENT_SERVICE_VERSION,
    provider:adapter.provider,
    status:'checkout_created_unpaid',
    created_at:nowIso(),
    payment_order:checkout.order,
    checkout_session:checkout.session,
    exposure_order:exposure.order,
    next_required_code_wiring:['payment_webhook_signature_verification','payment_event_action_storage','admin_exposure_activation','provider_receipt_storage']
  };
  if(store?.putPaymentOrder) await store.putPaymentOrder(record);
  return record;
}

export function verifyStripeWebhookSignature(rawBody, signatureHeader, secret, toleranceSeconds = 300){
  if(!secret) throw new Error('Stripe webhook secret is required.');
  const header = String(signatureHeader || '');
  const parts = Object.fromEntries(header.split(',').map(part => part.split('=').map(x => x.trim())).filter(pair => pair.length === 2));
  const timestamp = parts.t;
  const signature = parts.v1;
  if(!timestamp || !signature) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if(Number.isFinite(age) && age > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyPhxPaymentSignature(rawBody, signatureHeader, secret = process.env.PHX_PAYMENT_WEBHOOK_SECRET || 'local-payment-secret'){
  const expected = crypto.createHmac('sha256', secret).update(String(rawBody || '')).digest('hex');
  const actual = String(signatureHeader || '').replace(/^sha256=/, '');
  if(!actual || actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function normalizePaymentEvent({ provider = 'dry-run', event = {}, rawBody = '' } = {}){
  const p = normalizeProvider(provider);
  if(p === 'stripe'){
    const object = event?.data?.object || {};
    const metadata = object.metadata || {};
    return {
      provider:'stripe',
      provider_event_id:event.id || '',
      provider_event_type:event.type || '',
      payment_order_id:metadata.payment_order_id || object.client_reference_id || '',
      exposure_order_id:metadata.exposure_order_id || '',
      business_id:metadata.business_id || '',
      product:metadata.product || '',
      tier:metadata.tier || '',
      payment_status:object.payment_status || (event.type === 'invoice.paid' ? 'paid' : object.status || 'unknown'),
      amount_paid_cents:object.amount_total || object.amount_paid || 0,
      currency:String(object.currency || 'usd').toUpperCase(),
      raw_event_hash:crypto.createHash('sha256').update(String(rawBody || JSON.stringify(event))).digest('hex')
    };
  }
  return {
    provider:p,
    provider_event_id:event.event_id || event.id || `local-${stableId(event)}`,
    provider_event_type:event.type || event.event_type || 'checkout.session.completed',
    payment_order_id:event.payment_order_id || event.order_id || '',
    exposure_order_id:event.exposure_order_id || '',
    business_id:event.business_id || '',
    product:event.product || '',
    tier:event.tier || '',
    payment_status:event.payment_status || event.status || 'paid',
    amount_paid_cents:Number(event.amount_paid_cents || event.amount_total || 0),
    currency:String(event.currency || 'USD').toUpperCase(),
    raw_event_hash:crypto.createHash('sha256').update(String(rawBody || JSON.stringify(event))).digest('hex')
  };
}

export function createPaymentEventAction(normalized, { actor = { id:'payment-provider', email:'', roles:'system', allowLocal:true }, source = 'payment-webhook' } = {}){
  return createActionEnvelope({ type:'payment_event', actor, source, payload:normalized });
}

export async function handlePaymentWebhook({ provider = 'dry-run', rawBody = '', headers = {}, actor, source = 'payment-webhook' } = {}, { env = process.env, store } = {}){
  const p = normalizeProvider(provider);
  if(p === 'stripe'){
    const signature = headers['stripe-signature'] || headers['Stripe-Signature'];
    if(!verifyStripeWebhookSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)){ const error = new Error('Invalid Stripe webhook signature.'); error.status = 401; throw error; }
  } else if(p !== 'dry-run'){
    const signature = headers['x-phx-payment-signature'] || headers['X-PHX-Payment-Signature'];
    if(!verifyPhxPaymentSignature(rawBody, signature, env.PHX_PAYMENT_WEBHOOK_SECRET)){ const error = new Error('Invalid payment webhook signature.'); error.status = 401; throw error; }
  }
  const event = JSON.parse(rawBody || '{}');
  const normalized = normalizePaymentEvent({ provider:p, event, rawBody });
  const action = createPaymentEventAction(normalized, { actor, source });
  if(store?.put) await store.put(action);
  return { ok:true, normalized, action, status:'payment_recorded_pending_admin_activation' };
}

export function paymentServiceForApi(){
  return {
    version:PAYMENT_SERVICE_VERSION,
    providers:['dry-run','stripe'],
    endpoints:['/.netlify/functions/phx-payment'],
    actions:['create_checkout_session','payment_webhook'],
    rules:['Checkout creation never marks a listing paid.','Payment webhooks create payment_event actions only after signature verification.','Paid exposure remains pending admin activation until exposure_activation is approved.']
  };
}
