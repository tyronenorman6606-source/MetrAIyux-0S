import fs from 'node:fs/promises';
import path from 'node:path';
import { PlatformDbAdapter } from './db-adapters.mjs';

export const RUNTIME_ADAPTER_VERSION = '22.0.0';

function nowIso(){ return new Date().toISOString(); }
function clone(value){ return JSON.parse(JSON.stringify(value)); }
async function ensureDir(dir){ await fs.mkdir(dir, { recursive:true }); }

const EMPTY_DB = {
  version:RUNTIME_ADAPTER_VERSION,
  created_at:'',
  updated_at:'',
  actions:{},
  events:[],
  state:null,
  leads:{},
  owner_contacts:{},
  suppression_drafts:{},
  delivery_receipts:[]
};

export class JsonPlatformAdapter extends PlatformDbAdapter {
  constructor(file = process.env.PHX_RUNTIME_DB_FILE || path.join(process.cwd(), '.phx-runtime', 'platform-db.json')){
    super();
    this.file = file;
  }
  async readDb(){
    try{
      const body = await fs.readFile(this.file, 'utf8');
      return { ...clone(EMPTY_DB), ...JSON.parse(body) };
    }catch(error){
      if(error.code !== 'ENOENT') throw error;
      const created = { ...clone(EMPTY_DB), created_at:nowIso(), updated_at:nowIso() };
      await this.writeDb(created);
      return created;
    }
  }
  async writeDb(db){
    await ensureDir(path.dirname(this.file));
    const next = { ...clone(db), version:RUNTIME_ADAPTER_VERSION, updated_at:nowIso() };
    await fs.writeFile(this.file, JSON.stringify(next, null, 2));
    return clone(next);
  }
  async putAction(envelope){
    const db = await this.readDb();
    if(db.actions[envelope.action_id]) return { stored:false, duplicate:true, envelope:clone(db.actions[envelope.action_id]) };
    db.actions[envelope.action_id] = clone(envelope);
    await this.writeDb(db);
    return { stored:true, duplicate:false, envelope:clone(envelope) };
  }
  async getAction(action_id){
    const db = await this.readDb();
    return db.actions[action_id] ? clone(db.actions[action_id]) : null;
  }
  async listActions(filter = {}){
    const db = await this.readDb();
    let rows = Object.values(db.actions || {});
    if(filter.queue) rows = rows.filter(row => row.queue === filter.queue);
    if(filter.status) rows = rows.filter(row => row.status === filter.status);
    return clone(rows.sort((a,b)=>String(a.created_at || '').localeCompare(String(b.created_at || ''))));
  }
  async putState(state){
    const db = await this.readDb();
    db.state = clone(state);
    await this.writeDb(db);
    return clone(db.state);
  }
  async getState(){
    const db = await this.readDb();
    return db.state ? clone(db.state) : null;
  }
  async appendEvent(event){
    const db = await this.readDb();
    const row = { created_at:nowIso(), ...clone(event) };
    db.events.push(row);
    await this.writeDb(db);
    return clone(row);
  }
  async listEvents(filter = {}){
    const db = await this.readDb();
    let rows = db.events || [];
    if(filter.action_id) rows = rows.filter(row => row.action_id === filter.action_id);
    if(filter.event_type) rows = rows.filter(row => row.event_type === filter.event_type);
    return clone(rows);
  }
  async appendDeliveryReceipt(receipt){
    const db = await this.readDb();
    const row = { created_at:nowIso(), ...clone(receipt) };
    db.delivery_receipts.push(row);
    await this.writeDb(db);
    return clone(row);
  }
  async summary(){
    const db = await this.readDb();
    return {
      adapter:'json',
      version:RUNTIME_ADAPTER_VERSION,
      file:this.file,
      counts:{
        actions:Object.keys(db.actions || {}).length,
        events:(db.events || []).length,
        delivery_receipts:(db.delivery_receipts || []).length,
        has_state:Boolean(db.state)
      },
      updated_at:db.updated_at
    };
  }
}

