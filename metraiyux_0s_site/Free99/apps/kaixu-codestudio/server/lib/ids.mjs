import { randomBytes, createHash } from 'node:crypto';

export function nowISO(){ return new Date().toISOString(); }
export function id(prefix='id'){
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(5).toString('hex')}`;
}
export function sha256(value){
  return createHash('sha256').update(String(value ?? '')).digest('hex');
}
export function redact(value){
  if (value === null || value === undefined) return value;
  if (typeof value === 'string'){
    if (value.length <= 8) return '[redacted]';
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object'){
    const out = {};
    for (const [k,v] of Object.entries(value)){
      const lk = k.toLowerCase();
      if (/(secret|token|key|password|authorization|bearer|private_key)/.test(lk)) out[k] = '[redacted]';
      else out[k] = redact(v);
    }
    return out;
  }
  return value;
}
