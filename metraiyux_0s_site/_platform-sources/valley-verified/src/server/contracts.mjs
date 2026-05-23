import crypto from 'node:crypto';

export const ACTION_CONTRACT_VERSION = '20.0.0';

export const ACTION_CONTRACTS = {
  lead_request: {
    title: 'Buyer lead request',
    queue: 'lead-requests',
    required: ['buyer_name', 'buyer_contact', 'city', 'category', 'details'],
    optional: ['business_ids', 'budget', 'timeline', 'source_url', 'consent_to_contact'],
    roles: ['ae', 'admin', 'buyer'],
    public_intake: true,
    description: 'Creates a buyer request packet to route against generated city/category lead rules.'
  },
  owner_claim: {
    title: 'Owner claim or correction',
    queue: 'owner-claims',
    required: ['business_id', 'owner_name', 'owner_contact', 'claim_type', 'proof_summary'],
    optional: ['website', 'phone', 'email', 'documents', 'notes'],
    roles: ['owner', 'ae', 'admin'],
    public_intake: true,
    description: 'Creates an owner verification packet without granting automatic verification.'
  },
  profile_enrichment: {
    title: 'Profile enrichment patch',
    queue: 'profile-enrichment',
    required: ['business_id', 'patch', 'reason'],
    optional: ['source_url', 'operator_note'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Stages copy/contact/category improvements for admin review before seed publication.'
  },
  suppression_request: {
    title: 'Suppression or duplicate removal request',
    queue: 'suppression-requests',
    required: ['business_id', 'reason', 'evidence'],
    optional: ['identity_key', 'source_hash', 'contact_attempted', 'owner_contact'],
    roles: ['admin'],
    public_intake: false,
    description: 'Stages a suppression patch for seed/businesses/suppressions.json instead of pretending to delete live static records.'
  },
  ae_note: {
    title: 'AE account note',
    queue: 'ae-notes',
    required: ['business_id', 'note', 'next_action'],
    optional: ['stage', 'due_date', 'product', 'owner_contact'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Stores AE outreach notes and next steps for the upstream-auth CRM layer.'
  },
  verification_decision: {
    title: 'Verification decision',
    queue: 'verification-decisions',
    required: ['business_id', 'decision', 'evidence_summary', 'reviewer'],
    optional: ['expires_at', 'notes', 'public_badges'],
    roles: ['admin'],
    public_intake: false,
    description: 'Records claim review decisions. It never auto-verifies without an explicit admin decision.'
  },
  claim_status_update: {
    title: 'Claim lifecycle status update',
    queue: 'claim-status-updates',
    required: ['business_id', 'status', 'reviewer'],
    optional: ['evidence_summary', 'notes', 'expires_at'],
    roles: ['admin'],
    public_intake: false,
    description: 'Applies an admin-reviewed claim lifecycle status to the runtime state projection.'
  },
  lead_status_update: {
    title: 'Lead lifecycle status update',
    queue: 'lead-status-updates',
    required: ['lead_id', 'status'],
    optional: ['assigned_to', 'notes', 'business_ids'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Moves a buyer lead through new, contacted, routed, won, lost, or archived runtime states.'
  },
  listing_admin_patch: {
    title: 'Admin listing patch',
    queue: 'listing-admin-patches',
    required: ['business_id', 'patch', 'reason'],
    optional: ['source_url', 'operator_note'],
    roles: ['admin'],
    public_intake: false,
    description: 'Stages an approved listing patch in runtime state before seed/data publication.'
  },
  suppression_apply: {
    title: 'Suppression draft apply',
    queue: 'suppression-drafts',
    required: ['business_id', 'reason', 'evidence'],
    optional: ['identity_key', 'source_hash', 'reviewer'],
    roles: ['admin'],
    public_intake: false,
    description: 'Creates a suppression draft that can be exported into seed/businesses/suppressions.json.'
  },
  ae_stage_update: {
    title: 'AE account stage update',
    queue: 'ae-stage-updates',
    required: ['business_id', 'stage', 'next_action'],
    optional: ['note', 'due_date', 'product', 'owner_contact'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Moves a seeded account through the AE activation pipeline.'
  },
  sponsor_intent: {
    title: 'Sponsor or exposure product intent',
    queue: 'sponsor-intents',
    required: ['business_id', 'product', 'tier', 'buyer_contact'],
    optional: ['budget', 'notes'],
    roles: ['ae', 'admin', 'owner'],
    public_intake: true,
    description: 'Captures paid exposure interest without claiming billing is complete.'
  },
  customer_business_posting: {
    title: '0S first-month customer public business landing',
    queue: 'customer-business-postings',
    required: ['customer_id', 'workspace_id', 'business_name', 'owner_name', 'owner_contact', 'city', 'category', 'posting_reason', 'subscription_started_at', 'first_paid_invoice_at'],
    optional: ['website', 'phone', 'email', 'description', 'source_url', 'notes', 'eligibility_checked_at', 'eligible_at', 'free_posting_credit'],
    roles: ['owner', 'ae', 'admin', 'system', 'customer'],
    public_intake: false,
    description: 'Queues the free Valley Verified public business landing/posting promised to qualified MetrAIyux 0S customers after their first paid month. It never publishes without review and does not require an upgrade.'
  },
  owner_contact_log: {
    title: 'Owner contact log',
    queue: 'owner-contact-logs',
    required: ['business_id', 'contact_channel', 'outcome', 'next_action'],
    optional: ['due_date', 'notes'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Records owner outreach attempts and follow-up tasks.'
  },
  payment_event: {
    title: 'Payment provider event',
    queue: 'payment-events',
    required: ['provider', 'provider_event_id', 'provider_event_type', 'payment_order_id', 'payment_status'],
    optional: ['exposure_order_id', 'business_id', 'product', 'tier', 'amount_paid_cents', 'currency', 'raw_event_hash'],
    roles: ['system', 'admin'],
    public_intake: false,
    description: 'Records a verified payment provider webhook event without automatically granting paid placement.'
  },
  exposure_activation: {
    title: 'Exposure activation decision',
    queue: 'exposure-activations',
    required: ['business_id', 'product', 'tier', 'payment_order_id', 'placement_status', 'reviewer'],
    optional: ['starts_at', 'expires_at', 'inventory_slot', 'notes'],
    roles: ['admin'],
    public_intake: false,
    description: 'Admin-approved activation of a paid exposure product after verified payment.'
  },

  quote_request: {
    title: 'Quote request intake',
    queue: 'quote-requests',
    required: ['buyer_name', 'buyer_contact', 'city', 'category', 'details'],
    optional: ['business_ids', 'budget', 'timeline', 'service_lane', 'source_url', 'consent_to_contact'],
    roles: ['buyer', 'ae', 'admin'],
    public_intake: true,
    description: 'Creates a structured quote request that can be ranked, routed, and followed by AEs without creating fake lead delivery claims.'
  },
  lead_route_decision: {
    title: 'Lead route decision',
    queue: 'lead-route-decisions',
    required: ['lead_id', 'business_ids', 'route_reason', 'assigned_to'],
    optional: ['city', 'category', 'score_summary', 'sla', 'notes'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Records which businesses should receive or be considered for a quote/lead and why.'
  },
  ae_assignment: {
    title: 'AE account assignment',
    queue: 'ae-assignments',
    required: ['business_id', 'assigned_to', 'territory', 'stage', 'next_action'],
    optional: ['priority', 'due_date', 'notes', 'product'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Assigns an account or territory task to an AE while preserving upstream auth ownership.'
  },
  owner_message: {
    title: 'Owner message draft',
    queue: 'owner-messages',
    required: ['business_id', 'message_type', 'recipient', 'body', 'channel'],
    optional: ['subject', 'template_id', 'lead_id', 'ae_id', 'send_after', 'notes'],
    roles: ['ae', 'admin'],
    public_intake: false,
    description: 'Stores an owner outreach message draft or approved message intent. Provider delivery is separate.'
  },
  notification_delivery_event: {
    title: 'Notification delivery event',
    queue: 'notification-delivery-events',
    required: ['target_id', 'channel', 'delivery_status', 'provider'],
    optional: ['business_id', 'lead_id', 'recipient', 'provider_message_id', 'error', 'raw_event_hash'],
    roles: ['system', 'admin'],
    public_intake: false,
    description: 'Records email/SMS/webhook delivery receipts without claiming an external provider succeeded without proof.'
  },
  revenue_attribution_event: {
    title: 'Revenue attribution event',
    queue: 'revenue-attribution-events',
    required: ['business_id', 'source', 'amount_cents', 'currency', 'event_type'],
    optional: ['ae_id', 'product', 'tier', 'payment_order_id', 'lead_id', 'notes'],
    roles: ['system', 'admin'],
    public_intake: false,
    description: 'Attributes revenue to product, AE, business, and lead paths after verified payment or admin-approved revenue event.'
  },
  admin_review_decision: {
    title: 'Admin review decision',
    queue: 'admin-review-decisions',
    required: ['target_action_id', 'decision', 'reviewer'],
    optional: ['notes', 'business_id'],
    roles: ['admin'],
    public_intake: false,
    description: 'Stores approval/rejection decisions for queued actions and state projection history.'
  }
};

export function listContracts(){
  return Object.entries(ACTION_CONTRACTS).map(([type, contract]) => ({ type, ...contract }));
}

export function stableActionHash(input){
  const body = JSON.stringify(input, Object.keys(input).sort());
  return crypto.createHash('sha256').update(body).digest('hex').slice(0, 24);
}

export function normalizeRoles(value){
  if(Array.isArray(value)) return value.map(String).map(v => v.trim().toLowerCase()).filter(Boolean);
  return String(value || '').split(/[|,\s]+/).map(v => v.trim().toLowerCase()).filter(Boolean);
}

export function validateActionPayload(type, payload = {}, actor = {}){
  const contract = ACTION_CONTRACTS[type];
  const errors = [];
  if(!contract) return { ok:false, errors:[`Unsupported action type: ${type}`], contract:null };
  if(!payload || typeof payload !== 'object' || Array.isArray(payload)) errors.push('Payload must be an object.');
  for(const field of contract.required){
    const value = payload?.[field];
    if(value === undefined || value === null || String(value).trim() === '') errors.push(`Missing required field: ${field}`);
  }
  const roles = normalizeRoles(actor.roles || actor.role || '');
  if(!actor.allowLocal && contract.roles?.length && !roles.some(role => contract.roles.includes(role))) {
    errors.push(`Actor role must include one of: ${contract.roles.join(', ')}`);
  }
  if(type === 'owner_claim' && payload.business_id && !/^[a-z0-9-]{3,120}$/i.test(String(payload.business_id))) errors.push('business_id must be a canonical public listing id.');
  if(type === 'customer_business_posting'){
    if(String(payload.business_name || '').trim().length < 2) errors.push('business_name must be at least 2 characters.');
    if(String(payload.owner_contact || '').trim().length < 5) errors.push('owner_contact must include a usable contact value.');
    if(payload.free_posting_credit !== true) errors.push('customer_business_posting requires free_posting_credit=true.');
  }
  if(type === 'suppression_request' && !String(payload.reason || '').match(/duplicate|fraud|closed|owner|bad-data|abuse|legal|request/i)) errors.push('suppression reason must describe duplicate, fraud, closed, owner request, bad-data, abuse, legal, or similar basis.');
  if(type === 'verification_decision' && !['approved','rejected','needs_more_proof','suspended'].includes(String(payload.decision || '').toLowerCase())) errors.push('verification decision must be approved, rejected, needs_more_proof, or suspended.');
  if(type === 'claim_status_update' && !['submitted_for_review','approved','rejected','needs_more_proof','suspended','owner_verified','archived'].includes(String(payload.status || '').toLowerCase())) errors.push('claim status must be submitted_for_review, approved, rejected, needs_more_proof, suspended, owner_verified, or archived.');
  if(type === 'lead_status_update' && !['new','contacted','routed','won','lost','archived','needs_followup'].includes(String(payload.status || '').toLowerCase())) errors.push('lead status must be new, contacted, routed, won, lost, archived, or needs_followup.');
  if(type === 'quote_request' && String(payload.details || '').trim().length < 10) errors.push('quote request details must be at least 10 characters.');
  if(type === 'lead_route_decision' && (!Array.isArray(payload.business_ids) || !payload.business_ids.length)) errors.push('lead route decision requires at least one business id.');
  if(type === 'notification_delivery_event' && !['queued','sent','delivered','failed','bounced','opened','clicked','dry_run'].includes(String(payload.delivery_status || '').toLowerCase())) errors.push('delivery_status must be queued, sent, delivered, failed, bounced, opened, clicked, or dry_run.');
  if(type === 'revenue_attribution_event' && !['payment_received','refund','credit','manual_adjustment','commission_accrued','commission_paid'].includes(String(payload.event_type || '').toLowerCase())) errors.push('revenue event_type must be payment_received, refund, credit, manual_adjustment, commission_accrued, or commission_paid.');
  if(type === 'admin_review_decision' && !['approved','rejected','needs_more_proof','archived'].includes(String(payload.decision || '').toLowerCase())) errors.push('admin review decision must be approved, rejected, needs_more_proof, or archived.');
  if(type === 'payment_event' && !['paid','unpaid','no_payment_required','failed','refunded','unknown'].includes(String(payload.payment_status || '').toLowerCase())) errors.push('payment status must be paid, unpaid, no_payment_required, failed, refunded, or unknown.');
  if(type === 'exposure_activation' && !['active','paused','rejected','expired','pending_inventory'].includes(String(payload.placement_status || '').toLowerCase())) errors.push('placement_status must be active, paused, rejected, expired, or pending_inventory.');
  return { ok:errors.length === 0, errors, contract };
}

export function createActionEnvelope({ type, payload, actor = {}, source = 'api', now = new Date().toISOString() }){
  const validation = validateActionPayload(type, payload, actor);
  if(!validation.ok){
    const error = new Error(validation.errors.join(' '));
    error.status = 400;
    error.errors = validation.errors;
    throw error;
  }
  const action_id = `${type}-${stableActionHash({ type, payload, actor_id:actor.id || actor.email || 'anonymous' })}`;
  return {
    action_id,
    action_type:type,
    contract_version:ACTION_CONTRACT_VERSION,
    queue:validation.contract.queue,
    status:'queued_for_review',
    created_at:now,
    source,
    actor:{ id:actor.id || '', email:actor.email || '', roles:normalizeRoles(actor.roles), upstream:true },
    payload,
    review:{ required:true, reason:'Static seed platform does not auto-mutate live listings. Upstream authenticated backend must approve and persist.' }
  };
}
