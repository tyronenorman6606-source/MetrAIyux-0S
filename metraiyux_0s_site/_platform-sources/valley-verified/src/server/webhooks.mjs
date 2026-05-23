import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const WEBHOOK_OUTBOX_VERSION = '18.0.0';

function nowIso(){ return new Date().toISOString(); }
function stableId(value){ return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24); }

export function signWebhookBody(body, secret = process.env.PHX_WEBHOOK_SECRET || 'local-development-secret'){
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function createWebhookJob({ event_type, action, payload = {}, target = 'platform-webhook', secret } = {}){
  const body = {
    version:WEBHOOK_OUTBOX_VERSION,
    event_type,
    target,
    created_at:nowIso(),
    action_id:action?.action_id || payload.action_id || '',
    action_type:action?.action_type || payload.action_type || '',
    payload
  };
  return {
    job_id:`webhook-${stableId(body)}`,
    status:'pending',
    target,
    event_type,
    created_at:body.created_at,
    attempts:0,
    headers:{
      'content-type':'application/json',
      'x-phx-event':event_type,
      'x-phx-signature':signWebhookBody(body, secret)
    },
    body
  };
}

export class FileWebhookOutbox {
  constructor(root = process.env.PHX_WEBHOOK_OUTBOX_DIR || path.join(process.cwd(), '.phx-webhook-outbox')){
    this.root = root;
    this.jobsFile = path.join(root, 'jobs.jsonl');
  }
  async ensure(){ await fs.mkdir(this.root, { recursive:true }); }
  async enqueue(job){
    await this.ensure();
    await fs.appendFile(this.jobsFile, JSON.stringify(job) + '\n');
    return job;
  }
  async list(){
    try{
      const body = await fs.readFile(this.jobsFile, 'utf8');
      return body.trim() ? body.trim().split('\n').map(line => JSON.parse(line)) : [];
    }catch(error){
      if(error.code === 'ENOENT') return [];
      throw error;
    }
  }
}

export class MemoryWebhookOutbox {
  constructor(){ this.jobs = []; }
  async enqueue(job){ this.jobs.push(job); return job; }
  async list(){ return [...this.jobs]; }
}
