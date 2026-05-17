import { createActionEnvelope, listContracts } from './contracts.mjs';
import { FileActionStore } from './storage.mjs';
import { FilePlatformStateStore } from './state-store.mjs';
import { BusinessIndex } from './business-index.mjs';
import { requireActionPolicy } from './policy.mjs';
import { FileEventLedger } from './event-store.mjs';
import { FileWebhookOutbox, createWebhookJob } from './webhooks.mjs';

function header(headers = {}, name){
  const lower = name.toLowerCase();
  for(const [key, value] of Object.entries(headers || {})) if(key.toLowerCase() === lower) return value;
  return '';
}

function json(statusCode, body){
  return { statusCode, headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) };
}

function truthy(value){ return ['1','true','yes','y'].includes(String(value || '').toLowerCase()); }

export function actorFromHeaders(headers = {}, env = process.env){
  return {
    id: header(headers, 'x-upstream-user-id'),
    email: header(headers, 'x-upstream-user-email'),
    roles: header(headers, 'x-upstream-roles'),
    allowLocal: env.ALLOW_LOCAL_ACTIONS === 'true'
  };
}

export function requireUpstreamActor(actor){
  if(actor.allowLocal) return;
  if(!actor.id && !actor.email){
    const error = new Error('Missing upstream auth identity. Provide x-upstream-user-id or x-upstream-user-email from the upstream auth gateway.');
    error.status = 401;
    throw error;
  }
}

function requireAdmin(actor){
  const roles = String(actor.roles || '').toLowerCase().split(/[|,\s]+/).filter(Boolean);
  if(actor.allowLocal || roles.includes('admin')) return;
  const error = new Error('Admin role required for state projection or review decisions.');
  error.status = 403;
  throw error;
}

async function assertBusinessReferences(payload, businessIndex){
  const ids = [];
  if(payload?.business_id) ids.push(payload.business_id);
  if(Array.isArray(payload?.business_ids)) ids.push(...payload.business_ids);
  for(const id of ids) await businessIndex.assert(id);
}

export async function handleActionRequest({ method = 'GET', headers = {}, body = '', query = {} }, { store = new FileActionStore(), stateStore = new FilePlatformStateStore(), businessIndex = new BusinessIndex(), eventLedger = new FileEventLedger(), webhookOutbox = new FileWebhookOutbox(), env = process.env } = {}){
  if(method === 'GET'){
    if(query.state === 'summary') return json(200, { ok:true, state:await stateStore.summary() });
    if(query.queue && typeof store.list === 'function') return json(200, { ok:true, queue:query.queue, records:await store.list(query.queue) });
    return json(200, { ok:true, contracts:listContracts(), runtime:{ queues:true, state_projection:true, idempotency:'action_id', upstream_auth_headers:['x-upstream-user-id','x-upstream-user-email','x-upstream-roles'] } });
  }
  if(method !== 'POST') return json(405, { ok:false, error:'Method not allowed' });
  try{
    const actor = actorFromHeaders(headers, env);
    requireUpstreamActor(actor);
    const parsed = typeof body === 'string' ? JSON.parse(body || '{}') : body;
    const type = parsed.type || query.type;
    const payload = parsed.payload || parsed;
    const policy = requireActionPolicy({ type, payload, actor, source:parsed.source || 'api' });
    await assertBusinessReferences(payload, businessIndex);
    const envelope = createActionEnvelope({ type, payload, actor, source:parsed.source || 'api' });
    envelope.policy = { version:policy.policy_version, risk_score:policy.risk_score, risk_level:policy.risk_level, warnings:policy.warnings };
    const result = await store.put(envelope);
    if(eventLedger?.append) await eventLedger.append(result.duplicate ? 'action.duplicate' : 'action.queued', { action_id:result.envelope.action_id, action_type:result.envelope.action_type, queue:result.envelope.queue, policy:result.envelope.policy });
    if(webhookOutbox?.enqueue && !result.duplicate) await webhookOutbox.enqueue(createWebhookJob({ event_type:'action.queued', action:result.envelope, payload:{ queue:result.envelope.queue, risk_level:result.envelope.policy?.risk_level || 'unknown' } }));
    let projected = null;
    const shouldProject = truthy(parsed.apply) || truthy(query.apply) || env.PHX_AUTO_PROJECT_ACTIONS === 'true';
    if(shouldProject){
      requireAdmin(actor);
      projected = await stateStore.applyAction(result.envelope, { reviewer:actor.email || actor.id || 'admin', decision:parsed.decision || 'approved', source:'phx-action' });
      if(eventLedger?.append) await eventLedger.append('action.projected', { action_id:result.envelope.action_id, action_type:result.envelope.action_type, decision:parsed.decision || 'approved' });
      if(webhookOutbox?.enqueue) await webhookOutbox.enqueue(createWebhookJob({ event_type:'action.projected', action:result.envelope, payload:{ decision:parsed.decision || 'approved' } }));
    }
    return json(result.duplicate ? 200 : 202, { ok:true, duplicate:result.duplicate, action:result.envelope, projected:projected ? await stateStore.summary() : null });
  }catch(error){
    const statusCode = error.status || (error instanceof SyntaxError ? 400 : 500);
    return json(statusCode, { ok:false, error:error.message, errors:error.errors || [] });
  }
}
