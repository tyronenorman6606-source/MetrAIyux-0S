import { ACTION_CONTRACTS, normalizeRoles } from './contracts.mjs';

export const MUTATION_POLICY_VERSION = '19.0.0';

const ADMIN_ONLY = new Set([
  'suppression_request',
  'suppression_apply',
  'verification_decision',
  'claim_status_update',
  'listing_admin_patch',
  'admin_review_decision',
  'exposure_activation'
]);

const SYSTEM_OR_ADMIN = new Set([
  'payment_event'
]);

const AE_OR_ADMIN = new Set([
  'profile_enrichment',
  'ae_note',
  'ae_stage_update',
  'owner_contact_log',
  'lead_status_update'
]);

const FORBIDDEN_PATCH_FIELDS = new Set([
  'id',
  'source_id',
  'source_hash',
  'canonical_id',
  'canonical_identity_key',
  'identity',
  'verification_score',
  'moderation_flags',
  'source_batch_id',
  'created_at'
]);

const PUBLIC_INTAKE_TYPES = new Set(
  Object.entries(ACTION_CONTRACTS)
    .filter(([, contract]) => contract.public_intake)
    .map(([type]) => type)
);

function roleSet(actor = {}){
  if(actor.allowLocal) return new Set(['admin', 'ae', 'owner', 'buyer', 'system']);
  return new Set(normalizeRoles(actor.roles || actor.role || ''));
}

function hasAnyRole(actor, roles){
  const roleset = roleSet(actor);
  return roles.some(role => roleset.has(role));
}

function payloadBytes(payload){
  return Buffer.byteLength(JSON.stringify(payload || {}), 'utf8');
}

function findForbiddenPatchFields(patch = {}, prefix = ''){
  const violations = [];
  if(!patch || typeof patch !== 'object' || Array.isArray(patch)) return violations;
  for(const [field, value] of Object.entries(patch)){
    const path = prefix ? `${prefix}.${field}` : field;
    if(FORBIDDEN_PATCH_FIELDS.has(field)) violations.push(path);
    if(value && typeof value === 'object' && !Array.isArray(value)) violations.push(...findForbiddenPatchFields(value, path));
  }
  return violations;
}

function riskScore(type, payload = {}){
  let score = 10;
  if(ADMIN_ONLY.has(type)) score += 50;
  if(AE_OR_ADMIN.has(type)) score += 25;
  if(PUBLIC_INTAKE_TYPES.has(type)) score += 8;
  if(payload.patch) score += 20;
  if(payload.evidence || payload.proof_summary) score += 10;
  if(payload.business_ids?.length > 20) score += 20;
  if(payloadBytes(payload) > 12_000) score += 20;
  return Math.min(score, 100);
}

export function evaluateActionPolicy({ type, payload = {}, actor = {}, source = 'api' }){
  const contract = ACTION_CONTRACTS[type];
  const violations = [];
  const warnings = [];
  const roles = Array.from(roleSet(actor));
  if(!contract){
    return { ok:false, status:400, violations:[`Unsupported action type: ${type}`], warnings, roles, risk_score:100 };
  }
  if(payloadBytes(payload) > 64_000) violations.push('Payload exceeds 64 KB action limit. Upload documents to upstream storage and submit references only.');
  if(ADMIN_ONLY.has(type) && !hasAnyRole(actor, ['admin'])) violations.push(`${type} requires admin role.`);
  if(SYSTEM_OR_ADMIN.has(type) && !hasAnyRole(actor, ['system', 'admin'])) violations.push(`${type} requires system or admin role.`);
  if(AE_OR_ADMIN.has(type) && !hasAnyRole(actor, ['admin', 'ae'])) violations.push(`${type} requires ae or admin role.`);
  if(type === 'lead_request' && !hasAnyRole(actor, ['buyer', 'ae', 'admin'])) violations.push('lead_request requires buyer, ae, or admin role.');
  if(type === 'owner_claim' && !hasAnyRole(actor, ['owner', 'ae', 'admin'])) violations.push('owner_claim requires owner, ae, or admin role.');
  if(type === 'sponsor_intent' && !hasAnyRole(actor, ['owner', 'ae', 'admin'])) violations.push('sponsor_intent requires owner, ae, or admin role.');
  if(type === 'customer_business_posting' && !hasAnyRole(actor, ['owner', 'customer', 'ae', 'admin', 'system'])) violations.push('customer_business_posting requires owner, customer, ae, admin, or system role.');
  const forbiddenPatchFields = findForbiddenPatchFields(payload.patch || {});
  if(forbiddenPatchFields.length) violations.push(`Patch attempts to modify protected fields: ${forbiddenPatchFields.join(', ')}`);
  if(PUBLIC_INTAKE_TYPES.has(type) && payload.patch) warnings.push('Public intake action contains a patch. It must remain queued until admin review.');
  if(String(payload.website || '').includes('javascript:')) violations.push('Website field cannot use javascript: URLs.');
  if(String(payload.owner_contact || payload.buyer_contact || '').length > 320) violations.push('Contact field is too long.');
  if(source === 'public-form' && ADMIN_ONLY.has(type)) violations.push('Public form source cannot submit admin-only actions.');
  const score = riskScore(type, payload);
  return {
    ok:violations.length === 0,
    status:violations.some(v => v.includes('requires')) ? 403 : 400,
    policy_version:MUTATION_POLICY_VERSION,
    risk_score:score,
    risk_level:score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low',
    roles,
    warnings,
    violations
  };
}

export function requireActionPolicy(input){
  const policy = evaluateActionPolicy(input);
  if(!policy.ok){
    const error = new Error(policy.violations.join(' '));
    error.status = policy.status;
    error.errors = policy.violations;
    error.policy = policy;
    throw error;
  }
  return policy;
}

export function policyMatrix(){
  return Object.entries(ACTION_CONTRACTS).map(([type, contract]) => ({
    type,
    queue:contract.queue,
    public_intake:Boolean(contract.public_intake),
    contract_roles:contract.roles || [],
    policy_lane:ADMIN_ONLY.has(type) ? 'admin_only' : SYSTEM_OR_ADMIN.has(type) ? 'system_or_admin' : AE_OR_ADMIN.has(type) ? 'ae_or_admin' : PUBLIC_INTAKE_TYPES.has(type) ? 'public_intake_queued' : 'standard_review',
    protected_patch_fields:Array.from(FORBIDDEN_PATCH_FIELDS),
    max_payload_bytes:64_000
  }));
}
