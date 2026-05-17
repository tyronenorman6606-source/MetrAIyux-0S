import { handleActionRequest } from '../../src/server/router.mjs';
import { prepareGateAuthenticatedEvent } from '../../src/server/gate-auth.mjs';
import { buildRuntimeContext } from '../../src/server/runtime-context.mjs';

export async function handler(event, context = {}){
  const query = event.queryStringParameters || {};
  const allowPublic = event.httpMethod === 'GET' && !query.state && !query.queue;
  const gated = await prepareGateAuthenticatedEvent(event, process.env, { allowPublic });
  if(!gated.ok) return gated.response;
  const runtime = buildRuntimeContext(process.env, context);
  return handleActionRequest(
    { method:gated.event.httpMethod, headers:gated.event.headers, body:gated.event.body || '', query:gated.event.queryStringParameters || {} },
    { store:runtime.store, stateStore:runtime.stateStore, eventLedger:runtime.eventLedger, webhookOutbox:runtime.webhookOutbox, env:process.env }
  );
}