export class D1PlatformAdapter extends PlatformDbAdapter {
  constructor(db){
    super();
    if(!db?.prepare) throw new Error('D1PlatformAdapter requires a Cloudflare D1 binding with prepare().');
    this.db = db;
  }
  async putAction(envelope){
    const existing = await this.getAction(envelope.action_id);
    if(existing) return { stored:false, duplicate:true, envelope:existing };
    await this.db.prepare(`INSERT INTO phx_actions (action_id, action_type, queue, status, actor_id, actor_email, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(envelope.action_id, envelope.action_type, envelope.queue, envelope.status || 'queued_for_review', envelope.actor?.id || '', envelope.actor?.email || '', JSON.stringify(envelope), envelope.created_at || nowIso(), nowIso())
      .run();
    return { stored:true, duplicate:false, envelope:clone(envelope) };
  }
  async getAction(action_id){
    const row = await this.db.prepare(`SELECT payload_json FROM phx_actions WHERE action_id = ?`).bind(action_id).first();
    return row?.payload_json ? JSON.parse(row.payload_json) : null;
  }
  async listActions(filter = {}){
    const clauses = [];
    const binds = [];
    if(filter.queue){ clauses.push('queue = ?'); binds.push(filter.queue); }
    if(filter.status){ clauses.push('status = ?'); binds.push(filter.status); }
    const sql = `SELECT payload_json FROM phx_actions${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at ASC`;
    const result = await this.db.prepare(sql).bind(...binds).all();
    return (result.results || []).map(row => JSON.parse(row.payload_json));
  }
  async putState(state){
    await this.db.prepare(`INSERT INTO phx_listing_state (business_id, claim_status, verification_status, ae_stage, suppression_status, state_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(business_id) DO UPDATE SET claim_status = excluded.claim_status, verification_status = excluded.verification_status, ae_stage = excluded.ae_stage, suppression_status = excluded.suppression_status, state_json = excluded.state_json, updated_at = excluded.updated_at`)
      .bind('__runtime_state__', '', '', '', '', JSON.stringify(state), nowIso())
      .run();
    return clone(state);
  }
  async getState(){
    const row = await this.db.prepare(`SELECT state_json FROM phx_listing_state WHERE business_id = ?`).bind('__runtime_state__').first();
    return row?.state_json ? JSON.parse(row.state_json) : null;
  }
  async appendEvent(event){
    const row = { event_id:event.event_id || `${event.event_type || 'event'}-${Date.now()}`, event_type:event.event_type || 'runtime.event', ...event, created_at:event.created_at || nowIso() };
    await this.db.prepare(`INSERT INTO phx_action_events (event_id, action_id, event_type, decision, reviewer, event_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(row.event_id, row.action_id || '', row.event_type, row.decision || '', row.reviewer || '', JSON.stringify(row), row.created_at)
      .run();
    return row;
  }
  async listEvents(filter = {}){
    const clauses = [];
    const binds = [];
    if(filter.action_id){ clauses.push('action_id = ?'); binds.push(filter.action_id); }
    if(filter.event_type){ clauses.push('event_type = ?'); binds.push(filter.event_type); }
    const sql = `SELECT event_json FROM phx_action_events${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at ASC`;
    const result = await this.db.prepare(sql).bind(...binds).all();
    return (result.results || []).map(row => JSON.parse(row.event_json));
  }
  async listEvents(filter = {}){
    const clauses = [], params = [];
    if(filter.action_id){ params.push(filter.action_id); clauses.push(`action_id = $${params.length}`); }
    if(filter.event_type){ params.push(filter.event_type); clauses.push(`event_type = $${params.length}`); }
    const sql = `SELECT event_json FROM phx_action_events${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at ASC`;
    const result = await this.query(sql, params);
    return this.rows(result).map(row => typeof row.event_json === 'string' ? JSON.parse(row.event_json) : row.event_json);
  }
  async appendDeliveryReceipt(receipt){
    return this.appendEvent({ event_type:'notification.delivery_receipt', ...receipt });
  }
  async summary(){
    const actions = await this.db.prepare(`SELECT COUNT(*) AS count FROM phx_actions`).first();
    const events = await this.db.prepare(`SELECT COUNT(*) AS count FROM phx_action_events`).first();
    return { adapter:'d1', version:RUNTIME_ADAPTER_VERSION, counts:{ actions:Number(actions?.count || 0), events:Number(events?.count || 0) }, updated_at:nowIso() };
  }
}


export class NeonPlatformAdapter extends PlatformDbAdapter {
  constructor(client){
    super();
    if(!client) throw new Error('NeonPlatformAdapter requires an injected Neon/pg client. Pass a neon sql function, pg Pool, or client with query().');
    this.client = client;
  }
  async query(sql, params = []){
    if(typeof this.client === 'function') return this.client(sql, params);
    if(typeof this.client.query === 'function') return this.client.query(sql, params);
    throw new Error('Unsupported Neon client. Expected function(sql, params) or query(sql, params).');
  }
  rows(result){ return Array.isArray(result) ? result : (result?.rows || result?.results || []); }
  async putAction(envelope){
    const existing = await this.getAction(envelope.action_id);
    if(existing) return { stored:false, duplicate:true, envelope:existing };
    await this.query(`INSERT INTO phx_actions (action_id, action_type, queue, status, actor_id, actor_email, payload_json, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [envelope.action_id, envelope.action_type, envelope.queue, envelope.status || 'queued_for_review', envelope.actor?.id || '', envelope.actor?.email || '', JSON.stringify(envelope), envelope.created_at || nowIso(), nowIso()]);
    return { stored:true, duplicate:false, envelope:clone(envelope) };
  }
  async getAction(action_id){
    const result = await this.query(`SELECT payload_json FROM phx_actions WHERE action_id = $1`, [action_id]);
    const row = this.rows(result)[0];
    return row?.payload_json ? (typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json) : null;
  }
  async listActions(filter = {}){
    const clauses = [], params = [];
    if(filter.queue){ params.push(filter.queue); clauses.push(`queue = $${params.length}`); }
    if(filter.status){ params.push(filter.status); clauses.push(`status = $${params.length}`); }
    const sql = `SELECT payload_json FROM phx_actions${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at ASC`;
    const result = await this.query(sql, params);
    return this.rows(result).map(row => typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json);
  }
  async putState(state){
    await this.query(`INSERT INTO phx_listing_state (business_id, claim_status, verification_status, ae_stage, suppression_status, state_json, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (business_id) DO UPDATE SET claim_status = EXCLUDED.claim_status, verification_status = EXCLUDED.verification_status, ae_stage = EXCLUDED.ae_stage, suppression_status = EXCLUDED.suppression_status, state_json = EXCLUDED.state_json, updated_at = EXCLUDED.updated_at`, ['__runtime_state__','','','','',JSON.stringify(state),nowIso()]);
    return clone(state);
  }
  async getState(){
    const result = await this.query(`SELECT state_json FROM phx_listing_state WHERE business_id = $1`, ['__runtime_state__']);
    const row = this.rows(result)[0];
    return row?.state_json ? (typeof row.state_json === 'string' ? JSON.parse(row.state_json) : row.state_json) : null;
  }
  async appendEvent(event){
    const row = { event_id:event.event_id || `${event.event_type || 'event'}-${Date.now()}`, event_type:event.event_type || 'runtime.event', ...event, created_at:event.created_at || nowIso() };
    await this.query(`INSERT INTO phx_action_events (event_id, action_id, event_type, decision, reviewer, event_json, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [row.event_id, row.action_id || '', row.event_type, row.decision || '', row.reviewer || '', JSON.stringify(row), row.created_at]);
    return row;
  }
  async listEvents(filter = {}){
    const clauses = [], params = [];
    if(filter.action_id){ params.push(filter.action_id); clauses.push(`action_id = $${params.length}`); }
    if(filter.event_type){ params.push(filter.event_type); clauses.push(`event_type = $${params.length}`); }
    const sql = `SELECT event_json FROM phx_action_events${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at ASC`;
    const result = await this.query(sql, params);
    return this.rows(result).map(row => typeof row.event_json === 'string' ? JSON.parse(row.event_json) : row.event_json);
  }
  async appendDeliveryReceipt(receipt){
    return this.appendEvent({ event_type:'notification.delivery_receipt', ...receipt });
  }
  async summary(){
    const actions = this.rows(await this.query(`SELECT COUNT(*)::int AS count FROM phx_actions`, []))[0]?.count || 0;
    const events = this.rows(await this.query(`SELECT COUNT(*)::int AS count FROM phx_action_events`, []))[0]?.count || 0;
    return { adapter:'neon', version:RUNTIME_ADAPTER_VERSION, counts:{ actions:Number(actions), events:Number(events) }, updated_at:nowIso() };
  }
}

export class AdapterActionStore {
  constructor(adapter){ this.adapter = adapter; }
  async put(envelope){ return this.adapter.putAction(envelope); }
  async findById(action_id){ return this.adapter.getAction(action_id); }
  async list(queue){ return this.adapter.listActions(queue ? { queue } : {}); }
  async listAll(){ return this.adapter.listActions({}); }
  async listQueues(){
    const rows = await this.listAll();
    return Array.from(new Set(rows.map(row => row.queue).filter(Boolean))).sort();
  }
}

export class AdapterStateStore {
  constructor(adapter, fallbackStateStore){ this.adapter = adapter; this.fallbackStateStore = fallbackStateStore; }
  async read(){ return await this.adapter.getState() || await this.fallbackStateStore.read(); }
  async write(state){ return this.adapter.putState(state); }
  async appendEvent(event){ return this.adapter.appendEvent({ event_type:'state.event', ...event }); }
  async summary(){
    const state = await this.read();
    return this.fallbackStateStore.constructor.name === 'MemoryPlatformStateStore'
      ? { adapter:'adapter', counts:{ events:(state.events || []).length }, updated_at:state.updated_at || '' }
      : this.fallbackStateStore.summary();
  }
  async applyAction(envelope, opts = {}){
    const originalRead = this.fallbackStateStore.read.bind(this.fallbackStateStore);
    const originalWrite = this.fallbackStateStore.write.bind(this.fallbackStateStore);
    this.fallbackStateStore.read = async () => await this.adapter.getState() || await originalRead();
    this.fallbackStateStore.write = async (state) => this.write(state);
    try{
      return await this.fallbackStateStore.applyAction(envelope, opts);
    }finally{
      this.fallbackStateStore.read = originalRead;
      this.fallbackStateStore.write = originalWrite;
    }
  }
}

export function createRuntimeAdapter(env = process.env, bindings = {}){
  const driver = String(env.PHX_DB_DRIVER || env.PHX_RUNTIME_DRIVER || 'json').toLowerCase();
  if(driver === 'd1') return new D1PlatformAdapter(bindings.DB || bindings.PHX_DB || env.PHX_D1_DB);
  if(driver === 'neon' || driver === 'postgres' || driver === 'postgresql') return new NeonPlatformAdapter(bindings.NEON || bindings.PHX_NEON || bindings.sql || bindings.db || env.PHX_NEON_CLIENT);
  if(driver === 'json' || driver === 'file') return new JsonPlatformAdapter(env.PHX_RUNTIME_DB_FILE);
  throw new Error(`Unsupported PHX runtime adapter driver: ${driver}`);
}
