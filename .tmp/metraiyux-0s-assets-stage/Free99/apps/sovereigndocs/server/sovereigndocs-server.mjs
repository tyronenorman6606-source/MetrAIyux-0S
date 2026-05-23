import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDocxBuffer, safeFilename } from './docx-exporter.mjs';
import { sessionFromRequest, requireRole, createSignedSessionToken } from './upstream-auth.mjs';
import { isProduction, validateProductionConfig, assertProductionConfig, allowedOrigin } from './config.mjs';
import { sendNotification } from './notification-adapter.mjs';
import { createCheckoutIntent } from './payment-adapter.mjs';
import { storeArtifact } from './storage-adapter.mjs';
import { createExternalSigningEnvelope } from './esign-provider-adapter.mjs';
import { appendAuditEvent, verifyAuditLedger } from './audit-ledger.mjs';
import { REVIEW_STATUSES, decideTemplateGate, buildPrepWorksheet } from './policy-engine.mjs';
import { LEGAL_REVIEW_STATUSES, requirePartnerReviewAcknowledgments, canAccessSubmission, summarizeSubmission, createLegalReviewSubmission, transitionLegalReviewSubmission } from './legal-partner-review.mjs';
import { COMMERCIAL_ORDER_STATUSES, requireCommercialAcknowledgments, summarizeOrder, canAccessOrder, createCommercialOrder, transitionCommercialOrder, buildFormationPrepPacket, buildComplianceMonitor, buildReviewReadyPacket } from './commercial-workflows.mjs';
import { entitlementSnapshot, requireEntitlement, assertExportQuota } from './entitlements.mjs';
import { DOCUMENT_STATUSES, createDocumentRecord, transitionDocument, summarizeDocument } from './document-lifecycle.mjs';
import { buildPacketManifest, renderPacketMarkdown } from './packet-engine.mjs';
import { REMINDER_STATUSES, createReminder, summarizeReminder, transitionReminder } from './reminder-engine.mjs';
import { createTemplatePatchRequest, transitionTemplatePatch, summarizeTemplatePatch, createTemplateOverrideFromPatch, applyTemplateOverrides } from './template-operations.mjs';
import { skyeDocxMaxConfig, createSkyeDocxMaxHandoff, summarizeSkyeDocxHandoff, createSkyeDocxReturnPackage } from './editor-adapter.mjs';
import { CASE_STATUSES, createCaseRecord, transitionCase, summarizeCase, canAccessCase, newCaseId } from './case-workflows.mjs';
import { createIntakeRecord, summarizeIntakeRecord, canAccessOwned, createCaseNote, summarizeCaseNote, createCaseArtifact, summarizeCaseArtifact, buildCaseTimeline, buildClientStatus, buildPartnerPacket, buildCaseExportBundle, buildWorkQueues } from './case-experience.mjs';
import { assertObject, requireFields, trimString, assertArray } from './request-validation.mjs';
import { routeManifest, handlePremiumRoute } from './routes/index.mjs';
import { filterTenantRecords, tenantScopeFromSession } from './runtime/tenant-scope.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.join(ROOT, 'data');
const VAULT_FILE = path.join(DATA_DIR, 'vault.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');
const AUDIT_LEDGER_FILE = path.join(DATA_DIR, 'audit-ledger.ndjson');
const REVIEW_DECISIONS_FILE = path.join(DATA_DIR, 'review-decisions.json');
const LEGAL_REVIEW_SUBMISSIONS_FILE = path.join(DATA_DIR, 'legal-review-submissions.json');
const LEGAL_REVIEW_PAYMENTS_FILE = path.join(DATA_DIR, 'legal-review-payments.json');
const LEGAL_REVIEW_PAYOUTS_FILE = path.join(DATA_DIR, 'legal-review-payouts.json');
const LEGAL_REVIEW_VAULT_RECORDS_FILE = path.join(DATA_DIR, 'vault-legal-review-records.json');
const CUSTOMER_ORDERS_FILE = path.join(DATA_DIR, 'customer-orders.json');
const ESIGN_ENVELOPE_LOG_FILE = path.join(DATA_DIR, 'esign-envelope-log.json');
const DOCUMENT_RECORDS_FILE = path.join(DATA_DIR, 'document-records.json');
const PACKET_RECORDS_FILE = path.join(DATA_DIR, 'packet-records.json');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const TEMPLATE_PATCH_REQUESTS_FILE = path.join(DATA_DIR, 'template-patch-requests.json');
const TEMPLATE_OVERRIDES_FILE = path.join(DATA_DIR, 'template-overrides.json');
const EDITOR_HANDOFF_LOG_FILE = path.join(DATA_DIR, 'editor-handoff-log.json');
const EDITOR_HANDOFF_PAYLOAD_DIR = path.join(DATA_DIR, 'editor-handoffs');
const EDITOR_RETURN_LOG_FILE = path.join(DATA_DIR, 'editor-return-log.json');
const CASE_RECORDS_FILE = path.join(DATA_DIR, 'case-records.json');
const CASE_INTAKES_FILE = path.join(DATA_DIR, 'case-intakes.json');
const CASE_NOTES_FILE = path.join(DATA_DIR, 'case-notes.json');
const CASE_ARTIFACTS_FILE = path.join(DATA_DIR, 'case-artifacts.json');
const LIB_ROOT = path.join(ROOT, 'template-library');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.ndjson': 'application/x-ndjson; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function contentTypeForBody(body){
  if(Buffer.isBuffer(body)) return 'application/octet-stream';
  if(typeof body === 'string') return 'text/plain; charset=utf-8';
  return 'application/json; charset=utf-8';
}
function send(res, status, body, headers = {}){
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2);
  res.writeHead(status, { 'content-type': contentTypeForBody(body), 'cache-control':'no-store', 'x-content-type-options':'nosniff', ...headers });
  res.end(payload);
}
function sendJSON(res, status, body, headers = {}){ send(res, status, body, { 'content-type': 'application/json; charset=utf-8', ...headers }); }
async function readJSON(file, fallback){ try{ return JSON.parse(await readFile(file, 'utf8')); } catch{ return fallback; } }
async function writeJSON(file, value){ await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
async function loadManifest(){ return readJSON(path.join(LIB_ROOT, 'manifest.json'), { records: [], categories: [], templates: [] }); }
async function loadCategories(){ return readJSON(path.join(LIB_ROOT, 'categories.json'), []); }
async function loadJurisdictions(){ return readJSON(path.join(LIB_ROOT, 'jurisdictions.json'), []); }
async function loadDataFile(name, fallback = []){ return readJSON(path.join(DATA_DIR, name), fallback); }
async function loadPathJSON(rel, fallback){ return readJSON(path.join(ROOT, rel), fallback); }
async function loadReviewDecisions(){ return readJSON(REVIEW_DECISIONS_FILE, []); }
async function loadLegalReviewSubmissions(){ return readJSON(LEGAL_REVIEW_SUBMISSIONS_FILE, []); }
async function loadLegalReviewPayments(){ return readJSON(LEGAL_REVIEW_PAYMENTS_FILE, []); }
async function loadLegalReviewPayouts(){ return readJSON(LEGAL_REVIEW_PAYOUTS_FILE, []); }
async function loadLegalReviewVaultRecords(){ return readJSON(LEGAL_REVIEW_VAULT_RECORDS_FILE, []); }
async function loadCustomerOrders(){ return readJSON(CUSTOMER_ORDERS_FILE, []); }
async function loadDocumentRecords(){ return readJSON(DOCUMENT_RECORDS_FILE, []); }
async function loadPacketRecords(){ return readJSON(PACKET_RECORDS_FILE, []); }
async function loadReminders(){ return readJSON(REMINDERS_FILE, []); }
async function loadTemplatePatchRequests(){ return readJSON(TEMPLATE_PATCH_REQUESTS_FILE, []); }
async function loadTemplateOverrides(){ return readJSON(TEMPLATE_OVERRIDES_FILE, { ok:true, version:'20.0.0', overrides:[] }); }
async function loadEditorHandoffs(){ return readJSON(EDITOR_HANDOFF_LOG_FILE, []); }
async function loadEditorReturns(){ return readJSON(EDITOR_RETURN_LOG_FILE, []); }
async function loadCaseRecords(){ return readJSON(CASE_RECORDS_FILE, []); }
async function loadCaseIntakes(){ return readJSON(CASE_INTAKES_FILE, []); }
async function loadCaseNotes(){ return readJSON(CASE_NOTES_FILE, []); }
async function loadCaseArtifacts(){ return readJSON(CASE_ARTIFACTS_FILE, []); }
async function writeEditorHandoffPayload(handoff){ await mkdir(EDITOR_HANDOFF_PAYLOAD_DIR, { recursive:true }); await writeJSON(path.join(EDITOR_HANDOFF_PAYLOAD_DIR, `${handoff.id}.json`), handoff); }
async function loadEditorHandoffPayload(id){ const safe = String(id || '').replace(/[^a-zA-Z0-9_-]/g, ''); if(!safe) return null; return readJSON(path.join(EDITOR_HANDOFF_PAYLOAD_DIR, `${safe}.json`), null); }

function normalizeQuestion(q){ return { id: q.id || q.key, key: q.key || q.id, label: q.label || q.key || q.id, type: q.type === 'system' ? 'hidden' : (q.type || 'text'), required: !!q.required, options: q.options || [], system: q.type === 'system' }; }
async function loadTemplateBundle(templateId){
  const manifest = await loadManifest();
  const records = manifest.records || manifest.templates || [];
  const item = records.find(t => t.id === templateId);
  if(!item){ const err = new Error(`Template not found: ${templateId}`); err.status = 404; throw err; }
  const rawSource = await readJSON(path.join(ROOT, item.path), null);
  if(!rawSource){ const err = new Error(`Template source missing: ${item.path}`); err.status = 500; throw err; }
  const overridesFile = await loadTemplateOverrides();
  const { item:patchedItem, raw, appliedOverrides } = applyTemplateOverrides({ item, raw:rawSource, overrides:overridesFile.overrides || [] });
  const questions = (raw.questionnaire || []).map(normalizeQuestion);
  const document = raw.render_markdown || (raw.sections || []).map(section => `## ${section.heading}\n${section.body}`).join('\n\n');
  const meta = {
    id: raw.id || patchedItem.id,
    title: raw.title || patchedItem.title,
    version: raw.version || 'unknown',
    riskLevel: raw.risk_level || patchedItem.risk_level,
    status: raw.status || patchedItem.status,
    category: raw.category || patchedItem.category_slug,
    jurisdiction: raw.jurisdiction || patchedItem.jurisdiction_id,
    notLegalAdviceRequired: raw.not_legal_advice !== false,
    review: raw.review || {},
    rights: raw.rights || {},
    sourcePath: patchedItem.path,
    checksum: patchedItem.checksum || raw.checksum || null,
    appliedOverrides
  };
  return { item:patchedItem, raw, meta, questions, document, disclaimer: 'SovereignDocs provides self-help document automation only. This is not legal advice, is not attorney-reviewed, and does not create an attorney-client relationship.' };
}

function slugLabel(value = ''){ return String(value).replaceAll('-', ' ').replaceAll('_',' ').replace(/\b\w/g, m => m.toUpperCase()); }
function htmlEscape(value = ''){ return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function assembleDocument(template, answers = {}){
  let out = String(template || '');
  out = out.replace(/{{#if\s+([\w-]+)}}([\s\S]*?){{\/if}}/g, (_, key, inner) => String(answers[key] || '').trim() ? inner : '');
  out = out.replace(/{{\s*([\w-]+)\s*}}/g, (_, key) => {
    const value = answers[key];
    if(value === undefined || value === null || String(value).trim() === '') return `[${slugLabel(key)}]`;
    return String(value).trim();
  });
  return out;
}
function withSignature(markdown, signature){ if(!signature || !String(signature).trim()) return markdown; return `${markdown}\n\n## Local Signature Record\n\nTyped signature / acknowledgment: ${String(signature).trim()}\n\nSignature timestamp: ${new Date().toISOString()}\n`; }
function missingRequired(questions = [], answers = {}){ return questions.filter(q => q.required && !q.system && !String(answers[q.id] ?? '').trim()).map(q => ({ id: q.id, label: q.label })); }
function readBody(req){ return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => { raw += chunk; if(raw.length > 10_000_000){ reject(Object.assign(new Error('Request body too large'), { status: 413 })); req.destroy(); } }); req.on('end', () => { if(!raw.trim()) return resolve({}); try{ resolve(JSON.parse(raw)); } catch{ reject(Object.assign(new Error('Expected JSON body'), { status: 400 })); } }); req.on('error', reject); }); }
async function audit(type, detail = {}, req){ return appendAuditEvent({ ledgerFile:AUDIT_LEDGER_FILE, legacyFile:AUDIT_FILE, type, detail, session:sessionFromRequest(req) }); }
function summarizeManifest(manifest, categories, jurisdictions){
  const records = manifest.records || [];
  const risks = records.reduce((a,r)=>(a[r.risk_level]=(a[r.risk_level]||0)+1,a),{});
  return {
    ok:true,
    name:'SovereignDocs API',
    version:'20.0.0',
    mode:'code-core-activation-enforcement-api',
    sourceTruth:'v2.1-confidence-review-library',
    templates:records.length,
    categories:categories.length,
    jurisdictions:jurisdictions.length,
    riskCounts:risks,
    storage:'local-json-dev-fallback-with-neon-d1-cutover-schema',
    auth:'signed-upstream-session-ready-no-built-in-login',
    audit:'append-only-hash-chain-ledger',
    highRiskPolicy:'blocked from public export unless review decision allows prep worksheet or gated draft',
    legalPartnerReview:'submission and partner-routing lane available with no guarantee and no SovereignDocs legal advice',
    commercialCore:'business formation, compliance, registered-agent referral, trademark/IP prep, estate worksheet lane, legal-plan intent, signature packets, vault, order tracking',
    codeCore:'entitlements, document lifecycle, packet assembly, reminder engine, admin template patch queue, partner workbench APIs, case workflow orchestration, case timelines, client status views, partner packets, work queues, schema validation',
    notLegalAdvice:true,
    routeModules:routeManifest().modules.map(m => ({ name:m.name, area:m.area, routeCount:m.routes.length })),
    sourceTruthFiles:['template-library/manifest.json','audit/publish-gates.json','official-source-library/official-workflows.json','review-workflow/review-queue-high-risk.json','template-library/state-overlays-v2/US-AZ.json'],
    partnerReviewFiles:['data/legal-partner-network.json','data/legal-review-service-plans.json','data/legal-review-submissions.json','data/legal-review-statuses.json'],
    commercialCoreFiles:['data/core-product-catalog.json','data/business-formation-workflows.json','data/compliance-obligations.json','data/legal-plan-catalog.json','data/customer-orders.json']
  };
}
function findOfficialWorkflow(official, id){ return (official.workflows || []).find(w => w.id === id); }
function buildOfficialPrepPacket(workflow, answers = {}){
  const fields = workflow.prep_fields || [];
  const rows = fields.map(field => `- ${slugLabel(field)}: ${answers[field] ? String(answers[field]).trim() : '[Complete before using official source]'}`).join('\n');
  return `# ${workflow.title}\n\nSovereignDocs official-source prep packet.\n\nThis is not an official filing, not a replacement government form, and not legal or tax advice. Use the current official source for final completion or submission.\n\n## Official source\n\n${workflow.official_url || '[Official source URL not supplied]'}\n\n## Completion model\n\n${workflow.completion_model || 'prep packet plus official source route'}\n\n## Prep fields\n\n${rows}\n\n## Policy\n\n${workflow.document_generation_policy || 'Do not recreate official forms; route to the official source.'}\n`;
}
function markdownToHtml(markdown){
  return String(markdown || '').split(/\n+/).map(line => {
    if(line.startsWith('# ')) return `<h1>${htmlEscape(line.slice(2))}</h1>`;
    if(line.startsWith('## ')) return `<h2>${htmlEscape(line.slice(3))}</h2>`;
    if(line.startsWith('### ')) return `<h3>${htmlEscape(line.slice(4))}</h3>`;
    if(line.startsWith('- ')) return `<p>• ${htmlEscape(line.slice(2))}</p>`;
    return line.trim() ? `<p>${htmlEscape(line)}</p>` : '';
  }).join('');
}
function buildAnswers(bundle, body){ return { state_full_name: bundle.item.state_name, state_code: bundle.item.state_code, document_title: bundle.item.title, ...(body.answers || {}) }; }
function paginatedTemplateSearch({ records = [], url }){
  const q = String(url.searchParams.get('q') || '').toLowerCase().trim();
  const category = String(url.searchParams.get('category') || '').trim();
  const state = String(url.searchParams.get('state') || '').trim().toUpperCase();
  const risk = String(url.searchParams.get('risk') || '').trim();
  const lane = String(url.searchParams.get('lane') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 50)));
  let rows = records;
  if(q) rows = rows.filter(r => `${r.title} ${r.id} ${r.category_name} ${r.state_name}`.toLowerCase().includes(q));
  if(category) rows = rows.filter(r => r.category_slug === category || r.category_name === category);
  if(state) rows = rows.filter(r => r.state_code === state || r.jurisdiction_id === `US-${state}`);
  if(risk) rows = rows.filter(r => r.risk_level === risk);
  if(lane) rows = rows.filter(r => r.publish_lane === lane);
  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { ok:true, page, pageSize, total, totalPages:Math.ceil(total / pageSize), items: rows.slice(start, start + pageSize) };
}


