import crypto from 'node:crypto';
import { scopedOwnerFromSession, canAccessTenantRecord, withTenantScope } from './runtime/tenant-scope.mjs';

export const INTAKE_STATUSES = [
  'intake_started',
  'intake_ready_for_case',
  'converted_to_case',
  'cancelled'
];

function now(){ return new Date().toISOString(); }
function ownerFromSession(session = {}){ return scopedOwnerFromSession(session); }
function safeText(value = '', max = 2000){ return String(value ?? '').slice(0, max); }

export function newIntakeId(){ return `sd_intake_${crypto.randomUUID()}`; }
export function newCaseNoteId(){ return `sd_note_${crypto.randomUUID()}`; }
export function newCaseArtifactId(){ return `sd_artifact_${crypto.randomUUID()}`; }

export function canAccessOwned(session = {}, row = {}){ return canAccessTenantRecord(session, row); }

export function createIntakeRecord({ body = {}, session = {}, recommendedTemplates = [] }){
  const status = body.readyForCase ? 'intake_ready_for_case' : 'intake_started';
  if(!INTAKE_STATUSES.includes(status)) throw new Error(`Unsupported intake status: ${status}`);
  const createdAt = now();
  return {
    id: newIntakeId(),
    title: safeText(body.title || body.businessName || body.clientName || 'SovereignDocs Intake', 240),
    intakeType: safeText(body.intakeType || body.caseType || 'document_workflow_intake', 120),
    status,
    jurisdiction: safeText(body.jurisdiction || body.state || body.answers?.state || '', 80) || null,
    category: safeText(body.category || body.productLane || '', 120) || null,
    selectedTemplateIds: Array.isArray(body.templateIds) ? [...new Set(body.templateIds.map(String))] : [],
    recommendedTemplateIds: recommendedTemplates.map(item => item.id || item).filter(Boolean).map(String),
    facts: body.facts || body.answers || {},
    contact: body.contact || {},
    riskFlags: buildRiskFlags(body),
    owner: ownerFromSession(session),
    tenant: withTenantScope({}, session).tenant,
    boundaries:{
      notLegalAdvice:true,
      noAttorneyClientWithSovereignDocs:true,
      noGuarantee:true,
      officialSourceRequiredWhereApplicable:true,
      partnerOutcomeNotGuaranteed:true,
      acceptedBoundary:!!body.acceptBoundary
    },
    events:[{ id:crypto.randomUUID(), status, at:createdAt, actor:session?.user?.id || 'anonymous', note:'intake record created' }],
    createdAt,
    updatedAt:createdAt
  };
}

function buildRiskFlags(body = {}){
  const text = JSON.stringify(body).toLowerCase();
  const flags = [];
  for(const [key, words] of Object.entries({
    court:['court','lawsuit','sue','judgment','eviction','divorce','custody'],
    tax:['irs','tax','tpt','ein','revenue'],
    ip:['trademark','patent','copyright','uspto'],
    estate:['will','trust','estate','beneficiary','healthcare directive'],
    property:['lease','tenant','landlord','deed','property'],
    employment:['termination','employee','noncompete','harassment']
  })){
    if(words.some(word => text.includes(word))) flags.push(key);
  }
  return flags;
}

export function summarizeIntakeRecord(row = {}){
  return {
    id:row.id,
    title:row.title,
    intakeType:row.intakeType,
    status:row.status,
    jurisdiction:row.jurisdiction || null,
    category:row.category || null,
    selectedTemplateCount:row.selectedTemplateIds?.length || 0,
    recommendedTemplateCount:row.recommendedTemplateIds?.length || 0,
    riskFlags:row.riskFlags || [],
    owner:row.owner || null,
    createdAt:row.createdAt,
    updatedAt:row.updatedAt
  };
}

export function createCaseNote({ caseId, body = {}, session = {} }){
  const at = now();
  return {
    id:newCaseNoteId(),
    caseId:String(caseId),
    noteType:safeText(body.noteType || 'operator_note', 80),
    visibility:['internal','client','partner'].includes(body.visibility) ? body.visibility : 'internal',
    body:safeText(body.body || body.note || '', 5000),
    tags:Array.isArray(body.tags) ? body.tags.map(String).slice(0,20) : [],
    owner:ownerFromSession(session),
    tenant:withTenantScope({}, session).tenant,
    createdAt:at,
    updatedAt:at
  };
}
export function summarizeCaseNote(row = {}){
  return { id:row.id, caseId:row.caseId, noteType:row.noteType, visibility:row.visibility, body:row.body, tags:row.tags || [], owner:row.owner || null, createdAt:row.createdAt, updatedAt:row.updatedAt };
}

