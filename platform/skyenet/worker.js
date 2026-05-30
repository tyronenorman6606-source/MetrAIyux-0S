const API_PREFIX = '/api/skyenet';
const DEPLOY_API_MAP = new Map([
  ['/status', '/deploy/status'],
  ['/workspace', '/deploy/workspace'],
  ['/dashboard', '/deploy/dashboard'],
  ['/env', '/deploy/env'],
  ['/source-upload', '/deploy/source-upload'],
  ['/source-archive', '/deploy/source-archive'],
  ['/source-complete', '/deploy/source-complete'],
  ['/source-manifest', '/deploy/source-manifest'],
  ['/source-tree', '/deploy/source-tree'],
  ['/source-file', '/deploy/source-file'],
  ['/source-search', '/deploy/source-search'],
  ['/source-download', '/deploy/source-download'],
  ['/source-transfer', '/deploy/source-transfer'],
  ['/receipts', '/deploy/receipts'],
  ['/routes', '/deploy/routes'],
  ['/observability', '/deploy/observability'],
  ['/cost-model', '/deploy/cost-model'],
  ['/rollback', '/deploy/rollback']
]);

function cleanOrigin(value, fallback) {
  return String(value || fallback || '').replace(/\/+$/, '');
}

function securityHeaders(headers = new Headers()) {
  headers.set('x-skynet-standalone-project', 'skyenet');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  return headers;
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: securityHeaders(new Headers({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra
    }))
  });
}

function htmlRedirect(url, status = 302) {
  return new Response(null, {
    status,
    headers: securityHeaders(new Headers({ location: url }))
  });
}

function notFound() {
  return new Response('SkyeNet route not found', {
    status: 404,
    headers: securityHeaders(new Headers({
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    }))
  });
}

