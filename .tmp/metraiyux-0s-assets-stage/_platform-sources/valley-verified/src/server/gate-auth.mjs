export const GATE_AUTH_VERSION = '0s-fs27-1.0.0';

const UPSTREAM_HEADERS = new Set([
  'x-upstream-user-id',
  'x-upstream-user-email',
  'x-upstream-roles',
  'x-upstream-source',
  'x-upstream-customer-id',
  'x-upstream-workspace-id',
  'x-upstream-plan'
]);

function truthy(value){
  return ['1','true','yes','y','required'].includes(String(value || '').toLowerCase());
}

function headerEntries(headers = {}){
  if(headers && typeof headers.entries === 'function') return Array.from(headers.entries());
  return Object.entries(headers || {});
}

export function getHeader(headers = {}, name){
  const lower = name.toLowerCase();
  for(const [key, value] of headerEntries(headers)) if(String(key).toLowerCase() === lower) return value;
  return '';
}

export function bearerToken(headers = {}){
  return String(getHeader(headers, 'authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

export function skygateOrigin(env = {}){
  return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || env.FS27_GATE_ORIGIN || '').replace(/\/+$/, '');
}

export function gateAuthRequired(env = {}){
  return Boolean(skygateOrigin(env)) || truthy(env.PHX_GATE_AUTH_REQUIRED || env.FS27_GATE_AUTH_REQUIRED || env.SKYGATE_AUTH_REQUIRED);
}

export function trustUpstreamHeaders(env = {}){
  return truthy(env.PHX_TRUST_UPSTREAM_HEADERS || env.PHX_ALLOW_TRUSTED_UPSTREAM_HEADERS) || env.ALLOW_LOCAL_ACTIONS === 'true';
}

export function hasUpstreamIdentity(headers = {}){
  return Boolean(getHeader(headers, 'x-upstream-user-id') || getHeader(headers, 'x-upstream-user-email'));
}

function normalizeRoles(value){
  if(Array.isArray(value)) return value.map(String).map(v => v.trim().toLowerCase()).filter(Boolean);
  return String(value || '').split(/[|,\s]+/).map(v => v.trim().toLowerCase()).filter(Boolean);
}

function normalizeScopeRoles(value){
  return normalizeRoles(value)
    .map(scope => scope.replace(/^role:/, ''))
    .filter(scope => ['admin','ae','owner','buyer','system','customer'].includes(scope));
}

export function actorFromGatePayload(data = {}){
  const user = data.user && typeof data.user === 'object' ? data.user : {};
  const roles = [
    ...normalizeRoles(data.roles || user.roles || data.role || user.role),
    ...normalizeScopeRoles(data.scope || data.scopes || user.scope || user.scopes)
  ];
  const customerId = data.customer_id || data.customerId || data.org_id || data.org || user.customer_id || '';
  const workspaceId = data.workspace_id || data.workspaceId || data.ws_id || user.workspace_id || '';
  const plan = data.plan || data.plan_id || data.subscription_plan || user.plan || '';
  return {
    id:String(data.sub || data.user_id || data.userId || user.id || data.id || '').trim(),
    email:String(data.email || user.email || data.username || user.username || '').trim(),
    roles:Array.from(new Set(roles)).join(' '),
    customer_id:String(customerId || '').trim(),
    workspace_id:String(workspaceId || '').trim(),
    plan:String(plan || '').trim()
  };
}

export function stripPublicUpstreamHeaders(headers = {}){
  const clean = {};
  for(const [key, value] of headerEntries(headers)){
    if(!UPSTREAM_HEADERS.has(String(key).toLowerCase())) clean[key] = value;
  }
  return clean;
}

export function headersWithGateActor(headers = {}, actor = {}){
  const clean = stripPublicUpstreamHeaders(headers);
  return {
    ...clean,
    'x-upstream-user-id':actor.id || '',
    'x-upstream-user-email':actor.email || '',
    'x-upstream-roles':actor.roles || '',
    'x-upstream-source':'skygatefs27',
    ...(actor.customer_id ? { 'x-upstream-customer-id':actor.customer_id } : {}),
    ...(actor.workspace_id ? { 'x-upstream-workspace-id':actor.workspace_id } : {}),
    ...(actor.plan ? { 'x-upstream-plan':actor.plan } : {})
  };
}

function gatePaths(env = {}){
  const raw = env.SKYGATE_INTROSPECTION_PATHS || env.FS27_INTROSPECTION_PATHS || '';
  const paths = raw ? raw.split(',').map(v => v.trim()).filter(Boolean) : [
    '/auth-introspect',
    '/auth/introspect',
    '/api/skygate/auth-introspect',
    '/.netlify/functions/auth-introspect'
  ];
  return paths.map(path => path.startsWith('/') ? path : `/${path}`);
}

export async function introspectGateToken({ token, env = {}, fetchImpl = globalThis.fetch } = {}){
  const origin = skygateOrigin(env);
  if(!origin) return { ok:false, status:501, error:'SKYGATEFS27_ORIGIN, SKYGATE_ORIGIN, or FS27_GATE_ORIGIN is not configured.' };
  if(!token) return { ok:false, status:401, error:'Missing Authorization bearer token.' };
  if(typeof fetchImpl !== 'function') return { ok:false, status:500, error:'Fetch is not available for FS27 gate introspection.' };
  let last = null;
  for(const path of gatePaths(env)){
    const res = await fetchImpl(`${origin}${path}`, {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body:JSON.stringify({ token, source_app:env.PHX_GATE_SOURCE_APP || 'phx-verified-0s' })
    });
    const data = await res.json().catch(() => ({ active:false, error:'Invalid FS27 gate response.' }));
    last = { res, data, path };
    if(res.status === 404) continue;
    const active = data.active === true || data.ok === true || data.valid === true;
    return {
      ok:res.ok && active,
      status:res.ok ? (active ? 200 : 401) : res.status,
      path,
      data,
      actor:actorFromGatePayload(data),
      error:data.error || (active ? '' : 'Inactive FS27 gate token.')
    };
  }
  return { ok:false, status:404, data:last?.data || null, error:`FS27 gate introspection endpoint was not found at ${origin}.` };
}

function json(statusCode, body){
  return { statusCode, headers:{ 'content-type':'application/json' }, body:JSON.stringify(body) };
}

export async function prepareGateAuthenticatedEvent(event = {}, env = {}, options = {}){
  if(options.allowPublic) return { ok:true, event };
  if(env.ALLOW_LOCAL_ACTIONS === 'true') return { ok:true, event };

  const headers = event.headers || {};
  const token = bearerToken(headers);
  const origin = skygateOrigin(env);

  if(!origin){
    if(hasUpstreamIdentity(headers) && trustUpstreamHeaders(env)) return { ok:true, event };
    if(gateAuthRequired(env)) return { ok:false, response:json(501, { ok:false, error:'PHX gate auth is required, but no FS27 gate origin is configured.' }) };
    return { ok:true, event };
  }

  if(!token){
    if(hasUpstreamIdentity(headers) && trustUpstreamHeaders(env)) return { ok:true, event };
    return { ok:false, response:json(401, { ok:false, error:'Missing FS27 gate bearer token.' }) };
  }

  const gate = await introspectGateToken({ token, env, fetchImpl:options.fetchImpl });
  if(!gate.ok) return { ok:false, response:json(gate.status || 401, { ok:false, error:gate.error, gate:{ path:gate.path || null, active:false } }) };
  if(!gate.actor.id && !gate.actor.email) return { ok:false, response:json(401, { ok:false, error:'FS27 gate token is active but did not return a usable user id or email.' }) };

  return {
    ok:true,
    actor:gate.actor,
    gate,
    event:{ ...event, headers:headersWithGateActor(headers, gate.actor) }
  };
}

export function gateAuthServiceForApi(){
  return {
    version:GATE_AUTH_VERSION,
    authority:'SkyeGateFS27',
    accepted_input:'Authorization: Bearer <FS27 session JWT or kx_live API key>',
    injected_headers:['x-upstream-user-id','x-upstream-user-email','x-upstream-roles','x-upstream-customer-id','x-upstream-workspace-id','x-upstream-plan'],
    production_required_env:['SKYGATEFS27_ORIGIN','PHX_GATE_AUTH_REQUIRED=true'],
    spoofing_control:'Public x-upstream-* headers are stripped before trusted FS27 identity is injected.'
  };
}
