import health from '../netlify/functions/health.js';
import authIntrospect from '../netlify/functions/auth-introspect.js';
import authSignup from '../netlify/functions/auth-signup.js';
import authLogin from '../netlify/functions/auth-login.js';
import authChangePassword from '../netlify/functions/auth-change-password.js';
import authForgotPassword from '../netlify/functions/auth-forgot-password.js';
import authResetPassword from '../netlify/functions/auth-reset-password.js';
import authResendVerification from '../netlify/functions/auth-resend-verification.js';
import authVerifyEmail from '../netlify/functions/auth-verify-email.js';
import authCard from '../netlify/functions/auth-card.js';
import gatewayChat from '../netlify/functions/gateway-chat.js';
import gatewayStream from '../netlify/functions/gateway-stream.js';
import adminLogin from '../netlify/functions/admin-login.js';
import adminCustomers from '../netlify/functions/admin-customers.js';
import adminClientProvisioning from '../netlify/functions/admin-client-provisioning.js';
import adminPlatformEvents from '../netlify/functions/admin-platform-events.js';
import adminPlatformRoutexEvents from '../netlify/functions/admin-platform-routex-events.js';
import adminPentestCards from '../netlify/functions/admin-pentest-cards.js';
import platformEventIngest from '../netlify/functions/platform-event-ingest.js';
import pentestCardRequest from '../netlify/functions/pentest-card-request.js';
import sessionToken from '../netlify/functions/session-token.js';
import authTokenIssue from '../netlify/functions/auth-token-issue.js';
import appSpineLink from '../netlify/functions/app-spine-link.js';
import oauthJwks from '../netlify/functions/oauth-jwks.js';
import openidConfiguration from '../netlify/functions/openid-configuration.js';
import oauthWellKnown from '../netlify/functions/oauth-well-known.js';
import skyepayOffers from '../netlify/functions/skyepay-offers.js';
import skyepayCheckout from '../netlify/functions/skyepay-checkout.js';
import skyepayRefund from '../netlify/functions/skyepay-refund.js';
import skyepayStatus from '../netlify/functions/skyepay-status.js';
import stripeWebhook from '../netlify/functions/stripe-webhook.js';
import adminSkyePayLedger from '../netlify/functions/admin-skyepay-ledger.js';
import skysecureApi from '../netlify/functions/skysecure-api.js';
import vantacoreCrm from '../netlify/functions/vantacore-crm.js';
import contactIntake from '../netlify/functions/contact-intake.js';
import clientAppIntake from '../netlify/functions/client-app-intake.js';
import northstarHealth from '../netlify/functions/northstar-health.js';
import northstarAuthLogin from '../netlify/functions/northstar-auth-login.js';
import northstarAuthSession from '../netlify/functions/northstar-auth-session.js';
import northstarAuthLogout from '../netlify/functions/northstar-auth-logout.js';
import northstarWorkspaceSync from '../netlify/functions/northstar-workspace-sync.js';
import northstarWorkspaceSettings from '../netlify/functions/northstar-workspace-settings.js';
import northstarWorkspaceUsers from '../netlify/functions/northstar-workspace-users.js';
import northstarWorkspaceAudit from '../netlify/functions/northstar-workspace-audit.js';
import northstarWorkspaceBackups from '../netlify/functions/northstar-workspace-backups.js';
import northstarOperatorProvision from '../netlify/functions/northstar-operator-provision.js';
import northstarOperatorWorkspaces from '../netlify/functions/northstar-operator-workspaces.js';
import { requireGateAuth } from '../netlify/functions/_lib/authz.js';
import { buildCors, json as httpJson } from '../netlify/functions/_lib/http.js';
import { handleRuntimeEventQueue, withRuntimeLedger } from './runtime-observer.mjs';
import handleSkyeNetDeployRequest from './skynet-deploy-api.mjs';
import '../generators/shared/skye-generators-core.js';

