import { applyTenantQuery, assertOwnedOrPrivileged, closureEnvelope, requireTenantWrite } from '../runtime/closure-guards.mjs';
import { summarizeCase, transitionCase } from '../case-workflows.mjs';
import { buildCaseTimeline, buildClientStatus, buildPartnerPacket, buildCaseExportBundle, createCaseNote, summarizeCaseNote, createCaseArtifact, summarizeCaseArtifact } from '../case-experience.mjs';

export const name='cases-v18.routes';
export const area='cases';
export const owns=['v18 tenant-scoped case CRUD','case state panels','case closure summaries','case notes','case artifacts'];
export const routes=[
  'GET /api/v18/cases',
  'GET /api/v18/cases/:id/state',
  'PATCH /api/v18/cases/:id',
  'POST /api/v18/cases/:id/notes',
  'POST /api/v18/cases/:id/artifacts',
  'GET /api/v18/cases/:id/closure-summary'
];

function matchCase(pathname, suffix=''){
  const re = new RegExp(`^/api/v18/cases/([^/]+)${suffix}$`);
  return pathname.match(re);
}
function caseArraysFor(caseRecord, ctx){
  return Promise.all([ctx.loadDocumentRecords(), ctx.loadPacketRecords(), ctx.loadLegalReviewSubmissions(), ctx.loadEditorHandoffs(), ctx.loadEditorReturns(), ctx.loadCaseNotes(), ctx.loadCaseArtifacts(), ctx.loadReminders(), ctx.loadCustomerOrders()])
    .then(([documents, packets, reviews, handoffs, returns, notes, artifacts, reminders, orders]) => {
      const packet = packets.find(p => p.id === caseRecord.packetId) || null;
      const timeline = buildCaseTimeline({ caseRecord, documents, packet, reviews, handoffs, returns, notes, reminders, orders, artifacts });
      return { documents, packets, packet, reviews, handoffs, returns, notes, artifacts, reminders, orders, timeline };
    });
}

