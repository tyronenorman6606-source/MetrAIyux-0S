import { applyTenantQuery, closureEnvelope } from '../runtime/closure-guards.mjs';
import { summarizeCase } from '../case-workflows.mjs';
import { summarizeDocument } from '../document-lifecycle.mjs';
import { summarizeReminder } from '../reminder-engine.mjs';

export const name='workspace-v18.routes';
export const area='workspace';
export const owns=['v18 role-aware workspace dashboard','operator/customer/partner panels'];
export const routes=['GET /api/v18/workspace/dashboard'];

export async function handle(ctx){
  const { method, url, session, sendJSON, loadCaseRecords, loadDocumentRecords, loadPacketRecords, loadReminders, loadLegalReviewSubmissions, loadCustomerOrders, loadCaseIntakes, loadEditorHandoffs } = ctx;
  if(method !== 'GET' || url.pathname !== '/api/v18/workspace/dashboard') return {handled:false};
  const [cases, documents, packets, reminders, reviews, orders, intakes, handoffs] = await Promise.all([loadCaseRecords(), loadDocumentRecords(), loadPacketRecords(), loadReminders(), loadLegalReviewSubmissions(), loadCustomerOrders(), loadCaseIntakes(), loadEditorHandoffs()]);
  const scopedCases = applyTenantQuery(session, cases);
  const scopedDocs = applyTenantQuery(session, documents);
  const scopedPackets = applyTenantQuery(session, packets);
  const scopedReminders = applyTenantQuery(session, reminders);
  const scopedReviews = applyTenantQuery(session, reviews);
  const scopedOrders = applyTenantQuery(session, orders);
  const scopedIntakes = applyTenantQuery(session, intakes);
  const scopedHandoffs = applyTenantQuery(session, handoffs);
  const actionNeeded = [
    ...scopedIntakes.filter(i=>i.status==='intake_ready_for_case').map(i=>({type:'intake',id:i.id,label:'Convert intake to case',href:`/intake-wizard/?intake=${encodeURIComponent(i.id)}`})),
    ...scopedCases.filter(c=>['editor_handoff_created','opened_in_skye_docx_max','returned_from_skye_docx_max','submitted_for_partner_review'].includes(c.status)).map(c=>({type:'case',id:c.id,label:`Continue ${c.title}`,href:`/case-command-center/?case=${encodeURIComponent(c.id)}`})),
    ...scopedReviews.filter(r=>!['partner_review_returned','cancelled','archived'].includes(r.status)).map(r=>({type:'review',id:r.id,label:'Review submission open',href:'/partner-workbench/'})),
    ...scopedReminders.filter(r=>!['completed','cancelled'].includes(r.status)).map(r=>({type:'reminder',id:r.id,label:r.title||'Reminder due',href:'/reminders/'}))
  ].slice(0,50);
  return sendJSON(200, closureEnvelope({ area:'workspace', action:'dashboard', session, data:{
    counts:{ cases:scopedCases.length, documents:scopedDocs.length, packets:scopedPackets.length, reminders:scopedReminders.length, reviews:scopedReviews.length, orders:scopedOrders.length, intakes:scopedIntakes.length, editorHandoffs:scopedHandoffs.length },
    panels:{
      cases:scopedCases.slice(0,25).map(summarizeCase),
      documents:scopedDocs.slice(0,25).map(summarizeDocument),
      packets:scopedPackets.slice(0,25),
      reminders:scopedReminders.slice(0,25).map(summarizeReminder),
      reviews:scopedReviews.slice(0,25),
      orders:scopedOrders.slice(0,25),
      intakes:scopedIntakes.slice(0,25)
    },
    actionNeeded,
    rolePanels:['customer_documents','case_operations','partner_review','template_governance','commercial_orders']
  }}));
}