export function createCaseArtifact({ caseId, body = {}, session = {} }){
  const at = now();
  return {
    id:newCaseArtifactId(),
    caseId:String(caseId),
    artifactType:safeText(body.artifactType || 'metadata_attachment', 120),
    title:safeText(body.title || body.filename || 'Case artifact', 260),
    filename:body.filename ? safeText(body.filename, 260) : null,
    mimeType:body.mimeType ? safeText(body.mimeType, 120) : null,
    sizeBytes:Number(body.sizeBytes || 0),
    storageKey:body.storageKey ? safeText(body.storageKey, 500) : null,
    note:safeText(body.note || '', 1000),
    owner:ownerFromSession(session),
    tenant:withTenantScope({}, session).tenant,
    createdAt:at,
    updatedAt:at
  };
}
export function summarizeCaseArtifact(row = {}){
  return { id:row.id, caseId:row.caseId, artifactType:row.artifactType, title:row.title, filename:row.filename, mimeType:row.mimeType, sizeBytes:row.sizeBytes || 0, storageKey:row.storageKey || null, createdAt:row.createdAt };
}

function pushTimeline(events, event){ if(event?.at) events.push(event); }
function caseEventToTimeline(caseId, ev = {}){ return { id:ev.id || crypto.randomUUID(), caseId, type:'case_status', status:ev.status, label:`Case ${String(ev.status || '').replaceAll('_',' ')}`, at:ev.at, actor:ev.actor || null, note:ev.note || '', payload:ev.payload || {} }; }

export function buildCaseTimeline({ caseRecord, documents = [], packets = [], reviews = [], handoffs = [], returns = [], notes = [], reminders = [], orders = [], artifacts = [] }){
  const caseId = caseRecord.id;
  const events = [];
  for(const ev of caseRecord.events || []) pushTimeline(events, caseEventToTimeline(caseId, ev));
  for(const doc of documents.filter(row => (caseRecord.documentIds || []).includes(row.id))) pushTimeline(events, { id:`tl_${doc.id}`, caseId, type:'document', status:doc.status, label:`Document ${doc.status || 'recorded'}`, at:doc.updatedAt || doc.createdAt, refId:doc.id, title:doc.title || doc.templateTitle || doc.templateId });
  for(const pkt of packets.filter(row => row.caseId === caseId || row.id === caseRecord.packetId)) pushTimeline(events, { id:`tl_${pkt.id}`, caseId, type:'packet', status:pkt.status || 'packet_recorded', label:'Packet assembled', at:pkt.updatedAt || pkt.createdAt, refId:pkt.id, title:pkt.title });
  for(const rev of reviews.filter(row => row.caseId === caseId || (caseRecord.reviewSubmissionIds || []).includes(row.id))) pushTimeline(events, { id:`tl_${rev.id}`, caseId, type:'partner_review', status:rev.status, label:`Partner review ${String(rev.status || '').replaceAll('_',' ')}`, at:rev.updatedAt || rev.createdAt, refId:rev.id, title:rev.title || rev.templateTitle });
  for(const handoff of handoffs.filter(row => row.metadata?.caseId === caseId || row.caseId === caseId || row.id === caseRecord.handoffId)) pushTimeline(events, { id:`tl_${handoff.id}`, caseId, type:'editor_handoff', status:handoff.status || 'created', label:'SkyeDocxMax handoff created', at:handoff.updatedAt || handoff.createdAt, refId:handoff.id, title:handoff.title });
  for(const ret of returns.filter(row => row.metadata?.caseId === caseId || row.caseId === caseId || (caseRecord.returnIds || []).includes(row.id))) pushTimeline(events, { id:`tl_${ret.id}`, caseId, type:'editor_return', status:'returned', label:'SkyeDocxMax return captured', at:ret.createdAt, refId:ret.id, title:ret.title });
  for(const note of notes.filter(row => row.caseId === caseId)) pushTimeline(events, { id:`tl_${note.id}`, caseId, type:'note', status:note.visibility, label:`${note.visibility} note`, at:note.createdAt, refId:note.id, title:note.noteType, note:note.body });
  for(const rem of reminders.filter(row => row.caseId === caseId || row.sourceId === caseId)) pushTimeline(events, { id:`tl_${rem.id}`, caseId, type:'reminder', status:rem.status, label:`Reminder ${rem.status}`, at:rem.updatedAt || rem.createdAt, refId:rem.id, title:rem.title });
  for(const order of orders.filter(row => (caseRecord.orderIds || []).includes(row.id) || row.caseId === caseId)) pushTimeline(events, { id:`tl_${order.id}`, caseId, type:'order', status:order.status, label:`Order ${order.status}`, at:order.updatedAt || order.createdAt, refId:order.id, title:order.type || order.serviceId });
  for(const artifact of artifacts.filter(row => row.caseId === caseId)) pushTimeline(events, { id:`tl_${artifact.id}`, caseId, type:'artifact', status:'attached', label:'Artifact attached', at:artifact.createdAt, refId:artifact.id, title:artifact.title });
  events.sort((a,b) => String(a.at || '').localeCompare(String(b.at || '')));
  return { ok:true, caseId, count:events.length, items:events };
}

