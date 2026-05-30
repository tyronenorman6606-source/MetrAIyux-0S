import crypto from 'node:crypto';
import { scopedOwnerFromSession, withTenantScope } from './runtime/tenant-scope.mjs';

function clean(value, max = 4000){ return String(value ?? '').trim().slice(0, max); }
const CANONICAL_SKYEDOCXMAX_EDITOR = '/Marketing-Made-Easy/SkyeDocxMax/editor.html';
function canonicalLaunchUrl(id){
  const params = new URLSearchParams({
    source:'sovereigndocs',
    ws_id:'sovereigndocs',
    returnTo:'/Free99/apps/sovereigndocs/vault/',
    sd_handoff:String(id || '')
  });
  return `${CANONICAL_SKYEDOCXMAX_EDITOR}?${params.toString()}`;
}

export function skyeDocxMaxConfig(){
  return {
    ok:true,
    editor:'SkyeDocx Max',
    mode:'canonical-0s-editor-runtime',
    enabled:true,
    embedsCustomEditor:false,
    bundledSkyeDocxMax:false,
    canonicalEditor:CANONICAL_SKYEDOCXMAX_EDITOR,
    appPath:CANONICAL_SKYEDOCXMAX_EDITOR,
    launchParameter:'sd_handoff',
    handoffFormat:'sovereigndocs-skye-docx-max-handoff-v3',
    acceptedPayload:['markdown','html','templateMetadata','documentRecord','answers','auditContext','packetMetadata','fieldMap','sectionMap','caseContext'],
    returnEndpoint:'/api/editor/skye-docx-max/return',
    handoffEndpoint:'/api/editor/skye-docx-max/session',
    boundary:'SovereignDocs creates governed automation payloads and hands them to the canonical 0S SkyeDocxMax editor runtime. SkyeDocxMax owns serious editing, layout, comments, and authoring; SovereignDocs remains document automation, governance, review, and workflow infrastructure.'
  };
}

export function createSkyeDocxMaxHandoff({ templateId = null, documentId = null, packetId = null, title = 'SovereignDocs Document', markdown = '', html = '', answers = {}, metadata = {}, session = {} }){
  const now = new Date().toISOString();
  const id = `sdx_handoff_${crypto.randomUUID()}`;
  return {
    id,
    format:'sovereigndocs-skye-docx-max-handoff-v3',
    target:'SkyeDocx Max',
    launchUrl:canonicalLaunchUrl(id),
    createdAt:now,
    templateId:templateId ? String(templateId) : null,
    documentId:documentId ? String(documentId) : null,
    packetId:packetId ? String(packetId) : null,
    title:clean(title, 300) || 'SovereignDocs Document',
    markdown:String(markdown || ''),
    html:String(html || ''),
    answers:answers && typeof answers === 'object' ? answers : {},
    metadata:{
      ...metadata,
      notLegalAdvice:true,
      source:'SovereignDocs',
      generatedForSkyeDocxMax:true,
      editorRuntime:'canonical 0S SkyeDocxMax',
      integrationVersion:'v18'
    },
    owner:scopedOwnerFromSession(session),
    tenant:withTenantScope({}, session).tenant,
    fieldMap:Object.entries(answers && typeof answers === 'object' ? answers : {}).map(([key,value]) => ({ key, label:String(key).replaceAll('_',' ').replace(/\b\w/g, m => m.toUpperCase()), valuePreview:String(value ?? '').slice(0,160), target:'document-field' })),
    sectionMap:String(markdown || '').split(/\n(?=##\s+)/).map((section, index) => ({ id:`section_${index+1}`, heading:(section.match(/^##\s+(.+)$/m)||section.match(/^#\s+(.+)$/m)||[])[1] || `Section ${index+1}`, index, length:section.length })),
    caseContext:metadata?.caseId ? { caseId:metadata.caseId, caseType:metadata.caseType || null, caseStatus:metadata.caseStatus || null, packetId, documentId } : null,
    templateMetadata:metadata?.templateMetadata || (templateId ? [{ templateId, title, riskLevel:metadata?.riskLevel || null, sourcePath:metadata?.sourcePath || null }] : []),
    workflowAnchors:metadata?.workflowAnchors || { caseId:metadata?.caseId || null, documentIds:metadata?.documentIds || (documentId ? [documentId] : []), packetId:packetId || null },
    returnContract:{ endpoint:'/api/v18/editor/skye-docx-max/return-to-case', required:['handoffId','html or text'], caseId:metadata?.caseId || null, documentId, packetId },
    instructions:[
      'SkyeDocxMax should import this payload as an editable document.',
      'Keep SovereignDocs boundary copy attached unless a qualified professional workflow explicitly replaces it.',
      'Do not treat this handoff as legal advice or attorney review.',
      'Return edited HTML/text through the SovereignDocs return endpoint when the user chooses to send it back.'
    ],
    boundary:'Editor handoff only. No legal advice, no attorney-client relationship with SovereignDocs, and no guarantee of suitability, compliance, enforceability, filing acceptance, or partner-review outcome.'
  };
}

export function summarizeSkyeDocxHandoff(handoff){
  return {
    id:handoff.id,
    format:handoff.format,
    target:handoff.target,
    launchUrl:handoff.launchUrl,
    templateId:handoff.templateId,
    documentId:handoff.documentId,
    packetId:handoff.packetId,
    title:handoff.title,
    createdAt:handoff.createdAt,
    owner:handoff.owner,
    metadata:handoff.metadata,
    boundary:handoff.boundary
  };
}

export function createSkyeDocxReturnPackage({ handoff = {}, body = {}, session = {} }){
  const now = new Date().toISOString();
  const html = String(body.html || '').slice(0, 2_000_000);
  const text = String(body.text || '').slice(0, 2_000_000);
  const title = clean(body.title || handoff.title || 'SkyeDocxMax Return', 300);
  return {
    id:`sdx_return_${crypto.randomUUID()}`,
    handoffId:handoff.id || body.handoffId || null,
    source:'SkyeDocxMax',
    target:'SovereignDocs',
    createdAt:now,
    title,
    html,
    text,
    activeDocId:body.activeDocId || null,
    templateId:handoff.templateId || body.templateId || null,
    documentId:handoff.documentId || body.documentId || null,
    packetId:handoff.packetId || body.packetId || null,
    metadata:{ ...(handoff.metadata || {}), ...(body.metadata || {}), returnedFromSkyeDocxMax:true, integrationVersion:'v18' },
    owner:session?.user ? scopedOwnerFromSession(session) : handoff.owner || null,
    tenant:session?.user ? withTenantScope({}, session).tenant : handoff.tenant || null,
    boundary:'Returned editor package. SovereignDocs stores workflow output; this does not create legal advice, attorney review, or guarantee of suitability.'
  };
}
