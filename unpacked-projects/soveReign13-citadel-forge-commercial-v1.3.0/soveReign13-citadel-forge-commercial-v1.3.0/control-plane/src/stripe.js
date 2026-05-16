import crypto from 'node:crypto';

function parseStripeSignature(header) {
  const parts = String(header || '').split(',').map((part) => part.trim()).filter(Boolean);
  const parsed = {};
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!parsed[key]) parsed[key] = [];
    parsed[key].push(value);
  }
  return parsed;
}

export function verifyStripeWebhook({ rawBody, signatureHeader, secret, toleranceSeconds = 300 }) {
  if (!secret) {
    const error = new Error('STRIPE_WEBHOOK_SECRET is not set');
    error.status = 500;
    throw error;
  }
  const sig = parseStripeSignature(signatureHeader);
  const timestamp = Number(sig.t?.[0]);
  const signatures = sig.v1 || [];
  if (!timestamp || signatures.length === 0) {
    const error = new Error('Invalid Stripe signature header');
    error.status = 400;
    throw error;
  }
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > toleranceSeconds) {
    const error = new Error('Stripe webhook timestamp outside tolerance');
    error.status = 400;
    throw error;
  }
  const payload = `${timestamp}.${Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const valid = signatures.some((candidate) => {
    const a = Buffer.from(candidate || '', 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!valid) {
    const error = new Error('Stripe webhook signature verification failed');
    error.status = 400;
    throw error;
  }
  return true;
}

export function stripePriceEnvForPlan(planCode) {
  return `STRIPE_PRICE_${String(planCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

export async function createStripeCheckoutSession({ account, plan, successUrl, cancelUrl }) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceEnv = stripePriceEnvForPlan(plan.code);
  const priceId = process.env[priceEnv];
  if (!secretKey || !priceId) {
    const error = new Error(`Stripe checkout is not configured. Missing ${!secretKey ? 'STRIPE_SECRET_KEY' : priceEnv}.`);
    error.status = 409;
    error.code = 'stripe_not_configured';
    throw error;
  }

  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('customer_email', account.owner_email);
  params.set('client_reference_id', account.id);
  params.set('metadata[account_id]', account.id);
  params.set('metadata[plan_code]', plan.code);
  params.set('subscription_data[metadata][account_id]', account.id);
  params.set('subscription_data[metadata][plan_code]', plan.code);
  params.set('allow_promotion_codes', 'true');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || `Stripe checkout failed with ${response.status}`);
    error.status = response.status;
    error.code = 'stripe_checkout_failed';
    error.body = body;
    throw error;
  }
  return body;
}
