import { promises as fs } from 'node:fs';
import path from 'node:path';
import { id, nowISO } from './ids.mjs';

const DEFAULT_PROJECT_ID = 'default';

function deepClone(value){ return JSON.parse(JSON.stringify(value)); }

function defaultState(){
  return {
    schema:'kaixu-codestudio-platform-store-v1',
    createdAt:nowISO(),
    updatedAt:nowISO(),
    projects:[{
      id:DEFAULT_PROJECT_ID,
      name:'Default Workspace',
      slug:'default',
      status:'active',
      ownerRef:'upstream:owner',
      budget:{monthlyCapCents:50000, hardStop:true},
      roles:{owner:['owner'], admin:['admin'], operator:['operator'], viewer:['viewer']},
      createdAt:nowISO(),
      updatedAt:nowISO(),
    }],
    providerInstalls:[],
    workflowRuns:[],
    webhookEvents:[],
    approvals:[],
    jobs:[],
    deadLetters:[],
    schedules:[],
    meterEvents:[],
    workflowGraphs:[],
    routeDecisions:[],
    invoices:[],
    bundles:[],
    imports:[],
    auditEvents:[],
    incidents:[],
    entitlements:[],
    records:[],
    forms:[],
  };
}

export class JsonDataStore {
  constructor({root=process.cwd(), dir=process.env.CODESTUDIO_DATA_DIR || './data'}={}){
    this.root = root;
    this.dir = path.resolve(root, dir);
    this.file = path.join(this.dir, 'platform-state.json');
    this.state = defaultState();
  }

  async init(){
    await fs.mkdir(this.dir, {recursive:true});
    try{
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8'));
      this.state = this.normalize(parsed);
    }catch{
      this.state = defaultState();
      await this.save();
    }
    return this;
  }

  normalize(raw){
    const base = defaultState();
    const state = raw && typeof raw === 'object' ? {...base, ...raw} : base;
    state.projects = Array.isArray(state.projects) && state.projects.length ? state.projects : base.projects;
    state.providerInstalls = Array.isArray(state.providerInstalls) ? state.providerInstalls : [];
    state.workflowRuns = Array.isArray(state.workflowRuns) ? state.workflowRuns : [];
    state.webhookEvents = Array.isArray(state.webhookEvents) ? state.webhookEvents : [];
    state.approvals = Array.isArray(state.approvals) ? state.approvals : [];
    state.jobs = Array.isArray(state.jobs) ? state.jobs : [];
    state.deadLetters = Array.isArray(state.deadLetters) ? state.deadLetters : [];
    state.schedules = Array.isArray(state.schedules) ? state.schedules : [];
    state.meterEvents = Array.isArray(state.meterEvents) ? state.meterEvents : [];
    state.workflowGraphs = Array.isArray(state.workflowGraphs) ? state.workflowGraphs : [];
    state.routeDecisions = Array.isArray(state.routeDecisions) ? state.routeDecisions : [];
    state.invoices = Array.isArray(state.invoices) ? state.invoices : [];
    state.bundles = Array.isArray(state.bundles) ? state.bundles : [];
    state.imports = Array.isArray(state.imports) ? state.imports : [];
    state.auditEvents = Array.isArray(state.auditEvents) ? state.auditEvents : [];
    state.incidents = Array.isArray(state.incidents) ? state.incidents : [];
    state.entitlements = Array.isArray(state.entitlements) ? state.entitlements : [];
    state.records = Array.isArray(state.records) ? state.records : [];
    state.forms = Array.isArray(state.forms) ? state.forms : [];
    if (!state.projects.find(p => p.id === DEFAULT_PROJECT_ID)) state.projects.unshift(base.projects[0]);
    return state;
  }

