import { tenantScopeFromSession, ownerCandidates } from './tenant-scope.mjs';

export const CLOSURE_VERSION = '18.0.0';

function sameTenantOrOwner(scope = {}, record = {}){
  const owners = ownerCandidates(record);
  return owners.some(owner =>
    (scope.userId && owner.id && String(owner.id) === String(scope.userId)) ||
    (scope.orgId && owner.orgId && String(owner.orgId) === String(scope.orgId)) ||
    (scope.orgId && owner.organizationId && String(owner.organizationId) === String(scope.orgId))
  );
}
function isGlobalOwner(scope = {}){
  // v18 closure deliberately does not let generic operators/reviewers cross orgs.
  return (scope.roles || []).some(role => ['owner','admin'].includes(role)) && String(scope.orgId || '') === 'sovereigndocs-root';
}
export function requireTenantWrite(session = {}, action = 'write'){
  const scope = tenantScopeFromSession(session);
  const hasUser = !!scope.userId;
  const hasOrg = !!scope.orgId && scope.orgId !== 'public';
  if(!session?.user || (!hasUser && !hasOrg)){
    return { ok:false, status:401, error:`A scoped upstream user/org is required for ${action}.` };
  }
  return { ok:true, scope };
}
export function assertOwnedOrPrivileged(session = {}, record = {}, label = 'record'){
  const scope = tenantScopeFromSession(session);
  if(isGlobalOwner(scope)) return { ok:true, scope, privileged:true };
  if(sameTenantOrOwner(scope, record)) return { ok:true, scope, privileged:false };
  return { ok:false, status:403, error:`You do not have access to this ${label}.`, scope };
}
export function applyTenantQuery(session = {}, rows = []){
  const scope = tenantScopeFromSession(session);
  if(isGlobalOwner(scope)) return rows || [];
  return (rows || []).filter(row => sameTenantOrOwner(scope, row));
}
export function closureEnvelope({ area, action, data = {}, session = {}, warnings = [] }){
  return {
    ok:true,
    closureVersion:CLOSURE_VERSION,
    area,
    action,
    scope:tenantScopeFromSession(session),
    warnings,
    ...data
  };
}