function consoleResponse() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkyeNet Console</title>
  <meta name="description" content="SkyeNet standalone deploy console using the shared 0S and FS27 gate lane.">
  <link rel="stylesheet" href="/assets/skyenet.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/">
      <img src="/assets/skyenet-mark.svg" alt="">
      <span><strong>SkyeNet</strong><small>Deploy console</small></span>
    </a>
    <nav aria-label="SkyeNet console navigation">
      <a href="/">Home</a>
      <a href="/login">Shared gate</a>
    </nav>
  </header>
  <main>
    <section class="console-shell">
      <div>
        <p class="eyebrow">Shared gate console</p>
        <h1>SkyeNet account command.</h1>
        <p class="lede">Your shared 0S/FS27 gate session unlocks SkyeNet workspaces, deployment receipts, live routes, source downloads, and stored source transfers without a second founder, owner, or deployer password.</p>
      </div>
      <section class="console-grid">
        <form id="tokenForm" class="token-panel">
          <label>
            <span>Gate bearer</span>
            <input id="tokenInput" type="password" autocomplete="current-password" placeholder="Paste shared gate session">
          </label>
          <button type="submit">Use gate session</button>
          <p id="sourceStatus" class="mini-status">Source downloads and stored transfers use the same shared gate session.</p>
        </form>
        <section class="status-panel" aria-live="polite">
          <h2>Account</h2>
          <div id="accountOutput" class="metric-grid">
            <span>Waiting for gate session</span>
          </div>
        </section>
      </section>
      <section class="status-panel wide" aria-live="polite">
        <h2>Publish package</h2>
        <form id="deployForm" class="deploy-form">
          <label><span>Workspace</span><input name="workspace_id" placeholder="default-workspace" value="default-workspace" required></label>
          <label><span>Project</span><input name="project_id" placeholder="project-slug" required></label>
          <label><span>Plan</span><select name="plan_name"><option value="free99">Free99</option><option value="skyenet-edge-starter">Edge Starter</option><option value="skyenet-edge-growth">Edge Growth</option><option value="skyenet-functions-managed">Functions Managed</option><option value="skyenet-sovereign-runtime-reserve">Sovereign Runtime Reserve</option></select></label>
          <label><span>Host</span><input name="hostname" placeholder="skyenet.company-slug" value="skyenet.graylondonskyes.workers.dev" required></label>
          <label><span>Mount</span><input name="mount_path" placeholder="/project-slug" value="/"></label>
          <label><span>URL mode</span><select name="url_mode"><option value="">Path route</option><option value="subdomain">Host-native</option></select></label>
          <label class="file-field"><span>Public build folder</span><input id="publicBuildInput" name="public_files" type="file" webkitdirectory directory multiple required></label>
          <label class="file-field"><span>Private full source folder</span><input id="privateSourceInput" name="source_files" type="file" webkitdirectory directory multiple></label>
          <label class="checkbox-line"><input name="public_access" type="checkbox" checked> Public route</label>
          <button type="submit">Publish full package</button>
        </form>
        <p id="deployStatus" class="mini-status">Waiting for gate session and folders.</p>
        <progress id="deployProgress" max="100" value="0"></progress>
        <pre id="deployResult">No package published from this console yet.</pre>
      </section>
      <section class="dashboard-grid" aria-live="polite">
        <section class="status-panel wide">
          <h2>Deployments</h2>
          <div id="deploymentList" class="list-panel">Checking deployments...</div>
        </section>
        <section class="status-panel">
          <h2>Routes</h2>
          <div id="routeList" class="list-panel">Checking routes...</div>
        </section>
        <section class="status-panel">
          <h2>Receipts</h2>
          <div id="receiptList" class="list-panel">Checking receipts...</div>
        </section>
      </section>
      <section class="dashboard-grid" aria-live="polite">
        <section class="status-panel wide">
          <h2>Environment variables</h2>
          <p class="mini-status">Project env values are stored behind the shared gate and only show redacted previews in the console.</p>
          <form id="envForm" class="token-panel env-form">
            <label><span>Project</span><input name="project_id" placeholder="project slug" required></label>
            <label><span>Key</span><input name="key" placeholder="API_TOKEN" required></label>
            <label><span>Value</span><input name="value" type="password" autocomplete="new-password" placeholder="Paste value"></label>
            <label><span>Scope</span><input name="scope" value="production"></label>
            <label class="checkbox-line"><input name="secret" type="checkbox" checked> Secret</label>
            <button type="submit">Save env var</button>
          </form>
          <p id="envStatus" class="mini-status">Waiting for gate session.</p>
        </section>
        <section class="status-panel wide">
          <h2>Env registry</h2>
          <div id="envList" class="list-panel">Choose a workspace/project and save or refresh variables.</div>
        </section>
        <section class="status-panel">
          <h2>Source custody</h2>
          <p class="mini-status">New CLI deploys can upload a private full project source package separately from public assets. Source downloads prefer that private package and never serve it from public routes.</p>
          <pre>npm run skyenet:deploy -- --dir dist --source-root . --project my-app --workspace my-company --host skyenet.my-company --mount / --url-mode subdomain --public</pre>
        </section>
      </section>
      <section class="status-panel" aria-live="polite">
        <h2>Runtime status</h2>
        <pre id="statusOutput">Checking SkyeNet...</pre>
      </section>
    </section>
  </main>
  <script src="/assets/skyenet.js" defer></script>
