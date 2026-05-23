import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { createServer } from '../server/http-server.mjs';

if (process.argv.includes('--syntax-only')) process.exit(0);

const root = process.cwd();
process.env.CODESTUDIO_PROVIDER_MODE = process.env.CODESTUDIO_PROVIDER_MODE || 'fixture';
process.env.CODESTUDIO_RECEIPT_DIR = process.env.CODESTUDIO_RECEIPT_DIR || './receipts/smoke';
process.env.CODESTUDIO_DATA_DIR = process.env.CODESTUDIO_DATA_DIR || './data/smoke';
process.env.CODESTUDIO_CORS_ORIGIN = '*';
await fs.rm(path.join(root, process.env.CODESTUDIO_DATA_DIR), {recursive:true, force:true});
await fs.rm(path.join(root, process.env.CODESTUDIO_RECEIPT_DIR), {recursive:true, force:true});

const {server, engine} = await createServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const {port} = server.address();
const base = `http://127.0.0.1:${port}`;

const report = {
  ok:false,
  ts:new Date().toISOString(),
  mode:process.env.CODESTUDIO_PROVIDER_MODE,
  base,
  checks:[],
};

try{
  await check('health route returns provider probes', async () => {
    const res = await get('/api/health');
    assert(res.ok === true, 'health ok false');
    assert(res.providers?.stripe?.ok === true, 'stripe fixture probe not ok');
    return {providers:Object.keys(res.providers || {})};
  });

  await check('provider probe route is executable', async () => {
    const res = await get('/api/platform/providers/probe');
    assert(res.ok === true, 'probe ok false');
    assert(res.providers?.resend?.mode === 'fixture', 'resend not fixture mode');
    return {mode:res.mode, providerCount:Object.keys(res.providers || {}).length};
  });


  await check('OpenAPI document and action registry are exposed', async () => {
    const api = await get('/api/platform/openapi.json');
    assert(api.openapi === '3.1.0', 'openapi version missing');
    assert(api.paths?.['/api/platform/workflows/{workflowId}/run']?.post, 'workflow run path missing from OpenAPI');
    const health = await get('/api/health');
    assert((health.actions || []).some(a => a.name === 'create_checkout_session'), 'action registry missing checkout action');
    assert((health.storage?.available || []).some(a => a.id === 'postgres'), 'storage adapter catalog missing postgres');
    return {pathCount:Object.keys(api.paths || {}).length, actionCount:health.actions.length, storageAdapters:health.storage.available.map(a => a.id)};
  });

  await check('active storage adapter verifies with real write/read contract', async () => {
    const before = await get('/api/platform/storage');
    assert(before.ok === true && before.active?.id === 'json', 'active storage adapter should be json in fixture smoke');
    const verified = await post('/api/platform/storage/verify', {claims:{roles:['owner'], projectRoles:{default:['owner']}}});
    assert(verified.ok === true && verified.after?.auditEvents > verified.before?.auditEvents, 'storage verify did not write audit state');
    return {active:before.active.id, adapters:before.available.map(a => a.id), auditBefore:verified.before.auditEvents, auditAfter:verified.after.auditEvents};
  });

  await check('signed upstream claims are verified when secret is present', async () => {
    const oldSecret = process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET;
    process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET = 'smoke-claims-secret';
    try{
      const claims = {sub:'signed-smoke', email:'signed@local.test', roles:['owner'], projectRoles:{default:['owner']}};
      const res = await signedPost('/api/platform/projects', {id:'signed-smoke-project', name:'Signed Smoke Project', slug:'signed-smoke-project'}, claims, process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET);
      assert(res.ok === true && res.project?.id === 'signed-smoke-project', 'signed claims project upsert failed');
      const bad = await fetch(base + '/api/platform/projects', {method:'POST', headers:{'Content-Type':'application/json', ...signedHeaders(claims, 'wrong-secret')}, body:JSON.stringify({id:'bad-signed-project', name:'Bad Signed Project'})});
      assert(bad.status === 401, 'bad signed claims should return 401');
      return {verifiedProject:res.project.id, badStatus:bad.status};
    } finally {
      if (oldSecret) process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET = oldSecret;
      else delete process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET;
    }
  });

  await check('file-based provider pack catalog loads', async () => {
    const res = await get('/api/platform/provider-packs');
    assert(res.ok === true, 'provider pack catalog failed');
    assert((res.packs || []).filter(p => p.source && String(p.source).startsWith('file:')).length >= 8, 'file provider packs missing');
    assert((res.packs || []).every(p => p.valid !== false), 'invalid provider pack present');
    return {packCount:res.packs.length, filePackCount:res.packs.filter(p => String(p.source || '').startsWith('file:')).length};
  });

  await check('provider-pack routes are registered as first-class actions', async () => {
    const health = await get('/api/health');
    const names = new Set((health.actions || []).map(a => a.name));
    assert(names.has('stripe.checkout.create'), 'stripe.checkout.create provider-pack action missing');
    assert(names.has('resend.email.send'), 'resend.email.send provider-pack action missing');
    assert((health.providerPackActions || []).length >= 8, 'provider pack action registration list too small');
    return {registeredProviderPackActions:health.providerPackActions.length};
  });

  await check('project control plane creates and lists projects', async () => {
    const created = await post('/api/platform/projects', {claims:{roles:['owner'], projectRoles:{default:['owner']}}, id:'default', name:'Default Workspace', slug:'default'});
    assert(created.ok === true && created.project?.id === 'default', 'default project upsert failed');
    const listed = await get('/api/platform/projects');
    assert(listed.ok === true && (listed.projects || []).some(p => p.id === 'default'), 'project list missing default');
    return {projectCount:listed.projects.length, store:listed.store};
  });

  await check('provider packs install per project', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const providers = ['stripe','resend','neon','openai_gateway'];
    const installs = [];
    for (const providerId of providers){
      installs.push(await post(`/api/platform/projects/default/providers/${providerId}`, {claims, enabled:true, secretRef:`vault:default:${providerId}:smoke`}));
    }
    assert(installs.every(x => x.ok === true), 'one or more provider installs failed');
    const listed = await get('/api/platform/projects/default/providers');
    assert((listed.installs || []).filter(x => x.enabled).length >= providers.length, 'enabled provider installs missing');
    return {enabled:(listed.installs || []).filter(x => x.enabled).map(x => x.providerId)};
  });

  await check('file provider pack install endpoint works', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const res = await post('/api/platform/projects/default/provider-packs/twilio/install', {claims, enabled:false, secretRef:'vault:default:twilio:smoke'});
    assert(res.ok === true, 'provider pack install failed');
    assert(res.install?.providerId === 'twilio', 'wrong provider installed from pack');
    return {providerId:res.install.providerId, enabled:res.install.enabled, routes:res.install.routes};
  });


  await check('provider-pack declared action runs through action registry', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const res = await post('/api/platform/provider-packs/stripe/actions/checkout.create/run', {claims, projectId:'default', input:{amountCents:1313, productName:'Provider Pack Smoke'}});
    assert(res.ok === true, 'provider-pack action failed');
    assert(res.result?.fixture === true, 'provider-pack action did not execute fixture adapter');
    assert(res.steps?.some(s => s.action === 'checkout.create'), 'provider-pack action step not recorded');
    return {providerId:res.providerId, route:res.route, runId:res.runId};
  });

  await check('static app route serves platform UI', async () => {
    const res = await fetch(base + '/app/');
    const text = await res.text();
    assert(res.ok === true, 'app route did not return 200');
    assert(text.includes('Platform'), 'platform UI marker missing');
    return {status:res.status, bytes:text.length};
  });

  await check('workflow preflight enforces upstream claims', async () => {
    const res = await post('/api/platform/preflight', {templateId:'checkout_email_link', claims:{roles:['viewer']}, input:{projectId:'default', amountCents:999}}).catch(e => e.payload);
    assert(res.ok === false, 'viewer should be blocked');
    assert(JSON.stringify(res).includes('role_blocked') || JSON.stringify(res).includes('project_access_blocked'), 'role/project block missing');
    return {blocked:true};
  });

  await check('checkout_email_link executes fixture adapter chain', async () => {
    const res = await post('/api/platform/workflows/checkout_email_link/run', {claims:{sub:'smoke', email:'smoke@local.test', roles:['owner']}, input:{projectId:'default', to:'smoke@local.test', amountCents:1300, productName:'Smoke Checkout'}});
    assert(res.ok === true, 'workflow did not run');
    assert(res.output?.checkout?.fixture === true, 'stripe fixture output missing');
    assert(res.output?.email?.fixture === true, 'resend fixture output missing');
    return {paymentLink:res.output.paymentLink, receiptId:res.receipt?.id};
  });

  await check('database + AI summary executes fixture adapter chain', async () => {
    const res = await post('/api/platform/workflows/db_query_ai_summary/run', {claims:{roles:['owner']}, input:{projectId:'default', sql:'select 1 as smoke_check', maxTokens:500}});
    assert(res.ok === true, 'db summary workflow did not run');
    assert(res.output?.db?.fixture === true, 'neon fixture output missing');
    assert(res.output?.summary?.fixture === true, 'ai fixture output missing');
    return {receiptId:res.receipt?.id};
  });

  await check('metering records workflow provider usage', async () => {
    const res = await get('/api/platform/meters?projectId=default&limit=50');
    assert(res.ok === true, 'meters route failed');
    assert(res.summary?.totalEvents >= 4, 'meter events missing after workflows');
    const providers = new Set((res.summary.byProvider || []).map(p => p.providerId));
    assert(providers.has('stripe') && providers.has('resend') && providers.has('neon') && providers.has('openai_gateway'), 'expected providers missing from meter summary');
    return {totalEvents:res.summary.totalEvents, providers:[...providers]};
  });


  await check('provider routing optimizer selects a ready route', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const res = await post('/api/platform/provider-router/optimize', {claims, projectId:'default', intent:'email', requireInstalled:false});
    assert(res.ok === true, 'provider router did not select');
    assert(res.selected?.providerId === 'resend', 'email route should select resend in fixture');
    const decisions = await get('/api/platform/provider-router?projectId=default&limit=10');
    assert((decisions.decisions || []).some(d => d.id === res.decision.id), 'route decision not persisted');
    return {selected:res.selected.providerId, decisionId:res.decision.id};
  });

  await check('usage invoice generator builds invoice from meters', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const res = await post('/api/platform/projects/default/invoices/generate', {claims, customer:{name:'Smoke Client', email:'billing@local.test'}, minimumLineCents:13, period:{from:new Date(Date.now()-86400000).toISOString(), to:new Date(Date.now()+86400000).toISOString()}});
    assert(res.ok === true && res.invoice?.id, 'invoice not generated');
    assert((res.invoice.lineItems || []).length >= 1, 'invoice line items missing');
    const invoices = await get('/api/platform/invoices?projectId=default&limit=10');
    assert((invoices.invoices || []).some(i => i.id === res.invoice.id), 'invoice not persisted');
    return {invoiceNumber:res.invoice.invoiceNumber, totalCents:res.invoice.totalCents, lines:res.invoice.lineItems.length};
  });

  await check('visual workflow graph builder validates and compiles graph', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const graph = {title:'Smoke visual graph', nodes:[{id:'lead', type:'trigger', label:'Lead captured'},{id:'score', type:'provider', providerId:'openai_gateway', action:'score_fit'},{id:'crm', type:'provider', providerId:'neon', action:'write_crm_note'}], edges:[{from:'lead', to:'score'},{from:'score', to:'crm'}]};
    const res = await post('/api/platform/workflow-builder/graphs', {claims, projectId:'default', graph});
    assert(res.ok === true && res.graph?.id, 'graph save failed');
    assert(res.compiledWorkflow?.requiredProviders?.includes('openai_gateway'), 'compiled provider missing');
    const graphs = await get('/api/platform/workflow-builder/graphs?projectId=default&limit=10');
    assert((graphs.graphs || []).some(g => g.id === res.graph.id), 'graph not persisted');
    return {graphId:res.graph.id, nodes:res.graph.nodes.length, compiledProviders:res.compiledWorkflow.requiredProviders};
  });

  await check('visual workflow graph runner executes compiled graph steps', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const graphs = await get('/api/platform/workflow-builder/graphs?projectId=default&limit=10');
    const graph = (graphs.graphs || [])[0];
    assert(graph?.id, 'no graph available to run');
    const res = await post(`/api/platform/workflow-builder/graphs/${graph.id}/run`, {claims, input:{projectId:'default', sql:'select 57 as visual_graph', prompt:'Score this visual workflow smoke test'}});
    assert(res.ok === true && res.runId, 'graph runner did not execute');
    assert((res.steps || []).length >= 2, 'graph runner steps missing');
    return {graphId:graph.id, runId:res.runId, steps:res.steps.length};
  });

  await check('forms, records, and submission workflow are executable', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const form = await post('/api/platform/forms', {claims, projectId:'default', title:'Lead intake smoke form', fields:[{name:'email', type:'email', required:true},{name:'company', type:'text', required:true}], submitWorkflowId:'qualify_lead'});
    assert(form.ok === true && form.form?.id, 'form save failed');
    const submitted = await post(`/api/platform/forms/${form.form.id}/submit`, {claims, data:{email:'lead@local.test', company:'Smoke Co', projectId:'default'}});
    assert(submitted.ok === true && submitted.record?.id, 'form submit failed');
    const records = await get('/api/platform/records/form-submissions?projectId=default&limit=10');
    assert((records.records || []).some(r => r.id === submitted.record.id), 'submission record missing');
    return {formId:form.form.id, recordId:submitted.record.id, workflowOk:submitted.workflow?.ok};
  });

  await check('entitlement gates meter usage and open incidents on hard blocks', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const ent = await post('/api/platform/entitlements', {claims, projectId:'default', key:'workflow_runs', enabled:true, limit:1, used:0});
    assert(ent.ok === true, 'entitlement upsert failed');
    const first = await post('/api/platform/entitlements/check', {claims, projectId:'default', key:'workflow_runs', quantity:1});
    assert(first.ok === true, 'first entitlement consume should pass');
    const second = await post('/api/platform/entitlements/check', {claims, projectId:'default', key:'workflow_runs', quantity:1}).catch(e => e.payload);
    assert(second.ok === false && second.reason === 'entitlement_limit_exceeded', 'second entitlement consume should block');
    const incidents = await get('/api/platform/incidents?projectId=default&limit=20');
    assert((incidents.incidents || []).some(i => i.source === 'entitlement_gate'), 'entitlement incident missing');
    return {entitlementKey:ent.entitlement.key, firstOk:first.ok, secondReason:second.reason};
  });

  await check('incident center and audit trail persist operational receipts', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const opened = await post('/api/platform/incidents', {claims, projectId:'default', title:'Smoke incident', severity:'low', source:'smoke'});
    assert(opened.ok === true && opened.incident?.id, 'incident open failed');
    const resolved = await post(`/api/platform/incidents/${opened.incident.id}/resolve`, {claims, note:'Smoke resolved'});
    assert(resolved.ok === true && resolved.incident?.status === 'resolved', 'incident resolve failed');
    const audit = await get('/api/platform/audit?projectId=default&limit=50');
    assert((audit.events || []).some(e => e.action === 'incident.opened'), 'incident audit missing');
    assert((audit.events || []).some(e => e.action === 'incident.resolved'), 'resolve audit missing');
    return {incidentId:opened.incident.id, auditEvents:audit.events.length};
  });

  await check('project scorecard summarizes platform health from real state', async () => {
    const res = await get('/api/platform/scorecard?projectId=default');
    assert(res.ok === true, 'scorecard failed');
    assert(Number.isFinite(res.score), 'score missing');
    assert(res.runs >= 1, 'scorecard run count missing');
    return {score:res.score, runSuccessRate:res.runSuccessRate, openIncidents:res.openIncidents};
  });

  await check('job queue can enqueue and execute workflow jobs', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const queued = await post('/api/platform/jobs', {claims, workflowId:'db_query_ai_summary', input:{projectId:'default', sql:'select 13 as queued_job'}, runAt:new Date(Date.now()-1000).toISOString()});
    assert(queued.ok === true && queued.job?.id, 'job enqueue failed');
    const ran = await post(`/api/platform/jobs/${queued.job.id}/run`, {claims});
    assert(ran.ok === true && ran.job?.status === 'completed', 'job run did not complete');
    const jobs = await get('/api/platform/jobs?projectId=default&limit=20');
    assert((jobs.jobs || []).some(j => j.id === queued.job.id), 'job list missing executed job');
    return {jobId:queued.job.id, status:ran.job.status};
  });


  await check('queue lock lease can be extended for a running job', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const queued = await post('/api/platform/jobs', {claims, workflowId:'db_query_ai_summary', input:{projectId:'default', sql:'select 14 as lock_job'}, runAt:new Date(Date.now()-1000).toISOString()});
    const locked = await engine.data.lockJob(queued.job.id, {lockId:'smoke-lock', ttlMs:1000});
    assert(locked?.status === 'running', 'manual lock failed');
    const extended = await post(`/api/platform/jobs/${queued.job.id}/extend-lock`, {claims, lockId:'smoke-lock', ttlMs:120000});
    assert(extended.ok === true && Date.parse(extended.job.lockExpiresAt) > Date.now()+30000, 'lock extension failed');
    await post(`/api/platform/jobs/${queued.job.id}/cancel`, {claims, reason:'cleanup_lock_extension_smoke'});
    return {jobId:queued.job.id, lockExpiresAt:extended.job.lockExpiresAt};
  });

  await check('queue supports cancellation and stale-lock recovery routes', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const queued = await post('/api/platform/jobs', {claims, workflowId:'db_query_ai_summary', input:{projectId:'default', sql:'select 999 as cancel_job'}, runAt:new Date(Date.now()+60000).toISOString()});
    const cancelled = await post(`/api/platform/jobs/${queued.job.id}/cancel`, {claims, reason:'smoke_cancel'});
    assert(cancelled.ok === true && cancelled.job?.status === 'cancelled', 'job cancel failed');
    const recovered = await post('/api/platform/jobs/recover', {claims});
    assert(recovered.ok === true, 'stale recovery route failed');
    const dead = await get('/api/platform/dead-letters?projectId=default&limit=10');
    assert(dead.ok === true && Array.isArray(dead.deadLetters), 'dead-letter route failed');
    return {cancelled:cancelled.job.id, recovered:recovered.recovered.length, deadLetters:dead.deadLetters.length};
  });

  await check('dead-letter jobs can be retried as new queued jobs', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const doomed = await post('/api/platform/jobs', {claims, workflowId:'missing_workflow_for_dead_letter', input:{projectId:'default'}, runAt:new Date(Date.now()-1000).toISOString(), maxAttempts:1});
    const ran = await post(`/api/platform/jobs/${doomed.job.id}/run`, {claims}).catch(e => e.payload);
    assert(ran.ok === false, 'doomed job should fail');
    const dead = await get('/api/platform/dead-letters?projectId=default&limit=20');
    const letter = (dead.deadLetters || []).find(d => d.jobId === doomed.job.id);
    assert(letter?.id, 'dead letter not created');
    const retried = await post(`/api/platform/dead-letters/${letter.id}/retry`, {claims, runAt:new Date(Date.now()+3600000).toISOString()});
    assert(retried.ok === true && retried.job?.status === 'queued' && retried.job?.retriedFromDeadLetterId === letter.id, 'dead-letter retry failed');
    return {deadLetterId:letter.id, retryJobId:retried.job.id};
  });

  await check('schedules tick into queued jobs and drain', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const schedule = await post('/api/platform/schedules', {claims, workflowId:'db_query_ai_summary', intervalMinutes:15, nextRunAt:new Date(Date.now()-1000).toISOString(), input:{projectId:'default', sql:'select 27 as scheduled_job'}});
    assert(schedule.ok === true && schedule.schedule?.id, 'schedule upsert failed');
    const tick = await post('/api/platform/schedules/tick', {claims, limit:5});
    assert(tick.ok === true && tick.enqueued?.length >= 1, 'schedule tick did not enqueue');
    const drain = await post('/api/platform/jobs/drain', {claims, limit:5});
    assert(drain.count >= 1, 'drain did not process scheduled job');
    return {scheduleId:schedule.schedule.id, enqueued:tick.enqueued.length, drained:drain.count};
  });

  await check('webhook ingest verifies/idempotency-gates and replay writes receipts', async () => {
    const payload = {projectId:'default', provider:'stripe', type:'checkout.session.completed', data:{id:'cs_smoke'}};
    const ingested = await post('/api/platform/webhooks/ingest', {claims:{roles:['owner']}, payload});
    assert(ingested.ok === true && ingested.event?.id, 'webhook not ingested');
    const duplicate = await post('/api/platform/webhooks/ingest', {claims:{roles:['owner']}, payload});
    assert(duplicate.ok === true && duplicate.duplicate === true, 'webhook duplicate was not idempotency-gated');
    const replay = await post(`/api/platform/webhooks/${ingested.event.id}/replay`, {claims:{roles:['owner']}, approvals:{pol_webhook_replay:true}});
    assert(replay.ok === true, 'webhook replay failed');
    return {eventId:ingested.event.id, duplicate:duplicate.duplicate, replayReceiptId:replay.receipt?.id, verification:ingested.event.verification};
  });

  await check('webhook replay dispatches mapped workflow instead of only flipping status', async () => {
    const rules = await get('/api/platform/webhooks/dispatch-rules');
    assert((rules.rules || []).some(r => r.provider === 'stripe' && r.type === 'checkout.session.completed'), 'stripe dispatch rule missing');
    const payload = {projectId:'default', provider:'stripe', type:'checkout.session.completed', data:{id:'cs_dispatch_smoke'}};
    const ingested = await post('/api/platform/webhooks/ingest', {claims:{roles:['owner']}, payload});
    const replay = await post(`/api/platform/webhooks/${ingested.event.id}/replay`, {claims:{roles:['owner']}, approvals:{pol_webhook_replay:true}});
    assert(replay.dispatch?.ok === true && replay.dispatch?.workflowId === 'db_query_ai_summary', 'dispatch workflow did not run');
    assert(replay.event?.status === 'dispatched_ran', 'webhook status did not reflect dispatch');
    return {ruleId:replay.dispatch.ruleId, workflowId:replay.dispatch.workflowId, runId:replay.dispatch.runId};
  });

  await check('workflow run history and webhook queue are persisted', async () => {
    const runs = await get('/api/platform/runs?projectId=default&limit=20');
    assert(runs.ok === true && (runs.runs || []).length >= 2, 'workflow run history missing');
    const webhooks = await get('/api/platform/webhooks?projectId=default&limit=20');
    assert(webhooks.ok === true && (webhooks.events || []).length >= 1, 'webhook queue missing');
    return {runCount:runs.runs.length, webhookCount:webhooks.events.length};
  });

  await check('approval queue opens for blocked expensive workflow', async () => {
    const blocked = await post('/api/platform/workflows/checkout_email_link/run', {claims:{roles:['owner'], projectRoles:{default:['owner']}}, input:{projectId:'default', to:'smoke@local.test', amountCents:9999999, productName:'Approval Required'}}).catch(e => e.payload);
    assert(blocked.ok === false && blocked.blocked === true, 'expensive workflow should be blocked');
    const approvals = await get('/api/platform/approvals?projectId=default&status=open&limit=20');
    assert(approvals.ok === true && (approvals.approvals || []).length >= 1, 'open approval not recorded');
    return {approvalId:approvals.approvals[0].id, approvalCount:approvals.approvals.length};
  });

  await check('project export/import bundle migration works', async () => {
    const claims = {roles:['owner'], projectRoles:{default:['owner']}};
    const exported = await post('/api/platform/projects/default/export', {claims});
    assert(exported.ok === true && exported.bundle?.hash && exported.data?.schema === 'kaixu-codestudio-project-bundle-v1', 'project export failed');
    const imported = await post('/api/platform/import', {claims, bundle:{...exported.data, project:{...exported.data.project, id:'default-imported', name:'Imported Smoke Workspace', slug:'default-imported'}}});
    assert(imported.ok === true && imported.project?.id === 'default-imported', 'project import failed');
    const bundles = await get('/api/platform/bundles?projectId=default&limit=20');
    assert((bundles.bundles || []).length >= 1, 'bundle list missing export');
    return {bundleId:exported.bundle.id, importId:imported.importRecord.id, hash:exported.bundle.hash.slice(0,12)};
  });

  await check('receipt list includes executable proof', async () => {
    const res = await get('/api/platform/receipts?limit=20');
    assert(res.ok === true, 'receipts route failed');
    assert((res.receipts || []).length >= 4, 'not enough receipts written');
    return {receiptCount:res.receipts.length, receiptTypes:[...new Set(res.receipts.map(r => r.type))]};
  });

  report.ok = report.checks.every(c => c.ok);
} finally {
  await new Promise(resolve => server.close(resolve));
  report.receiptCount = engine.receiptsList(1000).length;
  await fs.mkdir(path.join(root, 'platform/proof'), {recursive:true});
  await fs.writeFile(path.join(root, 'platform/proof/backend-smoke-report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(root, 'platform/proof/backend-smoke-receipts.json'), JSON.stringify(engine.receiptsList(1000), null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

async function check(name, fn){
  const entry = {name, ok:false, ts:new Date().toISOString()};
  try{
    entry.detail = await fn();
    entry.ok = true;
  }catch(error){
    entry.error = error.message;
    if (error.payload) entry.payload = error.payload;
  }
  report.checks.push(entry);
  if (!entry.ok) throw new Error(`${name}: ${entry.error}`);
}
async function get(pathname){
  const res = await fetch(base + pathname);
  const json = await res.json();
  if (!res.ok){ const e = new Error(`GET ${pathname} failed ${res.status}`); e.payload = json; throw e; }
  return json;
}
async function post(pathname, body){
  const res = await fetch(base + pathname, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const json = await res.json();
  if (!res.ok){ const e = new Error(`POST ${pathname} failed ${res.status}`); e.payload = json; throw e; }
  return json;
}

async function signedPost(pathname, body, claims, secret){
  const res = await fetch(base + pathname, {method:'POST', headers:{'Content-Type':'application/json', ...signedHeaders(claims, secret)}, body:JSON.stringify(body)});
  const json = await res.json();
  if (!res.ok){ const e = new Error(`POST ${pathname} failed ${res.status}`); e.payload = json; throw e; }
  return json;
}
function signedHeaders(claims, secret){
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const ts = String(Date.now());
  const sig = createHmac('sha256', secret).update(`${ts}.${encoded}`).digest('base64url');
  return {'x-kaixu-claims':encoded, 'x-kaixu-claims-ts':ts, 'x-kaixu-claims-signature':sig};
}

function assert(cond, msg){ if (!cond) throw new Error(msg); }