async function createAndStoreCommercialOrder({ req, type, serviceId, risk = 'medium', jurisdiction = null, payload = {}, status = 'intake_received' }){
  const session = sessionFromRequest(req);
  const rows = await loadCustomerOrders();
  const entry = createCommercialOrder({ type, serviceId, risk, jurisdiction, payload, session, status });
  rows.unshift(entry);
  await writeJSON(CUSTOMER_ORDERS_FILE, rows.slice(0, 50000));
  const auditEvent = await audit('commercial_order_created', { orderId:entry.id, type, serviceId, risk, jurisdiction:entry.jurisdiction, status:entry.status }, req);
  return { entry, auditEvent };
}
function findById(collection, id){ return (collection || []).find(item => String(item.id) === String(id)); }
const SD_LEGAL_REVIEW_OFFER_ID = 'sovereigndocs-legal-review-lane';
const SD_LEGAL_REVIEW_CHECKOUT_BASE = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=sovereigndocs-legal-review-lane';
function legalReviewCheckoutUrl({ submissionId, paymentId, planId, partnerId }){
  const url = new URL(SD_LEGAL_REVIEW_CHECKOUT_BASE);
  if(submissionId) url.searchParams.set('review', submissionId);
  if(paymentId) url.searchParams.set('payment', paymentId);
  if(planId) url.searchParams.set('plan', planId);
  if(partnerId) url.searchParams.set('partner', partnerId);
  url.searchParams.set('source', 'sovereigndocs');
  return url.href;
}
async function legalReviewPlanById(id){
  const plans = await loadDataFile('legal-review-service-plans.json', { plans: [] });
  return (plans.plans || []).find(plan => plan.id === id) || (plans.plans || [])[0] || { id:'legal_review_triage_deposit', name:'Legal Review Triage Deposit', amountCents:29900, platformFeePercent:30, partnerReservePercent:70 };
}
async function legalPartnerById(id){
  const network = await loadDataFile('legal-partner-network.json', { partners: [] });
  return (network.partners || []).find(partner => partner.id === id || partner.slug === id) || null;
}
function createLegalReviewPayment({ entry, plan, partner }){
  const now = new Date().toISOString();
  const paymentId = crypto.randomUUID();
  return {
    id:paymentId,
    submissionId:entry.id,
    status:plan.amountCents === null ? 'quote_required' : 'checkout_required',
    provider:'SkyePay',
    offerId:SD_LEGAL_REVIEW_OFFER_ID,
    checkoutUrl:legalReviewCheckoutUrl({ submissionId:entry.id, paymentId, planId:plan.id, partnerId:partner?.id || entry.requestedPartnerId || '' }),
    amountCents:plan.amountCents ?? null,
    currency:'usd',
    customerPays:'upfront_before_partner_routing',
    platformFeePercent:Number(plan.platformFeePercent || 30),
    partnerReservePercent:Number(plan.partnerReservePercent || 70),
    partnerPayoutTiming:'after_partner_return_and_customer_delivery_owner_release',
    liveTransferBoundary:'Internal ledger only until payout provider and partner terms are configured.',
    createdAt:now,
    updatedAt:now
  };
}
function createLegalReviewVaultRecord({ entry, payment, partner }){
  const now = new Date().toISOString();
  return {
    id:crypto.randomUUID(),
    submissionId:entry.id,
    paymentId:payment.id,
    title:entry.templateTitle || 'SovereignDocs Legal Review',
    status:'stored_for_legal_review_checkout',
    requestedPartnerId:partner?.id || entry.requestedPartnerId || null,
    packetMarkdown:entry.packetMarkdown,
    customerVisibleStatus:'Payment required before partner routing.',
    createdAt:now,
    updatedAt:now
  };
}
function createLegalReviewPayout({ entry, payment, body = {} }){
  const now = new Date().toISOString();
  const paid = ['paid_held_in_escrow','paid','succeeded'].includes(String(payment?.status || '').toLowerCase());
  const amountCents = Number(payment?.amountCents || body.amountCents || 0);
  const reserve = Number(payment?.partnerReservePercent || 70);
  const partnerAmount = Number(body.partnerPayoutCents || (amountCents ? Math.round(amountCents * reserve / 100) : 0));
  return {
    id:crypto.randomUUID(),
    submissionId:entry.id,
    paymentId:payment?.id || null,
    partnerId:entry.partnerId || entry.requestedPartnerId || body.partnerId || null,
    status:paid ? 'payout_pending_owner_release' : 'payout_blocked_until_customer_payment_confirmed',
    amountCents:partnerAmount,
    platformRemainderCents:amountCents ? Math.max(amountCents - partnerAmount, 0) : null,
    releaseTrigger:'partner_return_logged_and_customer_delivery_ready',
    liveTransferBoundary:'Internal ledger only. External transfer requires configured payout provider and approved partner terms.',
    createdAt:now,
    updatedAt:now
  };
}
function filterOrdersForSession(rows, session){
  const roles = session?.user?.roles || [];
  if(roles.some(role => ['owner','admin','operator','reviewer','legal_partner','partner_manager'].includes(role))) return rows;
  return rows.filter(row => canAccessOrder(session, row));
}

async function updateCaseById({ caseId, status, actor = 'system', note = '', payload = {}, mutate = row => row }){
  if(!caseId) return null;
  const rows = await loadCaseRecords();
  const index = rows.findIndex(row => row.id === caseId);
  if(index === -1) return null;
  let next = mutate(rows[index]);
  if(status && next.status !== status){
    try{ next = transitionCase(next, { status, actor, note, payload }); }
    catch(error){ next = { ...next, updatedAt:new Date().toISOString(), events:[...(next.events || []), { id:crypto.randomUUID(), status:`case_transition_blocked_${status}`, at:new Date().toISOString(), actor, note:String(error.message || error), payload }] }; }
  }
  rows[index] = next;
  await writeJSON(CASE_RECORDS_FILE, rows.slice(0,50000));
  return next;
}

async function startEndToEndCase({ req, body }){
  assertObject(body);
  const session = sessionFromRequest(req);
  const templateIds = [...new Set([...(Array.isArray(body.templateIds) ? body.templateIds : []), body.templateId].filter(Boolean).map(String))];
  if(!templateIds.length){ const error = new Error('templateId or templateIds is required to start a case workflow.'); error.status = 400; throw error; }
  if(!body.acceptBoundary){ const error = new Error('End-to-end case workflows require the self-help / not-legal-advice boundary acknowledgment.'); error.status = 403; error.missing = ['acceptBoundary']; throw error; }

  const caseId = newCaseId();
  const decisions = await loadReviewDecisions();
  const docs = await loadDocumentRecords();
  const packetRows = await loadPacketRecords();
  const renderedDocuments = [];
  const documentIds = [];
  const riskSummary = {};

  for(const templateId of templateIds){
    const bundle = await loadTemplateBundle(templateId);
    const answers = { ...(body.answers || {}), ...((body.answersByTemplate || {})[templateId] || {}) };
    const builtAnswers = buildAnswers(bundle, { ...body, answers });
    const gate = decideTemplateGate({ bundle, body:{ ...body, answers, exportMode: bundle.meta.riskLevel === 'high' ? 'prep_worksheet' : body.exportMode, prepWorksheetOnly: bundle.meta.riskLevel === 'high' || body.prepWorksheetOnly }, decisions });
    if(!gate.assemblyAllowed){ const error = new Error(`Template ${templateId} is not allowed for assembly: ${gate.message}`); error.status = 403; error.gate = gate; throw error; }
    riskSummary[bundle.meta.riskLevel || 'unknown'] = (riskSummary[bundle.meta.riskLevel || 'unknown'] || 0) + 1;
    const markdown = gate.exportClass === 'prep_worksheet' ? buildPrepWorksheet({ bundle, answers:builtAnswers, gate }) : withSignature(assembleDocument(bundle.document, builtAnswers), body.signature || '');
    const record = createDocumentRecord({ bundle, answers:builtAnswers, gate, session, source:'case_workflow', status:'ready_for_export' });
    docs.unshift(record);
    documentIds.push(record.id);
    renderedDocuments.push({ templateId, title:bundle.meta.title, markdown, gate, bundle, answers:builtAnswers, documentId:record.id });
  }
  await writeJSON(DOCUMENT_RECORDS_FILE, docs.slice(0,50000));

  let packet = null;
  let packetMarkdown = renderedDocuments[0]?.markdown || '';
  if(renderedDocuments.length > 1 || body.createPacket === true){
    packet = buildPacketManifest({ packetId:body.packetId || caseId, title:body.title || 'SovereignDocs End-to-End Packet', templateIds, answersByTemplate:body.answersByTemplate || {}, session, boundary:{ acceptBoundary:true, caseWorkflow:true } });
    packet.status = 'packet_assembled_for_case';
    packet.caseId = caseId;
    packet.documentIds = documentIds;
    packetRows.unshift(packet);
    await writeJSON(PACKET_RECORDS_FILE, packetRows.slice(0,50000));
    packetMarkdown = renderPacketMarkdown({ packet, renderedDocuments });
  }

  const primary = renderedDocuments[0];
  const handoff = createSkyeDocxMaxHandoff({
    templateId:primary?.templateId || null,
    documentId:documentIds[0] || null,
    packetId:packet?.id || null,
    title:body.title || packet?.title || primary?.title || 'SovereignDocs Case Document',
    markdown:packetMarkdown,
    html:markdownToHtml(packetMarkdown),
    answers:body.answers || {},
    metadata:{ caseId, caseType:body.caseType || 'end_to_end_document_workflow', riskSummary, renderedDocumentCount:renderedDocuments.length, source:'case-workflow-v17' },
    session
  });
  await writeEditorHandoffPayload(handoff);
  const handoffRows = await loadEditorHandoffs();
  handoffRows.unshift(summarizeSkyeDocxHandoff(handoff));
  await writeJSON(EDITOR_HANDOFF_LOG_FILE, handoffRows.slice(0,20000));

  const reviewSubmissionIds = [];
  if(body.submitForPartnerReview){
    const ack = requirePartnerReviewAcknowledgments(body);
    if(!ack.ok){ const error = new Error('Partner review submission requires all boundary acknowledgments.'); error.status = 403; error.missing = ack.missing; throw error; }
    const reviewRows = await loadLegalReviewSubmissions();
    const entry = createLegalReviewSubmission({ bundle:primary.bundle, answers:primary.answers, gate:primary.gate, assembledMarkdown:primary.markdown, body:{ ...body, reviewScope:body.reviewScope || 'case_workflow_partner_review' }, session });
    entry.caseId = caseId;
    entry.documentIds = documentIds;
    entry.packetId = packet?.id || null;
    reviewRows.unshift(entry);
    await writeJSON(LEGAL_REVIEW_SUBMISSIONS_FILE, reviewRows.slice(0,20000));
    reviewSubmissionIds.push(entry.id);
  }

  const caseRecord = createCaseRecord({
    id:caseId,
    title:body.title || packet?.title || primary?.title || 'SovereignDocs Case',
    caseType:body.caseType || 'end_to_end_document_workflow',
    status:reviewSubmissionIds.length ? 'submitted_for_partner_review' : 'editor_handoff_created',
    templateIds,
    documentIds,
    packetId:packet?.id || null,
    handoffId:handoff.id,
    reviewSubmissionIds,
    riskSummary,
    source:'api_case_start',
    session,
    metadata:{ launchUrl:handoff.launchUrl, skyeDocxMax:true, renderedDocumentCount:renderedDocuments.length },
    boundaries:{ acceptBoundary:true, partnerReviewRequested:!!body.submitForPartnerReview }
  });
  const caseRows = await loadCaseRecords();
  caseRows.unshift(caseRecord);
  await writeJSON(CASE_RECORDS_FILE, caseRows.slice(0,50000));
  const auditEvent = await audit('case_workflow_started', { caseId, templateIds, documentIds, packetId:packet?.id || null, handoffId:handoff.id, reviewSubmissionIds, riskSummary }, req);
  return { ok:true, case:summarizeCase(caseRecord), caseRecord, documents:renderedDocuments.map(d => ({ templateId:d.templateId, documentId:d.documentId, title:d.title, gate:d.gate })), packet:packet ? { id:packet.id, title:packet.title, templateCount:packet.templateIds.length } : null, handoff:summarizeSkyeDocxHandoff(handoff), launchUrl:handoff.launchUrl, reviewSubmissionIds, auditId:auditEvent.id, boundary:'End-to-end workflow record only. SovereignDocs is not a law firm and does not guarantee partner review, official filing, compliance, enforceability, or outcome.' };
}

