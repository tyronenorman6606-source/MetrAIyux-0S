const postSchema = (required=[], properties={}) => ({type:'object', required, properties});
const str = {type:'string'};
const num = {type:'number'};
const bool = {type:'boolean'};
const obj = {type:'object'};
const arr = {type:'array'};

export const ROUTE_SPECS = [
  ['GET','/api/health','Platform engine health',null],
  ['GET','/api/platform/manifest','Loaded platform manifest',null],
  ['GET','/api/platform/openapi.json','OpenAPI route/schema contract',null],
  ['GET','/api/platform/receipts','Receipt ledger',null],
  ['GET','/api/platform/providers/probe','Provider probe',null],
  ['GET','/api/platform/provider-packs','Provider-pack catalog',null],
  ['GET','/api/platform/storage','Storage adapter catalog and active state',null],
  ['POST','/api/platform/storage/verify','Verify active storage adapter by writing audit state',postSchema([])],
  ['POST','/api/platform/provider-packs/{providerId}/actions/{route}/run','Execute provider-pack action',postSchema([], {projectId:str, input:obj, claims:obj})],
  ['GET','/api/platform/projects','Project list',null],
  ['POST','/api/platform/projects','Create/update project',postSchema([], {id:str, name:str, slug:str, project:obj, claims:obj})],
  ['GET','/api/platform/projects/{projectId}/providers','Project provider installs',null],
  ['POST','/api/platform/projects/{projectId}/providers/{providerId}','Install provider',postSchema([], {enabled:bool, secretRef:str, routes:arr, claims:obj})],
  ['POST','/api/platform/projects/{projectId}/provider-packs/{packId}/install','Install provider pack',postSchema([], {enabled:bool, secretRef:str, claims:obj})],
  ['POST','/api/platform/projects/{projectId}/providers/{providerId}/rotate','Rotate provider secret reference',postSchema([], {claims:obj})],
  ['GET','/api/platform/runs','Workflow run history',null],
  ['GET','/api/platform/webhooks','Webhook inbox',null],
  ['GET','/api/platform/webhooks/dispatch-rules','Webhook dispatch rules',null],
  ['POST','/api/platform/webhooks/ingest','Ingest signed/idempotent webhook',postSchema([], {payload:obj, claims:obj})],
  ['POST','/api/platform/webhooks/{eventId}/replay','Replay webhook event and dispatch mapped workflow',postSchema([], {approvals:obj, claims:obj})],
  ['GET','/api/platform/approvals','Approval list',null],
  ['POST','/api/platform/approvals/{approvalId}/resolve','Resolve approval',postSchema([], {status:str, note:str, claims:obj})],
  ['GET','/api/platform/jobs','Job list',null],
  ['POST','/api/platform/jobs','Enqueue job',postSchema(['workflowId'], {workflowId:str, input:obj, claims:obj, approvals:obj, runAt:str, maxAttempts:num})],
  ['POST','/api/platform/jobs/{jobId}/run','Run locked job',postSchema([], {claims:obj})],
  ['POST','/api/platform/jobs/{jobId}/extend-lock','Extend active job lock lease',postSchema([], {claims:obj, lockId:str, ttlMs:num})],
  ['POST','/api/platform/jobs/{jobId}/cancel','Cancel queued/running job',postSchema([], {claims:obj, reason:str})],
  ['POST','/api/platform/jobs/recover','Recover stale job locks',postSchema([], {claims:obj})],
  ['POST','/api/platform/jobs/drain','Drain due jobs',postSchema([], {claims:obj, limit:num})],
  ['GET','/api/platform/dead-letters','Dead-letter queue',null],
  ['POST','/api/platform/dead-letters/{deadLetterId}/retry','Retry dead-lettered job as a new queued job',postSchema([], {claims:obj, runAt:str, resetAttempts:bool})],
  ['GET','/api/platform/schedules','Schedule list',null],
  ['POST','/api/platform/schedules','Upsert schedule',postSchema(['workflowId'], {workflowId:str, input:obj, claims:obj, intervalMinutes:num, nextRunAt:str})],
  ['POST','/api/platform/schedules/tick','Enqueue due schedules',postSchema([], {claims:obj, limit:num})],
  ['GET','/api/platform/meters','Usage meters',null],
  ['GET','/api/platform/provider-router','Route decisions',null],
  ['POST','/api/platform/provider-router/optimize','Optimize provider route',postSchema([], {projectId:str, intent:str, candidates:arr, requireInstalled:bool, claims:obj})],
  ['GET','/api/platform/invoices','Invoices',null],
  ['POST','/api/platform/projects/{projectId}/invoices/generate','Generate invoice',postSchema([], {customer:obj, period:obj, lineItems:arr, claims:obj})],
  ['GET','/api/platform/workflow-builder/graphs','Workflow graphs',null],
  ['POST','/api/platform/workflow-builder/graphs','Save workflow graph',postSchema([], {projectId:str, graph:obj, claims:obj})],
  ['POST','/api/platform/workflow-builder/graphs/{graphId}/run','Run workflow graph',postSchema([], {input:obj, claims:obj})],
  ['POST','/api/platform/projects/{projectId}/export','Export project bundle',postSchema([], {claims:obj})],
  ['POST','/api/platform/import','Import project bundle',postSchema(['bundle'], {bundle:obj, claims:obj})],
  ['GET','/api/platform/bundles','Bundle/import ledger',null],
  ['POST','/api/platform/preflight','Workflow preflight',postSchema(['templateId'], {templateId:str, workflowId:str, input:obj, claims:obj, approvals:obj})],
  ['POST','/api/platform/workflows/{workflowId}/run','Run workflow through action registry',postSchema([], {input:obj, claims:obj, approvals:obj})],
  ['GET','/api/platform/audit','Audit events',null],
  ['POST','/api/platform/audit','Record audit event',postSchema([], {projectId:str, action:str, target:str, severity:str, metadata:obj, claims:obj})],
  ['GET','/api/platform/incidents','Incident list',null],
  ['POST','/api/platform/incidents','Open incident',postSchema([], {projectId:str, title:str, severity:str, source:str, claims:obj})],
  ['POST','/api/platform/incidents/{incidentId}/resolve','Resolve incident',postSchema([], {note:str, claims:obj})],
  ['GET','/api/platform/entitlements','Entitlement list',null],
  ['POST','/api/platform/entitlements','Upsert entitlement',postSchema(['key'], {projectId:str, key:str, enabled:bool, limit:num, used:num, claims:obj})],
  ['POST','/api/platform/entitlements/check','Consume/check entitlement',postSchema(['key'], {projectId:str, key:str, quantity:num, claims:obj})],
  ['GET','/api/platform/records/{collection}','Collection records',null],
  ['POST','/api/platform/records/{collection}','Save collection record',postSchema([], {projectId:str, data:obj, status:str, claims:obj})],
  ['GET','/api/platform/forms','Form list',null],
  ['POST','/api/platform/forms','Save form',postSchema([], {projectId:str, title:str, fields:arr, submitWorkflowId:str, claims:obj})],
  ['POST','/api/platform/forms/{formId}/submit','Submit form',postSchema(['data'], {data:obj, claims:obj})],
  ['GET','/api/platform/scorecard','Project scorecard',null],
  ['POST','/api/platform/smoke','Run server smoke',postSchema([])],
];

