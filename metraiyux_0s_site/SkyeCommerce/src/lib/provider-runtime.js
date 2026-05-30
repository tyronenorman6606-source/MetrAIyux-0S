import { buildNativeProviderDispatch, buildProviderHealthSpec, providerConnectionRecord, requiredSecretsForProvider } from './provider-adapters.js';
import { executeZeroOsAutomationAction } from '../../../cloudflare/zero-os-automation-spine.mjs';

function normalizedText(value = '') {
  return String(value || '').trim();
}

function envValue(env = {}, key = '') {
  return env?.[key] || env?.vars?.[key] || '';
}

function providerRuntimeSandboxEnabled(env = {}) {
  return ['SKYECOMMERCE_PROVIDER_RUNTIME_SANDBOX', 'ZERO_OS_PROVIDER_SANDBOX']
    .some((name) => ['1', 'true'].includes(String(envValue(env, name)).toLowerCase()));
}

function publicRuntime(receipt = null) {
  if (!receipt) return null;
  return {
    receipt_id: receipt.id || null,
    status: receipt.status || null,
    provider_id: receipt.provider_id || null,
    action: receipt.action || null,
    executed: receipt.executed === true,
    provider_call_made: receipt.provider_call_made === true,
    stored: receipt.stored === true,
    error: receipt.error || ''
  };
}

async function runCommerceProviderRuntime(env = {}, { provider_id, action, payload = {}, usage_lane = '', customer_id = '' } = {}) {
  const sandbox = providerRuntimeSandboxEnabled(env);
  const runtime = await executeZeroOsAutomationAction(env, {}, {
    provider_id,
    action,
    app_id: 'skyecommerce',
    customer_id,
    usage_lane: usage_lane || `skyecommerce.${action}`,
    live: !sandbox,
    sandbox,
    owner_approved: true,
    payload
  }, {
    actor: 'skyecommerce-provider-runtime',
    identity: { role: 'system', email: 'skyecommerce@metraiyux.local' }
  }, {
    operator_ok: true
  });
  const receipt = runtime?.response?.receipt || null;
  return {
    ok: runtime?.response?.ok === true,
    status: runtime?.status || receipt?.http_status || 500,
    receipt,
    result: receipt?.provider_result || {}
  };
}

function providerRuntimeResult({ provider, action, runtime, request = {}, checkoutUrl = '', trackingNumber = '', labelUrl = '' } = {}) {
  const result = runtime?.result || {};
  return {
    provider,
    action,
    status: runtime?.ok ? 'executed' : 'failed',
    httpStatus: runtime?.status || 0,
    providerReference: action === 'payment_checkout' ? (result.id || result.payment_intent_id || '') : (result.payment_intent_id || result.id || result.request_id || ''),
    checkoutUrl: checkoutUrl || result.url || '',
    trackingNumber: trackingNumber || result.tracking_number || result.trackingNumber || '',
    labelUrl: labelUrl || result.label_url || result.labelUrl || '',
    response: result,
    provider_runtime: publicRuntime(runtime?.receipt),
    request: {
      method: 'PROVIDER_RUNTIME',
      url: `0s://provider-runtime/${provider}/${action}`,
      contentType: request.contentType || '',
      bodyKind: request.bodyKind || 'runtime-payload'
    }
  };
}

function formBodyToObject(body = '') {
  if (!body || typeof body !== 'string') return {};
  const params = new URLSearchParams(body);
  const out = {};
  for (const [key, value] of params.entries()) out[key] = value;
  return out;
}

export function missingProviderSecrets(env = {}, provider = '') {
  return requiredSecretsForProvider(provider).filter((key) => !normalizedText(envValue(env, key)));
}

export function assertProviderSecrets(env = {}, provider = '') {
  const missing = missingProviderSecrets(env, provider);
  if (missing.length) {
    const error = new Error(`Missing provider secret(s): ${missing.join(', ')}`);
    error.code = 'PROVIDER_SECRETS_MISSING';
    error.missing = missing;
    throw error;
  }
  return true;
}