function rolesForSession(session){ return session?.user?.roles || []; }
function isPrivilegedSession(session, extra = []){ return rolesForSession(session).some(role => ['owner','admin','operator','reviewer','partner_manager',...extra].includes(role)); }
function ownableVisible(rows, session){
  if(isPrivilegedSession(session)) return rows;
  const userId = session?.user?.id;
  if(!userId) return [];
  return rows.filter(row => row?.owner?.id === userId || row?.session?.user?.id === userId || row?.requestedBy?.id === userId);
}
async function buildWorkspaceSummary(session){
  const [documents, packets, reminders, orders, reviews, envelopes, vault, patches, overrides, cases, entitlements, intakes, notes, artifacts] = await Promise.all([
    loadDocumentRecords(), loadPacketRecords(), loadReminders(), loadCustomerOrders(), loadLegalReviewSubmissions(), readJSON(ESIGN_ENVELOPE_LOG_FILE, []), readJSON(VAULT_FILE, []), loadTemplatePatchRequests(), loadTemplateOverrides(), loadCaseRecords(), Promise.resolve(entitlementSnapshot(session)), loadCaseIntakes(), loadCaseNotes(), loadCaseArtifacts()
  ]);
  const visibleDocs = ownableVisible(documents, session);
  const visiblePackets = ownableVisible(packets, session);
  const visibleReminders = ownableVisible(reminders, session);
  const visibleOrders = filterOrdersForSession(orders, session);
  const visibleReviews = isPrivilegedSession(session, ['legal_partner']) ? reviews : reviews.filter(row => canAccessSubmission(session, row));
  const visibleEnvelopes = isPrivilegedSession(session) ? envelopes : envelopes.filter(row => row?.session?.user?.id === session?.user?.id);
  const visibleCases = (cases || []).filter(row => canAccessCase(session, row));
  const visibleIntakes = (intakes || []).filter(row => canAccessOwned(session, row));
  const visibleNotes = (notes || []).filter(row => visibleCases.some(c => c.id === row.caseId));
  const visibleArtifacts = (artifacts || []).filter(row => visibleCases.some(c => c.id === row.caseId));
  return {
    ok:true,
    version:'20.0.0',
    tenantScope:tenantScopeFromSession(session),
    session:{ verified:!!session.verified, user:session.user || null, mode:session.mode || null },
    entitlements,
    counts:{ cases:visibleCases.length, intakes:visibleIntakes.length, caseNotes:visibleNotes.length, caseArtifacts:visibleArtifacts.length, documents:visibleDocs.length, packets:visiblePackets.length, reminders:visibleReminders.length, orders:visibleOrders.length, partnerReviews:visibleReviews.length, signaturePackets:visibleEnvelopes.length, vault:Array.isArray(vault)?vault.length:0, templatePatchRequests:patches.length, templateOverrides:(overrides.overrides || []).length },
    cases:visibleCases.slice(0,25).map(summarizeCase),
    intakes:visibleIntakes.slice(0,25).map(summarizeIntakeRecord),
    caseNotes:visibleNotes.slice(0,25).map(summarizeCaseNote),
    caseArtifacts:visibleArtifacts.slice(0,25).map(summarizeCaseArtifact),
    documents:visibleDocs.slice(0,25).map(summarizeDocument),
    packets:visiblePackets.slice(0,25).map(p => ({ id:p.id, title:p.title, status:p.status, templateCount:p.templateIds?.length || 0, updatedAt:p.updatedAt, createdAt:p.createdAt })),
    reminders:visibleReminders.slice(0,25).map(summarizeReminder),
    orders:visibleOrders.slice(0,25).map(summarizeOrder),
    partnerReviews:visibleReviews.slice(0,25).map(summarizeSubmission),
    signaturePackets:visibleEnvelopes.slice(0,25).map(e => ({ id:e.id, title:e.title, status:e.status, signerCount:e.signers?.length || 0, createdAt:e.createdAt })),
    nextActions:buildNextActions({ cases:visibleCases, documents:visibleDocs, packets:visiblePackets, reminders:visibleReminders, orders:visibleOrders, reviews:visibleReviews, entitlements })
  };
}
function buildNextActions({ cases = [], documents, packets, reminders, orders, reviews, entitlements }){
  const actions = [];
  if(!cases.length) actions.push({ label:'Start end-to-end workflow', href:'/case-command-center/', reason:'No active SovereignDocs case records yet.' });
  if(!documents.length) actions.push({ label:'Start a document', href:'/documents/', reason:'No document lifecycle records yet.' });
  if(!packets.length && entitlements?.limits?.packetAssembly) actions.push({ label:'Assemble a packet', href:'/packet-builder/', reason:'Bundle multiple records into a governed packet.' });
  if(!reminders.length) actions.push({ label:'Create a reminder', href:'/reminders/', reason:'Track compliance and manual deadlines.' });
  if(reviews.some(r => ['submitted','triage_needed','routed_to_partner'].includes(r.status))) actions.push({ label:'Open partner workbench', href:'/partner-workbench/', reason:'Partner review items need routing or updates.' });
  if(orders.some(o => ['draft_packet_created','partner_review_requested','awaiting_user_information'].includes(o.status))) actions.push({ label:'Check order workflow', href:'/order-status/', reason:'Commercial workflow records need follow-through.' });
  actions.push({ label:'SkyeDocx Max handoff', href:'/skye-docx-max/', reason:'Use SkyeDocx Max for serious document editing.' });
  return actions.slice(0,8);
}

async function collectCaseContext(caseId){
  const [cases, documents, packets, reviews, handoffs, returns, notes, reminders, orders, artifacts] = await Promise.all([
    loadCaseRecords(), loadDocumentRecords(), loadPacketRecords(), loadLegalReviewSubmissions(), loadEditorHandoffs(), loadEditorReturns(), loadCaseNotes(), loadReminders(), loadCustomerOrders(), loadCaseArtifacts()
  ]);
  const caseRecord = cases.find(row => row.id === caseId);
  const packet = packets.find(row => row.id === caseRecord?.packetId) || null;
  return { cases, caseRecord, documents, packets, packet, reviews, handoffs, returns, notes, reminders, orders, artifacts };
}

function visibleCaseOrSend(res, session, ctx){
  if(!ctx.caseRecord) return sendJSON(res, 404, { ok:false, error:'case not found' });
  if(!canAccessCase(session, ctx.caseRecord)) return sendJSON(res, 403, { ok:false, error:'You do not have access to this case.' });
  return null;
}

function applyPatchToRecordView(record, overrides = []){
  const active = overrides.filter(o => o.active !== false && String(o.templateId) === String(record.id));
  if(!active.length) return record;
  return active.reduce((acc, o) => ({ ...acc, ...(o.patch || {}), override_count:(acc.override_count || 0)+1 }), { ...record });
}


function isSensitiveRead(pathname){
  return ['/api/orders','/api/legal-review/submissions','/api/vault','/api/audit','/api/audit/ledger','/api/review/decisions'].some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}
