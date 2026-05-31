import { handler as adminBackup } from '../netlify/functions/admin-backup.js';
import { handler as adminConfig } from '../netlify/functions/admin-config.js';
import { handler as adminDriveTest } from '../netlify/functions/admin-drive-test.js';
import { handler as adminExport } from '../netlify/functions/admin-export.js';
import { handler as adminHealth } from '../netlify/functions/admin-health.js';
import { handler as adminNotificationReplay } from '../netlify/functions/admin-notification-replay.js';
import { handler as adminNotificationTest } from '../netlify/functions/admin-notification-test.js';
import { handler as adminVaultDownload } from '../netlify/functions/admin-vault-download.js';
import { handler as clientVault } from '../netlify/functions/client-vault.js';
import { handler as maintenanceSweep } from '../netlify/functions/maintenance-sweep.js';
import { handler as operatorLogout } from '../netlify/functions/operator-logout.js';
import { handler as operatorSession } from '../netlify/functions/operator-session.js';
import { handler as provisionWorkspace } from '../netlify/functions/provision-workspace.js';
import { handler as publicConfig } from '../netlify/functions/public-config.js';
import { handler as setupDiagnostics } from '../netlify/functions/setup-diagnostics.js';
import { handler as setupFolderHelper } from '../netlify/functions/setup-folder-helper.js';
import { handler as uploadComplete } from '../netlify/functions/upload-complete.js';
import { handler as uploadPartUrl } from '../netlify/functions/upload-part-url.js';
import { handler as uploadSession } from '../netlify/functions/upload-session.js';
import { handler as uploadStatus } from '../netlify/functions/upload-status.js';
import { hasValidFs27BoundOperatorSession, introspectSkygateBearer, introspectZeroOsOwnerBearer } from '../netlify/functions/_lib/security.js';
import { ADMIN_HTML, SETUP_HTML } from './internal-pages.generated.mjs';

const DEFAULT_ZERO_OS_ORIGIN = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';

const HANDLERS = {
  'admin-backup': adminBackup,
  'admin-config': adminConfig,
  'admin-drive-test': adminDriveTest,
  'admin-export': adminExport,
  'admin-health': adminHealth,
  'admin-notification-replay': adminNotificationReplay,
  'admin-notification-test': adminNotificationTest,
  'admin-vault-download': adminVaultDownload,
  'client-vault': clientVault,
  'maintenance-sweep': maintenanceSweep,
  'operator-logout': operatorLogout,
  'operator-session': operatorSession,
  'provision-workspace': provisionWorkspace,
  'public-config': publicConfig,
  'setup-diagnostics': setupDiagnostics,
  'setup-folder-helper': setupFolderHelper,
  'upload-complete': uploadComplete,
  'upload-part-url': uploadPartUrl,
  'upload-session': uploadSession,
  'upload-status': uploadStatus
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'content-security-policy': [
    "default-src 'self'",
    "connect-src 'self' https://www.googleapis.com https://*.googleapis.com https://challenges.cloudflare.com https://*.r2.cloudflarestorage.com",
    "img-src 'self' data:",
    "style-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com",
    'frame-src https://challenges.cloudflare.com',
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    'upgrade-insecure-requests'
  ].join('; ')
};

const GATE_PROTECTED_FUNCTIONS = new Set([
  'admin-backup',
  'admin-config',
  'admin-drive-test',
  'admin-export',
  'admin-health',
  'admin-notification-replay',
  'admin-notification-test',
  'admin-vault-download',
  'maintenance-sweep',
  'provision-workspace',
  'setup-diagnostics',
  'setup-folder-helper'
]);

const LOCAL_OPERATOR_FUNCTIONS = new Set(['operator-logout']);

function bindEnv(env, request) {
  globalThis.__SKYEVAULT_WORKER_ENV = env || {};
  if (!globalThis.process) globalThis.process = { env: {} };
  if (!globalThis.process.env) globalThis.process.env = {};
  for (const [key, value] of Object.entries(env || {})) {
    if (typeof value === 'string') globalThis.process.env[key] = value;
  }
  const origin = new URL(request.url).origin;
  globalThis.process.env.URL = globalThis.process.env.URL || origin;
  globalThis.process.env.DEPLOY_URL = globalThis.process.env.DEPLOY_URL || origin;
}

function queryStringParameters(url) {
  const params = {};
  for (const [key, value] of url.searchParams.entries()) params[key] = value;
  return params;
}

async function toNetlifyEvent(request) {
  const url = new URL(request.url);
  const headers = {};
  for (const [key, value] of request.headers.entries()) headers[key] = value;
  return {
    httpMethod: request.method,
    path: url.pathname,
    rawUrl: request.url,
    headers,
    queryStringParameters: queryStringParameters(url),
    body: ['GET', 'HEAD'].includes(request.method) ? '' : await request.text(),
    isBase64Encoded: false
  };
}

function headerOnlyNetlifyEvent(request) {
  const url = new URL(request.url);
  const headers = {};
  for (const [key, value] of request.headers.entries()) headers[key] = value;
  return {
    httpMethod: request.method,
    path: url.pathname,
    rawUrl: request.url,
    headers,
    queryStringParameters: queryStringParameters(url),
    body: '',
    isBase64Encoded: false
  };
}

function withSecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  if (pathname.startsWith('/assets/')) headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (pathname === '/admin.html' || pathname === '/setup.html' || pathname === '/operator.html' || pathname.startsWith('/api/')) {
    headers.set('cache-control', 'no-store');
    headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function toWorkerResponse(result, pathname = '') {
  const headers = new Headers(result.headers || {});
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  if (pathname === '/admin.html' || pathname === '/setup.html') {
    headers.set('cache-control', 'no-store');
    headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  }
  const body = result.isBase64Encoded ? Uint8Array.from(atob(result.body || ''), (char) => char.charCodeAt(0)) : (result.body || '');
  return new Response(body, { status: result.statusCode || 200, headers });
}

function html(statusCode, body, headers = {}) {
  return toWorkerResponse({
    statusCode,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      ...headers
    },
    body
  });
}

