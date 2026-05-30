const { canonicalize } = require('./export-import');

const CHANNEL_ENV = {
  apple_books: 'APPLE',
  kobo: 'KOBO',
  kdp_ebook: 'KDP_EBOOK',
  kdp_print_prep: 'KDP_PRINT'
};

const OFFICIAL_PORTAL_BASES = canonicalize({
  apple_books: 'fs27://apple-books-owner-approval',
  kobo: 'fs27://kobo-owner-approval',
  kdp_ebook: 'fs27://kdp-ebook-owner-approval',
  kdp_print_prep: 'fs27://kdp-print-owner-approval'
});

const DEFAULT_SELECTORS = canonicalize({
  operator: '[data-fs27-operator]',
  password: '[data-fs27-gate-session]',
  login_submit: '[data-fs27-verify]',
  title: '[data-package-title]',
  slug: '[data-package-slug]',
  draft_submit: '[data-owner-approval-queue]',
  package_file: '[data-package-file]',
  upload_submit: '[data-package-register]',
  attach_submit: '[data-package-attach]',
  attach_status: '[data-package-status]',
  submit_final: '[data-submit-after-owner-approval]',
  submission_reference: '[data-submission-reference]',
  status_sync: '[data-status-sync]',
  cancel_job: '[data-cancel-job]',
  remote_status: '[data-remote-status]'
});

function normalizeBase(url) { return String(url || '').replace(/\/+$/, ''); }
function resolveDefaultPortalBase(channel) { return OFFICIAL_PORTAL_BASES[channel] || 'fs27://publishing-owner-approval'; }

function classifyPortalTarget(url) {
  const text = String(url || '');
  if (text.startsWith('fs27://')) {
    return canonicalize({ ok: true, protocol: 'fs27', hostname: text.replace(/^fs27:\/\//, ''), port: '', origin: text, target_mode: 'fs27-ledger', secure: true });
  }
  try {
    const value = new URL(text);
    return canonicalize({ ok: true, protocol: value.protocol.replace(/:$/, ''), hostname: value.hostname, port: value.port || '', origin: value.origin, target_mode: 'external-disabled', secure: value.protocol === 'https:' });
  } catch {
    return canonicalize({ ok: false, target_mode: 'invalid', origin: '', hostname: '', port: '', protocol: '', secure: false });
  }
}

function portalTargetSummary(channel, profile) {
  const target = classifyPortalTarget(profile?.portal_base_url || '');
  return canonicalize({
    schema: 'skye.vendor.portal.target',
    version: '4.0.0',
    channel,
    target_mode: target.target_mode,
    target,
    browser_engine: profile?.browser?.engine || '',
    login_url: profile?.paths?.login || '',
    status_url: profile?.paths?.status || '',
    external_vendor_dispatch: false,
    auth_owner: 'FS27/SkyGate/Free99 shared gate'
  });
}

function createVendorPortalProfile(channel, env = process.env, fallbackBaseUrl = '') {
  const baseUrl = normalizeBase(fallbackBaseUrl || env.SKYE_SUBMIT_FS27_URL || resolveDefaultPortalBase(channel));
  return canonicalize({
    schema: 'skye.vendor.portal.profile',
    version: '4.0.0',
    channel,
    portal_base_url: baseUrl,
    paths: {
      login: `${baseUrl}/gate/verify`,
      draft: `${baseUrl}/package/draft`,
      upload: `${baseUrl}/package/upload`,
      review: `${baseUrl}/owner-approval`,
      status: `${baseUrl}/status`
    },
    selectors: DEFAULT_SELECTORS,
    credentials: {
      operator: env.SKYE_OPERATOR || 'FS27 Operator',
      password: '',
      password_owner: 'FS27/SkyGate session; no app portal password stored'
    },
    browser: {
      engine: 'fs27-ledger',
      headless: true,
      storage_state_path: '',
      ignore_https_errors: false
    }
  });
}

function validateVendorPortalProfile(profile) {
  const issues = [];
  if (!profile.portal_base_url) issues.push('portal-base-url-missing');
  const target = classifyPortalTarget(profile.portal_base_url);
  if (!target.ok) issues.push('portal-base-invalid');
  if (target.target_mode !== 'fs27-ledger') issues.push('external-portal-disabled');
  if (!profile.credentials || !profile.credentials.operator) issues.push('operator-missing');
  return canonicalize({ schema: 'skye.vendor.portal.profile.validation', version: '4.0.0', ok: issues.length === 0, issues, profile, target });
}

module.exports = { CHANNEL_ENV, OFFICIAL_PORTAL_BASES, DEFAULT_SELECTORS, classifyPortalTarget, portalTargetSummary, createVendorPortalProfile, validateVendorPortalProfile, resolveDefaultPortalBase };
