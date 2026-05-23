import crypto from 'node:crypto';

export const COMMERCIAL_ORDER_STATUSES = [
  'intake_received',
  'boundary_blocked',
  'awaiting_user_information',
  'draft_packet_created',
  'official_source_ready',
  'partner_review_requested',
  'partner_review_routed',
  'partner_returned',
  'external_filing_ready',
  'closed_user_downloaded',
  'closed_external_partner',
  'archived'
];

export function requireCommercialAcknowledgments(body = {}, extra = []){
  const missing = [];
  const required = [
    ['acceptBoundary','not_legal_advice_boundary'],
    ['acceptNoGuarantee','no_approval_or_outcome_guarantee'],
    ['acceptExternalOfficialSource','official_or_partner_submission_may_be_required'],
    ['acceptUserFactsResponsibility','user_fact_accuracy_responsibility'],
    ...extra
  ];
  for(const [key,label] of required){ if(!body[key]) missing.push(label); }
  return { ok: missing.length === 0, missing };
}

export function summarizeOrder(order){
  return {
    id: order.id,
    type: order.type,
    serviceId: order.serviceId,
    status: order.status,
    userId: order.user?.id || null,
    orgId: order.user?.orgId || null,
    risk: order.risk || null,
    jurisdiction: order.jurisdiction || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    boundary: order.boundary
  };
}

export function canAccessOrder(session, order){
  const roles = session?.user?.roles || [];
  if(roles.some(role => ['owner','admin','operator','reviewer','legal_partner','partner_manager'].includes(role))) return true;
  if(!order?.user?.id || !session?.user?.id) return false;
  return String(order.user.id) === String(session.user.id);
}

export function createCommercialOrder({ type, serviceId, risk = 'medium', jurisdiction = null, payload = {}, session, status = 'intake_received' }){
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type,
    serviceId,
    risk,
    jurisdiction: jurisdiction || payload.state || payload.jurisdiction || null,
    status,
    user: session?.user ? {
      id: session.user.id,
      name: session.user.name || null,
      email: session.user.email || payload.contact?.email || null,
      organization: session.user.organization || payload.contact?.organization || null,
      orgId: session.user.orgId || null,
      roles: session.user.roles || []
    } : null,
    payload,
    boundaries: {
      notLegalAdvice: true,
      noSovereignDocsLawFirm: true,
      noApprovalGuarantee: true,
      noFilingGuarantee: true,
      noPartnerOutcomeGuarantee: true,
      userResponsibleForFacts: true,
      officialSourcesMayChange: true
    },
    boundary: 'SovereignDocs tracks intake, document automation, official-source prep, and partner routing only. It does not guarantee approval, acceptance, filing, compliance, legal sufficiency, or partner outcome.',
    events: [
      { id: crypto.randomUUID(), type: status, actor: session?.user?.id || 'unknown', note: `${type} intake created`, createdAt: now }
    ],
    createdAt: now,
    updatedAt: now
  };
}

export function transitionCommercialOrder(order, { status, actor, note = '', payload = {} }){
  if(!COMMERCIAL_ORDER_STATUSES.includes(status)){
    const error = new Error(`Unsupported commercial order status: ${status}`);
    error.status = 400;
    throw error;
  }
  const now = new Date().toISOString();
  return {
    ...order,
    status,
    payload: { ...(order.payload || {}), lastTransitionPayload: payload || {} },
    updatedAt: now,
    events: [ ...(order.events || []), { id: crypto.randomUUID(), type: status, actor: actor || 'unknown', note, payload, createdAt: now } ]
  };
}

export function buildFormationPrepPacket({ product = {}, body = {}, session }){
  const a = body.answers || {};
  const lines = [
    `# ${product.name || 'Business Formation Prep Packet'}`,
    '',
    'SovereignDocs prepared this intake packet for self-help organization, official-source routing, and optional partner review. This is not legal advice, not a filing, and not an approval guarantee.',
    '',
    '## Business facts',
    `- Proposed business name: ${a.businessName || '[not supplied]'}`,
    `- State / jurisdiction: ${a.state || body.state || '[not supplied]'}`,
    `- Entity type: ${a.entityType || product.name || '[not supplied]'}`,
    `- Owners / members / shareholders: ${a.owners || '[not supplied]'}`,
    `- Business purpose: ${a.businessPurpose || '[not supplied]'}`,
    `- Registered/statutory agent: ${a.registeredAgent || '[not supplied]'}`,
    '',
    '## Deliverables requested',
    ...(product.deliverables || []).map(x => `- ${x}`),
    '',
    '## Official-source policy',
    product.officialSourcePolicy || 'Use current agency source or configured partner route for final submission.',
    '',
    '## Submitter',
    `- Upstream user: ${session?.user?.id || 'not supplied'}`,
    `- Contact email: ${body.contact?.email || session?.user?.email || '[not supplied]'}`
  ];
  return lines.join('\n');
}

export function buildComplianceMonitor({ body = {}, obligations = [] }){
  const state = String(body.state || body.answers?.state || '').toUpperCase();
  const entityType = String(body.entityType || body.answers?.entityType || 'All');
  const relevant = obligations.filter(o => (!state || o.state === state) && (o.entityTypes || []).some(t => t === 'All' || t.toLowerCase() === entityType.toLowerCase())).slice(0, 25);
  return {
    state,
    entityType,
    items: relevant,
    boundary: 'Calendar items are reminders and checklists only. Verify current deadlines, fees, and requirements with the official agency or configured partner.'
  };
}

export function buildReviewReadyPacket({ lane, service = {}, body = {}, session }){
  const a = body.answers || {};
  return `# SovereignDocs ${lane} Intake Packet\n\nThis packet organizes user facts for document automation, official-source routing, and optional partner review. SovereignDocs is not a law firm and does not provide legal advice.\n\n## Service\n\n- Service ID: ${service.id || body.serviceId || '[not supplied]'}\n- Service name: ${service.name || '[not supplied]'}\n- Risk: ${service.risk || 'high'}\n\n## User facts\n\n${Object.entries(a).map(([k,v]) => `- ${k}: ${String(v ?? '').trim() || '[not supplied]'}`).join('\n') || '- No facts supplied.'}\n\n## Contact\n\n- Upstream user: ${session?.user?.id || 'not supplied'}\n- Email: ${body.contact?.email || session?.user?.email || '[not supplied]'}\n\n## Boundary\n\nNo guarantee of approval, acceptance, filing, legal sufficiency, partner acceptance, or outcome.\n`;
}
