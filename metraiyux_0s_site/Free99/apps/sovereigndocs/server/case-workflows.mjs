import crypto from 'node:crypto';
import { scopedOwnerFromSession, canAccessTenantRecord, withTenantScope } from './runtime/tenant-scope.mjs';

export const CASE_STATUSES = [
  'intake_started',
  'documents_generated',
  'packet_assembled',
  'editor_handoff_created',
  'opened_in_skye_docx_max',
  'returned_from_skye_docx_max',
  'submitted_for_partner_review',
  'routed_to_partner',
  'partner_review_returned',
  'signature_packet_created',
  'completed',
  'archived',
  'voided'
];

export const CASE_TRANSITIONS = {
  intake_started: ['documents_generated','packet_assembled','editor_handoff_created','submitted_for_partner_review','voided'],
  documents_generated: ['packet_assembled','editor_handoff_created','submitted_for_partner_review','signature_packet_created','completed','archived','voided'],
  packet_assembled: ['editor_handoff_created','submitted_for_partner_review','signature_packet_created','completed','archived','voided'],
  editor_handoff_created: ['opened_in_skye_docx_max','returned_from_skye_docx_max','submitted_for_partner_review','signature_packet_created','completed','archived','voided'],
  opened_in_skye_docx_max: ['returned_from_skye_docx_max','submitted_for_partner_review','signature_packet_created','completed','archived','voided'],
  returned_from_skye_docx_max: ['submitted_for_partner_review','signature_packet_created','completed','archived','voided'],
  submitted_for_partner_review: ['opened_in_skye_docx_max','returned_from_skye_docx_max','routed_to_partner','partner_review_returned','completed','archived','voided'],
  routed_to_partner: ['opened_in_skye_docx_max','returned_from_skye_docx_max','partner_review_returned','completed','archived','voided'],
  partner_review_returned: ['signature_packet_created','completed','archived','voided'],
  signature_packet_created: ['completed','archived','voided'],
  completed: ['archived'],
  archived: [],
  voided: []
};

function ownerFromSession(session = {}){ return scopedOwnerFromSession(session); }

export function newCaseId(){ return `sd_case_${crypto.randomUUID()}`; }

export function createCaseRecord({
  id = newCaseId(),
  title = 'SovereignDocs Case',
  caseType = 'document_workflow',
  status = 'intake_started',
  templateIds = [],
  documentIds = [],
  packetId = null,
  handoffId = null,
  returnIds = [],
  reviewSubmissionIds = [],
  orderIds = [],
  reminderIds = [],
  signatureEnvelopeIds = [],
  riskSummary = {},
  source = 'api',
  session = {},
  metadata = {},
  boundaries = {}
}){
  if(!CASE_STATUSES.includes(status)){ const error = new Error(`Unsupported case status: ${status}`); error.status = 400; throw error; }
  const now = new Date().toISOString();
  return {
    id,
    title: String(title || 'SovereignDocs Case').slice(0, 300),
    caseType,
    status,
    templateIds: [...new Set((templateIds || []).map(String))],
    documentIds: [...new Set((documentIds || []).map(String))],
    packetId,
    handoffId,
    returnIds: [...new Set((returnIds || []).map(String))],
    reviewSubmissionIds: [...new Set((reviewSubmissionIds || []).map(String))],
    orderIds: [...new Set((orderIds || []).map(String))],
    reminderIds: [...new Set((reminderIds || []).map(String))],
    signatureEnvelopeIds: [...new Set((signatureEnvelopeIds || []).map(String))],
    riskSummary,
    source,
    owner: ownerFromSession(session),
    tenant: withTenantScope({}, session).tenant,
    metadata,
    boundaries:{
      notLegalAdvice:true,
      noAttorneyClientWithSovereignDocs:true,
      noGuarantee:true,
      officialSourceRequiredWhereApplicable:true,
      partnerOutcomeNotGuaranteed:true,
      ...(boundaries || {})
    },
    events:[{ id:crypto.randomUUID(), status, at:now, actor:session?.user?.id || 'anonymous', note:'case record created', payload:{ source } }],
    createdAt:now,
    updatedAt:now
  };
}

export function canAccessCase(session = {}, row = {}){ return canAccessTenantRecord(session, row); }

export function transitionCase(row, { status, actor = 'system', note = '', payload = {} }){
  if(!CASE_STATUSES.includes(status)){ const error = new Error(`Unsupported case status: ${status}`); error.status = 400; throw error; }
  const current = row.status || 'intake_started';
  const allowed = CASE_TRANSITIONS[current] || [];
  if(current !== status && !allowed.includes(status)){
    const error = new Error(`Invalid case transition: ${current} -> ${status}`);
    error.status = 409;
    error.allowed = allowed;
    throw error;
  }
  const now = new Date().toISOString();
  return { ...row, status, updatedAt:now, events:[...(row.events || []), { id:crypto.randomUUID(), status, at:now, actor, note, payload }] };
}

export function summarizeCase(row = {}){
  return {
    id:row.id,
    title:row.title,
    caseType:row.caseType,
    status:row.status,
    templateCount:row.templateIds?.length || 0,
    documentCount:row.documentIds?.length || 0,
    packetId:row.packetId || null,
    handoffId:row.handoffId || null,
    reviewSubmissionCount:row.reviewSubmissionIds?.length || 0,
    riskSummary:row.riskSummary || {},
    owner:row.owner || null,
    createdAt:row.createdAt,
    updatedAt:row.updatedAt
  };
}
