import health from '../netlify/functions/health.js';
import authIntrospect from '../netlify/functions/auth-introspect.js';
import authSignup from '../netlify/functions/auth-signup.js';
import authLogin from '../netlify/functions/auth-login.js';
import adminLogin from '../netlify/functions/admin-login.js';
import adminPlatformEvents from '../netlify/functions/admin-platform-events.js';
import platformEventIngest from '../netlify/functions/platform-event-ingest.js';
import sessionToken from '../netlify/functions/session-token.js';
import authTokenIssue from '../netlify/functions/auth-token-issue.js';
import oauthJwks from '../netlify/functions/oauth-jwks.js';
import openidConfiguration from '../netlify/functions/openid-configuration.js';
import oauthWellKnown from '../netlify/functions/oauth-well-known.js';

const ROUTES = [
  ['GET', '/health', health],
  ['GET', '/.netlify/functions/health', health],
  ['POST', '/auth/signup', authSignup],
  ['POST', '/.netlify/functions/auth-signup', authSignup],
  ['POST', '/auth/login', authLogin],
  ['POST', '/.netlify/functions/auth-login', authLogin],
  ['POST', '/auth-introspect', authIntrospect],
  ['POST', '/auth/introspect', authIntrospect],
  ['POST', '/.netlify/functions/auth-introspect', authIntrospect],
  ['POST', '/admin/login', adminLogin],
  ['POST', '/.netlify/functions/admin-login', adminLogin],
  ['GET', '/admin/platform-events', adminPlatformEvents],
  ['GET', '/.netlify/functions/admin-platform-events', adminPlatformEvents],
  ['POST', '/platform/events', platformEventIngest],
  ['POST', '/.netlify/functions/platform-event-ingest', platformEventIngest],
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
  ['GET', '/.netlify/functions/oauth-well-known', oauthWellKnown]
];

function routeKey(method, pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return `${method.toUpperCase()} ${normalized}`;
}

const routeMap = new Map(ROUTES.map(([method, path, handler]) => [routeKey(method, path), handler]));

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
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404) return response;

  const url = new URL(request.url);
  if (!url.pathname.includes('.') && request.method === 'GET') {
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  }
  return response;
}

export default {
  async fetch(request, env, context) {
    hydrateProcessEnv(env);
    const url = new URL(request.url);
    const handler = routeMap.get(routeKey(request.method, url.pathname));
    if (handler) return handler(request, context);
    if (request.method === 'OPTIONS') {
      const maybePost = routeMap.get(routeKey('POST', url.pathname));
      const maybeGet = routeMap.get(routeKey('GET', url.pathname));
      if (maybePost || maybeGet) return (maybePost || maybeGet)(request, context);
    }
    return serveAsset(request, env);
  }
};
