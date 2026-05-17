import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createActionEnvelope } from './contracts.mjs';

export const LEAD_ROUTING_SERVICE_VERSION = '20.0.0';

function nowIso(){ return new Date().toISOString(); }
function clean(value){ return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value){ return clean(value).toLowerCase(); }
function slug(value){ return lower(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown'; }
function stableId(value){ return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24); }
function list(value){ return Array.isArray(value) ? value.map(clean).filter(Boolean) : clean(value).split(/[|,;]/g).map(clean).filter(Boolean); }
function containsAny(haystack, needles){
  const h = lower(haystack);
  return needles.some(n => n && h.includes(lower(n)));
}
function businessSearchText(business = {}){
  return [business.name, business.category, business.subcategory, business.niche, business.city, business.zip, business.description, ...(business.tags || [])].join(' ');
}
function hasContact(business = {}){ return Boolean(clean(business.phone) || clean(business.email) || clean(business.website) || clean(business.booking_url)); }
function acceptsRequests(business = {}){ return business.accepts_requests !== false; }

export function scoreBusinessForLead(business = {}, lead = {}){
  const city = lower(lead.city);
  const category = lower(lead.category || lead.service_lane);
  const details = lower(lead.details);
  const requestedIds = list(lead.business_ids).map(slug);
  const tags = list(lead.tags || lead.keywords || []);
  let score = 0;
  const reasons = [];

  if(requestedIds.includes(slug(business.id))){ score += 80; reasons.push('buyer explicitly selected listing'); }
  if(city && lower(business.city) === city){ score += 35; reasons.push('same city'); }
  else if(city && lower(business.city).includes(city)){ score += 18; reasons.push('near city text match'); }
  if(category && [business.category, business.subcategory, business.niche, business.category_slug, business.niche_slug].some(v => lower(v).includes(category) || category.includes(lower(v)))){ score += 35; reasons.push('category/niche match'); }
  if(details && containsAny(businessSearchText(business), details.split(/\s+/).filter(w => w.length > 4).slice(0, 12))){ score += 12; reasons.push('details keyword overlap'); }
  if(tags.length && containsAny(businessSearchText(business), tags)){ score += 10; reasons.push('tag overlap'); }
  if(business.featured) { score += 6; reasons.push('featured supply'); }
  if(business.badges?.business_verified) { score += 8; reasons.push('business verified badge'); }
  if(business.badges?.license_verified) { score += 5; reasons.push('license badge'); }
  if(hasContact(business)){ score += 8; reasons.push('routable contact path'); }
  if(acceptsRequests(business)){ score += 5; reasons.push('accepts requests'); }
  if(Number(business.verification_score || 0) >= 70){ score += 6; reasons.push('high verification score'); }
  if(business.claim_status === 'claimed' || business.claim_status === 'owner_verified'){ score += 6; reasons.push('claimed/owner verified'); }
  if(!hasContact(business)){ score -= 14; reasons.push('thin contact data'); }
  if(business.duplicate_status && business.duplicate_status !== 'unscanned' && business.duplicate_status !== 'unique'){ score -= 20; reasons.push('duplicate risk signal'); }
  if((business.moderation_flags || []).length){ score -= Math.min(10, business.moderation_flags.length * 2); reasons.push('moderation flags present'); }

  return { business_id:business.id, name:business.name, city:business.city, category:business.category, score:Math.max(0, Math.round(score)), reasons, contact_ready:hasContact(business), url:`/business/${business.id}/` };
}

export function routeLead(lead = {}, businesses = [], { limit = 8, minScore = 15 } = {}){
  const scored = businesses.map(business => scoreBusinessForLead(business, lead)).filter(row => row.score >= minScore).sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
  const selected = scored.slice(0, limit);
  const lead_id = lead.lead_id || `lead-${stableId({ buyer_contact:lead.buyer_contact, city:lead.city, category:lead.category, details:lead.details })}`;
  const decision = {
    lead_id,
    business_ids:selected.map(row => row.business_id),
    route_reason:selected.length ? `Top ${selected.length} matches by city/category/contact readiness/verification signals.` : 'No safe match met route threshold.',
    assigned_to:lead.assigned_to || pickDefaultAssignee(lead),
    city:lead.city || '',
    category:lead.category || lead.service_lane || '',
    score_summary:selected.map(row => `${row.business_id}:${row.score}`).join('|'),
    sla:lead.sla || (String(lead.timeline || '').match(/today|urgent|asap/i) ? 'same_day' : 'next_business_day'),
    notes:selected.length ? 'Route candidates require AE/admin approval before owner delivery.' : 'Requires manual sourcing or category coverage work.'
  };
  return { lead_id, selected, alternates:scored.slice(limit, limit + 12), decision, generated_at:nowIso(), total_candidates:businesses.length, considered:scored.length };
}

function pickDefaultAssignee(lead = {}){
  const city = slug(lead.city || 'phoenix');
  const cat = slug(lead.category || lead.service_lane || 'general');
  return `ae-${city}-${cat}`.slice(0, 80);
}

export function buildQuoteRequestAction({ actor = {}, source = 'lead-routing-service', ...payload } = {}){
  return createActionEnvelope({ type:'quote_request', actor, source, payload:{
    buyer_name:payload.buyer_name,
    buyer_contact:payload.buyer_contact,
    city:payload.city,
    category:payload.category,
    details:payload.details,
    business_ids:list(payload.business_ids),
    budget:payload.budget || '',
    timeline:payload.timeline || '',
    service_lane:payload.service_lane || payload.category || '',
    source_url:payload.source_url || '',
    consent_to_contact:payload.consent_to_contact !== false
  }});
}

export function buildLeadRouteDecisionAction({ actor = {}, source = 'lead-routing-service', ...payload } = {}){
  return createActionEnvelope({ type:'lead_route_decision', actor, source, payload:{
    lead_id:payload.lead_id,
    business_ids:list(payload.business_ids),
    route_reason:payload.route_reason,
    assigned_to:payload.assigned_to,
    city:payload.city || '',
    category:payload.category || '',
    score_summary:payload.score_summary || '',
    sla:payload.sla || '',
    notes:payload.notes || ''
  }});
}

export function buildAeAssignmentAction({ actor = {}, source = 'lead-routing-service', ...payload } = {}){
  return createActionEnvelope({ type:'ae_assignment', actor, source, payload:{
    business_id:payload.business_id,
    assigned_to:payload.assigned_to,
    territory:payload.territory,
    stage:payload.stage || 'new_assignment',
    next_action:payload.next_action || 'review_account',
    priority:payload.priority || 'normal',
    due_date:payload.due_date || '',
    notes:payload.notes || '',
    product:payload.product || ''
  }});
}

export function buildLeadHandoffPacket({ lead = {}, route = {} } = {}){
  return {
    version:LEAD_ROUTING_SERVICE_VERSION,
    generated_at:nowIso(),
    lead_id:route.lead_id || lead.lead_id || '',
    buyer:{ name:lead.buyer_name || '', contact:lead.buyer_contact || '', city:lead.city || '', category:lead.category || '' },
    routing:{ assigned_to:route.decision?.assigned_to || '', sla:route.decision?.sla || '', selected_count:route.selected?.length || 0, route_reason:route.decision?.route_reason || '' },
    selected_businesses:route.selected || [],
    ae_next_steps:['confirm buyer scope','check owner contact readiness','send owner message draft or call owner','record lead_status_update after first action','do not promise guaranteed lead delivery']
  };
}

export async function loadPublishedBusinesses({ distDir = path.join(process.cwd(), 'dist'), limit = 0 } = {}){
  const parsed = JSON.parse(await fs.readFile(path.join(distDir, 'data', 'businesses.json'), 'utf8'));
  const businesses = parsed.businesses || [];
  return limit ? businesses.slice(0, limit) : businesses;
}

export async function routeLeadForApi(lead = {}, { businessLimit = 0, distDir = path.join(process.cwd(), 'dist') } = {}){
  const businesses = await loadPublishedBusinesses({ distDir, limit:businessLimit });
  const route = routeLead(lead, businesses, { limit:Number(lead.limit || 8) || 8, minScore:Number(lead.min_score || 15) || 15 });
  return { ...route, handoff:buildLeadHandoffPacket({ lead, route }) };
}

export function leadRoutingServiceForApi(){
  return {
    version:LEAD_ROUTING_SERVICE_VERSION,
    endpoints:['/.netlify/functions/phx-lead','/.netlify/functions/phx-admin operation=route_lead'],
    actions:['quote_request','lead_route_decision','ae_assignment','lead_status_update'],
    rules:['Lead routing ranks candidates but does not claim delivery.','Route decisions require AE/admin action before owner contact.','Buyer-selected listings outrank algorithmic suggestions.','Listings without routable contact data are penalized.']
  };
}
