import { buildOwnerClaimSubmission, claimSubmissionServiceForApi } from '../../src/server/claim-submission-service.mjs';
import { prepareGateAuthenticatedEvent } from '../../src/server/gate-auth.mjs';
import { actorFromHeaders, requireUpstreamActor } from '../../src/server/router.mjs';
import { buildRuntimeContext } from '../../src/server/runtime-context.mjs';

function json(statusCode, body){ return { statusCode, headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) }; }
export async function handler(event, context = {}){
  if(event.httpMethod === 'GET') return json(200, { ok:true, service:claimSubmissionServiceForApi() });
  try{
    const gated = await prepareGateAuthenticatedEvent(event, process.env);
    if(!gated.ok) return gated.response;
    const actor = actorFromHeaders(gated.event.headers || {}, process.env);
    requireUpstreamActor(actor);
    const body = JSON.parse(gated.event.body || '{}');
    const action = buildOwnerClaimSubmission({ ...(body.payload || body), actor });
    const runtime = buildRuntimeContext(process.env, context);
    const stored = await runtime.store.put(action);
    return json(stored.duplicate ? 200 : 202, { ok:true, duplicate:stored.duplicate, action:stored.envelope });
  }catch(error){
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    return json(status, { ok:false, error:error.message });
  }
}
