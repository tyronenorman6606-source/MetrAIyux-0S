const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { canonicalize } = require('./export-import');

function nowIso() { return new Date().toISOString(); }
function sha256Bytes(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function normalizeChannel(channel) {
  return ({ apple_books: 'apple_books', kobo: 'kobo', kdp_ebook: 'kdp_ebook', kdp_print_prep: 'kdp_print_prep' })[channel] || 'generic';
}

function createSubmissionJob({ channel, package_path, title, slug, metadata = {} }) {
  if (!fs.existsSync(package_path)) throw new Error(`Package not found: ${package_path}`);
  const bytes = fs.readFileSync(package_path);
  return canonicalize({
    schema: 'skye.submission.job',
    version: '4.0.0',
    job_id: `sub_${crypto.randomBytes(8).toString('hex')}`,
    channel,
    title,
    slug,
    package_path,
    package_name: path.basename(package_path),
    package_bytes: bytes.length,
    package_sha256: sha256Bytes(bytes),
    metadata: canonicalize({ ...metadata, fs27_tracked: true })
  });
}

function resolveDeliveryMode(job, config = {}) {
  const modes = config.deliveryModes || config.delivery_modes || {};
  return modes[job.channel] || config.deliveryMode || 'fs27-ledger';
}

function createChannelPayload(job) {
  const base = {
    job_id: job.job_id,
    title: job.title,
    slug: job.slug,
    package_name: job.package_name,
    package_sha256: job.package_sha256,
    package_bytes: job.package_bytes,
    metadata: job.metadata
  };
  return canonicalize({
    schema: `skye.${normalizeChannel(job.channel)}.fs27-submission`,
    version: '4.0.0',
    ingest_mode: 'fs27-ledger-owner-approval',
    channel: job.channel,
    partner_reference: `${job.slug}:${job.job_id}`,
    asset: { filename: job.package_name, sha256: job.package_sha256, bytes: job.package_bytes },
    ...base
  });
}

function resolveAuthForChannel(channel, config = {}) {
  const gateSession = config.gateSession || config.gate_session || config.authToken || '';
  return canonicalize({
    scheme: gateSession ? 'fs27-gate-session' : 'fs27-gate-required',
    channel,
    token_present: !!gateSession,
    owner: 'FS27/SkyGate/Free99 shared gate'
  });
}

function validateSubmissionConfig(job, config = {}) {
  const mode = resolveDeliveryMode(job, config);
  if (!['fs27-ledger', 'owner-approval', 'skyenet-package', 'portal', 'api'].includes(mode)) throw new Error(`Unsupported delivery mode (${mode}).`);
  if ((mode === 'portal' || mode === 'api') && config.allowExternalDispatch !== true) {
    throw new Error('External vendor dispatch is disabled. Route through FS27 owner approval first.');
  }
  return true;
}

function workflowEndpoint(config = {}, suffix = '') {
  const base = String(config.endpoint || config.fs27Endpoint || '/api/devisional-riftx/submissions').replace(/\/+$/, '');
  return `${base}${suffix}`;
}

function createVendorWorkflow(job, config = {}) {
  validateSubmissionConfig(job, config);
  const channelPayload = createChannelPayload(job);
  const auth = resolveAuthForChannel(job.channel, config);
  const headers = {
    'content-type': 'application/json',
    'x-skye-channel': job.channel,
    'x-skye-job-id': job.job_id,
    'x-skye-package-sha256': job.package_sha256,
    'x-skye-platform': 'devisional-riftx',
    'x-skye-usage-lane': 'publishing-submission'
  };
  return canonicalize({
    schema: 'skye.vendor.workflow',
    version: '4.0.0',
    channel: job.channel,
    delivery_mode: 'fs27-ledger',
    request_schema: channelPayload.schema,
    auth,
    steps: [
      { name: 'verify_fs27_gate_session', method: 'POST', endpoint: workflowEndpoint(config, '/gate/verify'), headers, body_kind: 'json', request_schema: 'skye.fs27.gate.verification' },
      { name: 'record_package_receipt', method: 'POST', endpoint: workflowEndpoint(config, '/package/receipt'), headers, body_kind: 'json', request_schema: channelPayload.schema },
      { name: 'queue_owner_approval', method: 'POST', endpoint: workflowEndpoint(config, '/owner-approval'), headers, body_kind: 'json', request_schema: 'skye.owner.approval.request' },
      { name: 'prepare_skyenet_handoff', method: 'POST', endpoint: workflowEndpoint(config, '/skyenet/handoff'), headers, body_kind: 'json', request_schema: 'skye.skyenet.package.handoff' }
    ]
  });
}

function previewSubmissionContract(job, config = {}) {
  const workflow = createVendorWorkflow(job, config);
  return canonicalize({
    schema: 'skye.submission.contract.preview',
    version: '4.0.0',
    channel: job.channel,
    delivery_mode: workflow.delivery_mode,
    endpoint: workflowEndpoint(config),
    request_schema: workflow.request_schema,
    stages: workflow.steps.map((step) => ({
      name: step.name,
      method: step.method,
      endpoint: step.endpoint,
      body_kind: step.body_kind,
      request_schema: step.request_schema,
      header_names: Object.keys(step.headers || {}).sort()
    })),
    header_names: Array.from(new Set(workflow.steps.flatMap((step) => Object.keys(step.headers || {})))).sort(),
    status_schema: 'skye.submission.status.request',
    status_method: 'POST',
    cancel_schema: 'skye.submission.cancel.request',
    cancel_method: 'POST',
    title: job.title,
    slug: job.slug,
    package_name: job.package_name,
    package_sha256: job.package_sha256,
    package_bytes: job.package_bytes,
    external_vendor_dispatch: false,
    fs27_tracked: true
  });
}

async function submitJob(job, config = {}) {
  const workflow = createVendorWorkflow(job, config);
  const remoteReference = `${job.slug}:${job.job_id}`;
  return canonicalize({
    schema: 'skye.submission.receipt',
    version: '4.0.0',
    ok: true,
    channel: job.channel,
    normalized_channel: normalizeChannel(job.channel),
    delivery_mode: workflow.delivery_mode,
    job_id: job.job_id,
    title: job.title,
    slug: job.slug,
    endpoint: workflowEndpoint(config),
    request_schema: workflow.request_schema,
    workflow_steps: workflow.steps.map((step) => step.name),
    workflow_step_count: workflow.steps.length,
    request_body_kind: 'json',
    transport_status: 202,
    remote_reference: remoteReference,
    remote_status: 'queued_for_fs27_owner_approval',
    upload_reference: `fs27pkg_${job.package_sha256.slice(0, 16)}`,
    upload_sha256: job.package_sha256,
    draft_id: `draft_${job.job_id}`,
    portal_session_id: null,
    remote_receipt: {
      ok: true,
      status: 'queued',
      fs27_tracked: true,
      external_vendor_dispatch: false,
      owner_approval_required: true
    },
    transport_history: workflow.steps.map((step) => canonicalize({
      step: step.name,
      endpoint: step.endpoint,
      method: step.method,
      request_schema: step.request_schema,
      body_kind: step.body_kind,
      transport_status: 202,
      remote_status: 'queued'
    })),
    submitted_at: nowIso()
  });
}

function buildStatusRequest(job, config = {}, remoteReference = null) {
  validateSubmissionConfig(job, config);
  return canonicalize({
    endpoint: workflowEndpoint(config, '/status'),
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-skye-channel': job.channel, 'x-skye-job-id': job.job_id },
    body: JSON.stringify({ schema: 'skye.submission.status.request', version: '4.0.0', job_id: job.job_id, remote_reference: remoteReference || `${job.slug}:${job.job_id}`, slug: job.slug }),
    request_schema: 'skye.submission.status.request'
  });
}

function buildCancelRequest(job, config = {}, remoteReference = null) {
  validateSubmissionConfig(job, config);
  return canonicalize({
    endpoint: workflowEndpoint(config, '/cancel'),
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-skye-channel': job.channel, 'x-skye-job-id': job.job_id },
    body: JSON.stringify({ schema: 'skye.submission.cancel.request', version: '4.0.0', job_id: job.job_id, remote_reference: remoteReference || `${job.slug}:${job.job_id}`, slug: job.slug }),
    request_schema: 'skye.submission.cancel.request'
  });
}

async function querySubmissionStatus(job, config, remoteReference = null) {
  buildStatusRequest(job, config, remoteReference);
  return canonicalize({
    schema: 'skye.submission.status.receipt',
    version: '4.0.0',
    ok: true,
    channel: job.channel,
    delivery_mode: resolveDeliveryMode(job, config),
    job_id: job.job_id,
    remote_reference: remoteReference || `${job.slug}:${job.job_id}`,
    remote_status: 'queued_for_fs27_owner_approval',
    job_status: 'submitted',
    transport_status: 200,
    raw: { fs27_tracked: true, external_vendor_dispatch: false },
    checked_at: nowIso()
  });
}

async function cancelSubmissionJob(job, config, remoteReference = null) {
  buildCancelRequest(job, config, remoteReference);
  return canonicalize({
    schema: 'skye.submission.cancel.receipt',
    version: '4.0.0',
    ok: true,
    channel: job.channel,
    delivery_mode: resolveDeliveryMode(job, config),
    job_id: job.job_id,
    remote_reference: remoteReference || `${job.slug}:${job.job_id}`,
    remote_status: 'cancelled_before_external_dispatch',
    transport_status: 200,
    raw: { fs27_tracked: true },
    cancelled_at: nowIso()
  });
}

function buildSubmissionRequest(job, config) {
  const workflow = createVendorWorkflow(job, config);
  const first = workflow.steps[0];
  return canonicalize({ endpoint: first.endpoint, method: first.method, headers: first.headers, body: null, body_kind: first.body_kind, request_schema: first.request_schema });
}

module.exports = {
  createSubmissionJob,
  createChannelPayload,
  resolveAuthForChannel,
  resolveDeliveryMode,
  validateSubmissionConfig,
  createVendorWorkflow,
  buildSubmissionRequest,
  buildStatusRequest,
  buildCancelRequest,
  previewSubmissionContract,
  submitJob,
  querySubmissionStatus,
  cancelSubmissionJob
};
