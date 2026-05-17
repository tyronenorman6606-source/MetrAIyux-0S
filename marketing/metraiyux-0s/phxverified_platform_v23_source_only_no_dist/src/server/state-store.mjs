import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_STATE = {
  version: '20.0.0',
  updated_at: '',
  claims: {},
  leads: {},
  quote_requests: {},
  lead_routes: {},
  listing_patches: {},
  suppression_drafts: {},
  ae_accounts: {},
  ae_assignments: {},
  sponsor_intents: {},
  payment_events: {},
  exposure_activations: {},
  contact_logs: {},
  owner_messages: {},
  notification_deliveries: {},
  revenue_attribution: {},
  review_decisions: {},
  events: []
};

function nowIso(){ return new Date().toISOString(); }
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function clean(value){ return String(value ?? '').trim(); }
function key(value){ return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'; }
function uniquePush(list, item){
  const serialized = JSON.stringify(item);
  if(!list.some(x => JSON.stringify(x) === serialized)) list.push(item);
  return list;
}

export class FilePlatformStateStore {
  constructor(root = process.env.PHX_STATE_STORE_DIR || path.join(process.cwd(), '.phx-state')){
    this.root = root;
    this.stateFile = path.join(root, 'platform-state.json');
    this.eventFile = path.join(root, 'events.jsonl');
  }
  async ensure(){ await fs.mkdir(this.root, { recursive:true }); }
  async read(){
    await this.ensure();
    try{
      const parsed = JSON.parse(await fs.readFile(this.stateFile, 'utf8'));
      return { ...clone(DEFAULT_STATE), ...parsed };
    }catch(error){
      if(error.code === 'ENOENT') return clone(DEFAULT_STATE);
      throw error;
    }
  }
  async write(state){
    await this.ensure();
    const body = { ...state, version:'20.0.0', updated_at:nowIso() };
    await fs.writeFile(this.stateFile, JSON.stringify(body, null, 2));
    return body;
  }
  async appendEvent(event){
    await this.ensure();
    await fs.appendFile(this.eventFile, JSON.stringify(event) + '\n');
  }
  async summary(){
    const state = await this.read();
    return summarizeState(state);
  }
  async applyAction(envelope, opts = {}){
    const reviewer = opts.reviewer || envelope.actor?.email || envelope.actor?.id || 'system';
    const decision = opts.decision || 'approved';
    const state = await this.read();
    const event = {
      event_id: `${envelope.action_id}-${Date.now()}`,
      action_id: envelope.action_id,
      action_type: envelope.action_type,
      decision,
      reviewer,
      created_at: nowIso(),
      source: opts.source || 'state-projector'
    };
    if(decision !== 'approved'){
      state.review_decisions[envelope.action_id] = { ...event, status:'not_applied', reason:opts.reason || 'Decision was not approved.' };
      state.events.push(event);
      await this.appendEvent(event);
      return this.write(state);
    }
    projectEnvelope(state, envelope, event);
    state.review_decisions[envelope.action_id] = { ...event, status:'applied' };
    state.events.push(event);
    await this.appendEvent(event);
    return this.write(state);
  }
}

export class MemoryPlatformStateStore {
  constructor(){ this.state = clone(DEFAULT_STATE); }
  async read(){ return clone(this.state); }
  async write(state){ this.state = { ...clone(state), version:'20.0.0', updated_at:nowIso() }; return clone(this.state); }
  async appendEvent(){}
  async summary(){ return summarizeState(this.state); }
  async applyAction(envelope, opts = {}){
    const store = new FilePlatformStateStore('__memory_unused__');
    store.read = async () => clone(this.state);
    store.write = async (state) => { this.state = { ...clone(state), version:'20.0.0', updated_at:nowIso() }; return clone(this.state); };
    store.appendEvent = async () => {};
    return store.applyAction(envelope, opts);
  }
}

function touchBusinessBucket(map, businessId){
  const id = key(businessId);
  if(!map[id]) map[id] = [];
  return { id, bucket:map[id] };
}

export function projectEnvelope(state, envelope, event){
  const p = envelope.payload || {};
  const businessId = p.business_id || p.businessId || p.listing_id || p.listingId;
  switch(envelope.action_type){
    case 'owner_claim': {
      const id = key(businessId);
      state.claims[id] = {
        ...(state.claims[id] || {}),
        business_id:id,
        claim_status:'submitted_for_review',
        claim_type:p.claim_type,
        owner_name:p.owner_name,
        owner_contact:p.owner_contact,
        proof_summary:p.proof_summary,
        latest_action_id:envelope.action_id,
        updated_at:event.created_at,
        history:[...(state.claims[id]?.history || []), event]
      };
      break;
    }
    case 'verification_decision':
    case 'claim_status_update': {
      const id = key(businessId);
      state.claims[id] = {
        ...(state.claims[id] || {}),
        business_id:id,
        claim_status:p.status || p.decision,
        verification_status:p.decision || p.status,
        evidence_summary:p.evidence_summary || p.notes || '',
        reviewer:p.reviewer || event.reviewer,
        expires_at:p.expires_at || '',
        latest_action_id:envelope.action_id,
        updated_at:event.created_at,
        history:[...(state.claims[id]?.history || []), event]
      };
      break;
    }

    case 'quote_request': {
      state.quote_requests[envelope.action_id] = {
        lead_id:envelope.action_id,
        quote_status:'new',
        buyer_name:p.buyer_name,
        buyer_contact:p.buyer_contact,
        city:p.city,
        category:p.category,
        service_lane:p.service_lane || '',
        details:p.details,
        budget:p.budget || '',
        timeline:p.timeline || '',
        business_ids:Array.isArray(p.business_ids) ? p.business_ids.map(key) : [],
        created_at:envelope.created_at,
        updated_at:event.created_at,
        history:[event]
      };
      state.leads[envelope.action_id] = {
        lead_id:envelope.action_id,
        lead_status:'new',
        buyer_name:p.buyer_name,
        buyer_contact:p.buyer_contact,
        city:p.city,
        category:p.category,
        details:p.details,
        business_ids:Array.isArray(p.business_ids) ? p.business_ids.map(key) : [],
        created_at:envelope.created_at,
        updated_at:event.created_at,
        history:[event]
      };
      break;
    }
    case 'lead_route_decision': {
      const id = p.lead_id || envelope.action_id;
      const routed = Array.isArray(p.business_ids) ? p.business_ids.map(key) : [];
      state.lead_routes[id] = {
        lead_id:id,
        business_ids:routed,
        route_reason:p.route_reason,
        assigned_to:p.assigned_to,
        city:p.city || '',
        category:p.category || '',
        score_summary:p.score_summary || '',
        sla:p.sla || '',
        notes:p.notes || '',
        action_id:envelope.action_id,
        updated_at:event.created_at,
        history:[...(state.lead_routes[id]?.history || []), event]
      };
      state.leads[id] = {
        ...(state.leads[id] || { lead_id:id }),
        lead_status:'routed',
        business_ids:routed,
        assigned_to:p.assigned_to,
        notes:p.notes || state.leads[id]?.notes || '',
        updated_at:event.created_at,
        history:[...(state.leads[id]?.history || []), event]
      };
      break;
    }
    case 'lead_request': {
      state.leads[envelope.action_id] = {
        lead_id:envelope.action_id,
        lead_status:'new',
        buyer_name:p.buyer_name,
        buyer_contact:p.buyer_contact,
        city:p.city,
        category:p.category,
        details:p.details,
        business_ids:Array.isArray(p.business_ids) ? p.business_ids.map(key) : [],
        created_at:envelope.created_at,
        updated_at:event.created_at,
        history:[event]
      };
      break;
    }
    case 'lead_status_update': {
      const id = p.lead_id || p.action_id || p.target_action_id;
      state.leads[id] = {
        ...(state.leads[id] || { lead_id:id }),
        lead_status:p.status,
        assigned_to:p.assigned_to || state.leads[id]?.assigned_to || '',
        notes:p.notes || '',
        updated_at:event.created_at,
        history:[...(state.leads[id]?.history || []), event]
      };
      break;
    }
    case 'profile_enrichment':
    case 'listing_admin_patch': {
      const { id, bucket } = touchBusinessBucket(state.listing_patches, businessId);
      uniquePush(bucket, { business_id:id, patch:p.patch || {}, reason:p.reason, source_url:p.source_url || '', operator_note:p.operator_note || '', action_id:envelope.action_id, created_at:event.created_at });
      break;
    }
    case 'suppression_request':
    case 'suppression_apply': {
      const id = key(businessId);
      state.suppression_drafts[id] = { business_id:id, reason:p.reason, evidence:p.evidence, identity_key:p.identity_key || '', source_hash:p.source_hash || '', action_id:envelope.action_id, created_at:event.created_at, status:'draft_for_seed_suppression' };
      break;
    }

    case 'ae_assignment': {
      const id = key(businessId);
      state.ae_assignments[id] = {
        business_id:id,
        assigned_to:p.assigned_to,
        territory:p.territory,
        stage:p.stage,
        priority:p.priority || 'normal',
        next_action:p.next_action,
        due_date:p.due_date || '',
        product:p.product || '',
        notes:p.notes || '',
        action_id:envelope.action_id,
        updated_at:event.created_at,
        history:[...(state.ae_assignments[id]?.history || []), event]
      };
      state.ae_accounts[id] = {
        ...(state.ae_accounts[id] || { business_id:id, notes:[] }),
        stage:p.stage,
        assigned_to:p.assigned_to,
        next_action:p.next_action,
        due_date:p.due_date || '',
        product:p.product || state.ae_accounts[id]?.product || '',
        updated_at:event.created_at,
        notes:[...(state.ae_accounts[id]?.notes || []), { note:p.notes || 'AE assignment', outcome:'assigned', action_id:envelope.action_id, created_at:event.created_at }]
      };
      break;
    }
    case 'ae_note':
    case 'ae_stage_update': {
      const id = key(businessId);
      state.ae_accounts[id] = {
        ...(state.ae_accounts[id] || { business_id:id, notes:[] }),
        stage:p.stage || state.ae_accounts[id]?.stage || 'working',
        next_action:p.next_action || state.ae_accounts[id]?.next_action || '',
        due_date:p.due_date || state.ae_accounts[id]?.due_date || '',
        product:p.product || state.ae_accounts[id]?.product || '',
        updated_at:event.created_at,
        notes:[...(state.ae_accounts[id]?.notes || []), { note:p.note || p.notes || '', outcome:p.outcome || '', action_id:envelope.action_id, created_at:event.created_at }]
      };
      break;
    }
    case 'sponsor_intent': {
      const id = key(businessId);
      state.sponsor_intents[id] = { business_id:id, product:p.product, tier:p.tier, buyer_contact:p.buyer_contact || p.owner_contact || '', budget:p.budget || '', status:'intent_received', action_id:envelope.action_id, created_at:event.created_at };
      break;
    }
    case 'payment_event': {
      const id = p.payment_order_id || envelope.action_id;
      state.payment_events[id] = {
        payment_order_id:id,
        provider:p.provider,
        provider_event_id:p.provider_event_id,
        provider_event_type:p.provider_event_type,
        payment_status:p.payment_status,
        exposure_order_id:p.exposure_order_id || '',
        business_id:key(p.business_id || ''),
        product:p.product || '',
        tier:p.tier || '',
        amount_paid_cents:Number(p.amount_paid_cents || 0),
        currency:p.currency || 'USD',
        raw_event_hash:p.raw_event_hash || '',
        status:p.payment_status === 'paid' ? 'paid_pending_admin_activation' : 'recorded_no_activation',
        action_id:envelope.action_id,
        updated_at:event.created_at,
        history:[...(state.payment_events[id]?.history || []), event]
      };
      if(p.business_id){
        const bid = key(p.business_id);
        state.sponsor_intents[bid] = { ...(state.sponsor_intents[bid] || { business_id:bid }), product:p.product || state.sponsor_intents[bid]?.product || '', tier:p.tier || state.sponsor_intents[bid]?.tier || '', status:p.payment_status === 'paid' ? 'paid_pending_admin_activation' : 'payment_recorded', payment_order_id:id, updated_at:event.created_at };
      }
      break;
    }
    case 'exposure_activation': {
      const id = key(businessId);
      state.exposure_activations[id] = { business_id:id, product:p.product, tier:p.tier, payment_order_id:p.payment_order_id, placement_status:p.placement_status, starts_at:p.starts_at || '', expires_at:p.expires_at || '', inventory_slot:p.inventory_slot || '', reviewer:p.reviewer || event.reviewer, notes:p.notes || '', action_id:envelope.action_id, updated_at:event.created_at, history:[...(state.exposure_activations[id]?.history || []), event] };
      state.sponsor_intents[id] = { ...(state.sponsor_intents[id] || { business_id:id }), product:p.product, tier:p.tier, payment_order_id:p.payment_order_id, status:`exposure_${p.placement_status}`, updated_at:event.created_at };
      break;
    }
    case 'owner_contact_log': {
      const { id, bucket } = touchBusinessBucket(state.contact_logs, businessId);
      uniquePush(bucket, { business_id:id, contact_channel:p.contact_channel, outcome:p.outcome, next_action:p.next_action, due_date:p.due_date || '', notes:p.notes || '', action_id:envelope.action_id, created_at:event.created_at });
      break;
    }

    case 'owner_message': {
      const { id, bucket } = touchBusinessBucket(state.owner_messages, businessId);
      uniquePush(bucket, { business_id:id, message_type:p.message_type, recipient:p.recipient, subject:p.subject || '', body:p.body, channel:p.channel, template_id:p.template_id || '', lead_id:p.lead_id || '', ae_id:p.ae_id || '', send_after:p.send_after || '', notes:p.notes || '', action_id:envelope.action_id, created_at:event.created_at, status:'draft_or_queued' });
      uniquePush(state.contact_logs[id] || (state.contact_logs[id] = []), { business_id:id, contact_channel:p.channel, outcome:'message_drafted', next_action:p.send_after ? `send_after:${p.send_after}` : 'review_and_send', due_date:p.send_after || '', notes:p.notes || p.subject || p.message_type, action_id:envelope.action_id, created_at:event.created_at });
      break;
    }
    case 'notification_delivery_event': {
      const id = p.target_id || envelope.action_id;
      state.notification_deliveries[id] = { target_id:id, channel:p.channel, delivery_status:p.delivery_status, provider:p.provider, business_id:key(p.business_id || ''), lead_id:p.lead_id || '', recipient:p.recipient || '', provider_message_id:p.provider_message_id || '', error:p.error || '', raw_event_hash:p.raw_event_hash || '', action_id:envelope.action_id, updated_at:event.created_at, history:[...(state.notification_deliveries[id]?.history || []), event] };
      break;
    }
    case 'revenue_attribution_event': {
      const id = `${p.event_type || 'revenue'}-${envelope.action_id}`;
      state.revenue_attribution[id] = { revenue_event_id:id, business_id:key(businessId), source:p.source, amount_cents:Number(p.amount_cents || 0), currency:p.currency || 'USD', event_type:p.event_type, ae_id:p.ae_id || '', product:p.product || '', tier:p.tier || '', payment_order_id:p.payment_order_id || '', lead_id:p.lead_id || '', notes:p.notes || '', action_id:envelope.action_id, updated_at:event.created_at, history:[...(state.revenue_attribution[id]?.history || []), event] };
      break;
    }
    case 'admin_review_decision': {
      state.review_decisions[p.target_action_id] = { ...event, target_action_id:p.target_action_id, status:p.decision, notes:p.notes || '' };
      break;
    }
    default:
      state.review_decisions[envelope.action_id] = { ...event, status:'stored_only', reason:`No projector for ${envelope.action_type}` };
  }
}

export function summarizeState(state){
  return {
    version:state.version || '17.0.0',
    updated_at:state.updated_at || '',
    counts:{
      claims:Object.keys(state.claims || {}).length,
      leads:Object.keys(state.leads || {}).length,
      quote_requests:Object.keys(state.quote_requests || {}).length,
      lead_routes:Object.keys(state.lead_routes || {}).length,
      listing_patch_businesses:Object.keys(state.listing_patches || {}).length,
      suppression_drafts:Object.keys(state.suppression_drafts || {}).length,
      ae_accounts:Object.keys(state.ae_accounts || {}).length,
      ae_assignments:Object.keys(state.ae_assignments || {}).length,
      sponsor_intents:Object.keys(state.sponsor_intents || {}).length,
      payment_events:Object.keys(state.payment_events || {}).length,
      exposure_activations:Object.keys(state.exposure_activations || {}).length,
      contact_log_businesses:Object.keys(state.contact_logs || {}).length,
      owner_message_businesses:Object.keys(state.owner_messages || {}).length,
      notification_deliveries:Object.keys(state.notification_deliveries || {}).length,
      revenue_attribution_events:Object.keys(state.revenue_attribution || {}).length,
      review_decisions:Object.keys(state.review_decisions || {}).length,
      events:(state.events || []).length
    }
  };
}
