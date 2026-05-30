const crypto = require('crypto');
const { canonicalize } = require('./export-import');
const { createCheckoutSession, appendPurchase, emptyCommerceState, locateExistingPurchase } = require('./commerce');

function nowIso() { return new Date().toISOString(); }
function cents(amountUsd) { return Math.round(Number(amountUsd || 0) * 100); }
function cleanBase(value, fallback) { return String(value || fallback || '').replace(/\/+$/, ''); }
function sessionId(input) {
  return `skypay_${crypto.createHash('sha256').update(JSON.stringify(canonicalize(input))).digest('hex').slice(0, 16)}`;
}

function resolvePaymentProvider(config = {}) {
  const provider = String(config.provider || config.paymentProvider || 'skypay').toLowerCase();
  const legacyAlias = provider === 'stripe';
  if (!['skypay', 'fs27-skypay', '0s-skypay', 'stripe'].includes(provider)) throw new Error(`Unsupported payment provider (${provider}).`);
  return canonicalize({
    provider: 'skypay',
    mode: 'fs27-gate-owned',
    api_base: cleanBase(config.apiBase || config.skyPayApiBase || process.env.SKYEPAY_API_BASE, 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev'),
    legacy_alias: legacyAlias ? 'stripe-disabled' : null
  });
}

function skyPayCheckoutUrl(input = {}, config = {}) {
  const base = cleanBase(config.checkoutBase || config.skyPayUrl || process.env.SKYEPAY_CHECKOUT_URL, 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/skyepay.html');
  const url = new URL(base);
  url.searchParams.set('source', 'devisional-riftx');
  url.searchParams.set('title', input.title || 'Sovereign Author Publishing OS');
  url.searchParams.set('amount_usd', String(Number(input.amount_usd || 0)));
  if (input.customer_email) url.searchParams.set('customer_email', input.customer_email);
  if (input.metadata?.slug) url.searchParams.set('slug', input.metadata.slug);
  return url.toString();
}

function stripeCredentialReadiness(config = {}) {
  const resolved = resolvePaymentProvider(config);
  return canonicalize({
    schema: 'skye.payment.provider.credential-readiness',
    version: '4.0.0',
    provider: resolved.provider,
    provider_mode: resolved.mode,
    has_secret_key: false,
    has_webhook_secret: false,
    livemode_expected: false,
    probe_ready: true,
    webhook_ready: true,
    external_provider_disabled: true,
    auth_owner: 'FS27/SkyGate/Free99 shared gate',
    payment_owner: 'SkyPay'
  });
}

async function probeStripeEnvironment(config) {
  const resolved = resolvePaymentProvider(config);
  return canonicalize({
    schema: 'skye.payment.provider.probe',
    version: '4.0.0',
    provider: 'skypay',
    provider_mode: resolved.mode,
    api_base: resolved.api_base,
    livemode: false,
    object: 'skypay-gate-owned-payment-lane',
    available_count: 1,
    pending_count: 0,
    raw: {
      ok: true,
      note: 'Direct provider probes are disabled in the copied source. Payment movement is handed to SkyPay/FS27.'
    }
  });
}

async function createPaymentSession(input, config = {}) {
  const resolved = resolvePaymentProvider(config);
  const id = sessionId({ input, at: Date.now() });
  return canonicalize({
    schema: 'skye.payment.session',
    version: '4.0.0',
    provider: 'skypay',
    provider_mode: resolved.mode,
    api_base: resolved.api_base,
    session_id: id,
    checkout_url: skyPayCheckoutUrl(input, config),
    amount_total: cents(input.amount_usd),
    amount_subtotal: cents(input.amount_usd),
    payment_status: 'pending_skyepay_confirmation',
    status: 'owner_approval_or_checkout_required',
    currency: input.currency || 'usd',
    title: input.title,
    customer_email: input.customer_email,
    metadata: canonicalize({ ...(input.metadata || {}), source: 'devisional-riftx', fs27_tracked: true }),
    raw: {
      ok: true,
      provider: 'skypay',
      external_provider_disabled: true,
      money_movement_boundary: 'SkyPay confirms money movement before fulfillment.'
    }
  });
}

async function retrieveStripeCheckoutSession(sessionIdValue, config = {}) {
  const resolved = resolvePaymentProvider(config);
  return canonicalize({
    schema: 'skye.payment.session.status',
    version: '4.0.0',
    provider: 'skypay',
    api_base: resolved.api_base,
    session_id: sessionIdValue,
    status: 'pending_skyepay_confirmation',
    payment_status: 'requires_skypay',
    customer_email: null,
    amount_total: null,
    currency: 'usd',
    metadata: { source: 'devisional-riftx' },
    line_items: [],
    raw: { livemode: false, external_provider_disabled: true }
  });
}

async function reconcileStripePaymentSession(sessionIdValue, config, authorPackage, existingState, options = {}) {
  const status = await retrieveStripeCheckoutSession(sessionIdValue, config);
  const nextState = existingState && existingState.schema === 'skye.directsale.state' ? existingState : emptyCommerceState();
  if (options.skyPayConfirmed !== true && options.ownerApproved !== true) {
    return canonicalize({
      status,
      commerce: nextState,
      finalized: false,
      reason: 'skypay-confirmation-required'
    });
  }
  const event = { id: `skypay_${sessionIdValue}`, type: 'skypay.checkout.confirmed', data: { object: { id: sessionIdValue, customer_email: options.customer_email || 'buyer@example.com' } } };
  return canonicalize({
    status: { ...status, payment_status: 'paid', status: 'complete' },
    commerce: finalizePayment(event, authorPackage, { name: options.customer_name || 'SkyPay Customer', email: options.customer_email || 'buyer@example.com' }, nextState, { sessionId: sessionIdValue }),
    finalized: true,
    reason: null
  });
}

function signStripeWebhookPayload(payload, signingSecret, timestamp = Math.floor(Date.now() / 1000)) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', signingSecret || 'skypay-fs27-proof').update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

function verifyStripeWebhook(rawBody, signatureHeader, signingSecret, toleranceSeconds = 300) {
  const issues = [];
  const header = String(signatureHeader || '');
  const timestampMatch = /t=(\d+)/.exec(header);
  const signatureMatch = /v1=([a-f0-9]+)/.exec(header);
  if (!timestampMatch || !signatureMatch) issues.push('malformed-signature');
  let event = null;
  if (!issues.length) {
    const expected = crypto.createHmac('sha256', signingSecret || 'skypay-fs27-proof').update(`${timestampMatch[1]}.${rawBody}`).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureMatch[1]))) issues.push('signature');
    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestampMatch[1]));
    if (age > toleranceSeconds) issues.push('timestamp-window');
    try { event = JSON.parse(rawBody); } catch { issues.push('payload'); }
  }
  return canonicalize({
    schema: 'skye.payment.webhook.verification',
    version: '4.0.0',
    ok: issues.length === 0,
    issues,
    provider: 'skypay',
    external_provider_disabled: true,
    event
  });
}

