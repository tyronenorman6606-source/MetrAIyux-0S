import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createProviderRegistry } from './adapters/provider-registry.mjs';
import { ReceiptStore } from './lib/receipts.mjs';
import { ProviderPackLoader } from './lib/plugin-loader.mjs';
import { canAccessProject, projectIdFrom } from './lib/data-store.mjs';
import { enforcePolicy, normalizeClaims, canRun } from './lib/policy.mjs';
import { id, nowISO, sha256 } from './lib/ids.mjs';
import { createActionRegistry } from './lib/action-registry.mjs';
import { createDataStore, storageAdapterCatalog, verifyStorageAdapterSelection } from './lib/storage-adapters.mjs';
import { makeWebhookIdempotencyKey } from './lib/webhooks.mjs';

const ROOT = process.cwd();

export async function loadJson(file, fallback){
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

export async function loadPlatformManifest(root=ROOT){
  const manifest = await loadJson(path.join(root, 'platform/platform-manifest.json'), null);
  const providers = await loadJson(path.join(root, 'platform/providers/provider-manifest.json'), []);
  const policies = await loadJson(path.join(root, 'platform/policies/policy-rules.json'), []);
  const workflows = await loadJson(path.join(root, 'platform/workflows/workflow-registry.json'), []);
  const claims = await loadJson(path.join(root, 'platform/upstream/claims.example.json'), {roles:['owner']});
  const releaseGates = await loadJson(path.join(root, 'platform/releases/release-gates.json'), []);
  return {
    schema:'kaixu-platform-executable-v1',
    loadedAt:nowISO(),
    source: manifest ? 'platform/platform-manifest.json' : 'split manifests',
    providers: manifest?.providers?.length ? manifest.providers : providers,
    policyRules: manifest?.policyRules?.length ? manifest.policyRules : policies,
    workflows: manifest?.workflows?.length ? manifest.workflows : workflows,
    upstreamClaimsSample: manifest?.upstreamClaimsSample || claims,
    releaseGates: manifest?.releaseGates?.length ? manifest.releaseGates : releaseGates,
  };
}

const BUILTIN_WORKFLOWS = Object.freeze({
  send_invoice: {
    id:'send_invoice', title:'Send invoice', category:'Money', requiredProviders:['stripe','resend'],
    steps:['create_checkout_session','email_payment_link','write_receipt'], output:'payment_link'
  },
  checkout_email_link: {
    id:'checkout_email_link', title:'Checkout + email link', category:'Sales', requiredProviders:['stripe','resend'],
    steps:['create_checkout_session','email_link','audit_receipt'], output:'checkout_url'
  },
  qualify_lead: {
    id:'qualify_lead', title:'Qualify lead', category:'Sales', requiredProviders:['openai_gateway','neon'],
    steps:['normalize_lead','score_fit','write_crm_note'], output:'lead_score'
  },
  db_query_ai_summary: {
    id:'db_query_ai_summary', title:'DB query + AI summary', category:'Data', requiredProviders:['neon','openai_gateway'],
    steps:['run_readonly_query','summarize_rows','export_summary'], output:'summary_markdown'
  },
  book_appointment: {
    id:'book_appointment', title:'Book appointment', category:'Ops', requiredProviders:['google_ops','resend'],
    steps:['check_calendar','create_event','email_confirmation'], output:'calendar_event'
  },
  legal_review_intake: {
    id:'legal_review_intake', title:'Document review intake', category:'Partner review', requiredProviders:['google_ops','resend'],
    steps:['capture_submission','save_to_drive','notify_partner_queue'], output:'review_packet'
  },
});

export class PlatformEngine {
  constructor({root=ROOT, receiptDir=process.env.CODESTUDIO_RECEIPT_DIR || './receipts'}={}){
    this.root = root;
    this.registry = createProviderRegistry();
    this.receipts = new ReceiptStore(path.resolve(root, receiptDir));
    this.data = createDataStore({root});
    this.packLoader = new ProviderPackLoader({root});
    this.webhookInbox = [];
    this.manifest = null;
    this.providerPackActions = [];
    this.webhookDispatchRules = [];
    this.actionRegistry = createActionRegistry({providerRegistry:this.registry, receipts:this.receipts});
  }
  async init(){
    await this.receipts.init();
    await this.data.init();
    this.manifest = await loadPlatformManifest(this.root);
    this.providerPackActions = this.actionRegistry.registerProviderPackActions(await this.listProviderPacks());
    this.webhookDispatchRules = await loadJson(path.join(this.root, 'platform/webhooks/webhook-dispatch-rules.json'), []);
    return this;
  }
  mode(){ return String(process.env.CODESTUDIO_PROVIDER_MODE || 'live'); }
  health(){
    return {
      ok:true,
      app:'kAIxu CodeStudio Platform Engine',
      mode:this.mode(),
      now:nowISO(),
      providers:this.registry.probeAll(),
      workflows:Object.keys(BUILTIN_WORKFLOWS),
      actions:this.actionRegistry.list(),
      providerPackActions:this.providerPackActions,
      storage:{active:this.data.adapter || {id:'json'}, available:storageAdapterCatalog()},
      noAuthImplemented:true,
      upstreamClaimsRequired:true,
      dataStore:this.data.stats(),
      durableOps:['action_registry','provider_pack_executable_actions','signed_claim_verification','webhook_signature_idempotency','storage_adapters','locked_retry_queue','provider_pack_files','jobs','schedules','metering','project_export_import','workflow_graph_builder','provider_route_optimizer','invoice_generator','visual_graph_runner','audit_trail','incident_center','entitlement_gates','forms_and_records'],
    };
  }
  projectFromClaims(input={}, claims={}){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const projectId = projectIdFrom(input, normalized);
    const project = this.data.getProject(projectId);
    return {projectId, project, claims:normalized};
  }
  assertProjectAccess(project, claims, action='read'){
    if (!project) throw new Error('Project not found.');
    if (!canAccessProject(project, claims, action)) throw new Error(`Upstream claims blocked for ${action} on project ${project.id}.`);
  }
  listProjects(claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    return this.data.listProjects().filter(project => canAccessProject(project, normalized, 'read'));
  }
  async upsertProject(input={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    if (!canRun(normalized)) throw new Error('Upstream claims do not allow project writes.');
    const project = await this.data.upsertProject(input, normalized);
    const receipt = await this.receipts.write('project_upsert', {ok:true, projectId:project.id, name:project.name});
    return {ok:true, project, receipt};
  }
  listProviderInstalls(projectId='default', claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'read');
    return this.data.listProviderInstalls(project.id);
  }
  async installProvider(projectId='default', payload={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const pack = (await this.listProviderPacks()).find(p => p.id === payload.providerId) || null;
    const install = await this.data.installProvider({projectId:project.id, providerId:payload.providerId, secretRef:payload.secretRef, enabled:payload.enabled !== false, routes:payload.routes || pack?.routes || []});
    const receipt = await this.receipts.write('provider_install', {ok:true, projectId:project.id, providerId:install.providerId, secretRef:install.secretRef});
    return {ok:true, install, receipt};
  }
  async rotateProvider(projectId='default', providerId, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const install = await this.data.rotateProvider({projectId:project.id, providerId});
    const receipt = await this.receipts.write('provider_secret_ref_rotated', {ok:true, projectId:project.id, providerId, secretRef:install.secretRef});
    return {ok:true, install, receipt};
  }
  resolveWorkflow(templateId){
    const fromManifest = (this.manifest?.workflows || []).find(w => w.templateId === templateId || w.id === templateId);
    const builtin = BUILTIN_WORKFLOWS[templateId] || BUILTIN_WORKFLOWS[fromManifest?.templateId];
    if (!builtin && !fromManifest) return null;
    return {...builtin, ...fromManifest, templateId: fromManifest?.templateId || builtin.id, id: fromManifest?.id || builtin.id};
  }
  async preflight(templateId, {claims=null, input={}, approvals={}}={}){
    const workflow = this.resolveWorkflow(templateId);
    if (!workflow) return {ok:false, templateId, blocks:[{code:'unknown_workflow', message:'Workflow not found.'}]};
    const {projectId, project, claims:normalizedClaims} = this.projectFromClaims(input, claims || this.manifest?.upstreamClaimsSample);
    try { this.assertProjectAccess(project, normalizedClaims, 'run'); }
    catch(error){ return {ok:false, templateId, projectId, blocks:[{code:'project_access_blocked', message:error.message}]}; }
    const providerInstalls = this.data.listProviderInstalls(project.id);
    const enabledInstalls = new Set(providerInstalls.filter(p => p.enabled).map(p => p.providerId));
    const providerProbes = {};
    const missingProviders = [];
    for (const providerId of workflow.requiredProviders || []){
      const adapter = this.registry.get(providerId);
      const probe = adapter ? adapter.probe() : {ok:false, provider:providerId, missing:['adapter_missing']};
      providerProbes[providerId] = probe;
      if (!enabledInstalls.has(providerId)) missingProviders.push(`${providerId}:not_installed_on_project`);
      else if (!probe.ok) missingProviders.push(providerId);
    }
    const policy = enforcePolicy({manifest:this.manifest, workflow, input, claims:normalizedClaims, approvals});
    const ok = missingProviders.length === 0 && policy.ok;
    let approval = null;
    if (!ok && policy.blocks.some(b => b.code === 'approval_required' || String(b.code || '').includes('blocked'))){
      approval = await this.data.openApproval({projectId:project.id, reason:'workflow_preflight_blocked', subject:`${templateId} blocked`, requestedBy:normalizedClaims.email || normalizedClaims.sub || null, policy, payload:{templateId, input}});
    }
    const receipt = await this.receipts.write('workflow_preflight', {ok, mode:this.mode(), projectId:project.id, templateId, workflowId:workflow.id, missingProviders, providerProbes, providerInstalls, policy, approval});
    return {ok, mode:this.mode(), projectId:project.id, templateId, workflow, missingProviders, providerProbes, providerInstalls, policy, approval, receipt};
  }
  async runWorkflow(templateId, {input={}, claims=null, approvals={}}={}){
    const projectCtx = this.projectFromClaims(input, claims || this.manifest?.upstreamClaimsSample);
    const runRecord = await this.data.recordWorkflowRun({projectId:projectCtx.project?.id || projectCtx.projectId, templateId, requestedBy:projectCtx.claims.email || projectCtx.claims.sub || null, input, mode:this.mode(), engine:'action_registry'});
    const preflight = await this.preflight(templateId, {claims, input, approvals});
    if (!preflight.ok){
      const receipt = await this.receipts.write('workflow_run_blocked', {ok:false, mode:this.mode(), runId:runRecord.id, templateId, preflight});
      await this.data.updateWorkflowRun(runRecord.id, {status:'blocked', ok:false, preflight, receiptId:receipt.id});
      return {ok:false, blocked:true, runId:runRecord.id, preflight, receipt};
    }
    const workflow = preflight.workflow;
    const ctx = {input, claims:normalizeClaims(claims || this.manifest?.upstreamClaimsSample), outputs:{}, steps:[], workflow, engine:this};
    try{
      for (const step of workflow.steps || []){
        await this.actionRegistry.runStep(step, ctx);
      }
      const meters = await this.recordWorkflowMeters({projectId:preflight.projectId, templateId, workflow, runId:runRecord.id, ctx});
      const receipt = await this.receipts.write('workflow_run', {ok:true, mode:this.mode(), runId:runRecord.id, projectId:preflight.projectId, templateId, workflowId:workflow.id, actionRegistry:true, output:ctx.outputs, steps:ctx.steps, meters});
      await this.data.updateWorkflowRun(runRecord.id, {status:'completed', ok:true, projectId:preflight.projectId, output:ctx.outputs, steps:ctx.steps, meterEventIds:meters.map(m => m.id), receiptId:receipt.id, engine:'action_registry'});
      return {ok:true, mode:this.mode(), runId:runRecord.id, projectId:preflight.projectId, templateId, actionRegistry:true, output:ctx.outputs, steps:ctx.steps, meters, receipt};
    }catch(error){
      const receipt = await this.receipts.write('workflow_run_error', {ok:false, mode:this.mode(), runId:runRecord.id, projectId:preflight.projectId, templateId, error:{name:error.name, message:error.message}, steps:ctx.steps});
      await this.data.updateWorkflowRun(runRecord.id, {status:'error', ok:false, projectId:preflight.projectId, error:error.message, steps:ctx.steps, receiptId:receipt.id, engine:'action_registry'});
      return {ok:false, runId:runRecord.id, projectId:preflight.projectId, error:error.message, steps:ctx.steps, receipt};
    }
  }
  // Legacy step methods were removed in v5.9.0. Workflow execution now flows through server/lib/action-registry.mjs only.
  async ingestWebhook(payload, {claims=null, verification=null, rawBody=''}={}){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const projectId = projectIdFrom(payload || {}, normalized);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const provider = String(payload?.provider || verification?.provider || inferProvider(payload));
    const type = String(payload?.type || payload?.event || 'unknown.event');
    if (verification && verification.ok === false){
      const receipt = await this.receipts.write('webhook_ingest_blocked', {ok:false, mode:this.mode(), projectId:project.id, provider, type, verification});
      return {ok:false, blocked:true, reason:verification.reason || 'webhook_signature_invalid', verification, receipt};
    }
    const idempotencyKey = makeWebhookIdempotencyKey({provider, type, payload, rawBody:rawBody || JSON.stringify(payload || {})});
    const existing = this.data.findWebhookByIdempotencyKey?.(idempotencyKey);
    if (existing){
      const receipt = await this.receipts.write('webhook_ingest_duplicate', {ok:true, duplicate:true, mode:this.mode(), projectId:project.id, eventId:existing.id, idempotencyKey});
      return {ok:true, duplicate:true, event:existing, receipt};
    }
    const event = await this.data.addWebhookEvent({id:id('evt'), projectId:project.id, payload, provider, type, status:'queued', requestedBy:normalized.email || normalized.sub || null, idempotencyKey, verification:verification || {ok:false, mode:'not_supplied'}});
    this.webhookInbox = this.data.listWebhookEvents({limit:500});
    const receipt = await this.receipts.write('webhook_ingest', {ok:true, mode:this.mode(), projectId:project.id, event});
    return {ok:true, event, receipt};
  }
  async replayWebhook(eventId, {claims=null, approvals={}}={}){
    const event = this.data.getWebhookEvent(eventId);
    if (!event) return {ok:false, reason:'event_not_found'};
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(event.projectId || projectIdFrom(event.payload || {}, normalized));
    this.assertProjectAccess(project, normalized, 'run');
    const policy = enforcePolicy({manifest:this.manifest, workflow:null, input:{}, claims:normalized, approvals, liveReplay:this.mode() !== 'fixture'});
    if (!policy.ok){
      const approval = await this.data.openApproval({projectId:project.id, reason:'webhook_replay_blocked', subject:`Replay ${event.type}`, requestedBy:normalized.email || normalized.sub || null, policy, payload:{eventId}});
      const receipt = await this.receipts.write('webhook_replay_blocked', {ok:false, mode:this.mode(), projectId:project.id, eventId, policy, approval});
      return {ok:false, blocked:true, policy, approval, receipt};
    }
    const dispatch = await this.dispatchWebhookEvent(event, {claims:normalized, approvals});
    const updated = await this.data.updateWebhookEvent(eventId, {
      status:dispatch.ok ? (dispatch.mode === 'enqueue' ? 'dispatched_queued' : 'dispatched_ran') : (this.mode() === 'fixture' ? 'replayed_fixture' : 'replayed_live_ready'),
      replayedAt:nowISO(),
      replayedBy:normalized.email || normalized.sub || null,
      dispatch,
    });
    this.webhookInbox = this.data.listWebhookEvents({limit:500});
    const receipt = await this.receipts.write('webhook_replay', {ok:true, mode:this.mode(), projectId:project.id, event:updated, dispatch});
    return {ok:true, event:updated, dispatch, receipt};
  }

  listWebhookDispatchRules(){ return this.webhookDispatchRules.map(rule => ({...rule})); }

  async dispatchWebhookEvent(event, {claims=null, approvals={}}={}){
    const provider = String(event.provider || event.payload?.provider || '').toLowerCase();
    const type = String(event.type || event.payload?.type || event.payload?.event || '').toLowerCase();
    const rule = (this.webhookDispatchRules || []).find(r => r.enabled !== false && String(r.provider || '').toLowerCase() === provider && String(r.type || '').toLowerCase() === type);
    if (!rule) return {ok:false, reason:'no_dispatch_rule', provider, type};
    const input = {...(rule.inputMap || {}), projectId:event.projectId || 'default', webhookEventId:event.id, webhookPayload:event.payload};
    if (rule.mode === 'enqueue'){
      const queued = await this.enqueueJob({workflowId:rule.workflowId, input, approvals, runAt:nowISO(), maxAttempts:rule.maxAttempts || 3}, claims);
      return {ok:queued.ok, mode:'enqueue', ruleId:rule.id, workflowId:rule.workflowId, jobId:queued.job?.id, receiptId:queued.receipt?.id};
    }
    const run = await this.runWorkflow(rule.workflowId, {input, claims, approvals});
    return {ok:run.ok, mode:'run', ruleId:rule.id, workflowId:rule.workflowId, runId:run.runId, receiptId:run.receipt?.id, error:run.error || run.reason || null};
  }
  listWorkflowRuns(options={}){ return this.data.listWorkflowRuns(options); }
  listWebhookEvents(options={}){ return this.data.listWebhookEvents(options); }
  listApprovals(options={}){ return this.data.listApprovals(options); }
  async resolveApproval(approvalId, body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    if (!canRun(normalized)) throw new Error('Upstream claims do not allow approval resolution.');
    const approval = await this.data.resolveApproval(approvalId, {status:body.status || 'approved', resolvedBy:normalized.email || normalized.sub || null, note:body.note || ''});
    if (!approval) return {ok:false, reason:'approval_not_found'};
    const receipt = await this.receipts.write('approval_resolved', {ok:true, approvalId, status:approval.status});
    return {ok:true, approval, receipt};
  }

  async listProviderPacks(){
    return this.packLoader.listPacks(this.manifest?.providers || []);
  }

  async installProviderPack(projectId='default', packId, body={}, claims=null){
    const packs = await this.listProviderPacks();
    const pack = packs.find(p => p.id === packId);
    if (!pack) return {ok:false, reason:'pack_not_found', packId};
    if (!pack.valid) return {ok:false, reason:'pack_invalid', packId, errors:pack.errors || []};
    return this.installProvider(projectId, {providerId:pack.id, enabled:body.enabled !== false, secretRef:body.secretRef || `vault:${projectId}:${pack.id}:primary`, routes:pack.routes}, claims);
  }

  async recordWorkflowMeters({projectId='default', templateId, workflow={}, runId, ctx={}}={}){
    const packs = await this.listProviderPacks();
    const packMap = new Map(packs.map(p => [p.id, p]));
    const providers = new Set(Array.isArray(workflow.requiredProviders) ? workflow.requiredProviders : []);
    for (const step of ctx.steps || []){
      const text = JSON.stringify(step).toLowerCase();
      for (const pack of packs){
        if (text.includes(pack.id.toLowerCase())) providers.add(pack.id);
      }
    }
    const events = [];
    for (const providerId of providers){
      const pack = packMap.get(providerId) || {};
      const metering = pack.metering || {};
      const event = await this.data.recordMeterEvent({
        projectId,
        providerId,
        workflowId:templateId || workflow.templateId || workflow.id,
        runId,
        unit:metering.unit || 'call',
        quantity:1,
        costCents:Number(metering.defaultCostCents || 0),
        metadata:{mode:this.mode(), packSource:pack.source || 'builtin'}
      });
      events.push(event);
    }
    return events;
  }

  async enqueueJob(body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const projectId = projectIdFrom(body.input || body, normalized);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'run');
    const workflowId = String(body.workflowId || body.templateId || '').trim();
    if (!workflowId) throw new Error('workflowId required');
    const job = await this.data.enqueueJob({projectId:project.id, workflowId, input:body.input || {}, claims:normalized, approvals:body.approvals || {}, runAt:body.runAt, priority:body.priority, maxAttempts:body.maxAttempts});
    const receipt = await this.receipts.write('job_enqueued', {ok:true, projectId:project.id, jobId:job.id, workflowId});
    return {ok:true, job, receipt};
  }

  listJobs(options={}){ return this.data.listJobs(options); }

  async runJob(jobId, {claims=null}={}){
    const current = this.data.getJob(jobId);
    if (!current) return {ok:false, reason:'job_not_found', jobId};
    if (current.cancelledAt || current.status === 'cancelled') return {ok:false, reason:'job_cancelled', job:current};
    if (!['queued','retry','running'].includes(current.status)) return {ok:false, reason:'job_not_runnable', status:current.status, job:current};
    const normalized = normalizeClaims(claims || current.claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(current.projectId);
    this.assertProjectAccess(project, normalized, 'run');
    const lockId = id('lock');
    const job = await this.data.lockJob(current.id, {lockId, ttlMs:Number(process.env.CODESTUDIO_JOB_LOCK_TTL_MS || 5*60*1000)});
    if (!job) return {ok:false, reason:'job_lock_failed', jobId:current.id};
    const result = await this.runWorkflow(job.workflowId, {input:{...(job.input || {}), projectId:project.id}, claims:normalized, approvals:job.approvals || {}});
    let updated;
    if (result.ok) updated = await this.data.completeJob(job.id, {result, error:null});
    else updated = await this.data.failJob(job.id, {result, error:result.error || result.reason || 'workflow_blocked'});
    const receipt = await this.receipts.write('job_run', {ok:!!result.ok, projectId:project.id, jobId:job.id, workflowId:job.workflowId, status:updated?.status, attempts:updated?.attempts, lockId, result});
    return {ok:!!result.ok, job:updated, workflowResult:result, receipt};
  }

  async cancelJob(jobId, body={}, claims=null){
    const current = this.data.getJob(jobId);
    if (!current) return {ok:false, reason:'job_not_found', jobId};
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(current.projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const job = await this.data.cancelJob(jobId, {reason:body.reason || 'cancelled_by_operator', cancelledBy:normalized.email || normalized.sub || null});
    const receipt = await this.receipts.write('job_cancelled', {ok:true, projectId:project.id, jobId, reason:job.cancelReason});
    return {ok:true, job, receipt};
  }

  async extendJobLock(jobId, body={}, claims=null){
    const current = this.data.getJob(jobId);
    if (!current) return {ok:false, reason:'job_not_found', jobId};
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(current.projectId);
    this.assertProjectAccess(project, normalized, 'run');
    const job = await this.data.extendJobLock(jobId, {lockId:body.lockId || current.lockId, ttlMs:Number(body.ttlMs || process.env.CODESTUDIO_JOB_LOCK_TTL_MS || 5*60*1000)});
    if (!job) return {ok:false, reason:'job_lock_extend_failed', jobId};
    const receipt = await this.receipts.write('job_lock_extended', {ok:true, projectId:project.id, jobId, lockExpiresAt:job.lockExpiresAt});
    return {ok:true, job, receipt};
  }

  async retryDeadLetter(deadLetterId, body={}, claims=null){
    const dead = this.data.listDeadLetters({limit:5000}).find(d => d.id === deadLetterId);
    if (!dead) return {ok:false, reason:'dead_letter_not_found', deadLetterId};
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(dead.projectId);
    this.assertProjectAccess(project, normalized, 'run');
    const retried = await this.data.retryDeadLetter(deadLetterId, {runAt:body.runAt || nowISO(), resetAttempts:body.resetAttempts !== false});
    const receipt = await this.receipts.write('dead_letter_retried', {ok:true, projectId:project.id, deadLetterId, retryJobId:retried?.job?.id});
    return {ok:true, ...retried, receipt};
  }

  async recoverStaleJobs(claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    if (!canRun(normalized)) throw new Error('Upstream claims do not allow queue recovery.');
    const recovered = await this.data.recoverStaleLocks();
    const receipt = await this.receipts.write('job_stale_lock_recovery', {ok:true, recovered});
    return {ok:true, recovered, receipt};
  }

  listDeadLetters(options={}){ return this.data.listDeadLetters(options); }


  async drainJobs({limit=10, claims=null}={}){
    await this.data.recoverStaleLocks();
    const due = this.data.listDueJobs({limit});
    const results = [];
    for (const job of due){
      results.push(await this.runJob(job.id, {claims:claims || job.claims}));
    }
    const receipt = await this.receipts.write('job_drain', {ok:results.every(r => r.ok), count:results.length, results:results.map(r => ({ok:r.ok, jobId:r.job?.id || r.jobId, status:r.job?.status}))});
    return {ok:results.every(r => r.ok), count:results.length, results, receipt};
  }

  async upsertSchedule(body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const projectId = projectIdFrom(body.input || body, normalized);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const schedule = await this.data.upsertSchedule({...body, projectId:project.id, claims:normalized});
    const receipt = await this.receipts.write('schedule_upsert', {ok:true, projectId:project.id, scheduleId:schedule.id, workflowId:schedule.workflowId});
    return {ok:true, schedule, receipt};
  }

  listSchedules(options={}){ return this.data.listSchedules(options); }

  async runDueSchedules({limit=20, claims=null}={}){
    const due = this.data.listDueSchedules({limit});
    const enqueued = [];
    for (const schedule of due){
      const result = await this.enqueueJob({workflowId:schedule.workflowId, input:{...(schedule.input || {}), projectId:schedule.projectId}, claims:schedule.claims, approvals:schedule.approvals, priority:50}, claims || schedule.claims);
      enqueued.push(result.job);
      const nextRunAt = nextScheduleRun(schedule);
      await this.data.updateSchedule(schedule.id, {lastRunAt:nowISO(), nextRunAt});
    }
    const receipt = await this.receipts.write('schedule_tick', {ok:true, due:due.length, enqueued:enqueued.map(j => j.id)});
    return {ok:true, due:due.length, enqueued, receipt};
  }

  listMeterEvents(options={}){ return this.data.listMeterEvents(options); }
  meterSummary(options={}){ return this.data.aggregateMeters(options); }

  async exportProjectBundle(projectId='default', claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'read');
    const bundle = {
      schema:'kaixu-codestudio-project-bundle-v1',
      exportedAt:nowISO(),
      project,
      providerInstalls:this.data.listProviderInstalls(project.id),
      workflowRuns:this.data.listWorkflowRuns({projectId:project.id, limit:1000}),
      webhookEvents:this.data.listWebhookEvents({projectId:project.id, limit:1000}),
      approvals:this.data.listApprovals({projectId:project.id, limit:1000}),
      jobs:this.data.listJobs({projectId:project.id, limit:1000}),
      schedules:this.data.listSchedules({projectId:project.id, limit:1000}),
      meters:this.data.listMeterEvents({projectId:project.id, limit:5000}),
    };
    const data = JSON.stringify(bundle, null, 2);
    const hash = sha256(data);
    const exportDir = path.join(this.root, 'data/exports');
    await fs.mkdir(exportDir, {recursive:true});
    const file = path.join(exportDir, `${project.id}-${Date.now()}-${hash.slice(0,8)}.json`);
    await fs.writeFile(file, data);
    const record = await this.data.saveBundle({projectId:project.id, path:path.relative(this.root, file), bytes:Buffer.byteLength(data), hash, metadata:{schema:bundle.schema}});
    const receipt = await this.receipts.write('project_export', {ok:true, projectId:project.id, bundle:record});
    return {ok:true, bundle:record, data:bundle, receipt};
  }

  async importProjectBundle(bundle={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    if (!canRun(normalized)) throw new Error('Upstream claims do not allow project imports.');
    if (!bundle || bundle.schema !== 'kaixu-codestudio-project-bundle-v1') return {ok:false, reason:'invalid_bundle_schema'};
    const project = await this.data.upsertProject(bundle.project || {}, normalized);
    let providers = 0;
    for (const install of bundle.providerInstalls || []){
      await this.data.installProvider({...install, projectId:project.id});
      providers++;
    }
    const importRecord = await this.data.recordImport({projectId:project.id, source:'bundle', ok:true, counts:{providerInstalls:providers, workflowRuns:(bundle.workflowRuns || []).length, webhookEvents:(bundle.webhookEvents || []).length}});
    const receipt = await this.receipts.write('project_import', {ok:true, projectId:project.id, importId:importRecord.id, counts:importRecord.counts});
    return {ok:true, project, importRecord, receipt};
  }


  async saveWorkflowGraph(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const validation = validateWorkflowGraph(body);
    if (!validation.ok) return {ok:false, reason:'invalid_graph', validation};
    const compiledWorkflow = compileWorkflowGraph(body);
    const graph = await this.data.saveWorkflowGraph({...(body || {}), projectId:project.id, compiledWorkflow});
    const receipt = await this.receipts.write('workflow_graph_saved', {ok:true, projectId:project.id, graphId:graph.id, nodeCount:graph.nodes.length, edgeCount:graph.edges.length, compiledWorkflow});
    return {ok:true, graph, compiledWorkflow, validation, receipt};
  }

  listWorkflowGraphs(options={}){ return this.data.listWorkflowGraphs(options); }

  async optimizeProviderRoute(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'read');
    const packs = await this.listProviderPacks();
    const installs = this.data.listProviderInstalls(project.id);
    const installed = new Map(installs.map(i => [i.providerId, i]));
    const intent = String(body.intent || 'generic').toLowerCase();
    const candidateIds = Array.isArray(body.candidates) && body.candidates.length ? body.candidates.map(String) : inferRouteCandidates(intent, packs);
    const candidates = candidateIds.map(providerId => {
      const pack = packs.find(p => p.id === providerId) || {id:providerId, title:providerId, routes:[], metering:{}};
      const install = installed.get(providerId) || null;
      const probe = this.registry.get(providerId)?.probe?.() || {ok:false, provider:providerId, missing:['adapter_missing']};
      const costCents = Number(pack?.metering?.defaultCostCents || 0);
      const installPenalty = install && install.enabled ? 0 : 100000;
      const healthPenalty = probe.ok ? 0 : 50000;
      const score = costCents + installPenalty + healthPenalty;
      const route = chooseRouteForIntent(intent, pack.routes || []);
      return {providerId, title:pack.title || providerId, lane:pack.lane || 'generic', installed:!!(install && install.enabled), probeOk:!!probe.ok, costCents, score, selectedRoute:route, missing:probe.missing || [], source:pack.source || 'builtin'};
    }).sort((a,b) => a.score - b.score || a.costCents - b.costCents || a.providerId.localeCompare(b.providerId));
    const selected = candidates.find(c => c.installed && c.probeOk) || (body.requireInstalled === false ? candidates.find(c => c.probeOk) : null) || null;
    const decision = await this.data.recordRouteDecision({projectId:project.id, intent, selectedProviderId:selected?.providerId || null, selectedRoute:selected?.selectedRoute || null, candidates, ok:!!selected, reason:selected ? 'selected_lowest_ready_score' : 'no_ready_provider'});
    const receipt = await this.receipts.write('provider_route_optimized', {ok:!!selected, projectId:project.id, intent, selected, candidateCount:candidates.length, decisionId:decision.id});
    return {ok:!!selected, projectId:project.id, intent, selected, candidates, decision, receipt};
  }

  listRouteDecisions(options={}){ return this.data.listRouteDecisions(options); }

  async generateUsageInvoice(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'read');
    const period = normalizeInvoicePeriod(body.period || {});
    const events = this.data.listMeterEvents({projectId:project.id, limit:5000}).filter(e => (!period.from || String(e.ts) >= period.from) && (!period.to || String(e.ts) <= period.to));
    const byProvider = new Map();
    for (const event of events){
      const key = event.providerId || 'platform';
      const row = byProvider.get(key) || {providerId:key, quantity:0, costCents:0, meterEventIds:[]};
      row.quantity += Number(event.quantity || 0);
      row.costCents += Number(event.costCents || 0);
      row.meterEventIds.push(event.id);
      byProvider.set(key, row);
    }
    const markupPercent = Number.isFinite(Number(body.markupPercent)) ? Math.max(0, Number(body.markupPercent)) : 0;
    const minimumLineCents = Number.isFinite(Number(body.minimumLineCents)) ? Math.max(0, Math.round(Number(body.minimumLineCents))) : 0;
    const lineItems = Array.from(byProvider.values()).map(row => {
      const billable = Math.max(minimumLineCents, Math.round(row.costCents * (1 + markupPercent / 100)));
      return {description:`${row.providerId} platform usage`, providerId:row.providerId, quantity:row.quantity, rawCostCents:row.costCents, unit:'metered_call', amountCents:billable};
    });
    for (const manual of body.lineItems || []){
      lineItems.push({description:String(manual.description || 'Manual platform service'), providerId:String(manual.providerId || 'platform'), quantity:Number(manual.quantity || 1), unit:String(manual.unit || 'service'), rawCostCents:Number(manual.rawCostCents || 0), amountCents:Math.max(0, Math.round(Number(manual.amountCents || 0)))});
    }
    if (!lineItems.length) lineItems.push({description:'Platform operations retainer', providerId:'platform', quantity:1, unit:'service', rawCostCents:0, amountCents:Math.max(0, Math.round(Number(body.minimumInvoiceCents || 0)))});
    const subtotalCents = lineItems.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
    const taxRate = Number.isFinite(Number(body.taxRate)) ? Math.max(0, Number(body.taxRate)) : 0;
    const taxCents = Math.round(subtotalCents * taxRate);
    const invoice = await this.data.saveInvoice({projectId:project.id, invoiceNumber:body.invoiceNumber, status:'draft', customer:body.customer || {name:project.name}, period, currency:body.currency || 'USD', lineItems, subtotalCents, taxCents, totalCents:subtotalCents + taxCents, meterEventIds:events.map(e => e.id), metadata:{markupPercent, minimumLineCents, generatedBy:normalized.email || normalized.sub || 'upstream'}});
    const receipt = await this.receipts.write('invoice_generated', {ok:true, projectId:project.id, invoiceId:invoice.id, invoiceNumber:invoice.invoiceNumber, totalCents:invoice.totalCents, lineItems:invoice.lineItems.length});
    return {ok:true, projectId:project.id, invoice, sourceMeterEvents:events.length, receipt};
  }

  listInvoices(options={}){ return this.data.listInvoices(options); }

  listBundles(options={}){ return this.data.listBundles(options); }
  listImports(options={}){ return this.data.listImports(options); }


  async recordAuditEvent(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId || body.projectId || 'default');
    this.assertProjectAccess(project, normalized, 'read');
    const event = await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:body.action || 'platform.audit', target:body.target || '', ok:body.ok !== false, severity:body.severity || 'info', metadata:body.metadata || body});
    const receipt = await this.receipts.write('audit_event_recorded', {ok:true, projectId:project.id, eventId:event.id, action:event.action, severity:event.severity});
    return {ok:true, event, receipt};
  }

  listAuditEvents(options={}){ return this.data.listAuditEvents(options); }

  async openIncident(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId || body.projectId || 'default');
    this.assertProjectAccess(project, normalized, 'write');
    const incident = await this.data.openIncident({...body, projectId:project.id, ownerRef:body.ownerRef || normalized.email || normalized.sub || ''});
    await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'incident.opened', target:incident.id, severity:incident.severity, metadata:{title:incident.title, source:incident.source}});
    const receipt = await this.receipts.write('incident_opened', {ok:true, projectId:project.id, incidentId:incident.id, severity:incident.severity, title:incident.title});
    return {ok:true, incident, receipt};
  }

  async resolveIncident(incidentId, body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const current = this.data.listIncidents({limit:1000}).find(i => i.id === incidentId);
    if (!current) return {ok:false, error:'incident_not_found'};
    const project = this.data.getProject(current.projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const incident = await this.data.updateIncident(incidentId, {status:body.status || 'resolved', resolution:body.resolution || body.note || '', resolvedBy:normalized.email || normalized.sub || null});
    await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'incident.resolved', target:incident.id, severity:incident.severity, metadata:{resolution:incident.resolution || ''}});
    const receipt = await this.receipts.write('incident_resolved', {ok:true, projectId:project.id, incidentId:incident.id, status:incident.status});
    return {ok:true, incident, receipt};
  }

  listIncidents(options={}){ return this.data.listIncidents(options); }

  async upsertEntitlement(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId || body.projectId || 'default');
    this.assertProjectAccess(project, normalized, 'write');
    const entitlement = await this.data.upsertEntitlement({...body, projectId:project.id});
    await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'entitlement.upserted', target:entitlement.key, metadata:{limit:entitlement.limit, enabled:entitlement.enabled}});
    const receipt = await this.receipts.write('entitlement_upserted', {ok:true, projectId:project.id, key:entitlement.key, enabled:entitlement.enabled, limit:entitlement.limit});
    return {ok:true, entitlement, receipt};
  }

  async checkEntitlement(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId || body.projectId || 'default');
    this.assertProjectAccess(project, normalized, 'read');
    const result = await this.data.consumeEntitlement({projectId:project.id, key:body.key, quantity:body.consume === false ? 0 : (body.quantity || 1)});
    const severity = result.ok ? 'info' : 'warning';
    await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'entitlement.checked', target:body.key, ok:result.ok, severity, metadata:{reason:result.reason || 'allowed'}});
    if (!result.ok && body.openIncident !== false){
      await this.data.openIncident({projectId:project.id, title:`Entitlement blocked: ${body.key}`, severity:'high', source:'entitlement_gate', signals:[result]});
    }
    const receipt = await this.receipts.write('entitlement_checked', {ok:result.ok, projectId:project.id, key:body.key, reason:result.reason || 'allowed'});
    return {...result, receipt};
  }

  listEntitlements(options={}){ return this.data.listEntitlements(options); }

  async saveRecord(collection='records', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const projectId = body.projectId || projectIdFrom(body, normalized);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'write');
    const record = await this.data.saveRecord(collection, {...body, projectId:project.id});
    await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'record.saved', target:`${record.collection}:${record.id}`, metadata:{collection:record.collection}});
    const receipt = await this.receipts.write('record_saved', {ok:true, projectId:project.id, collection:record.collection, recordId:record.id});
    return {ok:true, record, receipt};
  }

  listRecords(options={}){ return this.data.listRecords(options); }

  async saveForm(projectId='default', body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId || body.projectId || 'default');
    this.assertProjectAccess(project, normalized, 'write');
    const form = await this.data.saveForm({...body, projectId:project.id});
    await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'form.saved', target:form.id, metadata:{fields:form.fields.length, submitWorkflowId:form.submitWorkflowId}});
    const receipt = await this.receipts.write('form_saved', {ok:true, projectId:project.id, formId:form.id, fields:form.fields.length});
    return {ok:true, form, receipt};
  }

  async submitForm(formId, body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const form = this.data.getForm(formId);
    if (!form) return {ok:false, error:'form_not_found'};
    const project = this.data.getProject(form.projectId);
    this.assertProjectAccess(project, normalized, 'run');
    const validation = validateFormSubmission(form, body.data || body.values || body);
    if (!validation.ok){
      const incident = await this.data.openIncident({projectId:project.id, title:`Form submission failed validation: ${form.title}`, severity:'medium', source:'form_validation', signals:validation.errors});
      const receipt = await this.receipts.write('form_submission_blocked', {ok:false, projectId:project.id, formId:form.id, errors:validation.errors, incidentId:incident.id});
      return {ok:false, formId:form.id, validation, incident, receipt};
    }
    const record = await this.data.saveRecord('form-submissions', {projectId:project.id, data:{formId:form.id, slug:form.slug, values:validation.values}, status:'submitted'});
    await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'form.submitted', target:form.id, metadata:{recordId:record.id}});
    let workflow = null;
    if (form.submitWorkflowId){
      workflow = await this.runWorkflow(form.submitWorkflowId, {claims:normalized, input:{projectId:project.id, formId:form.id, submissionId:record.id, ...validation.values}});
    }
    const receipt = await this.receipts.write('form_submitted', {ok:true, projectId:project.id, formId:form.id, recordId:record.id, workflowOk:workflow?.ok ?? null});
    return {ok:true, formId:form.id, record, workflow, receipt};
  }

  listForms(options={}){ return this.data.listForms(options); }

  async runWorkflowGraph(graphId, body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const graph = this.data.listWorkflowGraphs({limit:1000}).find(g => g.id === graphId);
    if (!graph) return {ok:false, error:'graph_not_found'};
    const project = this.data.getProject(graph.projectId);
    this.assertProjectAccess(project, normalized, 'run');
    const validation = validateWorkflowGraph(graph);
    if (!validation.ok) return {ok:false, graphId, validation};
    const compiledWorkflow = graph.compiledWorkflow || compileWorkflowGraph(graph);
    const providerInstalls = this.data.listProviderInstalls(project.id);
    const enabledInstalls = new Set(providerInstalls.filter(p => p.enabled).map(p => p.providerId));
    const missingProviders = (compiledWorkflow.requiredProviders || []).filter(providerId => !enabledInstalls.has(providerId) || !this.registry.get(providerId)?.probe?.().ok);
    if (missingProviders.length){
      const incident = await this.data.openIncident({projectId:project.id, title:`Graph blocked: missing providers for ${graph.title}`, severity:'high', source:'graph_runner', signals:missingProviders});
      const receipt = await this.receipts.write('workflow_graph_run_blocked', {ok:false, projectId:project.id, graphId, missingProviders, incidentId:incident.id});
      return {ok:false, blocked:true, graphId, missingProviders, incident, receipt};
    }
    const runRecord = await this.data.recordWorkflowRun({projectId:project.id, templateId:compiledWorkflow.templateId || 'visual_workflow', graphId, requestedBy:normalized.email || normalized.sub || null, input:body.input || body, mode:this.mode()});
    const ctx = {input:body.input || body, claims:normalized, outputs:{}, steps:[], workflow:compiledWorkflow};
    try{
      for (const step of compiledWorkflow.steps || []){
        const result = await this.executeGraphStep(step, ctx);
        ctx.outputs[step.id] = result;
        if (!result.ok) throw new Error(`Graph step blocked: ${step.id}:${result.reason || 'not_ok'}`);
      }
      const meters = await this.recordWorkflowMeters({projectId:project.id, templateId:compiledWorkflow.templateId || 'visual_workflow', workflow:compiledWorkflow, runId:runRecord.id, ctx});
      const receipt = await this.receipts.write('workflow_graph_run', {ok:true, projectId:project.id, graphId, runId:runRecord.id, steps:ctx.steps, meters});
      await this.data.updateWorkflowRun(runRecord.id, {status:'completed', ok:true, projectId:project.id, graphId, output:ctx.outputs, steps:ctx.steps, meterEventIds:meters.map(m => m.id), receiptId:receipt.id});
      await this.data.recordAuditEvent({projectId:project.id, actor:normalized.email || normalized.sub || null, action:'workflow_graph.ran', target:graphId, metadata:{runId:runRecord.id, steps:ctx.steps.length}});
      return {ok:true, projectId:project.id, graphId, runId:runRecord.id, output:ctx.outputs, steps:ctx.steps, meters, receipt};
    }catch(error){
      const incident = await this.data.openIncident({projectId:project.id, title:`Graph run failed: ${graph.title}`, severity:'high', source:'graph_runner', signals:[{error:error.message, steps:ctx.steps}]});
      const receipt = await this.receipts.write('workflow_graph_run_error', {ok:false, projectId:project.id, graphId, runId:runRecord.id, error:error.message, steps:ctx.steps, incidentId:incident.id});
      await this.data.updateWorkflowRun(runRecord.id, {status:'error', ok:false, projectId:project.id, graphId, error:error.message, steps:ctx.steps, receiptId:receipt.id});
      return {ok:false, projectId:project.id, graphId, runId:runRecord.id, error:error.message, steps:ctx.steps, incident, receipt};
    }
  }

  async executeGraphStep(step, ctx){
    return this.actionRegistry.runProviderAction(step, ctx);
  }

  async runProviderPackAction(projectId='default', providerId, route, body={}, claims=null){
    const normalized = normalizeClaims(claims || this.manifest?.upstreamClaimsSample);
    const project = this.data.getProject(projectId);
    this.assertProjectAccess(project, normalized, 'run');
    const installs = this.data.listProviderInstalls(project.id);
    const installed = installs.find(i => i.providerId === providerId && i.enabled);
    if (!installed) return {ok:false, reason:'provider_not_installed_or_disabled', projectId:project.id, providerId};
    const packs = await this.listProviderPacks();
    const pack = packs.find(p => p.id === providerId);
    if (pack && Array.isArray(pack.routes) && pack.routes.length && !pack.routes.includes(route)){
      return {ok:false, reason:'route_not_declared_by_provider_pack', providerId, route, declaredRoutes:pack.routes};
    }
    const ctx = {input:{...(body.input || body || {}), projectId:project.id}, claims:normalized, outputs:{}, steps:[], workflow:{id:`provider-pack:${providerId}:${route}`, templateId:'provider_pack_action', requiredProviders:[providerId], steps:[{providerId, action:route}]}, engine:this};
    const run = await this.data.recordWorkflowRun({projectId:project.id, templateId:'provider_pack_action', requestedBy:normalized.email || normalized.sub || null, input:ctx.input, mode:this.mode(), providerId, route, engine:'provider_pack_action'});
    try{
      const result = await this.actionRegistry.runProviderAction({providerId, action:route, config:body.config || {}}, ctx);
      const meters = await this.recordWorkflowMeters({projectId:project.id, templateId:'provider_pack_action', workflow:ctx.workflow, runId:run.id, ctx});
      const receipt = await this.receipts.write('provider_pack_action_run', {ok:!!result.ok, projectId:project.id, providerId, route, runId:run.id, result, steps:ctx.steps, meters});
      await this.data.updateWorkflowRun(run.id, {status:result.ok ? 'completed' : 'error', ok:!!result.ok, projectId:project.id, output:ctx.outputs, steps:ctx.steps, meterEventIds:meters.map(m => m.id), receiptId:receipt.id, providerId, route, engine:'provider_pack_action'});
      return {ok:!!result.ok, projectId:project.id, providerId, route, runId:run.id, result, output:ctx.outputs, steps:ctx.steps, meters, receipt};
    }catch(error){
      const receipt = await this.receipts.write('provider_pack_action_error', {ok:false, projectId:project.id, providerId, route, runId:run.id, error:error.message, steps:ctx.steps});
      await this.data.updateWorkflowRun(run.id, {status:'error', ok:false, projectId:project.id, error:error.message, steps:ctx.steps, receiptId:receipt.id, providerId, route, engine:'provider_pack_action'});
      return {ok:false, projectId:project.id, providerId, route, runId:run.id, error:error.message, steps:ctx.steps, receipt};
    }
  }


  platformScorecard(projectId='default'){
    const meters = this.data.aggregateMeters({projectId});
    const incidents = this.data.listIncidents({projectId, limit:1000});
    const openIncidents = incidents.filter(i => i.status !== 'resolved').length;
    const approvals = this.data.listApprovals({projectId, limit:1000});
    const runs = this.data.listWorkflowRuns({projectId, limit:1000});
    const completed = runs.filter(r => r.status === 'completed').length;
    const errored = runs.filter(r => r.status === 'error' || r.status === 'blocked').length;
    const runSuccessRate = runs.length ? Math.round((completed / runs.length) * 10000) / 100 : 100;
    const score = Math.max(0, Math.min(100, Math.round(100 - openIncidents*8 - approvals.filter(a => a.status === 'open').length*4 - errored*3 + Math.min(10, completed))));
    return {ok:true, projectId, score, runSuccessRate, runs:runs.length, completedRuns:completed, problemRuns:errored, openIncidents, openApprovals:approvals.filter(a => a.status === 'open').length, meterEvents:meters.totalEvents, totalCostCents:meters.totalCostCents};
  }

  async verifyStorageAdapter(){
    const result = await verifyStorageAdapterSelection({root:this.root});
    const receipt = await this.receipts.write('storage_adapter_verified', {ok:true, adapter:result.adapter, before:result.before, after:result.after});
    return {...result, receipt};
  }

  receiptsList(limit){ return this.receipts.list(limit); }
}


