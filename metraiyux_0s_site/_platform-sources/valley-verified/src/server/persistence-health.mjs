import { createActionEnvelope } from './contracts.mjs';
import { MemoryPlatformStateStore } from './state-store.mjs';
import { JsonPlatformAdapter, AdapterActionStore, AdapterStateStore, createRuntimeAdapter, D1PlatformAdapter, NeonPlatformAdapter } from './adapter-runtime.mjs';
import { platformD1Schema, neonSchema, PLATFORM_TABLES } from './db-adapters.mjs';

export const PERSISTENCE_HEALTH_VERSION = '22.0.0';

function now(){ return new Date().toISOString(); }

export async function adapterRoundTrip(adapter, business_id = 'v22-persistence-health-business'){
  const store = new AdapterActionStore(adapter);
  const stateStore = new AdapterStateStore(adapter, new MemoryPlatformStateStore());
  const action = createActionEnvelope({
    type:'owner_claim',
    payload:{ business_id, owner_name:'Persistence Health', owner_contact:'health@example.com', claim_type:'correction', proof_summary:'adapter round trip' },
    actor:{ id:'health-check', email:'health@example.com', roles:'admin', allowLocal:true },
    source:'persistence-health'
  });
  const put = await store.put(action);
  const again = await store.put(action);
  const read = await store.findById(action.action_id);
  await stateStore.applyAction(action, { reviewer:'health@example.com', decision:'approved', source:'persistence-health' });
  const state = await stateStore.read();
  const summary = adapter.summary ? await adapter.summary() : null;
  return {
    ok:Boolean(read && state.claims?.[business_id]),
    duplicate_guard:again.duplicate === true,
    action_id:action.action_id,
    claim_status:state.claims?.[business_id]?.claim_status || '',
    adapter_summary:summary,
    checked_at:now()
  };
}

export function persistenceReadinessModel(){
  return {
    version:PERSISTENCE_HEALTH_VERSION,
    adapters:['json','d1','neon'],
    required_tables:PLATFORM_TABLES.map(t => t.table),
    schema_exports:{ d1:'data/d1-schema.sql', neon:'data/neon-schema.sql' },
    runtime_factory:'src/server/runtime-context.mjs',
    required_round_trips:['put action','reject duplicate action_id','read action','project approved action','read state summary'],
    no_fake_persistence:true
  };
}

export function createAdapterFromEnv(env = process.env, bindings = {}){
  return createRuntimeAdapter(env, bindings);
}

export function schemaBundle(){
  return { version:PERSISTENCE_HEALTH_VERSION, tables:PLATFORM_TABLES, d1:platformD1Schema(), neon:neonSchema() };
}

export { JsonPlatformAdapter, D1PlatformAdapter, NeonPlatformAdapter };
