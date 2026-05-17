import { createExposureCheckoutSession, handlePaymentWebhook, paymentServiceForApi } from '../../src/server/payment-service.mjs';
import { prepareGateAuthenticatedEvent } from '../../src/server/gate-auth.mjs';
import { actorFromHeaders, requireUpstreamActor } from '../../src/server/router.mjs';
import { buildRuntimeContext } from '../../src/server/runtime-context.mjs';

function json(statusCode, body){ return { statusCode, headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) }; }
function parseBody(body){ return typeof body === 'string' ? JSON.parse(body || '{}') : (body || {}); }

export async function handler(event, context = {}){
  try{
    if(event.httpMethod === 'GET') return json(200, { ok:true, service:paymentServiceForApi() });
    if(event.httpMethod !== 'POST') return json(405, { ok:false, error:'Method not allowed' });
    const operation = event.queryStringParameters?.operation || '';
    const runtime = buildRuntimeContext(process.env, context);
    const store = runtime.store;
    if(operation === 'webhook'){
      const provider = event.queryStringParameters?.provider || process.env.PHX_PAYMENT_PROVIDER || 'dry-run';
      return json(202, await handlePaymentWebhook({ provider, rawBody:event.body || '', headers:event.headers || {}, source:'netlify:phx-payment' }, { store, env:process.env }));
    }
    const gated = await prepareGateAuthenticatedEvent(event, process.env);
    if(!gated.ok) return gated.response;
    const actor = actorFromHeaders(gated.event.headers || {}, process.env);
    requireUpstreamActor(actor);
    const parsed = parseBody(gated.event.body || '{}');
    if((parsed.operation || operation) === 'create_checkout_session'){
      const result = await createExposureCheckoutSession({ ...(parsed.payload || {}), actor, source:'netlify:phx-payment' }, { env:process.env });
      await store.put(result.exposure_order.action);
      return json(202, { ok:true, result });
    }
    return json(400, { ok:false, error:`Unsupported payment operation: ${parsed.operation || operation || '(missing)'}` });
  }catch(error){
    return json(error.status || (error instanceof SyntaxError ? 400 : 500), { ok:false, error:error.message, errors:error.errors || [] });
  }
}
