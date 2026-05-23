import crypto from 'node:crypto';
import { createActionEnvelope } from './contracts.mjs';
import { requireActionPolicy } from './policy.mjs';

export const EXPOSURE_SERVICE_VERSION = '18.0.0';

export const EXPOSURE_PRODUCT_CATALOG = [
  { product:'verified_profile_upgrade', tier:'starter', monthly_price:49, setup_price:0, description:'Claim support, profile cleanup queue, verified-owner review packet.' },
  { product:'category_boost', tier:'growth', monthly_price:149, setup_price:0, description:'Priority exposure in relevant category/city surfaces after approval.' },
  { product:'lead_routing_lane', tier:'pro', monthly_price:299, setup_price:99, description:'Qualified buyer routing lane with AE follow-up support.' },
  { product:'territory_sponsor', tier:'market', monthly_price:799, setup_price:199, description:'Limited city/category sponsorship inventory with placement controls.' }
];

function stableId(value){ return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 18); }
function nowIso(){ return new Date().toISOString(); }

export function findExposureProduct(product, tier){
  return EXPOSURE_PRODUCT_CATALOG.find(row => row.product === product && row.tier === tier) || null;
}

export function buildExposureOrder({ business_id, product, tier, buyer_contact, budget = '', notes = '', actor = {}, source = 'exposure-service' }){
  const selected = findExposureProduct(product, tier);
  if(!selected){ const error = new Error(`Unknown exposure product/tier: ${product}/${tier}`); error.status = 400; throw error; }
  const payload = { business_id, product, tier, buyer_contact, budget, notes, quoted_monthly_price:selected.monthly_price, quoted_setup_price:selected.setup_price };
  const policy = requireActionPolicy({ type:'sponsor_intent', payload, actor, source });
  const action = createActionEnvelope({ type:'sponsor_intent', payload, actor, source });
  const order = {
    order_id:`exposure-order-${stableId({ business_id, product, tier, buyer_contact })}`,
    status:'pending_payment_provider',
    created_at:nowIso(),
    business_id,
    product,
    tier,
    buyer_contact,
    pricing:{ monthly:selected.monthly_price, setup:selected.setup_price, currency:'USD' },
    next_required_code_wiring:['payment_provider_checkout_session','invoice_status_webhook','sponsor_inventory_reservation','admin_approval_projection'],
    action
  };
  return { order, policy };
}

export function exposureCatalogForApi(){
  return { version:EXPOSURE_SERVICE_VERSION, products:EXPOSURE_PRODUCT_CATALOG, rules:['Order creation queues sponsor_intent only.','No billing completion is claimed until payment provider webhook confirms.','Sponsor placement still requires admin approval and inventory check.'] };
}