  async save(){
    this.state.updatedAt = nowISO();
    await fs.mkdir(this.dir, {recursive:true});
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.state, null, 2));
    await fs.rename(tmp, this.file);
    return this.snapshot();
  }

  snapshot(){ return deepClone(scrubSecrets(this.state)); }

  stats(){
    return {
      projects:this.state.projects.length,
      providerInstalls:this.state.providerInstalls.length,
      workflowRuns:this.state.workflowRuns.length,
      webhookEvents:this.state.webhookEvents.length,
      openApprovals:this.state.approvals.filter(a => a.status === 'open').length,
      jobs:this.state.jobs.length,
      queuedJobs:this.state.jobs.filter(j => j.status === 'queued').length,
      deadLetters:this.state.deadLetters.length,
      lockedJobs:this.state.jobs.filter(j => j.lockedAt && ['running','queued','retry'].includes(j.status)).length,
      schedules:this.state.schedules.length,
      meterEvents:this.state.meterEvents.length,
      workflowGraphs:this.state.workflowGraphs.length,
      routeDecisions:this.state.routeDecisions.length,
      invoices:this.state.invoices.length,
      bundles:this.state.bundles.length,
      imports:this.state.imports.length,
      auditEvents:this.state.auditEvents.length,
      openIncidents:this.state.incidents.filter(i => i.status !== 'resolved').length,
      entitlements:this.state.entitlements.length,
      records:this.state.records.length,
      forms:this.state.forms.length,
      updatedAt:this.state.updatedAt,
    };
  }

  listProjects(){ return deepClone(this.state.projects); }

  getProject(projectId=DEFAULT_PROJECT_ID){
    return this.state.projects.find(p => p.id === projectId) || this.state.projects.find(p => p.slug === projectId) || null;
  }

  async upsertProject(input={}, claims={}){
    const candidateId = String(input.id || input.projectId || '').trim();
    let project = candidateId ? this.getProject(candidateId) : null;
    const payload = {
      name:String(input.name || input.title || project?.name || 'Untitled Project').trim(),
      slug:String(input.slug || project?.slug || slugify(input.name || input.title || 'untitled-project')).trim(),
      status:String(input.status || project?.status || 'active'),
      ownerRef:String(input.ownerRef || project?.ownerRef || claims.sub || claims.email || 'upstream:unknown'),
      budget:normalizeBudget(input.budget || project?.budget),
      roles:input.roles && typeof input.roles === 'object' ? input.roles : (project?.roles || defaultState().projects[0].roles),
    };
    if (project){
      Object.assign(project, payload, {updatedAt:nowISO()});
    }else{
      project = {id:candidateId || id('proj'), ...payload, createdAt:nowISO(), updatedAt:nowISO()};
      this.state.projects.unshift(project);
    }
    await this.save();
    return deepClone(project);
  }

  listProviderInstalls(projectId=DEFAULT_PROJECT_ID){
    return deepClone(this.state.providerInstalls.filter(p => p.projectId === projectId));
  }

  async installProvider({projectId=DEFAULT_PROJECT_ID, providerId, secretRef='', enabled=true, routes=[]}={}){
    if (!providerId) throw new Error('providerId required');
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Unknown project: ${projectId}`);
    let install = this.state.providerInstalls.find(p => p.projectId === project.id && p.providerId === providerId);
    if (!install){
      install = {id:id('prov'), projectId:project.id, providerId, createdAt:nowISO(), lastRotatedAt:null};
      this.state.providerInstalls.unshift(install);
    }
    Object.assign(install, {
      enabled:!!enabled,
      secretRef:String(secretRef || install.secretRef || `vault:${project.id}:${providerId}:primary`),
      routes:Array.isArray(routes) ? routes.map(String) : (install.routes || []),
      status:enabled ? 'installed' : 'disabled',
      updatedAt:nowISO(),
    });
    await this.save();
    return deepClone(install);
  }

  async rotateProvider({projectId=DEFAULT_PROJECT_ID, providerId}={}){
    const install = this.state.providerInstalls.find(p => p.projectId === projectId && p.providerId === providerId);
    if (!install) throw new Error(`Provider ${providerId} is not installed on ${projectId}`);
    install.secretRef = `vault:${projectId}:${providerId}:v${Date.now()}`;
    install.lastRotatedAt = nowISO();
    install.updatedAt = nowISO();
    await this.save();
    return deepClone(install);
  }

  async recordWorkflowRun(run){
    const item = {id:run.id || id('run'), ts:nowISO(), status:'started', ...scrubSecrets(run || {})};
    this.state.workflowRuns.unshift(item);
    if (this.state.workflowRuns.length > 1000) this.state.workflowRuns.length = 1000;
    await this.save();
    return deepClone(item);
  }

  async updateWorkflowRun(runId, patch={}){
    const item = this.state.workflowRuns.find(r => r.id === runId);
    if (!item) return null;
    Object.assign(item, scrubSecrets(patch), {updatedAt:nowISO()});
    await this.save();
    return deepClone(item);
  }

  listWorkflowRuns({projectId=null, limit=100}={}){
    const rows = this.state.workflowRuns.filter(r => !projectId || r.projectId === projectId).slice(0, Number(limit) || 100);
    return deepClone(rows);
  }

  async addWebhookEvent(event){
    const item = {id:event.id || id('evt'), ts:nowISO(), status:'queued', ...scrubSecrets(event || {})};
    this.state.webhookEvents.unshift(item);
    if (this.state.webhookEvents.length > 1000) this.state.webhookEvents.length = 1000;
    await this.save();
    return deepClone(item);
  }

  async updateWebhookEvent(eventId, patch={}){
    const event = this.state.webhookEvents.find(e => e.id === eventId);
    if (!event) return null;
    Object.assign(event, scrubSecrets(patch), {updatedAt:nowISO()});
    await this.save();
    return deepClone(event);
  }

  listWebhookEvents({projectId=null, limit=100}={}){
    return deepClone(this.state.webhookEvents.filter(e => !projectId || e.projectId === projectId).slice(0, Number(limit) || 100));
  }

  getWebhookEvent(eventId){ return deepClone(this.state.webhookEvents.find(e => e.id === eventId) || null); }

  findWebhookByIdempotencyKey(idempotencyKey){
    if (!idempotencyKey) return null;
    return deepClone(this.state.webhookEvents.find(e => e.idempotencyKey === idempotencyKey) || null);
  }

  async openApproval(input={}){
    const approval = {
      id:input.id || id('appr'),
      ts:nowISO(),
      status:'open',
      projectId:input.projectId || DEFAULT_PROJECT_ID,
      reason:String(input.reason || 'approval_required'),
      subject:String(input.subject || 'Platform approval'),
      requestedBy:input.requestedBy || null,
      policy:input.policy || null,
      payload:scrubSecrets(input.payload || {}),
    };
    this.state.approvals.unshift(approval);
    if (this.state.approvals.length > 500) this.state.approvals.length = 500;
    await this.save();
    return deepClone(approval);
  }

  async resolveApproval(approvalId, {status='approved', resolvedBy=null, note=''}={}){
    const approval = this.state.approvals.find(a => a.id === approvalId);
    if (!approval) return null;
    approval.status = String(status || 'approved');
    approval.resolvedBy = resolvedBy || null;
    approval.note = String(note || '');
    approval.resolvedAt = nowISO();
    await this.save();
    return deepClone(approval);
  }

  listApprovals({projectId=null, status=null, limit=100}={}){
    return deepClone(this.state.approvals.filter(a => (!projectId || a.projectId === projectId) && (!status || a.status === status)).slice(0, Number(limit) || 100));
  }

  async enqueueJob(input={}){
    const attempts = Number.isFinite(Number(input.attempts)) ? Number(input.attempts) : 0;
    const maxAttempts = Number.isFinite(Number(input.maxAttempts)) ? Math.max(1, Number(input.maxAttempts)) : 3;
    const job = {
      id:input.id || id('job'),
      ts:nowISO(),
      projectId:String(input.projectId || DEFAULT_PROJECT_ID),
      type:String(input.type || 'workflow'),
      workflowId:String(input.workflowId || input.templateId || ''),
      input:scrubSecrets(input.input || {}),
      claims:scrubSecrets(input.claims || {}),
      approvals:scrubSecrets(input.approvals || {}),
      runAt:input.runAt || nowISO(),
      priority:Number.isFinite(Number(input.priority)) ? Number(input.priority) : 100,
      attempts,
      maxAttempts,
      retryBackoffMs:Number.isFinite(Number(input.retryBackoffMs)) ? Math.max(0, Number(input.retryBackoffMs)) : 15000,
      status:String(input.status || 'queued'),
      lockedAt:null,
      lockId:null,
      lockExpiresAt:null,
      cancelledAt:null,
      cancelReason:null,
      finishedAt:null,
      result:null,
      error:null,
    };
    this.state.jobs.unshift(job);
    if (this.state.jobs.length > 2000) this.state.jobs.length = 2000;
    await this.save();
    return deepClone(job);
  }

  async updateJob(jobId, patch={}){
    const job = this.state.jobs.find(j => j.id === jobId);
    if (!job) return null;
    Object.assign(job, scrubSecrets(patch), {updatedAt:nowISO()});
    await this.save();
    return deepClone(job);
  }

  getJob(jobId){ return deepClone(this.state.jobs.find(j => j.id === jobId) || null); }

  async lockJob(jobId, {lockId=id('lock'), ttlMs=5*60*1000, now=Date.now()}={}){
    const job = this.state.jobs.find(j => j.id === jobId);
    if (!job) return null;
    const status = String(job.status || 'queued');
    const expired = job.lockExpiresAt && Date.parse(job.lockExpiresAt) <= now;
    if (job.cancelledAt || status === 'cancelled') return null;
    if (!['queued','retry'].includes(status) && !(status === 'running' && expired)) return null;
    job.status = 'running';
    job.lockId = lockId;
    job.lockedAt = new Date(now).toISOString();
    job.lockExpiresAt = new Date(now + ttlMs).toISOString();
    job.attempts = Number(job.attempts || 0) + 1;
    job.updatedAt = nowISO();
    await this.save();
    return deepClone(job);
  }

  async extendJobLock(jobId, {lockId, ttlMs=5*60*1000, now=Date.now()}={}){
    const job = this.state.jobs.find(j => j.id === jobId);
    if (!job) return null;
    if (job.status !== 'running') return null;
    if (lockId && job.lockId !== lockId) return null;
    job.lockExpiresAt = new Date(now + ttlMs).toISOString();
    job.updatedAt = nowISO();
    await this.save();
    return deepClone(job);
  }

  async completeJob(jobId, patch={}){
    const job = this.state.jobs.find(j => j.id === jobId);
    if (!job) return null;
    Object.assign(job, scrubSecrets(patch), {status:'completed', finishedAt:nowISO(), lockId:null, lockedAt:null, lockExpiresAt:null, updatedAt:nowISO()});
    await this.save();
    return deepClone(job);
  }

  async failJob(jobId, {error='job_failed', result=null, now=Date.now()}={}){
    const job = this.state.jobs.find(j => j.id === jobId);
    if (!job) return null;
    const attempts = Number(job.attempts || 0);
    const maxAttempts = Number(job.maxAttempts || 3);
    const terminal = attempts >= maxAttempts;
    const nextDelay = Math.min(60*60*1000, Math.max(1000, Number(job.retryBackoffMs || 15000)) * Math.pow(2, Math.max(0, attempts-1)));
    Object.assign(job, {
      status: terminal ? 'failed' : 'retry',
      runAt: terminal ? job.runAt : new Date(now + nextDelay).toISOString(),
      lockId:null,
      lockedAt:null,
      lockExpiresAt:null,
      finishedAt:terminal ? nowISO() : null,
      result:scrubSecrets(result),
      error:String(error),
      updatedAt:nowISO(),
    });
    if (terminal){
      const dead = {id:id('dead'), ts:nowISO(), jobId:job.id, projectId:job.projectId, workflowId:job.workflowId, attempts, error:String(error), job:deepClone(job)};
      this.state.deadLetters.unshift(dead);
      if (this.state.deadLetters.length > 1000) this.state.deadLetters.length = 1000;
    }
    await this.save();
    return deepClone(job);
  }

  async cancelJob(jobId, {reason='cancelled', cancelledBy=null}={}){
    const job = this.state.jobs.find(j => j.id === jobId);
    if (!job) return null;
    Object.assign(job, {status:'cancelled', cancelledAt:nowISO(), cancelReason:String(reason), cancelledBy, lockId:null, lockedAt:null, lockExpiresAt:null, updatedAt:nowISO()});
    await this.save();
    return deepClone(job);
  }

  async recoverStaleLocks({now=Date.now()}={}){
    const recovered = [];
    for (const job of this.state.jobs){
      if (job.status === 'running' && job.lockExpiresAt && Date.parse(job.lockExpiresAt) <= now){
        job.status = Number(job.attempts || 0) >= Number(job.maxAttempts || 3) ? 'failed' : 'retry';
        job.error = 'stale_lock_recovered';
        job.lockId = null;
        job.lockedAt = null;
        job.lockExpiresAt = null;
        job.runAt = nowISO();
        job.updatedAt = nowISO();
        recovered.push(job.id);
      }
    }
    if (recovered.length) await this.save();
    return recovered;
  }

  listDeadLetters({projectId=null, limit=100}={}){
    return deepClone(this.state.deadLetters.filter(j => !projectId || j.projectId === projectId).slice(0, Number(limit) || 100));
  }

  async retryDeadLetter(deadLetterId, {runAt=nowISO(), resetAttempts=true}={}){
    const index = this.state.deadLetters.findIndex(d => d.id === deadLetterId);
    if (index < 0) return null;
    const dead = this.state.deadLetters[index];
    const original = dead.job || {};
    const job = {
      ...deepClone(original),
      id:id('job'),
      ts:nowISO(),
      status:'queued',
      runAt,
      attempts:resetAttempts ? 0 : Number(original.attempts || 0),
      lockedAt:null,
      lockId:null,
      lockExpiresAt:null,
      cancelledAt:null,
      cancelReason:null,
      finishedAt:null,
      result:null,
      error:null,
      retriedFromDeadLetterId:dead.id,
      updatedAt:nowISO(),
    };
    this.state.jobs.unshift(job);
    dead.status = 'retried';
    dead.retriedAt = nowISO();
    dead.retryJobId = job.id;
    this.state.deadLetters.splice(index, 1, dead);
    await this.save();
    return {job:deepClone(job), deadLetter:deepClone(dead)};
  }

  listJobs({projectId=null, status=null, limit=100}={}){
    return deepClone(this.state.jobs.filter(j => (!projectId || j.projectId === projectId) && (!status || j.status === status)).sort((a,b) => String(a.runAt).localeCompare(String(b.runAt)) || Number(a.priority)-Number(b.priority)).slice(0, Number(limit) || 100));
  }

  listDueJobs({limit=10, now=nowISO()}={}){
    return deepClone(this.state.jobs.filter(j => ['queued','retry'].includes(j.status) && !j.cancelledAt && String(j.runAt || '') <= String(now)).sort((a,b) => Number(a.priority)-Number(b.priority) || String(a.runAt).localeCompare(String(b.runAt))).slice(0, Number(limit) || 10));
  }

  async upsertSchedule(input={}){
    const scheduleId = String(input.id || '').trim();
    let schedule = scheduleId ? this.state.schedules.find(s => s.id === scheduleId) : null;
    const intervalMinutes = Number.isFinite(Number(input.intervalMinutes)) ? Math.max(1, Math.round(Number(input.intervalMinutes))) : null;
    const payload = {
      projectId:String(input.projectId || schedule?.projectId || DEFAULT_PROJECT_ID),
      workflowId:String(input.workflowId || input.templateId || schedule?.workflowId || ''),
      input:scrubSecrets(input.input || schedule?.input || {}),
      claims:scrubSecrets(input.claims || schedule?.claims || {}),
      approvals:scrubSecrets(input.approvals || schedule?.approvals || {}),
      status:String(input.status || schedule?.status || 'active'),
      intervalMinutes,
      nextRunAt:input.nextRunAt || schedule?.nextRunAt || nowISO(),
      label:String(input.label || schedule?.label || 'Scheduled workflow'),
    };
    if (schedule){
      Object.assign(schedule, payload, {updatedAt:nowISO()});
    }else{
      schedule = {id:scheduleId || id('sched'), ts:nowISO(), ...payload};
      this.state.schedules.unshift(schedule);
    }
    await this.save();
    return deepClone(schedule);
  }

  async updateSchedule(scheduleId, patch={}){
    const schedule = this.state.schedules.find(s => s.id === scheduleId);
    if (!schedule) return null;
    Object.assign(schedule, scrubSecrets(patch), {updatedAt:nowISO()});
    await this.save();
    return deepClone(schedule);
  }

  listSchedules({projectId=null, status=null, limit=100}={}){
    return deepClone(this.state.schedules.filter(s => (!projectId || s.projectId === projectId) && (!status || s.status === status)).slice(0, Number(limit) || 100));
  }

  listDueSchedules({limit=20, now=nowISO()}={}){
    return deepClone(this.state.schedules.filter(s => s.status === 'active' && String(s.nextRunAt || '') <= String(now)).slice(0, Number(limit) || 20));
  }

  async recordMeterEvent(input={}){
    const event = {
      id:input.id || id('meter'),
      ts:nowISO(),
      projectId:String(input.projectId || DEFAULT_PROJECT_ID),
      providerId:String(input.providerId || 'platform'),
      workflowId:String(input.workflowId || ''),
      runId:String(input.runId || ''),
      unit:String(input.unit || 'call'),
      quantity:Number.isFinite(Number(input.quantity)) ? Number(input.quantity) : 1,
      costCents:Number.isFinite(Number(input.costCents)) ? Number(input.costCents) : 0,
      metadata:scrubSecrets(input.metadata || {}),
    };
    this.state.meterEvents.unshift(event);
    if (this.state.meterEvents.length > 5000) this.state.meterEvents.length = 5000;
    await this.save();
    return deepClone(event);
  }

  listMeterEvents({projectId=null, providerId=null, limit=200}={}){
    return deepClone(this.state.meterEvents.filter(e => (!projectId || e.projectId === projectId) && (!providerId || e.providerId === providerId)).slice(0, Number(limit) || 200));
  }

  aggregateMeters({projectId=null}={}){
    const events = this.state.meterEvents.filter(e => !projectId || e.projectId === projectId);
    const byProvider = {};
    let totalCostCents = 0;
    for (const event of events){
      totalCostCents += Number(event.costCents || 0);
      byProvider[event.providerId] ||= {providerId:event.providerId, calls:0, units:{}, costCents:0};
      byProvider[event.providerId].calls += 1;
      byProvider[event.providerId].costCents += Number(event.costCents || 0);
      byProvider[event.providerId].units[event.unit] = (byProvider[event.providerId].units[event.unit] || 0) + Number(event.quantity || 0);
    }
    return {projectId:projectId || null, totalEvents:events.length, totalCostCents, byProvider:Object.values(byProvider)};
  }


  async saveWorkflowGraph(input={}){
    const graph = {
      id:input.id || id('graph'),
      ts:input.ts || nowISO(),
      updatedAt:nowISO(),
      projectId:String(input.projectId || DEFAULT_PROJECT_ID),
      title:String(input.title || 'Workflow graph'),
      status:String(input.status || 'draft'),
      nodes:Array.isArray(input.nodes) ? input.nodes.map(n => scrubSecrets(n)) : [],
      edges:Array.isArray(input.edges) ? input.edges.map(e => scrubSecrets(e)) : [],
      compiledWorkflow:input.compiledWorkflow ? scrubSecrets(input.compiledWorkflow) : null,
      metadata:scrubSecrets(input.metadata || {}),
    };
    const existing = this.state.workflowGraphs.find(g => g.id === graph.id);
    if (existing) Object.assign(existing, graph);
    else this.state.workflowGraphs.unshift(graph);
    if (this.state.workflowGraphs.length > 500) this.state.workflowGraphs.length = 500;
    await this.save();
    return deepClone(graph);
  }

  listWorkflowGraphs({projectId=null, limit=100}={}){
    return deepClone(this.state.workflowGraphs.filter(g => !projectId || g.projectId === projectId).slice(0, Number(limit) || 100));
  }

  async recordRouteDecision(input={}){
    const decision = {
      id:input.id || id('route'),
      ts:nowISO(),
      projectId:String(input.projectId || DEFAULT_PROJECT_ID),
      intent:String(input.intent || 'generic'),
      selectedProviderId:input.selectedProviderId || null,
      selectedRoute:input.selectedRoute || null,
      candidates:Array.isArray(input.candidates) ? input.candidates.map(c => scrubSecrets(c)) : [],
      ok:input.ok !== false,
      reason:String(input.reason || ''),
      metadata:scrubSecrets(input.metadata || {}),
    };
    this.state.routeDecisions.unshift(decision);
    if (this.state.routeDecisions.length > 1000) this.state.routeDecisions.length = 1000;
    await this.save();
    return deepClone(decision);
  }

  listRouteDecisions({projectId=null, limit=100}={}){
    return deepClone(this.state.routeDecisions.filter(r => !projectId || r.projectId === projectId).slice(0, Number(limit) || 100));
  }

  async saveInvoice(input={}){
    const invoice = {
      id:input.id || id('inv'),
      ts:nowISO(),
      projectId:String(input.projectId || DEFAULT_PROJECT_ID),
      invoiceNumber:String(input.invoiceNumber || `KX-${Date.now()}`),
      status:String(input.status || 'draft'),
      customer:scrubSecrets(input.customer || {}),
      period:input.period || {},
      currency:String(input.currency || 'USD'),
      lineItems:Array.isArray(input.lineItems) ? input.lineItems.map(x => scrubSecrets(x)) : [],
      subtotalCents:Number(input.subtotalCents || 0),
      taxCents:Number(input.taxCents || 0),
      totalCents:Number(input.totalCents || 0),
      meterEventIds:Array.isArray(input.meterEventIds) ? input.meterEventIds.map(String) : [],
      metadata:scrubSecrets(input.metadata || {}),
    };
    this.state.invoices.unshift(invoice);
    if (this.state.invoices.length > 1000) this.state.invoices.length = 1000;
    await this.save();
    return deepClone(invoice);
  }

  listInvoices({projectId=null, status=null, limit=100}={}){
    return deepClone(this.state.invoices.filter(i => (!projectId || i.projectId === projectId) && (!status || i.status === status)).slice(0, Number(limit) || 100));
  }

  async saveBundle(input={}){
    const bundle = {id:input.id || id('bundle'), ts:nowISO(), projectId:String(input.projectId || DEFAULT_PROJECT_ID), kind:String(input.kind || 'export'), path:String(input.path || ''), bytes:Number(input.bytes || 0), hash:String(input.hash || ''), metadata:scrubSecrets(input.metadata || {})};
    this.state.bundles.unshift(bundle);
    if (this.state.bundles.length > 200) this.state.bundles.length = 200;
    await this.save();
    return deepClone(bundle);
  }

  listBundles({projectId=null, limit=50}={}){
    return deepClone(this.state.bundles.filter(b => !projectId || b.projectId === projectId).slice(0, Number(limit) || 50));
  }

  async recordImport(input={}){
    const item = {id:input.id || id('import'), ts:nowISO(), projectId:String(input.projectId || DEFAULT_PROJECT_ID), source:String(input.source || 'api'), ok:input.ok !== false, counts:input.counts || {}, metadata:scrubSecrets(input.metadata || {})};
    this.state.imports.unshift(item);
    if (this.state.imports.length > 200) this.state.imports.length = 200;
    await this.save();
    return deepClone(item);
  }

  listImports({projectId=null, limit=50}={}){
    return deepClone(this.state.imports.filter(i => !projectId || i.projectId === projectId).slice(0, Number(limit) || 50));
  }


  async recordAuditEvent(input={}){
    const event = {
      id:input.id || id('audit'),
      ts:nowISO(),
      projectId:String(input.projectId || DEFAULT_PROJECT_ID),
      actor:scrubSecrets(input.actor || input.requestedBy || null),
      action:String(input.action || 'platform.event'),
      target:String(input.target || ''),
      ok:input.ok !== false,
      severity:String(input.severity || 'info'),
      metadata:scrubSecrets(input.metadata || {}),
    };
    this.state.auditEvents.unshift(event);
    if (this.state.auditEvents.length > 5000) this.state.auditEvents.length = 5000;
    await this.save();
    return deepClone(event);
  }

  listAuditEvents({projectId=null, action=null, severity=null, limit=200}={}){
    return deepClone(this.state.auditEvents.filter(e => (!projectId || e.projectId === projectId) && (!action || e.action === action) && (!severity || e.severity === severity)).slice(0, Number(limit) || 200));
  }

  async openIncident(input={}){
    const incident = {
      id:input.id || id('inc'),
      ts:nowISO(),
      projectId:String(input.projectId || DEFAULT_PROJECT_ID),
      title:String(input.title || 'Platform incident'),
      status:String(input.status || 'open'),
      severity:String(input.severity || 'medium'),
      source:String(input.source || 'manual'),
      signals:Array.isArray(input.signals) ? input.signals.map(x => scrubSecrets(x)) : [],
      ownerRef:String(input.ownerRef || ''),
      timeline:Array.isArray(input.timeline) ? input.timeline.map(x => scrubSecrets(x)) : [{ts:nowISO(), event:'opened'}],
      metadata:scrubSecrets(input.metadata || {}),
    };
    this.state.incidents.unshift(incident);
    if (this.state.incidents.length > 1000) this.state.incidents.length = 1000;
    await this.save();
    return deepClone(incident);
  }

  async updateIncident(incidentId, patch={}){
    const incident = this.state.incidents.find(i => i.id === incidentId);
    if (!incident) return null;
    Object.assign(incident, scrubSecrets(patch), {updatedAt:nowISO()});
    if (patch.status === 'resolved' && !incident.resolvedAt) incident.resolvedAt = nowISO();
    incident.timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
    incident.timeline.unshift({ts:nowISO(), event:patch.status === 'resolved' ? 'resolved' : 'updated', patch:scrubSecrets(patch)});
    await this.save();
    return deepClone(incident);
  }

  listIncidents({projectId=null, status=null, severity=null, limit=100}={}){
    return deepClone(this.state.incidents.filter(i => (!projectId || i.projectId === projectId) && (!status || i.status === status) && (!severity || i.severity === severity)).slice(0, Number(limit) || 100));
  }

  async upsertEntitlement(input={}){
    const key = String(input.key || '').trim();
    if (!key) throw new Error('entitlement key required');
    const projectId = String(input.projectId || DEFAULT_PROJECT_ID);
    let entitlement = this.state.entitlements.find(e => e.projectId === projectId && e.key === key);
    const payload = {
      projectId,
      key,
      enabled:input.enabled !== false,
      limit:Number.isFinite(Number(input.limit)) ? Number(input.limit) : null,
      used:Number.isFinite(Number(input.used)) ? Number(input.used) : entitlement?.used || 0,
      resetsAt:input.resetsAt || entitlement?.resetsAt || null,
      metadata:scrubSecrets(input.metadata || entitlement?.metadata || {}),
      updatedAt:nowISO(),
    };
    if (entitlement) Object.assign(entitlement, payload);
    else {
      entitlement = {id:input.id || id('ent'), ts:nowISO(), ...payload};
      this.state.entitlements.unshift(entitlement);
    }
    await this.save();
    return deepClone(entitlement);
  }

  async consumeEntitlement({projectId=DEFAULT_PROJECT_ID, key, quantity=1}={}){
    const entitlement = this.state.entitlements.find(e => e.projectId === projectId && e.key === key);
    if (!entitlement) return {ok:false, reason:'entitlement_missing', projectId, key};
    if (entitlement.enabled === false) return {ok:false, reason:'entitlement_disabled', entitlement:deepClone(entitlement)};
    const qty = Math.max(0, Number(quantity || 1));
    const nextUsed = Number(entitlement.used || 0) + qty;
    if (entitlement.limit !== null && nextUsed > Number(entitlement.limit)) return {ok:false, reason:'entitlement_limit_exceeded', entitlement:deepClone(entitlement), requested:qty, remaining:Math.max(0, Number(entitlement.limit) - Number(entitlement.used || 0))};
    entitlement.used = nextUsed;
    entitlement.updatedAt = nowISO();
    await this.save();
    return {ok:true, entitlement:deepClone(entitlement), consumed:qty};
  }

  listEntitlements({projectId=null, enabled=null, limit=200}={}){
    return deepClone(this.state.entitlements.filter(e => (!projectId || e.projectId === projectId) && (enabled === null || e.enabled === enabled)).slice(0, Number(limit) || 200));
  }

  async saveRecord(collection, input={}){
    const safeCollection = String(collection || input.collection || 'records').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0,80) || 'records';
    const projectId = String(input.projectId || DEFAULT_PROJECT_ID);
    const recordId = String(input.id || '').trim();
    let record = recordId ? this.state.records.find(r => r.id === recordId && r.collection === safeCollection) : null;
    const payload = {projectId, collection:safeCollection, data:scrubSecrets(input.data || input), status:String(input.status || record?.status || 'active'), updatedAt:nowISO()};
    if (record) Object.assign(record, payload);
    else {
      record = {id:recordId || id('rec'), ts:nowISO(), ...payload};
      this.state.records.unshift(record);
    }
    if (this.state.records.length > 5000) this.state.records.length = 5000;
    await this.save();
    return deepClone(record);
  }

  listRecords({collection=null, projectId=null, status=null, limit=200}={}){
    return deepClone(this.state.records.filter(r => (!collection || r.collection === collection) && (!projectId || r.projectId === projectId) && (!status || r.status === status)).slice(0, Number(limit) || 200));
  }

  async saveForm(input={}){
    const formId = String(input.id || '').trim();
    let form = formId ? this.state.forms.find(f => f.id === formId) : null;
    const fields = Array.isArray(input.fields) ? input.fields.map(f => scrubSecrets(f)) : (form?.fields || []);
    const payload = {
      projectId:String(input.projectId || form?.projectId || DEFAULT_PROJECT_ID),
      title:String(input.title || form?.title || 'Platform form'),
      slug:String(input.slug || form?.slug || slugify(input.title || 'platform-form')),
      status:String(input.status || form?.status || 'active'),
      fields,
      submitWorkflowId:String(input.submitWorkflowId || form?.submitWorkflowId || ''),
      metadata:scrubSecrets(input.metadata || form?.metadata || {}),
      updatedAt:nowISO(),
    };
    if (form) Object.assign(form, payload);
    else {
      form = {id:formId || id('form'), ts:nowISO(), ...payload};
      this.state.forms.unshift(form);
    }
    if (this.state.forms.length > 500) this.state.forms.length = 500;
    await this.save();
    return deepClone(form);
  }

  listForms({projectId=null, status=null, limit=100}={}){
    return deepClone(this.state.forms.filter(f => (!projectId || f.projectId === projectId) && (!status || f.status === status)).slice(0, Number(limit) || 100));
  }

  getForm(formId){ return deepClone(this.state.forms.find(f => f.id === formId || f.slug === formId) || null); }

}

export function projectIdFrom(input={}, claims={}){
  return String(input.projectId || claims.projectId || claims.defaultProjectId || DEFAULT_PROJECT_ID);
}

export function canAccessProject(project, claims={}, action='read'){
  if (!project) return false;
  const roles = new Set(Array.isArray(claims.roles) ? claims.roles.map(String) : []);
  if (roles.has('owner') || roles.has('admin')) return true;
  if (action === 'read' && (roles.has('viewer') || roles.has('operator'))) return true;
  if ((action === 'write' || action === 'run') && roles.has('operator')) return true;
  const projectRoles = claims.projectRoles && typeof claims.projectRoles === 'object' ? claims.projectRoles : {};
  const scoped = new Set(Array.isArray(projectRoles[project.id]) ? projectRoles[project.id].map(String) : []);
  if (scoped.has('owner') || scoped.has('admin')) return true;
  if (action === 'read' && (scoped.has('viewer') || scoped.has('operator'))) return true;
  if ((action === 'write' || action === 'run') && scoped.has('operator')) return true;
  return false;
}


function scrubSecrets(value){
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (typeof value === 'object'){
    const out = {};
    for (const [k,v] of Object.entries(value)){
      const lk = String(k).toLowerCase();
      if (/(secret|token|password|authorization|bearer|private_key|api_key)/.test(lk)) out[k] = '[redacted]';
      else out[k] = scrubSecrets(v);
    }
    return out;
  }
  return value;
}

function normalizeBudget(raw){
  const budget = raw && typeof raw === 'object' ? raw : {};
  return {
    monthlyCapCents:Number.isFinite(Number(budget.monthlyCapCents)) ? Math.max(0, Math.round(Number(budget.monthlyCapCents))) : 50000,
    hardStop:budget.hardStop !== false,
  };
}

function slugify(value){
  return String(value || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,64) || 'project';
}
