const $ = (id) => document.getElementById(id);
const output = $('admin-console-output');
const VALLEY_DECISION_URL = '/valley-verified/VALLEY_RUNTIME_DECISION.json';
const VALLEY_GATE_OFFER = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane';
const PROOF_BOUNDARY = {
  boundary:'proof_only',
  proof_only:true,
  worker_confirmed:false,
  worker_receipt:null,
  live_telemetry:false
};
function readHeaders(){
  const headers = { 'content-type':'application/json' };
  const bridgeHeaders = window.MetrAIyuxGateBridge?.headers?.({
    'x-skye-platform':'valley-verified',
    'x-skye-usage-lane':'valley-admin-proof'
  }) || {};
  Object.assign(headers, bridgeHeaders);
  return headers;
}
function print(value){ if(output) output.textContent = JSON.stringify(value, null, 2); }
function labelDryRunControls(){
  document.querySelectorAll('[onclick="phxAdminConsole.createDryRunCheckout()"]').forEach((button) => { button.textContent = 'Create checkout dry-run'; });
  document.querySelectorAll('[onclick="phxAdminConsole.approveAction()"]').forEach((button) => { button.textContent = 'Approve action dry-run'; });
  document.querySelectorAll('[onclick="phxAdminConsole.queueSummary()"]').forEach((button) => { button.textContent = 'Proof-only summary'; });
}
async function readDecision(){
  const res = await fetch(VALLEY_DECISION_URL, { cache:'no-store' });
  return res.json().catch(() => ({ decision:'public_directory_static_admin_external_proof_only' }));
}
function withProofBoundary(value, extra = {}){
  return { ...value, ...PROOF_BOUNDARY, ...extra };
}
async function proofOnly(action, payload = {}){
  const decision = await readDecision();
  print(withProofBoundary({
    ok:false,
    action,
    not_executed:true,
    dry_run:true,
    mode:decision.decision,
    reason:'Valley PHX admin/payment functions are not mounted on the 0S static Valley route.',
    use_live_backend:decision.liveBackends || { skyePayGateOffer:VALLEY_GATE_OFFER },
    headers_detected:Object.keys(readHeaders()).filter((key) => key !== 'content-type'),
    payload
  }));
}
window.phxAdminConsole = {
  async queueSummary(){ print(withProofBoundary(await readDecision(), { action:'runtime_decision_summary', not_executed:true, dry_run:true })); },
  exposureCatalog(){ return proofOnly('exposure_catalog_model', { model:'/valley-verified/data/exposure-products.json' }); },
  paymentService(){ return proofOnly('payment_service_model', { gate_offer:VALLEY_GATE_OFFER }); },
  createDryRunCheckout(){
    return proofOnly('create_checkout_session_dry_run', { dry_run:true, proof_only:true, business_id:$('checkout-business-id')?.value || 'demo-business', product:$('checkout-product')?.value || 'verified_profile_upgrade', tier:$('checkout-tier')?.value || 'starter', customer_email:$('checkout-email')?.value || 'owner@example.com', gate_offer:VALLEY_GATE_OFFER });
  },
  approveAction(){
    return proofOnly('approve_action_dry_run', { dry_run:true, proof_only:true, action_id:$('action-id')?.value || '' });
  },
  processOutbox(){
    return proofOnly('process_outbox_dry_run', { dry_run:true, proof_only:true });
  }
};
labelDryRunControls();
