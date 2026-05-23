import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listen } from '../server/doctor-ops-server.mjs';
const failures = [], pass = [];
function ok(condition, label, detail = ''){ (condition ? pass : failures).push({label, detail}); }
async function json(url, options = {}){ const res = await fetch(url, {headers:{'content-type':'application/json', ...(options.headers || {})}, ...options}); const body = await res.json().catch(() => ({})); if(!res.ok) throw new Error(`${res.status} ${body.error || res.statusText}`); return body; }
const tmp = await mkdtemp(join(tmpdir(), 'doctor-ops-api-smoke-'));
const {server} = await listen({port:0, storePath:join(tmp, 'store.json')});
const base = `http://127.0.0.1:${server.address().port}`;
try{
  const health = await json(`${base}/api/health`, {headers:{'x-upstream-user':'Smoke Operator','x-upstream-org':'Smoke Clinic'}});
  ok(health.ok === true, 'local API health endpoint responds');
  ok(String(health.version).includes('personal-local-vault'), 'runtime reports v6 personal local vault website version');
  ok(health.upstreamClaim.operator === 'Smoke Operator', 'upstream claim headers are read without local auth');
  const privacy = await json(`${base}/api/privacy/status`);
  ok(privacy.localOnly === true && privacy.externalSync === false, 'privacy status confirms local-only posture');
  ok(String(privacy.storePath || '').includes('store.json'), 'privacy status exposes local store path');
  const catalog = await json(`${base}/api/catalog`);
  ok(Array.isArray(catalog.catalog) && catalog.catalog.length === 13, 'local API exposes 13-app catalog');
  const workspace = await json(`${base}/api/workspace`, {method:'PUT', body:JSON.stringify({id:'smoke-workspace', name:'Smoke Clinic Runtime', operator:'Smoke Operator'})});
  ok(workspace.workspace.name === 'Smoke Clinic Runtime', 'workspace can be updated through API');
  const created = await json(`${base}/api/apps/intake-triage-ops/records`, {method:'POST', body:JSON.stringify({record:{patientName:'API Smoke Patient', arrivalDate:'2026-05-10', acuity:'urgent', chiefComplaint:'Runtime proof', status:'waiting'}})});
  ok(created.record?.id, 'record can be created through API');
  ok(created.created === true, 'record create marks created=true');
  const patched = await json(`${base}/api/apps/intake-triage-ops/records/${created.record.id}`, {method:'PATCH', body:JSON.stringify({status:'roomed', triageNotes:'Updated through smoke proof.'})});
  ok(patched.record.status === 'roomed', 'record can be patched through API');
  const imported = await json(`${base}/api/apps/referral-router/import`, {method:'POST', body:JSON.stringify({records:[{patientName:'Referral Smoke', specialty:'Cardiology', status:'pending', dueDate:'2026-05-12'}]})});
  ok(imported.created === 1 && imported.rows === 1, 'app import endpoint creates records');
  const task = await json(`${base}/api/queue`, {method:'POST', body:JSON.stringify({slug:'intake-triage-ops', recordId:created.record.id, action:'operator-review', priority:'high'})});
  ok(task.task?.status === 'queued', 'queue endpoint stores operator task');
  const action = await json(`${base}/api/actions/execute`, {method:'POST', body:JSON.stringify({slug:'intake-triage-ops', recordId:created.record.id, action:'operator-reviewed', operator:'Smoke Operator'})});
  ok(action.action?.status === 'completed', 'action execution writes completed receipt');
  const audit = await json(`${base}/api/audit`);
  ok(audit.receipts.length >= 3, 'audit endpoint exposes runtime receipts');
  const backup = await json(`${base}/api/backups`, {method:'POST', body:JSON.stringify({reason:'smoke-backup'})});
  ok(/^backup_/.test(backup.backup?.id || ''), 'backup endpoint creates local backup id');
  ok(backup.backup?.sha256?.length === 64, 'backup endpoint records sha256');
  const backups = await json(`${base}/api/backups`);
  ok(backups.backups.some(b => b.id === backup.backup.id), 'backup list includes created backup');
  const downloaded = await json(`${base}/api/backups/${backup.backup.id}`);
  ok(downloaded.runtime?.storeVersion?.includes('personal-local-vault'), 'backup download returns exported store JSON');
  const restored = await json(`${base}/api/backups/${backup.backup.id}/restore`, {method:'POST', body:JSON.stringify({})});
  ok(restored.restored === backup.backup.id && restored.preRestoreBackup, 'backup restore creates pre-restore backup and restores selected backup');
  const exported = await json(`${base}/api/export`);
  ok(exported.apps?.['intake-triage-ops']?.records?.length >= 1, 'runtime export contains app records');
  ok(exported.queue?.length === 1, 'runtime export contains queued task');
} finally { await new Promise(resolve => server.close(resolve)); await rm(tmp, {recursive:true, force:true}); }
if(failures.length){ console.error('❌ Doctor Ops Platform API smoke failed'); failures.forEach(f => console.error(`- ${f.label}${f.detail ? ` (${f.detail})` : ''}`)); process.exit(1); }
console.log('✅ Doctor Ops Platform API smoke passed'); pass.forEach(p => console.log(`- ${p.label}${p.detail ? ` (${p.detail})` : ''}`));