export async function executeProviderHealth(connection = {}, env = {}, options = {}) {
  const normalized = providerConnectionRecord(connection);
  assertProviderSecrets(env, normalized.provider);
  const spec = buildProviderHealthSpec(normalized);
  const actionMap = {
    stripe: 'stripe.account.retrieve',
    resend: 'resend.domains.list',
    paypal: 'paypal.identity.userinfo',
    ups: 'ups.account.health',
    google_merchant: 'google_merchant.authinfo.get',
    meta_catalog: 'meta_catalog.catalog.get',
    tiktok_catalog: 'tiktok_catalog.catalog.get'
  };
  const payload = {
    endpoint_base: normalized.endpointBase || spec.endpointBase || '',
    merchant_id: normalized.config.merchantId || envValue(env, 'GOOGLE_MERCHANT_ID') || '',
    catalog_id: normalized.config.catalogId || envValue(env, normalized.provider === 'meta_catalog' ? 'META_CATALOG_ID' : 'TIKTOK_CATALOG_ID') || ''
  };
  const runtime = await runCommerceProviderRuntime(env, {
    provider_id: normalized.provider,
    action: actionMap[normalized.provider],
    usage_lane: `skyecommerce.provider_health.${normalized.provider}`,
    customer_id: normalized.merchantId || normalized.merchant_id || '',
    payload
  });
  return providerRuntimeResult({ provider: normalized.provider, action: 'health', runtime });
}

export async function executeNativeProviderDispatch(connection = {}, payload = {}, env = {}, options = {}) {
  const normalized = providerConnectionRecord(connection);
  assertProviderSecrets(env, normalized.provider);
  const spec = buildNativeProviderDispatch(normalized, payload);

  if (normalized.provider === 'stripe') {
    const runtime = await runCommerceProviderRuntime(env, {
      provider_id: 'stripe',
      action: 'stripe.checkout.create',
      usage_lane: 'skyecommerce.payment_checkout',
      customer_id: normalized.merchantId || normalized.merchant_id || '',
      payload: { params: formBodyToObject(spec.body) }
    });
    return providerRuntimeResult({ provider: normalized.provider, action: 'payment_checkout', runtime, checkoutUrl: runtime.result?.url || '' });
  }

  if (normalized.provider === 'paypal') {
    const runtime = await runCommerceProviderRuntime(env, {
      provider_id: 'paypal',
      action: 'paypal.checkout.order.create',
      usage_lane: 'skyecommerce.payment_checkout',
      customer_id: normalized.merchantId || normalized.merchant_id || '',
      payload: { endpoint_base: normalized.endpointBase || buildProviderHealthSpec(normalized).endpointBase || '', body: spec.body || {} }
    });
    return providerRuntimeResult({ provider: normalized.provider, action: 'payment_checkout', runtime, checkoutUrl: runtime.result?.url || '' });
  }

  if (normalized.provider === 'ups') {
    const runtime = await runCommerceProviderRuntime(env, {
      provider_id: 'ups',
      action: 'ups.shipment.create',
      usage_lane: 'skyecommerce.shipping_label',
      customer_id: normalized.merchantId || normalized.merchant_id || '',
      payload: { endpoint_base: normalized.endpointBase || buildProviderHealthSpec(normalized).endpointBase || '', body: spec.body || {} }
    });
    return providerRuntimeResult({ provider: normalized.provider, action: 'shipping_label', runtime });
  }

  if (normalized.provider === 'resend') {
    const runtime = await runCommerceProviderRuntime(env, {
      provider_id: 'resend',
      action: 'resend.email.send',
      usage_lane: 'skyecommerce.notification_send',
      customer_id: normalized.merchantId || normalized.merchant_id || '',
      payload: spec.body || {}
    });
    return providerRuntimeResult({ provider: normalized.provider, action: 'notification_send', runtime });
  }

  const actionMap = {
    google_merchant: 'google_merchant.products.batch',
    meta_catalog: 'meta_catalog.products.batch',
    tiktok_catalog: 'tiktok_catalog.products.upload'
  };
  const runtime = await runCommerceProviderRuntime(env, {
    provider_id: normalized.provider,
    action: actionMap[normalized.provider],
    usage_lane: 'skyecommerce.channel_sync',
    customer_id: normalized.merchantId || normalized.merchant_id || '',
    payload: {
      endpoint_base: normalized.endpointBase || buildProviderHealthSpec(normalized).endpointBase || '',
      merchant_id: normalized.config.merchantId || envValue(env, 'GOOGLE_MERCHANT_ID') || '',
      catalog_id: normalized.config.catalogId || envValue(env, normalized.provider === 'meta_catalog' ? 'META_CATALOG_ID' : 'TIKTOK_CATALOG_ID') || '',
      body: spec.body || {}
    }
  });
  return providerRuntimeResult({ provider: normalized.provider, action: 'channel_sync', runtime });
}

