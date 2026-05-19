import crypto from 'node:crypto';

export const LEGAL_REVIEW_STATUSES = [
  'draft_packet_created',
  'submitted_pending_triage',
  'needs_more_information',
  'routed_to_partner',
  'partner_review_in_progress',
  'partner_declined',
  'partner_review_returned',
  'user_followup_needed',
  'closed_no_partner_engagement',
  'closed_partner_engagement_external',
  'archived'
];

export function requirePartnerReviewAcknowledgments(body = {}){
  const missing = [];
  if(!body.acceptBoundary) missing.push('not_legal_advice_boundary');
  if(!body.acceptPartnerReviewTerms) missing.push('partner_review_terms');
  if(!body.acceptNoGuarantee) missing.push('no_guarantee_boundary');
  if(!body.acceptNoSovereignDocsLiabilityForOutcome) missing.push('no_sovereigndocs_liability_for_partner_outcome');
  if(!body.acceptUserFactsResponsibility) missing.push('user_fact_accuracy_responsibility');
  return { ok: missing.length === 0, missing };
}

export function canAccessSubmission(session, submission){
  const roles = session?.user?.roles || [];
  if(roles.some(role => ['owner','admin','operator','reviewer','legal_partner'].includes(role))) return true;
  if(!submission?.submittedBy?.id || !session?.user?.id) return false;
  return String(submission.submittedBy.id) === String(session.user.id);
}

export function summarizeSubmission(row){
  return {
    id: row.id,
    templateId: row.templateId,
    templateTitle: row.templateTitle,
    riskLevel: row.riskLevel,
    reviewScope: row.reviewScope,
    status: row.status,
    partnerId: row.partnerId || null,
    partnerStatus: row.partnerStatus || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedBy: row.submittedBy ? { id: row.submittedBy.id, email: row.submittedBy.email || null, orgId: row.submittedBy.orgId || null } : null,
    boundaries: row.boundaries
  };
}

export function buildReviewPacket({ bundle, answers = {}, gate, assembledMarkdown = '', body = {}, session }){
  const answerRows = Object.entries(answers || {})
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `- ${key}: ${String(value ?? '').trim() || '[not provided]'}`)
    .join('\n');
  const contact = body.contact || {};
  const requestedScope = body.reviewScope || 'general_partner_review_request';
  return `# SovereignDocs Partner Review Packet\n\nThis packet was prepared for routing to the configured legal partner network. SovereignDocs is not a law firm, does not provide legal advice, and does not guarantee that any partner will accept, approve, revise, validate, or complete a review.\n\n## Submission scope\n\n- Requested scope: ${requestedScope}\n- Template ID: ${bundle.meta.id}\n- Template title: ${bundle.meta.title}\n- Template version: ${bundle.meta.version}\n- Risk level: ${bundle.meta.riskLevel}\n- Gate lane: ${gate.lane}\n- Export class: ${gate.exportClass}\n- Source path: ${bundle.meta.sourcePath}\n\n## Submitter\n\n- Upstream subject: ${session?.user?.id || 'not supplied'}\n- Email: ${contact.email || session?.user?.email || '[not supplied]'}\n- Name: ${contact.name || session?.user?.name || '[not supplied]'}\n- Organization: ${contact.organization || session?.user?.organization || '[not supplied]'}\n\n## User facts / answers\n\n${answerRows || '- No answers supplied.'}\n\n## Draft or prep worksheet content\n\n${assembledMarkdown || '[No assembled content supplied]'}\n\n## Required boundaries accepted\n\n- Not legal advice: ${!!body.acceptBoundary}\n- Partner review terms: ${!!body.acceptPartnerReviewTerms}\n- No guarantee: ${!!body.acceptNoGuarantee}\n- SovereignDocs not responsible for partner outcome: ${!!body.acceptNoSovereignDocsLiabilityForOutcome}\n- User fact accuracy responsibility: ${!!body.acceptUserFactsResponsibility}\n\n## Partner review boundary\n\nAny attorney-client relationship, if one is created, is between the user and the reviewing legal professional or firm under that partner's own engagement terms. SovereignDocs is the document automation and routing platform only.\n`;
}

export function createLegalReviewSubmission({ bundle, answers, gate, assembledMarkdown, body, session }){
  const now = new Date().toISOString();
  const packetMarkdown = buildReviewPacket({ bundle, answers, gate, assembledMarkdown, body, session });
  return {
    id: crypto.randomUUID(),
    status: 'submitted_pending_triage',
    templateId: bundle.meta.id,
    templateTitle: bundle.meta.title,
    templateVersion: bundle.meta.version,
    riskLevel: bundle.meta.riskLevel,
    sourcePath: bundle.meta.sourcePath,
    gate,
    reviewScope: String(body.reviewScope || 'general_partner_review_request'),
    servicePlanId: String(body.servicePlanId || 'basic_packet_review_request'),
    submittedBy: session?.user ? {
      id: session.user.id,
      name: session.user.name || null,
      email: session.user.email || body.contact?.email || null,
      orgId: session.user.orgId || null,
      organization: session.user.organization || null,
      roles: session.user.roles || []
    } : null,
    contact: body.contact || {},
    answers,
    packetMarkdown,
    boundaries: {
      notLegalAdvice: true,
      noAttorneyClientWithSovereignDocs: true,
      partnerMayDecline: true,
      noOutcomeGuarantee: true,
      userResponsibleForFactsAndUse: true,
      sovereignDocsNotLawFirm: true,
      sovereignDocsNotResponsibleForPartnerOutcome: true
    },
    events: [
      { id: crypto.randomUUID(), type: 'submitted_pending_triage', actor: session?.user?.id || 'unknown', note: 'Partner review request submitted to SovereignDocs triage queue.', createdAt: now }
    ],
    createdAt: now,
    updatedAt: now
  };
}

export function transitionLegalReviewSubmission(row, { status, actor, note = '', partnerId = null, partnerStatus = null, payload = {} }){
  if(!LEGAL_REVIEW_STATUSES.includes(status)){
    const error = new Error(`Unsupported legal review status: ${status}`);
    error.status = 400;
    throw error;
  }
  const now = new Date().toISOString();
  const next = { ...row, status, updatedAt: now };
  if(partnerId) next.partnerId = partnerId;
  if(partnerStatus) next.partnerStatus = partnerStatus;
  next.events = [...(row.events || []), { id: crypto.randomUUID(), type: status, actor: actor || 'unknown', note, partnerId: partnerId || row.partnerId || null, partnerStatus: partnerStatus || null, payload, createdAt: now }];
  return next;
}
