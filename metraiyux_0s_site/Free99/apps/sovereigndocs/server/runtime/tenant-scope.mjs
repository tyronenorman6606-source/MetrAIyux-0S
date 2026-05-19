export const PRIVILEGED_ROLES = ['owner','admin','operator','reviewer','partner_manager','legal_partner'];

export function tenantScopeFromSession(session = {}){
  const user = session?.user || {};
  const orgId = user.orgId || user.organizationId || user.organization || 'public';
  return { userId:user.id || null, orgId:orgId ? String(orgId) : null, roles:user.roles || session?.roles || [], verified:!!session?.verified, mode:session?.mode || 'unknown' };
}
export function isPrivilegedTenantScope(scope = {}){ return (scope.roles || []).some(role => PRIVILEGED_ROLES.includes(role)); }
export function scopedOwnerFromSession(session = {}){ const scope=tenantScopeFromSession(session); return { id:scope.userId, orgId:scope.orgId, roles:scope.roles, verified:scope.verified }; }
export function withTenantScope(record = {}, session = {}, extra = {}){ const scope=tenantScopeFromSession(session); return { ...record, tenant:{ orgId:scope.orgId, userId:scope.userId, visibility:extra.visibility || record?.tenant?.visibility || 'tenant_private', createdByVerifiedSession:scope.verified } }; }
export function ownerCandidates(record = {}){ return [record.owner, record.tenant, record.submittedBy, record.requestedBy, record.user, record.session?.user, record.createdBy].filter(Boolean); }
export function canAccessTenantRecord(session = {}, record = {}){ const scope=tenantScopeFromSession(session); if(isPrivilegedTenantScope(scope)) return true; if(!scope.userId && !scope.orgId) return false; return ownerCandidates(record).some(owner => (scope.userId && owner.id && String(owner.id) === String(scope.userId)) || (scope.orgId && owner.orgId && String(owner.orgId) === String(scope.orgId)) || (scope.orgId && owner.organizationId && String(owner.organizationId) === String(scope.orgId))); }
export function filterTenantRecords(session = {}, rows = []){ return (rows || []).filter(row => canAccessTenantRecord(session, row)); }
export function assertTenantAccess(session = {}, record = {}, label = 'record'){ if(canAccessTenantRecord(session, record)) return { ok:true }; return { ok:false, status:403, error:`You do not have access to this ${label}.` }; }
export function tenantAuditMeta(session = {}){ const scope=tenantScopeFromSession(session); return { orgId:scope.orgId, userId:scope.userId, verified:scope.verified, mode:scope.mode }; }
