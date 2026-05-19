import crypto from 'node:crypto';
import { scopedOwnerFromSession, withTenantScope } from './runtime/tenant-scope.mjs';
export const DOCUMENT_STATUSES = ['draft_created','answers_in_progress','ready_for_export','exported','submitted_for_partner_review','partner_review_in_progress','partner_review_returned','signed_packet_created','archived','voided'];
export const DOCUMENT_TRANSITIONS = {
  draft_created: ['answers_in_progress','ready_for_export','voided'],
  answers_in_progress: ['ready_for_export','submitted_for_partner_review','voided'],
  ready_for_export: ['exported','submitted_for_partner_review','signed_packet_created','archived','voided'],
  exported: ['submitted_for_partner_review','signed_packet_created','archived','voided'],
  submitted_for_partner_review: ['partner_review_in_progress','partner_review_returned','archived'],
  partner_review_in_progress: ['partner_review_returned','archived'],
  partner_review_returned: ['ready_for_export','signed_packet_created','archived','voided'],
  signed_packet_created: ['archived','voided'],
  archived: [],
  voided: []
};
export function createDocumentRecord({ bundle, answers = {}, gate = {}, session = {}, source = 'builder', status = 'draft_created' }){
  const now = new Date().toISOString();
  return { id:crypto.randomUUID(), templateId: bundle?.meta?.id || bundle?.item?.id || null, templateTitle: bundle?.meta?.title || bundle?.item?.title || null, templateVersion: bundle?.meta?.version || null, riskLevel: bundle?.meta?.riskLevel || null, jurisdiction: bundle?.meta?.jurisdiction || null, category: bundle?.meta?.category || null, status, source, gate, answerKeys:Object.keys(answers || {}), owner:scopedOwnerFromSession(session), tenant:withTenantScope({}, session).tenant, events:[{ status, at:now, actor:session?.user?.id || 'anonymous', note:'document record created' }], createdAt:now, updatedAt:now };
}
export function transitionDocument(record, { status, actor = 'system', note = '', payload = {} }){
  if(!DOCUMENT_STATUSES.includes(status)){ const error = new Error(`Unsupported document status: ${status}`); error.status=400; throw error; }
  const current = record.status || 'draft_created';
  const allowed = DOCUMENT_TRANSITIONS[current] || [];
  if(current !== status && !allowed.includes(status)){ const error = new Error(`Invalid document transition: ${current} -> ${status}`); error.status=409; error.allowed=allowed; throw error; }
  const now = new Date().toISOString();
  return { ...record, status, updatedAt:now, events:[...(record.events || []), { status, at:now, actor, note, payload }] };
}
export function summarizeDocument(record){ return { id:record.id, templateId:record.templateId, title:record.templateTitle, status:record.status, riskLevel:record.riskLevel, jurisdiction:record.jurisdiction, updatedAt:record.updatedAt, createdAt:record.createdAt }; }