</body>
</html>`, {
    headers: securityHeaders(new Headers({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60'
    }))
  });
}

function publishResponse() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Post to SkyeNet | Publishing and Pricing</title>
  <meta name="description" content="How to publish a regular site, landing page, PWA, or static app to the standalone SkyeNet deploy network, with current plan caps and pricing posture.">
  <link rel="stylesheet" href="/assets/skyenet.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/">
      <img src="/assets/skyenet-mark.svg" alt="">
      <span><strong>SkyeNet</strong><small>Publish guide</small></span>
    </a>
    <nav aria-label="SkyeNet publishing navigation">
      <a href="/">Home</a>
      <a href="#pricing">Pricing</a>
      <a href="/console">Console</a>
      <a href="/bobs-smoke-shop/">Example app</a>
      <a href="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html">0S Gate</a>
    </nav>
  </header>
  <main>
    <section class="guide-hero">
      <div>
        <p class="eyebrow">Post to SkyeNet</p>
        <h1>Publish a real app or landing page on the standalone SkyeNet edge.</h1>
        <p class="lede">SkyeNet gives a workspace, live route, deployment receipt, account-scoped source download, and explicit transfer lane for client-facing static sites, PWAs, and built frontend apps. The shared 0S/FS27 gate owns account access, so there is no second SkyeNet password to manage.</p>
        <div class="actions">
          <a class="primary" href="/console">Open console</a>
          <a href="#pricing">See plan caps</a>
          <a href="/bobs-smoke-shop/">View live example</a>
        </div>
      </div>
      <aside class="guide-card">
        <span>Canonical route</span>
        <strong>https://skyenet.&lt;company-slug&gt;/</strong>
        <small>Old 0S /skyenet links are legacy or staging. Shared workers.dev path routes are infrastructure or fallback unless the owner approves them as public copy.</small>
      </aside>
    </section>
    <section class="band guide-section">
      <div class="section-heading">
        <p class="eyebrow">Normal posting flow</p>
        <h2>From folder to live route.</h2>
      </div>
      <div class="step-grid">
        <article><span>1</span><h3>Open the console</h3><p>Use the standalone console and sign in through the shared 0S/FS27 gate.</p><a href="/console">Open console</a></article>
        <article><span>2</span><h3>Choose a workspace</h3><p>Create or resume a workspace, pick the plan, and keep the project slug simple.</p></article>
        <article><span>3</span><h3>Drop the build</h3><p>Upload a built folder. SkyeNet promotes common roots like dist, build, out, and public.</p></article>
        <article><span>4</span><h3>Publish the route</h3><p>SkyeNet checks for a root index.html, writes the deployment receipt, and returns the live URL.</p></article>
      </div>
    </section>
    <section class="band guide-section">
      <div class="section-heading">
        <p class="eyebrow">What is ready now</p>
        <h2>Clean static publishing with account proof.</h2>
      </div>
      <div class="feature-list">
        <span>Landing pages and marketing sites</span>
        <span>Built frontend apps and PWA shells</span>
        <span>Public or shared-gate-protected routes</span>
        <span>Deployment receipts and route records</span>
        <span>Workspace dashboard and quota posture</span>
        <span>Gated source download and stored transfers</span>
      </div>
      <p class="boundary-note">Current boundary: Free99 is capped, custom domains are paid/approved, and unlimited arbitrary uploaded serverless functions are not sold until the isolated SkyeNet Sovereign Runtime lane has production proof. Full project downloads use the private source package lane, not public asset routes.</p>
    </section>
    <section class="band guide-section two">
      <div><p class="eyebrow">Source custody</p><h2>Download is not the same thing as client ownership.</h2></div>
      <div class="custody-copy">
        <p>SkyeNet keeps deployed source recovery scoped to the authenticated account that owns the deployment record. Public assets and private full project source packages are separate lanes, so a client can have a live app hosted for them without receiving the source code.</p>
        <p>When source handoff is approved, the owner can store the transfer in SkyeDrive, store it in SkyeVault, create an instant gated link, or generate a secure encrypted <code>.skye</code> source pack backed by the SkyeSecure v2 lane.</p>
      </div>
    </section>
    <section class="band guide-section two">
      <div><p class="eyebrow">Environment variables</p><h2>Project secrets belong in the account console.</h2></div>
      <div class="custody-copy">
        <p>The SkyeNet console includes project environment variables for production workspaces. Values are stored behind the shared gate and shown back only as redacted previews, so operators can verify a key exists without exposing the raw secret in the browser.</p>
        <p>Use this lane for API keys, runtime toggles, and client-specific configuration that should travel with the SkyeNet deployment record without being copied into public assets.</p>
      </div>
    </section>
    <section id="pricing" class="band guide-section">
      <div class="section-heading">
        <p class="eyebrow">Plan caps and pricing posture</p>
        <h2>Start free, upgrade when the surface needs more room.</h2>
      </div>
      <div class="pricing-grid">
        <article class="price-card"><span>Free99</span><h3>$0</h3><p>Capped demo or tiny public workspace.</p><ul><li>25 MB bundle cap</li><li>3 deployments per month</li><li>1 public route</li><li>No custom domains</li><li>No serverless functions</li><li>30-day retention</li></ul></article>
        <article class="price-card"><span>Edge Starter</span><h3>$297 setup + $97/mo</h3><p>Basic hosted app or public landing surface.</p><ul><li>25 MB bundle cap</li><li>20 deployments per month</li><li>1 public route</li><li>No custom domains</li><li>No serverless functions</li><li>60-day retention</li></ul></article>
        <article class="price-card"><span>Edge Growth</span><h3>$997 setup + $297/mo</h3><p>Multi-route workspace with one approved custom domain.</p><ul><li>150 MB bundle cap</li><li>100 deployments per month</li><li>5 public routes</li><li>1 custom domain</li><li>Managed functions review</li><li>120-day retention</li></ul></article>
        <article class="price-card"><span>Functions Managed</span><h3>$1,500 setup + $497/mo</h3><p>Owner-approved managed function work and larger static releases.</p><ul><li>250 MB bundle cap</li><li>150 deployments per month</li><li>8 public routes</li><li>2 custom domains</li><li>Approved managed functions</li><li>180-day retention</li></ul></article>
        <article class="price-card reserve"><span>Sovereign Runtime Reserve</span><h3>$5,000 setup + $997/mo</h3><p>Reserved lane for deeper runtime, domain, and managed infrastructure scope.</p><ul><li>500 MB bundle cap</li><li>300 deployments per month</li><li>20 public routes</li><li>5 custom domains</li><li>Isolated runtime reserved</li><li>365-day retention</li></ul></article>
      </div>
      <p class="boundary-note">These are current SkyeNet offer caps and owner-review prices. Final paid activation, custom domains, managed functions, and higher limits require owner approval before they are promised to a customer.</p>
    </section>
    <section class="band guide-section two">
      <div><p class="eyebrow">CLI lane</p><h2>Operators can publish directly from a build folder.</h2></div>
      <pre class="code-panel">npm run skyenet:deploy -- \\
  --dir dist \\
  --source-root . \\
  --project my-site \\
  --workspace default-workspace \\
  --host skyenet.my-site \\
  --mount / \\
  --url-mode subdomain \\
  --public \\
  --concurrency 4</pre>
    </section>
    <section class="band guide-section">
      <div class="section-heading"><p class="eyebrow">Live examples</p><h2>See the lane working.</h2></div>
      <div class="surface-grid">
        <a class="surface" href="/"><span>SkyeNet home</span><strong>Standalone deploy edge</strong><small>The public SkyeNet host and route entrypoint.</small></a>
        <a class="surface" href="/bobs-smoke-shop/"><span>Client app</span><strong>Bob's Smoke Shop</strong><small>A real client app hosted on SkyeNet.</small></a>
        <a class="surface" href="/bobs-smoke-shop/workspace-preview/"><span>Workspace preview</span><strong>Bob's workspace</strong><small>Client-facing preview of the provisioned workspace value.</small></a>
      </div>
    </section>
  </main>
  <script src="/assets/skyenet.js" defer></script>
</body>
</html>`, {
    headers: securityHeaders(new Headers({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60'
    }))
  });
}

