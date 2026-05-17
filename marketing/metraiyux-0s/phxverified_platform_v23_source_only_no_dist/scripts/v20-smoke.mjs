import fs from 'node:fs/promises';
import { MemoryActionStore } from '../src/server/storage.mjs';
import { MemoryPlatformStateStore } from '../src/server/state-store.mjs';
import { handleAdminRequest } from '../src/server/admin-api.mjs';
import { handler as leadHandler } from '../netlify/functions/phx-lead.mjs';
import { routeLead, buildQuoteRequestAction, buildLeadRouteDecisionAction, buildAeAssignmentAction } from '../src/server/lead-routing-service.mjs';
import { renderOwnerMessage, buildOwnerMessageAction, buildNotificationDeliveryAction } from '../src/server/owner-messaging-service.mjs';
import { buildRevenueAttributionAction, summarizeRevenueAttribution } from '../src/server/revenue-attribution-service.mjs';

let pass = 0;
let fail = 0;
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
async function exists(file){ try{ await fs.access(file); return true; }catch{ return false; } }
const actor = { id:'ae-1', email:'ae@example.com', roles:'ae admin buyer system', allowLocal:true };
const businessesData = JSON.parse(await fs.readFile('dist/data/businesses.json', 'utf8'));
const first = businessesData.businesses[0];
const leadPayload = { buyer_name:'Test Buyer', buyer_contact:'buyer@example.com', city:first.city, category:first.category, details:`Need ${first.category} services near ${first.city} with a verified provider and clean response path.`, timeline:'this week', budget:'open' };

ok(await exists('src/server/lead-routing-service.mjs'), 'Lead routing service module exists');
ok(await exists('src/server/owner-messaging-service.mjs'), 'Owner messaging service module exists');
ok(await exists('src/server/revenue-attribution-service.mjs'), 'Revenue attribution service module exists');
ok(await exists('netlify/functions/phx-lead.mjs'), 'Lead Netlify function exists');
ok(await exists('dist/quote-router/index.html'), 'Quote router page exists');
ok(await exists('dist/data/lead-routing-service-model.json'), 'Lead routing service model exists');
ok(await exists('dist/api/lead-routing-service-model.json'), 'Lead routing API model exists');
ok(await exists('dist/data/owner-messaging-model.json'), 'Owner messaging model exists');
ok(await exists('dist/data/revenue-attribution-model.json'), 'Revenue attribution model exists');

const route = routeLead(leadPayload, businessesData.businesses.slice(0, 500), { limit:5, minScore:5 });
ok(route.selected.length > 0, 'Route engine selects candidate businesses');
ok(route.decision.business_ids.length === route.selected.length, 'Route decision includes selected business ids');
ok(route.selected[0].score > 0, 'Route scores are positive');

const quoteAction = buildQuoteRequestAction({ ...leadPayload, actor });
ok(quoteAction.action_type === 'quote_request', 'Quote request action is created');
const routeAction = buildLeadRouteDecisionAction({ ...route.decision, actor });
ok(routeAction.action_type === 'lead_route_decision', 'Lead route decision action is created');
const assignmentAction = buildAeAssignmentAction({ business_id:first.id, assigned_to:'ae@example.com', territory:`${first.city}/${first.category}`, stage:'contact_pending', next_action:'call owner', actor });
ok(assignmentAction.action_type === 'ae_assignment', 'AE assignment action is created');

const rendered = renderOwnerMessage('quote_handoff', { owner_name:'Owner', business_name:first.name, category:first.category, city:first.city, lead_id:route.lead_id, details:leadPayload.details, timeline:leadPayload.timeline });
ok(rendered.body.includes(first.city), 'Owner message template renders variables');
const ownerMessageAction = buildOwnerMessageAction({ business_id:first.id, recipient:'owner@example.com', template_id:'quote_handoff', variables:{ owner_name:'Owner', business_name:first.name, category:first.category, city:first.city, lead_id:route.lead_id, details:leadPayload.details, timeline:leadPayload.timeline }, actor });
ok(ownerMessageAction.action_type === 'owner_message', 'Owner message action is created');
const deliveryAction = buildNotificationDeliveryAction({ target_id:ownerMessageAction.action_id, channel:'email', delivery_status:'dry_run', provider:'local', business_id:first.id, recipient:'owner@example.com' });
ok(deliveryAction.action_type === 'notification_delivery_event', 'Notification delivery event action is created');
const revenueAction = buildRevenueAttributionAction({ business_id:first.id, source:'stripe', amount_cents:4900, currency:'USD', event_type:'payment_received', ae_id:'ae-1', product:'verified_profile_upgrade', tier:'starter', payment_order_id:'pay-test', actor });
ok(revenueAction.action_type === 'revenue_attribution_event', 'Revenue attribution action is created');
ok(summarizeRevenueAttribution([revenueAction]).net_cents === 4900, 'Revenue attribution summary nets payment');

