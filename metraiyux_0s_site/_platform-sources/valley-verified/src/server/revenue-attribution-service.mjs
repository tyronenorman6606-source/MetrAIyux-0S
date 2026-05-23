import { createActionEnvelope } from './contracts.mjs';

export const REVENUE_ATTRIBUTION_SERVICE_VERSION = '20.0.0';
function cents(value){ return Math.round(Number(value || 0)); }
function commissionCents(amount, rate = 0.13){ return Math.max(0, Math.round(cents(amount) * Number(rate || 0))); }

export function buildRevenueAttributionAction({ actor = { id:'revenue-system', roles:'system', allowLocal:true }, action_source = 'revenue-attribution-service', commission_rate = 0.13, ...payload } = {}){
  const amount = cents(payload.amount_cents);
  const commission = payload.event_type === 'payment_received' && payload.ae_id ? commissionCents(amount, commission_rate) : 0;
  return createActionEnvelope({ type:'revenue_attribution_event', actor, source:action_source, payload:{
    business_id:payload.business_id,
    source:payload.source,
    amount_cents:amount,
    currency:payload.currency || 'USD',
    event_type:payload.event_type,
    ae_id:payload.ae_id || '',
    product:payload.product || '',
    tier:payload.tier || '',
    payment_order_id:payload.payment_order_id || '',
    lead_id:payload.lead_id || '',
    notes:payload.notes || (commission ? `estimated_commission_cents:${commission}` : '')
  }});
}

export function summarizeRevenueAttribution(events = []){
  const summary = { gross_cents:0, refunds_cents:0, net_cents:0, by_product:{}, by_ae:{}, event_count:events.length };
  for(const event of events){
    const payload = event.payload || event;
    const amount = cents(payload.amount_cents);
    const sign = ['refund','credit'].includes(String(payload.event_type || '').toLowerCase()) ? -1 : 1;
    if(sign > 0) summary.gross_cents += amount; else summary.refunds_cents += amount;
    summary.net_cents += sign * amount;
    const product = payload.product || 'unknown';
    const ae = payload.ae_id || 'unassigned';
    summary.by_product[product] = (summary.by_product[product] || 0) + sign * amount;
    summary.by_ae[ae] = (summary.by_ae[ae] || 0) + sign * amount;
  }
  return summary;
}

export function revenueAttributionServiceForApi(){
  return {
    version:REVENUE_ATTRIBUTION_SERVICE_VERSION,
    actions:['revenue_attribution_event','payment_event','exposure_activation'],
    default_commission_rate:0.13,
    rules:['Revenue attribution follows verified payment/admin events.','Commission estimates are not payout proof.','Refunds and credits reduce net attribution.']
  };
}
