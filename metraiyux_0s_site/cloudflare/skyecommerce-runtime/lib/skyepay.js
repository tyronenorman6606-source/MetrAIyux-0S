import { dbAll, dbFirst, dbRun, hmacHex, uid } from './utils.js';

const SKYEPAY_SECRET_NAMES = [
  'SKYEPAY_COMMERCE_SHARED_SECRET',
  'SKYECOMMERCE_SKYEPAY_SHARED_SECRET',
  'SKYGATEFS27_EVENT_MIRROR_SECRET',
  'FS27_EVENT_MIRROR_SECRET',
  'PLATFORM_EVENT_MIRROR_SECRET',
  'SKYGATE_EVENT_MIRROR_SECRET'
];

const PAID_STATUSES = new Set(['paid', 'complete', 'completed', 'no_payment_required', 'active', 'trialing']);
const VOID_STATUSES = new Set(['failed', 'expired', 'canceled', 'cancelled', 'void', 'voided', 'incomplete_expired']);
const REFUND_STATUSES = new Set(['refunded']);

function safeText(value = '', max = 400) {
  return String(value ?? '').trim().slice(0, max);
}

function int(value = 0, fallback = 0) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, int(value, min)));
}

function envText(env = {}, key = '') {
  return safeText(env?.[key] ?? env?.vars?.[key] ?? '', 2000);
}

function withoutTrailingSlash(value = '') {
  return safeText(value, 1000).replace(/\/+$/, '');
}

function parsePayloadJson(value = '{}') {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function isMissingLedgerTable(error) {
  return /no such table|does not exist/i.test(String(error?.message || error || ''));
}

function addUrlParam(url = '', key = '', value = '') {
  const raw = safeText(url, 1000);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return raw;
  }
}

export function skyPayCommerceSecret(env = {}) {
  for (const name of SKYEPAY_SECRET_NAMES) {
    const value = envText(env, name);
    if (value) return value;
  }
  return '';
}

export async function signSkyPayCommerceBody(env = {}, rawBody = '') {
  const secret = skyPayCommerceSecret(env);
  if (!secret) {
    const error = new Error('SkyePay commerce signing secret is not configured.');
    error.code = 'SKYEPAY_COMMERCE_SECRET_MISSING';
    error.status = 409;
    error.missing = SKYEPAY_SECRET_NAMES;
    throw error;
  }
  return hmacHex(secret, rawBody);
}

export function skyPayOrigin(env = {}) {
  return withoutTrailingSlash(
    envText(env, 'SKYGATEFS27_ORIGIN')
    || envText(env, 'SKYEGATEFS27_ORIGIN')
    || envText(env, 'SKYGATEFS27_WORKER_URL')
    || envText(env, 'FS27_LIVE_BASE')
    || envText(env, 'SKYEGATE_FS27_URL')
    || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev'
  );
}

export function skyPayServiceUrl(path = '/skyepay/checkout') {
  return `https://skyegatefs27.internal${path.startsWith('/') ? path : `/${path}`}`;
}