function validateFormSubmission(form={}, raw={}){
  const values = raw && typeof raw === 'object' ? raw : {};
  const errors = [];
  const clean = {};
  for (const field of form.fields || []){
    const name = String(field.name || field.id || '').trim();
    if (!name) continue;
    const value = values[name];
    if (field.required && (value === undefined || value === null || String(value).trim() === '')) errors.push(`${name} is required`);
    if (value !== undefined){
      const type = String(field.type || 'text');
      if (type === 'email' && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value))) errors.push(`${name} must be an email`);
      if (type === 'number' && Number.isNaN(Number(value))) errors.push(`${name} must be numeric`);
      clean[name] = type === 'number' ? Number(value) : value;
    }
  }
  for (const [k,v] of Object.entries(values)) if (!(k in clean)) clean[k] = v;
  return {ok:errors.length === 0, errors, values:clean};
}

function inferProvider(payload){
  const text = JSON.stringify(payload || {}).toLowerCase();
  if (text.includes('stripe') || text.includes('checkout') || text.includes('invoice')) return 'stripe';
  if (text.includes('twilio') || text.includes('sms') || text.includes('voice')) return 'twilio';
  if (text.includes('resend') || text.includes('email')) return 'resend';
  if (text.includes('cloudflare') || text.includes('r2') || text.includes('d1')) return 'cloudflare';
  if (text.includes('netlify') || text.includes('deploy')) return 'netlify';
  if (text.includes('neon') || text.includes('postgres') || text.includes('sql')) return 'neon';
  return 'unknown';
}