function mapSkyeNetApiPath(pathname) {
  if (pathname === API_PREFIX || pathname === `${API_PREFIX}/`) return '/deploy/status';
  if (!pathname.startsWith(`${API_PREFIX}/`)) return '';
  const suffix = pathname.slice(API_PREFIX.length) || '/status';
  if (suffix.startsWith('/deploy/')) return suffix;
  return DEPLOY_API_MAP.get(suffix) || `/deploy${suffix}`;
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return (match ? match[1] : header || request.headers.get('x-skye-gate-session') || request.headers.get('x-free99-gate-session') || '').trim();
}

function numericCustomerId(value) {
  const raw = String(value || '').trim();
  if (/^\d+$/.test(raw)) return raw;
  let hash = 2166136261;
  const text = raw || 'skyenet-owner';
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return String((parseInt((hash >>> 0).toString(36).slice(0, 8), 36) % 2147483646) + 1);
}

async function introspectWithZeroOs(request, env) {
  const token = bearer(request);
  if (!token) return null;
  const zeroOsOrigin = cleanOrigin(env.ZERO_OS_ORIGIN, 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev');
  const target = new URL('/api/owner/admin-introspect', zeroOsOrigin);
  const introspectRequest = new Request(target.toString(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'x-skye-gate-session': token
    },
    body: JSON.stringify({ token })
  });
  const response = env.ZERO_OS_WORKER?.fetch
    ? await env.ZERO_OS_WORKER.fetch(introspectRequest)
    : await fetch(introspectRequest);
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.ok && data.active !== false ? data : null;
}