export function openApiDocument(){
  const paths = {};
  for (const [method, route, summary, schema] of ROUTE_SPECS){
    paths[route] ||= {};
    paths[route][method.toLowerCase()] = {
      summary,
      requestBody:schema ? {required:false, content:{'application/json':{schema}}} : undefined,
      responses:{'200':{description:'OK'}, '400':{description:'Validation error'}, '401':{description:'Signed upstream claim failure'}, '409':{description:'Blocked or conflict'}, '500':{description:'Server error'}},
    };
  }
  return {openapi:'3.1.0', info:{title:'kAIxu CodeStudio Platform Engine API', version:'5.9.0'}, paths, components:{schemas:{Envelope:{type:'object'}, Error:{type:'object'}}}};
}

export function validateBodyForRoute(method, pathname, body={}){
  const match = ROUTE_SPECS.find(([m, route]) => m === method && routeToRegex(route).test(pathname));
  if (!match) return {ok:true, skipped:true};
  const schema = match[3];
  if (!schema || method === 'GET') return {ok:true, route:match[1]};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {ok:false, status:400, error:`${method} ${match[1]} expects a JSON object body.`};
  const missing = (schema.required || []).filter(key => body[key] === undefined && body.input?.[key] === undefined && body.project?.[key] === undefined && body.graph?.[key] === undefined && body.data?.[key] === undefined);
  if (missing.length) return {ok:false, status:400, error:`Missing required field(s): ${missing.join(', ')}`, route:match[1]};
  const typed = validateTypes(schema.properties || {}, body);
  if (!typed.ok) return {ok:false, status:400, error:typed.error, route:match[1]};
  return {ok:true, route:match[1]};
}

function validateTypes(properties={}, body={}){
  for (const [key, schema] of Object.entries(properties)){
    if (body[key] === undefined) continue;
    const value = body[key];
    const type = schema.type;
    if (type === 'array' && !Array.isArray(value)) return {ok:false, error:`${key} must be an array`};
    if (type === 'object' && (value === null || typeof value !== 'object' || Array.isArray(value))) return {ok:false, error:`${key} must be an object`};
    if (type === 'string' && typeof value !== 'string') return {ok:false, error:`${key} must be a string`};
    if (type === 'number' && !Number.isFinite(Number(value))) return {ok:false, error:`${key} must be a number`};
    if (type === 'boolean' && typeof value !== 'boolean') return {ok:false, error:`${key} must be a boolean`};
  }
  return {ok:true};
}

function routeToRegex(route){
  return new RegExp('^' + route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+') + '$');
}
