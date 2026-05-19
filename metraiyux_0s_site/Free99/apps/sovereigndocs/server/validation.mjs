export function requireBooleanAcks(body, ackNames){
  const missing = ackNames.filter(name => body?.[name] !== true);
  if(missing.length){ const e = new Error(`Missing required acknowledgments: ${missing.join(', ')}`); e.status=403; e.missing=missing; throw e; }
}
export function assertPlainObject(value, name='body'){
  if(!value || typeof value !== 'object' || Array.isArray(value)){ const e=new Error(`${name} must be a JSON object.`); e.status=400; throw e; }
}
export function safeString(value, max=5000){ return String(value ?? '').slice(0,max); }
