import crypto from 'node:crypto';
import { createActionEnvelope } from './contracts.mjs';

export const OWNER_MESSAGING_SERVICE_VERSION = '20.0.0';
function nowIso(){ return new Date().toISOString(); }
function clean(value){ return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function stableId(value){ return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16); }

export const OWNER_MESSAGE_TEMPLATES = {
  claim_invite:{
    subject:'Your business is listed on PHX Verified',
    channel:'email',
    body:`Hi {{owner_name}},\n\nWe built PHX Verified as a verified Arizona business/service network. Your listing for {{business_name}} is present from public business-license/marketplace seed data.\n\nYou can claim it, correct details, add your website/contact info, and choose whether you want exposure products or quote-routing later.\n\nNo account changes go live without review.\n\n— PHX Verified Network`
  },
  quote_handoff:{
    subject:'Quote opportunity for {{business_name}}',
    channel:'email',
    body:`Hi {{owner_name}},\n\nA buyer is looking for {{category}} help in {{city}}. Your listing matched the request because of city/category/contact signals.\n\nLead ID: {{lead_id}}\nNeed: {{details}}\nTimeline: {{timeline}}\n\nReply with availability or update your listing so we can route better opportunities.\n\n— PHX Verified Network`
  },
  cleanup_request:{
    subject:'Help us clean up your PHX Verified listing',
    channel:'email',
    body:`Hi {{owner_name}},\n\nWe found your PHX Verified listing could use better details. Send us your best website, service area, preferred phone/email, and category so the listing is useful to buyers.\n\nBusiness: {{business_name}}\nCurrent category: {{category}}\n\n— PHX Verified Network`
  }
};

export function renderOwnerMessage(templateId, variables = {}){
  const template = OWNER_MESSAGE_TEMPLATES[templateId];
  if(!template){ const error = new Error(`Unknown owner message template: ${templateId}`); error.status = 400; throw error; }
  const render = value => String(value).replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => clean(variables[key] || ''));
  return { template_id:templateId, subject:render(template.subject), channel:template.channel, body:render(template.body), message_hash:stableId({ templateId, variables }), generated_at:nowIso() };
}

export function buildOwnerMessageAction({ actor = {}, source = 'owner-messaging-service', template_id = 'claim_invite', variables = {}, ...payload } = {}){
  const rendered = payload.body ? { template_id:template_id || 'custom', subject:payload.subject || '', channel:payload.channel || 'email', body:payload.body, message_hash:stableId(payload), generated_at:nowIso() } : renderOwnerMessage(template_id, variables);
  return createActionEnvelope({ type:'owner_message', actor, source, payload:{
    business_id:payload.business_id || variables.business_id,
    message_type:payload.message_type || template_id,
    recipient:payload.recipient || variables.owner_contact || variables.email || '',
    subject:rendered.subject,
    body:rendered.body,
    channel:payload.channel || rendered.channel,
    template_id:rendered.template_id,
    lead_id:payload.lead_id || variables.lead_id || '',
    ae_id:payload.ae_id || variables.ae_id || '',
    send_after:payload.send_after || '',
    notes:payload.notes || ''
  }});
}

export function buildNotificationDeliveryAction({ actor = { id:'notification-provider', roles:'system', allowLocal:true }, source = 'owner-messaging-service', ...payload } = {}){
  return createActionEnvelope({ type:'notification_delivery_event', actor, source, payload:{
    target_id:payload.target_id,
    channel:payload.channel,
    delivery_status:payload.delivery_status,
    provider:payload.provider,
    business_id:payload.business_id || '',
    lead_id:payload.lead_id || '',
    recipient:payload.recipient || '',
    provider_message_id:payload.provider_message_id || '',
    error:payload.error || '',
    raw_event_hash:payload.raw_event_hash || ''
  }});
}

export function ownerMessagingServiceForApi(){
  return {
    version:OWNER_MESSAGING_SERVICE_VERSION,
    templates:Object.keys(OWNER_MESSAGE_TEMPLATES),
    actions:['owner_message','notification_delivery_event','owner_contact_log'],
    rules:['Message drafts are action records, not proof of sent provider delivery.','Provider delivery receipts must arrive as notification_delivery_event.','Owner claim and quote handoff copy avoids guaranteed lead or ranking claims.']
  };
}
