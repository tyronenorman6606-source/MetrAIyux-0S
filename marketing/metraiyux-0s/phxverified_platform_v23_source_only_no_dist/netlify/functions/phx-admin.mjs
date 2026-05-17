import { handleAdminRequest } from '../../src/server/admin-api.mjs';
import { prepareGateAuthenticatedEvent } from '../../src/server/gate-auth.mjs';
import { buildRuntimeContext } from '../../src/server/runtime-context.mjs';

export async function handler(event, context = {}){
  const gated = await prepareGateAuthenticatedEvent(event, process.env);
  if(!gated.ok) return gated.response;
  const runtime = buildRuntimeContext(process.env, context);
  return handleAdminRequest(
    { method:gated.event.httpMethod, headers:gated.event.headers, body:gated.event.body || '', query:gated.event.queryStringParameters || {} },
    { store:runtime.store, stateStore:runtime.stateStore, eventLedger:runtime.eventLedger, webhookOutbox:runtime.webhookOutbox, env:process.env }
  );
}
