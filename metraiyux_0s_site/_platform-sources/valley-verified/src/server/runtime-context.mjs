import { FileActionStore } from './storage.mjs';
import { FilePlatformStateStore } from './state-store.mjs';
import { FileEventLedger } from './event-store.mjs';
import { FileWebhookOutbox } from './webhooks.mjs';
import { createRuntimeAdapter, AdapterActionStore, AdapterStateStore, JsonPlatformAdapter } from './adapter-runtime.mjs';

export const RUNTIME_CONTEXT_VERSION = '22.0.0';

function requestedDriver(env = {}){
  return String(env.PHX_DB_DRIVER || env.PHX_RUNTIME_DRIVER || 'json').toLowerCase();
}

export function buildRuntimeContext(env = process.env, bindings = {}, options = {}){
  const driver = requestedDriver(env);
  const fallbackActionStore = options.store || new FileActionStore(env.PHX_ACTION_STORE_DIR);
  const fallbackStateStore = options.stateStore || new FilePlatformStateStore(env.PHX_STATE_STORE_DIR);
  const eventLedger = options.eventLedger || new FileEventLedger(env.PHX_EVENT_LEDGER_DIR);
  const webhookOutbox = options.webhookOutbox || new FileWebhookOutbox(env.PHX_WEBHOOK_OUTBOX_DIR);

  try{
    const adapter = options.adapter || createRuntimeAdapter(env, bindings);
    return {
      version:RUNTIME_CONTEXT_VERSION,
      driver,
      adapter,
      store:new AdapterActionStore(adapter),
      stateStore:new AdapterStateStore(adapter, fallbackStateStore),
      eventLedger,
      webhookOutbox,
      fallback:{ store:fallbackActionStore, stateStore:fallbackStateStore },
      mode: adapter instanceof JsonPlatformAdapter ? 'file-backed-runtime' : 'database-backed-runtime'
    };
  }catch(error){
    if(options.strict || driver !== 'json') throw error;
    return {
      version:RUNTIME_CONTEXT_VERSION,
      driver:'file',
      adapter:null,
      store:fallbackActionStore,
      stateStore:fallbackStateStore,
      eventLedger,
      webhookOutbox,
      fallback:{ store:fallbackActionStore, stateStore:fallbackStateStore },
      mode:'file-fallback-runtime',
      warning:error.message
    };
  }
}

export async function runtimeContextSummary(context){
  const adapterSummary = context.adapter?.summary ? await context.adapter.summary() : null;
  const queues = context.store?.listQueues ? await context.store.listQueues() : [];
  const state = context.stateStore?.summary ? await context.stateStore.summary() : null;
  return { version:RUNTIME_CONTEXT_VERSION, driver:context.driver, mode:context.mode, adapter:adapterSummary, queue_count:queues.length, queues, state };
}
