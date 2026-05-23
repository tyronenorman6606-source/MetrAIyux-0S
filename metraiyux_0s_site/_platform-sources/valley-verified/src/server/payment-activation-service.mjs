import { createActionEnvelope } from './contracts.mjs';

export const PAYMENT_ACTIVATION_SERVICE_VERSION = '21.0.0';
export const STRIPE_PRODUCT_MAP = {
  'verified-profile-upgrade': { price_env:'STRIPE_PRICE_VERIFIED_PROFILE', fallback_monthly_cents:4900 },
  'featured-market-placement': { price_env:'STRIPE_PRICE_FEATURED_MARKET', fallback_monthly_cents:14900 },
  'lead-routing-member': { price_env:'STRIPE_PRICE_LEAD_ROUTING', fallback_monthly_cents:19900 },
  'category-sponsor': { price_env:'STRIPE_PRICE_CATEGORY_SPONSOR', fallback_monthly_cents:39900 },
  'managed-growth-pack': { price_env:'STRIPE_PRICE_MANAGED_GROWTH', fallback_monthly_cents:79900 }
};
function clean(v){ return String(v ?? '').trim(); }
export function resolveStripePrice(product, env = process.env){
  const entry = STRIPE_PRODUCT_MAP[product];
  if(!entry) throw new Error(`Unknown exposure product: ${product}`);
  return env[entry.price_env] || null;
}
export function buildPaymentEventAction({ provider = 'stripe', provider_event_id, provider_event_type, payment_order_id, payment_status, exposure_order_id = '', business_id = '', product = '', tier = '', amount_paid_cents = 0, currency = 'USD', raw_event_hash = '', actor = { id:'system', roles:'system' } } = {}){
  return createActionEnvelope({ type:'payment_event', actor, payload:{ provider, provider_event_id, provider_event_type, payment_order_id, payment_status, exposure_order_id, business_id, product, tier, amount_paid_cents, currency, raw_event_hash } });
}
export function buildExposureActivationAction({ business_id, product, tier, payment_order_id, placement_status = 'active', reviewer, starts_at = '', expires_at = '', inventory_slot = '', notes = '', actor = {} } = {}){
  return createActionEnvelope({ type:'exposure_activation', actor, payload:{ business_id:clean(business_id), product:clean(product), tier:clean(tier), payment_order_id:clean(payment_order_id), placement_status:clean(placement_status), reviewer:clean(reviewer || actor.email || actor.id), starts_at, expires_at, inventory_slot, notes } });
}
export function paymentActivationServiceForApi(){ return { version:PAYMENT_ACTIVATION_SERVICE_VERSION, products:Object.keys(STRIPE_PRODUCT_MAP), rules:['unpaid checkout intent does not activate placement','verified payment webhook creates payment_event','admin approval creates exposure_activation','all activations are replayable from the event ledger'] }; }