export async function executeProviderCarrierRates(connection = {}, payload = {}, env = {}, options = {}) {
  const normalized = providerConnectionRecord(connection);
  if (normalized.provider !== 'ups') {
    const error = new Error(`Provider ${normalized.provider} does not support carrier rates in this runtime.`);
    error.code = 'RATE_PROVIDER_UNSUPPORTED';
    throw error;
  }
  assertProviderSecrets(env, normalized.provider);
  const spec = buildNativeProviderDispatch(normalized, { action: 'carrier_rate', rateRequest: payload.rateRequest || payload, context: payload.context || {} });
  const runtime = await runCommerceProviderRuntime(env, {
    provider_id: 'ups',
    action: 'ups.rate.quote',
    usage_lane: 'skyecommerce.carrier_rate',
    customer_id: normalized.merchantId || normalized.merchant_id || '',
    payload: { endpoint_base: normalized.endpointBase || buildProviderHealthSpec(normalized).endpointBase || '', currency: payload.currency || payload.context?.currency || 'USD', body: spec.body || {} }
  });
  return { ...providerRuntimeResult({ provider: normalized.provider, action: 'carrier_rate', runtime }), rates: Array.isArray(runtime.result?.rates) ? runtime.result.rates : [] };
}
function paymentReferenceKind(reference = '') {
  const ref = String(reference || '');
  if (ref.startsWith('pi_')) return 'payment_intent';
  if (ref.startsWith('ch_')) return 'charge';
  if (ref.startsWith('cs_')) return 'checkout_session';
  return 'payment_intent';
}

export async function executeProviderRefund(connection = {}, payload = {}, env = {}, options = {}) {
  const normalized = providerConnectionRecord(connection);
  if (!['stripe', 'paypal'].includes(normalized.provider)) {
    const error = new Error(`Provider ${normalized.provider} does not support live refunds in this runtime.`);
    error.code = 'REFUND_PROVIDER_UNSUPPORTED';
    throw error;
  }
  assertProviderSecrets(env, normalized.provider);
  const refund = payload.refund || payload;
  const payment = payload.payment || {};
  const amountCents = Math.max(0, Number(refund.amountCents ?? refund.amount_cents ?? 0) || 0);
  const currency = String(refund.currency || payment.currency || 'USD').toLowerCase();
  const providerReference = String(refund.providerRef || refund.provider_ref || payment.providerReference || payment.provider_reference || '');

  if (normalized.provider === 'stripe') {
    const referenceKey = paymentReferenceKind(providerReference) === 'charge' ? 'charge' : 'payment_intent';
    const runtime = await runCommerceProviderRuntime(env, {
      provider_id: 'stripe',
      action: 'stripe.refund.create',
      usage_lane: 'skyecommerce.refund_submit',
      customer_id: normalized.merchantId || normalized.merchant_id || '',
      payload: { [referenceKey]: providerReference, amount_cents: amountCents, reason: refund.reason || 'requested_by_customer', metadata_order_id: refund.orderId || refund.order_id || payload.order?.id || '' }
    });
    return providerRuntimeResult({ provider: 'stripe', action: 'refund_submit', runtime });
  }

  const captureId = providerReference;
  const body = { amount: { value: (amountCents / 100).toFixed(2), currency_code: currency.toUpperCase() }, note_to_payer: refund.note || refund.reason || 'Merchant refund' };
  const runtime = await runCommerceProviderRuntime(env, {
    provider_id: 'paypal',
    action: 'paypal.refund.create',
    usage_lane: 'skyecommerce.refund_submit',
    customer_id: normalized.merchantId || normalized.merchant_id || '',
    payload: { endpoint_base: normalized.endpointBase || buildProviderHealthSpec(normalized).endpointBase || '', capture_id: captureId, amount_cents: amountCents, currency, body }
  });
  return providerRuntimeResult({ provider: 'paypal', action: 'refund_submit', runtime });
}

