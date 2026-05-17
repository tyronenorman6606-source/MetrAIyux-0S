import { handleActionRequest } from '../../src/server/router.mjs';
import { buildRuntimeContext } from '../../src/server/runtime-context.mjs';

export async function handler(event, context = {}){
  const runtime = buildRuntimeContext(process.env, context);
  return handleActionRequest(
    { method:event.httpMethod, headers:event.headers, body:event.body || '', query:event.queryStringParameters || {} },
    { store:runtime.store, stateStore:runtime.stateStore, eventLedger:runtime.eventLedger, webhookOutbox:runtime.webhookOutbox, env:process.env }
  );
}
