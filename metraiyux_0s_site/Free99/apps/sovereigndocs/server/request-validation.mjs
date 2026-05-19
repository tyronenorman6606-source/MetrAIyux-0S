export function assertObject(value, label='body'){
  if(!value || typeof value !== 'object' || Array.isArray(value)){ const e = new Error(`${label} must be a JSON object.`); e.status=400; throw e; }
}
export function requireFields(value, fields){
  const missing = fields.filter(f => value?.[f] === undefined || value?.[f] === null || String(value?.[f]).trim() === '');
  if(missing.length){ const e = new Error(`Missing required fields: ${missing.join(', ')}`); e.status=400; e.missing=missing; throw e; }
}
export function trimString(value, max=2000){ return String(value ?? '').trim().slice(0,max); }
export function assertArray(value, label='items', max=100){
  if(!Array.isArray(value)){ const e = new Error(`${label} must be an array.`); e.status=400; throw e; }
  if(value.length > max){ const e = new Error(`${label} may contain at most ${max} items.`); e.status=400; throw e; }
}
