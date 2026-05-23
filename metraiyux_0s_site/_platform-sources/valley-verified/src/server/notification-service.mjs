import fs from 'node:fs/promises';
import path from 'node:path';
import { signWebhookBody } from './webhooks.mjs';

export const NOTIFICATION_SERVICE_VERSION = '18.0.0';

function nowIso(){ return new Date().toISOString(); }
async function ensureDir(dir){ await fs.mkdir(dir, { recursive:true }); }

export function resolveWebhookTarget(job, env = process.env){
  const key = `PHX_WEBHOOK_${String(job.target || 'platform-webhook').toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_URL`;
  return env[key] || env.PHX_WEBHOOK_URL || '';
}

export function verifyWebhookJob(job, secret = process.env.PHX_WEBHOOK_SECRET || 'local-development-secret'){
  const expected = signWebhookBody(job.body, secret);
  return Boolean(job?.headers?.['x-phx-signature'] && job.headers['x-phx-signature'] === expected);
}

export async function deliverWebhookJob(job, { env = process.env, fetchImpl = globalThis.fetch, dryRun = false, receiptStore } = {}){
  if(!job?.job_id) throw new Error('Webhook job is missing job_id.');
  if(!verifyWebhookJob(job, env.PHX_WEBHOOK_SECRET || 'local-development-secret')) throw new Error(`Webhook job ${job.job_id} has invalid signature.`);
  const targetUrl = resolveWebhookTarget(job, env);
  const receiptBase = { job_id:job.job_id, event_type:job.event_type, target:job.target, created_at:nowIso() };
  if(dryRun || !targetUrl){
    const receipt = { ...receiptBase, status:'dry_run', target_url_present:Boolean(targetUrl), provider_status:'not_sent' };
    if(receiptStore?.appendDeliveryReceipt) await receiptStore.appendDeliveryReceipt(receipt);
    return receipt;
  }
  if(typeof fetchImpl !== 'function') throw new Error('fetch implementation required for webhook delivery.');
  const response = await fetchImpl(targetUrl, { method:'POST', headers:job.headers, body:JSON.stringify(job.body) });
  const text = await response.text().catch(() => '');
  const receipt = { ...receiptBase, status:response.ok ? 'sent' : 'failed', http_status:response.status, response_body:text.slice(0, 2000) };
  if(receiptStore?.appendDeliveryReceipt) await receiptStore.appendDeliveryReceipt(receipt);
  if(!response.ok){ const error = new Error(`Webhook delivery failed with status ${response.status}`); error.receipt = receipt; throw error; }
  return receipt;
}

export async function processWebhookOutbox(outbox, { limit = 25, env = process.env, dryRun = true, receiptFile = path.join(process.cwd(), '.phx-webhook-outbox', 'receipts.jsonl'), fetchImpl = globalThis.fetch } = {}){
  const jobs = (await outbox.list()).filter(job => job.status === 'pending').slice(0, limit);
  await ensureDir(path.dirname(receiptFile));
  const receipts = [];
  const receiptStore = { appendDeliveryReceipt:async (receipt) => { await fs.appendFile(receiptFile, JSON.stringify(receipt) + '\n'); return receipt; } };
  for(const job of jobs){
    try{
      const receipt = await deliverWebhookJob(job, { env, dryRun, receiptStore, fetchImpl });
      receipts.push(receipt);
    }catch(error){
      const receipt = { job_id:job.job_id, event_type:job.event_type, target:job.target, status:'failed', error:error.message, created_at:nowIso() };
      await receiptStore.appendDeliveryReceipt(receipt);
      receipts.push(receipt);
    }
  }
  return { processed:receipts.length, dry_run:dryRun, receipts };
}