function nextScheduleRun(schedule){
  const minutes = Number(schedule.intervalMinutes || 0);
  if (!minutes) return nowISO();
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}


function validateWorkflowGraph(graph={}){
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const ids = new Set(nodes.map(n => String(n.id || '')).filter(Boolean));
  const errors = [];
  if (!nodes.length) errors.push('Graph needs at least one node.');
  if (ids.size !== nodes.length) errors.push('Every graph node needs a unique id.');
  for (const edge of edges){
    if (!ids.has(String(edge.from || ''))) errors.push(`Edge from=${edge.from} does not match a node.`);
    if (!ids.has(String(edge.to || ''))) errors.push(`Edge to=${edge.to} does not match a node.`);
  }
  return {ok:errors.length === 0, errors, nodeCount:nodes.length, edgeCount:edges.length};
}

function compileWorkflowGraph(graph={}){
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const providerIds = [...new Set(nodes.map(n => n.providerId).filter(Boolean).map(String))];
  const steps = nodes.filter(n => n.type !== 'trigger').map((node, index) => ({id:node.id || `step_${index+1}`, action:node.action || node.label || node.type || 'custom_step', providerId:node.providerId || null, config:node.config || {}}));
  return {id:graph.workflowId || `wf_${sha256(JSON.stringify({nodes, edges})).slice(0,10)}`, templateId:graph.templateId || 'visual_workflow', title:graph.title || 'Visual workflow', category:graph.category || 'Visual Builder', enabled:graph.enabled !== false, requiredProviders:providerIds, steps, output:graph.output || 'graph_result'};
}