export function skyPayHttpUrl(env = {}, path = '/skyepay/checkout') {
  return `${skyPayOrigin(env)}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildSkyPayReturnUrls({ returnUrl = '', cancelUrl = '' } = {}) {
  return {
    successUrl: addUrlParam(returnUrl, 'skyepay_session', '{CHECKOUT_SESSION_ID}'),
    cancelUrl
  };
}

export function buildSkyPayLineItems({ merchant = {}, order = {}, amountCents = 0 } = {}) {
  const productLines = Array.isArray(order.items) ? order.items : [];
  const lines = productLines
    .map((item, index) => {
      const quantity = clamp(item.quantity || 1, 1, 999);
      const unitAmountCents = Math.max(0, int(item.unitPriceCents ?? item.unit_price_cents ?? 0, 0));
      const lineAmountCents = unitAmountCents * quantity;
      if (!lineAmountCents) return null;
      return {
        id: safeText(item.productId || item.product_id || `line_${index + 1}`, 80),
        name: safeText(`${item.title || 'Product'}${item.variantTitle ? ` - ${item.variantTitle}` : ''}${quantity > 1 ? ` x${quantity}` : ''}`, 140),
        amount_cents: lineAmountCents,
        quantity: 1,
        type: 'one_time',
        product_id: safeText(item.productId || item.product_id || '', 120),
        variant_id: safeText(item.variantId || item.variant_id || '', 120),
        sku: safeText(item.sku || '', 120)
      };
    })
    .filter(Boolean);
  if (Number(order.shippingCents || 0) > 0) {
    lines.push({ id: 'shipping', name: 'Shipping', amount_cents: int(order.shippingCents, 0), quantity: 1, type: 'one_time' });
  }
  if (Number(order.taxCents || 0) > 0) {
    lines.push({ id: 'tax', name: 'Tax', amount_cents: int(order.taxCents, 0), quantity: 1, type: 'one_time' });
  }
  const positiveTotal = lines.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
  if (lines.length && positiveTotal === Number(amountCents || 0)) return lines.slice(0, 50);
  return [{
    id: 'order-balance',
    name: safeText(`Order ${order.orderNumber || order.order_number || order.id || ''} at ${merchant.brandName || merchant.brand_name || merchant.slug || 'SkyeCommerce'}`, 140),
    amount_cents: Math.max(0, int(amountCents, 0)),
    quantity: 1,
    type: 'one_time'
  }];
}

export function buildSkyPayCheckoutBody({ env = {}, merchant = {}, order = {}, payload = {}, transactionId = '', checkoutToken = '', requestUrl = null } = {}) {
  const amountCents = Math.max(0, int(payload.amountCents ?? order.totalCents ?? 0, 0));
  const currency = safeText(payload.currency || order.currency || merchant.currency || 'USD', 12).toLowerCase();
  const urls = buildSkyPayReturnUrls({ returnUrl: payload.returnUrl, cancelUrl: payload.cancelUrl });
  const items = buildSkyPayLineItems({ merchant, order, amountCents });
  const idempotencyKey = safeText(`${merchant.id || merchant.slug || 'merchant'}:${order.id || order.orderId || 'order'}:${checkoutToken || transactionId}`, 180);
  const origin = requestUrl ? `${requestUrl.protocol}//${requestUrl.host}` : '';
  return {
    source: 'skyecommerce',
    skyecommerce_dynamic: true,
    client_slug: safeText(envText(env, 'SKYEPAY_SKYECOMMERCE_CLIENT_SLUG') || 'metraiyux-0s', 120).toLowerCase(),
    workspace_slug: safeText(merchant.slug || merchant.id || 'skyecommerce', 120).toLowerCase(),
    customer_email: safeText(payload.customerEmail || order.customerEmail || order.customer_email || '', 254).toLowerCase(),
    customer_name: safeText(order.customerName || order.customer_name || '', 160),
    company_name: safeText(merchant.brandName || merchant.brand_name || merchant.slug || 'SkyeCommerce merchant', 180),
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    idempotency_key: idempotencyKey,
    skyemerit_apply: false,
    skyemerit_first_time: false,
    legal_acceptance: payload.legal_acceptance || payload.legalAcceptance || payload.metadata?.legal_acceptance || null,
    skyecommerce: {
      source: 'skyecommerce',
      version: '1.0',
      origin,
      merchant_id: safeText(merchant.id || '', 120),
      merchant_slug: safeText(merchant.slug || '', 120),
      merchant_brand_name: safeText(merchant.brandName || merchant.brand_name || merchant.slug || '', 180),
      order_id: safeText(order.id || order.orderId || '', 120),
      order_number: safeText(order.orderNumber || order.order_number || '', 120),
      payment_transaction_id: safeText(transactionId || '', 120),
      checkout_token: safeText(checkoutToken || '', 120),
      amount_cents: amountCents,
      currency,
      subtotal_cents: Math.max(0, int(order.subtotalCents ?? order.subtotal_cents ?? 0, 0)),
      shipping_cents: Math.max(0, int(order.shippingCents ?? order.shipping_cents ?? 0, 0)),
      tax_cents: Math.max(0, int(order.taxCents ?? order.tax_cents ?? 0, 0)),
      discount_cents: Math.max(0, int(order.discountCents ?? order.discount_cents ?? 0, 0)),
      gift_card_cents: Math.max(0, int(order.giftCardCents ?? order.gift_card_cents ?? 0, 0)),
      line_items: items,
      product_items: (Array.isArray(order.items) ? order.items : []).slice(0, 50).map((item) => ({
        product_id: safeText(item.productId || item.product_id || '', 120),
        variant_id: safeText(item.variantId || item.variant_id || '', 120),
        title: safeText(item.title || '', 160),
        variant_title: safeText(item.variantTitle || item.variant_title || '', 160),
        sku: safeText(item.sku || '', 120),
        quantity: clamp(item.quantity || 1, 1, 999),
        unit_amount_cents: Math.max(0, int(item.unitPriceCents ?? item.unit_price_cents ?? 0, 0))
      }))
    }
  };
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }
  return { ok: response.ok, status: response.status, statusText: response.statusText, data };
}

