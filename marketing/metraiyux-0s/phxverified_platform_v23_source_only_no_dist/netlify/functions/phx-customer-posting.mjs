import { buildFirstMonthBusinessPosting, customerPostingEntitlementForApi } from '../../src/server/customer-posting-entitlement.mjs';
import { prepareGateAuthenticatedEvent } from '../../src/server/gate-auth.mjs';
import { actorFromHeaders, requireUpstreamActor } from '../../src/server/router.mjs';
import { buildRuntimeContext } from '../../src/server/runtime-context.mjs';

function json(statusCode, body){ return { statusCode, headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) }; }
function parseBody(body){ return typeof body === 'string' ? JSON.parse(body || '{}') : (body || {}); }

export async function handler(event, context = {}){
  if(event.httpMethod === 'GET') return json(200, { ok:true, service:customerPostingEntitlementForApi() });
  if(event.httpMethod !== 'POST') return json(405, { ok:false, error:'Method not allowed' });
  const gated = await prepareGateAuthenticatedEvent(event, process.env);
  if(!gated.ok) return gated.response;
  try{
    const actor = actorFromHeaders(gated.event.headers || {}, process.env);
    requireUpstreamActor(actor);
    const parsed = parseBody(gated.event.body || '{}');
    const action = buildFirstMonthBusinessPosting({ ...(parsed.payload || parsed), actor, now:parsed.now || undefined });
    const runtime = buildRuntimeContext(process.env, context);
    const stored = await runtime.store.put(action);
    return json(stored.duplicate ? 200 : 202, { ok:true, duplicate:stored.duplicate, entitlement:customerPostingEntitlementForApi(), action:stored.envelope });
  }catch(error){
    return json(error.status || (error instanceof SyntaxError ? 400 : 500), { ok:false, error:error.message, errors:error.errors || [], eligibility:error.eligibility || null });
  }
}
