import { promises as fs } from 'node:fs';
import path from 'node:path';
import { JsonDataStore } from './data-store.mjs';
import { nowISO } from './ids.mjs';

class AdapterUnavailableError extends Error {
  constructor(adapter, message){ super(message); this.name = 'AdapterUnavailableError'; this.adapter = adapter; }
}

function envReady(required=[]){ return required.every(key => !!process.env[key]); }

export const STORAGE_ADAPTERS = Object.freeze({
  json:{id:'json', title:'JSON file store', durable:true, ready:true, implementation:'server/lib/data-store.mjs#JsonDataStore', requiredEnv:[]},
  sqlite:{id:'sqlite', title:'SQLite state store', durable:true, ready:envReady(['CODESTUDIO_SQLITE_PATH']), implementation:'server/lib/storage-adapters.mjs#SQLiteStateBackend', requiredEnv:['CODESTUDIO_SQLITE_PATH'], optionalDependency:'better-sqlite3'},
  postgres:{id:'postgres', title:'Postgres / Neon state store', durable:true, ready:envReady(['DATABASE_URL']), implementation:'server/lib/storage-adapters.mjs#PostgresStateBackend', requiredEnv:['DATABASE_URL'], optionalDependency:'pg'},
  d1:{id:'d1', title:'Cloudflare D1 state store', durable:true, ready:envReady(['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_D1_DATABASE_ID','CLOUDFLARE_API_TOKEN']), implementation:'server/lib/storage-adapters.mjs#D1StateBackend', requiredEnv:['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_D1_DATABASE_ID','CLOUDFLARE_API_TOKEN']},
});

export function storageAdapterCatalog(){
  return Object.values(STORAGE_ADAPTERS).map(adapter => ({
    ...adapter,
    ready: adapter.id === 'json' ? true : envReady(adapter.requiredEnv || []),
    missingEnv:(adapter.requiredEnv || []).filter(key => !process.env[key]),
  }));
}

class AdapterBackedDataStore extends JsonDataStore {
  constructor({root=process.cwd(), dir=process.env.CODESTUDIO_DATA_DIR || './data', backend, meta}={}){
    super({root, dir});
    this.backend = backend;
    this.adapter = meta;
  }
  async init(){
    await this.backend.init();
    const loaded = await this.backend.load();
    this.state = this.normalize(loaded || null);
    if (!loaded) await this.save();
    return this;
  }
  async save(){
    this.state.updatedAt = nowISO();
    await this.backend.save(this.state);
    return this.snapshot();
  }
}

export class SQLiteStateBackend {
  constructor({root=process.cwd(), file=process.env.CODESTUDIO_SQLITE_PATH || './data/codestudio-platform.sqlite'}={}){
    this.root = root;
    this.file = path.resolve(root, file);
    this.db = null;
  }
  async init(){
    await fs.mkdir(path.dirname(this.file), {recursive:true});
    let mod;
    try { mod = await import('better-sqlite3'); }
    catch(error){ throw new AdapterUnavailableError('sqlite', `SQLite adapter needs optional dependency better-sqlite3. Install it or use CODESTUDIO_STORAGE_ADAPTER=json. ${error.message}`); }
    const Database = mod.default || mod;
    this.db = new Database(this.file);
    this.db.pragma('journal_mode = WAL');
    this.db.exec('create table if not exists codestudio_state (key text primary key, value text not null, updated_at text not null)');
    return this;
  }
  async load(){
    const row = this.db.prepare('select value from codestudio_state where key = ?').get('platform_state');
    return row?.value ? JSON.parse(row.value) : null;
  }
  async save(state){
    const value = JSON.stringify(state, null, 2);
    this.db.prepare('insert into codestudio_state(key,value,updated_at) values(?,?,?) on conflict(key) do update set value=excluded.value, updated_at=excluded.updated_at').run('platform_state', value, nowISO());
    return {ok:true};
  }
}