export async function executeSkyPayCheckout(env = {}, request = null, options = {}) {
  const body = buildSkyPayCheckoutBody({ env, ...options });
  const raw = JSON.stringify(body);
  const signature = await signSkyPayCommerceBody(env, raw);
  const headers = {
    'content-type': 'application/json',
    'x-skyepay-commerce-signature': `sha256=${signature}`,
    'x-skyecommerce-source': 'skyecommerce'
  };
  const init = { method: 'POST', headers, body: raw };
  const useBinding = env?.SKYGATEFS27_WORKER && typeof env.SKYGATEFS27_WORKER.fetch === 'function';
  const targetUrl = useBinding ? skyPayServiceUrl('/skyepay/checkout') : skyPayHttpUrl(env, '/skyepay/checkout');
  const response = useBinding
    ? await env.SKYGATEFS27_WORKER.fetch(new Request(targetUrl, init))
    : await (options.fetcher || fetch)(targetUrl, init);
  const parsed = await parseJsonResponse(response);
  if (!parsed.ok || !parsed.data?.url || !parsed.data?.id) {
    const error = new Error(parsed.data?.error || `SkyPay checkout failed with HTTP ${parsed.status}.`);
    error.code = parsed.data?.code || 'SKYEPAY_CHECKOUT_FAILED';
    error.status = parsed.status >= 400 ? parsed.status : 502;
    error.providerDispatch = {
      status: 'failed',
      provider: 'skyepay',
      httpStatus: parsed.status,
      error: parsed.data?.error || parsed.statusText,
      code: error.code
    };
    throw error;
  }
  return {
    status: 'executed',
    provider: 'skyepay',
    providerReference: safeText(parsed.data.id, 180),
    skyPayOrderId: safeText(parsed.data.order_id || '', 180),
    checkoutUrl: parsed.data.url,
    paymentStatus: safeText(parsed.data.payment_status || 'created', 80),
    ownerApprovalRequired: parsed.data.owner_approval_required === true,
    activationPath: parsed.data.activation_path || null,
    request: {
      url: targetUrl,
      bodyKind: 'skyecommerce_dynamic_checkout',
      amountCents: body.skyecommerce.amount_cents,
      currency: body.skyecommerce.currency,
      lineItemCount: body.skyecommerce.line_items.length
    },
    response: parsed.data
  };
}

export function buildSkyPayRefundBody({ merchant = {}, order = {}, payment = {}, refund = {} } = {}) {
  const amountCents = Math.max(0, int(refund.amountCents ?? refund.amount_cents ?? 0, 0));
  return {
    source: 'skyecommerce',
    skyecommerce_refund: true,
    session_id: safeText(refund.providerRef || refund.provider_ref || payment.providerReference || payment.provider_reference || order.paymentReference || order.payment_reference || '', 220),
    amount_cents: amountCents,
    reason: safeText(refund.reason || 'merchant_requested', 120),
    idempotency_key: safeText(`${merchant.id || merchant.merchantId || 'merchant'}:${order.id || order.orderId || 'order'}:${refund.id || refund.refundNumber || refund.refund_number || amountCents}`, 180),
    skyecommerce: {
      source: 'skyecommerce',
      version: '1.0',
      merchant_id: safeText(merchant.id || merchant.merchantId || '', 120),
      merchant_slug: safeText(merchant.slug || '', 120),
      order_id: safeText(order.id || order.orderId || '', 120),
      order_number: safeText(order.orderNumber || order.order_number || '', 120),
      payment_transaction_id: safeText(payment.id || payment.paymentTransactionId || payment.payment_transaction_id || '', 120),
      refund_id: safeText(refund.id || '', 120),
      refund_number: safeText(refund.refundNumber || refund.refund_number || '', 120),
      amount_cents: amountCents,
      currency: safeText(refund.currency || order.currency || payment.currency || 'USD', 12).toLowerCase()
    }
  };
}