const store = new MemoryActionStore();
const state = new MemoryPlatformStateStore();
for(const action of [quoteAction, routeAction, assignmentAction, ownerMessageAction, deliveryAction, revenueAction]){
  await store.put(action);
  await state.applyAction(action, { decision:'approved', reviewer:'admin@example.com' });
}
const summary = await state.summary();
ok(summary.counts.quote_requests === 1, 'State projector records quote_request');
ok(summary.counts.lead_routes === 1, 'State projector records lead_route_decision');
ok(summary.counts.ae_assignments === 1, 'State projector records AE assignment');
ok(summary.counts.owner_message_businesses === 1, 'State projector records owner message');
ok(summary.counts.notification_deliveries === 1, 'State projector records notification delivery event');
ok(summary.counts.revenue_attribution_events === 1, 'State projector records revenue attribution event');

const noAuth = await leadHandler({ httpMethod:'POST', headers:{}, queryStringParameters:{}, body:JSON.stringify({ operation:'quote_request', payload:leadPayload }) });
ok(noAuth.statusCode === 401, 'Lead endpoint rejects missing upstream identity');
process.env.ALLOW_LOCAL_ACTIONS = 'true';
const service = await leadHandler({ httpMethod:'GET', headers:{}, queryStringParameters:{}, body:'' });
ok(service.statusCode === 200 && JSON.parse(service.body).service.actions.includes('quote_request'), 'Lead endpoint exposes service model');
const routed = await leadHandler({ httpMethod:'POST', headers:{}, queryStringParameters:{}, body:JSON.stringify({ operation:'route_quote', business_limit:250, payload:leadPayload }) });
ok(routed.statusCode === 202 && JSON.parse(routed.body).route.selected.length > 0, 'Lead endpoint routes quote request locally with proof env');

const adminService = await handleAdminRequest({ method:'GET', headers:{}, query:{ lead_routing_service:'1' } }, { env:{ ALLOW_LOCAL_ACTIONS:'true' } });
ok(adminService.statusCode === 200 && JSON.parse(adminService.body).service.actions.includes('ae_assignment'), 'Admin API exposes lead routing service');
const adminRoute = await handleAdminRequest({ method:'POST', headers:{}, body:JSON.stringify({ operation:'route_lead', business_limit:250, payload:leadPayload }) }, { env:{ ALLOW_LOCAL_ACTIONS:'true' }, store:new MemoryActionStore(), stateStore:new MemoryPlatformStateStore(), businessIndex:{ assert:async()=>true } });
ok(adminRoute.statusCode === 202 && JSON.parse(adminRoute.body).route.selected.length > 0, 'Admin API route_lead creates route decision');
const adminMessage = await handleAdminRequest({ method:'POST', headers:{}, body:JSON.stringify({ operation:'draft_owner_message', payload:{ business_id:first.id, recipient:'owner@example.com', template_id:'claim_invite', variables:{ owner_name:'Owner', business_name:first.name, category:first.category }, message_type:'claim_invite' } }) }, { env:{ ALLOW_LOCAL_ACTIONS:'true' }, store:new MemoryActionStore(), stateStore:new MemoryPlatformStateStore(), businessIndex:{ assert:async()=>true } });
ok(adminMessage.statusCode === 202 && JSON.parse(adminMessage.body).action.action_type === 'owner_message', 'Admin API drafts owner message action');

if(fail){ console.error(`☐ v20 smoke failed: ${fail} failed / ${pass} passed`); process.exit(1); }
console.log(`✅ v20 smoke passed: ${pass} checks passed`);