function redirect(location) {
  return html(302, '', { location });
}

function sharedGateLoginUrl(request, returnTo) {
  const zeroOsOrigin = String(
    globalThis.process?.env?.ZERO_OS_ORIGIN
    || globalThis.process?.env?.ZERO_OS_BASE_URL
    || globalThis.process?.env?.METRAIYUX_ZERO_OS_ORIGIN
    || DEFAULT_ZERO_OS_ORIGIN
  ).replace(/\/+$/, '');
  const returnUrl = new URL(returnTo, request.url).href;
  return `${zeroOsOrigin}/admin/login.html?return=${encodeURIComponent(returnUrl)}`;
}

function gateScopeList(scope) {
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope || '').split(/\s+/).filter(Boolean);
}

function allowsSkyeVaultOwnerAdmin(claims = {}) {
  if (!claims.active && !claims.ok) return false;
  const role = String(claims.role || claims.user?.role || '').toLowerCase();
  const scopes = new Set(gateScopeList(claims.scope || claims.scopes || claims.user?.scope).map((scope) => scope.toLowerCase()));
  return ['founder', 'owner', 'admin', 'deployer', 'operator'].includes(role)
    || scopes.has('admin.write')
    || scopes.has('admin.read')
    || scopes.has('gateway.invoke')
    || scopes.has('skyevault.admin')
    || scopes.has('vault.admin');
}

function gateDeniedResponse(statusCode, error) {
  return toWorkerResponse({
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    body: JSON.stringify({ ok: false, error })
  });
}

async function requireSkyVaultGateAdmin(request, options = {}) {
  const event = headerOnlyNetlifyEvent(request);
  void options;
  if (hasValidFs27BoundOperatorSession(event)) return { ok: true };

  let gate = await introspectSkygateBearer(event);
  if (!gate.ok) {
    const zeroOs = await introspectZeroOsOwnerBearer(event);
    if (zeroOs.ok) gate = zeroOs;
    else {
      return {
        ok: false,
        response: gateDeniedResponse(gate.statusCode || zeroOs.statusCode || 401, gate.error || zeroOs.error || 'FS27/SkyGate owner-admin bearer is required for SkyeVault mounted admin access.')
      };
    }
  }
  if (!allowsSkyeVaultOwnerAdmin(gate.claims)) {
    const zeroOs = gate.path === '/api/owner/admin-session' ? gate : await introspectZeroOsOwnerBearer(event);
    if (zeroOs.ok && allowsSkyeVaultOwnerAdmin(zeroOs.claims)) gate = zeroOs;
    else {
      return {
        ok: false,
        response: gateDeniedResponse(403, 'FS27/SkyGate bearer is active, but it is not owner/admin scoped for SkyeVault.')
      };
    }
  }
  return { ok: true };
}

function localOperatorSessionsAllowed() {
  return String(globalThis.process?.env?.SKYEVAULT_ALLOW_LOCAL_OPERATOR_SESSION || '').toLowerCase() === 'true';
}

async function operatorPage(request, page) {
  const gate = await requireSkyVaultGateAdmin(request);
  if (!gate.ok) {
    const returnTo = page === 'setup' ? '/setup.html' : '/admin.html';
    return redirect(sharedGateLoginUrl(request, returnTo));
  }
  return html(200, page === 'setup' ? SETUP_HTML : ADMIN_HTML);
}

function functionNameForPath(pathname) {
  if (pathname.startsWith('/api/')) return pathname.slice('/api/'.length).split('/')[0];
  if (pathname.startsWith('/.netlify/functions/')) return pathname.slice('/.netlify/functions/'.length).split('/')[0];
  return '';
}

async function routeFunction(request, pathname) {
  const name = functionNameForPath(pathname);
  const handler = HANDLERS[name];
  if (!handler) {
    return toWorkerResponse({
      statusCode: 404,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      body: JSON.stringify({ ok: false, error: `Function ${name || pathname} was not found.` })
    }, pathname);
  }
  if (LOCAL_OPERATOR_FUNCTIONS.has(name) && !localOperatorSessionsAllowed()) {
    return gateDeniedResponse(410, 'SkyeVault local operator sessions are disabled on the mounted 0S surface. Use the shared FS27/SkyGate owner session.');
  }
  if (GATE_PROTECTED_FUNCTIONS.has(name)) {
    const gate = await requireSkyVaultGateAdmin(request);
    if (!gate.ok) return gate.response;
  }
  const result = await handler(await toNetlifyEvent(request));
  return toWorkerResponse(result, pathname);
}

export default {
  async fetch(request, env) {
    bindEnv(env, request);
    const url = new URL(request.url);
    if (url.pathname === '/admin.html') return operatorPage(request, 'admin');
    if (url.pathname === '/setup.html') return operatorPage(request, 'setup');
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/functions/')) {
      return routeFunction(request, url.pathname);
    }
    const response = await env.ASSETS.fetch(request);
    return withSecurityHeaders(response, url.pathname);
  },

  async scheduled(controller, env) {
    const request = new Request('https://skyevault-drop.worker/scheduled-maintenance', { method: 'GET' });
    bindEnv({ ...env, MAINTENANCE_ALLOW_UNAUTHENTICATED_SCHEDULE: 'true' }, request);
    await maintenanceSweep({
      httpMethod: 'GET',
      headers: { 'x-scheduled': 'cloudflare-cron' },
      queryStringParameters: {},
      body: ''
    });
  }
};