export async function executeSkyPayRefund(env = {}, request = null, options = {}) {
  const body = buildSkyPayRefundBody(options);
  const raw = JSON.stringify(body);
  const signature = await signSkyPayCommerceBody(env, raw);
  const headers = {
    'content-type': 'application/json',
    'x-skyepay-commerce-signature': `sha256=${signature}`,
    'x-skyecommerce-source': 'skyecommerce'
  };
  const init = { method: 'POST', headers, body: raw };
  const useBinding = env?.SKYGATEFS27_WORKER && typeof env.SKYGATEFS27_WORKER.fetch === 'function';
  const targetUrl = useBinding ? skyPayServiceUrl('/skyepay/refund') : skyPayHttpUrl(env, '/skyepay/refund');
  const response = useBinding
    ? await env.SKYGATEFS27_WORKER.fetch(new Request(targetUrl, init))
    : await (options.fetcher || fetch)(targetUrl, init);
  const parsed = await parseJsonResponse(response);
  if (!parsed.ok || !parsed.data?.refund_id) {
    const error = new Error(parsed.data?.error || `SkyPay refund failed with HTTP ${parsed.status}.`);
    error.code = parsed.data?.code || 'SKYEPAY_REFUND_FAILED';
    error.status = parsed.status >= 400 ? parsed.status : 502;
    error.providerDispatch = {
      status: 'failed',
      provider: 'skyepay',
      httpStatus: parsed.status,
      error: parsed.data?.error || parsed.statusText,
      code: error.code
    };
    throw error;
  }
  return {
    status: 'executed',
    provider: 'skyepay',
    providerReference: safeText(parsed.data.refund_id, 180),
    skyPayOrderId: safeText(parsed.data.order_id || '', 180),
    paymentStatus: safeText(parsed.data.payment_status || '', 80),
    request: {
      url: targetUrl,
      bodyKind: 'skyecommerce_skyepay_refund',
      amountCents: body.amount_cents,
      currency: body.skyecommerce.currency
    },
    response: parsed.data
  };
}

export async function fetchSkyPayStatus(env = {}, sessionId = '', options = {}) {
  const id = safeText(sessionId, 220);
  if (!id) return { ok: false, status: 'missing_session_id', paymentStatus: 'pending', order: null };
  const path = `/skyepay/status?session_id=${encodeURIComponent(id)}`;
  const useBinding = env?.SKYGATEFS27_WORKER && typeof env.SKYGATEFS27_WORKER.fetch === 'function';
  const targetUrl = useBinding ? skyPayServiceUrl(path) : skyPayHttpUrl(env, path);
  const response = useBinding
    ? await env.SKYGATEFS27_WORKER.fetch(new Request(targetUrl, { method: 'GET' }))
    : await (options.fetcher || fetch)(targetUrl, { method: 'GET' });
  const parsed = await parseJsonResponse(response);
  if (!parsed.ok) return { ok: false, status: 'fetch_failed', httpStatus: parsed.status, error: parsed.data?.error || parsed.statusText, order: null };
  const order = parsed.data?.order || null;
  return {
    ok: true,
    status: 'fetched',
    httpStatus: parsed.status,
    order,
    paymentStatus: safeText(order?.payment_status || order?.paymentStatus || parsed.data?.payment_status || '', 80),
    raw: parsed.data
  };
}

export function mapSkyPayStatusToPayment(statusResult = {}) {
  const paymentStatus = safeText(statusResult.paymentStatus || statusResult.order?.payment_status || statusResult.order?.paymentStatus || '', 80).toLowerCase();
  if (PAID_STATUSES.has(paymentStatus)) return 'paid';
  if (REFUND_STATUSES.has(paymentStatus)) return 'refunded';
  if (VOID_STATUSES.has(paymentStatus)) return paymentStatus.includes('fail') ? 'failed' : 'voided';
  return 'pending';
}

export function platformFeeBps(env = {}) {
  return clamp(
    envText(env, 'SKYECOMMERCE_PLATFORM_FEE_BPS')
    || envText(env, 'SKYECOMMERCE_SKYEPAY_PLATFORM_FEE_BPS')
    || 0,
    0,
    5000
  );
}

export function merchantPayoutLedgerRecord(row = {}) {
  if (!row) return null;
  return {
    id: row.id || '',
    merchantId: row.merchant_id || '',
    orderId: row.order_id || '',
    paymentTransactionId: row.payment_transaction_id || '',
    provider: row.provider || '',
    providerReference: row.provider_reference || '',
    grossCents: Number(row.gross_cents || 0),
    platformFeeBps: Number(row.platform_fee_bps || 0),
    platformFeeCents: Number(row.platform_fee_cents || 0),
    merchantReceivableCents: Number(row.merchant_receivable_cents || 0),
    currency: safeText(row.currency || 'USD', 12).toUpperCase(),
    status: row.status || 'pending_payment',
    payoutReference: row.payout_reference || '',
    meta: parsePayloadJson(row.meta_json || '{}'),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    paidAt: row.paid_at || ''
  };
}