function deriveCheckoutSessionFromEvent(event, authorPackage, buyer, options = {}) {
  const id = event?.data?.object?.id || options.sessionId || `skypay_${crypto.randomBytes(6).toString('hex')}`;
  return createCheckoutSession(authorPackage, buyer, { runId: event?.id || options.runId || 'skypay-event', sessionId: id });
}

function finalizePayment(event, authorPackage, buyer, existingState, options = {}) {
  const state = existingState && existingState.schema === 'skye.directsale.state' ? existingState : emptyCommerceState();
  const checkoutSession = deriveCheckoutSessionFromEvent(event, authorPackage, buyer, options);
  const existing = locateExistingPurchase(state, checkoutSession);
  if (existing) return canonicalize(state);
  return appendPurchase(state, checkoutSession);
}

function paymentSummary(session) {
  if (!session) return canonicalize({ schema: 'skye.payment.summary', version: '4.0.0', ok: false });
  return canonicalize({
    schema: 'skye.payment.summary',
    version: '4.0.0',
    ok: true,
    provider: 'skypay',
    provider_mode: session.provider_mode || 'fs27-gate-owned',
    session_id: session.session_id,
    amount_total: session.amount_total,
    currency: session.currency,
    customer_email: session.customer_email || null,
    title: session.title || null,
    payment_status: session.payment_status || null,
    status: session.status || null,
    skypay_handoff: session.checkout_url || null,
    recorded_at: nowIso()
  });
}

module.exports = {
  resolvePaymentProvider,
  stripeCredentialReadiness,
  probeStripeEnvironment,
  createPaymentSession,
  retrieveStripeCheckoutSession,
  reconcileStripePaymentSession,
  signStripeWebhookPayload,
  verifyStripeWebhook,
  deriveCheckoutSessionFromEvent,
  finalizePayment,
  paymentSummary
};
