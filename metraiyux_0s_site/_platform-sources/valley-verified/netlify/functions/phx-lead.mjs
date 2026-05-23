import { routeLeadForApi, buildQuoteRequestAction, buildLeadRouteDecisionAction, leadRoutingServiceForApi } from '../../src/server/lead-routing-service.mjs';
import { prepareGateAuthenticatedEvent } from '../../src/server/gate-auth.mjs';
import { actorFromHeaders, requireUpstreamActor } from '../../src/server/router.mjs';
import { buildRuntimeContext } from '../../src/server/runtime-context.mjs';

function json(statusCode, body){ return { statusCode, headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) }; }
function parseBody(body){ return typeof body === 'string' ? JSON.parse(body || '{}') : (body || {}); }

export async function handler(event, context = {}){
  try{
    if(event.httpMethod === 'GET') return json(200, { ok:true, service:leadRoutingServiceForApi() });
    if(event.httpMethod !== 'POST') return json(405, { ok:false, error:'Method not allowed' });
    const gated = await prepareGateAuthenticatedEvent(event, process.env);
    if(!gated.ok) return gated.response;
    const actor = actorFromHeaders(gated.event.headers || {}, process.env);
    requireUpstreamActor(actor);
    const parsed = parseBody(gated.event.body);
    const operation = parsed.operation || event.queryStringParameters?.operation || 'route_quote';
    const runtime = buildRuntimeContext(process.env, context);
    const store = runtime.store;
    if(operation === 'quote_request'){
      const action = buildQuoteRequestAction({ ...parsed.payload, actor, source:'phx-lead:function' });
      const result = await store.put(action);
      return json(result.duplicate ? 200 : 202, { ok:true, duplicate:result.duplicate, action:result.envelope });
    }
    if(operation === 'route_quote'){
      const route = await routeLeadForApi(parsed.payload || {}, { businessLimit:parsed.business_limit || 0 });
      const quote = buildQuoteRequestAction({ ...parsed.payload, lead_id:route.lead_id, actor, source:'phx-lead:function' });
      const decision = buildLeadRouteDecisionAction({ ...route.decision, actor, source:'phx-lead:function' });
      const quoteResult = await store.put(quote);
      const decisionResult = await store.put(decision);
      return json(202, { ok:true, route, quote_action:quoteResult.envelope, decision_action:decisionResult.envelope });
    }
    return json(400, { ok:false, error:`Unsupported lead operation: ${operation}` });
  }catch(error){
    const statusCode = error.status || (error instanceof SyntaxError ? 400 : 500);
    return json(statusCode, { ok:false, error:error.message, errors:error.errors || [] });
  }
}
