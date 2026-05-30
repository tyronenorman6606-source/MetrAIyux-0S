import crypto from 'node:crypto';
import { assertConfiguredProvider, isProduction } from './config.mjs';

const LEGAL_ACCEPTANCE_VERSION = 'legal-skyes-transaction-pack-2026-05-28';
const LEGAL_ACCEPTANCE_URLS = Object.freeze({
  terms: 'https://skyes-over-london-legal.pages.dev/legal/terms/',
  arbitration: 'https://skyes-over-london-legal.pages.dev/legal/in-house-arbitration/',
  external_arbitration_rules: 'https://skyes-over-london-legal.pages.dev/legal/external-arbitration-rules/',
  payments_refunds: 'https://skyes-over-london-legal.pages.dev/legal/payments-refunds/',
  privacy: 'https://skyes-over-london-legal.pages.dev/legal/privacy/',
  proof_valuation: 'https://skyes-over-london-legal.pages.dev/legal/proof-and-valuation/',
  receipt_spec: 'https://skyes-over-london-legal.pages.dev/legal/transaction-acceptance-receipt/'
});

function bool(value){
  if(value === true) return true;
  return ['1','true','yes','y','on','accepted','agree','agreed'].includes(String(value || '').trim().toLowerCase());
}

function acceptanceSource(payload = {}){
  const nested = payload.legal_acceptance && typeof payload.legal_acceptance === 'object' ? payload.legal_acceptance : {};
  const camel = payload.legalAcceptance && typeof payload.legalAcceptance === 'object' ? payload.legalAcceptance : {};
  return { ...nested, ...camel, ...payload };
}

function normalizeLegalAcceptance(payload = {}, source = 'sovereigndocs-billing'){
  const input = acceptanceSource(payload);
  const allAccepted = bool(input.legal_acceptance) || bool(input.accept_legal_pack) || bool(input.acceptLegalPack) || bool(input.accepted);
  const flag = (...names) => allAccepted || names.some((name) => bool(input[name]));
  const acceptedAt = String(input.accepted_at || input.acceptedAt || '').trim() || (allAccepted ? new Date().toISOString() : '');
  return {
    legal_terms_accepted: flag('legal_terms_accepted','legalTermsAccepted','termsAccepted'),
    arbitration_accepted: flag('arbitration_accepted','arbitrationAccepted','inHouseArbitrationAccepted'),
    payments_policy_accepted: flag('payments_policy_accepted','paymentsPolicyAccepted','refundPolicyAccepted'),
    no_outcome_guarantee_accepted: flag('no_outcome_guarantee_accepted','noOutcomeGuaranteeAccepted','noGuaranteeAccepted'),
    truthful_review_boundary_acknowledged: flag('truthful_review_boundary_acknowledged','truthfulReviewBoundaryAcknowledged','acceptTruthfulReviewBoundary'),
    privacy_policy_accepted: flag('privacy_policy_accepted','privacyPolicyAccepted','acceptPrivacy'),
    legal_version: String(input.legal_version || input.legalVersion || LEGAL_ACCEPTANCE_VERSION).slice(0, 120),
    accepted_at: acceptedAt.slice(0, 80),
    acceptance_surface: String(input.acceptance_surface || input.acceptanceSurface || source).slice(0, 160)
  };
}

function legalAcceptanceMetadata(payload = {}, source = 'sovereigndocs-billing'){
  const acceptance = normalizeLegalAcceptance(payload, source);
  return {
    legal_acceptance_version: acceptance.legal_version,
    legal_terms_accepted: String(acceptance.legal_terms_accepted),
    arbitration_accepted: String(acceptance.arbitration_accepted),
    payments_policy_accepted: String(acceptance.payments_policy_accepted),
    no_outcome_guarantee_accepted: String(acceptance.no_outcome_guarantee_accepted),
    truthful_review_boundary: String(acceptance.truthful_review_boundary_acknowledged),
    privacy_policy_accepted: String(acceptance.privacy_policy_accepted),
    legal_acceptance_at: acceptance.accepted_at,
    legal_acceptance_surface: acceptance.acceptance_surface,
    legal_terms_url: LEGAL_ACCEPTANCE_URLS.terms,
    legal_arbitration_url: LEGAL_ACCEPTANCE_URLS.arbitration,
    legal_receipt_spec_url: LEGAL_ACCEPTANCE_URLS.receipt_spec
  };
}

function missingLegalAcceptance(payload = {}){
  const acceptance = normalizeLegalAcceptance(payload);
  return ['legal_terms_accepted','arbitration_accepted','payments_policy_accepted','no_outcome_guarantee_accepted','truthful_review_boundary_acknowledged','privacy_policy_accepted'].filter((key) => acceptance[key] !== true);
}

export async function createCheckoutIntent({ planId, orderId, customerEmail, successUrl, cancelUrl, legalAcceptance }){
  if(!planId) throw Object.assign(new Error('planId is required.'), { status:400 });
  const missing = missingLegalAcceptance(legalAcceptance || {});
  if(missing.length) throw Object.assign(new Error('Legal Skyes transaction acceptance is required before SovereignDocs billing checkout.'), { status:403, code:'LEGAL_ACCEPTANCE_REQUIRED', missing, legal_urls:LEGAL_ACCEPTANCE_URLS });
  const metadata = legalAcceptanceMetadata(legalAcceptance || {}, 'sovereigndocs-billing');
  if(process.env.STRIPE_SECRET_KEY){
    const params = new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url', successUrl || 'https://example.com/success');
    params.set('cancel_url', cancelUrl || 'https://example.com/cancel');
    params.set('client_reference_id', orderId || crypto.randomUUID());
    if(customerEmail) params.set('customer_email', customerEmail);
    params.set('metadata[planId]', planId);
    if(orderId) params.set('metadata[orderId]', orderId);
    Object.entries(metadata).forEach(([key, value]) => params.set(`metadata[${key}]`, String(value).slice(0, 500)));
    // Price mapping must be set through env/config before live payment use.
    const price = process.env[`STRIPE_PRICE_${String(planId).toUpperCase().replace(/[^A-Z0-9]/g,'_')}`];
    if(!price) throw Object.assign(new Error(`Stripe price env missing for plan ${planId}.`), { status:503 });
    params.set('line_items[0][price]', price);
    params.set('line_items[0][quantity]', '1');
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', { method:'POST', headers:{ authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type':'application/x-www-form-urlencoded' }, body:params });
    const body = await res.json().catch(()=>({}));
    if(!res.ok) throw Object.assign(new Error(`Stripe checkout failed: ${res.status}`), { status:502, providerBody:body });
    return { ok:true, provider:'stripe', checkoutUrl:body.url, sessionId:body.id };
  }
  if(isProduction()) assertConfiguredProvider(['STRIPE_SECRET_KEY'], 'Payments');
  return { ok:true, provider:'dev-payment-disabled', checkoutUrl:null, message:'Payment provider not configured. Development intent only; no charge created.' };
}