export function buildClientStatus({ caseRecord, timeline }){
  const publicSteps = (timeline.items || []).filter(ev => ['case_status','document','packet','editor_return','partner_review','reminder'].includes(ev.type)).map(ev => ({ type:ev.type, status:ev.status, label:ev.label, at:ev.at, title:ev.title || null }));
  return {
    ok:true,
    case:{ id:caseRecord.id, title:caseRecord.title, status:caseRecord.status, createdAt:caseRecord.createdAt, updatedAt:caseRecord.updatedAt, riskSummary:caseRecord.riskSummary || {} },
    progress:deriveCaseProgress(caseRecord.status),
    steps:publicSteps,
    boundaries:{ notLegalAdvice:true, noGuarantee:true, partnerOutcomeNotGuaranteed:true, officialSourceRequiredWhereApplicable:true },
    nextClientAction:deriveNextClientAction(caseRecord.status)
  };
}

function deriveCaseProgress(status = ''){
  const order = ['intake_started','documents_generated','packet_assembled','editor_handoff_created','opened_in_skye_docx_max','returned_from_skye_docx_max','submitted_for_partner_review','routed_to_partner','partner_review_returned','signature_packet_created','completed'];
  const index = Math.max(0, order.indexOf(status));
  return { status, percent:Math.min(100, Math.round(((index + 1) / order.length) * 100)) };
}
function deriveNextClientAction(status = ''){
  if(status === 'editor_handoff_created') return 'Open and review the draft in SkyeDocxMax.';
  if(status === 'opened_in_skye_docx_max') return 'Finish edits in SkyeDocxMax and return the package to SovereignDocs.';
  if(status === 'returned_from_skye_docx_max') return 'Review the returned draft and decide whether to request partner review or signature routing.';
  if(status === 'submitted_for_partner_review' || status === 'routed_to_partner') return 'Wait for partner review status or provide requested information.';
  if(status === 'partner_review_returned') return 'Review partner return notes and decide whether to sign, revise, or archive.';
  if(status === 'completed') return 'Download/archive your completed package.';
  return 'Continue the guided workflow.';
}

