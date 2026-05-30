import skyeCommerceApp from './skyecommerce-runtime/index.js';

export const SKYECOMMERCE_MOUNT = '/SkyeCommerce';
const SKYECOMMERCE_CANONICAL_AE_PATH = '/Marketing-Made-Easy/AE-FlowPro/';

function mountedSuffix(pathname = '') {
  if (pathname === SKYECOMMERCE_MOUNT) return '/';
  const suffix = pathname.slice(SKYECOMMERCE_MOUNT.length);
  return suffix || '/';
}

function isRetiredAeSurface(pathname = '') {
  const suffix = mountedSuffix(pathname).replace(/\/+$/, '') || '/';
  return suffix === '/ae' || suffix === '/ae/index.html';
}

function retiredAeRedirect(url) {
  const target = new URL(SKYECOMMERCE_CANONICAL_AE_PATH, url.origin);
  target.searchParams.set('source', 'skyecommerce-retired-ae');
  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      'cache-control': 'no-store'
    }
  });
}

function skyeCommerceAssetPath(pathname = '') {
  const suffix = pathname || '/';
  return `${SKYECOMMERCE_MOUNT}/public${suffix}`;
}

function mountedAssetLocation(location = '', origin = '') {
  if (!location) return '';
  const resolved = new URL(location, origin);
  if (resolved.pathname === `${SKYECOMMERCE_MOUNT}/public`) {
    resolved.pathname = SKYECOMMERCE_MOUNT;
  } else if (resolved.pathname.startsWith(`${SKYECOMMERCE_MOUNT}/public/`)) {
    resolved.pathname = `${SKYECOMMERCE_MOUNT}/${resolved.pathname.slice(`${SKYECOMMERCE_MOUNT}/public/`.length)}`;
  } else if (resolved.pathname === '/public') {
    resolved.pathname = SKYECOMMERCE_MOUNT;
  } else if (resolved.pathname.startsWith('/public/')) {
    resolved.pathname = `${SKYECOMMERCE_MOUNT}/${resolved.pathname.slice('/public/'.length)}`;
  }
  return resolved.toString();
}

function rewriteAssetLocation(response, origin) {
  const location = response.headers.get('location');
  if (!location) return response;
  const nextHeaders = new Headers(response.headers);
  nextHeaders.set('location', mountedAssetLocation(location, origin));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders
  });
}

function skyeCommerceAssets(env) {
  return {
    async fetch(input, init) {
      if (!env.ASSETS) return new Response('0S assets binding is required for SkyeCommerce.', { status: 503 });
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      url.pathname = skyeCommerceAssetPath(url.pathname);
      const response = await env.ASSETS.fetch(new Request(url.toString(), request));
      return rewriteAssetLocation(response, url.origin);
    }
  };
}

function gateHandoffSecret(env) {
  return String(
    env.SKYECOMMERCE_GATE_HANDOFF_SECRET
    || env.OWNER_ADMIN_SESSION_SECRET
    || env.FREE99_ADMIN_CODE
    || env.SITE_OPERATOR_ADMIN_TOKEN
    || ''
  ).trim();
}

function appEnv(env, request, url) {
  const secret = gateHandoffSecret(env);
  return {
    ...env,
    DB: env.SKYECOMMERCE_DB || env.SKYE_COMMERCE_DB || env.CITADELDB,
    ASSETS: skyeCommerceAssets(env),
    SESSION_SECRET: env.SKYECOMMERCE_SESSION_SECRET || env.SESSION_SECRET || env.OWNER_ADMIN_SESSION_SECRET || secret,
    PROVIDER_CONFIG_ENCRYPTION_KEY: env.SKYECOMMERCE_PROVIDER_CONFIG_ENCRYPTION_KEY || env.PROVIDER_CONFIG_ENCRYPTION_KEY || env.OWNER_ADMIN_SESSION_SECRET || secret,
    PUBLIC_BASE_URL: env.SKYECOMMERCE_PUBLIC_BASE_URL || `${url.origin}${SKYECOMMERCE_MOUNT}`,
    SKYECOMMERCE_GATE_HANDOFF_SECRET: secret,
    COOKIE_SECURE: env.SKYECOMMERCE_COOKIE_SECURE || env.COOKIE_SECURE || (url.protocol === 'https:' ? 'true' : 'false')
  };
}

function actorEmail(auth, env) {
  return String(
    auth?.identity?.email
    || auth?.gate?.data?.email
    || auth?.gate?.data?.username
    || auth?.actor
    || env.SKYECOMMERCE_OWNER_EMAIL
    || 'owner@metraiyux-0s.local'
  ).trim();
}

function actorName(auth, env) {
  return String(
    auth?.identity?.name
    || auth?.gate?.data?.name
    || auth?.gate?.data?.display_name
    || env.SKYECOMMERCE_OWNER_NAME
    || actorEmail(auth, env)
  ).trim();
}

function appRequest(request, url, env, auth) {
  const target = new URL(request.url);
  target.pathname = mountedSuffix(url.pathname);
  const headers = new Headers(request.headers);
  const secret = gateHandoffSecret(env);
  if (secret) headers.set('x-skyecommerce-gate-handoff', secret);
  headers.set('x-skyecommerce-gate-email', actorEmail(auth, env));
  headers.set('x-skyecommerce-gate-name', actorName(auth, env));
  headers.set('x-skyecommerce-mounted-base', SKYECOMMERCE_MOUNT);
  return new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: request.redirect
  });
}

function rewriteMountedLocation(response, requestUrl) {
  const location = response.headers.get('location');
  if (!location) return response;
  const nextHeaders = new Headers(response.headers);
  const resolved = new URL(location, requestUrl.origin);
  if (resolved.pathname === `${SKYECOMMERCE_MOUNT}/public`) {
    resolved.pathname = SKYECOMMERCE_MOUNT;
  } else if (resolved.pathname.startsWith(`${SKYECOMMERCE_MOUNT}/public/`)) {
    resolved.pathname = `${SKYECOMMERCE_MOUNT}/${resolved.pathname.slice(`${SKYECOMMERCE_MOUNT}/public/`.length)}`;
  } else if (!resolved.pathname.startsWith(SKYECOMMERCE_MOUNT)) {
    resolved.pathname = `${SKYECOMMERCE_MOUNT}${resolved.pathname}`;
  }
  nextHeaders.set('location', resolved.toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders
  });
}

export async function handleSkyeCommerceRoute(request, env, ctx, url, helpers = {}) {
  if (url.pathname !== SKYECOMMERCE_MOUNT && !url.pathname.startsWith(`${SKYECOMMERCE_MOUNT}/`)) return null;
  const auth = helpers.requireGateAuth ? await helpers.requireGateAuth(request, env, 'SkyeCommerce shared 0S gate') : { ok: true };
  if (!auth.ok) return auth.response;
  if (isRetiredAeSurface(url.pathname)) return retiredAeRedirect(url);
  if (!skyeCommerceApp?.fetch) return new Response('SkyeCommerce runtime is not available.', { status: 503 });
  const response = await skyeCommerceApp.fetch(appRequest(request, url, env, auth), appEnv(env, request, url), ctx);
  return rewriteMountedLocation(response, url);
}
