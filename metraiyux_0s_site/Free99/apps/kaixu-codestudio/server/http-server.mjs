import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PlatformEngine } from './platform-engine.mjs';
import { claimsFromRequest } from './lib/claims.mjs';
import { verifyWebhookRequest } from './lib/webhooks.mjs';
import { openApiDocument, validateBodyForRoute } from './lib/openapi.mjs';

const port = Number(process.env.PORT || process.env.CODESTUDIO_PORT || 7137);
const root = process.cwd();
const corsOrigin = process.env.CODESTUDIO_CORS_ORIGIN || '*';

export async function createServer(){
  const engine = await new PlatformEngine({root}).init();
  const server = http.createServer(async (req, res) => {
    try{
      await route(req, res, engine);
    }catch(error){
      json(res, error.status || 500, {ok:false, error:{name:error.name, message:error.message}});
    }
  });
  return {server, engine};
}

async function route(req, res, engine){
  setCors(res);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/health') return json(res, 200, engine.health());
  if (req.method === 'GET' && pathname === '/api/platform/openapi.json') return json(res, 200, openApiDocument());
  if (pathname.startsWith('/api/platform/') && process.env.CODESTUDIO_ALLOW_UNSIGNED_DEV_CLAIMS !== '1') {
    const claims = await claimsFrom(req, {});
    if (!claims) {
      const err = new Error('FS27/SkyGate bearer or signed upstream claims are required.');
      err.status = 401;
      throw err;
    }
  }
  if (req.method === 'GET' && pathname === '/api/platform/manifest') return json(res, 200, {ok:true, manifest:engine.manifest});
  if (req.method === 'GET' && pathname === '/api/platform/receipts') return json(res, 200, {ok:true, receipts:engine.receiptsList(Number(url.searchParams.get('limit') || 100))});
  if (req.method === 'GET' && pathname === '/api/platform/providers/probe') return json(res, 200, {ok:true, providers:engine.registry.probeAll(), mode:engine.mode()});
  if (req.method === 'GET' && pathname === '/api/platform/provider-packs') return json(res, 200, {ok:true, packs:await engine.listProviderPacks()});
  if (req.method === 'GET' && pathname === '/api/platform/storage') return json(res, 200, {ok:true, active:engine.data.adapter || {id:'json'}, available:engine.health().storage.available, stats:engine.data.stats()});
  if (req.method === 'POST' && pathname === '/api/platform/storage/verify'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.verifyStorageAdapter(await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }
  if (req.method === 'GET' && pathname === '/api/platform/webhooks/dispatch-rules') return json(res, 200, {ok:true, rules:engine.listWebhookDispatchRules()});

  const providerActionRun = pathname.match(/^\/api\/platform\/provider-packs\/([^/]+)\/actions\/(.+)\/run$/);
  if (req.method === 'POST' && providerActionRun){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.runProviderPackAction(body.projectId || body.input?.projectId || 'default', decodeURIComponent(providerActionRun[1]), decodeURIComponent(providerActionRun[2]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/projects'){
    return json(res, 200, {ok:true, projects:engine.listProjects(await claimsFrom(req, {})), store:engine.data.stats()});
  }

  if (req.method === 'POST' && pathname === '/api/platform/projects'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.upsertProject(body.project || body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const projectProviderList = pathname.match(/^\/api\/platform\/projects\/([^/]+)\/providers$/);
  if (req.method === 'GET' && projectProviderList){
    const projectId = decodeURIComponent(projectProviderList[1]);
    const installs = engine.listProviderInstalls(projectId, await claimsFrom(req, {}));
    return json(res, 200, {ok:true, projectId, installs});
  }

  const projectProviderInstall = pathname.match(/^\/api\/platform\/projects\/([^/]+)\/providers\/([^/]+)$/);
  if (req.method === 'POST' && projectProviderInstall){
    const body = await readValidatedJson(req, pathname);
    const projectId = decodeURIComponent(projectProviderInstall[1]);
    const providerId = decodeURIComponent(projectProviderInstall[2]);
    const result = await engine.installProvider(projectId, {...body, providerId}, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const projectPackInstall = pathname.match(/^\/api\/platform\/projects\/([^/]+)\/provider-packs\/([^/]+)\/install$/);
  if (req.method === 'POST' && projectPackInstall){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.installProviderPack(decodeURIComponent(projectPackInstall[1]), decodeURIComponent(projectPackInstall[2]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const projectProviderRotate = pathname.match(/^\/api\/platform\/projects\/([^/]+)\/providers\/([^/]+)\/rotate$/);
  if (req.method === 'POST' && projectProviderRotate){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.rotateProvider(decodeURIComponent(projectProviderRotate[1]), decodeURIComponent(projectProviderRotate[2]), await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/runs'){
    return json(res, 200, {ok:true, runs:engine.listWorkflowRuns({projectId:url.searchParams.get('projectId'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'GET' && pathname === '/api/platform/webhooks'){
    return json(res, 200, {ok:true, events:engine.listWebhookEvents({projectId:url.searchParams.get('projectId'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'GET' && pathname === '/api/platform/approvals'){
    return json(res, 200, {ok:true, approvals:engine.listApprovals({projectId:url.searchParams.get('projectId'), status:url.searchParams.get('status'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  const approvalResolve = pathname.match(/^\/api\/platform\/approvals\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && approvalResolve){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.resolveApproval(decodeURIComponent(approvalResolve[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 404, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/jobs'){
    return json(res, 200, {ok:true, jobs:engine.listJobs({projectId:url.searchParams.get('projectId'), status:url.searchParams.get('status'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/jobs'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.enqueueJob(body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const jobRun = pathname.match(/^\/api\/platform\/jobs\/([^/]+)\/run$/);
  if (req.method === 'POST' && jobRun){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.runJob(decodeURIComponent(jobRun[1]), {claims:await claimsFrom(req, body)});
    return json(res, result.ok ? 200 : 409, result);
  }

  const jobExtend = pathname.match(/^\/api\/platform\/jobs\/([^/]+)\/extend-lock$/);
  if (req.method === 'POST' && jobExtend){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.extendJobLock(decodeURIComponent(jobExtend[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const jobCancel = pathname.match(/^\/api\/platform\/jobs\/([^/]+)\/cancel$/);
  if (req.method === 'POST' && jobCancel){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.cancelJob(decodeURIComponent(jobCancel[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'POST' && pathname === '/api/platform/jobs/recover'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.recoverStaleJobs(await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/dead-letters'){
    return json(res, 200, {ok:true, deadLetters:engine.listDeadLetters({projectId:url.searchParams.get('projectId'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  const deadRetry = pathname.match(/^\/api\/platform\/dead-letters\/([^/]+)\/retry$/);
  if (req.method === 'POST' && deadRetry){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.retryDeadLetter(decodeURIComponent(deadRetry[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'POST' && pathname === '/api/platform/jobs/drain'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.drainJobs({limit:Number(body.limit || 10), claims:await claimsFrom(req, body)});
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/schedules'){
    return json(res, 200, {ok:true, schedules:engine.listSchedules({projectId:url.searchParams.get('projectId'), status:url.searchParams.get('status'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/schedules'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.upsertSchedule(body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'POST' && pathname === '/api/platform/schedules/tick'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.runDueSchedules({limit:Number(body.limit || 20), claims:await claimsFrom(req, body)});
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/meters'){
    return json(res, 200, {ok:true, summary:engine.meterSummary({projectId:url.searchParams.get('projectId')}), events:engine.listMeterEvents({projectId:url.searchParams.get('projectId'), providerId:url.searchParams.get('providerId'), limit:Number(url.searchParams.get('limit') || 200)})});
  }


  if (req.method === 'GET' && pathname === '/api/platform/provider-router'){
    return json(res, 200, {ok:true, decisions:engine.listRouteDecisions({projectId:url.searchParams.get('projectId'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/provider-router/optimize'){
    const body = await readValidatedJson(req, pathname);
    const projectId = body.projectId || body.input?.projectId || 'default';
    const result = await engine.optimizeProviderRoute(projectId, body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/invoices'){
    return json(res, 200, {ok:true, invoices:engine.listInvoices({projectId:url.searchParams.get('projectId'), status:url.searchParams.get('status'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  const invoiceGenerate = pathname.match(/^\/api\/platform\/projects\/([^/]+)\/invoices\/generate$/);
  if (req.method === 'POST' && invoiceGenerate){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.generateUsageInvoice(decodeURIComponent(invoiceGenerate[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/workflow-builder/graphs'){
    return json(res, 200, {ok:true, graphs:engine.listWorkflowGraphs({projectId:url.searchParams.get('projectId'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/workflow-builder/graphs'){
    const body = await readValidatedJson(req, pathname);
    const projectId = body.projectId || body.input?.projectId || 'default';
    const result = await engine.saveWorkflowGraph(projectId, body.graph || body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const projectExport = pathname.match(/^\/api\/platform\/projects\/([^/]+)\/export$/);
  if (req.method === 'POST' && projectExport){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.exportProjectBundle(decodeURIComponent(projectExport[1]), await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'POST' && pathname === '/api/platform/import'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.importProjectBundle(body.bundle || body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/bundles'){
    return json(res, 200, {ok:true, bundles:engine.listBundles({projectId:url.searchParams.get('projectId'), limit:Number(url.searchParams.get('limit') || 50)}), imports:engine.listImports({projectId:url.searchParams.get('projectId'), limit:Number(url.searchParams.get('limit') || 50)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/preflight'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.preflight(body.templateId || body.workflowId, {input:body.input || {}, claims:await claimsFrom(req, body), approvals:body.approvals || {}});
    return json(res, result.ok ? 200 : 409, result);
  }

  const runMatch = pathname.match(/^\/api\/platform\/workflows\/([^/]+)\/run$/);
  if (req.method === 'POST' && runMatch){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.runWorkflow(decodeURIComponent(runMatch[1]), {input:body.input || body || {}, claims:await claimsFrom(req, body), approvals:body.approvals || {}});
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'POST' && pathname === '/api/platform/webhooks/ingest'){
    const body = await readValidatedJson(req, pathname);
    const payload = body.payload || body;
    const verification = verifyWebhookRequest({headers:req.headers, rawBody:body.__rawBody || JSON.stringify(payload), payload});
    const result = await engine.ingestWebhook(payload, {claims:await claimsFrom(req, body), verification, rawBody:body.__rawBody || JSON.stringify(payload)});
    return json(res, 200, result);
  }

  const replayMatch = pathname.match(/^\/api\/platform\/webhooks\/([^/]+)\/replay$/);
  if (req.method === 'POST' && replayMatch){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.replayWebhook(decodeURIComponent(replayMatch[1]), {claims:await claimsFrom(req, body), approvals:body.approvals || {}});
    return json(res, result.ok ? 200 : 409, result);
  }



  if (req.method === 'GET' && pathname === '/api/platform/audit'){
    return json(res, 200, {ok:true, events:engine.listAuditEvents({projectId:url.searchParams.get('projectId'), action:url.searchParams.get('action'), severity:url.searchParams.get('severity'), limit:Number(url.searchParams.get('limit') || 200)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/audit'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.recordAuditEvent(body.projectId || body.input?.projectId || 'default', body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/incidents'){
    return json(res, 200, {ok:true, incidents:engine.listIncidents({projectId:url.searchParams.get('projectId'), status:url.searchParams.get('status'), severity:url.searchParams.get('severity'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/incidents'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.openIncident(body.projectId || body.input?.projectId || 'default', body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const incidentResolve = pathname.match(/^\/api\/platform\/incidents\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && incidentResolve){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.resolveIncident(decodeURIComponent(incidentResolve[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 404, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/entitlements'){
    const enabledParam = url.searchParams.get('enabled');
    const enabled = enabledParam === null ? null : enabledParam === 'true';
    return json(res, 200, {ok:true, entitlements:engine.listEntitlements({projectId:url.searchParams.get('projectId'), enabled, limit:Number(url.searchParams.get('limit') || 200)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/entitlements'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.upsertEntitlement(body.projectId || body.input?.projectId || 'default', body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'POST' && pathname === '/api/platform/entitlements/check'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.checkEntitlement(body.projectId || body.input?.projectId || 'default', body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const recordsMatch = pathname.match(/^\/api\/platform\/records\/([^/]+)$/);
  if (req.method === 'GET' && recordsMatch){
    return json(res, 200, {ok:true, records:engine.listRecords({collection:decodeURIComponent(recordsMatch[1]), projectId:url.searchParams.get('projectId'), status:url.searchParams.get('status'), limit:Number(url.searchParams.get('limit') || 200)})});
  }

  if (req.method === 'POST' && recordsMatch){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.saveRecord(decodeURIComponent(recordsMatch[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/forms'){
    return json(res, 200, {ok:true, forms:engine.listForms({projectId:url.searchParams.get('projectId'), status:url.searchParams.get('status'), limit:Number(url.searchParams.get('limit') || 100)})});
  }

  if (req.method === 'POST' && pathname === '/api/platform/forms'){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.saveForm(body.projectId || body.input?.projectId || 'default', body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const formSubmit = pathname.match(/^\/api\/platform\/forms\/([^/]+)\/submit$/);
  if (req.method === 'POST' && formSubmit){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.submitForm(decodeURIComponent(formSubmit[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  const graphRun = pathname.match(/^\/api\/platform\/workflow-builder\/graphs\/([^/]+)\/run$/);
  if (req.method === 'POST' && graphRun){
    const body = await readValidatedJson(req, pathname);
    const result = await engine.runWorkflowGraph(decodeURIComponent(graphRun[1]), body, await claimsFrom(req, body));
    return json(res, result.ok ? 200 : 409, result);
  }

  if (req.method === 'GET' && pathname === '/api/platform/scorecard'){
    return json(res, 200, engine.platformScorecard(url.searchParams.get('projectId') || 'default'));
  }

  if (req.method === 'POST' && pathname === '/api/platform/smoke'){
    const result = await runSmoke(engine);
    return json(res, result.ok ? 200 : 500, result);
  }

  if (req.method === 'GET'){
    const target = pathname === '/' ? '/index.html' : (pathname === '/app' || pathname === '/app/' ? '/app/index.html' : pathname);
    return staticFile(res, target);
  }

  return json(res, 404, {ok:false, error:'not_found', path:pathname});
}

async function runSmoke(engine){
  const claims = {sub:'smoke-user', email:'smoke@local.test', roles:['owner'], projectRoles:{default:['owner']}};
  const project = await engine.upsertProject({id:'default', name:'Default Workspace', slug:'default'}, claims);
  const installs = [];
  for (const providerId of ['stripe','resend','neon','openai_gateway']){
    installs.push(await engine.installProvider('default', {providerId, enabled:true, secretRef:`vault:default:${providerId}:smoke`}, claims));
  }
  const checkout = await engine.runWorkflow('checkout_email_link', {claims, input:{projectId:'default', to:'smoke@local.test', amountCents:1300, productName:'Smoke test checkout'}});
  const db = await engine.runWorkflow('db_query_ai_summary', {claims, input:{projectId:'default', sql:'select 1 as smoke_check', maxTokens:500}});
  const job = await engine.enqueueJob({workflowId:'db_query_ai_summary', input:{projectId:'default', sql:'select 55 as api_smoke_job'}, runAt:new Date(Date.now()-1000).toISOString()}, claims);
  const jobRun = await engine.runJob(job.job.id, {claims});
  const schedule = await engine.upsertSchedule({workflowId:'db_query_ai_summary', input:{projectId:'default', sql:'select 56 as api_smoke_schedule'}, intervalMinutes:30, nextRunAt:new Date(Date.now()-1000).toISOString()}, claims);
  const scheduleTick = await engine.runDueSchedules({limit:5, claims});
  const drain = await engine.drainJobs({limit:5, claims});
  const ingested = await engine.ingestWebhook({projectId:'default', provider:'stripe', type:'checkout.session.completed', data:{id:'cs_smoke'}}, {claims});
  const replay = await engine.replayWebhook(ingested.event.id, {claims, approvals:{pol_webhook_replay:true}});
  const route = await engine.optimizeProviderRoute('default', {intent:'email', requireInstalled:false}, claims);
  const invoice = await engine.generateUsageInvoice('default', {customer:{name:'Smoke Client', email:'billing@local.test'}, period:{from:new Date(Date.now()-86400000).toISOString(), to:new Date(Date.now()+86400000).toISOString()}, minimumLineCents:13}, claims);
  const graph = await engine.saveWorkflowGraph('default', {title:'Smoke visual workflow', nodes:[{id:'n1', type:'trigger', label:'Lead captured'},{id:'n2', type:'provider', providerId:'openai_gateway', action:'score_fit'},{id:'n3', type:'provider', providerId:'neon', action:'write_crm_note'}], edges:[{from:'n1', to:'n2'},{from:'n2', to:'n3'}]}, claims);
  const exportBundle = await engine.exportProjectBundle('default', claims);
  const meters = engine.meterSummary({projectId:'default'});
  const runs = engine.listWorkflowRuns({projectId:'default', limit:20});
  const webhooks = engine.listWebhookEvents({projectId:'default', limit:20});
  const ok = project.ok && installs.every(i => i.ok) && checkout.ok && db.ok && jobRun.ok && schedule.ok && scheduleTick.ok && drain.count >= 1 && ingested.ok && replay.ok && route.ok && invoice.ok && graph.ok && exportBundle.ok && meters.totalEvents >= 4 && runs.length >= 4 && webhooks.length >= 1;
  return {ok, mode:engine.mode(), project, installs, checkout, db, job, jobRun, schedule, scheduleTick, drain, ingested, replay, route, invoice:{ok:invoice.ok, invoice:invoice.invoice}, graph:{ok:graph.ok, graph:graph.graph}, exportBundle:{ok:exportBundle.ok,bundle:exportBundle.bundle}, meters, runs, webhooks, receipts:engine.receiptsList(20)};
}

async function staticFile(res, pathname){
  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root) || !existsSync(file)) return json(res, 404, {ok:false, error:'file_not_found'});
  const ext = path.extname(file);
  const mime = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : ext === '.json' ? 'application/json; charset=utf-8' : 'application/octet-stream';
  res.writeHead(200, {'Content-Type':mime, 'Cache-Control':'no-store'});
  res.end(await readFile(file));
}

async function claimsFrom(req, body){
  if (req.__codestudioClaims) return req.__codestudioClaims;
  const claims = await claimsFromRequest(req, body || {});
  if (claims) req.__codestudioClaims = claims;
  return claims;
}

async function readValidatedJson(req, pathname){
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let parsed = {};
  if (raw.trim()){
    try { parsed = JSON.parse(raw); }
    catch { const err = new Error('Invalid JSON body'); err.status = 400; throw err; }
  }
  Object.defineProperty(parsed, '__rawBody', {value:raw, enumerable:false});
  const validation = validateBodyForRoute(req.method, pathname, parsed);
  if (!validation.ok){ const err = new Error(validation.error); err.status = validation.status || 400; throw err; }
  return parsed;
}

function json(res, status, payload){
  setCors(res);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
  res.end(JSON.stringify(payload, null, 2));
}

function setCors(res){
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, x-kaixu-claims, x-kaixu-claims-ts, x-kaixu-claims-signature, x-codestudio-webhook-signature, stripe-signature, svix-id, svix-timestamp, svix-signature');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

if (import.meta.url === `file://${process.argv[1]}`){
  const {server} = await createServer();
  server.listen(port, () => {
    console.log(`kAIxu CodeStudio Platform Engine listening on http://localhost:${port}`);
    console.log(`mode=${process.env.CODESTUDIO_PROVIDER_MODE || 'live'} receipts=${process.env.CODESTUDIO_RECEIPT_DIR || './receipts'}`);
  });
}
