export const REMINDER_STATUSES = ['scheduled','sent','snoozed','completed','cancelled'];
export function createReminder({ title, dueDate, sourceType = 'manual', sourceId = null, jurisdiction = null, owner = null, note = '', leadDays = [30,7,1] }){
  if(!title) { const e = new Error('Reminder title is required.'); e.status=400; throw e; }
  if(!dueDate || Number.isNaN(Date.parse(dueDate))) { const e = new Error('Valid dueDate is required.'); e.status=400; throw e; }
  const now = new Date().toISOString();
  return { id:`rem_${Date.now()}_${Math.random().toString(16).slice(2)}`, title:String(title).slice(0,200), dueDate:new Date(dueDate).toISOString().slice(0,10), sourceType, sourceId, jurisdiction, owner, note:String(note||'').slice(0,1000), leadDays, status:'scheduled', events:[{ status:'scheduled', at:now, note:'reminder created' }], createdAt:now, updatedAt:now };
}
export function summarizeReminder(r){ return { id:r.id, title:r.title, dueDate:r.dueDate, status:r.status, jurisdiction:r.jurisdiction, sourceType:r.sourceType, updatedAt:r.updatedAt }; }
export function transitionReminder(r, { status, actor='system', note='' }){
  if(!REMINDER_STATUSES.includes(status)){ const e = new Error(`Unsupported reminder status: ${status}`); e.status=400; throw e; }
  const now = new Date().toISOString();
  return { ...r, status, updatedAt:now, events:[...(r.events || []), { status, actor, note, at:now }] };
}