export class PostgresStateBackend {
  constructor({connectionString=process.env.DATABASE_URL}={}){
    this.connectionString = connectionString;
    this.client = null;
  }
  async init(){
    if (!this.connectionString) throw new AdapterUnavailableError('postgres', 'DATABASE_URL is required for the Postgres/Neon storage adapter.');
    let pg;
    try { pg = await import('pg'); }
    catch(error){ throw new AdapterUnavailableError('postgres', `Postgres adapter needs optional dependency pg. npm install pg or use CODESTUDIO_STORAGE_ADAPTER=json. ${error.message}`); }
    const Client = pg.Client || pg.default?.Client;
    this.client = new Client({connectionString:this.connectionString});
    await this.client.connect();
    await this.client.query('create table if not exists codestudio_state (key text primary key, value jsonb not null, updated_at timestamptz not null default now())');
    return this;
  }
  async load(){
    const result = await this.client.query('select value from codestudio_state where key = $1', ['platform_state']);
    return result.rows?.[0]?.value || null;
  }
  async save(state){
    await this.client.query('insert into codestudio_state(key,value,updated_at) values($1,$2::jsonb,now()) on conflict(key) do update set value=excluded.value, updated_at=now()', ['platform_state', JSON.stringify(state)]);
    return {ok:true};
  }
}

export class D1StateBackend {
  constructor({accountId=process.env.CLOUDFLARE_ACCOUNT_ID, databaseId=process.env.CLOUDFLARE_D1_DATABASE_ID, token=process.env.CLOUDFLARE_API_TOKEN}={}){
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.token = token;
  }
  endpoint(){ return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`; }
  async init(){
    for (const [name, value] of Object.entries({CLOUDFLARE_ACCOUNT_ID:this.accountId, CLOUDFLARE_D1_DATABASE_ID:this.databaseId, CLOUDFLARE_API_TOKEN:this.token})){
      if (!value) throw new AdapterUnavailableError('d1', `${name} is required for the Cloudflare D1 storage adapter.`);
    }
    await this.query('create table if not exists codestudio_state (key text primary key, value text not null, updated_at text not null)');
    return this;
  }
  async query(sql, params=[]){
    const res = await fetch(this.endpoint(), {method:'POST', headers:{Authorization:`Bearer ${this.token}`, 'Content-Type':'application/json'}, body:JSON.stringify({sql, params})});
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new AdapterUnavailableError('d1', `D1 query failed: ${JSON.stringify(json.errors || json).slice(0,500)}`);
    return json.result || [];
  }
  async load(){
    const result = await this.query('select value from codestudio_state where key = ? limit 1', ['platform_state']);
    const row = result?.[0]?.results?.[0] || result?.results?.[0] || null;
    return row?.value ? JSON.parse(row.value) : null;
  }
  async save(state){
    await this.query('insert into codestudio_state(key,value,updated_at) values(?,?,?) on conflict(key) do update set value=excluded.value, updated_at=excluded.updated_at', ['platform_state', JSON.stringify(state), nowISO()]);
    return {ok:true};
  }
}

export async function verifyStorageAdapterSelection({root=process.cwd()}={}){
  const adapter = String(process.env.CODESTUDIO_STORAGE_ADAPTER || 'json').toLowerCase();
  const store = createDataStore({root});
  await store.init();
  const before = store.stats();
  await store.recordAuditEvent({projectId:'default', action:'storage.verify', target:adapter, metadata:{adapter}});
  const after = store.stats();
  return {ok:true, adapter:store.adapter || STORAGE_ADAPTERS.json, before, after};
}

export function createDataStore({root=process.cwd(), dir=process.env.CODESTUDIO_DATA_DIR || './data'}={}){
  const adapter = String(process.env.CODESTUDIO_STORAGE_ADAPTER || 'json').toLowerCase();
  if (adapter === 'json'){
    const store = new JsonDataStore({root, dir});
    store.adapter = STORAGE_ADAPTERS.json;
    return store;
  }
  if (adapter === 'sqlite') return new AdapterBackedDataStore({root, dir, meta:STORAGE_ADAPTERS.sqlite, backend:new SQLiteStateBackend({root})});
  if (adapter === 'postgres' || adapter === 'neon') return new AdapterBackedDataStore({root, dir, meta:STORAGE_ADAPTERS.postgres, backend:new PostgresStateBackend()});
  if (adapter === 'd1') return new AdapterBackedDataStore({root, dir, meta:STORAGE_ADAPTERS.d1, backend:new D1StateBackend()});
  throw new AdapterUnavailableError(adapter, `Unknown storage adapter: ${adapter}`);
}