const ROUTES = [
  ['GET', '/health', health],
  ['GET', '/.netlify/functions/health', health],
  ['POST', '/auth/signup', authSignup],
  ['POST', '/.netlify/functions/auth-signup', authSignup],
  ['POST', '/auth/login', authLogin],
  ['POST', '/.netlify/functions/auth-login', authLogin],
  ['POST', '/auth/change-password', authChangePassword],
  ['POST', '/.netlify/functions/auth-change-password', authChangePassword],
  ['POST', '/auth/forgot-password', authForgotPassword],
  ['POST', '/.netlify/functions/auth-forgot-password', authForgotPassword],
  ['GET', '/auth/reset-password', authResetPassword],
  ['POST', '/auth/reset-password', authResetPassword],
  ['GET', '/.netlify/functions/auth-reset-password', authResetPassword],
  ['POST', '/.netlify/functions/auth-reset-password', authResetPassword],
  ['POST', '/auth/resend-verification', authResendVerification],
  ['POST', '/.netlify/functions/auth-resend-verification', authResendVerification],
  ['GET', '/auth/verify-email', authVerifyEmail],
  ['GET', '/.netlify/functions/auth-verify-email', authVerifyEmail],
  ['GET', '/auth-card', authCard],
  ['POST', '/auth-card', authCard],
  ['GET', '/.netlify/functions/auth-card', authCard],
  ['POST', '/.netlify/functions/auth-card', authCard],
  ['POST', '/gateway-chat', gatewayChat],
  ['POST', '/gateway/chat', gatewayChat],
  ['POST', '/api/kaixu/chat', gatewayChat],
  ['POST', '/.netlify/functions/gateway-chat', gatewayChat],
  ['POST', '/gateway-stream', gatewayStream],
  ['POST', '/gateway/stream', gatewayStream],
  ['POST', '/api/kaixu/stream', gatewayStream],
  ['POST', '/.netlify/functions/gateway-stream', gatewayStream],
  ['POST', '/auth-introspect', authIntrospect],
  ['POST', '/auth/introspect', authIntrospect],
  ['POST', '/.netlify/functions/auth-introspect', authIntrospect],
  ['POST', '/admin/login', adminLogin],
  ['POST', '/.netlify/functions/admin-login', adminLogin],
  ['GET', '/admin/customers', adminCustomers],
  ['POST', '/admin/customers', adminCustomers],
  ['PATCH', '/admin/customers', adminCustomers],
  ['GET', '/.netlify/functions/admin-customers', adminCustomers],
  ['POST', '/.netlify/functions/admin-customers', adminCustomers],
  ['PATCH', '/.netlify/functions/admin-customers', adminCustomers],
  ['POST', '/admin/client-provisioning', adminClientProvisioning],
  ['POST', '/.netlify/functions/admin-client-provisioning', adminClientProvisioning],
  ['GET', '/admin/platform-events', adminPlatformEvents],
  ['GET', '/.netlify/functions/admin-platform-events', adminPlatformEvents],
  ['GET', '/admin/platform-routex-events', adminPlatformRoutexEvents],
  ['GET', '/.netlify/functions/admin-platform-routex-events', adminPlatformRoutexEvents],
  ['GET', '/admin/pentest-cards', adminPentestCards],
  ['POST', '/admin/pentest-cards', adminPentestCards],
  ['GET', '/.netlify/functions/admin-pentest-cards', adminPentestCards],
  ['POST', '/.netlify/functions/admin-pentest-cards', adminPentestCards],
  ['POST', '/platform/events', platformEventIngest],
  ['POST', '/.netlify/functions/platform-event-ingest', platformEventIngest],
  ['OPTIONS', '/contact/intake', contactIntake],
  ['GET', '/contact/intake', contactIntake],
  ['POST', '/contact/intake', contactIntake],
  ['PATCH', '/contact/intake', contactIntake],
  ['OPTIONS', '/api/contact/intake', contactIntake],
  ['GET', '/api/contact/intake', contactIntake],
  ['POST', '/api/contact/intake', contactIntake],
  ['PATCH', '/api/contact/intake', contactIntake],
  ['OPTIONS', '/admin/contact-intake', contactIntake],
  ['GET', '/admin/contact-intake', contactIntake],
  ['PATCH', '/admin/contact-intake', contactIntake],
  ['OPTIONS', '/.netlify/functions/contact-intake', contactIntake],
  ['GET', '/.netlify/functions/contact-intake', contactIntake],
  ['POST', '/.netlify/functions/contact-intake', contactIntake],
  ['PATCH', '/.netlify/functions/contact-intake', contactIntake],
  ['OPTIONS', '/client-app/intake', clientAppIntake],
  ['POST', '/client-app/intake', clientAppIntake],
  ['OPTIONS', '/api/client-app/intake', clientAppIntake],
  ['POST', '/api/client-app/intake', clientAppIntake],
  ['OPTIONS', '/.netlify/functions/client-app-intake', clientAppIntake],
  ['POST', '/.netlify/functions/client-app-intake', clientAppIntake],
  ['GET', '/pentest/card-request', pentestCardRequest],
  ['POST', '/pentest/card-request', pentestCardRequest],
  ['GET', '/.netlify/functions/pentest-card-request', pentestCardRequest],
  ['POST', '/.netlify/functions/pentest-card-request', pentestCardRequest],
  ['POST', '/session/token', sessionToken],
  ['POST', '/.netlify/functions/session-token', sessionToken],
  ['POST', '/auth/tokens/issue', authTokenIssue],
  ['POST', '/.netlify/functions/auth-token-issue', authTokenIssue],
  ['OPTIONS', '/app-spine/link', appSpineLink],
  ['POST', '/app-spine/link', appSpineLink],
  ['OPTIONS', '/auth/app-spine/link', appSpineLink],
  ['POST', '/auth/app-spine/link', appSpineLink],
  ['OPTIONS', '/.netlify/functions/app-spine-link', appSpineLink],
  ['POST', '/.netlify/functions/app-spine-link', appSpineLink],
  ['GET', '/oauth/jwks', oauthJwks],
  ['GET', '/.netlify/functions/oauth-jwks', oauthJwks],
  ['GET', '/.well-known/jwks.json', oauthJwks],
  ['GET', '/.well-known/openid-configuration', openidConfiguration],
  ['GET', '/.netlify/functions/openid-configuration', openidConfiguration],
  ['GET', '/oauth/.well-known/openid-configuration', oauthWellKnown],
  ['GET', '/.netlify/functions/oauth-well-known', oauthWellKnown],
  ['GET', '/skyepay/offers', skyepayOffers],
  ['GET', '/.netlify/functions/skyepay-offers', skyepayOffers],
  ['POST', '/skyepay/checkout', skyepayCheckout],
  ['POST', '/.netlify/functions/skyepay-checkout', skyepayCheckout],
  ['POST', '/skyepay/refund', skyepayRefund],
  ['POST', '/.netlify/functions/skyepay-refund', skyepayRefund],
  ['GET', '/skyepay/status', skyepayStatus],
  ['GET', '/.netlify/functions/skyepay-status', skyepayStatus],
  ['POST', '/stripe-webhook', stripeWebhook],
  ['POST', '/skyepay/stripe-webhook', stripeWebhook],
  ['POST', '/.netlify/functions/stripe-webhook', stripeWebhook],
  ['GET', '/admin/skyepay-ledger', adminSkyePayLedger],
  ['PATCH', '/admin/skyepay-ledger', adminSkyePayLedger],
  ['GET', '/.netlify/functions/admin-skyepay-ledger', adminSkyePayLedger],
  ['PATCH', '/.netlify/functions/admin-skyepay-ledger', adminSkyePayLedger],
  ['GET', '/skysecure/health', skysecureApi],
  ['GET', '/skysecure/proof', skysecureApi],
  ['GET', '/skysecure/vaultos', skysecureApi],
  ['GET', '/skysecure/vaultos/health', skysecureApi],
  ['GET', '/skysecure/vaultos/proof', skysecureApi],
  ['GET', '/skysecure/vaultos/commands', skysecureApi],
  ['GET', '/skysecure/vaultos/inventory', skysecureApi],
  ['GET', '/skysecure/vaultos/search', skysecureApi],
  ['GET', '/skysecure/vaultos/restore-points', skysecureApi],
  ['GET', '/skysecure/vaultos/audit', skysecureApi],
  ['GET', '/skysecure/packs', skysecureApi],
  ['POST', '/skysecure/packs', skysecureApi],
  ['GET', '/skysecure/grants', skysecureApi],
  ['POST', '/skysecure/grants', skysecureApi],
  ['GET', '/skysecure/events', skysecureApi],
  ['POST', '/skysecure/events', skysecureApi],
  ['GET', '/.netlify/functions/skysecure-api', skysecureApi],
  ['POST', '/.netlify/functions/skysecure-api', skysecureApi],
  ['GET', '/northstar/health', northstarHealth],
  ['HEAD', '/northstar/health', northstarHealth],
  ['GET', '/.netlify/functions/northstar-health', northstarHealth],
  ['HEAD', '/.netlify/functions/northstar-health', northstarHealth],
  ['POST', '/northstar/auth/login', northstarAuthLogin],
  ['POST', '/.netlify/functions/northstar-auth-login', northstarAuthLogin],
  ['GET', '/northstar/auth/session', northstarAuthSession],
  ['GET', '/.netlify/functions/northstar-auth-session', northstarAuthSession],
  ['POST', '/northstar/auth/logout', northstarAuthLogout],
  ['POST', '/.netlify/functions/northstar-auth-logout', northstarAuthLogout],
  ['GET', '/northstar/workspace/sync', northstarWorkspaceSync],
  ['POST', '/northstar/workspace/sync', northstarWorkspaceSync],
  ['GET', '/.netlify/functions/northstar-workspace-sync', northstarWorkspaceSync],
  ['POST', '/.netlify/functions/northstar-workspace-sync', northstarWorkspaceSync],
  ['GET', '/northstar/workspace/settings', northstarWorkspaceSettings],
  ['POST', '/northstar/workspace/settings', northstarWorkspaceSettings],
  ['GET', '/.netlify/functions/northstar-workspace-settings', northstarWorkspaceSettings],
  ['POST', '/.netlify/functions/northstar-workspace-settings', northstarWorkspaceSettings],
  ['GET', '/northstar/workspace/users', northstarWorkspaceUsers],
  ['POST', '/northstar/workspace/users', northstarWorkspaceUsers],
  ['GET', '/.netlify/functions/northstar-workspace-users', northstarWorkspaceUsers],
  ['POST', '/.netlify/functions/northstar-workspace-users', northstarWorkspaceUsers],
  ['GET', '/northstar/workspace/audit', northstarWorkspaceAudit],
  ['GET', '/.netlify/functions/northstar-workspace-audit', northstarWorkspaceAudit],
  ['GET', '/northstar/workspace/backups', northstarWorkspaceBackups],
  ['GET', '/.netlify/functions/northstar-workspace-backups', northstarWorkspaceBackups],
  ['POST', '/northstar/operator/provision', northstarOperatorProvision],
  ['POST', '/.netlify/functions/northstar-operator-provision', northstarOperatorProvision],
  ['GET', '/northstar/operator/workspaces', northstarOperatorWorkspaces],
  ['GET', '/.netlify/functions/northstar-operator-workspaces', northstarOperatorWorkspaces],
  ['OPTIONS', '/api/generators/onboarding-draft', handleGeneratorOnboardingDraft],
  ['GET', '/api/generators/onboarding-draft', handleGeneratorOnboardingDraft],
  ['POST', '/api/generators/onboarding-draft', handleGeneratorOnboardingDraft],
  ['OPTIONS', '/generators/onboarding-draft', handleGeneratorOnboardingDraft],
  ['GET', '/generators/onboarding-draft', handleGeneratorOnboardingDraft],
  ['POST', '/generators/onboarding-draft', handleGeneratorOnboardingDraft],
  ['OPTIONS', '/deploy/status', handleSkyeNetDeployRequest],
  ['GET', '/deploy/status', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/routes', handleSkyeNetDeployRequest],
  ['GET', '/deploy/routes', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/workspace', handleSkyeNetDeployRequest],
  ['GET', '/deploy/workspace', handleSkyeNetDeployRequest],
  ['POST', '/deploy/workspace', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/dashboard', handleSkyeNetDeployRequest],
  ['GET', '/deploy/dashboard', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/env', handleSkyeNetDeployRequest],
  ['GET', '/deploy/env', handleSkyeNetDeployRequest],
  ['POST', '/deploy/env', handleSkyeNetDeployRequest],
  ['DELETE', '/deploy/env', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-upload', handleSkyeNetDeployRequest],
  ['PUT', '/deploy/source-upload', handleSkyeNetDeployRequest],
  ['POST', '/deploy/source-upload', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-index', handleSkyeNetDeployRequest],
  ['PUT', '/deploy/source-index', handleSkyeNetDeployRequest],
  ['POST', '/deploy/source-index', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-archive', handleSkyeNetDeployRequest],
  ['PUT', '/deploy/source-archive', handleSkyeNetDeployRequest],
  ['POST', '/deploy/source-archive', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-archive-link', handleSkyeNetDeployRequest],
  ['POST', '/deploy/source-archive-link', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-complete', handleSkyeNetDeployRequest],
  ['POST', '/deploy/source-complete', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-manifest', handleSkyeNetDeployRequest],
  ['GET', '/deploy/source-manifest', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-tree', handleSkyeNetDeployRequest],
  ['GET', '/deploy/source-tree', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-file', handleSkyeNetDeployRequest],
  ['GET', '/deploy/source-file', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/source-search', handleSkyeNetDeployRequest],
  ['GET', '/deploy/source-search', handleSkyeNetDeployRequest],
['OPTIONS', '/deploy/source-download', handleSkyeNetDeployRequest],
['GET', '/deploy/source-download', handleSkyeNetDeployRequest],
['OPTIONS', '/deploy/source-codebases', handleSkyeNetDeployRequest],
['GET', '/deploy/source-codebases', handleSkyeNetDeployRequest],
['OPTIONS', '/deploy/source-transfer', handleSkyeNetDeployRequest],
['POST', '/deploy/source-transfer', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/functions-upload', handleSkyeNetDeployRequest],
  ['PUT', '/deploy/functions-upload', handleSkyeNetDeployRequest],
  ['POST', '/deploy/functions-upload', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/functions-complete', handleSkyeNetDeployRequest],
  ['POST', '/deploy/functions-complete', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/functions-status', handleSkyeNetDeployRequest],
  ['GET', '/deploy/functions-status', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/forms-policy', handleSkyeNetDeployRequest],
  ['GET', '/deploy/forms-policy', handleSkyeNetDeployRequest],
  ['POST', '/deploy/forms-policy', handleSkyeNetDeployRequest],
  ['PATCH', '/deploy/forms-policy', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/forms-inbox', handleSkyeNetDeployRequest],
  ['GET', '/deploy/forms-inbox', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/forms-submission', handleSkyeNetDeployRequest],
  ['GET', '/deploy/forms-submission', handleSkyeNetDeployRequest],
  ['PATCH', '/deploy/forms-submission', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/forms-file', handleSkyeNetDeployRequest],
  ['GET', '/deploy/forms-file', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/forms-notify', handleSkyeNetDeployRequest],
  ['POST', '/deploy/forms-notify', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/receipts', handleSkyeNetDeployRequest],
  ['GET', '/deploy/receipts', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/rollback', handleSkyeNetDeployRequest],
  ['POST', '/deploy/rollback', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/observability', handleSkyeNetDeployRequest],
  ['GET', '/deploy/observability', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/cost-model', handleSkyeNetDeployRequest],
  ['GET', '/deploy/cost-model', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/support', handleSkyeNetDeployRequest],
  ['GET', '/deploy/support', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/export', handleSkyeNetDeployRequest],
  ['GET', '/deploy/export', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/init', handleSkyeNetDeployRequest],
  ['POST', '/deploy/init', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/upload', handleSkyeNetDeployRequest],
  ['PUT', '/deploy/upload', handleSkyeNetDeployRequest],
  ['POST', '/deploy/upload', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/complete', handleSkyeNetDeployRequest],
  ['POST', '/deploy/complete', handleSkyeNetDeployRequest],
  ['OPTIONS', '/deploy/route', handleSkyeNetDeployRequest],
  ['POST', '/deploy/route', handleSkyeNetDeployRequest]
];

function routeKey(method, pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return `${method.toUpperCase()} ${normalized}`;
}

const routeMap = new Map(ROUTES.map(([method, path, handler]) => [routeKey(method, path), handler]));

const ASSET_ALIASES = new Map([
  ['/pay', '/skyepay.html'],
  ['/store', '/skyepay-store.html'],
  ['/vault-agent', '/skyevault-agent.html'],
  ['/connectlog-relay13', '/connectlog-relay13-gate.html'],
  ['/vantacore-service-crm', '/vantacore-service-crm-gate.html'],
  ['/vantacore-crm', '/vantacore-crm-dashboard.html'],
  ['/vantacore-service-crm/dashboard', '/vantacore-crm-dashboard.html'],
  ['/gateway/skyepay', '/skyepay.html'],
  ['/skyepay/store', '/skyepay-store.html'],
  ['/skyepay/api', '/skyepay-api.html'],
  ['/skyepay/api.json', '/skyepay-api.json'],
  ['/platforms.html', '/gate-map.html'],
  ['/Platforms-Apps-Infrastructure', '/gate-map.html'],
  ['/Platforms-Apps-Infrastructure/', '/gate-map.html'],
  ['/Services/WebBuilds.html', '/index.html'],
  ['/about.html', '/index.html'],
  ['/contact.html', '/index.html'],
  ['/blog.html', '/index.html'],
  ['/network.html', '/index.html'],
  ['/SkyeDocx/homepage.html', '/index.html'],
  ['/kAIxu/RequestKaixuAPIKey.html', '/key-generator.html'],
  ['/gateway/dashboard.html', '/dashboard.html'],
  ['/skyefuelstation', '/index.html'],
  ['/skyefuelstation/', '/index.html']
]);

const BLOCKED_LOCAL_ASSET_SEGMENTS = new Set([
  '.wrangler',
  'cloudflare',
  'docs',
  'gate-upgrades',
  'netlify',
  'node_modules',
  'runtime',
  'scripts',
  'smoke',
  'sql',
  'src',
  'tests'
]);

const BLOCKED_LOCAL_ASSET_FILENAMES = new Set([
  '.assetsignore',
  '.gitignore',
  '.netlifyignore',
  '.node-version',
  '.nvmrc',
  '_headers',
  '_redirects',
  'deno.lock',
  'env.template',
  'env.ultimate.template',
  'mcp_tooling_receipt.json',
  'netlify.toml',
  'package-lock.json',
  'package.json',
  'readme.md',
  'readme.txt',
  'skygatefs27_citadeldb_bridge.md',
  'the_gate_map.md',
  'tsconfig.json',
  'wrangler.jsonc',
  'wrangler.toml'
]);

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

function cleanEmail(value, max = 240) {
  return cleanText(value, max).toLowerCase();
}

function generatorSkyEmailDomain(env) {
  return cleanText(env.ZERO_OS_SKYEMAIL_DOMAIN || env.SKYMAIL_PRIMARY_DOMAIN || env.INBOUND_DOMAIN || env.SKYE_EMAIL_DOMAIN || 'solenterprises.org', 120).toLowerCase();
}

async function handleGeneratorOnboardingDraft(request, context = {}) {
  const cors = buildCors(request);
  if (request.method === 'OPTIONS') return httpJson(200, { ok: true }, cors);
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : Object.fromEntries(url.searchParams.entries());
  const generatorCore = globalThis.SkyeGateGenerators;
  const email = cleanEmail(body.email || body.login_email || body.recovery_email);
  const displayName = cleanText(body.display_name || body.displayName || body.name || email.split('@')[0] || '0S user', 120);
  const phone = cleanText(body.phone || body.phone_number || body.mobile, 40);
  const profileType = cleanText(body.profile_type || body.profileType || body.account_type || 'member', 60).toLowerCase();
  const requestedSkyEmail = cleanEmail(body.skyemail || body.skyEmail || body.skye_email || body.requested_email);
  const requestedParts = requestedSkyEmail.includes('@') ? requestedSkyEmail.split('@') : [];
  const identity = generatorCore.createSkyeIdDraft({
    name: displayName,
    idNumber: body.skye_id || body.skyeId || body.identity_id || '',
    profileType,
    phone,
    reason: body.reason || '0s-gate-draft'
  });
  const skyemail = generatorCore.createSkyEmailClaim({
    email: requestedSkyEmail,
    localPart: body.local_part || body.localPart || requestedParts[0] || '',
    domain: body.domain || requestedParts.slice(1).join('@') || body.default_domain || body.defaultDomain || generatorSkyEmailDomain(context.env || {}),
    display_name: displayName,
    recovery_email: email,
    phone,
    profile_type: profileType,
    reason: body.reason || '0s-gate-draft'
  });
  return httpJson(200, {
    ok: true,
    schema: 'skygatefs27.generators.onboarding-draft.v1',
    generated_at: new Date().toISOString(),
    generator_service: {
      owner: 'SkyeGate FS27',
      core: 'skye-generators-core',
      core_version: generatorCore.version,
      core_asset: '/generators/shared/skye-generators-core.js',
      identity_app: '/generators/Skye-ID/',
      skyemail_app: '/generators/SKYEMAIL-GEN/'
    },
    identity,
    skyemail
  }, cors);
}

function safeDecodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function isBlockedLocalAssetPath(pathname) {
  const decoded = safeDecodePathname(pathname).replace(/\\/g, '/').toLowerCase();
  const segments = decoded.split('/').filter(Boolean);
  if (!segments.length) return false;
  const filename = segments[segments.length - 1];
  if (BLOCKED_LOCAL_ASSET_FILENAMES.has(filename)) return true;
  return segments.some((segment) => BLOCKED_LOCAL_ASSET_SEGMENTS.has(segment));
}

function functionNameFromPath(pathname) {
  const netlify = pathname.match(/\/\.netlify\/functions\/([^/]+)/i);
  if (netlify) return netlify[1];
  const parts = pathname.split('/').filter(Boolean);
  return parts.slice(0, 2).join('/') || 'root';
}

function deploymentBucket(env) {
  return env.DEPLOYMENT_ASSET_BUCKET || env.DEPLOYMENT_ASSETS_BUCKET || env.ZERO_OS_DEPLOYMENT_BUCKET || null;
}

function contentTypeForPath(pathname) {
  const path = pathname.toLowerCase();
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (path.endsWith('.xml')) return 'application/xml; charset=utf-8';
  return 'application/octet-stream';
}

function cacheControlForDeploymentAsset(pathname) {
  const path = String(pathname || '').toLowerCase();
  if (path.endsWith('.html') || path.endsWith('.json') || path.endsWith('.xml') || path.endsWith('.txt')) {
    return 'public, max-age=60';
  }
  return 'public, max-age=31536000, immutable';
}

function assetPrefix(routeRecord) {
  const explicit = cleanText(routeRecord?.asset_prefix || '', 700).replace(/^\/+/, '').replace(/\/+$/, '');
  if (explicit) return `${explicit}/`;
  const project = cleanText(routeRecord?.project_id || 'unknown-project', 180);
  const deployment = cleanText(routeRecord?.active_deployment_id || 'active', 180);
  return `deployments/${project}/${deployment}/`;
}

function assetCandidates(pathname) {
  const cleanPath = pathname.replace(/^\/+/, '');
  if (!cleanPath || cleanPath.endsWith('/')) return [`${cleanPath}index.html`];
  const candidates = [cleanPath];
  if (!cleanPath.includes('.')) candidates.push(`${cleanPath}/index.html`);
  return candidates;
}

function isDeploymentRuleAssetPath(pathname) {
  const clean = String(pathname || '').replace(/^\/+/, '').toLowerCase();
  return clean === '_redirects' || clean === '_headers' || clean === 'netlify.toml';
}

async function deploymentAssetText(bucket, prefix, filename, maxBytes = 128 * 1024) {
  const object = await bucket?.get?.(`${prefix}${filename}`.replace(/\/+/g, '/')).catch(() => null);
  if (!object) return '';
  const size = Number(object.size || 0);
  if (size > maxBytes) return '';
  if (typeof object.text === 'function') {
    const text = await object.text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }
  if (object.body) {
    const text = await new Response(object.body).text();
    return text.length > maxBytes ? text.slice(0, maxBytes) : text;
  }
  return '';
}

async function firstDeploymentAsset(bucket, prefix, pathname) {
  for (const candidate of assetCandidates(pathname)) {
    if (isDeploymentRuleAssetPath(candidate)) continue;
    const key = `${prefix}${candidate}`.replace(/\/+/g, '/');
    const object = await bucket.get(key).catch(() => null);
    if (object) return { candidate, key, object };
  }
  return null;
}

function parseRedirectRules(text = '') {
  const rules = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    const [from, to, statusRaw = '301', ...rest] = parts;
    const force = rest.includes('!') || /!$/.test(statusRaw);
    const status = Number(String(statusRaw).replace(/!$/, ''));
    rules.push({
      from,
      to,
      status: Number.isFinite(status) ? status : 301,
      force,
      raw: line
    });
  }
  return rules.slice(0, 500);
}

function parseHeaderRules(text = '') {
  const rules = [];
  let current = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      current = { path: raw.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    if (!current) continue;
    const line = raw.trim();
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const name = cleanText(line.slice(0, separator), 120);
    const value = cleanText(line.slice(separator + 1), 500);
    if (name && value) current.headers.push([name, value]);
  }
  return rules.filter((rule) => rule.headers.length).slice(0, 500);
}

function stripTomlComment(line = '') {
  let quoted = '';
  let escaped = false;
  let out = '';
  for (const char of String(line || '')) {
    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quoted) {
      out += char;
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && (!quoted || quoted === char)) {
      quoted = quoted ? '' : char;
      out += char;
      continue;
    }
    if (char === '#' && !quoted) break;
    out += char;
  }
  return out.trim();
}

function unquoteToml(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\(["'\\btnfr])/g, (_match, char) => ({
      b: '\b',
      t: '\t',
      n: '\n',
      f: '\f',
      r: '\r',
      '"': '"',
      "'": "'",
      '\\': '\\'
    }[char] || char));
  }
  return text;
}

function parseTomlScalar(value = '') {
  const text = String(value || '').trim();
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  if (/^-?\d+$/.test(text)) return Number(text);
  return unquoteToml(text);
}

function parseTomlKey(value = '') {
  return unquoteToml(String(value || '').trim()).trim();
}

function parseNetlifyTomlRules(text = '') {
  const redirects = [];
  const headers = [];
  let section = '';
  let current = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = stripTomlComment(raw);
    if (!line) continue;
    if (line === '[[redirects]]') {
      current = {};
      redirects.push(current);
      section = 'redirect';
      continue;
    }
    if (line === '[[headers]]') {
      current = { headers: [] };
      headers.push(current);
      section = 'header';
      continue;
    }
    if (line === '[headers.values]' && current && headers.includes(current)) {
      section = 'header.values';
      continue;
    }
    if (line.startsWith('[')) {
      section = '';
      current = null;
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0 || !current) continue;
    const key = parseTomlKey(line.slice(0, separator));
    const value = parseTomlScalar(line.slice(separator + 1));
    if (section === 'redirect') {
      current[key] = value;
    } else if (section === 'header') {
      if (key === 'for') current.path = cleanText(value, 500);
    } else if (section === 'header.values') {
      const name = cleanText(key, 120);
      const headerValue = cleanText(value, 500);
      if (name && headerValue) current.headers.push([name, headerValue]);
    }
  }
  return {
    redirects: redirects
      .map((rule) => {
        const statusRaw = String(rule.status ?? '301').trim();
        const status = Number(statusRaw.replace(/!$/, ''));
        return {
          from: cleanText(rule.from || '', 500),
          to: cleanText(rule.to || '', 1000),
          status: Number.isFinite(status) ? status : 301,
          force: rule.force === true || /!$/.test(statusRaw),
          raw: 'netlify.toml'
        };
      })
      .filter((rule) => rule.from && rule.to)
      .slice(0, 500),
    headers: headers
      .filter((rule) => rule.path && rule.headers.length)
      .slice(0, 500)
  };
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchNetlifyPattern(pattern = '', pathname = '/') {
  let source = String(pattern || '').trim();
  if (!source) return null;
  if (!source.startsWith('/')) source = `/${source}`;
  const paramNames = [];
  let regex = '^';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '*') {
      paramNames.push('splat');
      regex += '(.*)';
      continue;
    }
    if (char === ':') {
      let name = '';
      index += 1;
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        name += source[index];
        index += 1;
      }
      index -= 1;
      if (name) {
        paramNames.push(name);
        regex += '([^/]+)';
        continue;
      }
      regex += ':';
      continue;
    }
    regex += escapeRegExp(char);
  }
  regex += '$';
  const match = String(pathname || '/').match(new RegExp(regex));
  if (!match) return null;
  const params = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1] || '';
  });
  return params;
}

function interpolateNetlifyTarget(target = '', params = {}) {
  let out = String(target || '');
  out = out.replace(/:([A-Za-z0-9_]+)/g, (_match, name) => encodeURI(params[name] || ''));
  if (params.splat != null) out = out.replace(/\*/g, encodeURI(params.splat));
  return out;
}

function publicRedirectLocation(target = '', url, routeRecord) {
  if (/^https?:\/\//i.test(target)) return target;
  if (!target.startsWith('/')) return new URL(target, url).toString();
  const mountPath = cleanText(routeRecord?.mount_path || '', 300).replace(/\/+$/, '');
  const publicPath = mountPath && routeRecord?.strip_mount_path !== false
    ? `${mountPath}${target}`.replace(/\/{2,}/g, '/')
    : target;
  return new URL(publicPath || '/', url).toString();
}

function applyNetlifyHeaderRules(headers, rules = [], pathnames = []) {
  for (const rule of rules) {
    if (!pathnames.some((pathname) => matchNetlifyPattern(rule.path, pathname))) continue;
    for (const [name, value] of rule.headers) headers.set(name, value);
  }
}

async function deploymentRules(bucket, prefix) {
  const [redirectText, headerText, netlifyTomlText] = await Promise.all([
    deploymentAssetText(bucket, prefix, '_redirects'),
    deploymentAssetText(bucket, prefix, '_headers'),
    deploymentAssetText(bucket, prefix, 'netlify.toml')
  ]);
  const tomlRules = parseNetlifyTomlRules(netlifyTomlText);
  return {
    redirects: [...parseRedirectRules(redirectText), ...tomlRules.redirects],
    headers: [...parseHeaderRules(headerText), ...tomlRules.headers]
  };
}

function etagMatches(ifNoneMatch = '', etag = '') {
  if (!ifNoneMatch || !etag) return false;
  const normalizedEtag = String(etag).replace(/^W\//i, '');
  return String(ifNoneMatch).split(',').some((part) => {
    const candidate = part.trim();
    return candidate === '*' || candidate === etag || candidate.replace(/^W\//i, '') === normalizedEtag;
  });
}

function objectLastModifiedHttpDate(object) {
  const raw = object?.uploaded || object?.uploaded_at || object?.uploadedAt || object?.httpMetadata?.lastModified;
  const date = raw instanceof Date ? raw : new Date(raw || 0);
  return Number.isFinite(date.getTime()) && date.getTime() > 0 ? date.toUTCString() : '';
}

function modifiedSinceFresh(ifModifiedSince = '', lastModified = '') {
  if (!ifModifiedSince || !lastModified) return false;
  const requestTime = Date.parse(ifModifiedSince);
  const objectTime = Date.parse(lastModified);
  if (!Number.isFinite(requestTime) || !Number.isFinite(objectTime)) return false;
  return objectTime <= requestTime;
}

function parseByteRangeHeader(header = '', size = 0) {
  const text = String(header || '').trim();
  if (!text) return null;
  const match = text.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || !Number.isFinite(size) || size < 0) return { error: true };
  if (size === 0) return { error: true };
  const [, startRaw, endRaw] = match;
  let start;
  let end;
  if (!startRaw) {
    const suffixLength = Number(endRaw);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return { error: true };
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw ? Number(endRaw) : size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return { error: true };
    if (start >= size) return { error: true };
    end = Math.min(end, size - 1);
  }
  return { start, end, length: end - start + 1 };
}

async function rangeBody(bucket, key, object, range) {
  const ranged = await bucket?.get?.(key, {
    range: { offset: range.start, length: range.length }
  }).catch(() => null);
  if (ranged?.body) return ranged.body;
  const buffer = typeof object?.arrayBuffer === 'function'
    ? await object.arrayBuffer()
    : await new Response(object?.body || '').arrayBuffer();
  return new Uint8Array(buffer).slice(range.start, range.end + 1);
}

async function deploymentAssetResponse(request, {
  bucket,
  key,
  candidate,
  object,
  routeRecord,
  rules,
  headerPaths = [],
  routeName = 'r2-deployment',
  extraHeaders = {}
}) {
  const method = String(request.method || 'GET').toUpperCase();
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has('content-type')) headers.set('content-type', contentTypeForPath(candidate));
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  if (!headers.has('last-modified')) {
    const lastModified = objectLastModifiedHttpDate(object);
    if (lastModified) headers.set('last-modified', lastModified);
  }
  headers.set('cache-control', headers.get('cache-control') || cacheControlForDeploymentAsset(candidate));
  headers.set('accept-ranges', 'bytes');
  headers.set('x-skynet-route', routeName);
  headers.set('x-skynet-project-id', cleanText(routeRecord.project_id || '', 180));
  headers.set('x-skynet-deployment-id', cleanText(routeRecord.active_deployment_id || '', 180));
  for (const [name, value] of Object.entries(extraHeaders || {})) {
    if (value != null && value !== '') headers.set(name, String(value));
  }
  applyNetlifyHeaderRules(headers, rules.headers, headerPaths);

  const etag = headers.get('etag') || '';
  if ((method === 'GET' || method === 'HEAD') && etagMatches(request.headers.get('if-none-match') || '', etag)) {
    return new Response(null, { status: 304, headers });
  }
  const lastModified = headers.get('last-modified') || '';
  if ((method === 'GET' || method === 'HEAD') && modifiedSinceFresh(request.headers.get('if-modified-since') || '', lastModified)) {
    return new Response(null, { status: 304, headers });
  }

  const size = Number(object.size);
  const requestedRange = method === 'GET' || method === 'HEAD'
    ? parseByteRangeHeader(request.headers.get('range') || '', size)
    : null;
  if (requestedRange?.error) {
    const rangeHeaders = new Headers(headers);
    if (Number.isFinite(size)) rangeHeaders.set('content-range', `bytes */${size}`);
    rangeHeaders.set('content-type', 'text/plain; charset=utf-8');
    return new Response(method === 'HEAD' ? null : 'Range not satisfiable', {
      status: 416,
      headers: rangeHeaders
    });
  }
  if (requestedRange) {
    const body = method === 'HEAD' ? null : await rangeBody(bucket, key, object, requestedRange);
    headers.set('content-range', `bytes ${requestedRange.start}-${requestedRange.end}/${size}`);
    headers.set('content-length', String(requestedRange.length));
    return new Response(body, { status: 206, headers });
  }

  return new Response(method === 'HEAD' ? null : object.body, { headers });
}

function mountedAssetPath(pathname, routeRecord) {
  const mountPath = cleanText(routeRecord?.mount_path || '', 300).replace(/\/+$/, '');
  if (!mountPath || routeRecord?.strip_mount_path === false) return pathname;
  if (pathname === mountPath) return '/';
  if (pathname.startsWith(`${mountPath}/`)) return pathname.slice(mountPath.length) || '/';
  return pathname;
}

function mappedRouteRequiresGate(routeRecord) {
  if (!routeRecord) return false;
  if (routeRecord.public_access === false) return true;
  const auth = cleanText(routeRecord.default_auth || 'public', 80).toLowerCase();
  return auth && auth !== 'public' && auth !== 'none';
}

function gateRequiredResponse(request, error) {
  const url = new URL(request.url);
  const acceptsHtml = request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html');
  if (acceptsHtml) {
    const login = new URL('/admin/login.html', url);
    login.searchParams.set('return', `${url.pathname}${url.search}`);
    return Response.redirect(login.toString(), 302);
  }
  return httpJson(error?.status || 401, {
    error: error?.message || 'FS27 gate session required',
    code: error?.code || 'GATE_AUTH_REQUIRED'
  }, buildCors(request));
}

function faviconResponse() {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#07070f"/><path d="M12 38 28 10h24L36 34h15L27 56l7-18H12Z" fill="#ffd36a"/></svg>',
    {
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=86400'
      }
    }
  );
}

async function ensureMappedRouteAccess(request, routeRecord, runtimeMeta) {
  if (!mappedRouteRequiresGate(routeRecord)) {
    runtimeMeta.auth_state = 'public';
    return null;
  }
  try {
    const auth = await requireGateAuth(request, 'viewer');
    runtimeMeta.auth_state = `gate:${auth.role || 'viewer'}`;
    runtimeMeta.customer_id = runtimeMeta.customer_id || String(auth.customer_id || '');
    return null;
  } catch (error) {
    runtimeMeta.auth_state = 'denied';
    runtimeMeta.error_code = error?.code || 'GATE_AUTH_REQUIRED';
    const response = gateRequiredResponse(request, error);
    response.headers.set('x-skynet-route', 'gate-required');
    response.headers.set('x-skynet-project-id', cleanText(routeRecord.project_id || '', 180));
    return response;
  }
}

function safeKeySegment(value = '', fallback = 'unknown') {
  return cleanText(value || fallback, 180).replace(/[^A-Za-z0-9._=-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

const NETLIFY_FORM_UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024;
const NETLIFY_FORM_UPLOAD_MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const NETLIFY_FORM_DEFAULT_HONEYPOT_FIELDS = ['bot-field', '_gotcha', 'gotcha', 'honeypot', 'skynet-honeypot'];

function isFormFile(value) {
  return Boolean(value && typeof value === 'object' && 'name' in value && 'size' in value && typeof value.arrayBuffer === 'function');
}

function compactFormValue(value) {
  if (isFormFile(value)) {
    return {
      file: true,
      name: cleanText(value.name || 'upload', 240),
      type: cleanText(value.type || 'application/octet-stream', 120),
      size: Number(value.size || 0)
    };
  }
  return cleanText(value, 4000);
}

function setFormField(fields, name, value) {
  const key = cleanText(name, 160);
  if (!key) return;
  const cleanValue = compactFormValue(value);
  if (fields[key] == null) {
    fields[key] = cleanValue;
  } else if (Array.isArray(fields[key])) {
    fields[key].push(cleanValue);
  } else {
    fields[key] = [fields[key], cleanValue];
  }
}

function fieldHasValue(value) {
  if (Array.isArray(value)) return value.some(fieldHasValue);
  if (value && typeof value === 'object') return Boolean(value.file ? Number(value.size || 0) > 0 : Object.keys(value).length);
  return cleanText(value, 4000).length > 0;
}

function formFieldText(value) {
  if (Array.isArray(value)) return value.map(formFieldText).join(' ');
  if (value && typeof value === 'object') return value.file ? `${value.name || ''} ${value.type || ''}` : JSON.stringify(value);
  return cleanText(value, 4000);
}

function formPolicyList(value, max = 50) {
  const raw = Array.isArray(value) ? value : cleanText(value || '', 4000).split(/[\n,]/g);
  return raw.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, max);
}

function normalizeFormPolicyMode(value = 'receipt-only') {
  const mode = cleanText(value || 'receipt-only', 80).toLowerCase().replace(/[^a-z0-9._-]+/g, '-') || 'receipt-only';
  const aliases = {
    email: 'owner-email',
    'owner-email-delivery': 'owner-email',
    owner: 'owner-email',
    queue: 'owner-queue',
    'owner-delivery': 'owner-queue',
    delivery: 'owner-queue'
  };
  return aliases[mode] || mode;
}

function formsNotificationModeWantsDelivery(mode = '') {
  return ['owner-email', 'owner-queue', 'webhook'].includes(normalizeFormPolicyMode(mode));
}

function formsNotificationDeliveryQueue(env) {
  return env.SKYENET_FORMS_NOTIFICATION_QUEUE
    || env.FORMS_NOTIFICATION_QUEUE
    || env.REQUEST_EVENT_QUEUE
    || env.FS27_REQUEST_EVENT_QUEUE
    || null;
}

function formsNotificationWebhookUrl(env) {
  return cleanText(env.SKYENET_FORMS_NOTIFICATION_WEBHOOK_URL || env.FORMS_NOTIFICATION_WEBHOOK_URL || '', 1000);
}

function policyFlag(value) {
  if (value === true) return true;
  const text = cleanText(value, 20).toLowerCase();
  return ['1', 'true', 'yes', 'on', 'required'].includes(text);
}

function sanitizeRuntimeFormsPolicy(input = {}) {
  const raw = input.forms_policy || input.formsPolicy || input.policy || input || {};
  const spam = raw.spam_controls || raw.spamControls || {};
  const notifications = raw.notifications || raw.notification || {};
  const linkLimit = Number(spam.link_limit ?? spam.linkLimit ?? spam.max_links ?? spam.maxLinks ?? 8);
  const minElapsedMs = Number(spam.min_elapsed_ms ?? spam.minElapsedMs ?? 0);
  const mode = normalizeFormPolicyMode(notifications.mode || raw.notification_mode || raw.notificationMode || 'receipt-only');
  const ownerRecipients = formPolicyList(notifications.owner_recipients || notifications.ownerRecipients || notifications.recipients, 20).map((item) => item.toLowerCase());
  const externalDelivery = formsNotificationModeWantsDelivery(mode);
  return {
    schema: 'fs27.skynet.forms_policy.v1',
    spam_controls: {
      honeypot_fields: formPolicyList(spam.honeypot_fields || spam.honeypotFields, 20),
      blocked_terms: formPolicyList(spam.blocked_terms || spam.blockedTerms, 80),
      blocked_emails: formPolicyList(spam.blocked_emails || spam.blockedEmails, 80).map((item) => item.toLowerCase()),
      blocked_domains: formPolicyList(spam.blocked_domains || spam.blockedDomains, 80).map((item) => item.toLowerCase().replace(/^@+/, '')),
      link_limit: Number.isFinite(linkLimit) && linkLimit > 0 ? Math.min(100, Math.floor(linkLimit)) : 8,
      min_elapsed_ms: Number.isFinite(minElapsedMs) && minElapsedMs > 0 ? Math.min(10 * 60 * 1000, Math.floor(minElapsedMs)) : 0,
      require_elapsed: policyFlag(spam.require_elapsed || spam.requireElapsed)
    },
    notifications: {
      mode,
      owner_recipients: ownerRecipients,
      suppress_spam: notifications.suppress_spam === false || notifications.suppressSpam === false ? false : true,
      external_delivery_enabled: externalDelivery,
      receipt_only: !externalDelivery
    }
  };
}

function formStartedAtMs(fields = {}, request) {
  const raw = fields.skynet_form_started_at
    || fields._form_started_at
    || fields.form_started_at
    || request.headers.get('x-skynet-form-started-at')
    || request.headers.get('x-form-started-at')
    || '';
  const value = Array.isArray(raw) ? raw[0] : raw;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 100000000000 ? numeric * 1000 : numeric;
  const parsed = Date.parse(cleanText(value, 80));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formEmailCandidates(fields = {}, combined = '') {
  const values = [];
  for (const [name, value] of Object.entries(fields)) {
    if (/email/i.test(name)) values.push(formFieldText(value));
  }
  values.push(combined);
  return [...new Set(values.join(' ').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])].map((item) => item.toLowerCase());
}

function classifyNetlifyFormSpam(fields = {}, request, policyInput = {}) {
  const policy = sanitizeRuntimeFormsPolicy(policyInput);
  const spamPolicy = policy.spam_controls || {};
  const configuredHoneypot = cleanText(
    request.headers.get('x-netlify-honeypot')
      || request.headers.get('x-skynet-form-honeypot')
      || fields['netlify-honeypot']
      || fields.netlify_honeypot
      || '',
    120
  );
  const honeypotFields = [...new Set([configuredHoneypot, ...(spamPolicy.honeypot_fields || []), ...NETLIFY_FORM_DEFAULT_HONEYPOT_FIELDS].filter(Boolean))];
  const triggeredHoneypots = honeypotFields.filter((field) => fieldHasValue(fields[field]));
  const combined = Object.entries(fields)
    .filter(([name]) => !['form-name', 'form_name'].includes(name))
    .map(([, value]) => formFieldText(value))
    .join(' ');
  const combinedLower = combined.toLowerCase();
  const linkCount = (combined.match(/https?:\/\//gi) || []).length;
  const emails = formEmailCandidates(fields, combined);
  const blockedEmails = emails.filter((email) => (spamPolicy.blocked_emails || []).includes(email));
  const blockedDomains = emails
    .map((email) => email.split('@')[1] || '')
    .filter((domain) => domain && (spamPolicy.blocked_domains || []).includes(domain));
  const blockedTerms = (spamPolicy.blocked_terms || []).filter((term) => term && combinedLower.includes(term.toLowerCase()));
  const startedAtMs = formStartedAtMs(fields, request);
  const elapsedMs = startedAtMs ? Date.now() - startedAtMs : null;
  const reasons = [];
  if (triggeredHoneypots.length) reasons.push('honeypot');
  if (linkCount >= Number(spamPolicy.link_limit || 8)) reasons.push('link_density');
  if (blockedTerms.length) reasons.push('blocked_term');
  if (blockedEmails.length) reasons.push('blocked_email');
  if (blockedDomains.length) reasons.push('blocked_domain');
  if (spamPolicy.require_elapsed && !startedAtMs) {
    reasons.push('missing_elapsed');
  } else if (Number(spamPolicy.min_elapsed_ms || 0) > 0 && startedAtMs && elapsedMs != null && elapsedMs < Number(spamPolicy.min_elapsed_ms || 0)) {
    reasons.push('too_fast');
  }
  return {
    detected: reasons.length > 0,
    reasons: [...new Set(reasons)],
    honeypot_fields: triggeredHoneypots,
    link_count: linkCount,
    blocked_terms: blockedTerms,
    blocked_emails: blockedEmails,
    blocked_domains: [...new Set(blockedDomains)],
    elapsed_ms: elapsedMs == null ? null : Math.max(0, Math.floor(elapsedMs)),
    policy: {
      link_limit: Number(spamPolicy.link_limit || 8),
      min_elapsed_ms: Number(spamPolicy.min_elapsed_ms || 0),
      require_elapsed: spamPolicy.require_elapsed === true
    }
  };
}

async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle?.digest) return '';
  const buffer = bytes instanceof ArrayBuffer ? bytes : await new Response(bytes).arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function receiptKv(env) {
  return env.SKYENET_RECEIPTS_KV || env.SKYENET_DEPLOY_RECEIPTS_KV || env.ROUTING_KV || env.FS27_ROUTING_KV || null;
}

async function kvGetJson(kv, key, fallback = null) {
  if (!kv?.get || !key) return fallback;
  try {
    const value = await kv.get(key, { type: 'json' });
    return value == null ? fallback : value;
  } catch {
    try {
      const raw = await kv.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
}

async function kvListJson(kv, prefix, limit = 100) {
  if (!kv?.list) return [];
  const rows = [];
  let cursor = null;
  do {
    const listed = await kv.list({ prefix, limit: Math.min(1000, Math.max(1, limit - rows.length)), ...(cursor ? { cursor } : {}) });
    for (const key of listed.keys || []) {
      const value = await kvGetJson(kv, key.name, null);
      if (value) rows.push({ key: key.name, value });
      if (rows.length >= limit) return rows;
    }
    cursor = listed.cursor || null;
    if (listed.list_complete !== false) break;
  } while (cursor && rows.length < limit);
  return rows;
}

function deploymentRecordKeyFromParts(customerId, workspaceId, projectId, deploymentId) {
  return [
    'skynet:deployment:v1:customer:',
    cleanText(customerId || '0', 160),
    ':workspace:',
    cleanText(workspaceId || 'default-workspace', 180),
    ':project:',
    cleanText(projectId || 'project', 180),
    ':deployment:',
    cleanText(deploymentId || 'active', 180)
  ].join('');
}

function deploymentRecordKey(routeRecord) {
  return deploymentRecordKeyFromParts(
    routeRecord.customer_id,
    routeRecord.workspace_id,
    routeRecord.project_id,
    routeRecord.active_deployment_id
  );
}

function functionEnvVarKey(customerId, workspaceId, projectId, key) {
  return [
    'skynet:env:v1:customer:',
    cleanText(customerId || '0', 160),
    ':workspace:',
    cleanText(workspaceId || 'default-workspace', 180),
    ':project:',
    cleanText(projectId || 'project', 180),
    ':key:',
    cleanText(key || '', 120)
  ].join('');
}

function normalizeFunctionEnvGrantKey(value = '') {
  const key = cleanText(value || '', 160)
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return /^[A-Z_][A-Z0-9_]{0,119}$/.test(key) ? key : '';
}

function functionEnvGrantKeys(functionRecord = {}) {
  const raw = Array.isArray(functionRecord.limits?.env_grants)
    ? functionRecord.limits.env_grants
    : cleanText(functionRecord.limits?.env_grants || '', 4000).split(/[\n,\s]+/g);
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const key = normalizeFunctionEnvGrantKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 64) break;
  }
  return out;
}

async function resolveFunctionEnvGrants(env, routeRecord, functionRecord = {}) {
  const requested = functionEnvGrantKeys(functionRecord);
  const granted = [];
  const missing = [];
  const functionEnv = {
    NODE_ENV: 'production',
    SKYENET_FUNCTION_NAME: cleanText(functionRecord.name || '', 120),
    SKYENET_PROJECT_ID: cleanText(routeRecord.project_id || '', 180),
    SKYENET_DEPLOYMENT_ID: cleanText(routeRecord.active_deployment_id || '', 180)
  };
  const kv = receiptKv(env);
  if (!kv?.get) {
    return { env: functionEnv, requested_keys: requested, granted_keys: granted, missing_keys: requested };
  }
  for (const key of requested) {
    const record = await kvGetJson(kv, functionEnvVarKey(
      routeRecord.customer_id,
      routeRecord.workspace_id,
      routeRecord.project_id,
      key
    ), null);
    const matchesScope = record?.schema === 'fs27.skynet.env_var.v1'
      && normalizeFunctionEnvGrantKey(record.key) === key
      && String(record.customer_id || '') === String(routeRecord.customer_id || '')
      && String(record.workspace_id || '') === String(routeRecord.workspace_id || '')
      && String(record.project_id || '') === String(routeRecord.project_id || '');
    if (matchesScope && Object.prototype.hasOwnProperty.call(record, 'value')) {
      functionEnv[key] = String(record.value ?? '');
      granted.push(key);
    } else {
      missing.push(key);
    }
  }
  return { env: functionEnv, requested_keys: requested, granted_keys: granted, missing_keys: missing };
}

function functionScheduleIndexPrefix() {
  return 'skynet:function-schedule:v1:';
}

function formsBucket(env) {
  return env.SKYENET_FORMS_BUCKET || env.REQUEST_LOG_BUCKET;
}

async function deploymentForRoute(env, routeRecord) {
  return await kvGetJson(receiptKv(env), deploymentRecordKey(routeRecord), null);
}

function formsNotificationPrefix(projectId, deploymentId, formName = '') {
  const parts = [
    'skynet',
    'forms-notifications',
    `project=${safeKeySegment(projectId || 'project')}`,
    `deployment=${safeKeySegment(deploymentId || 'deployment')}`
  ];
  const cleanForm = safeKeySegment(formName, '');
  if (cleanForm) parts.push(`form=${cleanForm}`);
  return parts.join('/');
}

async function attemptRuntimeFormsOwnerNotificationDelivery(env, routeRecord, record, submissionKey, notificationKey, notificationId, notificationPolicy, mode, spamDetected) {
  const recipients = Array.isArray(notificationPolicy.owner_recipients) ? notificationPolicy.owner_recipients.filter(Boolean) : [];
  if (mode === 'disabled') {
    return { status: 'disabled', enabled: false, attempted: false, configured: false, channel: 'disabled', recipient_count: recipients.length, attempts: [] };
  }
  if (spamDetected && notificationPolicy.suppress_spam !== false) {
    return { status: 'suppressed_spam', enabled: formsNotificationModeWantsDelivery(mode), attempted: false, configured: false, channel: mode, recipient_count: recipients.length, attempts: [] };
  }
  if (!formsNotificationModeWantsDelivery(mode)) {
    return { status: 'queued_receipt_only', enabled: false, attempted: false, configured: false, channel: 'receipt-only', recipient_count: recipients.length, attempts: [] };
  }
  if (!recipients.length) {
    return { status: 'delivery_recipient_missing', enabled: true, attempted: false, configured: false, channel: mode, recipient_count: 0, attempts: [] };
  }
  const payload = {
    schema: 'fs27.skynet.forms_notification.delivery.v1',
    notification_id: notificationId,
    notification_key: notificationKey,
    submission_key: submissionKey,
    project_id: cleanText(routeRecord.project_id || record.project_id || '', 180),
    deployment_id: cleanText(routeRecord.active_deployment_id || record.deployment_id || '', 180),
    workspace_id: cleanText(routeRecord.workspace_id || record.workspace_id || '', 180),
    customer_id: cleanText(routeRecord.customer_id || record.customer_id || '', 160),
    form_name: cleanText(record.form_name || '', 160),
    submission_id: cleanText(record.submission_id || '', 160),
    recipients,
    delivery_mode: mode,
    provider_hint: mode === 'webhook' ? 'webhook' : 'owner-notification-queue',
    spam_detected: spamDetected,
    fields: Object.keys(record.fields || {}).slice(0, 100),
    queued_at: new Date().toISOString()
  };
  const attempts = [];
  const queue = formsNotificationDeliveryQueue(env);
  if (queue?.send && mode !== 'webhook') {
    try {
      await queue.send(payload);
      attempts.push({ channel: 'queue', provider: 'cloudflare-queue', status: 'accepted', attempted_at: payload.queued_at });
      return { status: 'queued_owner_delivery', enabled: true, attempted: true, configured: true, channel: 'queue', recipient_count: recipients.length, attempts };
    } catch (error) {
      attempts.push({ channel: 'queue', provider: 'cloudflare-queue', status: 'failed', error: cleanText(error?.message || 'queue send failed', 240), attempted_at: new Date().toISOString() });
    }
  }
  const webhookUrl = formsNotificationWebhookUrl(env);
  if (mode === 'webhook' && webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      attempts.push({ channel: 'webhook', provider: 'configured-webhook', status: response.ok ? 'accepted' : 'failed', http_status: response.status, attempted_at: new Date().toISOString() });
      return { status: response.ok ? 'delivered_owner_webhook' : 'delivery_failed', enabled: true, attempted: true, configured: true, channel: 'webhook', recipient_count: recipients.length, attempts };
    } catch (error) {
      attempts.push({ channel: 'webhook', provider: 'configured-webhook', status: 'failed', error: cleanText(error?.message || 'webhook delivery failed', 240), attempted_at: new Date().toISOString() });
    }
  }
  return { status: attempts.length ? 'delivery_failed' : 'delivery_not_configured', enabled: true, attempted: attempts.length > 0, configured: false, channel: mode, recipient_count: recipients.length, attempts };
}

async function writeNetlifyFormNotificationReceipt(env, routeRecord, record, submissionKey, policyInput = {}) {
  const bucket = formsBucket(env);
  if (!bucket?.put) {
    const error = new Error('SkyeNet Forms notification storage is not configured.');
    error.code = 'SKYENET_FORMS_BUCKET_MISSING';
    error.status = 503;
    throw error;
  }
  const policy = sanitizeRuntimeFormsPolicy(policyInput);
  const notificationPolicy = policy.notifications || {};
  const now = new Date().toISOString();
  const notificationId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `formntf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const projectId = cleanText(routeRecord.project_id || record.project_id || 'unknown-project', 180);
  const deploymentId = cleanText(routeRecord.active_deployment_id || record.deployment_id || 'active', 180);
  const formName = cleanText(record.form_name || 'form', 160);
  const mode = normalizeFormPolicyMode(notificationPolicy.mode || 'receipt-only');
  const spamDetected = record.spam?.detected === true;
  const key = [
    formsNotificationPrefix(projectId, deploymentId, formName),
    now.slice(0, 10),
    `${safeKeySegment(notificationId, 'formntf')}.json`
  ].join('/');
  const delivery = await attemptRuntimeFormsOwnerNotificationDelivery(env, routeRecord, record, submissionKey, key, notificationId, notificationPolicy, mode, spamDetected);
  const notification = {
    schema: 'fs27.skynet.forms_notification.v1',
    notification_id: notificationId,
    created_at: now,
    project_id: projectId,
    deployment_id: deploymentId,
    workspace_id: cleanText(routeRecord.workspace_id || '', 180),
    customer_id: cleanText(routeRecord.customer_id || '', 160),
    form_name: formName,
    submission_id: cleanText(record.submission_id || '', 160),
    submission_key: submissionKey,
    status: delivery.status,
    mode,
    external_delivery_enabled: delivery.enabled === true,
    external_delivery_attempted: delivery.attempted === true,
    external_delivery_configured: delivery.configured === true,
    delivery_channel: delivery.channel || '',
    delivery_attempts: delivery.attempts || [],
    recipient_count: delivery.recipient_count,
    field_keys: Object.keys(record.fields || {}).slice(0, 100),
    spam_detected: spamDetected,
    spam_reasons: Array.isArray(record.spam?.reasons) ? record.spam.reasons : []
  };
  await bucket.put(key, JSON.stringify(notification, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: projectId,
      deployment_id: deploymentId,
      form_name: formName,
      submission_id: notification.submission_id,
      status: notification.status
    }
  });
  return { key, notification };
}

function functionInvocationForMappedPath(pathname = '') {
  const clean = `/${String(pathname || '').replace(/^\/+/, '')}`;
  if (clean.startsWith('/.skyenet/scheduled/')) {
    return {
      name: clean.slice('/.skyenet/scheduled/'.length).split('/')[0],
      trigger_kind: 'scheduled'
    };
  }
  for (const prefix of ['/.netlify/functions/', '/.skyenet/functions/']) {
    if (clean.startsWith(prefix)) {
      return {
        name: clean.slice(prefix.length).split('/')[0],
        trigger_kind: 'request'
      };
    }
  }
  return { name: '', trigger_kind: 'request' };
}

function functionNameForMappedPath(pathname = '') {
  return functionInvocationForMappedPath(pathname).name;
}

async function objectText(object, maxBytes = 2 * 1024 * 1024) {
  if (!object) return '';
  const size = Number(object.size || 0);
  if (size > maxBytes) {
    const error = new Error('SkyeNet function module exceeds the per-file runtime cap.');
    error.code = 'SKYENET_FUNCTION_MODULE_TOO_LARGE';
    error.status = 413;
    throw error;
  }
  const text = typeof object.text === 'function' ? await object.text() : await new Response(object.body || '').text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    const error = new Error('SkyeNet function module exceeds the per-file runtime cap.');
    error.code = 'SKYENET_FUNCTION_MODULE_TOO_LARGE';
    error.status = 413;
    throw error;
  }
  return text;
}

function skynetFunctionOptionsResponse(request, routeRecord, runtimeMeta) {
  runtimeMeta.runtime_type = 'skynet_function';
  runtimeMeta.route_decision = 'skynet.functions.options';
  return httpJson(200, { ok: true }, {
    ...buildCors(request),
    allow: 'GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE',
    'cache-control': 'no-store',
    'x-skynet-route': 'skynet-function-options',
    'x-skynet-project-id': cleanText(routeRecord.project_id || '', 180),
    'x-skynet-deployment-id': cleanText(routeRecord.active_deployment_id || '', 180)
  });
}

function skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, status, code, message, extra = {}) {
  runtimeMeta.runtime_type = 'skynet_function';
  runtimeMeta.route_decision = `skynet.functions.${code.toLowerCase()}`;
  runtimeMeta.error_code = code;
  return httpJson(status, {
    ok: false,
    error: message,
    code,
    project_id: cleanText(routeRecord.project_id || '', 180),
    deployment_id: cleanText(routeRecord.active_deployment_id || '', 180),
    ...extra
  }, {
    ...buildCors(request),
    'cache-control': 'no-store',
    'x-skynet-route': 'skynet-function-error',
    'x-skynet-project-id': cleanText(routeRecord.project_id || '', 180),
    'x-skynet-deployment-id': cleanText(routeRecord.active_deployment_id || '', 180)
  });
}

function dynamicWorkerModuleName(pathname = '') {
  const clean = cleanText(pathname, 700).replace(/^\/+/, '');
  if (/\.py$/i.test(clean)) return clean;
  return clean.replace(/\.(mjs|cjs|js|json)$/i, '.js');
}

function dynamicWorkerAdapterSource(functionRecord, bundle, staticEnv = {}) {
  const importPath = `./${dynamicWorkerModuleName(functionRecord.bundle_path)}`;
  const maxBodyBytes = Number(functionRecord.limits?.max_body_bytes || bundle.runtime_policy?.body_cap_bytes || 1048576);
  const functionName = cleanText(functionRecord.name || 'function', 120);
  const bundleId = cleanText(bundle.bundle_id || '', 160);
  const tenantId = cleanText(bundle.tenant_id || '', 160);
  const safeStaticEnv = {};
  for (const [key, value] of Object.entries(staticEnv || {})) {
    if (/^[A-Z_][A-Z0-9_]{0,119}$/.test(key)) safeStaticEnv[key] = String(value ?? '');
  }
  return `
const USER_MODULE_PATH = ${JSON.stringify(importPath)};
const FUNCTION_NAME = ${JSON.stringify(functionName)};
const BUNDLE_ID = ${JSON.stringify(bundleId)};
const TENANT_ID = ${JSON.stringify(tenantId)};
const MAX_BODY_BYTES = ${JSON.stringify(maxBodyBytes)};
const INVOCATION_MODE = ${JSON.stringify(cleanText(functionRecord.invocation_mode || 'request', 40))};
const STATIC_FUNCTION_ENV = ${JSON.stringify(safeStaticEnv)};

function headerObject(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) out[key.toLowerCase()] = value;
  return out;
}

function multiValueHeaderObject(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    out[lower] = out[lower] || [];
    out[lower].push(value);
  }
  return out;
}

function isTextual(headers) {
  const type = (headers.get('content-type') || '').toLowerCase();
  return !type || type.startsWith('text/') || type.includes('json') || type.includes('xml') || type.includes('graphql') || type.includes('x-www-form-urlencoded');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function applyFunctionEnv(env = {}) {
  const processObject = globalThis.process && typeof globalThis.process === 'object' ? globalThis.process : {};
  const next = { NODE_ENV: 'production' };
  for (const [key, value] of Object.entries(STATIC_FUNCTION_ENV || {})) {
    if (/^[A-Z_][A-Z0-9_]{0,119}$/.test(key)) next[key] = String(value ?? '');
  }
  for (const [key, value] of Object.entries(env || {})) {
    if (/^[A-Z_][A-Z0-9_]{0,119}$/.test(key)) next[key] = String(value ?? '');
  }
  processObject.env = next;
  globalThis.process = processObject;
  return next;
}

async function eventFromRequest(request) {
  const url = new URL(request.url);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    const error = new Error('Function request body exceeds the SkyeNet cap.');
    error.status = 413;
    throw error;
  }
  const bodyBytes = ['GET', 'HEAD'].includes(request.method) ? new Uint8Array() : new Uint8Array(await request.arrayBuffer());
  if (bodyBytes.byteLength > MAX_BODY_BYTES) {
    const error = new Error('Function request body exceeds the SkyeNet cap.');
    error.status = 413;
    throw error;
  }
  const queryStringParameters = {};
  const multiValueQueryStringParameters = {};
  for (const [key, value] of url.searchParams.entries()) queryStringParameters[key] = value;
  for (const [key, value] of url.searchParams.entries()) {
    multiValueQueryStringParameters[key] = multiValueQueryStringParameters[key] || [];
    multiValueQueryStringParameters[key].push(value);
  }
  const textual = isTextual(request.headers);
  return {
    path: url.pathname,
    httpMethod: request.method,
    headers: headerObject(request.headers),
    multiValueHeaders: multiValueHeaderObject(request.headers),
    queryStringParameters,
    multiValueQueryStringParameters,
    rawQuery: url.searchParams.toString(),
    rawUrl: url.href,
    cookies: (request.headers.get('cookie') || '').split(/;\\s*/).filter(Boolean),
    body: textual ? new TextDecoder().decode(bodyBytes) : bytesToBase64(bodyBytes),
    isBase64Encoded: !textual
  };
}

function responseFromResult(result) {
  const normalized = result && typeof result === 'object' ? result : { statusCode: 200, body: String(result ?? '') };
  const headers = new Headers(normalized.headers || {});
  for (const [key, values] of Object.entries(normalized.multiValueHeaders || {})) {
    for (const value of Array.isArray(values) ? values : [values]) headers.append(key, String(value));
  }
  if (!headers.has('content-type')) headers.set('content-type', 'text/plain; charset=utf-8');
  const body = normalized.isBase64Encoded ? base64ToBytes(normalized.body || '') : (normalized.body == null ? '' : String(normalized.body));
  return new Response(body, { status: Number(normalized.statusCode || 200), headers });
}

function resultReceiptSummary(result) {
  const normalized = result && typeof result === 'object' ? result : { statusCode: 200 };
  const headers = new Headers(normalized.headers || {});
  return {
    status_code: Number(normalized.statusCode || 200),
    content_type: headers.get('content-type') || '',
    body_present: normalized.body != null,
    is_base64_encoded: normalized.isBase64Encoded === true
  };
}

export default {
  async fetch(request, env = {}, ctx = {}) {
    const grantedEnv = applyFunctionEnv(env);
    const userModule = await import(USER_MODULE_PATH);
    const handler = userModule.handler || userModule.default?.handler || userModule.default;
    if (typeof handler !== 'function') {
      return Response.json({ ok: false, error: 'Function module does not export handler(event, context).', code: 'SKYENET_FUNCTION_HANDLER_MISSING' }, { status: 500 });
    }
    let event;
    try {
      event = await eventFromRequest(request);
    } catch (error) {
      return Response.json({ ok: false, error: error.message || 'Function request rejected.', code: 'SKYENET_FUNCTION_BODY_CAP' }, { status: error.status || 400 });
    }
    const timeoutMs = ${JSON.stringify(Number(functionRecord.limits?.timeout_ms || 10000))};
    const timeout = new Promise((_, reject) => setTimeout(() => {
      const error = new Error('Function timed out.');
      error.status = 504;
      reject(error);
    }, timeoutMs));
    const context = {
      functionName: FUNCTION_NAME,
      runtime: 'skyenet-dynamic-workers-v1',
      bundleId: BUNDLE_ID || null,
      tenantId: TENANT_ID || null,
      triggerKind: INVOCATION_MODE === 'scheduled' ? 'scheduled' : 'request',
      waitUntil: typeof ctx.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : undefined,
      requestId: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      env: Object.freeze({ ...grantedEnv })
    };
    if (INVOCATION_MODE === 'background') {
      const jobId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const run = Promise.race([handler(event, { ...context, triggerKind: 'background', backgroundJobId: jobId }), timeout]);
      const completion = run
        .then((result) => {
          if (typeof ctx.skynetBackgroundComplete === 'function') {
            return ctx.skynetBackgroundComplete({
              job_id: jobId,
              status: 'completed',
              result: resultReceiptSummary(result)
            });
          }
          return null;
        })
        .catch((error) => {
          if (typeof ctx.skynetBackgroundComplete === 'function') {
            return ctx.skynetBackgroundComplete({
              job_id: jobId,
              status: 'failed',
              error: {
                code: error.status === 504 ? 'SKYENET_FUNCTION_TIMEOUT' : 'SKYENET_FUNCTION_FAILED',
                message: error.message || 'Function failed'
              }
            });
          }
          return null;
        });
      if (context.waitUntil) context.waitUntil(completion);
      else completion.catch(() => null);
      return Response.json({ ok: true, accepted: true, mode: 'background', job_id: jobId, completion_receipt_required: true }, {
        status: 202,
        headers: { 'x-skynet-background-job': jobId, 'x-skynet-background-completion-receipt': 'required' }
      });
    }
    try {
      const result = await Promise.race([handler(event, context), timeout]);
      return responseFromResult(result);
    } catch (error) {
      return Response.json({ ok: false, error: error.message || 'Function failed', code: error.status === 504 ? 'SKYENET_FUNCTION_TIMEOUT' : 'SKYENET_FUNCTION_FAILED' }, { status: error.status || 500 });
    }
  }
};
`;
}

async function dynamicWorkerModules(bucket, bundle, functionRecord, staticEnv = {}) {
  const modules = {
    'skynet-function-adapter.js': dynamicWorkerAdapterSource(functionRecord, bundle, staticEnv)
  };
  const paths = new Set([functionRecord.bundle_path]);
  for (const moduleRecord of bundle.modules || []) paths.add(moduleRecord.path || moduleRecord.bundle_path || '');
  for (const rawPath of paths) {
    const modulePath = cleanText(rawPath, 700).replace(/^\/+/, '');
    if (!modulePath) continue;
    const key = `${cleanText(bundle.prefix || '', 700).replace(/\/+$/, '')}/${modulePath}`.replace(/\/+/g, '/');
    const object = await bucket.get(key).catch(() => null);
    if (!object) {
      const error = new Error(`Function bundle module missing: ${modulePath}`);
      error.code = 'SKYENET_FUNCTION_MODULE_MISSING';
      error.status = 503;
      throw error;
    }
    modules[dynamicWorkerModuleName(modulePath)] = await objectText(object);
  }
  return modules;
}

async function writeFunctionInvocationReceipt(env, routeRecord, bundle, functionRecord, request, responseStatus, startedAt, errorCode = '', envGrantResult = {}) {
  const bucket = env.REQUEST_LOG_BUCKET || env.FS27_REQUEST_LOG_BUCKET || deploymentBucket(env);
  if (!bucket?.put) return { ok: false, key: '' };
  const invocationId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const key = [
    'skynet',
    'functions',
    'invocations',
    `project=${safeKeySegment(routeRecord.project_id || 'project')}`,
    `deployment=${safeKeySegment(routeRecord.active_deployment_id || 'deployment')}`,
    `function=${safeKeySegment(functionRecord.name || 'function')}`,
    day,
    `${safeKeySegment(invocationId)}.json`
  ].join('/');
  const url = new URL(request.url);
  const record = {
    schema: 'fs27.skynet.function_invocation.v1',
    invocation_id: invocationId,
    received_at: now,
    started_at: startedAt,
    duration_ms: Math.max(0, Date.now() - Number(new Date(startedAt).getTime() || Date.now())),
    customer_id: cleanText(routeRecord.customer_id || '', 160),
    workspace_id: cleanText(routeRecord.workspace_id || '', 180),
    project_id: cleanText(routeRecord.project_id || '', 180),
    deployment_id: cleanText(routeRecord.active_deployment_id || '', 180),
    function_name: cleanText(functionRecord.name || '', 120),
    bundle_id: cleanText(bundle.bundle_id || '', 160),
    runtime: 'cloudflare-dynamic-worker-v1',
    status: Number(responseStatus || 0),
    error_code: cleanText(errorCode || '', 120),
    request: {
      method: request.method,
      hostname: url.hostname,
      path: url.pathname,
      query: url.search,
      user_agent: cleanText(request.headers.get('user-agent') || '', 240)
    },
    env_grants: {
      requested_keys: Array.isArray(envGrantResult.requested_keys) ? envGrantResult.requested_keys.map((key) => cleanText(key, 120)) : functionEnvGrantKeys(functionRecord),
      granted_keys: Array.isArray(envGrantResult.granted_keys) ? envGrantResult.granted_keys.map((key) => cleanText(key, 120)) : [],
      missing_keys: Array.isArray(envGrantResult.missing_keys) ? envGrantResult.missing_keys.map((key) => cleanText(key, 120)) : [],
      granted_count: Array.isArray(envGrantResult.granted_keys) ? envGrantResult.granted_keys.length : 0
    },
    body_logged: false,
    raw_secret_env_exposed: false,
    outbound_fetch_policy: 'deny'
  };
  await bucket.put(key, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: record.project_id,
      deployment_id: record.deployment_id,
      function_name: record.function_name,
      status: String(record.status)
    }
  });
  return { ok: true, key, invocation_id: invocationId };
}

async function writeFunctionBackgroundCompletionReceipt(env, routeRecord, bundle, functionRecord, request, jobRecord = {}, envGrantResult = {}) {
  const bucket = env.REQUEST_LOG_BUCKET || env.FS27_REQUEST_LOG_BUCKET || deploymentBucket(env);
  if (!bucket?.put) return { ok: false, key: '' };
  const jobId = cleanText(jobRecord.job_id || '', 180) || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}`);
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const key = [
    'skynet',
    'functions',
    'background-completions',
    `project=${safeKeySegment(routeRecord.project_id || 'project')}`,
    `deployment=${safeKeySegment(routeRecord.active_deployment_id || 'deployment')}`,
    `function=${safeKeySegment(functionRecord.name || 'function')}`,
    day,
    `${safeKeySegment(jobId)}.json`
  ].join('/');
  const url = new URL(request.url);
  const status = cleanText(jobRecord.status || 'completed', 40);
  const result = jobRecord.result && typeof jobRecord.result === 'object' ? jobRecord.result : {};
  const error = jobRecord.error && typeof jobRecord.error === 'object' ? jobRecord.error : {};
  const record = {
    schema: 'fs27.skynet.function_background_completion.v1',
    job_id: jobId,
    completed_at: now,
    customer_id: cleanText(routeRecord.customer_id || '', 160),
    workspace_id: cleanText(routeRecord.workspace_id || '', 180),
    project_id: cleanText(routeRecord.project_id || '', 180),
    deployment_id: cleanText(routeRecord.active_deployment_id || '', 180),
    function_name: cleanText(functionRecord.name || '', 120),
    bundle_id: cleanText(bundle.bundle_id || '', 160),
    runtime: 'cloudflare-dynamic-worker-v1',
    status,
    result: {
      status_code: Number(result.status_code || 0),
      content_type: cleanText(result.content_type || '', 160),
      body_present: result.body_present === true,
      is_base64_encoded: result.is_base64_encoded === true
    },
    error: {
      code: cleanText(error.code || '', 120),
      message: cleanText(error.message || '', 500)
    },
    request: {
      method: request.method,
      hostname: url.hostname,
      path: url.pathname,
      query: url.search
    },
    env_grants: {
      requested_keys: Array.isArray(envGrantResult.requested_keys) ? envGrantResult.requested_keys.map((item) => cleanText(item, 120)) : functionEnvGrantKeys(functionRecord),
      granted_keys: Array.isArray(envGrantResult.granted_keys) ? envGrantResult.granted_keys.map((item) => cleanText(item, 120)) : [],
      granted_count: Array.isArray(envGrantResult.granted_keys) ? envGrantResult.granted_keys.length : 0
    },
    raw_secret_env_exposed: false,
    body_logged: false
  };
  await bucket.put(key, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: record.project_id,
      deployment_id: record.deployment_id,
      function_name: record.function_name,
      job_id: record.job_id,
      status: record.status
    }
  });
  return { ok: true, key, job_id: jobId };
}

async function serveDeploymentFunction(request, env, routeRecord, functionInvocation, runtimeMeta, context = null) {
  const invocation = typeof functionInvocation === 'string'
    ? { name: functionInvocation, trigger_kind: 'request' }
    : {
      name: cleanText(functionInvocation?.name || '', 120),
      trigger_kind: cleanText(functionInvocation?.trigger_kind || 'request', 40)
    };
  const functionName = invocation.name;
  const bucket = deploymentBucket(env);
  if (!bucket?.get) return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, 503, 'SKYENET_FUNCTION_STORAGE_MISSING', 'Deployment asset bucket is not configured for function source.');
  if (!env.SKYENET_FUNCTION_LOADER?.get && !env.SKYENET_FUNCTION_LOADER?.load) {
    return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, 503, 'SKYENET_FUNCTION_LOADER_MISSING', 'SKYENET_FUNCTION_LOADER binding is required before invoking uploaded functions.');
  }
  const logBucket = env.REQUEST_LOG_BUCKET || env.FS27_REQUEST_LOG_BUCKET || deploymentBucket(env);
  if (!logBucket?.put) {
    return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, 503, 'SKYENET_FUNCTION_RECEIPT_BUCKET_MISSING', 'Function invocation receipts are required before execution.');
  }
  const deployment = await kvGetJson(receiptKv(env), deploymentRecordKey(routeRecord), null);
  const bundle = deployment?.function_bundle || null;
  if (!bundle || bundle.status !== 'active') {
    return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, 404, 'SKYENET_FUNCTION_BUNDLE_NOT_ACTIVE', 'No active SkyeNet function bundle is mounted for this deployment.');
  }
  if (bundle.kill_switch === true || routeRecord.function_mode === 'disabled') {
    return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, 503, 'SKYENET_FUNCTION_KILL_SWITCH', 'SkyeNet function execution is disabled for this deployment.');
  }
  const record = (bundle.functions || []).find((item) => cleanText(item.name || '', 120) === functionName);
  if (!record) {
    return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, 404, 'SKYENET_FUNCTION_NOT_FOUND', 'Function not found in the active SkyeNet bundle.', { function_name: functionName });
  }
  if (invocation.trigger_kind === 'scheduled' && record.invocation_mode !== 'scheduled') {
    return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, 400, 'SKYENET_FUNCTION_NOT_SCHEDULED', 'Function is not declared as scheduled.', { function_name: functionName });
  }
  const startedAt = new Date().toISOString();
  runtimeMeta.runtime_type = 'skynet_function';
  runtimeMeta.function_name = record.name;
  runtimeMeta.trigger_kind = invocation.trigger_kind;
  runtimeMeta.route_decision = 'skynet.functions.dynamic_worker';
  let envGrantResult = {
    env: {
      NODE_ENV: 'production',
      SKYENET_FUNCTION_NAME: cleanText(record.name || '', 120),
      SKYENET_PROJECT_ID: cleanText(routeRecord.project_id || '', 180),
      SKYENET_DEPLOYMENT_ID: cleanText(routeRecord.active_deployment_id || '', 180)
    },
    requested_keys: functionEnvGrantKeys(record),
    granted_keys: [],
    missing_keys: functionEnvGrantKeys(record)
  };
  try {
    envGrantResult = await resolveFunctionEnvGrants(env, routeRecord, record);
    const envGrantHash = await sha256Hex(new TextEncoder().encode(JSON.stringify(envGrantResult.env || {})));
    const workerId = [
      'skynet',
      safeKeySegment(routeRecord.project_id || 'project'),
      safeKeySegment(routeRecord.active_deployment_id || 'deployment'),
      safeKeySegment(record.name || 'function'),
      safeKeySegment(record.sha256 || bundle.bundle_id || 'bundle'),
      safeKeySegment(envGrantHash.slice(0, 24) || 'env')
    ].join(':');
    const modules = await dynamicWorkerModules(bucket, bundle, record, envGrantResult.env);
    const workerCode = {
      compatibilityDate: '2026-05-30',
      compatibilityFlags: ['nodejs_compat'],
      mainModule: 'skynet-function-adapter.js',
      modules,
      globalOutbound: null,
      limits: {
        cpuMs: Number(record.limits?.cpu_ms || bundle.runtime_policy?.custom_limits?.cpu_ms || 50),
        subRequests: Number(record.limits?.subrequests ?? bundle.runtime_policy?.custom_limits?.subrequests ?? 0)
      }
    };
    const loaded = await env.SKYENET_FUNCTION_LOADER.get(workerId, async () => workerCode);
    const entrypoint = typeof loaded?.getEntrypoint === 'function' ? loaded.getEntrypoint() : loaded;
    if (!entrypoint?.fetch) throw Object.assign(new Error('Dynamic Worker entrypoint did not expose fetch.'), { code: 'SKYENET_FUNCTION_ENTRYPOINT_MISSING', status: 503 });
    const dynamicContext = runtimeContext(context, env);
    dynamicContext.skynetBackgroundComplete = (jobRecord) => writeFunctionBackgroundCompletionReceipt(
      env,
      routeRecord,
      bundle,
      record,
      request,
      jobRecord,
      envGrantResult
    ).catch(() => null);
    const response = await entrypoint.fetch(request, envGrantResult.env, dynamicContext);
    const receipt = await writeFunctionInvocationReceipt(env, routeRecord, bundle, record, request, response.status, startedAt, '', envGrantResult);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store');
    headers.set('x-skynet-route', 'skynet-function');
    headers.set('x-skynet-project-id', cleanText(routeRecord.project_id || '', 180));
    headers.set('x-skynet-deployment-id', cleanText(routeRecord.active_deployment_id || '', 180));
    headers.set('x-skynet-function-name', cleanText(record.name || '', 120));
    headers.set('x-skynet-function-env-grants', String(envGrantResult.granted_keys.length));
    if (record.invocation_mode === 'background') headers.set('x-skynet-background-completion-receipt', 'required');
    if (invocation.trigger_kind === 'scheduled') headers.set('x-skynet-scheduled-function', cleanText(record.name || '', 120));
    if (receipt.key) headers.set('x-skynet-function-receipt', receipt.key);
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    const status = Number(error?.status || 500);
    const code = cleanText(error?.code || 'SKYENET_FUNCTION_INVOKE_FAILED', 120);
    await writeFunctionInvocationReceipt(env, routeRecord, bundle, record, request, status, startedAt, code, envGrantResult).catch(() => null);
    return skynetFunctionErrorResponse(request, routeRecord, runtimeMeta, status, code, error?.message || 'SkyeNet function invocation failed.', { function_name: record.name });
  }
}

const CRON_MONTH_ALIASES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const CRON_DOW_ALIASES = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

function cronValue(value = '', aliases = {}, options = {}) {
  const clean = String(value || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(aliases, clean)) return aliases[clean];
  if (!/^\d+$/.test(clean)) return NaN;
  const parsed = Number(clean);
  return options.sevenIsSunday && parsed === 7 ? 0 : parsed;
}

function cronFieldResult(field = '', value = 0, min = 0, max = 59, aliases = {}, options = {}) {
  const clean = String(field || '').trim().toLowerCase();
  if (!clean || clean === '*' || clean === '?') return { any: true, matches: true, valid: true };
  let matches = false;
  for (const rawPart of clean.split(',')) {
    const part = rawPart.trim();
    if (!part) return { any: false, matches: false, valid: false };
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart == null ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) return { any: false, matches: false, valid: false };
    let start = min;
    let end = max;
    if (rangePart !== '*' && rangePart !== '?') {
      const range = rangePart.split('-');
      start = cronValue(range[0], aliases, options);
      end = range.length > 1 ? cronValue(range[1], aliases, options) : start;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) return { any: false, matches: false, valid: false };
    if (start < min || start > max || end < min || end > max) return { any: false, matches: false, valid: false };
    const values = [];
    if (start <= end) {
      for (let current = start; current <= end; current += step) values.push(current);
    } else if (options.wrap) {
      for (let current = start; current <= max; current += step) values.push(current);
      for (let current = min; current <= end; current += step) values.push(current);
    } else {
      return { any: false, matches: false, valid: false };
    }
    if (values.some((item) => (options.sevenIsSunday && item === 7 ? 0 : item) === value)) matches = true;
  }
  return { any: false, matches, valid: true };
}

function scheduledCronDue(cron = '', date = new Date()) {
  const clean = cleanText(cron || '', 120).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean) return false;
  const aliases = {
    '@hourly': '0 * * * *',
    '@daily': '0 0 * * *',
    '@midnight': '0 0 * * *',
    '@weekly': '0 0 * * 0',
    '@monthly': '0 0 1 * *',
    '@yearly': '0 0 1 1 *',
    '@annually': '0 0 1 1 *'
  };
  const expanded = aliases[clean] || clean;
  const fields = expanded.split(' ');
  if (fields.length !== 5) return false;
  const minute = cronFieldResult(fields[0], date.getUTCMinutes(), 0, 59);
  const hour = cronFieldResult(fields[1], date.getUTCHours(), 0, 23);
  const month = cronFieldResult(fields[3], date.getUTCMonth() + 1, 1, 12, CRON_MONTH_ALIASES);
  const dayOfMonth = cronFieldResult(fields[2], date.getUTCDate(), 1, 31);
  const dayOfWeek = cronFieldResult(fields[4], date.getUTCDay(), 0, 7, CRON_DOW_ALIASES, { sevenIsSunday: true, wrap: true });
  if (![minute, hour, month, dayOfMonth, dayOfWeek].every((field) => field.valid)) return false;
  if (!minute.matches || !hour.matches || !month.matches) return false;
  const dayMatches = !dayOfMonth.any && !dayOfWeek.any
    ? (dayOfMonth.matches || dayOfWeek.matches)
    : (dayOfMonth.matches && dayOfWeek.matches);
  return dayMatches;
}

async function runScheduledSkyeNetFunctions(controller, env, context) {
  const kv = receiptKv(env);
  const scheduledTime = Number(controller?.scheduledTime || 0);
  const startedAt = Number.isFinite(scheduledTime) && scheduledTime > 0 ? new Date(scheduledTime) : new Date();
  const scheduleRows = await kvListJson(kv, functionScheduleIndexPrefix(), 5000);
  const rows = scheduleRows.length ? [] : await kvListJson(kv, 'skynet:deployment:v1:customer:', 1000);
  const due = [];
  const seen = new Set();
  for (const row of scheduleRows) {
    const schedule = row.value || {};
    if (schedule.schema !== 'fs27.skynet.function_schedule.v1' || schedule.active === false) continue;
    if (!scheduledCronDue(schedule.cron, startedAt)) continue;
    const deployment = await kvGetJson(kv, deploymentRecordKeyFromParts(
      schedule.customer_id,
      schedule.workspace_id,
      schedule.project_id,
      schedule.deployment_id
    ), null);
    const bundle = deployment?.function_bundle || {};
    if (deployment?.schema !== 'fs27.skynet.deployment.v1' || bundle.status !== 'active' || bundle.kill_switch === true) continue;
    const fn = (bundle.functions || []).find((item) => cleanText(item.name || '', 120) === cleanText(schedule.function_name || '', 120));
    if (!fn || fn.invocation_mode !== 'scheduled' || !scheduledCronDue(fn.schedule?.cron, startedAt)) continue;
    const id = `${schedule.customer_id}:${schedule.workspace_id}:${schedule.project_id}:${schedule.deployment_id}:${fn.name}`;
    if (seen.has(id)) continue;
    seen.add(id);
    due.push({ deployment, fn });
  }
  if (!scheduleRows.length) {
    for (const row of rows) {
      const deployment = row.value || {};
      const bundle = deployment.function_bundle || {};
      if (bundle.status !== 'active' || bundle.kill_switch === true) continue;
      for (const fn of bundle.functions || []) {
        if (fn.invocation_mode !== 'scheduled' || !scheduledCronDue(fn.schedule?.cron, startedAt)) continue;
        due.push({ deployment, fn });
      }
    }
  }
  const results = [];
  for (const item of due.slice(0, 50)) {
    const deployment = item.deployment;
    const routeRecord = {
      customer_id: deployment.customer_id || '0',
      workspace_id: deployment.workspace_id || 'default-workspace',
      project_id: deployment.project_id || 'project',
      active_deployment_id: deployment.deployment_id || 'active'
    };
    const request = new Request(`https://skynet-scheduled.local/.skyenet/scheduled/${item.fn.name}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-skynet-scheduled-trigger': '1',
        'x-skynet-scheduled-cron': item.fn.schedule?.cron || ''
      },
      body: JSON.stringify({
        scheduled: true,
        cron: item.fn.schedule?.cron || '',
        function_name: item.fn.name,
        project_id: routeRecord.project_id,
        deployment_id: routeRecord.active_deployment_id,
        fired_at: startedAt.toISOString()
      })
    });
    const runtimeMeta = {};
    const response = await serveDeploymentFunction(request, env, routeRecord, {
      name: item.fn.name,
      trigger_kind: 'scheduled'
    }, runtimeMeta, context);
    results.push({
      project_id: routeRecord.project_id,
      deployment_id: routeRecord.active_deployment_id,
      function_name: item.fn.name,
      status: response.status,
      route_decision: runtimeMeta.route_decision || '',
      scheduled_route: '/.skyenet/scheduled'
    });
  }
  return {
    ok: true,
    checked_deployments: rows.length,
    checked_schedules: scheduleRows.length,
    due_count: due.length,
    invoked_count: results.length,
    results
  };
}

async function parseNetlifyFormSubmission(request) {
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  const fields = {};
  const files = [];
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    for (const [name, value] of form.entries()) {
      const fieldName = cleanText(name, 160);
      if (isFormFile(value)) {
        files.push({
          field_name: fieldName,
          name: cleanText(value.name || 'upload', 240),
          type: cleanText(value.type || 'application/octet-stream', 120),
          size: Number(value.size || 0),
          file: value
        });
      }
      setFormField(fields, name, value);
    }
  } else if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    for (const [name, value] of Object.entries(body)) setFormField(fields, name, value);
  } else {
    return null;
  }
  const formName = cleanText(
    fields['form-name']
      || fields.form_name
      || request.headers.get('x-netlify-form-name')
      || request.headers.get('x-skynet-form-name')
      || '',
    120
  );
  if (!formName) return null;
  return { formName, fields, files };
}

async function handleNetlifyFormSubmission(request, env, routeRecord, runtimeMeta) {
  if (String(request.method || 'GET').toUpperCase() !== 'POST') return null;
  const submission = await parseNetlifyFormSubmission(request);
  if (!submission) return null;
  const deployment = await deploymentForRoute(env, routeRecord).catch(() => null);
  const formsPolicy = sanitizeRuntimeFormsPolicy(deployment?.forms_policy || {});
  submission.spam = classifyNetlifyFormSpam(submission.fields, request, formsPolicy);
  const bucket = formsBucket(env);
  const url = new URL(request.url);
  const projectId = cleanText(routeRecord.project_id || 'unknown-project', 180);
  const deploymentId = cleanText(routeRecord.active_deployment_id || 'active', 180);
  const submissionId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const dateSegment = new Date().toISOString().slice(0, 10);
  const key = [
    'skynet',
    'forms',
    `project=${safeKeySegment(projectId)}`,
    `deployment=${safeKeySegment(deploymentId)}`,
    `form=${safeKeySegment(submission.formName, 'form')}`,
    dateSegment,
    `${safeKeySegment(submissionId)}.json`
  ].join('/');
  const fileBaseKey = [
    'skynet',
    'forms',
    `project=${safeKeySegment(projectId)}`,
    `deployment=${safeKeySegment(deploymentId)}`,
    `form=${safeKeySegment(submission.formName, 'form')}`,
    dateSegment,
    safeKeySegment(submissionId),
    'files'
  ].join('/');
  const totalFileBytes = submission.files.reduce((sum, file) => sum + Number(file.size || 0), 0);
  const record = {
    schema: 'skyenet.netlify-form-submission.v1',
    received_at: new Date().toISOString(),
    submission_id: submissionId,
    form_name: submission.formName,
    customer_id: cleanText(routeRecord.customer_id || '', 160),
    workspace_id: cleanText(routeRecord.workspace_id || '', 180),
    project_id: projectId,
    deployment_id: deploymentId,
    hostname: url.hostname,
    path: url.pathname,
    mount_path: cleanText(routeRecord.mount_path || '', 300),
    fields: submission.fields,
    spam: submission.spam,
    workflow: {
      status: 'new',
      updated_at: null
    },
    moderation: {
      owner_reviewed: false
    },
    forms_policy: {
      schema: formsPolicy.schema,
      spam_controls: {
        honeypot_field_count: formsPolicy.spam_controls.honeypot_fields.length,
        blocked_term_count: formsPolicy.spam_controls.blocked_terms.length,
        blocked_email_count: formsPolicy.spam_controls.blocked_emails.length,
        blocked_domain_count: formsPolicy.spam_controls.blocked_domains.length,
        link_limit: formsPolicy.spam_controls.link_limit,
        min_elapsed_ms: formsPolicy.spam_controls.min_elapsed_ms,
        require_elapsed: formsPolicy.spam_controls.require_elapsed
      },
      notifications: {
        mode: formsPolicy.notifications.mode,
        recipient_count: formsPolicy.notifications.owner_recipients.length,
        suppress_spam: formsPolicy.notifications.suppress_spam,
        external_delivery_enabled: formsPolicy.notifications.external_delivery_enabled,
        receipt_only: formsPolicy.notifications.receipt_only
      }
    },
    file_count: 0,
    total_file_bytes: 0,
    files: [],
    request: {
      content_type: cleanText(request.headers.get('content-type') || '', 180),
      user_agent: cleanText(request.headers.get('user-agent') || '', 240),
      referer: cleanText(request.headers.get('referer') || '', 500)
    }
  };
  const baseHeaders = {
    ...buildCors(request),
    'cache-control': 'no-store',
    'x-skynet-route': 'netlify-form',
    'x-skynet-project-id': projectId,
    'x-skynet-deployment-id': deploymentId,
    'x-skynet-form-name': submission.formName,
    'x-skynet-form-receipt': key,
    'x-skynet-form-spam': submission.spam.detected ? '1' : '0',
    'x-skynet-form-file-count': String(submission.files.length)
  };
  const oversizedFile = submission.files.find((file) => Number(file.size || 0) > NETLIFY_FORM_UPLOAD_MAX_FILE_BYTES);
  if (oversizedFile || totalFileBytes > NETLIFY_FORM_UPLOAD_MAX_TOTAL_BYTES) {
    runtimeMeta.runtime_type = 'form_capture';
    runtimeMeta.route_decision = 'netlify.forms.upload_too_large';
    runtimeMeta.error_code = 'SKYENET_FORM_UPLOAD_TOO_LARGE';
    return httpJson(413, {
      ok: false,
      error: 'SkyeNet form upload exceeds the configured Netlify Forms-compatible custody cap.',
      code: 'SKYENET_FORM_UPLOAD_TOO_LARGE',
      max_file_bytes: NETLIFY_FORM_UPLOAD_MAX_FILE_BYTES,
      max_total_bytes: NETLIFY_FORM_UPLOAD_MAX_TOTAL_BYTES,
      file_count: submission.files.length,
      total_file_bytes: totalFileBytes
    }, baseHeaders);
  }
  if (!bucket?.put) {
    runtimeMeta.runtime_type = 'form_capture';
    runtimeMeta.route_decision = 'netlify.forms.bucket_missing';
    runtimeMeta.error_code = 'SKYENET_FORMS_BUCKET_MISSING';
    return httpJson(503, {
      ok: false,
      error: 'SkyeNet form capture bucket is not configured.',
      code: 'SKYENET_FORMS_BUCKET_MISSING'
    }, baseHeaders);
  }
  const storedFiles = [];
  for (const upload of submission.files) {
    const bytes = await upload.file.arrayBuffer();
    const fileKey = `${fileBaseKey}/${safeKeySegment(upload.field_name, 'file')}-${safeKeySegment(upload.name, 'upload')}`;
    await bucket.put(fileKey, bytes, {
      httpMetadata: { contentType: upload.type || 'application/octet-stream' },
      customMetadata: {
        project_id: projectId,
        deployment_id: deploymentId,
        form_name: submission.formName,
        submission_id: submissionId,
        field_name: upload.field_name
      }
    });
    storedFiles.push({
      field_name: upload.field_name,
      name: upload.name,
      type: upload.type || 'application/octet-stream',
      size: Number(upload.size || 0),
      key: fileKey,
      sha256: await sha256Hex(bytes)
    });
  }
  record.file_count = storedFiles.length;
  record.total_file_bytes = totalFileBytes;
  record.files = storedFiles;
  const notificationReceipt = await writeNetlifyFormNotificationReceipt(env, routeRecord, record, key, formsPolicy);
  record.notification = {
    key: notificationReceipt.key,
    status: notificationReceipt.notification.status,
    mode: notificationReceipt.notification.mode,
    created_at: notificationReceipt.notification.created_at,
    external_delivery_enabled: notificationReceipt.notification.external_delivery_enabled,
    external_delivery_attempted: notificationReceipt.notification.external_delivery_attempted,
    delivery_channel: notificationReceipt.notification.delivery_channel || ''
  };
  record.notifications = [
    { key: notificationReceipt.key, status: notificationReceipt.notification.status, created_at: notificationReceipt.notification.created_at }
  ];
  await bucket.put(key, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: projectId,
      deployment_id: deploymentId,
      form_name: submission.formName,
      spam_detected: submission.spam.detected ? 'true' : 'false',
      file_count: String(storedFiles.length),
      notification_status: notificationReceipt.notification.status
    }
  });
  runtimeMeta.runtime_type = 'form_capture';
  runtimeMeta.route_decision = 'netlify.forms.capture';
  const responseHeaders = { ...baseHeaders, 'x-skynet-form-notification': notificationReceipt.key };
  const accept = String(request.headers.get('accept') || '').toLowerCase();
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    const successUrl = new URL(url.toString());
    successUrl.searchParams.set('form', 'success');
    return new Response(null, {
      status: 303,
      headers: { ...responseHeaders, location: successUrl.toString() }
    });
  }
  return httpJson(202, {
    ok: true,
    form_name: submission.formName,
    receipt_key: key,
    project_id: projectId,
    deployment_id: deploymentId,
    spam_detected: submission.spam.detected,
    spam_reasons: submission.spam.reasons || [],
    file_count: storedFiles.length,
    total_file_bytes: totalFileBytes,
    notification_receipt_key: notificationReceipt.key,
    notification_status: notificationReceipt.notification.status
  }, responseHeaders);
}

function staticRouteOptionsResponse(request, routeRecord, runtimeMeta) {
  runtimeMeta.runtime_type = 'static';
  runtimeMeta.route_decision = 'r2.deployment_options';
  return httpJson(200, { ok: true }, {
    ...buildCors(request),
    allow: 'GET, HEAD, OPTIONS, POST',
    'cache-control': 'no-store',
    'x-skynet-route': 'r2-deployment-options',
    'x-skynet-project-id': cleanText(routeRecord.project_id || '', 180),
    'x-skynet-deployment-id': cleanText(routeRecord.active_deployment_id || '', 180)
  });
}

function staticMethodNotAllowedResponse(request, routeRecord, runtimeMeta) {
  runtimeMeta.runtime_type = 'static';
  runtimeMeta.route_decision = 'r2.deployment_method_not_allowed';
  runtimeMeta.error_code = 'SKYENET_STATIC_METHOD_NOT_ALLOWED';
  return httpJson(405, {
    ok: false,
    error: 'SkyeNet static deployments accept GET, HEAD, OPTIONS, and Netlify Forms POST requests.',
    code: 'SKYENET_STATIC_METHOD_NOT_ALLOWED'
  }, {
    ...buildCors(request),
    allow: 'GET, HEAD, OPTIONS, POST',
    'cache-control': 'no-store',
    'x-skynet-route': 'static-method-not-allowed',
    'x-skynet-project-id': cleanText(routeRecord.project_id || '', 180),
    'x-skynet-deployment-id': cleanText(routeRecord.active_deployment_id || '', 180)
  });
}

async function serveDeploymentAsset(request, env, routeRecord, runtimeMeta) {
  const bucket = deploymentBucket(env);
  if (!bucket?.get || !routeRecord) return null;
  const prefix = assetPrefix(routeRecord);
  const url = new URL(request.url);
  const assetPath = mountedAssetPath(url.pathname, routeRecord);
  const normalizedRequestPath = `/${assetPath.replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/';
  if (isDeploymentRuleAssetPath(assetPath)) {
    runtimeMeta.runtime_type = 'static';
    runtimeMeta.route_decision = 'r2.deployment_rule_asset_blocked';
    runtimeMeta.error_code = 'SKYENET_RULE_ASSET_BLOCKED';
    return new Response('Not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-skynet-route': 'rule-asset-blocked',
        'x-skynet-project-id': cleanText(routeRecord.project_id || '', 180),
        'x-skynet-deployment-id': cleanText(routeRecord.active_deployment_id || '', 180)
      }
    });
  }
  const rules = await deploymentRules(bucket, prefix);
  const directAsset = await firstDeploymentAsset(bucket, prefix, assetPath);
  if (request.method === 'GET' || request.method === 'HEAD') {
    for (const rule of rules.redirects) {
      const params = matchNetlifyPattern(rule.from, normalizedRequestPath);
      if (!params) continue;
      if (directAsset && !rule.force) {
        runtimeMeta.route_decision = 'netlify.redirects.shadowed_by_asset';
        continue;
      }
      const target = interpolateNetlifyTarget(rule.to, params);
      if (rule.status === 200) {
        if (/^https?:\/\//i.test(target)) continue;
        const rewritten = target.startsWith('/') ? target : `/${target}`;
        runtimeMeta.route_decision = 'netlify.redirects.rewrite';
        const rewriteAsset = await firstDeploymentAsset(bucket, prefix, rewritten);
        if (rewriteAsset) {
          runtimeMeta.runtime_type = 'static';
          return deploymentAssetResponse(request, {
            bucket,
            key: rewriteAsset.key,
            candidate: rewriteAsset.candidate,
            object: rewriteAsset.object,
            routeRecord,
            rules,
            headerPaths: [normalizedRequestPath, rewritten],
            routeName: 'netlify-rewrite',
            extraHeaders: { 'x-skynet-rewrite-target': rewritten }
          });
        }
        continue;
      }
      if (rule.status >= 300 && rule.status <= 399) {
        const location = publicRedirectLocation(target, url, routeRecord);
        const headers = new Headers({
          location,
          'cache-control': 'no-store'
        });
        headers.set('x-skynet-route', 'netlify-redirect');
        headers.set('x-skynet-project-id', cleanText(routeRecord.project_id || '', 180));
        headers.set('x-skynet-deployment-id', cleanText(routeRecord.active_deployment_id || '', 180));
        runtimeMeta.runtime_type = 'static';
        runtimeMeta.route_decision = 'netlify.redirects.redirect';
        return new Response(null, { status: rule.status, headers });
      }
    }
  }
  if (directAsset) {
    runtimeMeta.runtime_type = 'static';
    runtimeMeta.route_decision = 'r2.deployment_asset';
    return deploymentAssetResponse(request, {
      bucket,
      key: directAsset.key,
      candidate: directAsset.candidate,
      object: directAsset.object,
      routeRecord,
      rules,
      headerPaths: [normalizedRequestPath, `/${directAsset.candidate}`],
      routeName: 'r2-deployment'
    });
  }
  return null;
}

function missingDeploymentAssetResponse(request, routeRecord, runtimeMeta) {
  const url = new URL(request.url);
  const assetPath = mountedAssetPath(url.pathname, routeRecord);
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store'
  });
  headers.set('x-skynet-route', 'asset-missing');
  headers.set('x-skynet-project-id', cleanText(routeRecord.project_id || '', 180));
  headers.set('x-skynet-deployment-id', cleanText(routeRecord.active_deployment_id || '', 180));
  runtimeMeta.runtime_type = 'static';
  runtimeMeta.route_decision = 'r2.deployment_asset_missing';
  runtimeMeta.error_code = 'SKYENET_DEPLOYMENT_ASSET_MISSING';
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkyeNet deployment asset missing</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#f7f7f8;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    main{width:min(720px,calc(100% - 32px));border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:24px;background:rgba(255,255,255,.055)}
    h1{margin:0 0 12px;font-size:clamp(1.8rem,5vw,3.4rem);letter-spacing:0}
    p{color:#c7c7cc;line-height:1.5}
    code{color:#8ab4ff;overflow-wrap:anywhere}
  </style>
</head>
<body>
  <main>
    <h1>SkyeNet route found, asset missing.</h1>
    <p>This route is registered, but the deployment vault does not have the requested root asset. Publish a bundle with <code>index.html</code> at the deployment root, or drop the <code>dist</code>, <code>build</code>, <code>out</code>, or <code>public</code> folder directly.</p>
    <p><code>${cleanText(assetPath || '/', 300)}</code></p>
  </main>
</body>
</html>`, { status: 404, headers });
}

async function proxyFallbackOrigin(request, routeRecord, runtimeMeta) {
  if (!routeRecord?.fallback_origin) return null;
  const incomingUrl = new URL(request.url);
  const upstreamPath = mountedAssetPath(incomingUrl.pathname, routeRecord);
  const targetUrl = new URL(`${upstreamPath}${incomingUrl.search}`, routeRecord.fallback_origin);
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', incomingUrl.hostname);
  headers.set('x-0s-gateway-host', incomingUrl.hostname);
  if (routeRecord.forward_auth !== true) {
    headers.delete('authorization');
    headers.delete('cookie');
  }
  const proxied = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual'
  });
  const response = await fetch(proxied);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('x-skynet-route', 'fallback-origin');
  responseHeaders.set('x-skynet-project-id', cleanText(routeRecord.project_id || '', 180));
  responseHeaders.delete('content-length');
  runtimeMeta.runtime_type = 'static_proxy';
  runtimeMeta.route_decision = 'fallback_origin.proxy';
  runtimeMeta.origin_status = response.status;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

async function serveMappedRoute(request, env, routeRecord, runtimeMeta, context = null) {
  if (!routeRecord) return null;
  const denied = await ensureMappedRouteAccess(request, routeRecord, runtimeMeta);
  if (denied) return denied;
  const url = new URL(request.url);
  const functionInvocation = functionInvocationForMappedPath(mountedAssetPath(url.pathname, routeRecord));
  if (functionInvocation.name) {
    const method = String(request.method || 'GET').toUpperCase();
    if (method === 'OPTIONS') return skynetFunctionOptionsResponse(request, routeRecord, runtimeMeta);
    return serveDeploymentFunction(request, env, routeRecord, functionInvocation, runtimeMeta, context);
  }
  if (routeRecord.asset_mode === 'r2' || routeRecord.asset_prefix) {
    const method = String(request.method || 'GET').toUpperCase();
    if (method === 'OPTIONS') return staticRouteOptionsResponse(request, routeRecord, runtimeMeta);
    if (method === 'POST') {
      const formRequest = routeRecord.fallback_origin ? request.clone() : request;
      const form = await handleNetlifyFormSubmission(formRequest, env, routeRecord, runtimeMeta);
      if (form) return form;
      if (!routeRecord.fallback_origin) return staticMethodNotAllowedResponse(request, routeRecord, runtimeMeta);
    }
    if (method === 'GET' || method === 'HEAD') {
      const asset = await serveDeploymentAsset(request, env, routeRecord, runtimeMeta);
      if (asset) return asset;
      if (!routeRecord.fallback_origin) return missingDeploymentAssetResponse(request, routeRecord, runtimeMeta);
    } else if (!routeRecord.fallback_origin) {
      return staticMethodNotAllowedResponse(request, routeRecord, runtimeMeta);
    }
  }
  return proxyFallbackOrigin(request, routeRecord, runtimeMeta);
}

function hydrateProcessEnv(env) {
  globalThis.__SKYGATE_FS27_ENV = env || {};
  if (!globalThis.process) globalThis.process = { env: {} };
  if (!globalThis.process.env) globalThis.process.env = {};
  for (const [key, value] of Object.entries(env || {})) {
    if (typeof value === 'string' && !globalThis.process.env[key]) {
      globalThis.process.env[key] = value;
    }
  }
  if (globalThis.process.env.NETLIFY_DATABASE_URL && !globalThis.process.env.DATABASE_URL) {
    globalThis.process.env.DATABASE_URL = globalThis.process.env.NETLIFY_DATABASE_URL;
  }
}

async function serveAsset(request, env) {
  if (!env.ASSETS) return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  const normalizedPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
  const alias = ASSET_ALIASES.get(normalizedPath);
  const assetRequest = alias
    ? new Request(new URL(`${alias}${url.search}`, url), request)
    : request;
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status !== 404) return response;

  if (!url.pathname.includes('.') && request.method === 'GET') {
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  }
  return response;
}

function runtimeContext(context, env) {
  return {
    ...(context || {}),
    env,
    waitUntil: typeof context?.waitUntil === 'function' ? context.waitUntil.bind(context) : undefined,
    passThroughOnException: typeof context?.passThroughOnException === 'function'
      ? context.passThroughOnException.bind(context)
      : undefined
  };
}

export default {
  async fetch(request, env, context) {
    hydrateProcessEnv(env);
    return withRuntimeLedger(request, env, context, async ({ routeRecord, runtimeMeta }) => {
      const functionContext = runtimeContext(context, env);
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        runtimeMeta.runtime_type = 'fs27_metadata';
        runtimeMeta.route_decision = 'fs27.favicon';
        return faviconResponse();
      }
      if (url.pathname === '/api/vantacore/crm' || url.pathname.startsWith('/api/vantacore/crm/')) {
        runtimeMeta.runtime_type = 'fs27_function';
        runtimeMeta.function_name = 'vantacore-crm';
        runtimeMeta.route_decision = 'fs27.route_table';
        return vantacoreCrm(request, functionContext);
      }
      const handler = routeMap.get(routeKey(request.method, url.pathname));
      if (handler) {
        runtimeMeta.runtime_type = 'fs27_function';
        runtimeMeta.function_name = functionNameFromPath(url.pathname);
        runtimeMeta.route_decision = 'fs27.route_table';
        return handler(request, functionContext);
      }
      if (request.method === 'OPTIONS') {
        const maybePost = routeMap.get(routeKey('POST', url.pathname));
        const maybeGet = routeMap.get(routeKey('GET', url.pathname));
        if (maybePost || maybeGet) {
          runtimeMeta.runtime_type = 'fs27_function';
          runtimeMeta.function_name = functionNameFromPath(url.pathname);
          runtimeMeta.route_decision = 'fs27.options_route_table';
          return (maybePost || maybeGet)(request, functionContext);
        }
      }
      const mapped = await serveMappedRoute(request, env, routeRecord, runtimeMeta, context);
      if (mapped) return mapped;
      if (isBlockedLocalAssetPath(url.pathname)) {
        runtimeMeta.runtime_type = 'fs27_asset';
        runtimeMeta.route_decision = 'fs27.blocked_source_asset';
        runtimeMeta.error_code = 'BLOCKED_SOURCE_ASSET';
        return new Response('Not found', { status: 404 });
      }
      runtimeMeta.runtime_type = 'fs27_asset';
      runtimeMeta.route_decision = 'fs27.asset_binding';
      return serveAsset(request, env);
    });
  },
  async queue(batch, env, context) {
    hydrateProcessEnv(env);
    return handleRuntimeEventQueue(batch, env, context);
  },
  async scheduled(controller, env, context) {
    hydrateProcessEnv(env);
    const run = runScheduledSkyeNetFunctions(controller, env, context);
    if (typeof context?.waitUntil === 'function') context.waitUntil(run);
    return run;
  }
};
