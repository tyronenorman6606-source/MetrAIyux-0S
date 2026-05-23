import crypto from 'node:crypto';
import { isProduction } from './config.mjs';

function base64UrlDecode(value = ''){
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function timingSafeEqualHex(a = '', b = ''){
  const left = Buffer.from(String(a), 'hex');
  const right = Buffer.from(String(b), 'hex');
  if(left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifySignedSessionToken(token, secret){
  if(!token || !secret) return null;
  const parts = String(token).split('.');
  if(parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  if(!timingSafeEqualHex(signature, expected)) return null;
  const payload = JSON.parse(base64UrlDecode(payloadB64));
  if(payload.exp && Date.now() / 1000 > Number(payload.exp)) return null;
  return payload;
}

export function createSignedSessionToken(payload, secret){
  if(!secret || String(secret).length < 16){
    const error = new Error('A non-trivial upstream signing secret is required to mint a dev token.');
    error.status = 503;
    throw error;
  }
  const json = JSON.stringify(payload || {});
  const encoded = Buffer.from(json, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  return `${encoded}.${signature}`;
}

function rolesFromUser(user = {}){
  const raw = user.roles || user.role || [];
  if(Array.isArray(raw)) return raw.map(String);
  if(typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function normalizeUser(user = {}, verified = false){
  const roles = rolesFromUser(user);
  return {
    id: String(user.id || user.sub || user.email || 'upstream-user'),
    name: String(user.name || user.email || user.id || 'Upstream User'),
    email: user.email || null,
    organization: user.organization || user.orgName || null,
    orgId: user.orgId || user.organizationId || null,
    roles: roles.length ? roles : ['public'],
    verified
  };
}

export function sessionFromRequest(req){
  const secret = process.env.SOVEREIGNDOCS_UPSTREAM_SECRET || process.env.OMEGA_SKYGATE_SHARED_SECRET || '';
  const requireVerified = process.env.SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH === '1' || isProduction();
  const signedToken = req.headers['x-sovereigndocs-session'] || req.headers['x-omega-skygate-session'];
  const verifiedPayload = verifySignedSessionToken(signedToken, secret);
  if(verifiedPayload){
    const user = normalizeUser(verifiedPayload.user || verifiedPayload, true);
    return { mode:'verified-upstream-session', verified:true, user, roles:user.roles };
  }

  if(requireVerified){
    return { mode:'missing-or-invalid-upstream-session', verified:false, user:null, roles:[] };
  }

  const rawUser = req.headers['x-sovereigndocs-user'] || req.headers['x-omega-skygate-user'];
  if(rawUser && !isProduction()){
    let parsed;
    try{ parsed = JSON.parse(String(rawUser)); } catch{ parsed = { id:String(rawUser), name:String(rawUser), roles:['public'] }; }
    const user = normalizeUser(parsed, false);
    return { mode:'legacy-dev-header-unverified', verified:false, user, roles:user.roles };
  }

  // Local operator exists only in non-production development mode. It is never returned in production.
  return { mode:'local-development-operator', verified:false, user:{ id:'local-operator', name:'Local Operator', organization:'SovereignDocs Workspace', orgId:'local', roles:['owner','operator','reviewer','admin'], verified:false }, roles:['owner','operator','reviewer','admin'] };
}

export function hasRole(session, allowed = []){
  const roles = session?.user?.roles || session?.roles || [];
  if(roles.includes('owner') || roles.includes('admin')) return true;
  return allowed.some(role => roles.includes(role));
}

export function requireRole(session, allowed = []){
  if(!session?.user) return { ok:false, status:401, error:'A verified upstream session is required for this route.' };
  if(isProduction() && !session.verified) return { ok:false, status:401, error:'Production routes require a verified upstream session token.' };
  if(!hasRole(session, allowed)) return { ok:false, status:403, error:`This route requires one of these roles: ${allowed.join(', ')}` };
  return { ok:true };
}
