export const TEMPLATE_PATCH_STATUSES = ['pending_review','approved','rejected','applied','cancelled'];
export const TEMPLATE_PATCH_FIELDS = ['title','summary','description','risk_level','publish_lane','tags','review_note','category_name'];

function cleanText(value, max = 4000){ return String(value ?? '').trim().slice(0, max); }
function cleanPatchFields(patch = {}){
  const clean = {};
  for(const [key, value] of Object.entries(patch || {})){
    if(!TEMPLATE_PATCH_FIELDS.includes(key)) continue;
    if(Array.isArray(value)) clean[key] = value.map(v => cleanText(v, 120)).filter(Boolean).slice(0, 30);
    else clean[key] = cleanText(value, key === 'review_note' ? 4000 : 500);
  }
  return clean;
}

export function createTemplatePatchRequest({ templateId, patch = {}, reason = '', session = {} }){
  if(!templateId){ const e = new Error('templateId is required.'); e.status=400; throw e; }
  const cleanPatch = cleanPatchFields(patch);
  if(!Object.keys(cleanPatch).length){ const e = new Error('No supported template patch fields supplied.'); e.status=400; e.allowed=TEMPLATE_PATCH_FIELDS; throw e; }
  const now = new Date().toISOString();
  return {
    id:`tpl_patch_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    templateId:String(templateId),
    patch:cleanPatch,
    reason:cleanText(reason, 2000),
    status:'pending_review',
    requestedBy:session?.user ? { id:session.user.id, email:session.user.email || null, roles:session.user.roles || [] } : null,
    createdAt:now,
    updatedAt:now,
    events:[{ status:'pending_review', at:now, actor:session?.user?.id || 'system', note:'template patch requested' }]
  };
}

export function transitionTemplatePatch(request, { status, actor='system', note='' }){
  if(!TEMPLATE_PATCH_STATUSES.includes(status)){ const e = new Error(`Unsupported template patch status: ${status}`); e.status=400; e.allowed=TEMPLATE_PATCH_STATUSES; throw e; }
  const now = new Date().toISOString();
  return { ...request, status, updatedAt:now, events:[...(request.events || []), { status, actor, note:cleanText(note, 1200), at:now }] };
}

export function summarizeTemplatePatch(request){
  return {
    id:request.id,
    templateId:request.templateId,
    status:request.status,
    fields:Object.keys(request.patch || {}),
    reason:request.reason,
    requestedBy:request.requestedBy,
    updatedAt:request.updatedAt,
    createdAt:request.createdAt
  };
}

export function createTemplateOverrideFromPatch(request, { actor = 'system', note = '' } = {}){
  if(request.status !== 'approved'){
    const e = new Error('Only approved template patch requests can be applied.');
    e.status = 409;
    e.currentStatus = request.status;
    throw e;
  }
  const now = new Date().toISOString();
  return {
    id:`tpl_override_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    templateId:request.templateId,
    sourcePatchRequestId:request.id,
    patch:cleanPatchFields(request.patch),
    actor,
    note:cleanText(note, 1200),
    active:true,
    createdAt:now,
    boundary:'Template override changes SovereignDocs metadata/rendering only. It does not create attorney review, state compliance, or legal advice.'
  };
}

export function applyTemplateOverrides({ item = {}, raw = {}, overrides = [] }){
  const templateId = raw.id || item.id;
  const active = (overrides || []).filter(o => o && o.active !== false && String(o.templateId) === String(templateId));
  if(!active.length) return { item, raw, appliedOverrides:[] };
  const patchedItem = { ...item };
  const patchedRaw = { ...raw };
  for(const override of active){
    const patch = cleanPatchFields(override.patch || {});
    if(patch.title){ patchedItem.title = patch.title; patchedRaw.title = patch.title; }
    if(patch.category_name){ patchedItem.category_name = patch.category_name; patchedRaw.category_name = patch.category_name; }
    if(patch.risk_level){ patchedItem.risk_level = patch.risk_level; patchedRaw.risk_level = patch.risk_level; }
    if(patch.publish_lane){ patchedItem.publish_lane = patch.publish_lane; patchedRaw.publish_lane = patch.publish_lane; }
    if(patch.tags){ patchedItem.tags = patch.tags; patchedRaw.tags = patch.tags; }
    if(patch.summary){ patchedItem.summary = patch.summary; patchedRaw.summary = patch.summary; }
    if(patch.description){ patchedItem.description = patch.description; patchedRaw.description = patch.description; }
    if(patch.review_note){ patchedRaw.review = { ...(patchedRaw.review || {}), operator_note:patch.review_note, override_source:override.id }; }
  }
  patchedRaw.applied_overrides = active.map(o => ({ id:o.id, sourcePatchRequestId:o.sourcePatchRequestId, createdAt:o.createdAt }));
  return { item:patchedItem, raw:patchedRaw, appliedOverrides:patchedRaw.applied_overrides };
}
