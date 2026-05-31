const $ = (id) => document.getElementById(id);
const output = $('admin-console-output');
const VALLEY_DECISION_URL = `${valleyMountPath()}/VALLEY_RUNTIME_DECISION.json`;
function valleyMountPath(){
  const parts = location.pathname.split('/').filter(Boolean);
  if(parts[0] === 'valley-verified-marketplace') return '/valley-verified-marketplace';
  if(parts[0] === 'skyenet' && parts[1] === 'valley-verified') return '/skyenet/valley-verified';
  if(parts[0] === 'valley-verified') return '/valley-verified';
  return '';
}
const VALLEY_GATE_OFFER = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane';
function readHeaders(){
  const token = $('fs27-gate-token')?.value || window.localStorage?.getItem('fs27_gate_token') || '';
  const headers = { 'content-type':'application/json' };
  if(token) headers.authorization = `Bearer ${token}`;
  return headers;
}
function print(value){ if(output) output.textContent = JSON.stringify(value, null, 2); }
async function readDecision(){
  const res = await fetch(VALLEY_DECISION_URL, { cache:'no-store' });
  return res.json().catch(() => ({ decision:'public_directory_static_admin_external_proof_only' }));
}
async function proofOnly(action, payload = {}){
  const decision = await readDecision();
  print({
    ok:false,
    action,
    not_executed:true,
    mode:decision.decision,
    reason:'Valley PHX admin/payment functions are not mounted on the 0S static Valley route.',
    use_live_backend:decision.liveBackends || { skyePayGateOffer:VALLEY_GATE_OFFER },
    headers_detected:Object.keys(readHeaders()).filter((key) => key !== 'content-type'),
    payload
  });
}
window.phxAdminConsole = {
  async queueSummary(){ print(await readDecision()); },
  exposureCatalog(){ return proofOnly('exposure_catalog_model', { model:`${valleyMountPath()}/data/exposure-products.json` }); },
  paymentService(){ return proofOnly('payment_service_model', { gate_offer:VALLEY_GATE_OFFER }); },
  createDryRunCheckout(){
    return proofOnly('create_checkout_session', { business_id:$('checkout-business-id')?.value || 'demo-business', product:$('checkout-product')?.value || 'verified_profile_upgrade', tier:$('checkout-tier')?.value || 'starter', customer_email:$('checkout-email')?.value || 'owner@example.com', gate_offer:VALLEY_GATE_OFFER });
  },
  approveAction(){
    return proofOnly('approve_action', { action_id:$('action-id')?.value || '' });
  },
  processOutbox(){
    return proofOnly('process_outbox', { dry_run:true });
  }
};
