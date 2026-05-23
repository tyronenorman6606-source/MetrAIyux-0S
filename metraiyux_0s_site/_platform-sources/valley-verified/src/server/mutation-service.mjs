import { createActionEnvelope } from './contracts.mjs';
import { requireActionPolicy } from './policy.mjs';
import { MemoryActionStore } from './storage.mjs';
import { MemoryPlatformStateStore } from './state-store.mjs';
import { MemoryEventLedger, replayQueuedActionsToState, listQueuedActions } from './event-store.mjs';
import { MemoryWebhookOutbox, createWebhookJob } from './webhooks.mjs';
import { BusinessIndex } from './business-index.mjs';

function isAdmin(actor = {}){
  if(actor.allowLocal) return true;
  return String(actor.roles || '').toLowerCase().split(/[|,\s]+/).includes('admin');
}
function requireAdmin(actor = {}){
  if(isAdmin(actor)) return;
  const error = new Error('Admin role required.');
  error.status = 403;
  throw error;
}

export class MutationService {
  constructor({ store = new MemoryActionStore(), stateStore = new MemoryPlatformStateStore(), eventLedger = new MemoryEventLedger(), webhookOutbox = new MemoryWebhookOutbox(), businessIndex = new BusinessIndex(), env = process.env } = {}){
    this.store = store;
    this.stateStore = stateStore;
    this.eventLedger = eventLedger;
    this.webhookOutbox = webhookOutbox;
    this.businessIndex = businessIndex;
    this.env = env;
  }
  async assertBusinessReferences(payload = {}){
    const ids = [];
    if(payload.business_id) ids.push(payload.business_id);
    if(Array.isArray(payload.business_ids)) ids.push(...payload.business_ids);
    for(const id of ids) await this.businessIndex.assert(id);
  }
  async submit({ type, payload = {}, actor = {}, source = 'api' }){
    const policy = requireActionPolicy({ type, payload, actor, source });
    await this.assertBusinessReferences(payload);
    const envelope = createActionEnvelope({ type, payload, actor, source });
    envelope.policy = { version:policy.policy_version, risk_score:policy.risk_score, risk_level:policy.risk_level, warnings:policy.warnings };
    const result = await this.store.put(envelope);
    await this.eventLedger.append(result.duplicate ? 'action.duplicate' : 'action.queued', { action_id:envelope.action_id, action_type:type, queue:envelope.queue, actor:envelope.actor, policy:envelope.policy });
    if(!result.duplicate){
      await this.webhookOutbox.enqueue(createWebhookJob({ event_type:'action.queued', action:envelope, payload:{ queue:envelope.queue, risk_level:envelope.policy.risk_level } }));
    }
    return { ...result, policy };
  }
  async findAction(action_id){
    if(typeof this.store.findById === 'function') return this.store.findById(action_id);
    const actions = await listQueuedActions(this.store);
    return actions.find(action => action.action_id === action_id) || null;
  }
  async approve({ action_id, envelope, reviewer = {}, reason = 'approved' } = {}){
    requireAdmin(reviewer);
    const action = envelope || await this.findAction(action_id);
    if(!action){ const error = new Error(`Queued action not found: ${action_id}`); error.status = 404; throw error; }
    const state = await this.stateStore.applyAction(action, { reviewer:reviewer.email || reviewer.id || 'admin', decision:'approved', reason, source:'mutation-service' });
    await this.eventLedger.append('action.approved', { action_id:action.action_id, action_type:action.action_type, reviewer:{ id:reviewer.id || '', email:reviewer.email || '' }, reason });
    await this.webhookOutbox.enqueue(createWebhookJob({ event_type:'action.approved', action, payload:{ reason } }));
    return { action, state:await this.stateStore.summary(), snapshot:state };
  }
  async reject({ action_id, envelope, reviewer = {}, reason = 'rejected' } = {}){
    requireAdmin(reviewer);
    const action = envelope || await this.findAction(action_id);
    if(!action){ const error = new Error(`Queued action not found: ${action_id}`); error.status = 404; throw error; }
    const state = await this.stateStore.applyAction(action, { reviewer:reviewer.email || reviewer.id || 'admin', decision:'rejected', reason, source:'mutation-service' });
    await this.eventLedger.append('action.rejected', { action_id:action.action_id, action_type:action.action_type, reviewer:{ id:reviewer.id || '', email:reviewer.email || '' }, reason });
    await this.webhookOutbox.enqueue(createWebhookJob({ event_type:'action.rejected', action, payload:{ reason } }));
    return { action, state:await this.stateStore.summary(), snapshot:state };
  }
  async replay({ reviewer = { id:'replay', email:'replay@local', roles:'admin', allowLocal:true }, decision = 'approved' } = {}){
    requireAdmin(reviewer);
    return replayQueuedActionsToState({ store:this.store, stateStore:this.stateStore, reviewer:reviewer.email || reviewer.id || 'replay', eventLedger:this.eventLedger, decision });
  }
  async queueSummary(){
    const actions = await listQueuedActions(this.store);
    const by_queue = {};
    for(const action of actions) by_queue[action.queue] = (by_queue[action.queue] || 0) + 1;
    return { total:actions.length, by_queue };
  }
}
