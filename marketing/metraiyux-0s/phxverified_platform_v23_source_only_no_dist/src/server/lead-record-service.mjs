import { createActionEnvelope } from './contracts.mjs';

export const LEAD_RECORD_SERVICE_VERSION = '21.0.0';
const STATUSES = ['new','qualified','routed','owner_contact_pending','owner_contacted','won','lost','archived'];
function nowIso(){ return new Date().toISOString(); }
function clean(v){ return String(v ?? '').trim(); }
function leadId(payload = {}){ return clean(payload.lead_id) || `lead-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

export function createQuoteLeadRecord(payload = {}, actor = {}){
  const id = leadId(payload);
  return {
    lead_id:id,
    status:'new',
    buyer_name:clean(payload.buyer_name),
    buyer_contact:clean(payload.buyer_contact),
    city:clean(payload.city),
    category:clean(payload.category),
    details:clean(payload.details),
    business_ids:Array.isArray(payload.business_ids) ? payload.business_ids : [],
    assigned_to:clean(payload.assigned_to),
    owner_contact_attempts:[],
    history:[{ status:'new', actor:actor.email || actor.id || 'system', at:nowIso(), note:'Lead record created.' }],
    created_at:nowIso(),
    updated_at:nowIso()
  };
}
export function transitionLead(record = {}, status, actor = {}, note = ''){
  if(!STATUSES.includes(status)) throw new Error(`Unsupported lead status: ${status}`);
  return { ...record, status, updated_at:nowIso(), history:[...(record.history || []), { status, actor:actor.email || actor.id || 'system', at:nowIso(), note:clean(note) }] };
}
export function assignLead(record = {}, assigned_to, actor = {}, note = ''){
  return { ...transitionLead(record, 'qualified', actor, note || `Assigned to ${assigned_to}`), assigned_to:clean(assigned_to) };
}
export function addOwnerContactAttempt(record = {}, attempt = {}, actor = {}){
  return { ...record, status:attempt.status || record.status || 'owner_contact_pending', owner_contact_attempts:[...(record.owner_contact_attempts || []), { channel:clean(attempt.channel), outcome:clean(attempt.outcome), business_id:clean(attempt.business_id), at:nowIso(), actor:actor.email || actor.id || 'system', notes:clean(attempt.notes) }], updated_at:nowIso() };
}
export function buildLeadStatusAction({ lead_id, status, assigned_to = '', notes = '', business_ids = [], actor = {} } = {}){
  return createActionEnvelope({ type:'lead_status_update', actor, payload:{ lead_id, status, assigned_to, notes, business_ids } });
}
export function leadRecordServiceForApi(){ return { version:LEAD_RECORD_SERVICE_VERSION, statuses:STATUSES, persistence:'runtime adapter phx_leads + action/event ledger', no_fake_delivery:true }; }