export function buildPartnerPacket({ caseRecord, documents = [], packet = null, reviews = [], notes = [], artifacts = [] }){
  const visibleNotes = notes.filter(n => n.caseId === caseRecord.id && ['partner','internal'].includes(n.visibility));
  const docRows = documents.filter(row => (caseRecord.documentIds || []).includes(row.id));
  const reviewRows = reviews.filter(row => row.caseId === caseRecord.id || (caseRecord.reviewSubmissionIds || []).includes(row.id));
  const lines = [
    `# Partner Review Packet: ${caseRecord.title}`,
    '',
    `Case ID: ${caseRecord.id}`,
    `Status: ${caseRecord.status}`,
    `Risk Summary: ${JSON.stringify(caseRecord.riskSummary || {})}`,
    '',
    '## Boundaries',
    '- SovereignDocs is not a law firm.',
    '- Partner review is handled by external/partner legal professionals when accepted.',
    '- SovereignDocs does not guarantee review acceptance, outcome, filing acceptance, enforceability, or compliance.',
    '',
    '## Documents',
    ...(docRows.length ? docRows.map(doc => `- ${doc.title || doc.templateTitle || doc.templateId || doc.id} (${doc.status || 'recorded'}) — ${doc.id}`) : ['- No document records linked yet.']),
    '',
    '## Packet',
    packet ? `- ${packet.title || packet.id} (${packet.status || 'assembled'})` : '- No packet record linked.',
    '',
    '## Review submissions',
    ...(reviewRows.length ? reviewRows.map(row => `- ${row.title || row.templateTitle || row.id} (${row.status}) — ${row.id}`) : ['- No partner review submissions linked yet.']),
    '',
    '## Notes for partner review',
    ...(visibleNotes.length ? visibleNotes.map(note => `- [${note.visibility}] ${note.body}`) : ['- No partner-visible notes yet.']),
    '',
    '## Artifacts',
    ...(artifacts.filter(a => a.caseId === caseRecord.id).map(a => `- ${a.title || a.filename || a.id} (${a.artifactType})`) || [])
  ];
  return { ok:true, caseId:caseRecord.id, markdown:lines.join('\n'), json:{ case:caseRecord, documents:docRows, packet, reviews:reviewRows, notes:visibleNotes, artifacts:artifacts.filter(a => a.caseId === caseRecord.id) } };
}

export function buildCaseExportBundle({ caseRecord, documents = [], packet = null, reviews = [], handoffs = [], returns = [], notes = [], reminders = [], orders = [], artifacts = [], timeline }){
  return {
    ok:true,
    exportType:'sovereigndocs_case_bundle',
    version:'16.0.0',
    exportedAt:now(),
    boundaries:{ notLegalAdvice:true, noGuarantee:true, officialSourceRequiredWhereApplicable:true, partnerOutcomeNotGuaranteed:true },
    case:caseRecord,
    timeline,
    documents:documents.filter(row => (caseRecord.documentIds || []).includes(row.id)),
    packet,
    partnerReviews:reviews.filter(row => row.caseId === caseRecord.id || (caseRecord.reviewSubmissionIds || []).includes(row.id)),
    editorHandoffs:handoffs.filter(row => row.metadata?.caseId === caseRecord.id || row.id === caseRecord.handoffId),
    editorReturns:returns.filter(row => row.metadata?.caseId === caseRecord.id || (caseRecord.returnIds || []).includes(row.id)),
    notes:notes.filter(row => row.caseId === caseRecord.id),
    reminders:reminders.filter(row => row.caseId === caseRecord.id || row.sourceId === caseRecord.id),
    orders:orders.filter(row => row.caseId === caseRecord.id || (caseRecord.orderIds || []).includes(row.id)),
    artifacts:artifacts.filter(row => row.caseId === caseRecord.id)
  };
}

export function buildWorkQueues({ cases = [], reviews = [], reminders = [], patches = [], orders = [], intakes = [] }){
  const nowMs = Date.now();
  const dueSoon = reminders.filter(r => r.dueDate && new Date(r.dueDate).getTime() - nowMs <= 7 * 24 * 60 * 60 * 1000 && !['completed','cancelled'].includes(r.status));
  const activeCases = cases.filter(c => !['completed','archived','voided'].includes(c.status));
  return {
    ok:true,
    generatedAt:now(),
    queues:{
      intakesReady:{ count:intakes.filter(i => i.status === 'intake_ready_for_case').length, items:intakes.filter(i => i.status === 'intake_ready_for_case').slice(0,50).map(summarizeIntakeRecord) },
      activeCases:{ count:activeCases.length, items:activeCases.slice(0,50).map(c => ({ id:c.id, title:c.title, status:c.status, updatedAt:c.updatedAt, riskSummary:c.riskSummary || {} })) },
      partnerReview:{ count:reviews.filter(r => !['partner_review_returned','cancelled','archived'].includes(r.status)).length, items:reviews.filter(r => !['partner_review_returned','cancelled','archived'].includes(r.status)).slice(0,50) },
      dueSoonReminders:{ count:dueSoon.length, items:dueSoon.slice(0,50) },
      templateOps:{ count:patches.filter(p => !['rejected','applied'].includes(p.status)).length, items:patches.filter(p => !['rejected','applied'].includes(p.status)).slice(0,50) },
      commercialOrders:{ count:orders.filter(o => !['completed','cancelled','archived'].includes(o.status)).length, items:orders.filter(o => !['completed','cancelled','archived'].includes(o.status)).slice(0,50) }
    }
  };
}