export async function executeProviderDisputeEvidence(connection = {}, payload = {}, env = {}, options = {}) {
  const normalized = providerConnectionRecord(connection);
  if (!['stripe', 'paypal'].includes(normalized.provider)) {
    const error = new Error(`Provider ${normalized.provider} does not support live dispute evidence in this runtime.`);
    error.code = 'DISPUTE_PROVIDER_UNSUPPORTED';
    throw error;
  }
  assertProviderSecrets(env, normalized.provider);
  const dispute = payload.dispute || {};
  const evidence = payload.evidence || payload.packet || {};
  const providerDisputeId = String(dispute.providerDisputeId || dispute.provider_dispute_id || dispute.id || '');

  if (normalized.provider === 'stripe') {
    const runtime = await runCommerceProviderRuntime(env, {
      provider_id: 'stripe',
      action: 'stripe.dispute.evidence.submit',
      usage_lane: 'skyecommerce.dispute_evidence_submit',
      customer_id: normalized.merchantId || normalized.merchant_id || '',
      payload: { dispute_id: providerDisputeId, evidence }
    });
    return providerRuntimeResult({ provider: 'stripe', action: 'dispute_evidence_submit', runtime });
  }

  const body = {
    evidences: [{
      evidence_type: 'PROOF_OF_FULFILLMENT',
      evidence_info: {
        tracking_info: (evidence.sections?.fulfillmentProof || evidence.fulfillmentProof || []).map((item) => ({ carrier_name: item.carrier || item.carrierName || 'OTHER', tracking_number: item.trackingNumber || item.tracking_number || '' })).filter((item) => item.tracking_number),
        notes: evidence.summary || evidence.merchantStatement || 'Evidence packet submitted from SkyeCommerce.'
      }
    }]
  };
  const runtime = await runCommerceProviderRuntime(env, {
    provider_id: 'paypal',
    action: 'paypal.dispute.evidence.submit',
    usage_lane: 'skyecommerce.dispute_evidence_submit',
    customer_id: normalized.merchantId || normalized.merchant_id || '',
    payload: { endpoint_base: normalized.endpointBase || buildProviderHealthSpec(normalized).endpointBase || '', dispute_id: providerDisputeId, body }
  });
  return providerRuntimeResult({ provider: 'paypal', action: 'dispute_evidence_submit', runtime });
}

export async function verifyPaypalWebhookSignature(env = {}, rawBody = '', headers = {}, options = {}) {
  assertProviderSecrets(env, 'paypal');
  const webhookId = envValue(env, 'PAYPAL_WEBHOOK_ID');
  if (!normalizedText(webhookId)) {
    const error = new Error('PAYPAL_WEBHOOK_ID is required for native PayPal webhook verification.');
    error.code = 'PAYPAL_WEBHOOK_ID_REQUIRED';
    error.missing = ['PAYPAL_WEBHOOK_ID'];
    throw error;
  }
  const getHeader = (name) => typeof headers.get === 'function' ? headers.get(name) : headers[name] || headers[name.toLowerCase()] || '';
  const transmissionId = getHeader('paypal-transmission-id');
  const transmissionTime = getHeader('paypal-transmission-time');
  const certUrl = getHeader('paypal-cert-url');
  const authAlgo = getHeader('paypal-auth-algo');
  const transmissionSig = getHeader('paypal-transmission-sig');
  const missing = [
    ['paypal-transmission-id', transmissionId],
    ['paypal-transmission-time', transmissionTime],
    ['paypal-cert-url', certUrl],
    ['paypal-auth-algo', authAlgo],
    ['paypal-transmission-sig', transmissionSig]
  ].filter(([, value]) => !normalizedText(value)).map(([key]) => key);
  if (missing.length) {
    const error = new Error(`Missing PayPal webhook verification header(s): ${missing.join(', ')}`);
    error.code = 'PAYPAL_WEBHOOK_HEADERS_MISSING';
    error.missing = missing;
    throw error;
  }
  let webhookEvent = {};
  try { webhookEvent = JSON.parse(rawBody || '{}'); } catch {
    const error = new Error('Malformed PayPal webhook body.');
    error.code = 'PAYPAL_WEBHOOK_BODY_MALFORMED';
    throw error;
  }
  const payload = {
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: webhookId,
    webhook_event: webhookEvent
  };
  const runtime = await runCommerceProviderRuntime(env, {
    provider_id: 'paypal',
    action: 'paypal.webhook.verify',
    usage_lane: 'skyecommerce.paypal_webhook_verify',
    payload: { endpoint_base: envValue(env, 'PAYPAL_ENDPOINT_BASE') || '', ...payload }
  });
  const verificationStatus = runtime.result?.verification_status || runtime.result?.status || '';
  return {
    ok: runtime.ok && verificationStatus === 'SUCCESS',
    status: runtime.ok && verificationStatus === 'SUCCESS' ? 'verified' : 'failed',
    httpStatus: runtime.status,
    verificationStatus,
    response: runtime.result,
    provider_runtime: publicRuntime(runtime.receipt)
  };
}
