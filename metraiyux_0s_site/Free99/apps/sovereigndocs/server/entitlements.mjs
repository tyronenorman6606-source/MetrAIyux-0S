const PLAN_LIMITS = {
  free: { templateSearch:true, assemble:true, docxExportsPerMonth:0, packetAssembly:false, partnerReview:false, admin:false },
  starter: { templateSearch:true, assemble:true, docxExportsPerMonth:10, packetAssembly:true, partnerReview:true, admin:false },
  business: { templateSearch:true, assemble:true, docxExportsPerMonth:100, packetAssembly:true, partnerReview:true, admin:false },
  operator: { templateSearch:true, assemble:true, docxExportsPerMonth:1000, packetAssembly:true, partnerReview:true, admin:true },
  enterprise: { templateSearch:true, assemble:true, docxExportsPerMonth:5000, packetAssembly:true, partnerReview:true, admin:true }
};
function roles(session){ return session?.user?.roles || []; }
export function resolvePlan(session, explicitPlan){
  if(explicitPlan && PLAN_LIMITS[explicitPlan]) return explicitPlan;
  const user = session?.user || {};
  const raw = user.plan || user.subscriptionPlan || user.entitlementPlan || process.env.SOVEREIGNDOCS_DEFAULT_PLAN || 'free';
  if(PLAN_LIMITS[raw]) return raw;
  if(roles(session).some(r => ['owner','admin','operator'].includes(r))) return 'operator';
  return 'free';
}
export function entitlementSnapshot(session, explicitPlan){
  const plan = resolvePlan(session, explicitPlan);
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const elevated = roles(session).some(r => ['owner','admin','operator'].includes(r));
  return { ok:true, plan, limits:{...limit, admin:limit.admin || elevated}, roles:roles(session), verified:!!session?.verified };
}
export function requireEntitlement(session, feature, options = {}){
  const snap = entitlementSnapshot(session, options.plan);
  if(snap.limits[feature] || snap.limits.admin) return { ok:true, ...snap, feature };
  return { ok:false, status:402, error:`Plan '${snap.plan}' does not include ${feature}.`, feature, ...snap };
}
export function assertExportQuota({ session, usage = [], plan }){
  const snap = entitlementSnapshot(session, plan);
  if(snap.limits.admin && !plan) return { ok:true, ...snap, usedThisMonth:0 };
  const limit = Number(snap.limits.docxExportsPerMonth || 0);
  const month = new Date().toISOString().slice(0,7);
  const userId = session?.user?.id || 'anonymous';
  const used = usage.filter(e => e?.type === 'document_exported_docx' && String(e?.session?.user?.id || 'anonymous') === String(userId) && String(e?.at || e?.createdAt || '').startsWith(month)).length;
  if(used >= limit) return { ok:false, status:402, error:`DOCX export quota reached for plan '${snap.plan}'.`, plan:snap.plan, limit, usedThisMonth:used };
  return { ok:true, ...snap, limit, usedThisMonth:used };
}
