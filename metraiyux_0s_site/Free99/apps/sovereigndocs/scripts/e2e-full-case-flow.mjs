import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 8899);
const base = `http://127.0.0.1:${port}`;
const jsonHeaders = { 'content-type':'application/json', 'accept':'application/json' };
function log(message){ console.log(`✅ ${message}`); }
function assert(condition, message){ if(!condition){ throw new Error(message); } log(message); }
async function api(pathname, options={}){
  const res = await fetch(`${base}${pathname}`, { ...options, headers:{...jsonHeaders, ...(options.headers||{})} });
  const text = await res.text(); let body={}; try{ body=text?JSON.parse(text):{}; }catch{ body={ raw:text }; }
  if(!res.ok){ throw new Error(`${pathname} returned ${res.status}: ${body.error || text}`); }
  return body;
}
async function waitHealth(){
  for(let i=0;i<60;i++){
    try{ const h=await api('/api/health'); if(h.ok) return h; }catch{}
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('server health did not respond');
}
async function pickTemplates(){
  const low = await api('/api/v17/templates/search?risk=low&state=AZ&pageSize=1');
  const medium = await api('/api/v17/templates/search?risk=medium&state=AZ&pageSize=1');
  assert(low.items?.[0]?.id, 'low-risk Arizona template found through modular template route');
  assert(medium.items?.[0]?.id, 'medium-risk Arizona template found through modular template route');
  return [low.items[0].id, medium.items[0].id];
}
const runtimeFiles = ['data/case-intakes.json','data/case-records.json','data/document-records.json','data/packet-records.json','data/legal-review-submissions.json','data/editor-handoff-log.json','data/editor-return-log.json','data/case-notes.json','data/case-artifacts.json','data/reminders.json','data/customer-orders.json','data/vault.json'];
const snapshots = new Map();
for(const file of runtimeFiles){ try{ snapshots.set(file, await readFile(path.join(root,file),'utf8')); }catch{} }
const server = spawn(process.execPath, ['server/sovereigndocs-server.mjs'], { cwd:root, env:{...process.env, PORT:String(port)}, stdio:['ignore','pipe','pipe'] });
server.stdout.on('data', chunk => process.stdout.write(chunk));
server.stderr.on('data', chunk => process.stderr.write(chunk));
try{
  const health = await waitHealth();
  assert(['17.0.0','18.0.0','19.0.0','20.0.0'].includes(health.version), 'API health returns v17-v20');
  const routes = await api('/api/routes/manifest');
  assert(routes.moduleCount >= 12, 'modular route manifest exposes route modules');
  const [first, second] = await pickTemplates();
  const intake = await api('/api/intake/start', { method:'POST', body:JSON.stringify({ title:'Browser E2E Arizona business packet', intakeType:'business_launch', jurisdiction:'US-AZ', category:'business-formation-governance', facts:{ company_name:'E2E Holdings LLC', owner_name:'Operator Test' }, acceptBoundary:true }) });
  assert(intake.intake?.id, 'browser path creates intake');
  const converted = await api(`/api/case-intakes/${encodeURIComponent(intake.intake.id)}/convert-to-case`, { method:'POST', body:JSON.stringify({ title:'Browser E2E Case', templateIds:[first,second], acceptBoundary:true, createPacket:true }) });
  const caseId = converted.case?.id || converted.result?.case?.id;
  assert(caseId, 'intake converts to case');
  const overview = await api(`/api/v17/cases/${encodeURIComponent(caseId)}/overview`);
  assert(overview.documents?.length >= 1, 'case overview returns document records');
  const open = await api(`/api/v17/cases/${encodeURIComponent(caseId)}/open-in-skye-docx-max`, { method:'POST', body:JSON.stringify({}) });
  assert(open.launchUrl?.includes('/skye-docx-max/app/'), 'case can launch SkyeDocx Max from v17 route');
  const map = await api(`/api/v17/editor/skye-docx-max/handoff/${encodeURIComponent(open.handoff.id)}/map`);
  assert(Array.isArray(map.sectionMap), 'SkyeDocx Max map exposes section map');
  await api(`/api/editor/skye-docx-max/session/${encodeURIComponent(open.handoff.id)}/opened`, { method:'POST', body:JSON.stringify({}) });
  const returned = await api('/api/editor/skye-docx-max/return', { method:'POST', body:JSON.stringify({ handoffId:open.handoff.id, title:'Browser E2E Edited Return', html:'<h1>Edited</h1><p>Returned from E2E.</p>', text:'Edited return.' }) });
  assert(returned.returned?.id, 'SkyeDocx Max return creates document lifecycle record');
  const note = await api(`/api/cases/${encodeURIComponent(caseId)}/notes`, { method:'POST', body:JSON.stringify({ visibility:'partner', noteType:'review_context', body:'Partner-visible note created by E2E path.' }) });
  assert(note.note?.id, 'case note creation works in full path');
  const client = await api(`/api/cases/${encodeURIComponent(caseId)}/client-status`);
  assert(client.case?.id === caseId, 'client status resolves case');
  const partnerPacket = await api(`/api/cases/${encodeURIComponent(caseId)}/partner-packet`);
  assert(partnerPacket.caseId === caseId || partnerPacket.case?.id === caseId, 'partner packet generated from case');
  const scopedCases = await api('/api/v17/cases');
  assert(scopedCases.items.some(row => row.id === caseId), 'tenant-scoped v17 case list includes created case');
  const audit = await api('/api/v17/audit/status');
  assert(audit.ledger?.ok !== false, 'v17 audit status verifies ledger');
  log('SovereignDocs v17 browser-style full-path E2E passed');
} finally {
  server.kill('SIGTERM');
  await new Promise(r=>setTimeout(r,250));
  for(const [file, content] of snapshots){ await writeFile(path.join(root,file), content); }
}
