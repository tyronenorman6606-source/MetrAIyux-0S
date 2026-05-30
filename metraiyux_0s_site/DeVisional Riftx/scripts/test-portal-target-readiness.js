const { createVendorPortalProfile, validateVendorPortalProfile, portalTargetSummary } = require('../platform/vendor-portal-profiles');
const { fail, ok } = require('./lib');

(() => {
  const env = {
    SKYE_OPERATOR: 'Skyes Over London',
    SKYE_PORTAL_DEFAULT_PASSWORD: 'portal-test-password',
    SKYE_SUBMIT_APPLE_URL: 'https://publisher.apple.example',
    SKYE_SUBMIT_APPLE_PORTAL_BASE_URL: 'https://publisher.apple.example'
  };
  const profile = createVendorPortalProfile('apple_books', env, env.SKYE_SUBMIT_APPLE_URL);
  const validation = validateVendorPortalProfile(profile);
  const summary = portalTargetSummary('apple_books', profile);
  if (!validation.ok) fail('[portal-target-readiness] FAIL :: validation');
  if (summary.target_mode !== 'external' || !summary.target.secure) fail('[portal-target-readiness] FAIL :: target-summary');
  ok('[portal-target-readiness] PASS');
})();
