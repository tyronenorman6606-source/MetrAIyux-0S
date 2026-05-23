export function tenantFilter(rows=[], session, ownerPath='submittedBy'){
  const roles = session?.user?.roles || [];
  if(roles.some(role => ['owner','admin','operator','reviewer','partner_manager','legal_partner'].includes(role))) return rows;
  const userId = session?.user?.id;
  const orgId = session?.user?.orgId;
  return rows.filter(row => {
    const owner = row?.[ownerPath] || row?.session?.user || row?.submittedBy || row?.createdBy || {};
    return (userId && String(owner.id) === String(userId)) || (orgId && String(owner.orgId) === String(orgId));
  });
}
