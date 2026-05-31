import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(value){ return Buffer.from(value).toString('base64url'); }
function hmac(secret, payload){ return createHmac('sha256', secret).update(payload).digest('base64url'); }
function safeEqual(a, b){
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function signClaims(claims, {secret=process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET, timestamp=Date.now()}={}){
  if (!secret) throw new Error('CODESTUDIO_UPSTREAM_CLAIMS_SECRET is required to sign claims.');
  const encoded = b64url(JSON.stringify(claims || {}));
  const ts = String(timestamp);
  const signature = hmac(secret, `${ts}.${encoded}`);
  return {encoded, timestamp:ts, signature};
}

export function verifyClaimsEnvelope({encoded, signature, timestamp, bodyClaims=null}={}){
  const secret = process.env.CODESTUDIO_UPSTREAM_CLAIMS_SECRET;
  const allowUnsignedDev = process.env.CODESTUDIO_ALLOW_UNSIGNED_DEV_CLAIMS === '1';
  const strict = !allowUnsignedDev || process.env.CODESTUDIO_REQUIRE_SIGNED_CLAIMS === '1' || !!secret;
  if (encoded){
    let claims = {};
    try { claims = JSON.parse(Buffer.from(String(encoded), 'base64url').toString('utf8')); }
    catch { throw Object.assign(new Error('Invalid upstream claims encoding.'), {status:401}); }
    if (!secret){
      claims.__claimVerification = {ok:!strict, mode:'unsigned_dev_allowed'};
      if (strict) throw Object.assign(new Error('Signed upstream claims required.'), {status:401});
      return claims;
    }
    if (!signature || !timestamp) throw Object.assign(new Error('Signed upstream claims require timestamp and signature.'), {status:401});
    const ageMs = Math.abs(Date.now() - Number(timestamp));
    const maxAgeMs = Number(process.env.CODESTUDIO_CLAIMS_MAX_AGE_MS || 5 * 60 * 1000);
    if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) throw Object.assign(new Error('Upstream claims signature timestamp expired.'), {status:401});
    const expected = hmac(secret, `${timestamp}.${encoded}`);
    if (!safeEqual(signature, expected)) throw Object.assign(new Error('Upstream claims signature invalid.'), {status:401});
    claims.__claimVerification = {ok:true, mode:'hmac-sha256', signedAt:Number(timestamp)};
    return claims;
  }
  if (bodyClaims){
    if (strict){
      const err = new Error('Body claims are disabled when signed upstream claims are required. Send x-kaixu-claims, x-kaixu-claims-ts, and x-kaixu-claims-signature.');
      err.status = 401;
      throw err;
    }
    return {...bodyClaims, __claimVerification:{ok:false, mode:'body_unsigned_dev_allowed'}};
  }
  if (strict){
    const err = new Error('Signed upstream claims required.');
    err.status = 401;
    throw err;
  }
  return null;
}

export function claimsFromHeaders(headers={}, body={}){
  const encoded = headers['x-kaixu-claims'] || headers['x-codestudio-claims'];
  const signature = headers['x-kaixu-claims-signature'] || headers['x-codestudio-claims-signature'];
  const timestamp = headers['x-kaixu-claims-ts'] || headers['x-codestudio-claims-ts'];
  return verifyClaimsEnvelope({encoded, signature, timestamp, bodyClaims:body?.claims || null});
}

function cleanBearer(value = ''){
  const raw = String(value || '').trim();
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : raw;
}

function fs27Origin(){
  return String(process.env.SKYGATEFS27_ORIGIN || process.env.SKYGATE_ORIGIN || '').replace(/\/+$/, '');
}

function bearerFromHeaders(headers = {}){
  return cleanBearer(
    headers.authorization
    || headers.Authorization
    || headers['x-skye-gate-session']
    || headers['x-skygate-session']
    || headers['x-fs27-session']
    || headers['x-0s-gate-session']
    || ''
  );
}

function fs27Error(message, status = 401, code = 'fs27_required'){
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function rolesFromFs27(data = {}){
  const role = String(data.role || data.user?.role || '').trim().toLowerCase();
  const scopes = Array.isArray(data.scopes) ? data.scopes : String(data.scope || data.user?.scope || '').split(/\s+/).filter(Boolean);
  const roles = new Set([role, ...scopes.map(scope => String(scope).replace(/\..*$/, ''))].filter(Boolean));
  if (['founder', 'owner', 'admin', 'deployer', 'operator'].includes(role)) roles.add(role);
  if (scopes.some(scope => ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke'].includes(String(scope).toLowerCase()))) roles.add('admin');
  return [...roles];
}

async function introspectFs27Bearer(token){
  const origin = fs27Origin();
  if (!origin) throw fs27Error('FS27/SkyGate origin is required for CodeStudio platform auth.', 503, 'fs27_origin_missing');
  const paths = ['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'];
  let last = null;
  for (const path of paths){
    const res = await fetch(`${origin}${path}`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({token})
    });
    const data = await res.json().catch(() => ({active:false, error:'Invalid FS27 response'}));
    last = {res, data, path};
    if (res.status === 404) continue;
    if (!res.ok || data.active !== true) throw fs27Error(data.error || 'FS27/SkyGate bearer token is inactive.', res.ok ? 401 : res.status, 'fs27_inactive');
    const roles = rolesFromFs27(data);
    return {
      sub:data.sub || data.user_id || data.user?.id || data.email || data.username || 'fs27-user',
      email:data.email || data.username || data.user?.email || '',
      roles,
      role:data.role || data.user?.role || '',
      scope:data.scope || data.scopes || data.user?.scope || '',
      scopes:Array.isArray(data.scopes) ? data.scopes : String(data.scope || data.user?.scope || '').split(/\s+/).filter(Boolean),
      projectId:data.project_id || data.projectId || data.workspace || data.workspace_id || 'default',
      projectRoles:data.projectRoles || { [data.project_id || data.projectId || data.workspace || data.workspace_id || 'default']: roles },
      fs27:data,
      __claimVerification:{ok:true, mode:'fs27-introspection', path}
    };
  }
  throw fs27Error(last?.data?.error || 'FS27/SkyGate introspection endpoint was not found.', 503, 'fs27_introspection_missing');
}

export async function claimsFromRequest(req, body={}){
  try {
    return claimsFromHeaders(req.headers || {}, body || {});
  } catch (error) {
    if (!bearerFromHeaders(req.headers || {})) throw error;
  }
  const bearer = bearerFromHeaders(req.headers || {});
  if (!bearer) throw fs27Error('FS27/SkyGate bearer or signed upstream claims are required.', 401, 'fs27_bearer_required');
  return introspectFs27Bearer(bearer);
}
