import fs from 'node:fs/promises';
import path from 'node:path';
import { listContracts } from './contracts.mjs';

export const EVENT_LEDGER_VERSION = '18.0.0';

function nowIso(){ return new Date().toISOString(); }
function clone(value){ return JSON.parse(JSON.stringify(value)); }

export class FileEventLedger {
  constructor(root = process.env.PHX_EVENT_LEDGER_DIR || path.join(process.cwd(), '.phx-event-ledger')){
    this.root = root;
    this.eventsFile = path.join(root, 'events.jsonl');
    this.snapshotsDir = path.join(root, 'snapshots');
  }
  async ensure(){ await fs.mkdir(this.root, { recursive:true }); await fs.mkdir(this.snapshotsDir, { recursive:true }); }
  async append(event_type, payload = {}){
    await this.ensure();
    const event = { event_type, version:EVENT_LEDGER_VERSION, created_at:nowIso(), ...payload };
    await fs.appendFile(this.eventsFile, JSON.stringify(event) + '\n');
    return event;
  }
  async list(filter = {}){
    await this.ensure();
    let rows = [];
    try{
      const body = await fs.readFile(this.eventsFile, 'utf8');
      rows = body.trim() ? body.trim().split('\n').map(line => JSON.parse(line)) : [];
    }catch(error){
      if(error.code !== 'ENOENT') throw error;
    }
    if(filter.event_type) rows = rows.filter(row => row.event_type === filter.event_type);
    if(filter.action_id) rows = rows.filter(row => row.action_id === filter.action_id);
    return rows;
  }
  async snapshot(label, state){
    await this.ensure();
    const file = path.join(this.snapshotsDir, `${label}-${Date.now()}.json`);
    await fs.writeFile(file, JSON.stringify({ label, created_at:nowIso(), state }, null, 2));
    return file;
  }
}

export class MemoryEventLedger {
  constructor(){ this.events = []; this.snapshots = []; }
  async append(event_type, payload = {}){ const event = { event_type, version:EVENT_LEDGER_VERSION, created_at:nowIso(), ...clone(payload) }; this.events.push(event); return event; }
  async list(filter = {}){ let rows = [...this.events]; if(filter.event_type) rows = rows.filter(row => row.event_type === filter.event_type); if(filter.action_id) rows = rows.filter(row => row.action_id === filter.action_id); return rows; }
  async snapshot(label, state){ const snap = { label, created_at:nowIso(), state:clone(state) }; this.snapshots.push(snap); return label; }
}

export async function listQueuedActions(store){
  if(typeof store.listAll === 'function') return store.listAll();
  const contracts = listContracts();
  const rows = [];
  for(const contract of contracts){
    if(typeof store.list === 'function') rows.push(...await store.list(contract.queue));
  }
  return rows;
}

export async function replayQueuedActionsToState({ store, stateStore, reviewer = 'replay-system', eventLedger = new MemoryEventLedger(), decision = 'approved' } = {}){
  const actions = await listQueuedActions(store);
  const applied = [];
  const skipped = [];
  for(const action of actions){
    try{
      const state = await stateStore.applyAction(action, { reviewer, decision, source:'event-replay' });
      applied.push(action.action_id);
      await eventLedger.append('action.replayed', { action_id:action.action_id, action_type:action.action_type, decision });
      await eventLedger.snapshot('replay', state);
    }catch(error){
      skipped.push({ action_id:action.action_id, error:error.message });
      await eventLedger.append('action.replay_failed', { action_id:action.action_id, action_type:action.action_type, error:error.message });
    }
  }
  return { total:actions.length, applied, skipped };
}