function inferRouteCandidates(intent, packs=[]){
  const text = String(intent || '').toLowerCase();
  if (/mail|email|sequence|notify/.test(text)) return ['resend','google_ops'];
  if (/sms|voice|phone|call|text/.test(text)) return ['twilio'];
  if (/pay|checkout|invoice|billing|refund/.test(text)) return ['stripe'];
  if (/database|db|sql|postgres|crm/.test(text)) return ['neon','cloudflare'];
  if (/ai|llm|summary|classify|score/.test(text)) return ['openai_gateway'];
  if (/file|drive|calendar|appointment|doc/.test(text)) return ['google_ops'];
  if (/deploy|domain|dns|worker|queue|storage|r2|d1/.test(text)) return ['cloudflare','netlify'];
  return packs.map(p => p.id).filter(Boolean);
}

function chooseRouteForIntent(intent, routes=[]){
  const text = String(intent || '').toLowerCase();
  if (!Array.isArray(routes) || !routes.length) return null;
  return routes.find(route => text.split(/[^a-z0-9]+/).filter(Boolean).some(part => String(route).toLowerCase().includes(part))) || routes[0];
}

function normalizeInvoicePeriod(period={}){
  const to = period.to ? new Date(period.to).toISOString() : nowISO();
  const from = period.from ? new Date(period.from).toISOString() : new Date(Date.now() - 30*24*60*60*1000).toISOString();
  return {from, to};
}
