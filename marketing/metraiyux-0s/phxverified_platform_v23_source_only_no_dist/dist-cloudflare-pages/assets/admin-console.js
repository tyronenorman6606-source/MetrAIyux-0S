const $ = (id) => document.getElementById(id);
const output = $('admin-console-output');
function readHeaders(){
  const token = $('fs27-gate-token')?.value || window.localStorage?.getItem('fs27_gate_token') || '';
  const headers = { 'content-type':'application/json' };
  if(token) headers.authorization = `Bearer ${token}`;
  return headers;
}
function print(value){ if(output) output.textContent = JSON.stringify(value, null, 2); }
async function callEndpoint(url, options = {}){
  const res = await fetch(url, { ...options, headers:{ ...readHeaders(), ...(options.headers || {}) } });
  const body = await res.json().catch(() => ({ ok:false, error:'Non-JSON response' }));
  print({ status:res.status, body });
}
window.phxAdminConsole = {
  queueSummary(){ return callEndpoint('/.netlify/functions/phx-admin'); },
  exposureCatalog(){ return callEndpoint('/.netlify/functions/phx-admin?exposure_catalog=1'); },
  paymentService(){ return callEndpoint('/.netlify/functions/phx-payment'); },
  createDryRunCheckout(){
    return callEndpoint('/.netlify/functions/phx-payment', {
      method:'POST',
      body:JSON.stringify({ operation:'create_checkout_session', payload:{ business_id:$('checkout-business-id')?.value || 'demo-business', product:$('checkout-product')?.value || 'verified_profile_upgrade', tier:$('checkout-tier')?.value || 'starter', buyer_contact:$('checkout-email')?.value || 'owner@example.com', customer_email:$('checkout-email')?.value || 'owner@example.com', success_url:location.origin + '/pricing/?checkout=success', cancel_url:location.origin + '/pricing/?checkout=cancel' } })
    });
  },
  approveAction(){
    return callEndpoint('/.netlify/functions/phx-admin', { method:'POST', body:JSON.stringify({ operation:'approve_action', action_id:$('action-id')?.value || '', reason:'approved from admin console' }) });
  },
  processOutbox(){
    return callEndpoint('/.netlify/functions/phx-admin', { method:'POST', body:JSON.stringify({ operation:'process_outbox', dry_run:true }) });
  }
};