async function cloneHeaders(request, env) {
  const headers = new Headers(request.headers);
  const url = new URL(request.url);
  headers.set('x-forwarded-host', url.hostname);
  headers.set('x-0s-original-host', url.hostname);
  headers.set('x-skynet-public-host', env.SKYENET_PUBLIC_HOST || url.hostname);
  headers.set('x-metraiyux-session-source', 'standalone-skynet');
  const gate = await introspectWithZeroOs(request, env).catch(() => null);
  if (gate) {
    const token = bearer(request);
    const skygate = gate.skygate || gate.gate?.skygate || {};
    const email = gate.email || gate.user?.email || skygate.email || skygate.username || 'skyenet-user';
    const role = String(gate.role || gate.user?.role || skygate.role || '').toLowerCase();
    const owner = gate.owner === true || gate.authenticated === true || ['owner', 'admin', 'founder'].includes(role);
    const rawCustomerId = skygate.customer_id || skygate.customerId || gate.customer_id || gate.customerId || gate.sub || email;
    headers.set('authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
    headers.set('x-0s-role', owner ? 'owner' : 'deployer');
    headers.set('x-0s-customer-id', numericCustomerId(rawCustomerId));
    headers.set('x-0s-email', String(email));
    if (owner) {
      headers.set('x-0s-admin-override', 'true');
      headers.set('x-skye-admin-override', 'true');
      headers.set('x-0s-gate-cards', 'owner,admin,skyenet-admin');
    }
  }
  return headers;
}

async function runtimeFetch(request, env, pathnameOverride = '') {
  const incoming = new URL(request.url);
  const runtimeOrigin = cleanOrigin(env.SKYENET_RUNTIME_ORIGIN, 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev');
  const overridePath = pathnameOverride
    ? `${pathnameOverride}${pathnameOverride.includes('?') ? '' : incoming.search}`
    : `${incoming.pathname}${incoming.search}`;
  const target = new URL(overridePath, runtimeOrigin);
  if (!pathnameOverride) {
    target.hostname = incoming.hostname;
    target.protocol = incoming.protocol;
  }
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const upstreamInit = {
    method: request.method,
    headers: await cloneHeaders(request, env),
    body: hasBody ? request.body : undefined,
    redirect: 'manual'
  };
  if (hasBody) upstreamInit.duplex = 'half';
  const upstream = new Request(target.toString(), upstreamInit);
  const response = env.SKYENET_RUNTIME?.fetch
    ? await env.SKYENET_RUNTIME.fetch(upstream)
    : await fetch(upstream);
  const headers = securityHeaders(new Headers(response.headers));
  headers.delete('content-length');
  headers.set('x-skynet-edge-host', incoming.hostname);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function assetFetch(request, env, pathOverride = '') {
  if (!env.ASSETS?.fetch) return notFound();
  const url = new URL(request.url);
  const assetUrl = new URL(pathOverride || url.pathname, url);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  if (response.status === 404 && request.method === 'GET' && !url.pathname.includes('.')) {
    return env.ASSETS.fetch(new Request(new URL('/index.html', url).toString(), request));
  }
  const headers = securityHeaders(new Headers(response.headers));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function ownerLoginUrl(request, env) {
  const url = new URL(request.url);
  const zeroOs = cleanOrigin(env.ZERO_OS_ORIGIN, 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev');
  const login = new URL('/admin/login.html', zeroOs);
  login.searchParams.set('return', url.toString());
  return login.toString();
}

function normalizeHostname(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

function isPlatformControlHost(hostname, env) {
  const host = normalizeHostname(hostname);
  const publicHost = normalizeHostname(env.SKYENET_PUBLIC_HOST || 'skyenet.graylondonskyes.workers.dev');
  return host === publicHost
    || host === 'localhost'
    || host === '127.0.0.1'
    || host.endsWith('.workers.dev');
}

function isReserved(pathname) {
  return pathname === '/'
    || pathname === '/index.html'
    || pathname === '/console'
    || pathname === '/console/'
    || pathname === '/console.html'
    || pathname === '/health'
    || pathname === '/status'
    || pathname === '/robots.txt'
    || pathname === '/sitemap.xml'
    || pathname === '/favicon.ico'
    || pathname.startsWith('/assets/')
    || pathname.startsWith('/api/')
    || pathname.startsWith('/deploy/')
    || pathname.startsWith('/login');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && (url.pathname.startsWith(API_PREFIX) || url.pathname.startsWith('/deploy/'))) {
      return runtimeFetch(request, env, mapSkyeNetApiPath(url.pathname) || url.pathname);
    }

    if (url.pathname === '/health' || url.pathname === '/status') {
      return json({
        ok: true,
        service: 'skyenet-standalone-edge',
        public_host: env.SKYENET_PUBLIC_HOST || url.hostname,
        runtime: 'fs27-skynet-service-binding',
        zero_os_origin: cleanOrigin(env.ZERO_OS_ORIGIN, ''),
        gate: 'shared FS27/SkyGate/Free99'
      });
    }

    if (url.pathname === '/login' || url.pathname === '/admin/login.html') {
      return htmlRedirect(ownerLoginUrl(request, env));
    }

    if (url.pathname.startsWith(API_PREFIX)) {
      return runtimeFetch(request, env, mapSkyeNetApiPath(url.pathname));
    }

    if (url.pathname.startsWith('/deploy/')) {
      return runtimeFetch(request, env, `${url.pathname}${url.search}`);
    }

    if (!isPlatformControlHost(url.hostname, env)) {
      return runtimeFetch(request, env);
    }

    if (url.pathname === '/console' || url.pathname === '/console/') {
      return consoleResponse();
    }

    if (url.pathname === '/publish' || url.pathname === '/publish/' || url.pathname === '/publish.html' || url.pathname === '/publish/index.html') {
      return publishResponse();
    }

    if (url.pathname === '/pricing' || url.pathname === '/pricing/' || url.pathname === '/pricing.html') {
      return htmlRedirect(new URL('/publish/#pricing', url).toString(), 302);
    }

    if (isReserved(url.pathname)) {
      return assetFetch(request, env);
    }

    return runtimeFetch(request, env);
  }
};
