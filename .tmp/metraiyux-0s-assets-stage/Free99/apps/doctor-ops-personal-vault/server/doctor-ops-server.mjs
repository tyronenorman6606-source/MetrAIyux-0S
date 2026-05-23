import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonFileStore, publicStore, privacyStatus, readUpstreamClaim, appState, upsertRecord, importRecords, enqueueTask, executeAction, pushAudit, pushReceipt, STORE_VERSION, isoNow } from './storage-adapters.mjs';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const defaultStorePath = process.env.DOCTOR_OPS_STORE || join(root, 'data/platform-store.json');
const defaultPort = Number(process.env.PORT || process.env.DOCTOR_OPS_PORT || 4173);
const mime = {'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.md':'text/markdown;charset=utf-8','.txt':'text/plain;charset=utf-8','.xml':'application/xml;charset=utf-8','.svg':'image/svg+xml;charset=utf-8','.webmanifest':'application/manifest+json;charset=utf-8','.png':'image/png','.webp':'image/webp'};
function send(res, status, body, headers = {}){ const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2); res.writeHead(status, {'content-type': typeof body === 'string' || Buffer.isBuffer(body) ? (headers['content-type'] || 'text/plain;charset=utf-8') : 'application/json;charset=utf-8', 'cache-control':'no-store', ...headers}); res.end(payload); }
function notFound(res){ send(res, 404, {error:'not_found'}); }
function methodNotAllowed(res){ send(res, 405, {error:'method_not_allowed'}); }
async function readBody(req){ const chunks = []; for await (const chunk of req) chunks.push(chunk); const text = Buffer.concat(chunks).toString('utf8'); if(!text.trim()) return {}; try{ return JSON.parse(text); }catch(err){ const e = new Error('Invalid JSON body'); e.status = 400; throw e; } }
async function readCatalog(){ const text = await readFile(join(root, 'assets/js/catalog.js'), 'utf8'); const match = text.match(/window\.DOCTOR_OPS_CATALOG\s*=\s*(\[[\s\S]*?\]);/); return match ? JSON.parse(match[1]) : []; }
async function serveStatic(req, res, url){ let pathname = decodeURIComponent(url.pathname); if(pathname === '/') pathname = '/index.html'; const candidate = normalize(pathname).replace(/^([.][.][\/\\])+/, ''); const filePath = resolve(root, candidate.replace(/^[/\\]/, '')); if(!filePath.startsWith(root)) return notFound(res); try{ const body = await readFile(filePath); const type = mime[extname(filePath)] || 'application/octet-stream'; res.writeHead(200, {'content-type':type, 'cache-control':'no-store'}); res.end(body); }catch(err){ notFound(res); } }
export function createDoctorOpsServer(options = {}){ const store = options.store || new JsonFileStore(options.storePath || defaultStorePath); const server = http.createServer(async (req, res) => { const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); try{
  if(url.pathname === '/api/health'){ const current = await store.read(); return send(res, 200, {ok:true, runtime:'doctor-ops-local-api', version:STORE_VERSION, at:isoNow(), upstreamClaim:readUpstreamClaim(req), workspace:current.workspace}); }
  if(url.pathname === '/api/catalog'){ if(req.method !== 'GET') return methodNotAllowed(res); return send(res, 200, {catalog:await readCatalog()}); }
  if(url.pathname === '/api/privacy/status'){ if(req.method !== 'GET') return methodNotAllowed(res); return send(res, 200, privacyStatus(await store.read(), store.filePath)); }
  if(url.pathname === '/api/backups'){
    if(req.method === 'GET') return send(res, 200, {backups:await store.listBackups()});
    if(req.method === 'POST'){ const body = await readBody(req); const backup = await store.createBackup(body.reason || 'manual-backup'); return send(res, 201, {backup}); }
    return methodNotAllowed(res);
  }
  const backupMatch = url.pathname.match(/^\/api\/backups\/([^/]+)(?:\/(restore))?$/);
  if(backupMatch){
    const id = backupMatch[1];
    if(backupMatch[2] === 'restore'){
      if(req.method !== 'POST') return methodNotAllowed(res);
      const result = await store.restoreBackup(id);
      return send(res, 200, result);
    }
    if(req.method !== 'GET') return methodNotAllowed(res);
    const backup = await store.readBackup(id);
    return send(res, 200, backup.text, {'content-type':'application/json;charset=utf-8','x-doctor-ops-backup-id':backup.id,'x-doctor-ops-backup-sha256':backup.sha256});
  }
  if(url.pathname === '/api/workspace'){ if(req.method === 'GET') return send(res, 200, {workspace:(await store.read()).workspace, upstreamClaim:readUpstreamClaim(req)}); if(req.method === 'PUT' || req.method === 'PATCH'){ const body = await readBody(req); const {store:saved} = await store.mutate(current => { current.workspace = {...current.workspace, ...body, updatedAt:isoNow()}; pushAudit(current, 'Workspace context updated through local API.', {workspace:current.workspace.id}); return {store:current}; }); return send(res, 200, {workspace:saved.workspace}); } return methodNotAllowed(res); }
  if(url.pathname === '/api/export'){ if(req.method !== 'GET') return methodNotAllowed(res); return send(res, 200, publicStore(await store.read())); }
  const appMatch = url.pathname.match(/^\/api\/apps\/([^/]+)(?:\/records(?:\/([^/]+))?)?$/); if(appMatch){ const slug = appMatch[1]; const recordId = appMatch[2]; if(req.method === 'GET'){ const current = await store.read(); const app = appState(current, slug); if(recordId){ const record = app.records.find(r => r.id === recordId); return record ? send(res, 200, {record}) : notFound(res); } return send(res, 200, {slug, ...app}); } if(req.method === 'POST' && !recordId){ const body = await readBody(req); const {result} = await store.mutate(current => { const saved = upsertRecord(current, slug, body.record || body); pushReceipt(current, 'api-create-record', `Created/updated record in ${slug}.`, {slug, id:saved.record.id, created:saved.created}); return {store:current, result:saved}; }); return send(res, result.created ? 201 : 200, result); } if((req.method === 'PATCH' || req.method === 'PUT') && recordId){ const body = await readBody(req); const {result} = await store.mutate(current => { const saved = upsertRecord(current, slug, {...(body.record || body), id:recordId}); pushReceipt(current, 'api-update-record', `Updated record ${recordId} in ${slug}.`, {slug, id:recordId}); return {store:current, result:saved}; }); return send(res, 200, result); } return methodNotAllowed(res); }
  const importMatch = url.pathname.match(/^\/api\/apps\/([^/]+)\/import$/); if(importMatch){ if(req.method !== 'POST') return methodNotAllowed(res); const slug = importMatch[1]; const body = await readBody(req); const rows = Array.isArray(body) ? body : body.records; if(!Array.isArray(rows)) return send(res, 400, {error:'records_array_required'}); const {result} = await store.mutate(current => ({store:current, result:importRecords(current, slug, rows)})); return send(res, 200, result); }
  if(url.pathname === '/api/import-workspace'){ if(req.method !== 'POST') return methodNotAllowed(res); const body = await readBody(req); const apps = body.apps && typeof body.apps === 'object' ? body.apps : {}; const summary = []; const {store:saved} = await store.mutate(current => { if(body.workspace) current.workspace = {...current.workspace, ...body.workspace, updatedAt:isoNow()}; Object.entries(apps).forEach(([slug, app]) => { const rows = Array.isArray(app?.records) ? app.records : []; summary.push(importRecords(current, slug, rows)); }); pushReceipt(current, 'api-import-workspace', `Imported workspace with ${summary.length} app lanes.`, {apps:summary.length}); return {store:current}; }); return send(res, 200, {workspace:saved.workspace, summary}); }
  if(url.pathname === '/api/queue'){ if(req.method === 'GET') return send(res, 200, {queue:(await store.read()).queue}); if(req.method === 'POST'){ const body = await readBody(req); const {result} = await store.mutate(current => ({store:current, result:enqueueTask(current, body)})); return send(res, 201, {task:result}); } return methodNotAllowed(res); }
  if(url.pathname === '/api/actions/execute'){ if(req.method !== 'POST') return methodNotAllowed(res); const body = await readBody(req); const {result} = await store.mutate(current => ({store:current, result:executeAction(current, body)})); return send(res, 200, {action:result}); }
  if(url.pathname === '/api/audit'){ if(req.method !== 'GET') return methodNotAllowed(res); const current = await store.read(); return send(res, 200, {audit:current.audit, receipts:current.receipts, actions:current.actions}); }
  if(url.pathname.startsWith('/api/')) return notFound(res); return serveStatic(req, res, url);
}catch(err){ return send(res, err.status || 500, {error:err.message || 'server_error'}); }}); return {server, store}; }
export async function listen(options = {}){ const {server, store} = createDoctorOpsServer(options); const port = Number(options.port ?? defaultPort); await new Promise(resolve => server.listen(port, options.host || '127.0.0.1', resolve)); return {server, store, port}; }
if(import.meta.url === `file://${process.argv[1]}`){ const {port} = await listen(); console.log(`Doctor Ops local runtime listening on http://127.0.0.1:${port}`); }
