import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8898);
const BASE = `http://127.0.0.1:${PORT}`;
const SECRET = process.env.SOVEREIGNDOCS_UPSTREAM_SECRET || 'v18-closure-secret-change-me-12345';
function ok(message){ console.log(`✅ ${message}`); }
function fail(message){ console.error(`❌ ${message}`); process.exit(1); }
function token(user){ const payload=Buffer.from(JSON.stringify({ user:{ id:user.id, name:user.name||user.id, orgId:user.orgId, roles:user.roles||['operator'] }, exp:Math.floor(Date.now()/1000)+3600 }),'utf8').toString('base64url'); const sig=crypto.createHmac('sha256', SECRET).update(payload).digest('hex'); return `${payload}.${sig}`; }
const headersA = { 'content-type':'application/json', 'x-sovereigndocs-session': token({id:'v18-user-a', orgId:'org-v18-a', roles:['owner','operator','reviewer','partner_manager']}) };
const headersB = { 'content-type':'application/json', 'x-sovereigndocs-session': token({id:'v18-user-b', orgId:'org-v18-b', roles:['operator']}) };
async function request(path, options={}){ const res=await fetch(`${BASE}${path}`, options); const text=await res.text(); let body={}; try{ body=text?JSON.parse(text):{}; }catch{ body={raw:text}; } if(!res.ok) throw Object.assign(new Error(body.error || `${path} ${res.status}`), { status:res.status, body }); return body; }
async function wait(){ for(let i=0;i<40;i++){ try{ await request('/api/health'); return; }catch{ await new Promise(r=>setTimeout(r,250)); } } fail('server did not boot'); }

const server=spawn(process.execPath,['server/sovereigndocs-server.mjs'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(PORT),SOVEREIGNDOCS_UPSTREAM_SECRET:SECRET,SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH:'1',SOVEREIGNDOCS_ALLOWED_ORIGINS:'*'}});
server.stdout.on('data',d=>process.stdout.write(d)); server.stderr.on('data',d=>process.stderr.write(d));
try{
 await wait();
 const health=await request('/api/health',{headers:headersA}); if(!(String(health.version).startsWith('18') || String(health.version).startsWith('19') || String(health.version).startsWith('20'))) fail('API health is not v18-v20'); ok('API health returns v18-v20');
 const manifest=await request('/api/routes/manifest',{headers:headersA}); if(!manifest.modules?.some(m=>m.name==='cases-v18.routes')) fail('v18-v20 case route module missing'); if(!manifest.modules?.some(m=>m.name==='editor-v18.routes')) fail('v18 editor route module missing'); ok('v18 route modules registered');
 const search=await request('/api/v17/templates/search?jurisdiction=US-AZ&risk=low&pageSize=2',{headers:headersA}); const templateId=search.items?.[0]?.id; if(!templateId) fail('no Arizona low risk template'); ok('template discovery works through modular route');
 const intake=await request('/api/intake/start',{method:'POST',headers:headersA,body:JSON.stringify({title:'v18 Closure Intake',intakeType:'closure_flow',jurisdiction:'US-AZ',facts:{businessName:'Closure Test'},templateIds:[templateId],readyForCase:true,acceptBoundary:true})}); ok('intake created with verified upstream tenant');
 const converted=await request(`/api/case-intakes/${encodeURIComponent(intake.intake.id)}/convert-to-case`,{method:'POST',headers:headersA,body:JSON.stringify({title:'v18 Closure Case',templateIds:[templateId],answers:{provider_name:'SovereignDocs',client_name:'Closure Client'},acceptBoundary:true})}); const caseId=converted.case.id; if(!caseId) fail('case conversion did not return case id'); ok('intake converted to case');
 const state=await request(`/api/v18/cases/${encodeURIComponent(caseId)}/state`,{headers:headersA}); if(state.case.id!==caseId || !state.documents?.length) fail('v18 state endpoint missing case/documents'); ok('v18-v20 case state endpoint returns full state');
 const denied=await fetch(`${BASE}/api/v18/cases/${encodeURIComponent(caseId)}/state`,{headers:headersB}); if(denied.status!==403) fail(`cross-tenant case state was not blocked (${denied.status})`); ok('cross-tenant case access blocked');
 const launch=await request(`/api/v18/cases/${encodeURIComponent(caseId)}/open-in-skye-docx-max`,{method:'POST',headers:headersA,body:JSON.stringify({})}); if(!launch.handoff?.id || !launch.launchUrl) fail('v18 editor launch missing handoff'); ok('v18 SkyeDocxMax case launch works');
 const map=await request(`/api/v18/editor/skye-docx-max/handoff/${encodeURIComponent(launch.handoff.id)}/map`,{headers:headersA}); if(!map.returnContract?.endpoint || !map.caseContext?.caseId) fail('handoff map missing return contract or case context'); ok('handoff map preserves return contract and case context');
 const returned=await request('/api/v18/editor/skye-docx-max/return-to-case',{method:'POST',headers:headersA,body:JSON.stringify({handoffId:launch.handoff.id,title:'Returned Closure Draft',html:'<h1>Returned</h1>',text:'Returned text'})}); if(returned.case?.id!==caseId || !returned.returned?.documentId) fail('return-to-case did not reconcile case/document'); ok('SkyeDocxMax return reconciles into case and document lifecycle');
 const note=await request(`/api/v18/cases/${encodeURIComponent(caseId)}/notes`,{method:'POST',headers:headersA,body:JSON.stringify({visibility:'partner',noteType:'closure_note',body:'Partner-visible v18 closure note'})}); if(!note.note?.id) fail('v18-v20 case note missing'); ok('v18 scoped case note created');
 const patched=await request(`/api/v18/cases/${encodeURIComponent(caseId)}`,{method:'PATCH',headers:headersA,body:JSON.stringify({status:'completed',note:'v18 closure flow completed'})}); if(patched.case.status!=='completed') fail('case did not complete through v18 patch route'); ok('v18-v20 case patch transition works');
 const closure=await request(`/api/v18/cases/${encodeURIComponent(caseId)}/closure-summary`,{headers:headersA}); if(!closure.exportBundle?.case || !closure.partnerPacket?.markdown) fail('closure summary missing bundle/partner packet'); ok('v18 closure summary builds export bundle and partner packet');
 const dash=await request('/api/v18/workspace/dashboard',{headers:headersA}); if(!dash.counts || !('cases' in dash.counts)) fail('v18 dashboard missing counts'); ok('v18 dashboard returns role-aware panels');
 const audit=await request('/api/v17/audit/status',{headers:headersA}); if(!audit.ledger?.ok) fail('audit ledger failed after v18 closure flow'); ok('audit ledger verifies after v18 workflow');
 console.log('✅ SovereignDocs v18 closure E2E passed');
} catch(error){ fail(error.message + (error.body ? ` ${JSON.stringify(error.body)}` : '')); }
finally{ server.kill('SIGTERM'); }