function shouldRequireVerifiedSession(method, pathname){
  if(!isProduction() && process.env.SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH !== '1') return false;
  if(method !== 'GET') return true;
  return isSensitiveRead(pathname);
}
function enforceBrowserWriteBoundary(req, res){
  if(req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return null;
  if(!allowedOrigin(req)) return sendJSON(res, 403, { ok:false, error:'Origin is not allowed for browser write requests.' });
  return null;
}

async function handleAPI(req, res, url){
  const method = req.method || 'GET';
  const session = sessionFromRequest(req);
  const originBlocked = enforceBrowserWriteBoundary(req, res);
  if(originBlocked) return originBlocked;
  if(shouldRequireVerifiedSession(method, url.pathname) && !session.verified) return sendJSON(res, 401, { ok:false, error:'Verified upstream session required.', mode:session.mode });

  if(method === 'GET' && url.pathname === '/api/health'){
    const [manifest,categories,jurisdictions,auditStatus] = await Promise.all([loadManifest(), loadCategories(), loadJurisdictions(), verifyAuditLedger(AUDIT_LEDGER_FILE)]);
    return sendJSON(res, 200, { ...summarizeManifest(manifest,categories,jurisdictions), auditStatus, productionConfig:validateProductionConfig(), version:'20.0.0', codeCore:{ entitlements:true, documentLifecycle:true, packetAssembly:true, reminders:true, templatePatchQueue:true, caseWorkflowOrchestration:true, skyeDocxMaxRuntime:true, caseIntake:true, caseTimeline:true, partnerPacketExport:true, clientStatus:true, workQueues:true } });
  }
  if(method === 'GET' && url.pathname === '/api/session') return sendJSON(res, 200, session);
  if(method === 'POST' && url.pathname === '/api/dev/create-session-token'){
    if(isProduction() || process.env.SOVEREIGNDOCS_ENABLE_DEV_TOKEN !== '1') return sendJSON(res, 404, { ok:false, error:'Dev session token minting is disabled. Set SOVEREIGNDOCS_ENABLE_DEV_TOKEN=1 in non-production only.' });
    const body = await readBody(req);
    const secret = process.env.SOVEREIGNDOCS_UPSTREAM_SECRET || process.env.OMEGA_SKYGATE_SHARED_SECRET || process.env.SOVEREIGNDOCS_DEV_SESSION_SECRET;
    const token = createSignedSessionToken(body || { user:{ id:'demo-admin', roles:['admin','reviewer','operator'] }, exp:Math.floor(Date.now()/1000)+3600 }, secret);
    return sendJSON(res, 200, { ok:true, token, header:'x-sovereigndocs-session' });
  }
  if(method === 'GET' && url.pathname === '/api/production/config-check') return sendJSON(res, 200, validateProductionConfig());

  const premiumRoute = await handlePremiumRoute({ req, res, url, method, session, sendJSON:(status, body, headers={}) => { sendJSON(res, status, body, headers); return { handled:true }; }, readBody:()=>readBody(req), loadManifest, loadTemplateBundle, loadCaseRecords, loadDocumentRecords, loadPacketRecords, loadEditorHandoffs, loadEditorReturns, loadEditorHandoffPayload, loadCaseNotes, loadCaseArtifacts, loadLegalReviewSubmissions, loadCustomerOrders, loadReminders, loadCaseIntakes, loadTemplatePatchRequests, loadDataFile, writeJSON, EDITOR_HANDOFF_LOG_FILE, EDITOR_RETURN_LOG_FILE, DOCUMENT_RECORDS_FILE, CASE_RECORDS_FILE, CASE_NOTES_FILE, CASE_ARTIFACTS_FILE, createSkyeDocxMaxHandoff, createSkyeDocxReturnPackage, writeEditorHandoffPayload, summarizeSkyeDocxHandoff, audit, markdownToHtml, verifyAuditLedger, AUDIT_LEDGER_FILE });
  if(premiumRoute?.handled) return;
  if(method === 'GET' && url.pathname === '/api/routes/manifest') return sendJSON(res, 200, routeManifest());

  if(method === 'GET' && url.pathname === '/api/workspace/summary') return sendJSON(res, 200, await buildWorkspaceSummary(session));
  if(method === 'GET' && url.pathname === '/api/intake/blueprints') return sendJSON(res, 200, await loadDataFile('intake-blueprints.json', { ok:true, blueprints:[] }));
  if(method === 'GET' && url.pathname === '/api/case-intakes'){
    const rows = (await loadCaseIntakes()).filter(row => canAccessOwned(session, row));
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.map(summarizeIntakeRecord) });
  }
  if(method === 'POST' && url.pathname === '/api/intake/start'){
    const body = await readBody(req);
    assertObject(body);
    if(!body.acceptBoundary) return sendJSON(res, 403, { ok:false, error:'Intake requires the self-help / not-legal-advice boundary acknowledgment.', missing:['acceptBoundary'] });
    const manifest = await loadManifest();
    const records = manifest.records || [];
    const text = `${body.category || ''} ${body.intakeType || ''} ${body.title || ''} ${JSON.stringify(body.facts || body.answers || {})}`.toLowerCase();
    const recommendedTemplates = records.filter(row => {
      if(body.jurisdiction && row.jurisdiction_id && String(row.jurisdiction_id).toLowerCase() !== String(body.jurisdiction).toLowerCase()) return false;
      const hay = `${row.title} ${row.category_name} ${row.category_slug} ${row.id}`.toLowerCase();
      return !text.trim() || text.split(/\W+/).filter(Boolean).some(term => term.length > 3 && hay.includes(term));
    }).slice(0, 12);
    const entry = createIntakeRecord({ body, session, recommendedTemplates });
    const rows = await loadCaseIntakes();
    rows.unshift(entry);
    await writeJSON(CASE_INTAKES_FILE, rows.slice(0,50000));
    const auditEvent = await audit('case_intake_started', { intakeId:entry.id, recommendedTemplateCount:entry.recommendedTemplateIds.length, riskFlags:entry.riskFlags }, req);
    return sendJSON(res, 201, { ok:true, intake:summarizeIntakeRecord(entry), recommendedTemplates:recommendedTemplates.map(row => ({ id:row.id, title:row.title, category:row.category_name, jurisdiction:row.jurisdiction_id, riskLevel:row.risk_level })), auditId:auditEvent.id });
  }
  const intakeConvertMatch = url.pathname.match(/^\/api\/case-intakes\/([^/]+)\/convert-to-case$/);
  if(method === 'POST' && intakeConvertMatch){
    const body = await readBody(req);
    const id = decodeURIComponent(intakeConvertMatch[1]);
    const rows = await loadCaseIntakes();
    const index = rows.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'intake not found' });
    if(!canAccessOwned(session, rows[index])) return sendJSON(res, 403, { ok:false, error:'You do not have access to this intake.' });
    const templateIds = body.templateIds?.length ? body.templateIds : rows[index].selectedTemplateIds?.length ? rows[index].selectedTemplateIds : rows[index].recommendedTemplateIds?.slice(0,2);
    const result = await startEndToEndCase({ req, body:{ ...body, title:body.title || rows[index].title, caseType:body.caseType || rows[index].intakeType, templateIds, answers:{ ...(rows[index].facts || {}), ...(body.answers || {}) }, acceptBoundary:true, createPacket:templateIds.length > 1 } });
    rows[index] = { ...rows[index], status:'converted_to_case', convertedCaseId:result.case.id, updatedAt:new Date().toISOString(), events:[...(rows[index].events || []), { id:crypto.randomUUID(), status:'converted_to_case', at:new Date().toISOString(), actor:session.user?.id || 'anonymous', note:'intake converted to end-to-end case', payload:{ caseId:result.case.id } }] };
    await writeJSON(CASE_INTAKES_FILE, rows.slice(0,50000));
    await audit('case_intake_converted', { intakeId:id, caseId:result.case.id }, req);
    return sendJSON(res, 201, { ok:true, intake:summarizeIntakeRecord(rows[index]), case:result.case, launchUrl:result.launchUrl, result });
  }
  if(method === 'GET' && url.pathname === '/api/work-queues'){
    const role = requireRole(session, ['operator','reviewer','admin','legal_partner','partner_manager']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const [cases, reviews, reminders, patches, orders, intakes] = await Promise.all([loadCaseRecords(), loadLegalReviewSubmissions(), loadReminders(), loadTemplatePatchRequests(), loadCustomerOrders(), loadCaseIntakes()]);
    return sendJSON(res, 200, buildWorkQueues({ cases, reviews, reminders, patches, orders, intakes }));
  }
  if(method === 'GET' && url.pathname === '/api/case-statuses') return sendJSON(res, 200, { ok:true, statuses:CASE_STATUSES });
  if(method === 'GET' && url.pathname === '/api/cases'){
    const rows = (await loadCaseRecords()).filter(row => canAccessCase(session, row));
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.map(summarizeCase) });
  }
  const caseReadMatch = url.pathname.match(/^\/api\/cases\/([^/]+)$/);
  if(method === 'GET' && caseReadMatch){
    const row = (await loadCaseRecords()).find(item => item.id === decodeURIComponent(caseReadMatch[1]));
    if(!row) return sendJSON(res, 404, { ok:false, error:'case not found' });
    if(!canAccessCase(session, row)) return sendJSON(res, 403, { ok:false, error:'You do not have access to this case.' });
    return sendJSON(res, 200, row);
  }
  if(method === 'POST' && url.pathname === '/api/cases/start'){
    try{ return sendJSON(res, 201, await startEndToEndCase({ req, body: await readBody(req) })); }
    catch(error){ return sendJSON(res, error.status || 500, { ok:false, error:error.message || 'case start failed', missing:error.missing || undefined, gate:error.gate || undefined }); }
  }
  const caseAdvanceMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/advance$/);
  if(method === 'POST' && caseAdvanceMatch){
    const body = await readBody(req);
    assertObject(body);
    requireFields(body, ['status']);
    const rows = await loadCaseRecords();
    const id = decodeURIComponent(caseAdvanceMatch[1]);
    const index = rows.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'case not found' });
    if(!canAccessCase(session, rows[index])) return sendJSON(res, 403, { ok:false, error:'You do not have access to this case.' });
    const next = transitionCase(rows[index], { status:String(body.status), actor:session.user?.id || 'anonymous', note:trimString(body.note, 1000), payload:body.payload || {} });
    rows[index] = next;
    await writeJSON(CASE_RECORDS_FILE, rows.slice(0,50000));
    const auditEvent = await audit('case_workflow_advanced', { caseId:id, status:next.status }, req);
    return sendJSON(res, 200, { ok:true, case:summarizeCase(next), auditId:auditEvent.id });
  }
  const caseTimelineMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/timeline$/);
  if(method === 'GET' && caseTimelineMatch){
    const ctx = await collectCaseContext(decodeURIComponent(caseTimelineMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    return sendJSON(res, 200, buildCaseTimeline(ctx));
  }
  const caseClientStatusMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/client-status$/);
  if(method === 'GET' && caseClientStatusMatch){
    const ctx = await collectCaseContext(decodeURIComponent(caseClientStatusMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    return sendJSON(res, 200, buildClientStatus({ caseRecord:ctx.caseRecord, timeline:buildCaseTimeline(ctx) }));
  }
  const caseNotesMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/notes$/);
  if(method === 'GET' && caseNotesMatch){
    const ctx = await collectCaseContext(decodeURIComponent(caseNotesMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    const notes = (await loadCaseNotes()).filter(row => row.caseId === ctx.caseRecord.id).filter(row => row.visibility !== 'internal' || isPrivilegedSession(session, ['legal_partner']));
    return sendJSON(res, 200, { ok:true, count:notes.length, items:notes.map(summarizeCaseNote) });
  }
  if(method === 'POST' && caseNotesMatch){
    const ctx = await collectCaseContext(decodeURIComponent(caseNotesMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    const body = await readBody(req);
    assertObject(body);
    const note = createCaseNote({ caseId:ctx.caseRecord.id, body, session });
    const notes = await loadCaseNotes();
    notes.unshift(note);
    await writeJSON(CASE_NOTES_FILE, notes.slice(0,50000));
    await updateCaseById({ caseId:ctx.caseRecord.id, actor:session.user?.id || 'anonymous', note:`Case note added: ${note.noteType}`, payload:{ noteId:note.id }, mutate:row => ({ ...row, noteIds:[note.id, ...(row.noteIds || [])] }) });
    const auditEvent = await audit('case_note_added', { caseId:ctx.caseRecord.id, noteId:note.id, visibility:note.visibility }, req);
    return sendJSON(res, 201, { ok:true, note:summarizeCaseNote(note), auditId:auditEvent.id });
  }
  const caseArtifactsMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/artifacts$/);
  if(method === 'GET' && caseArtifactsMatch){
    const ctx = await collectCaseContext(decodeURIComponent(caseArtifactsMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    const rows = (await loadCaseArtifacts()).filter(row => row.caseId === ctx.caseRecord.id);
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.map(summarizeCaseArtifact) });
  }
  if(method === 'POST' && caseArtifactsMatch){
    const ctx = await collectCaseContext(decodeURIComponent(caseArtifactsMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    const artifact = createCaseArtifact({ caseId:ctx.caseRecord.id, body:await readBody(req), session });
    const rows = await loadCaseArtifacts();
    rows.unshift(artifact);
    await writeJSON(CASE_ARTIFACTS_FILE, rows.slice(0,50000));
    await updateCaseById({ caseId:ctx.caseRecord.id, actor:session.user?.id || 'anonymous', note:`Artifact attached: ${artifact.title}`, payload:{ artifactId:artifact.id }, mutate:row => ({ ...row, artifactIds:[artifact.id, ...(row.artifactIds || [])] }) });
    const auditEvent = await audit('case_artifact_attached', { caseId:ctx.caseRecord.id, artifactId:artifact.id, artifactType:artifact.artifactType }, req);
    return sendJSON(res, 201, { ok:true, artifact:summarizeCaseArtifact(artifact), auditId:auditEvent.id });
  }
  const casePartnerPacketMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/partner-packet$/);
  if(method === 'GET' && casePartnerPacketMatch){
    const ctx = await collectCaseContext(decodeURIComponent(casePartnerPacketMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    const packet = buildPartnerPacket(ctx);
    if(url.searchParams.get('format') === 'md') return send(res, 200, packet.markdown, { 'content-type':'text/markdown; charset=utf-8', 'content-disposition':`attachment; filename="${ctx.caseRecord.id}-partner-packet.md"` });
    return sendJSON(res, 200, packet);
  }
  const caseExportBundleMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/export-bundle$/);
  if(method === 'GET' && caseExportBundleMatch){
    const ctx = await collectCaseContext(decodeURIComponent(caseExportBundleMatch[1]));
    const denied = visibleCaseOrSend(res, session, ctx); if(denied) return denied;
    const timeline = buildCaseTimeline(ctx);
    const bundle = buildCaseExportBundle({ ...ctx, timeline });
    await audit('case_export_bundle_created', { caseId:ctx.caseRecord.id, documentCount:bundle.documents.length, noteCount:bundle.notes.length }, req);
    return sendJSON(res, 200, bundle, { 'content-disposition':`attachment; filename="${ctx.caseRecord.id}-sovereigndocs-case-bundle.json"` });
  }
  if(method === 'GET' && url.pathname === '/api/editor/skye-docx-max/config') return sendJSON(res, 200, skyeDocxMaxConfig());
  if(method === 'GET' && url.pathname === '/api/editor/skye-docx-max/handoffs'){
    const rows = await loadEditorHandoffs();
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.slice(0,250) });
  }
  const skyeHandoffMatch = url.pathname.match(/^\/api\/editor\/skye-docx-max\/session\/([^/]+)$/);
  if(method === 'GET' && skyeHandoffMatch){
    const handoff = await loadEditorHandoffPayload(decodeURIComponent(skyeHandoffMatch[1]));
    if(!handoff) return sendJSON(res, 404, { ok:false, error:'SkyeDocxMax handoff session not found.' });
    return sendJSON(res, 200, { ok:true, handoff });
  }
  const skyeHandoffOpenedMatch = url.pathname.match(/^\/api\/editor\/skye-docx-max\/session\/([^/]+)\/opened$/);
  if(method === 'POST' && skyeHandoffOpenedMatch){
    const handoff = await loadEditorHandoffPayload(decodeURIComponent(skyeHandoffOpenedMatch[1]));
    if(!handoff) return sendJSON(res, 404, { ok:false, error:'SkyeDocxMax handoff session not found.' });
    const caseId = handoff.metadata?.caseId || null;
    const updatedCase = await updateCaseById({ caseId, status:'opened_in_skye_docx_max', actor:session.user?.id || 'skye-docx-max', note:'SkyeDocxMax handoff opened.', payload:{ handoffId:handoff.id } });
    const auditEvent = await audit('skye_docx_max_handoff_opened', { handoffId:handoff.id, templateId:handoff.templateId, documentId:handoff.documentId, caseId }, req);
    return sendJSON(res, 200, { ok:true, handoff:summarizeSkyeDocxHandoff(handoff), case:updatedCase ? summarizeCase(updatedCase) : null, auditId:auditEvent.id });
  }
  if(method === 'POST' && url.pathname === '/api/editor/skye-docx-max/session'){
    const body = await readBody(req);
    assertObject(body);
    let title = body.title || 'SovereignDocs Document';
    let markdown = body.markdown || body.content || '';
    let html = body.html || '';
    let metadata = body.metadata || {};
    const answers = body.answers || {};
    if(body.templateId){
      const bundle = await loadTemplateBundle(body.templateId);
      const decisions = await loadReviewDecisions();
      const gate = decideTemplateGate({ bundle, body:{ ...body, exportMode: bundle.meta.riskLevel === 'high' ? 'prep_worksheet' : body.exportMode, prepWorksheetOnly: bundle.meta.riskLevel === 'high' || body.prepWorksheetOnly }, decisions });
      const builtAnswers = buildAnswers(bundle, body);
      title = bundle.meta.title;
      markdown = gate.exportClass === 'prep_worksheet' ? buildPrepWorksheet({ bundle, answers:builtAnswers, gate }) : withSignature(assembleDocument(bundle.document, builtAnswers), body.signature || '');
      html = markdownToHtml(markdown);
      metadata = { ...metadata, templateId:bundle.meta.id, riskLevel:bundle.meta.riskLevel, exportClass:gate.exportClass, sourcePath:bundle.meta.sourcePath, appliedOverrides:bundle.meta.appliedOverrides || [] };
    }
    const handoff = createSkyeDocxMaxHandoff({ templateId:body.templateId || null, documentId:body.documentId || null, packetId:body.packetId || null, title, markdown, html, answers, metadata, session });
    await writeEditorHandoffPayload(handoff);
    const rows = await loadEditorHandoffs();
    rows.unshift(summarizeSkyeDocxHandoff(handoff));
    await writeJSON(EDITOR_HANDOFF_LOG_FILE, rows.slice(0,20000));
    const auditEvent = await audit('skye_docx_max_handoff_created', { handoffId:handoff.id, templateId:handoff.templateId, documentId:handoff.documentId, launchUrl:handoff.launchUrl }, req);
    return sendJSON(res, 201, { ok:true, handoff:summarizeSkyeDocxHandoff(handoff), launchUrl:handoff.launchUrl, auditId:auditEvent.id });
  }
  if(method === 'POST' && url.pathname === '/api/editor/skye-docx-max/return'){
    const body = await readBody(req);
    assertObject(body);
    requireFields(body, ['handoffId']);
    const handoff = await loadEditorHandoffPayload(body.handoffId);
    if(!handoff) return sendJSON(res, 404, { ok:false, error:'SkyeDocxMax handoff session not found for return package.' });
    const returned = createSkyeDocxReturnPackage({ handoff, body, session });
    const rows = await loadEditorReturns();
    rows.unshift(returned);
    await writeJSON(EDITOR_RETURN_LOG_FILE, rows.slice(0,20000));
    const docs = await loadDocumentRecords();
    const docRecord = {
      id:`sdx_return_doc_${crypto.randomUUID()}`,
      templateId:returned.templateId,
      source:'skye_docx_max_return',
      status:'returned_from_skye_docx_max',
      title:returned.title,
      owner:returned.owner,
      exportClass:returned.metadata?.exportClass || 'editor_return',
      riskLevel:returned.metadata?.riskLevel || 'unknown',
      createdAt:returned.createdAt,
      updatedAt:returned.createdAt,
      handoffId:returned.handoffId,
      returnId:returned.id,
      lifecycle:[{ status:'returned_from_skye_docx_max', at:returned.createdAt, actor:session.user?.id || 'skye-docx-max', note:'Returned from SkyeDocxMax editor runtime.' }]
    };
    docs.unshift(docRecord);
    await writeJSON(DOCUMENT_RECORDS_FILE, docs.slice(0,50000));
    const caseId = handoff.metadata?.caseId || null;
    const updatedCase = await updateCaseById({
      caseId,
      status:'returned_from_skye_docx_max',
      actor:session.user?.id || 'skye-docx-max',
      note:'Edited package returned from SkyeDocxMax.',
      payload:{ handoffId:returned.handoffId, returnId:returned.id, documentId:docRecord.id },
      mutate:row => ({ ...row, returnIds:[...new Set([...(row.returnIds || []), returned.id])], documentIds:[...new Set([...(row.documentIds || []), docRecord.id])] })
    });
    const auditEvent = await audit('skye_docx_max_return_received', { handoffId:returned.handoffId, returnId:returned.id, documentId:docRecord.id, templateId:returned.templateId, caseId }, req);
    return sendJSON(res, 201, { ok:true, returned:{ id:returned.id, handoffId:returned.handoffId, title:returned.title, createdAt:returned.createdAt, templateId:returned.templateId, documentId:docRecord.id }, case:updatedCase ? summarizeCase(updatedCase) : null, auditId:auditEvent.id });
  }

  if(method === 'GET' && url.pathname === '/api/entitlements'){
    return sendJSON(res, 200, entitlementSnapshot(session, url.searchParams.get('plan') || undefined));
  }
  if(method === 'GET' && url.pathname === '/api/document-statuses'){
    return sendJSON(res, 200, { ok:true, statuses:DOCUMENT_STATUSES });
  }
  if(method === 'GET' && url.pathname === '/api/documents'){
    const rows = await loadDocumentRecords();
    const roles = session?.user?.roles || [];
    const visible = filterTenantRecords(session, rows);
    return sendJSON(res, 200, { ok:true, count:visible.length, items:visible.map(summarizeDocument) });
  }
  if(method === 'POST' && url.pathname === '/api/documents/create-record'){
    const entitlement = requireEntitlement(session, 'assemble');
    if(!entitlement.ok) return sendJSON(res, entitlement.status, entitlement);
    const body = await readBody(req);
    assertObject(body);
    requireFields(body, ['templateId']);
    const bundle = await loadTemplateBundle(body.templateId);
    const decisions = await loadReviewDecisions();
    const gate = decideTemplateGate({ bundle, body, decisions });
    const answers = buildAnswers(bundle, body);
    const record = createDocumentRecord({ bundle, answers, gate, session, source:body.source || 'api', status:body.status || 'draft_created' });
    const rows = await loadDocumentRecords();
    rows.unshift(record);
    await writeJSON(DOCUMENT_RECORDS_FILE, rows.slice(0,50000));
    const auditEvent = await audit('document_record_created', { documentId:record.id, templateId:record.templateId, status:record.status }, req);
    return sendJSON(res, 201, { ok:true, document:summarizeDocument(record), auditId:auditEvent.id });
  }
  const documentTransitionMatch = url.pathname.match(/^\/api\/documents\/([^/]+)\/transition$/);
  if(method === 'POST' && documentTransitionMatch){
    const body = await readBody(req);
    assertObject(body);
    requireFields(body, ['status']);
    const rows = await loadDocumentRecords();
    const id = decodeURIComponent(documentTransitionMatch[1]);
    const index = rows.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'document record not found' });
    const owner = rows[index].owner || {};
    const roles = session?.user?.roles || [];
    const allowed = roles.some(r => ['owner','admin','operator','reviewer'].includes(r)) || owner.id === session?.user?.id;
    if(!allowed) return sendJSON(res, 403, { ok:false, error:'You do not have access to this document record.' });
    const updated = transitionDocument(rows[index], { status:String(body.status), actor:session.user?.id || 'anonymous', note:trimString(body.note, 1000), payload:body.payload || {} });
    rows[index] = updated;
    await writeJSON(DOCUMENT_RECORDS_FILE, rows.slice(0,50000));
    const auditEvent = await audit('document_record_transitioned', { documentId:id, status:updated.status }, req);
    return sendJSON(res, 200, { ok:true, document:summarizeDocument(updated), auditId:auditEvent.id });
  }

  if(method === 'GET' && url.pathname === '/api/packets'){
    const rows = await loadPacketRecords();
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.map(p => ({ id:p.id, title:p.title, status:p.status, templateCount:p.templateIds?.length || 0, updatedAt:p.updatedAt })) });
  }
  const packetMatch = url.pathname.match(/^\/api\/packets\/([^/]+)$/);
  if(method === 'GET' && packetMatch){
    const rows = await loadPacketRecords();
    const row = rows.find(p => p.id === decodeURIComponent(packetMatch[1]));
    if(!row) return sendJSON(res, 404, { ok:false, error:'packet not found' });
    if(!ownableVisible([row], session).length) return sendJSON(res, 403, { ok:false, error:'You do not have access to this packet.' });
    return sendJSON(res, 200, row);
  }
  if(method === 'POST' && url.pathname === '/api/packets/assemble'){
    const entitlement = requireEntitlement(session, 'packetAssembly');
    if(!entitlement.ok) return sendJSON(res, entitlement.status, entitlement);
    const body = await readBody(req);
    assertObject(body);
    assertArray(body.templateIds || [], 'templateIds', 25);
    if(!(body.templateIds || []).length) return sendJSON(res, 400, { ok:false, error:'templateIds must include at least one template.' });
    if(body.acceptBoundary !== true) return sendJSON(res, 403, { ok:false, error:'Packet assembly requires self-help / not-legal-advice boundary acknowledgment.' });
    const packet = buildPacketManifest({ packetId:body.packetId || 'custom-packet', title:body.title || 'SovereignDocs Packet', templateIds:body.templateIds, answersByTemplate:body.answersByTemplate || {}, session, boundary:{ acceptBoundary:true, notLegalAdvice:true } });
    const renderedDocuments = [];
    for(const templateId of packet.templateIds){
      const bundle = await loadTemplateBundle(templateId);
      const answers = body.answersByTemplate?.[templateId] || body.answers || {};
      const decisions = await loadReviewDecisions();
      const gate = decideTemplateGate({ bundle, body:{ ...body, ...(answers || {}), exportMode:bundle.meta.riskLevel === 'high' ? 'prep_worksheet' : body.exportMode, prepWorksheetOnly:bundle.meta.riskLevel === 'high' || body.prepWorksheetOnly }, decisions });
      const content = gate.exportClass === 'prep_worksheet' ? buildPrepWorksheet({ bundle, answers, gate }) : assembleDocument(bundle.document, answers);
      renderedDocuments.push({ templateId, title:bundle.meta.title, riskLevel:bundle.meta.riskLevel, exportClass:gate.exportClass, markdown:content });
    }
    const markdown = renderPacketMarkdown({ packet, renderedDocuments });
    const rows = await loadPacketRecords();
    rows.unshift({ ...packet, renderedCount:renderedDocuments.length, renderedDocuments:renderedDocuments.map(d => ({ templateId:d.templateId, title:d.title, riskLevel:d.riskLevel, exportClass:d.exportClass })) });
    await writeJSON(PACKET_RECORDS_FILE, rows.slice(0,20000));
    const auditEvent = await audit('document_packet_assembled', { packetId:packet.id, templateCount:packet.templateIds.length }, req);
    return sendJSON(res, 201, { ok:true, packet:{ id:packet.id, title:packet.title, templateCount:packet.templateIds.length }, renderedDocuments:renderedDocuments.map(d => ({ templateId:d.templateId, title:d.title, exportClass:d.exportClass })), markdown, auditId:auditEvent.id });
  }

  if(method === 'GET' && url.pathname === '/api/reminders'){
    const rows = await loadReminders();
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.map(summarizeReminder), statuses:REMINDER_STATUSES });
  }
  const reminderMatch = url.pathname.match(/^\/api\/reminders\/([^/]+)$/);
  if(method === 'GET' && reminderMatch){
    const rows = await loadReminders();
    const row = rows.find(r => r.id === decodeURIComponent(reminderMatch[1]));
    if(!row) return sendJSON(res, 404, { ok:false, error:'reminder not found' });
    if(!ownableVisible([row], session).length) return sendJSON(res, 403, { ok:false, error:'You do not have access to this reminder.' });
    return sendJSON(res, 200, row);
  }
  if(method === 'POST' && url.pathname === '/api/reminders'){
    const body = await readBody(req);
    assertObject(body);
    const reminder = createReminder({ title:body.title, dueDate:body.dueDate, sourceType:body.sourceType || 'manual', sourceId:body.sourceId || null, jurisdiction:body.jurisdiction || null, owner:session?.user ? { id:session.user.id, orgId:session.user.orgId || null } : null, note:body.note || '', leadDays:body.leadDays || [30,7,1] });
    const rows = await loadReminders();
    rows.unshift(reminder);
    await writeJSON(REMINDERS_FILE, rows.slice(0,50000));
    const auditEvent = await audit('reminder_created', { reminderId:reminder.id, dueDate:reminder.dueDate, sourceType:reminder.sourceType }, req);
    return sendJSON(res, 201, { ok:true, reminder:summarizeReminder(reminder), auditId:auditEvent.id });
  }
  const reminderTransitionMatch = url.pathname.match(/^\/api\/reminders\/([^/]+)\/transition$/);
  if(method === 'POST' && reminderTransitionMatch){
    const body = await readBody(req);
    const rows = await loadReminders();
    const id = decodeURIComponent(reminderTransitionMatch[1]);
    const index = rows.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'reminder not found' });
    const updated = transitionReminder(rows[index], { status:String(body.status || 'completed'), actor:session.user?.id || 'anonymous', note:trimString(body.note, 1000) });
    rows[index] = updated;
    await writeJSON(REMINDERS_FILE, rows.slice(0,50000));
    const auditEvent = await audit('reminder_transitioned', { reminderId:id, status:updated.status }, req);
    return sendJSON(res, 200, { ok:true, reminder:summarizeReminder(updated), auditId:auditEvent.id });
  }

  if(method === 'GET' && url.pathname === '/api/template-ops/summary'){
    const role = requireRole(session, ['operator','reviewer','admin']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const [patches, overrides, manifest] = await Promise.all([loadTemplatePatchRequests(), loadTemplateOverrides(), loadManifest()]);
    const byStatus = patches.reduce((acc, row) => (acc[row.status] = (acc[row.status] || 0) + 1, acc), {});
    return sendJSON(res, 200, { ok:true, version:'20.0.0', records:(manifest.records || []).length, patchRequests:patches.length, byStatus, overrides:(overrides.overrides || []).length, recentPatches:patches.slice(0,25).map(summarizeTemplatePatch), recentOverrides:(overrides.overrides || []).slice(0,25) });
  }
  if(method === 'GET' && url.pathname === '/api/templates/overrides'){
    const role = requireRole(session, ['operator','reviewer','admin']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    return sendJSON(res, 200, await loadTemplateOverrides());
  }
  if(method === 'GET' && url.pathname === '/api/templates/patch-requests'){
    const role = requireRole(session, ['operator','reviewer','admin']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const rows = await loadTemplatePatchRequests();
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.map(summarizeTemplatePatch) });
  }
  if(method === 'POST' && url.pathname === '/api/templates/patch-requests'){
    const role = requireRole(session, ['operator','reviewer','admin']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const body = await readBody(req);
    assertObject(body);
    const request = createTemplatePatchRequest({ templateId:body.templateId, patch:body.patch || {}, reason:body.reason || '', session });
    const rows = await loadTemplatePatchRequests();
    rows.unshift(request);
    await writeJSON(TEMPLATE_PATCH_REQUESTS_FILE, rows.slice(0,20000));
    const auditEvent = await audit('template_patch_requested', { requestId:request.id, templateId:request.templateId, fields:Object.keys(request.patch) }, req);
    return sendJSON(res, 201, { ok:true, request, auditId:auditEvent.id });
  }
  const patchTransitionMatch = url.pathname.match(/^\/api\/templates\/patch-requests\/([^/]+)\/transition$/);
  if(method === 'POST' && patchTransitionMatch){
    const role = requireRole(session, ['operator','reviewer','admin']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const body = await readBody(req);
    const rows = await loadTemplatePatchRequests();
    const id = decodeURIComponent(patchTransitionMatch[1]);
    const index = rows.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'template patch request not found' });
    const updated = transitionTemplatePatch(rows[index], { status:String(body.status || 'approved'), actor:session.user?.id || 'operator', note:trimString(body.note, 1000) });
    rows[index] = updated;
    await writeJSON(TEMPLATE_PATCH_REQUESTS_FILE, rows.slice(0,20000));
    const auditEvent = await audit('template_patch_transitioned', { requestId:id, status:updated.status }, req);
    return sendJSON(res, 200, { ok:true, request:updated, auditId:auditEvent.id });
  }
  const patchApplyMatch = url.pathname.match(/^\/api\/templates\/patch-requests\/([^/]+)\/apply$/);
  if(method === 'POST' && patchApplyMatch){
    const role = requireRole(session, ['operator','admin']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const body = await readBody(req);
    const rows = await loadTemplatePatchRequests();
    const id = decodeURIComponent(patchApplyMatch[1]);
    const index = rows.findIndex(row => row.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'template patch request not found' });
    const override = createTemplateOverrideFromPatch(rows[index], { actor:session.user?.id || 'operator', note:trimString(body.note, 1000) });
    const overridesFile = await loadTemplateOverrides();
    overridesFile.version = '13.0.0';
    overridesFile.overrides = [override, ...(overridesFile.overrides || [])].slice(0,50000);
    await writeJSON(TEMPLATE_OVERRIDES_FILE, overridesFile);
    const updated = transitionTemplatePatch(rows[index], { status:'applied', actor:session.user?.id || 'operator', note:trimString(body.note || 'Override applied.', 1000) });
    rows[index] = updated;
    await writeJSON(TEMPLATE_PATCH_REQUESTS_FILE, rows.slice(0,20000));
    const auditEvent = await audit('template_patch_override_applied', { requestId:id, overrideId:override.id, templateId:override.templateId, fields:Object.keys(override.patch || {}) }, req);
    return sendJSON(res, 200, { ok:true, request:summarizeTemplatePatch(updated), override, auditId:auditEvent.id });
  }

  if(method === 'GET' && url.pathname === '/api/governance/publishability') return sendJSON(res, 200, await loadDataFile('publishability-report.json', {}));
  if(method === 'GET' && url.pathname === '/api/governance/review-lanes') return sendJSON(res, 200, await loadDataFile('review-lanes.json', {}));
  if(method === 'GET' && url.pathname === '/api/governance/review-priority-board') return sendJSON(res, 200, await loadDataFile('review-priority-board.json', {}));
  if(method === 'GET' && url.pathname === '/api/governance/official-freshness') return sendJSON(res, 200, await loadDataFile('official-workflow-freshness.json', {}));

  if(method === 'GET' && url.pathname === '/api/core-products/catalog') return sendJSON(res, 200, await loadDataFile('core-product-catalog.json', {}));
  if(method === 'GET' && url.pathname === '/api/business-formation/products') return sendJSON(res, 200, await loadDataFile('business-formation-workflows.json', {}));
  if(method === 'POST' && url.pathname === '/api/business-formation/intake'){
    if(process.env.SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH === '1' && !session.verified) return sendJSON(res, 401, { ok:false, error:'A verified upstream session is required for formation intake in this mode.' });
    const body = await readBody(req);
    const ack = requireCommercialAcknowledgments(body);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'Formation intake requires all commercial boundary acknowledgments.', missing:ack.missing });
    const catalog = await loadDataFile('business-formation-workflows.json', { products:[] });
    const product = findById(catalog.products, body.serviceId || body.productId || 'llc-formation-prep') || catalog.products?.[0] || {};
    const packetMarkdown = buildFormationPrepPacket({ product, body, session });
    const { entry, auditEvent } = await createAndStoreCommercialOrder({ req, type:'business_formation_intake', serviceId:product.id || body.serviceId, risk:product.risk || 'high', jurisdiction:body.state || body.answers?.state || null, payload:{ ...body, packetMarkdown, officialSourcePolicy:product.officialSourcePolicy, deliverables:product.deliverables }, status:'draft_packet_created' });
    return sendJSON(res, 201, { ok:true, order:summarizeOrder(entry), auditId:auditEvent.id, packetMarkdown, officialSourcePolicy:product.officialSourcePolicy, nextSteps:['review intake facts','download draft/prep packet','route to partner review when appropriate','use current official agency source for final submission'], boundary:entry.boundary });
  }
  if(method === 'GET' && url.pathname === '/api/compliance/obligations'){
    const data = await loadDataFile('compliance-obligations.json', { obligations:[] });
    const state = String(url.searchParams.get('state') || '').toUpperCase();
    const entityType = String(url.searchParams.get('entityType') || '').toLowerCase();
    let rows = data.obligations || [];
    if(state) rows = rows.filter(o => o.state === state);
    if(entityType) rows = rows.filter(o => (o.entityTypes || []).some(t => t === 'All' || String(t).toLowerCase() === entityType));
    return sendJSON(res, 200, { ok:true, total:rows.length, items:rows.slice(0,250), boundary:data.boundary });
  }
  if(method === 'POST' && url.pathname === '/api/compliance/monitor/create'){
    if(process.env.SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH === '1' && !session.verified) return sendJSON(res, 401, { ok:false, error:'A verified upstream session is required for compliance monitoring in this mode.' });
    const body = await readBody(req);
    const ack = requireCommercialAcknowledgments(body);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'Compliance monitor requires all boundary acknowledgments.', missing:ack.missing });
    const obligations = (await loadDataFile('compliance-obligations.json', { obligations:[] })).obligations || [];
    const monitor = buildComplianceMonitor({ body, obligations });
    const { entry, auditEvent } = await createAndStoreCommercialOrder({ req, type:'compliance_monitor', serviceId:'business-compliance-monitor', risk:'medium', jurisdiction:monitor.state || null, payload:{ ...body, monitor }, status:'official_source_ready' });
    return sendJSON(res, 201, { ok:true, order:summarizeOrder(entry), auditId:auditEvent.id, monitor, boundary:entry.boundary });
  }
  if(method === 'GET' && url.pathname === '/api/registered-agent/program') return sendJSON(res, 200, await loadDataFile('registered-agent-program.json', {}));
  if(method === 'POST' && url.pathname === '/api/registered-agent/referral'){
    const body = await readBody(req);
    const ack = requireCommercialAcknowledgments(body, [['acceptProviderTermsRequired','provider_terms_required_before_service']]);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'Registered-agent referral requires all boundary acknowledgments.', missing:ack.missing });
    const { entry, auditEvent } = await createAndStoreCommercialOrder({ req, type:'registered_agent_referral', serviceId:body.serviceId || 'registered-agent-referral', risk:'medium', jurisdiction:body.state || body.answers?.state || null, payload:body, status:'partner_review_requested' });
    return sendJSON(res, 201, { ok:true, order:summarizeOrder(entry), auditId:auditEvent.id, message:'Referral intent recorded. SovereignDocs is not acting as registered/statutory agent unless a separate live provider contract is configured.', boundary:entry.boundary });
  }
  if(method === 'GET' && url.pathname === '/api/trademark/services') return sendJSON(res, 200, await loadDataFile('trademark-ip-services.json', {}));
  if(method === 'POST' && url.pathname === '/api/trademark/intake'){
    const body = await readBody(req);
    const ack = requireCommercialAcknowledgments(body);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'Trademark/IP intake requires all boundary acknowledgments.', missing:ack.missing });
    const catalog = await loadDataFile('trademark-ip-services.json', { services:[] });
    const service = findById(catalog.services, body.serviceId || 'trademark-search-worksheet') || catalog.services?.[0] || {};
    const packetMarkdown = buildReviewReadyPacket({ lane:'Trademark/IP', service, body, session });
    const { entry, auditEvent } = await createAndStoreCommercialOrder({ req, type:'trademark_ip_intake', serviceId:service.id || body.serviceId, risk:service.risk || 'high', jurisdiction:'US', payload:{ ...body, packetMarkdown, officialSource:service.officialSource }, status:'official_source_ready' });
    return sendJSON(res, 201, { ok:true, order:summarizeOrder(entry), auditId:auditEvent.id, packetMarkdown, officialSource:service.officialSource, boundary:entry.boundary });
  }
  if(method === 'GET' && url.pathname === '/api/estate-planning/services') return sendJSON(res, 200, await loadDataFile('estate-planning-services.json', {}));
  if(method === 'POST' && url.pathname === '/api/estate-planning/intake'){
    const body = await readBody(req);
    const ack = requireCommercialAcknowledgments(body);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'Estate/life-planning intake requires all boundary acknowledgments.', missing:ack.missing });
    const catalog = await loadDataFile('estate-planning-services.json', { services:[] });
    const service = findById(catalog.services, body.serviceId || 'will-worksheet') || catalog.services?.[0] || {};
    const packetMarkdown = buildReviewReadyPacket({ lane:'Estate/Life Planning', service, body, session });
    const { entry, auditEvent } = await createAndStoreCommercialOrder({ req, type:'estate_planning_intake', serviceId:service.id || body.serviceId, risk:'high', jurisdiction:body.state || body.answers?.state || null, payload:{ ...body, packetMarkdown }, status:'partner_review_requested' });
    return sendJSON(res, 201, { ok:true, order:summarizeOrder(entry), auditId:auditEvent.id, packetMarkdown, reviewRecommended:true, boundary:entry.boundary });
  }
  if(method === 'GET' && url.pathname === '/api/legal-plans') return sendJSON(res, 200, await loadDataFile('legal-plan-catalog.json', {}));
  if(method === 'POST' && url.pathname === '/api/legal-plans/enroll-intent'){
    const body = await readBody(req);
    const ack = requireCommercialAcknowledgments(body, [['acceptPartnerPlanBoundary','partner_plan_boundary']]);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'Legal-plan intent requires all boundary acknowledgments.', missing:ack.missing });
    const plans = await loadDataFile('legal-plan-catalog.json', { plans:[] });
    const plan = findById(plans.plans, body.planId || 'business-command') || plans.plans?.[0] || {};
    const { entry, auditEvent } = await createAndStoreCommercialOrder({ req, type:'legal_plan_intent', serviceId:plan.id || body.planId, risk:'medium', jurisdiction:body.state || null, payload:{ ...body, plan }, status:'partner_review_requested' });
    return sendJSON(res, 201, { ok:true, order:summarizeOrder(entry), auditId:auditEvent.id, plan, message:'Plan intent recorded. Any legal partner services remain subject to partner terms and availability.', boundary:entry.boundary });
  }
  if(method === 'POST' && url.pathname === '/api/esign/envelopes/create'){
    const body = await readBody(req);
    const ack = requireCommercialAcknowledgments(body, [['acceptEsignBoundary','native_esign_audit_capture_only']]);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'E-sign envelope creation requires all boundary acknowledgments.', missing:ack.missing });
    const rows = await readJSON(ESIGN_ENVELOPE_LOG_FILE, []);
    const envelope = { id:crypto.randomUUID(), status:'draft_envelope_created', title:String(body.title || 'SovereignDocs envelope'), signers:body.signers || [], documentRef:body.documentRef || null, createdAt:new Date().toISOString(), session, boundary:'Native e-sign is audit capture until an external e-sign provider is connected.' };
    rows.unshift(envelope);
    await writeJSON(ESIGN_ENVELOPE_LOG_FILE, rows.slice(0,20000));
    const auditEvent = await audit('esign_envelope_created', { envelopeId:envelope.id, signerCount:envelope.signers.length }, req);
    return sendJSON(res, 201, { ok:true, envelope, auditId:auditEvent.id });
  }
  if(method === 'GET' && url.pathname === '/api/orders'){
    const rows = filterOrdersForSession(await loadCustomerOrders(), session).map(summarizeOrder);
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows });
  }
  const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
  if(method === 'GET' && orderMatch){
    const rows = await loadCustomerOrders();
    const row = rows.find(item => item.id === decodeURIComponent(orderMatch[1]));
    if(!row) return sendJSON(res, 404, { ok:false, error:'order not found' });
    if(!canAccessOrder(session, row)) return sendJSON(res, 403, { ok:false, error:'You do not have access to this order.' });
    return sendJSON(res, 200, row);
  }
  const orderStatusMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if(method === 'POST' && orderStatusMatch){
    const role = requireRole(session, ['operator','reviewer','partner_manager','legal_partner']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const body = await readBody(req);
    const rows = await loadCustomerOrders();
    const id = decodeURIComponent(orderStatusMatch[1]);
    const index = rows.findIndex(item => item.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'order not found' });
    const updated = transitionCommercialOrder(rows[index], { status:String(body.status || 'awaiting_user_information'), actor:session.user?.id, note:String(body.note || ''), payload:body.payload || {} });
    rows[index] = updated;
    await writeJSON(CUSTOMER_ORDERS_FILE, rows.slice(0,50000));
    const auditEvent = await audit('commercial_order_status_updated', { orderId:id, status:updated.status }, req);
    return sendJSON(res, 200, { ok:true, auditId:auditEvent.id, order:summarizeOrder(updated) });
  }

  if(method === 'GET' && url.pathname === '/api/partner-workbench/queue'){
    const role = requireRole(session, ['operator','reviewer','legal_partner','partner_manager']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const [submissions, rules, partners, statuses] = await Promise.all([loadLegalReviewSubmissions(), loadDataFile('partner-routing-rules.json', {}), loadDataFile('legal-partner-network.json', {}), loadDataFile('legal-review-statuses.json', {})]);
    const grouped = submissions.reduce((acc, row) => { const key = row.status || 'unknown'; (acc[key] ||= []).push(summarizeSubmission(row)); return acc; }, {});
    return sendJSON(res, 200, { ok:true, count:submissions.length, grouped, recent:submissions.slice(0,50).map(summarizeSubmission), routingRules:rules.rules || [], partners, statuses });
  }

  if(method === 'GET' && url.pathname === '/api/legal-partners/network') return sendJSON(res, 200, await loadDataFile('legal-partner-network.json', {}));
  if(method === 'GET' && url.pathname === '/api/legal-review/service-plans') return sendJSON(res, 200, await loadDataFile('legal-review-service-plans.json', {}));
  if(method === 'GET' && url.pathname === '/api/legal-review/statuses') return sendJSON(res, 200, { ok:true, statuses:LEGAL_REVIEW_STATUSES, source: await loadDataFile('legal-review-statuses.json', {}) });
  if(method === 'GET' && url.pathname === '/api/legal-review/submissions'){
    const role = requireRole(session, ['operator','reviewer','legal_partner']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const [rows, payments, payouts] = await Promise.all([loadLegalReviewSubmissions(), loadLegalReviewPayments(), loadLegalReviewPayouts()]);
    return sendJSON(res, 200, { ok:true, count:rows.length, items:rows.map(summarizeSubmission), payments, payouts });
  }
  if(method === 'GET' && url.pathname === '/api/legal-review/payments') return sendJSON(res, 200, { ok:true, items:await loadLegalReviewPayments() });
  if(method === 'GET' && url.pathname === '/api/legal-review/payouts') return sendJSON(res, 200, { ok:true, items:await loadLegalReviewPayouts() });
  if(method === 'GET' && (url.pathname === '/api/legal-review/vault-records' || url.pathname === '/api/vault/review-records')) return sendJSON(res, 200, { ok:true, items:await loadLegalReviewVaultRecords() });
  const legalReviewReadMatch = url.pathname.match(/^\/api\/legal-review\/submissions\/([^/]+)$/);
  if(method === 'GET' && legalReviewReadMatch){
    const rows = await loadLegalReviewSubmissions();
    const row = rows.find(item => item.id === decodeURIComponent(legalReviewReadMatch[1]));
    if(!row) return sendJSON(res, 404, { ok:false, error:'legal review submission not found' });
    if(!canAccessSubmission(session, row)) return sendJSON(res, 403, { ok:false, error:'You do not have access to this legal review submission.' });
    return sendJSON(res, 200, row);
  }
  if(method === 'POST' && url.pathname === '/api/legal-review/submit'){
    if(process.env.SOVEREIGNDOCS_REQUIRE_UPSTREAM_AUTH === '1' && !session.verified) return sendJSON(res, 401, { ok:false, error:'A verified upstream session is required to submit partner review packets in this mode.' });
    const body = await readBody(req);
    const ack = requirePartnerReviewAcknowledgments(body);
    if(!ack.ok) return sendJSON(res, 403, { ok:false, error:'Partner review submission requires all boundary acknowledgments.', missing:ack.missing });
    const bundle = await loadTemplateBundle(body.templateId);
    const decisions = await loadReviewDecisions();
    const answers = buildAnswers(bundle, body);
    const gate = decideTemplateGate({ bundle, body:{ ...body, exportMode: body.exportMode || (bundle.meta.riskLevel === 'high' ? 'prep_worksheet' : undefined), prepWorksheetOnly: bundle.meta.riskLevel === 'high' || body.prepWorksheetOnly }, decisions });
    const assembledMarkdown = gate.exportClass === 'prep_worksheet' ? buildPrepWorksheet({ bundle, answers, gate }) : withSignature(assembleDocument(bundle.document, answers), body.signature || '');
    const [rows, payments, vaultRecords] = await Promise.all([loadLegalReviewSubmissions(), loadLegalReviewPayments(), loadLegalReviewVaultRecords()]);
    const entry = createLegalReviewSubmission({ bundle, answers, gate, assembledMarkdown, body, session });
    const plan = await legalReviewPlanById(entry.servicePlanId);
    const partner = await legalPartnerById(body.requestedPartnerId || body.partnerId || '');
    entry.status = plan.amountCents === null ? 'quote_required_before_checkout' : 'checkout_required';
    entry.paymentStatus = plan.amountCents === null ? 'quote_required' : 'checkout_required';
    entry.escrowStatus = 'pending_payment';
    entry.requestedPartnerId = partner?.id || body.requestedPartnerId || body.partnerId || null;
    entry.events = [...(entry.events || []), { id:crypto.randomUUID(), type:entry.status, actor:session.user?.id || 'unknown', note:'Review packet stored in vault and SkyePay checkout created before partner routing.', createdAt:new Date().toISOString() }];
    const payment = createLegalReviewPayment({ entry, plan, partner });
    const vaultRecord = createLegalReviewVaultRecord({ entry, payment, partner });
    entry.paymentIntentId = payment.id;
    entry.vaultRecordId = vaultRecord.id;
    rows.unshift(entry);
    payments.unshift(payment);
    vaultRecords.unshift(vaultRecord);
    await writeJSON(LEGAL_REVIEW_SUBMISSIONS_FILE, rows.slice(0,20000));
    await writeJSON(LEGAL_REVIEW_PAYMENTS_FILE, payments.slice(0,20000));
    await writeJSON(LEGAL_REVIEW_VAULT_RECORDS_FILE, vaultRecords.slice(0,20000));
    const auditEvent = await audit('legal_partner_review_submitted_checkout_required', { submissionId:entry.id, templateId:entry.templateId, riskLevel:entry.riskLevel, servicePlanId:entry.servicePlanId, paymentId:payment.id, vaultRecordId:vaultRecord.id, noGuarantee:true }, req);
    return sendJSON(res, 201, { ok:true, receiptId:entry.id, status:entry.status, auditId:auditEvent.id, submission:summarizeSubmission(entry), payment, vaultRecord, skyepayCheckoutUrl:payment.checkoutUrl, boundaries:entry.boundaries, message:'Review packet stored in the SovereignDocs vault and SkyePay checkout is required before partner routing. This is not legal advice, not a guarantee of partner acceptance, and not an attorney-client relationship with SovereignDocs.' });
  }
  const legalReviewPaymentMatch = url.pathname.match(/^\/api\/legal-review\/submissions\/([^/]+)\/payment-confirm$/);
  if(method === 'POST' && legalReviewPaymentMatch){
    const body = await readBody(req);
    const id = decodeURIComponent(legalReviewPaymentMatch[1]);
    const [rows, payments] = await Promise.all([loadLegalReviewSubmissions(), loadLegalReviewPayments()]);
    const index = rows.findIndex(item => item.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'legal review submission not found' });
    const payment = payments.find(item => item.submissionId === id || item.id === rows[index].paymentIntentId);
    if(payment){
      payment.status = String(body.status || 'paid_held_in_escrow');
      payment.skyePayOrderId = body.skyePayOrderId || body.orderId || payment.skyePayOrderId || null;
      payment.confirmedAt = new Date().toISOString();
      payment.updatedAt = payment.confirmedAt;
    }
    rows[index].status = 'submitted_pending_triage';
    rows[index].paymentStatus = payment?.status || 'paid_held_in_escrow';
    rows[index].escrowStatus = 'paid_held_for_partner_review';
    rows[index].updatedAt = new Date().toISOString();
    rows[index].events = [...(rows[index].events || []), { id:crypto.randomUUID(), type:'payment_confirmed', actor:session.user?.id || 'skyepay', note:'SkyePay payment confirmed; review can move to operator triage.', payload:body, createdAt:rows[index].updatedAt }];
    await writeJSON(LEGAL_REVIEW_SUBMISSIONS_FILE, rows.slice(0,20000));
    await writeJSON(LEGAL_REVIEW_PAYMENTS_FILE, payments.slice(0,20000));
    const auditEvent = await audit('legal_partner_review_payment_confirmed', { submissionId:id, paymentId:payment?.id || null }, req);
    return sendJSON(res, 200, { ok:true, auditId:auditEvent.id, submission:summarizeSubmission(rows[index]), payment, nextStep:'Operator triage can now route to an activated legal partner workspace.' });
  }
  const legalReviewRouteMatch = url.pathname.match(/^\/api\/legal-review\/submissions\/([^/]+)\/(route|partner-update)$/);
  if(method === 'POST' && legalReviewRouteMatch){
    const action = legalReviewRouteMatch[2];
    const role = requireRole(session, action === 'route' ? ['operator','reviewer'] : ['operator','reviewer','legal_partner']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const body = await readBody(req);
    const [rows, payments, payouts, vaultRecords] = await Promise.all([loadLegalReviewSubmissions(), loadLegalReviewPayments(), loadLegalReviewPayouts(), loadLegalReviewVaultRecords()]);
    const id = decodeURIComponent(legalReviewRouteMatch[1]);
    const index = rows.findIndex(item => item.id === id);
    if(index === -1) return sendJSON(res, 404, { ok:false, error:'legal review submission not found' });
    const status = action === 'route' ? 'routed_to_partner' : String(body.status || 'partner_review_returned');
    const partner = await legalPartnerById(body.partnerId || rows[index].partnerId || rows[index].requestedPartnerId || 'operator-configured-legal-network');
    const updated = transitionLegalReviewSubmission(rows[index], { status, actor:session.user?.id, note:String(body.note || body.routingNote || ''), partnerId:String(partner?.id || body.partnerId || rows[index].partnerId || 'operator-configured-legal-network'), partnerStatus:body.partnerStatus || null, payload:body.payload || {} });
    if(body.revisedDocument || body.approvedDocument) updated.partnerReturnedDocument = body.revisedDocument || body.approvedDocument;
    rows[index] = updated;
    let payout = null;
    if(['partner_review_returned','approved','approved_with_revisions','returned_to_customer'].includes(status)){
      const payment = payments.find(item => item.submissionId === id || item.id === updated.paymentIntentId);
      payout = payouts.find(item => item.submissionId === id) || createLegalReviewPayout({ entry:updated, payment, body });
      if(!payouts.find(item => item.id === payout.id)) payouts.unshift(payout);
      const vault = vaultRecords.find(item => item.id === updated.vaultRecordId || item.submissionId === id);
      if(vault){
        vault.status = 'partner_return_logged';
        vault.partnerReturnedDocument = body.revisedDocument || body.approvedDocument || vault.partnerReturnedDocument || null;
        vault.customerVisibleStatus = 'Partner return logged; delivery and payout release pending owner review.';
        vault.updatedAt = new Date().toISOString();
      }
    }
    await writeJSON(LEGAL_REVIEW_SUBMISSIONS_FILE, rows.slice(0,20000));
    await writeJSON(LEGAL_REVIEW_PAYOUTS_FILE, payouts.slice(0,20000));
    await writeJSON(LEGAL_REVIEW_VAULT_RECORDS_FILE, vaultRecords.slice(0,20000));
    const auditEvent = await audit(action === 'route' ? 'legal_partner_review_routed' : 'legal_partner_review_updated', { submissionId:id, status:updated.status, partnerId:updated.partnerId || null }, req);
    return sendJSON(res, 200, { ok:true, auditId:auditEvent.id, submission:summarizeSubmission(updated), payout, boundary:'SovereignDocs records routing/status only. Partner responsibility, scope, and engagement terms remain external to SovereignDocs.' });
  }


  if(method === 'GET' && url.pathname === '/api/review/statuses') return sendJSON(res, 200, { ok:true, statuses:REVIEW_STATUSES });
  if(method === 'GET' && url.pathname === '/api/review/decisions') return sendJSON(res, 200, await loadReviewDecisions());
  if(method === 'POST' && url.pathname === '/api/review/decisions'){
    const role = requireRole(session, ['reviewer','operator']);
    if(!role.ok) return sendJSON(res, role.status, { ok:false, error:role.error });
    const body = await readBody(req);
    if(!body.templateId) return sendJSON(res, 400, { ok:false, error:'templateId is required' });
    if(!REVIEW_STATUSES.includes(body.status)) return sendJSON(res, 400, { ok:false, error:'Unsupported review decision status', allowedStatuses:REVIEW_STATUSES });
    const rows = await loadReviewDecisions();
    const entry = {
      id:crypto.randomUUID(),
      templateId:String(body.templateId),
      status:body.status,
      reason:String(body.reason || body.notes || ''),
      scope:String(body.scope || 'template_record'),
      reviewer:session.user?.id || String(body.reviewer || 'local-operator'),
      reviewerRole:(session.user?.roles || []).join(','),
      publicExportAllowed:body.status === 'public_draft_approved',
      prepWorksheetAllowed:body.status === 'prep_only_approved',
      attorneyReviewed:false,
      createdAt:new Date().toISOString(),
      boundary:'operator governance decision only; not attorney review unless a separate attorney-review integration is later proven',
      session
    };
    rows.unshift(entry);
    await writeJSON(REVIEW_DECISIONS_FILE, rows.slice(0,10000));
    await audit('review_decision_saved', { templateId:entry.templateId, status:entry.status, reason:entry.reason }, req);
    return sendJSON(res, 201, entry);
  }

  if(method === 'GET' && url.pathname === '/api/templates'){
    const [manifest,categories,jurisdictions,gates,official,review] = await Promise.all([loadManifest(), loadCategories(), loadJurisdictions(), loadPathJSON('audit/publish-gates.json',{}), loadPathJSON('official-source-library/official-workflows.json',{}), loadPathJSON('review-workflow/review-queue-high-risk.json',{})]);
    return sendJSON(res, 200, { ...manifest, categories, jurisdictions, gateSummary:gates, officialWorkflowCount:official.count || 0, highRiskQueueCount:review.count || 0 });
  }
  if(method === 'GET' && url.pathname === '/api/templates/search'){
    const manifest = await loadManifest();
    const overrides = await loadTemplateOverrides();
    return sendJSON(res, 200, paginatedTemplateSearch({ records:(manifest.records || []).map(r => applyPatchToRecordView(r, overrides.overrides || [])), url }));
  }
  if(method === 'GET' && url.pathname === '/api/categories') return sendJSON(res, 200, await loadCategories());
  if(method === 'GET' && url.pathname === '/api/jurisdictions') return sendJSON(res, 200, await loadJurisdictions());
  if(method === 'GET' && url.pathname === '/api/publish-gates') return sendJSON(res, 200, await loadPathJSON('audit/publish-gates.json', {}));
  if(method === 'GET' && url.pathname === '/api/official-workflows') return sendJSON(res, 200, await loadPathJSON('official-source-library/official-workflows.json', {}));

  const officialWorkflowMatch = url.pathname.match(/^\/api\/official-workflows\/([^/]+)$/);
  if(method === 'GET' && officialWorkflowMatch){
    const official = await loadPathJSON('official-source-library/official-workflows.json', {});
    const workflow = findOfficialWorkflow(official, decodeURIComponent(officialWorkflowMatch[1]));
    if(!workflow) return sendJSON(res, 404, { ok:false, error:'official workflow not found' });
    return sendJSON(res, 200, workflow);
  }
  if(method === 'POST' && url.pathname === '/api/official-workflows/prepare'){
    const body = await readBody(req);
    const official = await loadPathJSON('official-source-library/official-workflows.json', {});
    const workflow = findOfficialWorkflow(official, body.workflowId);
    if(!workflow) return sendJSON(res, 404, { ok:false, error:'official workflow not found' });
    const markdown = buildOfficialPrepPacket(workflow, body.answers || {});
    await audit('official_workflow_prep_packet', { workflowId:workflow.id, title:workflow.title, externalOnly:true }, req);
    return sendJSON(res, 200, { ok:true, workflowId:workflow.id, title:workflow.title, officialUrl:workflow.official_url, markdown, policy:workflow.document_generation_policy, officialSubmission:false, externalOnly:true });
  }

  if(method === 'GET' && url.pathname === '/api/review-queue/high-risk') return sendJSON(res, 200, await loadPathJSON('review-workflow/review-queue-high-risk.json', {}));
  const overlayMatch = url.pathname.match(/^\/api\/state-overlays\/([^/]+)$/);
  if(method === 'GET' && overlayMatch) return sendJSON(res, 200, await loadPathJSON(`template-library/state-overlays-v2/${decodeURIComponent(overlayMatch[1])}.json`, { ok:false, error:'overlay not found' }));
  if(method === 'GET' && url.pathname === '/api/template-health') return sendJSON(res, 200, await loadDataFile('template-quality-report.json', {}));
  if(method === 'POST' && url.pathname === '/api/billing/checkout-intent'){
    const body = await readBody(req);
    const result = await createCheckoutIntent({ planId:body.planId, orderId:body.orderId, customerEmail:body.customerEmail || session.user?.email, successUrl:body.successUrl, cancelUrl:body.cancelUrl });
    const auditEvent = await audit('billing_checkout_intent_created', { planId:body.planId, orderId:body.orderId || null, provider:result.provider, live:!!result.checkoutUrl }, req);
    return sendJSON(res, 200, { ok:true, ...result, auditId:auditEvent.id });
  }
  if(method === 'POST' && url.pathname === '/api/notifications/test'){
    const auth = requireRole(session, ['operator','admin']);
    if(!auth.ok) return sendJSON(res, auth.status, auth);
    const body = await readBody(req);
    const result = await sendNotification({ to:body.to || session.user?.email, subject:body.subject || 'SovereignDocs notification test', text:body.text || 'SovereignDocs notification adapter test.', type:'operator_test' });
    const auditEvent = await audit('notification_test_sent', { provider:result.provider, to:body.to || session.user?.email }, req);
    return sendJSON(res, 200, { ok:true, result, auditId:auditEvent.id });
  }
  if(method === 'GET' && url.pathname === '/api/storage/status') return sendJSON(res, 200, { ok:true, provider:process.env.R2_BUCKET?'r2-configured':'local-dev-object-store', production:isProduction() });
  if(method === 'GET' && url.pathname === '/api/billing/plans') return sendJSON(res, 200, await loadDataFile('billing-plans.json', []));
  if(method === 'GET' && url.pathname === '/api/integrations/catalog') return sendJSON(res, 200, await loadDataFile('integration-catalog.json', []));
  if(method === 'GET' && url.pathname === '/api/export-formats') return sendJSON(res, 200, await loadDataFile('export-formats.json', []));

  const templateMatch = url.pathname.match(/^\/api\/templates\/([^/]+)$/);
  if(method === 'GET' && templateMatch) return sendJSON(res, 200, await loadTemplateBundle(decodeURIComponent(templateMatch[1])));
  const publishCheckMatch = url.pathname.match(/^\/api\/templates\/([^/]+)\/publish-check$/);
  if(method === 'POST' && publishCheckMatch){
    const body = await readBody(req);
    const bundle = await loadTemplateBundle(decodeURIComponent(publishCheckMatch[1]));
    const decisions = await loadReviewDecisions();
    return sendJSON(res, 200, decideTemplateGate({ bundle, body, decisions }));
  }

  if(method === 'POST' && url.pathname === '/api/documents/assemble'){
    const body = await readBody(req);
    const bundle = await loadTemplateBundle(body.templateId);
    const decisions = await loadReviewDecisions();
    const gate = decideTemplateGate({ bundle, body, decisions });
    const answers = buildAnswers(bundle, body);
    const missing = missingRequired(bundle.questions, answers);
    const assembled = gate.exportClass === 'prep_worksheet' ? buildPrepWorksheet({ bundle, answers, gate }) : withSignature(assembleDocument(bundle.document, answers), body.signature || '');
    await audit('document_assembled', { templateId:bundle.meta.id, riskLevel:bundle.meta.riskLevel, missingCount:missing.length, gate }, req);
    return sendJSON(res, 200, { templateId:bundle.meta.id, title:bundle.meta.title, version:bundle.meta.version, riskLevel:bundle.meta.riskLevel, status:bundle.meta.status, gate, acceptedBoundary:!!body.acceptBoundary, highRiskGateAccepted:!!body.acceptHighRiskGate, exportAllowed:gate.exportAllowed, missingRequired:missing, content:assembled });
  }

  if(method === 'POST' && url.pathname === '/api/documents/render-html'){
    const body = await readBody(req);
    const bundle = await loadTemplateBundle(body.templateId);
    const decisions = await loadReviewDecisions();
    const gate = decideTemplateGate({ bundle, body, decisions });
    const answers = buildAnswers(bundle, body);
    const assembled = gate.exportClass === 'prep_worksheet' ? buildPrepWorksheet({ bundle, answers, gate }) : withSignature(assembleDocument(bundle.document, answers), body.signature || '');
    await audit('document_rendered_html', { templateId:bundle.meta.id, riskLevel:bundle.meta.riskLevel, exportClass:gate.exportClass }, req);
    return sendJSON(res, 200, { templateId:bundle.meta.id, title:bundle.meta.title, gate, html:markdownToHtml(assembled), markdown:assembled });
  }

  if(method === 'POST' && url.pathname === '/api/documents/export-docx'){
    const body = await readBody(req);
    const bundle = await loadTemplateBundle(body.templateId);
    const decisions = await loadReviewDecisions();
    const gate = decideTemplateGate({ bundle, body, decisions });
    if(!body.acceptBoundary) return sendJSON(res, 403, { ok:false, error:'DOCX export requires self-help / not-legal-advice boundary acknowledgment.', gate });
    if(!gate.exportAllowed) return sendJSON(res, 403, { ok:false, error:gate.message, gate });
    const quota = assertExportQuota({ session, usage: await readJSON(AUDIT_FILE, []), plan:body.plan });
    if(!quota.ok) return sendJSON(res, quota.status, quota);
    const answers = buildAnswers(bundle, body);
    const missing = missingRequired(bundle.questions, answers);
    const assembled = gate.exportClass === 'prep_worksheet' ? buildPrepWorksheet({ bundle, answers, gate }) : withSignature(assembleDocument(bundle.document, answers), body.signature || '');
    const docRecords = await loadDocumentRecords();
    const documentRecord = createDocumentRecord({ bundle, answers, gate, session, source:'docx_export', status:'exported' });
    docRecords.unshift(documentRecord);
    await writeJSON(DOCUMENT_RECORDS_FILE, docRecords.slice(0,50000));
    const auditEvent = await audit('document_exported_docx', { documentId:documentRecord.id, templateId:bundle.meta.id, riskLevel:bundle.meta.riskLevel, missingCount:missing.length, exportClass:gate.exportClass, reviewDecisionId:gate.decision?.id || null }, req);
    const docx = createDocxBuffer({
      title: bundle.meta.title || bundle.item.title,
      markdown: assembled,
      metadata: {
        templateId: bundle.meta.id,
        templateVersion: bundle.meta.version,
        riskLevel: bundle.meta.riskLevel,
        exportClass: gate.exportClass,
        auditId: auditEvent.id,
        auditHash: auditEvent.hash,
        sourcePath: bundle.meta.sourcePath,
        notLegalAdvice: true,
        attorneyReviewed: false
      }
    });
    res.writeHead(200, { 'content-type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'content-disposition':`attachment; filename="${safeFilename(bundle.meta.title || bundle.item.title)}-${gate.exportClass}-sovereigndocs.docx"`, 'cache-control':'no-store', 'x-sovereigndocs-export':'docx-api-mode-v16', 'x-sovereigndocs-audit-id':auditEvent.id });
    return res.end(docx);
  }

  if(method === 'GET' && url.pathname === '/api/vault') return sendJSON(res, 200, await readJSON(VAULT_FILE, []));
  if(method === 'POST' && url.pathname === '/api/vault'){
    const body = await readBody(req);
    const rows = await readJSON(VAULT_FILE, []);
    const entry = { id: crypto.randomUUID(), ...body, createdAt:new Date().toISOString(), session };
    rows.unshift(entry);
    await writeJSON(VAULT_FILE, rows.slice(0,5000));
    await audit('vault_saved_api', { id: entry.id, templateId: body.templateId }, req);
    return sendJSON(res, 201, entry);
  }
  if(method === 'GET' && url.pathname === '/api/audit') return sendJSON(res, 200, await readJSON(AUDIT_FILE, []));
  if(method === 'GET' && url.pathname === '/api/audit/ledger'){
    const status = await verifyAuditLedger(AUDIT_LEDGER_FILE);
    return sendJSON(res, 200, { ...status, ledger:'data/audit-ledger.ndjson' });
  }
  return sendJSON(res, 404, { ok:false, error:'API route not found', path:url.pathname });
}

function safePathFromUrl(url){ const decoded = decodeURIComponent(url.pathname); let pathname = decoded === '/' ? '/index.html' : decoded; const resolved = path.normalize(path.join(ROOT, pathname)); if(!resolved.startsWith(ROOT)) return null; return resolved; }
async function serveStatic(req, res, url){
  let file = safePathFromUrl(url);
  if(!file){ send(res, 403, 'Forbidden'); return; }
  try{
    let info = await stat(file);
    if(info.isDirectory()) file = path.join(file, 'index.html');
    info = await stat(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=300', 'x-content-type-options':'nosniff' });
    createReadStream(file).pipe(res);
  } catch {
    const fallback = path.join(ROOT, 'index.html');
    if(existsSync(fallback)){ res.writeHead(404, { 'content-type':'text/html; charset=utf-8' }); createReadStream(fallback).pipe(res); }
    else send(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try{ if(url.pathname.startsWith('/api/')) return await handleAPI(req, res, url); return await serveStatic(req, res, url); }
  catch(error){ console.error(error); sendJSON(res, error.status || 500, { ok:false, error:error.message || 'Server error' }); }
});
if(isProduction()) assertProductionConfig();
server.listen(PORT, () => console.log(`SovereignDocs v19 premium surface API running at http://localhost:${PORT}`));