export async function handle(ctx){
  const { method, url, session, sendJSON, readBody, writeJSON, CASE_RECORDS_FILE, CASE_NOTES_FILE, CASE_ARTIFACTS_FILE, loadCaseRecords, loadCaseNotes, loadCaseArtifacts, audit } = ctx;
  if(method==='GET' && url.pathname==='/api/v18/cases'){
    const rows = applyTenantQuery(session, await loadCaseRecords());
    const status = url.searchParams.get('status');
    const visible = status ? rows.filter(row => row.status === status) : rows;
    return sendJSON(200, closureEnvelope({ area:'cases', action:'list', session, data:{ count:visible.length, items:visible.map(summarizeCase) } }));
  }

  const state = matchCase(url.pathname, '/state');
  if(method==='GET' && state){
    const id = decodeURIComponent(state[1]);
    const caseRecord = (await loadCaseRecords()).find(row => row.id === id);
    const gate = assertOwnedOrPrivileged(session, caseRecord, 'case');
    if(!caseRecord) return sendJSON(404,{ok:false,error:'case not found'});
    if(!gate.ok) return sendJSON(gate.status, gate);
    const arrays = await caseArraysFor(caseRecord, ctx);
    const clientStatus = buildClientStatus({ caseRecord, timeline:arrays.timeline });
    return sendJSON(200, closureEnvelope({ area:'cases', action:'state', session, data:{ case:caseRecord, summary:summarizeCase(caseRecord), timeline:arrays.timeline, clientStatus, documents:arrays.documents.filter(d => (caseRecord.documentIds||[]).includes(d.id)||d.caseId===caseRecord.id), packet:arrays.packet, reviews:arrays.reviews.filter(r => r.caseId===caseRecord.id || (caseRecord.reviewSubmissionIds||[]).includes(r.id)), notes:arrays.notes.filter(n=>n.caseId===caseRecord.id), artifacts:arrays.artifacts.filter(a=>a.caseId===caseRecord.id), editor:{handoffs:arrays.handoffs.filter(h=>h.id===caseRecord.handoffId||h.metadata?.caseId===caseRecord.id), returns:arrays.returns.filter(r=>r.metadata?.caseId===caseRecord.id || (caseRecord.returnIds||[]).includes(r.id))}, actions:['open_skye_docx_max','add_note','add_artifact','client_status','partner_packet','export_bundle'] } }));
  }

  const update = matchCase(url.pathname);
  if(method==='PATCH' && update){
    const guard = requireTenantWrite(session, 'case update');
    if(!guard.ok) return sendJSON(guard.status, guard);
    const id = decodeURIComponent(update[1]);
    const body = await readBody();
    const rows = await loadCaseRecords();
    const index = rows.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(404,{ok:false,error:'case not found'});
    const access = assertOwnedOrPrivileged(session, rows[index], 'case');
    if(!access.ok) return sendJSON(access.status, access);
    let next = { ...rows[index] };
    if(body.title) next.title = String(body.title).slice(0,300);
    if(body.metadata && typeof body.metadata === 'object') next.metadata = { ...(next.metadata||{}), ...body.metadata };
    if(body.status && body.status !== next.status){
      next = transitionCase(next, { status:body.status, actor:session.user?.id||'upstream-user', note:body.note || 'v18 scoped case update', payload:body.payload || {} });
    }else{
      next.updatedAt = new Date().toISOString();
    }
    rows[index] = next;
    await writeJSON(CASE_RECORDS_FILE, rows.slice(0,50000));
    const event = await audit('v18_case_updated',{caseId:id,status:next.status,titleChanged:!!body.title},ctx.req);
    return sendJSON(200, closureEnvelope({ area:'cases', action:'update', session, data:{ case:summarizeCase(next), auditId:event.id } }));
  }

  const note = matchCase(url.pathname, '/notes');
  if(method==='POST' && note){
    const guard = requireTenantWrite(session, 'case note');
    if(!guard.ok) return sendJSON(guard.status, guard);
    const id = decodeURIComponent(note[1]);
    const caseRecord = (await loadCaseRecords()).find(row => row.id === id);
    if(!caseRecord) return sendJSON(404,{ok:false,error:'case not found'});
    const access = assertOwnedOrPrivileged(session, caseRecord, 'case');
    if(!access.ok) return sendJSON(access.status, access);
    const body = await readBody();
    const entry = createCaseNote({ caseId:id, body, session });
    const rows = await loadCaseNotes(); rows.unshift(entry); await writeJSON(CASE_NOTES_FILE, rows.slice(0,50000));
    const event = await audit('v18_case_note_created',{caseId:id,noteId:entry.id,visibility:entry.visibility},ctx.req);
    return sendJSON(201, closureEnvelope({ area:'cases', action:'create-note', session, data:{ note:summarizeCaseNote(entry), auditId:event.id } }));
  }

  const artifact = matchCase(url.pathname, '/artifacts');
  if(method==='POST' && artifact){
    const guard = requireTenantWrite(session, 'case artifact');
    if(!guard.ok) return sendJSON(guard.status, guard);
    const id = decodeURIComponent(artifact[1]);
    const caseRecord = (await loadCaseRecords()).find(row => row.id === id);
    if(!caseRecord) return sendJSON(404,{ok:false,error:'case not found'});
    const access = assertOwnedOrPrivileged(session, caseRecord, 'case');
    if(!access.ok) return sendJSON(access.status, access);
    const body = await readBody();
    const entry = createCaseArtifact({ caseId:id, body, session });
    const rows = await loadCaseArtifacts(); rows.unshift(entry); await writeJSON(CASE_ARTIFACTS_FILE, rows.slice(0,50000));
    const event = await audit('v18_case_artifact_created',{caseId:id,artifactId:entry.id},ctx.req);
    return sendJSON(201, closureEnvelope({ area:'cases', action:'create-artifact', session, data:{ artifact:summarizeCaseArtifact(entry), auditId:event.id } }));
  }

  const closure = matchCase(url.pathname, '/closure-summary');
  if(method==='GET' && closure){
    const id = decodeURIComponent(closure[1]);
    const caseRecord = (await loadCaseRecords()).find(row => row.id === id);
    if(!caseRecord) return sendJSON(404,{ok:false,error:'case not found'});
    const access = assertOwnedOrPrivileged(session, caseRecord, 'case');
    if(!access.ok) return sendJSON(access.status, access);
    const arrays = await caseArraysFor(caseRecord, ctx);
    const bundle = buildCaseExportBundle({ caseRecord, documents:arrays.documents, packet:arrays.packet, reviews:arrays.reviews, handoffs:arrays.handoffs, returns:arrays.returns, notes:arrays.notes, reminders:arrays.reminders, orders:arrays.orders, artifacts:arrays.artifacts, timeline:arrays.timeline });
    const partnerPacket = buildPartnerPacket({ caseRecord, documents:arrays.documents, packet:arrays.packet, reviews:arrays.reviews, notes:arrays.notes, artifacts:arrays.artifacts });
    return sendJSON(200, closureEnvelope({ area:'cases', action:'closure-summary', session, data:{ case:summarizeCase(caseRecord), exportBundle:bundle, partnerPacket, closeable:['partner_review_returned','signature_packet_created','completed'].includes(caseRecord.status), remainingRisks:Object.keys(caseRecord.riskSummary||{}).filter(k=>k==='high' && (caseRecord.riskSummary||{})[k]>0) } }));
  }

  return {handled:false};
}
