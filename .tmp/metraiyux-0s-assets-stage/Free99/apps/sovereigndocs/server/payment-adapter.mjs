import crypto from 'node:crypto';
import { assertConfiguredProvider, isProduction } from './config.mjs';

export async function createCheckoutIntent({ planId, orderId, customerEmail, successUrl, cancelUrl }){
  if(!planId) throw Object.assign(new Error('planId is required.'), { status:400 });
  if(process.env.STRIPE_SECRET_KEY){
    const params = new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url', successUrl || 'https://example.com/success');
    params.set('cancel_url', cancelUrl || 'https://example.com/cancel');
    params.set('client_reference_id', orderId || crypto.randomUUID());
    if(customerEmail) params.set('customer_email', customerEmail);
    params.set('metadata[planId]', planId);
    if(orderId) params.set('metadata[orderId]', orderId);
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
