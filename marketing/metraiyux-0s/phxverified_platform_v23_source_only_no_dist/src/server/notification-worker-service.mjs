import crypto from 'node:crypto';
import { buildNotificationDeliveryAction } from './owner-messaging-service.mjs';

export const NOTIFICATION_WORKER_SERVICE_VERSION = '21.0.0';
function nowIso(){ return new Date().toISOString(); }
function sign(body, secret){ return crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex'); }
export function createNotificationJob({ target_id, channel = 'email', provider = 'webhook', recipient, body, subject = '', business_id = '', lead_id = '', attempt = 1 } = {}, env = process.env){
  const payload = { target_id, channel, provider, recipient, subject, body, business_id, lead_id, attempt, created_at:nowIso() };
  return { job_id:`notify-${target_id}-${attempt}`, status:'pending', attempt, headers:{ 'content-type':'application/json', 'x-phx-signature':sign(payload, env.PHX_WEBHOOK_SECRET || 'local-development-secret') }, body:payload };
}
export async function deliverNotificationJob(job, { fetchImpl = globalThis.fetch, env = process.env, dryRun = true } = {}){
  const target = env.PHX_NOTIFICATION_WEBHOOK_URL || env.PHX_WEBHOOK_URL || '';
  if(dryRun || !target){ return { job_id:job.job_id, status:'dry_run', provider_status:'not_sent', at:nowIso() }; }
  const res = await fetchImpl(target, { method:'POST', headers:job.headers, body:JSON.stringify(job.body) });
  const receipt = { job_id:job.job_id, status:res.ok ? 'sent':'failed', http_status:res.status, at:nowIso() };
  if(!res.ok) throw Object.assign(new Error(`Notification delivery failed: ${res.status}`), { receipt });
  return receipt;
}
export function deliveryReceiptToAction(receipt, actor = { id:'system', roles:'system' }){
  return buildNotificationDeliveryAction({ target_id:receipt.job_id, channel:'webhook', delivery_status:receipt.status, provider:'phx-notification-worker', provider_message_id:String(receipt.http_status || ''), actor });
}
export function notificationWorkerServiceForApi(){ return { version:NOTIFICATION_WORKER_SERVICE_VERSION, supports:['email-webhook','sms-webhook','generic-webhook'], retry:true, receipts:true, signed_jobs:true }; }
