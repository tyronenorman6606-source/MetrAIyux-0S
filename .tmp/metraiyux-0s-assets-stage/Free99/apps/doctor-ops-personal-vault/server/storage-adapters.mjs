import { mkdir, readFile, writeFile, rename, readdir, stat, copyFile } from 'node:fs/promises';
import { dirname, resolve, join, basename } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const STORE_VERSION = '6.0.0-personal-local-vault-website';
export function isoNow(){ return new Date().toISOString(); }
export function uid(prefix = 'id'){ return `${prefix}_${randomUUID()}`; }
export function clone(value){ return JSON.parse(JSON.stringify(value ?? null)); }
export function hashText(text){ return createHash('sha256').update(text).digest('hex'); }
export function countStoreRecords(store){ return Object.values(store.apps || {}).reduce((sum, app) => sum + (Array.isArray(app?.records) ? app.records.length : 0), 0); }
export function defaultStore(){
  return {
    version:STORE_VERSION,
    createdAt:isoNow(),
    updatedAt:isoNow(),
    privacy:{
      dataResidency:'local-device-only',
      externalSync:'disabled-by-default',
      cloudStorage:'none-configured',
      authMode:'inherited-upstream-pass-through',
      intendedUse:'personal-doctor-workflow-notebook',
      complianceClaim:'no-hipaa-certification-claim',
      lastConfidenceCheckAt:null
    },
    workspace:{id:'default-workspace', name:'Doctor Ops Personal Vault', operator:'Personal operator', upstreamMode:'pass-through', createdAt:isoNow(), updatedAt:isoNow()},
    apps:{},
    actions:[],
    queue:[],
    receipts:[],
    audit:[],
    backups:[]
  };
}
export function normalizeStore(raw){
  const store = raw && typeof raw === 'object' ? raw : defaultStore();
  const fresh = defaultStore();
  store.version ||= fresh.version; store.createdAt ||= fresh.createdAt; store.updatedAt ||= isoNow();
  store.privacy = {...fresh.privacy, ...(store.privacy || {})};
  store.workspace = {...fresh.workspace, ...(store.workspace || {})};
  if(!store.apps || typeof store.apps !== 'object') store.apps = {};
  for(const key of ['actions','queue','receipts','audit','backups']) if(!Array.isArray(store[key])) store[key] = [];
  Object.entries(store.apps).forEach(([slug, app]) => {
    if(!app || typeof app !== 'object') app = store.apps[slug] = {};
    for(const key of ['records','audit','versions','receipts']) if(!Array.isArray(app[key])) app[key] = [];
    app.meta = {...(app.meta || {}), appId: app.meta?.appId || slug};
  });
  return store;
}
export class JsonFileStore {
  constructor(filePath){ this.filePath = resolve(filePath || 'data/platform-store.json'); this._queue = Promise.resolve(); }
  backupDir(){ return join(dirname(this.filePath), 'backups'); }
  async read(){
    try{ return normalizeStore(JSON.parse(await readFile(this.filePath, 'utf8'))); }
    catch(err){ if(err.code === 'ENOENT'){ const fresh = defaultStore(); await this.write(fresh); return fresh; } throw err; }
  }
  async write(store){
    const normalized = normalizeStore(store); normalized.updatedAt = isoNow();
    await mkdir(dirname(this.filePath), {recursive:true});
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(normalized, null, 2));
    await rename(tmp, this.filePath);
    return normalized;
  }
  async mutate(fn){
    this._queue = this._queue.then(async () => {
      const current = await this.read();
      const result = await fn(current);
      const next = result?.store || current;
      const saved = await this.write(next);
      return {store:saved, result:result?.result};
    });
    return this._queue;
  }
  async createBackup(reason = 'manual-backup'){
    const current = await this.read();
    const payload = JSON.stringify(publicStore(current), null, 2);
    const id = `backup_${new Date().toISOString().replace(/[:.]/g,'-')}_${hashText(payload).slice(0,12)}`;
    const dir = this.backupDir();
    await mkdir(dir, {recursive:true});
    const filePath = join(dir, `${id}.json`);
    await writeFile(filePath, payload);
    const info = {id, createdAt:isoNow(), reason, file:`data/backups/${id}.json`, sha256:hashText(payload), bytes:Buffer.byteLength(payload), records:countStoreRecords(current), apps:Object.keys(current.apps || {}).length, workspace:current.workspace?.name || null};
    current.backups.unshift(info); current.backups = current.backups.slice(0,100);
    current.privacy.lastConfidenceCheckAt = isoNow();
    pushReceipt(current, 'backup-create', `Created local backup ${id}.`, info);
    pushAudit(current, `Created local backup ${id}.`, info);
    await this.write(current);
    return info;
  }
  async listBackups(){
    const current = await this.read();
    const dir = this.backupDir();
    let disk = [];
    try{
      const files = await readdir(dir);
      disk = await Promise.all(files.filter(f => f.endsWith('.json')).map(async f => {
        const full = join(dir, f); const s = await stat(full);
        return {id:f.replace(/\.json$/,''), file:`data/backups/${f}`, bytes:s.size, mtime:s.mtime.toISOString()};
      }));
    }catch(err){ if(err.code !== 'ENOENT') throw err; }
    const merged = new Map();
    disk.forEach(b => merged.set(b.id, b));
    (current.backups || []).forEach(b => merged.set(b.id, {...merged.get(b.id), ...b}));
    return [...merged.values()].sort((a,b) => String(b.createdAt || b.mtime).localeCompare(String(a.createdAt || a.mtime)));
  }
  async readBackup(id){
    const safe = basename(String(id || '')).replace(/\.json$/,'');
    if(!/^backup_[A-Za-z0-9_.-]+$/.test(safe)) throw Object.assign(new Error('invalid_backup_id'), {status:400});
    const filePath = join(this.backupDir(), `${safe}.json`);
    const text = await readFile(filePath, 'utf8');
    return {id:safe, text, sha256:hashText(text)};
  }
  async restoreBackup(id){
    const backup = await this.readBackup(id);
    const parsed = normalizeStore(JSON.parse(backup.text));
    const before = await this.createBackup(`pre-restore-${id}`);
    parsed.backups = [{id:backup.id, restoredAt:isoNow(), sha256:backup.sha256}, before, ...(parsed.backups || [])].slice(0,100);
    pushReceipt(parsed, 'backup-restore', `Restored local backup ${id}.`, {id, preRestoreBackup:before.id});
    pushAudit(parsed, `Restored local backup ${id}.`, {id, preRestoreBackup:before.id});
    const saved = await this.write(parsed);
    return {restored:id, preRestoreBackup:before.id, store:publicStore(saved)};
  }
}
export function publicStore(store){ const safe = clone(normalizeStore(store)); safe.runtime = {type:'json-file', storeVersion:STORE_VERSION}; return safe; }
export function privacyStatus(store, storePath){
  const normalized = normalizeStore(store);
  return {
    localOnly:true,
    externalSync:false,
    cloudStorage:'not configured',
    authMode:'inherited upstream only',
    storePath,
    backupDirectory:join(dirname(storePath), 'backups'),
    workspace:normalized.workspace,
    records:countStoreRecords(normalized),
    apps:Object.keys(normalized.apps || {}).length,
    receipts:normalized.receipts.length,
    backups:normalized.backups.length,
    posture:[
      'Records are written to the local JSON store when the optional runtime is used.',
      'Browser-only mode stores data in localStorage and can export/import workspace JSON.',
      'No external API, cloud database, telemetry, or third-party sync is configured by this package.',
      'This package does not claim HIPAA certification; deployment obligations remain with the operator.'
    ],
    checkedAt:isoNow()
  };
}
export function readUpstreamClaim(req){ return {workspace:req.headers['x-doctor-ops-workspace'] || req.headers['x-upstream-workspace'] || null, tenant:req.headers['x-doctor-ops-tenant'] || req.headers['x-upstream-tenant'] || null, org:req.headers['x-doctor-ops-org'] || req.headers['x-upstream-org'] || null, operator:req.headers['x-doctor-ops-operator'] || req.headers['x-upstream-user'] || null, role:req.headers['x-doctor-ops-role'] || req.headers['x-upstream-role'] || null, mode:'pass-through-no-local-auth'}; }
export function appState(store, slug){ if(!store.apps[slug]) store.apps[slug] = {records:[], audit:[], versions:[], receipts:[], meta:{appId:slug, createdAt:isoNow()}}; return store.apps[slug]; }
export function recordFingerprint(slug, record){ const title = record.patientName || record.name || record.title || record.id || ''; const date = record.arrivalDate || record.visitDate || record.dueDate || record.updatedAt || ''; const status = record.status || record.authStatus || record.packetStatus || record.priority || ''; return [slug,title,date,status].map(v => String(v || '').trim().toLowerCase()).join('|'); }
export function normalizeRecord(slug, record, existing){ const now = isoNow(); const merged = {...(existing || {}), ...(record || {})}; merged.id ||= uid(slug); merged.createdAt ||= existing?.createdAt || now; merged.updatedAt = now; merged._fingerprint = recordFingerprint(slug, merged); return merged; }
export function pushAudit(store, message, payload = {}){ const item = {id:uid('audit'), at:isoNow(), message, payload}; store.audit.unshift(item); store.audit = store.audit.slice(0,500); return item; }
export function pushReceipt(store, action, detail, payload = {}){ const receipt = {id:uid('rcpt'), at:isoNow(), action, detail, payload}; store.receipts.unshift(receipt); store.receipts = store.receipts.slice(0,500); return receipt; }
export function upsertRecord(store, slug, record){
  const app = appState(store, slug); const incoming = normalizeRecord(slug, record);
  const hitIndex = app.records.findIndex(r => r.id === incoming.id || r._fingerprint === incoming._fingerprint);
  const before = hitIndex >= 0 ? clone(app.records[hitIndex]) : null; const next = normalizeRecord(slug, incoming, before);
  if(hitIndex >= 0) app.records[hitIndex] = next; else app.records.unshift(next);
  app.versions.unshift({id:uid('ver'), at:isoNow(), action:hitIndex >= 0 ? 'api-update-record' : 'api-create-record', before, after:clone(next)}); app.versions = app.versions.slice(0,250);
  app.audit.unshift({id:uid('audit'), at:isoNow(), message:`${hitIndex >= 0 ? 'Updated' : 'Created'} record ${next.id} through local API.`}); app.audit = app.audit.slice(0,250);
  return {record:next, created:hitIndex < 0};
}
export function importRecords(store, slug, rows = []){ let created = 0, updated = 0; const records = []; rows.forEach(row => { const result = upsertRecord(store, slug, row); result.created ? created++ : updated++; records.push(result.record); }); pushReceipt(store, 'api-import-records', `Imported ${rows.length} records for ${slug}.`, {slug, rows:rows.length, created, updated}); pushAudit(store, `Imported ${rows.length} records into ${slug}.`, {slug, created, updated}); return {slug, rows:rows.length, created, updated, records}; }
export function enqueueTask(store, task){ const queued = {id:task.id || uid('task'), at:isoNow(), status:'queued', attempts:0, slug:task.slug || task.appId || null, recordId:task.recordId || null, action:task.action || 'manual-review', priority:task.priority || 'normal', owner:task.owner || null, notes:task.notes || '', payload:task.payload || {}}; store.queue.unshift(queued); pushReceipt(store, 'queue-enqueue', `Queued ${queued.action}.`, queued); return queued; }
export function executeAction(store, action){ const act = {id:action.id || uid('action'), at:isoNow(), status:'completed', slug:action.slug || action.appId || null, recordId:action.recordId || null, action:action.action || 'operator-action', operator:action.operator || store.workspace.operator, notes:action.notes || '', payload:action.payload || {}}; store.actions.unshift(act); if(act.slug && act.recordId){ const app = appState(store, act.slug); const rec = app.records.find(r => r.id === act.recordId); if(rec){ const before = clone(rec); rec.updatedAt = isoNow(); rec.lastAction = act.action; rec.lastActionAt = act.at; rec.lastActionNotes = act.notes; app.versions.unshift({id:uid('ver'), at:isoNow(), action:`action-${act.action}`, before, after:clone(rec)}); app.audit.unshift({id:uid('audit'), at:isoNow(), message:`Executed action ${act.action} on ${rec.id}.`}); }} pushReceipt(store, 'action-execute', `Executed ${act.action}.`, act); pushAudit(store, `Executed action ${act.action}.`, act); return act; }