export function merchantPayoutStatusForPayment(payment = {}, orderPaymentStatus = '') {
  const paymentStatus = safeText(payment.status || '', 80).toLowerCase();
  const orderStatus = safeText(orderPaymentStatus, 80).toLowerCase();
  if (paymentStatus === 'paid' || orderStatus === 'paid') return 'payable';
  if (paymentStatus === 'refunded' || orderStatus === 'refunded') return 'refunded';
  if (['failed', 'voided'].includes(paymentStatus) || ['voided', 'pending_provider_failure'].includes(orderStatus)) return 'voided';
  return 'pending_payment';
}

export async function upsertMerchantPayoutLedgerForPayment(env = {}, { merchant = {}, order = {}, payment = {}, status = '', meta = {} } = {}) {
  const merchantId = safeText(merchant.id || merchant.merchantId || payment.merchantId || payment.merchant_id || order.merchantId || order.merchant_id || '', 120);
  const orderId = safeText(order.id || order.orderId || payment.orderId || payment.order_id || '', 120);
  if (!merchantId || !orderId) return { ok: false, skipped: 'missing_merchant_or_order' };
  const grossCents = Math.max(0, int(payment.amountCents ?? payment.amount_cents ?? order.totalCents ?? order.total_cents ?? 0, 0));
  const feeBps = platformFeeBps(env);
  const platformFeeCents = Math.round(grossCents * feeBps / 10000);
  const merchantReceivableCents = Math.max(0, grossCents - platformFeeCents);
  const ledgerStatus = safeText(status || merchantPayoutStatusForPayment(payment, order.paymentStatus || order.payment_status), 80) || 'pending_payment';
  const providerReference = safeText(payment.providerReference || payment.provider_reference || order.paymentReference || order.payment_reference || '', 180);
  const paymentTransactionId = safeText(payment.id || payment.paymentTransactionId || payment.payment_transaction_id || '', 120);
  try {
    const id = safeText((await dbFirst(env, `SELECT id FROM merchant_payout_ledger WHERE merchant_id = ? AND order_id = ? LIMIT 1`, [merchantId, orderId]))?.id || '', 120) || uid('mpay');
    await dbRun(env, `
      INSERT INTO merchant_payout_ledger (
        id, merchant_id, order_id, payment_transaction_id, provider, provider_reference,
        gross_cents, platform_fee_bps, platform_fee_cents, merchant_receivable_cents,
        currency, status, payout_reference, meta_json, paid_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
      ON CONFLICT(merchant_id, order_id) DO UPDATE SET
        payment_transaction_id = excluded.payment_transaction_id,
        provider = excluded.provider,
        provider_reference = excluded.provider_reference,
        gross_cents = excluded.gross_cents,
        platform_fee_bps = excluded.platform_fee_bps,
        platform_fee_cents = excluded.platform_fee_cents,
        merchant_receivable_cents = excluded.merchant_receivable_cents,
        currency = excluded.currency,
        status = excluded.status,
        meta_json = excluded.meta_json,
        paid_at = CASE WHEN excluded.status = 'paid' THEN COALESCE(merchant_payout_ledger.paid_at, CURRENT_TIMESTAMP) ELSE merchant_payout_ledger.paid_at END,
        updated_at = CURRENT_TIMESTAMP
    `, [
      id,
      merchantId,
      orderId,
      paymentTransactionId,
      safeText(payment.provider || 'skyepay', 40),
      providerReference,
      grossCents,
      feeBps,
      platformFeeCents,
      merchantReceivableCents,
      safeText(payment.currency || order.currency || merchant.currency || 'USD', 12).toUpperCase(),
      ledgerStatus,
      JSON.stringify({ ...meta, source: 'skyecommerce_skyepay_loop' }),
      ledgerStatus
    ]);
    const row = await dbFirst(env, `SELECT * FROM merchant_payout_ledger WHERE merchant_id = ? AND order_id = ? LIMIT 1`, [merchantId, orderId]);
    return { ok: true, ledger: merchantPayoutLedgerRecord(row) };
  } catch (error) {
    if (isMissingLedgerTable(error)) return { ok: false, skipped: 'merchant_payout_ledger_table_missing' };
    throw error;
  }
}

export async function listMerchantPayoutLedger(env = {}, merchantId = '') {
  try {
    const rows = await dbAll(env, `SELECT * FROM merchant_payout_ledger WHERE merchant_id = ? ORDER BY created_at DESC`, [merchantId]);
    return rows.map(merchantPayoutLedgerRecord);
  } catch (error) {
    if (isMissingLedgerTable(error)) return [];
    throw error;
  }
}
