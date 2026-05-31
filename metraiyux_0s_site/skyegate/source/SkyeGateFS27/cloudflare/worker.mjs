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
  ['OPTIONS', '/deploy/source-transfer', handleSkyeNetDeployRequest],
  ['POST', '/deploy/source-transfer', handleSkyeNetDeployRequest],
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
      owner: 'SkyeGateFS27',
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

function compactFormValue(value) {
  if (value && typeof value === 'object' && 'name' in value && 'size' in value) {
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

async function parseNetlifyFormSubmission(request) {
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  const fields = {};
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    for (const [name, value] of form.entries()) setFormField(fields, name, value);
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
  return { formName, fields };
}

async function handleNetlifyFormSubmission(request, env, routeRecord, runtimeMeta) {
  if (String(request.method || 'GET').toUpperCase() !== 'POST') return null;
  const submission = await parseNetlifyFormSubmission(request);
  if (!submission) return null;
  const bucket = env.SKYENET_FORMS_BUCKET || env.REQUEST_LOG_BUCKET;
  const url = new URL(request.url);
  const projectId = cleanText(routeRecord.project_id || 'unknown-project', 180);
  const deploymentId = cleanText(routeRecord.active_deployment_id || 'active', 180);
  const submissionId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = [
    'skynet',
    'forms',
    `project=${safeKeySegment(projectId)}`,
    `deployment=${safeKeySegment(deploymentId)}`,
    `form=${safeKeySegment(submission.formName, 'form')}`,
    new Date().toISOString().slice(0, 10),
    `${safeKeySegment(submissionId)}.json`
  ].join('/');
  const record = {
    schema: 'skyenet.netlify-form-submission.v1',
    received_at: new Date().toISOString(),
    submission_id: submissionId,
    form_name: submission.formName,
    project_id: projectId,
    deployment_id: deploymentId,
    hostname: url.hostname,
    path: url.pathname,
    mount_path: cleanText(routeRecord.mount_path || '', 300),
    fields: submission.fields,
    request: {
      content_type: cleanText(request.headers.get('content-type') || '', 180),
      user_agent: cleanText(request.headers.get('user-agent') || '', 240),
      referer: cleanText(request.headers.get('referer') || '', 500)
    }
  };
  if (!bucket?.put) {
    runtimeMeta.runtime_type = 'form_capture';
    runtimeMeta.route_decision = 'netlify.forms.bucket_missing';
    runtimeMeta.error_code = 'SKYENET_FORMS_BUCKET_MISSING';
    return httpJson(503, {
      ok: false,
      error: 'SkyeNet form capture bucket is not configured.',
      code: 'SKYENET_FORMS_BUCKET_MISSING'
    }, {
      ...buildCors(request),
      'cache-control': 'no-store',
      'x-skynet-route': 'netlify-form',
      'x-skynet-project-id': projectId,
      'x-skynet-deployment-id': deploymentId,
      'x-skynet-form-name': submission.formName
    });
  }
  await bucket.put(key, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
    customMetadata: {
      project_id: projectId,
      deployment_id: deploymentId,
      form_name: submission.formName
    }
  });
  runtimeMeta.runtime_type = 'form_capture';
  runtimeMeta.route_decision = 'netlify.forms.capture';
  const baseHeaders = {
    ...buildCors(request),
    'cache-control': 'no-store',
    'x-skynet-route': 'netlify-form',
    'x-skynet-project-id': projectId,
    'x-skynet-deployment-id': deploymentId,
    'x-skynet-form-name': submission.formName,
    'x-skynet-form-receipt': key
  };
  const accept = String(request.headers.get('accept') || '').toLowerCase();
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    const successUrl = new URL(url.toString());
    successUrl.searchParams.set('form', 'success');
    return new Response(null, {
      status: 303,
      headers: { ...baseHeaders, location: successUrl.toString() }
    });
  }
  return httpJson(202, {
    ok: true,
    form_name: submission.formName,
    receipt_key: key,
    project_id: projectId,
    deployment_id: deploymentId
  }, baseHeaders);
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

async function serveMappedRoute(request, env, routeRecord, runtimeMeta) {
  if (!routeRecord) return null;
  const denied = await ensureMappedRouteAccess(request, routeRecord, runtimeMeta);
  if (denied) return denied;
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
      const mapped = await serveMappedRoute(request, env, routeRecord, runtimeMeta);
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
  }
};
