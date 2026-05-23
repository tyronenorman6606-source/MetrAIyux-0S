import { createHmac, timingSafeEqual } from 'node:crypto';

function hmacHex(secret, payload){ return createHmac('sha256', secret).update(payload).digest('hex'); }
function hmacB64(secret, payload){ return createHmac('sha256', secret).update(payload).digest('base64'); }
function safeEqual(a, b){
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function makeWebhookIdempotencyKey({provider='unknown', type='unknown', payload={}, rawBody=''}={}){
  const explicit = payload.id || payload.eventId || payload?.data?.id || payload?.data?.object?.id || '';
  return `${provider}:${type}:${explicit || hmacHex('codestudio-idempotency', rawBody || JSON.stringify(payload || {})).slice(0,32)}`;
}

export function verifyWebhookRequest({headers={}, rawBody='', payload={}}={}){
  const provider = String(payload.provider || payload.source || '').toLowerCase() || inferProvider(payload);
  const fixture = String(process.env.CODESTUDIO_PROVIDER_MODE || '').toLowerCase() === 'fixture';
  if (fixture && !process.env.CODESTUDIO_VERIFY_FIXTURE_WEBHOOKS) return {ok:true, provider, mode:'fixture', verified:false, reason:'fixture_signature_bypass'};

  if (provider === 'stripe'){
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return {ok:false, provider, reason:'stripe_webhook_secret_missing'};
    const sig = String(headers['stripe-signature'] || '');
    const t = sig.match(/(?:^|,)t=([^,]+)/)?.[1];
    const v1 = sig.match(/(?:^|,)v1=([^,]+)/)?.[1];
    if (!t || !v1) return {ok:false, provider, reason:'stripe_signature_header_invalid'};
    const expected = hmacHex(secret, `${t}.${rawBody}`);
    return {ok:safeEqual(v1, expected), provider, mode:'stripe-v1', verified:safeEqual(v1, expected), reason:safeEqual(v1, expected) ? null : 'stripe_signature_invalid'};
  }

  if (provider === 'resend'){
    const secret = process.env.RESEND_WEBHOOK_SECRET || process.env.SVIX_WEBHOOK_SECRET;
    if (!secret) return {ok:false, provider, reason:'resend_webhook_secret_missing'};
    const id = headers['svix-id'];
    const ts = headers['svix-timestamp'];
    const sig = String(headers['svix-signature'] || '').split(' ').pop()?.replace(/^v1,/, '') || '';
    const expected = hmacB64(secret.replace(/^whsec_/, ''), `${id}.${ts}.${rawBody}`);
    return {ok:safeEqual(sig, expected), provider, mode:'svix-v1', verified:safeEqual(sig, expected), reason:safeEqual(sig, expected) ? null : 'resend_signature_invalid'};
  }

  const genericSecret = process.env.CODESTUDIO_WEBHOOK_SECRET || process.env.TWILIO_AUTH_TOKEN;
  const genericSig = headers['x-codestudio-webhook-signature'] || headers['x-kaixu-webhook-signature'] || headers['x-twilio-signature'];
  if (genericSecret && genericSig){
    const expected = hmacHex(genericSecret, rawBody);
    return {ok:safeEqual(genericSig, expected), provider, mode:'generic-hmac-sha256', verified:safeEqual(genericSig, expected), reason:safeEqual(genericSig, expected) ? null : 'generic_webhook_signature_invalid'};
  }

  const strict = process.env.CODESTUDIO_REQUIRE_WEBHOOK_SIGNATURES === '1';
  return {ok:!strict, provider, mode:'unsigned_dev_allowed', verified:false, reason:strict ? 'webhook_signature_required' : 'unsigned_dev_allowed'};
}

function inferProvider(payload){
  const text = JSON.stringify(payload || {}).toLowerCase();
  if (text.includes('stripe') || text.includes('checkout') || text.includes('invoice')) return 'stripe';
  if (text.includes('twilio') || text.includes('sms') || text.includes('voice')) return 'twilio';
  if (text.includes('resend') || text.includes('email')) return 'resend';
  return 'unknown';
}
