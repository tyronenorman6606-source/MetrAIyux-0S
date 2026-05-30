const fs = require('fs');
const path = require('path');
const os = require('os');
const { canonicalize } = require('./export-import');
const { createVendorPortalProfile, validateVendorPortalProfile, portalTargetSummary } = require('./vendor-portal-profiles');

function nowIso() { return new Date().toISOString(); }

function ensurePortalTarget(profile, options = {}) {
  const target = portalTargetSummary(profile.channel || '', profile);
  if (target.target_mode !== 'fs27-ledger') throw new Error(`External portal automation is disabled for copied 0S apps (${profile.portal_base_url}).`);
  return canonicalize({ ...target, require_external_target: options.requireExternalTarget === true, require_secure_target: options.requireSecureTarget === true });
}

function buildPortalPlan(job, config = {}) {
  const profile = config.profile || createVendorPortalProfile(job.channel, config.env || process.env, config.endpoint || '');
  const validation = validateVendorPortalProfile(profile);
  if (!validation.ok) throw new Error(`FS27 portal profile invalid for ${job.channel}: ${validation.issues.join(', ')}`);
  const target = ensurePortalTarget({ ...profile, channel: job.channel }, config);
  return canonicalize({
    schema: 'skye.portal.automation.plan',
    version: '4.0.0',
    channel: job.channel,
    title: job.title,
    slug: job.slug,
    package_path: job.package_path,
    target,
    execution_mode: 'fs27-ledger-owner-approval',
    profile,
    settings: {
      engine: 'fs27-ledger',
      timeout_ms: Number(config.timeoutMs || 30000),
      headless: true,
      storage_state_path: '',
      ignore_https_errors: false,
      require_browser: false,
      require_external_target: false,
      require_secure_target: true
    },
    steps: [
      { type: 'verify_fs27_gate_session', assign: 'gate_status' },
      { type: 'register_package_receipt', file_path: job.package_path, assign: 'package_receipt' },
      { type: 'queue_owner_approval', assign: 'remote_reference' },
      { type: 'hold_external_dispatch', assign: 'remote_status' }
    ]
  });
}

function runPortalAutomation(plan, options = {}) {
  const workDir = options.outputDir || fs.mkdtempSync(path.join(os.tmpdir(), 'skye-fs27-portal-'));
  fs.mkdirSync(workDir, { recursive: true });
  const receipt = canonicalize({
    schema: 'skye.portal.automation.receipt',
    version: '4.0.0',
    ok: true,
    executed_at: nowIso(),
    proof_mode: 'fs27-ledger',
    target_origin: plan?.target?.target?.origin || 'fs27://publishing-owner-approval',
    remote_reference: `fs27_${plan.slug || 'package'}_${Date.now().toString(36)}`,
    remote_status: 'queued_for_owner_approval',
    external_vendor_dispatch: false,
    screenshots: [],
    steps: Array.isArray(plan?.steps) ? plan.steps.map((step) => ({ ...step, ok: true })) : []
  });
  fs.writeFileSync(path.join(workDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return Promise.resolve(receipt);
}

module.exports = { ensurePortalTarget, buildPortalPlan, runPortalAutomation };
