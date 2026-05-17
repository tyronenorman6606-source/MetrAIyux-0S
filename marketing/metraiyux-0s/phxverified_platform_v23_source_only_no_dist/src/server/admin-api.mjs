import { actorFromHeaders, requireUpstreamActor } from './router.mjs';
import { FileActionStore } from './storage.mjs';
import { FilePlatformStateStore } from './state-store.mjs';
import { FileEventLedger } from './event-store.mjs';
import { FileWebhookOutbox } from './webhooks.mjs';
import { MutationService } from './mutation-service.mjs';
import { runtimeStateToAdminChangeSet, changeSetCsv } from './exporters.mjs';
import { processWebhookOutbox } from './notification-service.mjs';
import { buildExposureOrder, exposureCatalogForApi } from './exposure-service.mjs';
import { createExposureCheckoutSession, paymentServiceForApi } from './payment-service.mjs';
import { routeLeadForApi, buildQuoteRequestAction, buildLeadRouteDecisionAction, leadRoutingServiceForApi } from './lead-routing-service.mjs';
import { buildOwnerMessageAction, ownerMessagingServiceForApi } from './owner-messaging-service.mjs';
import { revenueAttributionServiceForApi } from './revenue-attribution-service.mjs';

function json(statusCode, body){ return { statusCode, headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) }; }
function isAdmin(actor = {}){ return actor.allowLocal || String(actor.roles || '').toLowerCase().split(/[|,\s]+/).includes('admin'); }
function requireAdmin(actor){ if(isAdmin(actor)) return; const error = new Error('Admin role required.'); error.status = 403; throw error; }
function parseBody(body){ return typeof body === 'string' ? JSON.parse(body || '{}') : (body || {}); }

export async function handleAdminRequest({ method = 'GET', headers = {}, body = '', query = {} }, { env = process.env, store = new FileActionStore(), stateStore = new FilePlatformStateStore(), eventLedger = new FileEventLedger(), webhookOutbox = new FileWebhookOutbox(), businessIndex } = {}){
  try{
    const actor = actorFromHeaders(headers, env);
    requireUpstreamActor(actor);
    const service = new MutationService({ store, stateStore, eventLedger, webhookOutbox, businessIndex, env });
    if(method === 'GET'){
      if(query.exposure_catalog) return json(200, { ok:true, catalog:exposureCatalogForApi() });
      if(query.payment_service) return json(200, { ok:true, service:paymentServiceForApi() });
      if(query.lead_routing_service) return json(200, { ok:true, service:leadRoutingServiceForApi() });
      if(query.owner_messaging_service) return json(200, { ok:true, service:ownerMessagingServiceForApi() });
      if(query.revenue_attribution_service) return json(200, { ok:true, service:revenueAttributionServiceForApi() });
      if(query.queue) return json(200, { ok:true, queue:query.queue, records:await store.list(query.queue) });
      if(query.state === 'summary') return json(200, { ok:true, state:await stateStore.summary() });
      if(query.outbox === 'summary') return json(200, { ok:true, jobs:await webhookOutbox.list() });
      requireAdmin(actor);
      return json(200, { ok:true, queues:await service.queueSummary(), state:await stateStore.summary(), operations:['approve_action','reject_action','replay_actions','export_change_set','process_outbox','create_exposure_order','create_checkout_session','create_quote_request','route_lead','draft_owner_message'] });
    }
    if(method !== 'POST') return json(405, { ok:false, error:'Method not allowed' });
    const parsed = parseBody(body);
    const operation = parsed.operation || query.operation;
    if(operation === 'create_checkout_session'){
      const result = await createExposureCheckoutSession({ ...parsed.payload, actor, source:parsed.source || 'admin-api' }, { env });
      const stored = await service.submit({ type:'sponsor_intent', payload:result.exposure_order.action.payload, actor, source:'admin-api:checkout' });
      return json(202, { ok:true, checkout:result, action:stored.envelope || stored.action });
    }
    if(operation === 'create_quote_request'){
      const action = buildQuoteRequestAction({ ...parsed.payload, actor, source:parsed.source || 'admin-api:quote' });
      const stored = await service.submit({ type:'quote_request', payload:action.payload, actor, source:'admin-api:quote' });
      return json(202, { ok:true, action:stored.envelope || stored.action });
    }
    if(operation === 'route_lead'){
      const route = await routeLeadForApi(parsed.payload || {}, { businessLimit:parsed.business_limit || 12 });
      const routeAction = buildLeadRouteDecisionAction({ ...route.decision, actor, source:parsed.source || 'admin-api:lead-route' });
      const stored = await service.submit({ type:'lead_route_decision', payload:routeAction.payload, actor, source:'admin-api:lead-route' });
      return json(202, { ok:true, route, action:stored.envelope || stored.action });
    }
    if(operation === 'draft_owner_message'){
      const action = buildOwnerMessageAction({ ...parsed.payload, actor, source:parsed.source || 'admin-api:owner-message' });
      const stored = await service.submit({ type:'owner_message', payload:action.payload, actor, source:'admin-api:owner-message' });
      return json(202, { ok:true, message:action.payload, action:stored.envelope || stored.action });
    }
    if(operation === 'create_exposure_order'){
      const result = buildExposureOrder({ ...parsed.payload, actor, source:parsed.source || 'admin-api' });
      const stored = await service.submit({ type:'sponsor_intent', payload:result.order.action.payload, actor, source:'admin-api' });
      return json(202, { ok:true, order:result.order, action:stored.envelope || stored.action, policy:result.policy });
    }
    requireAdmin(actor);
    if(operation === 'approve_action') return json(200, { ok:true, result:await service.approve({ action_id:parsed.action_id, reviewer:actor, reason:parsed.reason || 'approved via admin API' }) });
    if(operation === 'reject_action') return json(200, { ok:true, result:await service.reject({ action_id:parsed.action_id, reviewer:actor, reason:parsed.reason || 'rejected via admin API' }) });
    if(operation === 'replay_actions') return json(200, { ok:true, result:await service.replay({ reviewer:actor, decision:parsed.decision || 'approved' }) });
    if(operation === 'export_change_set'){ const changeSet = runtimeStateToAdminChangeSet(await stateStore.read()); return json(200, { ok:true, result:{ change_set:changeSet, csv:changeSetCsv(changeSet) } }); }
    if(operation === 'process_outbox') return json(200, { ok:true, result:await processWebhookOutbox(webhookOutbox, { dryRun:parsed.dry_run !== false, env }) });
    return json(400, { ok:false, error:`Unsupported admin operation: ${operation || '(missing)'}` });
  }catch(error){
    const statusCode = error.status || (error instanceof SyntaxError ? 400 : 500);
    return json(statusCode, { ok:false, error:error.message, errors:error.errors || [] });
  }
}
