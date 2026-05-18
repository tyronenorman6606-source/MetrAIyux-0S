import fs from 'fs';
import path from 'path';
import { ROOT_ENV_LOAD_RESULT, summarizeLiveEnv } from '../src/root-env.js';
import { SKYPAY_OFFERS } from '../../../SkyeGateFS27/netlify/functions/_lib/skyepayCatalog.js';

const root = process.cwd();
const proofDir = path.join(root, 'proof');
fs.mkdirSync(proofDir, { recursive: true });

const loaded = ROOT_ENV_LOAD_RESULT;
const summary = summarizeLiveEnv();
const plans = JSON.parse(fs.readFileSync(path.join(root, '..', 'data', 'plans.json'), 'utf8'));
const plansById = new Map(plans.map((plan) => [plan.id, plan]));
const offersById = new Map(SKYPAY_OFFERS.map((offer) => [offer.id, offer]));

const ownerApprovalPairs = [
  ['starter-command', 'metraiyux-starter-command', 'paid_pending_owner_approval'],
  ['growth-cabinet', 'metraiyux-growth-cabinet', 'owner_approved_after_route_scope'],
  ['routex-workforce-command', 'metraiyux-routex-workforce-command', 'owner_approved_after_route_scope'],
  ['autonomous-office', 'metraiyux-autonomous-office', 'owner_approved_after_sovereign_stack_review'],
  ['enterprise-command', 'metraiyux-enterprise-command', 'owner_approved_after_gate_scope']
];

const proof = {
  started_at: new Date().toISOString(),
  smoke: 'live-env-readiness',
  root_env: {
    loaded: loaded.loaded,
    path_found: !!loaded.envPath,
    applied_keys_count: loaded.applied.length,
    skipped_control_keys: loaded.skipped
  },
  checks: [],
  warnings: []
};

function check(name, ok, data = {}) {
  proof.checks.push({ status: ok ? 'PASS' : 'FAIL', name, critical: true, data });
  return ok;
}

function optionalCheck(name, ok, data = {}) {
  proof.checks.push({ status: ok ? 'PASS' : 'WARN', name, critical: false, data });
  if (!ok) warn(name, data);
  return ok;
}

function warn(name, data = {}) {
  proof.warnings.push({ name, data });
}

check('root_env_file_loaded', loaded.loaded === true, { path_found: !!loaded.envPath });
check('database_live_url_available', summary.database.configured && summary.database.driver === 'postgres', { configured: summary.database.configured, driver: summary.database.driver });
check('stripe_checkout_and_webhook_available', summary.stripe.configured && summary.stripe.webhook_configured && summary.stripe.provider === 'stripe', {
  secret_present: summary.stripe.configured,
  webhook_secret_present: summary.stripe.webhook_configured,
  provider: summary.stripe.provider
});
optionalCheck('object_storage_r2_available', summary.storage.configured && summary.storage.driver === 'r2', {
  configured: summary.storage.configured,
  driver: summary.storage.driver,
  impact: 'Live proof-media object storage needs STORAGE_BUCKET/S3_BUCKET plus the R2 keys before production proof upload is fully live.'
});
optionalCheck('twilio_notification_env_available', summary.twilio.configured && summary.twilio.provider === 'twilio', { configured: summary.twilio.configured, provider: summary.twilio.provider });

if (!summary.route_intelligence.configured) {
  warn('mapbox_route_intelligence_missing', {
    impact: 'RouteX can record paid status after payment, but owner-approved activation and live ETA/geocoding require MAPBOX_ACCESS_TOKEN or an explicit route webhook provider.'
  });
}
optionalCheck('identity_compliance_manual_or_provider_available', summary.identity_compliance.configured, {
  configured: summary.identity_compliance.configured,
  provider: summary.identity_compliance.provider,
  mode: summary.identity_compliance.mode,
  operating_state: summary.identity_compliance.operating_state,
  impact: 'manual-government-check is accepted for the Arizona LLC admin-assist/proof-vault lane; Checkr or compliance-webhook remains optional.'
});

for (const [planId, offerId, activationPath] of ownerApprovalPairs) {
  const plan = plansById.get(planId);
  const offer = offersById.get(offerId);
  check(`${planId}_plan_owner_approval_policy`, !!plan && plan.owner_approval_required === true && plan.activation_path === activationPath, {
    owner_approval_required: plan?.owner_approval_required,
    activation_path: plan?.activation_path
  });
  check(`${offerId}_skyepay_offer_owner_approval_policy`, !!offer && offer.owner_approval_required === true && offer.activation_path === activationPath, {
    owner_approval_required: offer?.owner_approval_required,
    activation_path: offer?.activation_path
  });
}

proof.customer_ready_for_paid_owner_approval_queue = proof.checks
  .filter((item) => item.critical)
  .every((item) => item.status === 'PASS');
proof.customer_ready_for_full_live_route_ops = proof.customer_ready_for_paid_owner_approval_queue &&
  summary.storage.configured &&
  summary.twilio.configured &&
  summary.route_intelligence.configured &&
  summary.identity_compliance.configured;
proof.status = proof.customer_ready_for_paid_owner_approval_queue
  ? (proof.warnings.length ? 'PASS_WITH_WARNINGS' : 'PASS')
  : 'FAIL';
proof.completed_at = new Date().toISOString();

const out = path.join(proofDir, `SMOKE_LIVE_ENV_READINESS_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(out, JSON.stringify(proof, null, 2));
console.log(`Live env readiness proof written: ${out}`);
console.log(JSON.stringify({
  status: proof.status,
  customer_ready_for_paid_owner_approval_queue: proof.customer_ready_for_paid_owner_approval_queue,
  customer_ready_for_full_live_route_ops: proof.customer_ready_for_full_live_route_ops,
  warnings: proof.warnings.map((item) => item.name)
}, null, 2));

if (!proof.customer_ready_for_paid_owner_approval_queue) process.exit(1);
