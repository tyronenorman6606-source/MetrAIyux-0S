import crypto from 'node:crypto';
import { assertOwnedOrPrivileged, closureEnvelope, requireTenantWrite } from '../runtime/closure-guards.mjs';
import { summarizeSkyeDocxHandoff } from '../editor-adapter.mjs';
import { summarizeCase, transitionCase } from '../case-workflows.mjs';

export const name='editor-v18.routes';
export const area='editor';
export const owns=['v18 SkyeDocxMax case launch','handoff reconciliation','case-aware return capture'];
export const routes=['POST /api/v18/cases/:id/open-in-skye-docx-max','POST /api/v18/editor/skye-docx-max/return-to-case','GET /api/v18/editor/skye-docx-max/handoff/:id/map'];

function match(pathname, pattern){ return pathname.match(pattern); }

export async function handle(ctx){
  const { method,url,session,sendJSON,readBody,loadCaseRecords,loadDocumentRecords,loadPacketRecords,loadEditorHandoffs,loadEditorReturns,loadEditorHandoffPayload,writeEditorHandoffPayload,writeJSON,EDITOR_HANDOFF_LOG_FILE,EDITOR_RETURN_LOG_FILE,DOCUMENT_RECORDS_FILE,CASE_RECORDS_FILE,createSkyeDocxMaxHandoff,summarizeSkyeDocxHandoff:sumHandoff,createSkyeDocxReturnPackage,audit,markdownToHtml } = ctx;

  const open = match(url.pathname, /^\/api\/v18\/cases\/([^/]+)\/open-in-skye-docx-max$/);
  if(method==='POST' && open){
    const guard = requireTenantWrite(session, 'SkyeDocxMax case launch');
    if(!guard.ok) return sendJSON(guard.status, guard);
    const id = decodeURIComponent(open[1]);
    const cases = await loadCaseRecords();
    const index = cases.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(404,{ok:false,error:'case not found'});
    const access = assertOwnedOrPrivileged(session, cases[index], 'case');
    if(!access.ok) return sendJSON(access.status, access);
    const body = await readBody();
    const docs = await loadDocumentRecords();
    const packets = await loadPacketRecords();
    const caseDocs = docs.filter(d => (cases[index].documentIds||[]).includes(d.id)||d.caseId===id);
    const packet = packets.find(p => p.id === cases[index].packetId) || null;
    const markdown = body.markdown || [`# ${cases[index].title}`, '', `Case ID: ${id}`, `Status: ${cases[index].status}`, '', '## Documents', ...caseDocs.map(d => `- ${d.title || d.templateTitle || d.templateId || d.id} (${d.status || 'recorded'})`), '', packet ? `## Packet\n${packet.title || packet.id}` : ''].join('\n');
    const handoff = createSkyeDocxMaxHandoff({
      title:cases[index].title,
      markdown,
      html:markdownToHtml(markdown),
      packetId:cases[index].packetId || null,
      metadata:{
        caseId:id,
        caseType:cases[index].caseType,
        caseStatus:cases[index].status,
        source:'v18-case-scoped-launch',
        workflowAnchors:{ caseId:id, documentIds:cases[index].documentIds||[], packetId:cases[index].packetId||null, reviewSubmissionIds:cases[index].reviewSubmissionIds||[] },
        templateMetadata:caseDocs.map(d => ({ templateId:d.templateId, title:d.templateTitle||d.title, riskLevel:d.riskLevel, jurisdiction:d.jurisdiction, category:d.category, status:d.status, documentId:d.id }))
      },
      session
    });
    handoff.returnContract = { endpoint:'/api/v18/editor/skye-docx-max/return-to-case', required:['handoffId','html or text'], caseId:id, documentIds:cases[index].documentIds||[], packetId:cases[index].packetId||null };
    handoff.caseContext = { ...(handoff.caseContext||{}), caseId:id, caseStatus:cases[index].status, caseType:cases[index].caseType, documentIds:cases[index].documentIds||[], packetId:cases[index].packetId||null, reviewSubmissionIds:cases[index].reviewSubmissionIds||[] };
    await writeEditorHandoffPayload(handoff);
    const handoffRows = await loadEditorHandoffs(); handoffRows.unshift(summarizeSkyeDocxHandoff(handoff)); await writeJSON(EDITOR_HANDOFF_LOG_FILE, handoffRows.slice(0,20000));
    try{ cases[index] = transitionCase(cases[index], { status:'opened_in_skye_docx_max', actor:session.user?.id||'upstream-user', note:'Opened from v18 scoped SkyeDocxMax launch.', payload:{ handoffId:handoff.id } }); }catch{ cases[index] = { ...cases[index], updatedAt:new Date().toISOString(), handoffId:handoff.id }; }
    cases[index].handoffId = handoff.id;
    await writeJSON(CASE_RECORDS_FILE, cases.slice(0,50000));
    const event = await audit('v18_skye_docx_case_launch',{caseId:id,handoffId:handoff.id},ctx.req);
    return sendJSON(201, closureEnvelope({ area:'editor', action:'case-launch', session, data:{ case:summarizeCase(cases[index]), handoff:sumHandoff(handoff), launchUrl:handoff.launchUrl, auditId:event.id } }));
  }

  const map = match(url.pathname, /^\/api\/v18\/editor\/skye-docx-max\/handoff\/([^/]+)\/map$/);
  if(method==='GET' && map){
    const handoff = await loadEditorHandoffPayload(decodeURIComponent(map[1]));
    if(!handoff) return sendJSON(404,{ok:false,error:'handoff not found'});
    const access = assertOwnedOrPrivileged(session, handoff, 'handoff');
    if(!access.ok) return sendJSON(access.status, access);
    return sendJSON(200, closureEnvelope({ area:'editor', action:'handoff-map', session, data:{ handoffId:handoff.id, fieldMap:handoff.fieldMap||[], sectionMap:handoff.sectionMap||[], caseContext:handoff.caseContext||handoff.metadata?.caseContext||null, templateMetadata:handoff.templateMetadata||handoff.metadata?.templateMetadata||[], returnContract:handoff.returnContract||null } }));
  }

  if(method==='POST' && url.pathname==='/api/v18/editor/skye-docx-max/return-to-case'){
    const guard = requireTenantWrite(session, 'SkyeDocxMax return');
    if(!guard.ok) return sendJSON(guard.status, guard);
    const body = await readBody();
    const handoff = await loadEditorHandoffPayload(body.handoffId);
    if(!handoff) return sendJSON(404,{ok:false,error:'SkyeDocxMax handoff session not found for return package.'});
    const access = assertOwnedOrPrivileged(session, handoff, 'handoff');
    if(!access.ok) return sendJSON(access.status, access);
    const returned = createSkyeDocxReturnPackage({ handoff, body, session });
    returned.metadata = { ...(returned.metadata||{}), sourceRoute:'v18-return-to-case', caseId:handoff.metadata?.caseId || handoff.caseContext?.caseId || body.caseId || null };
    const returns = await loadEditorReturns(); returns.unshift(returned); await writeJSON(EDITOR_RETURN_LOG_FILE, returns.slice(0,20000));
    const docRecord = { id:`sdx_return_doc_${crypto.randomUUID()}`, templateId:returned.templateId, source:'v18_skye_docx_max_return', status:'returned_from_skye_docx_max', title:returned.title, owner:returned.owner, tenant:returned.tenant, exportClass:returned.metadata?.exportClass || 'editor_return', riskLevel:returned.metadata?.riskLevel || 'unknown', createdAt:returned.createdAt, updatedAt:returned.createdAt, handoffId:returned.handoffId, returnId:returned.id, caseId:returned.metadata.caseId, lifecycle:[{ status:'returned_from_skye_docx_max', at:returned.createdAt, actor:session.user?.id || 'skye-docx-max', note:'Returned through v18 case reconciliation endpoint.' }] };
    const docs = await loadDocumentRecords(); docs.unshift(docRecord); await writeJSON(DOCUMENT_RECORDS_FILE, docs.slice(0,50000));
    let caseSummary = null;
    const caseId = returned.metadata.caseId;
    if(caseId){
      const cases = await loadCaseRecords(); const index = cases.findIndex(c => c.id === caseId);
      if(index !== -1 && assertOwnedOrPrivileged(session,cases[index],'case').ok){
        const nextIds = [...new Set([...(cases[index].documentIds||[]), docRecord.id])];
        const nextReturns = [...new Set([...(cases[index].returnIds||[]), returned.id])];
        try{ cases[index] = transitionCase({ ...cases[index], documentIds:nextIds, returnIds:nextReturns }, { status:'returned_from_skye_docx_max', actor:session.user?.id||'upstream-user', note:'SkyeDocxMax return reconciled through v18.', payload:{ handoffId:returned.handoffId, returnId:returned.id, documentId:docRecord.id } }); }
        catch{ cases[index] = { ...cases[index], documentIds:nextIds, returnIds:nextReturns, updatedAt:new Date().toISOString() }; }
        await writeJSON(CASE_RECORDS_FILE, cases.slice(0,50000));
        caseSummary = summarizeCase(cases[index]);
      }
    }
    const event = await audit('v18_skye_docx_return_reconciled',{handoffId:returned.handoffId,returnId:returned.id,documentId:docRecord.id,caseId},ctx.req);
    return sendJSON(201, closureEnvelope({ area:'editor', action:'return-to-case', session, data:{ returned:{ id:returned.id, handoffId:returned.handoffId, title:returned.title, documentId:docRecord.id, caseId }, case:caseSummary, auditId:event.id } }));
  }
  return {handled:false};
}
