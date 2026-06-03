#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const skynetBase = String(process.env.SKYENET_LIVE_BASE || 'https://skyenet.graylondonskyes.workers.dev').replace(/\/+$/, '');
const phase4Dir = path.join(repoRoot, 'test-artifacts', 'phase4-skynet-valley');
const phase4Latest = path.join(phase4Dir, 'phase4-skynet-valley-live-http-latest.json');
const clientHttpDir = path.join(repoRoot, 'test-artifacts', 'skyenet-client-app-public-http');
const clientHttpLatest = path.join(clientHttpDir, 'skyenet-client-app-public-http-latest.json');
const valleyDir = path.join(repoRoot, 'test-artifacts', 'skyenet');
const valleyManualPath = path.join(valleyDir, 'valley-verified-manual-landings-live-proof.json');
const valleyAssetPath = path.join(valleyDir, 'valley-verified-live-asset-proof.json');
const routeIndexPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', 'skyenet-client-route-index.json');
const valleyBusinessDir = path.join(repoRoot, 'metraiyux_0s_site', 'skyenet-drops', 'valley-verified-manual-landings', 'business');
const deployReceiptPath = path.join(repoRoot, 'test-artifacts', 'skyenet-client-app-deploy', 'skyenet-client-app-deploy-latest.json');
const timeoutMs = Number(process.env.PHASE4_SKYNET_TIMEOUT_MS || 15000);
const concurrency = Math.max(1, Math.min(32, Number(process.env.PHASE4_SKYNET_CONCURRENCY || 16)));
const sourceReadLimitBytes = Math.max(1024, Number(process.env.PHASE4_SKYNET_SOURCE_READ_LIMIT_BYTES || 128 * 1024));

const companyTargets = [
  { id: 'skyeroutex-logistics', workspace_id: 'skyeroutex-logistics', project_id: 'skyeroutex-logistics-public', hostname: 'skyenet.skyeroutex-logistics', live_url: 'https://skyenet.skyeroutex-logistics/' },
  { id: 'skyesol', workspace_id: 'skyesol', project_id: 'skyesol-company-public', hostname: 'skyenet.skyesol', live_url: 'https://skyenet.skyesol/' },
  { id: 'solenterprises', workspace_id: 'solenterprises', project_id: 'solenterprises-public', hostname: 'skyenet.solenterprises', live_url: 'https://skyenet.solenterprises/' }
];

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function stamp(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, '-');
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function authHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

async function fetchText(url, init = {}, limit = 512 * 1024) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { accept: 'text/html,application/json,text/plain,*/*', ...(init.headers || {}) },
      ...init,
      signal: controller.signal
    });
    const buffer = Buffer.from(await response.arrayBuffer().catch(() => new ArrayBuffer(0)));
    const sliced = buffer.subarray(0, Math.min(buffer.byteLength, limit));
    return {
      ok: response.ok,
      status: response.status,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      content_length: Number(response.headers.get('content-length') || buffer.byteLength || 0) || 0,
      location: response.headers.get('location') || '',
      x_skynet_project_id: response.headers.get('x-skynet-project-id') || '',
      x_skynet_deployment_id: response.headers.get('x-skynet-deployment-id') || '',
      bytes: buffer.byteLength,
      truncated: buffer.byteLength > limit,
      text: sliced.toString('utf8')
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      content_length: 0,
      location: '',
      x_skynet_project_id: '',
      x_skynet_deployment_id: '',
      bytes: 0,
      truncated: false,
      text: '',
      error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, init = {}) {
  const result = await fetchText(url, {
    ...init,
    headers: { accept: 'application/json', ...(init.headers || {}) }
  });
  let body = {};
  try { body = result.text ? JSON.parse(result.text) : {}; } catch { body = { text: result.text }; }
  return { ...result, body, text: '' };
}

async function fetchBytesLimited(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { accept: 'application/x-tar,application/octet-stream,*/*', ...(init.headers || {}) },
      ...init,
      signal: controller.signal
    });
    const chunks = [];
    let bytes = 0;
    let truncated = false;
    const reader = response.body?.getReader ? response.body.getReader() : null;
    if (reader) {
      while (bytes < sourceReadLimitBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        chunks.push(chunk);
        bytes += chunk.byteLength;
      }
      if (bytes >= sourceReadLimitBytes) {
        truncated = true;
        await reader.cancel('phase4 proof read limit reached').catch(() => {});
      }
    } else {
      const buffer = Buffer.from(await response.arrayBuffer());
      bytes = Math.min(buffer.byteLength, sourceReadLimitBytes);
      truncated = buffer.byteLength > sourceReadLimitBytes;
      chunks.push(buffer.subarray(0, sourceReadLimitBytes));
    }
    const sample = Buffer.concat(chunks, Math.min(bytes, sourceReadLimitBytes)).toString('utf8');
    return {
      ok: response.ok,
      status: response.status,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: response.headers.get('content-type') || '',
      content_disposition: response.headers.get('content-disposition') || '',
      x_skynet_source_download: response.headers.get('x-skynet-source-download') || '',
      bytes_read: bytes,
      read_limit_bytes: sourceReadLimitBytes,
      read_truncated: truncated,
      has_source_manifest: sample.includes('.skyenet/source-manifest.json'),
      has_index_html: sample.includes('index.html')
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      content_type: '',
      content_disposition: '',
      x_skynet_source_download: '',
      bytes_read: 0,
      read_limit_bytes: sourceReadLimitBytes,
      read_truncated: false,
      has_source_manifest: false,
      has_index_html: false,
      error: error?.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function publicSourceExposure(response) {
  const contentType = String(response?.content_type || '').toLowerCase();
  const text = String(response?.text || '');
  const binarySourceType = /\b(application\/x-tar|application\/zip|application\/gzip|application\/zstd|application\/octet-stream)\b/i.test(contentType);
  const sourceBody = text.includes('.skyenet/source-manifest.json')
    || text.includes('.skyenet/source-package.json')
    || text.includes('source-manifest')
    || text.includes('source-package')
    || text.includes('ustar');
  const denied = response?.status === 401 || response?.status === 403 || response?.status === 404;
  const htmlFallback = response?.status === 200 && contentType.includes('text/html') && !sourceBody;
  return {
    exposed: Boolean(!denied && !htmlFallback && (binarySourceType || sourceBody || response?.status === 200)),
    source_like: Boolean(binarySourceType || sourceBody),
    allowed_static_result: Boolean(denied || htmlFallback),
    denied,
    html_fallback: htmlFallback
  };
}

async function runPool(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }));
  return output;
}

function titleFromHtml(html = '') {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim().slice(0, 180) : '';
}

function extractAssetUrls(html = '', pageUrl = '') {
  const refs = new Set();
  const patterns = [
    /\b(?:src|href)=["']([^"']+)["']/gi,
    /\burl\(["']?([^"')]+)["']?\)/gi
  ];
  for (const pattern of patterns) {
    for (const match of String(html || '').matchAll(pattern)) {
      const raw = String(match[1] || '').trim();
      if (!raw || raw.startsWith('#') || /^(?:mailto|tel|javascript|data):/i.test(raw)) continue;
      try {
        const url = new URL(raw, pageUrl);
        if (url.origin !== new URL(pageUrl).origin) continue;
        if (url.pathname === new URL(pageUrl).pathname) continue;
        refs.add(url.toString());
      } catch {}
    }
  }
  return [...refs];
}

async function clientPublicHttpProof(routeIndex, generatedAt) {
  const routes = Array.isArray(routeIndex?.routes) ? routeIndex.routes : [];
  const results = await runPool(routes, concurrency, async (route) => {
    const response = await fetchText(route.public_url || '');
    return {
      client_id: route.client_id,
      status: response.status,
      ok: response.status === 200 && response.content_type.includes('text/html') && response.bytes > 500,
      content_type: response.content_type,
      bytes: response.bytes,
      title: titleFromHtml(response.text),
      elapsed_ms: response.elapsed_ms,
      url: route.public_url,
      shared_origin_path_route: String(route.public_url || '').startsWith(`${skynetBase}/`),
      error: response.error || ''
    };
  });
  const receipt = {
    schema: 'skyenet.client-app-public-http.v2',
    ok: results.every((item) => item.ok),
    checked_at: generatedAt,
    count: results.length,
    elapsed_ms: Number(results.reduce((sum, item) => sum + Number(item.elapsed_ms || 0), 0).toFixed(2)),
    url_model: {
      shared_origin_count: results.filter((item) => item.shared_origin_path_route).length,
      shared_origin_base: skynetBase,
      classification: 'shared-origin path-route client app proof, not platform-native company final URL proof'
    },
    results,
    failures: results.filter((item) => !item.ok)
  };
  await fs.mkdir(clientHttpDir, { recursive: true });
  const dated = path.join(clientHttpDir, `skyenet-client-app-public-http-${stamp(new Date(generatedAt))}.json`);
  await fs.writeFile(dated, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(clientHttpLatest, `${JSON.stringify({ ...receipt, stamped_receipt: rel(dated) }, null, 2)}\n`);
  return { ...receipt, latest: rel(clientHttpLatest), stamped_receipt: rel(dated) };
}

async function valleyProof(generatedAt) {
  const names = (await fs.readdir(valleyBusinessDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const cacheBust = `phase4=${Date.now()}`;
  const base = `${skynetBase}/valley-verified`;
  const pages = await runPool(names, concurrency, async (id) => {
    const url = `${base}/business/${encodeURIComponent(id)}/?${cacheBust}`;
    const response = await fetchText(url);
    const title = titleFromHtml(response.text);
    const body = response.text;
    const ok = response.status === 200
      && response.content_type.includes('text/html')
      && body.includes('Valley Verified')
      && body.includes('SkyEmail')
      && title.length > 0;
    return {
      id,
      url,
      status: response.status,
      ok,
      deployment: response.x_skynet_deployment_id,
      project: response.x_skynet_project_id,
      manual: body.includes('data-valley-manual') || body.includes('Manual'),
      why: body.includes('Why this business'),
      skyemail: body.includes('SkyEmail'),
      title,
      assetRefs: extractAssetUrls(body, url),
      error: response.error || ''
    };
  });
  const uniqueAssets = [...new Set(pages.flatMap((page) => page.assetRefs || []))].sort();
  const assets = await runPool(uniqueAssets, concurrency, async (url) => {
    const response = await fetchText(url, { headers: { accept: '*/*' } }, 128 * 1024);
    return {
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 400 && response.bytes > 0,
      content_type: response.content_type,
      bytes: response.bytes,
      elapsed_ms: response.elapsed_ms,
      error: response.error || ''
    };
  });
  const manualReceipt = {
    schema: 'valley-verified.manual-landings-live-proof.v2',
    checkedAt: generatedAt,
    base,
    intended_url_model: 'shared-origin staging path route',
    total: pages.length,
    passed: pages.filter((page) => page.ok).length,
    failed: pages.filter((page) => !page.ok).length,
    samples: pages.slice(0, 20).map(({ assetRefs, ...page }) => page),
    failures: pages.filter((page) => !page.ok).map(({ assetRefs, ...page }) => page)
  };
  const assetReceipt = {
    schema: 'valley-verified.live-asset-proof.v2',
    checkedAt: generatedAt,
    base,
    pageCount: pages.length,
    pageFailures: manualReceipt.failures,
    totalRefs: pages.reduce((sum, page) => sum + (page.assetRefs?.length || 0), 0),
    uniqueRefs: uniqueAssets.length,
    ok: assets.filter((asset) => asset.ok).length,
    broken: assets.filter((asset) => !asset.ok),
    byStatus: assets.reduce((acc, asset) => {
      acc[String(asset.status)] = (acc[String(asset.status)] || 0) + 1;
      return acc;
    }, {}),
    assets
  };
  await fs.mkdir(valleyDir, { recursive: true });
  await fs.writeFile(valleyManualPath, `${JSON.stringify(manualReceipt, null, 2)}\n`);
  await fs.writeFile(valleyAssetPath, `${JSON.stringify(assetReceipt, null, 2)}\n`);
  return {
    manual: { ...manualReceipt, path: rel(valleyManualPath) },
    assets: { ...assetReceipt, path: rel(valleyAssetPath), assets: undefined }
  };
}

async function companyRouteProof(token) {
  const results = [];
  for (const target of companyTargets) {
    const params = new URLSearchParams({
      workspace_id: target.workspace_id,
      project_id: target.project_id,
      host: target.hostname
    });
    const routes = await fetchJson(`${skynetBase}/api/skyenet/routes?${params.toString()}`, { headers: authHeaders(token) });
    const routeItem = Array.isArray(routes.body?.routes)
      ? routes.body.routes.find((item) => item?.route?.hostname === target.hostname && item?.route?.project_id === target.project_id)
      : null;
    const route = routeItem?.route || null;
    const publicProbe = await fetchText(target.live_url, {}, 64 * 1024);
    results.push({
      id: target.id,
      expected: target,
      status: routes.status,
      route_key: routeItem?.key || '',
      ok: Boolean(routes.ok
        && route
        && route.hostname === target.hostname
        && route.project_id === target.project_id
        && route.workspace_id === target.workspace_id
        && route.url_mode === 'subdomain'
        && route.mount_path === ''
        && route.public_access === true),
      route: route ? {
        hostname: route.hostname,
        mount_path: route.mount_path,
        url_mode: route.url_mode,
        workspace_id: route.workspace_id,
        project_id: route.project_id,
        active_deployment_id: route.active_deployment_id,
        public_access: route.public_access,
        updated_at: route.updated_at
      } : null,
      direct_public_http: {
        status: publicProbe.status,
        ok: publicProbe.ok,
        content_type: publicProbe.content_type,
        error: publicProbe.error || '',
        elapsed_ms: publicProbe.elapsed_ms
      }
    });
  }
  return {
    ok: results.every((item) => item.ok),
    public_http_ready: results.every((item) => item.direct_public_http.ok),
    targets: results,
    blocker: results.every((item) => item.direct_public_http.ok)
      ? ''
      : 'Platform-native route records are present; DNS/custom-hostname edge binding is still the public HTTP boundary for at least one company hostname.'
  };
}

async function sourceCustodyProof(token, deployReceipt) {
  const deployments = (deployReceipt?.deployments || []).filter((item) => item.deploy?.deployment_id).slice(0, 6);
  const checks = await runPool(deployments, Math.min(4, concurrency), async (item) => {
    const query = new URLSearchParams({
      workspace_id: item.deploy.workspace_id || item.id,
      project_id: item.deploy.project_id || item.id,
      deployment_id: item.deploy.deployment_id
    });
    const apiUrl = `${skynetBase}/api/skyenet/source-download?${query.toString()}`;
    const unauth = await fetchJson(apiUrl);
    const auth = await fetchBytesLimited(apiUrl, { headers: authHeaders(token) });
    const publicSourcePaths = [
      `${item.deploy.live_url || item.target?.live_url || ''}.skyenet/source-manifest.json`,
      `${item.deploy.live_url || item.target?.live_url || ''}source.tar`,
      `${item.deploy.live_url || item.target?.live_url || ''}source.zip`
    ].filter(Boolean);
    const publicChecks = await runPool(publicSourcePaths, 2, async (url) => {
      const response = await fetchText(url, {}, 64 * 1024);
      const exposure = publicSourceExposure(response);
      return {
        url,
        status: response.status,
        ok: exposure.allowed_static_result,
        content_type: response.content_type,
        source_like: exposure.source_like,
        denied: exposure.denied,
        html_fallback: exposure.html_fallback,
        exposed: exposure.exposed,
        error: response.error || ''
      };
    });
    return {
      id: item.id,
      deployment_id: item.deploy.deployment_id,
      live_url: item.deploy.live_url || item.target?.live_url || '',
      unauth: { status: unauth.status, ok: unauth.status === 401 || unauth.status === 403 },
      auth: {
        status: auth.status,
        ok: auth.status === 200 && auth.content_type === 'application/x-tar' && auth.bytes_read > 0 && auth.has_source_manifest,
        content_type: auth.content_type,
        bytes_read: auth.bytes_read,
        read_truncated: auth.read_truncated,
        has_source_manifest: auth.has_source_manifest,
        has_index_html: auth.has_index_html
      },
      public_static_source_denied: publicChecks.every((check) => check.ok),
      public_static_checks: publicChecks
    };
  });
  return {
    ok: checks.length > 0 && checks.every((item) => item.unauth.ok && item.auth.ok && item.public_static_source_denied),
    checked_count: checks.length,
    source: rel(deployReceiptPath),
    checks
  };
}

async function staticCrossLinkProof(routeIndex) {
  const routes = Array.isArray(routeIndex?.routes) ? routeIndex.routes : [];
  const files = [
    'metraiyux_0s_site/founder-command/app.js',
    'metraiyux_0s_site/data/skyenet-client-route-index.json',
    'metraiyux_0s_site/founder-command/client-credentials/skyeroutex-logistics.json',
    'metraiyux_0s_site/brain/live-surface-registry.json',
    'metraiyux_0s_site/docs/SKYEROUTEX_LOGISTICS_OPERATING_MAP_2026-05-27.md',
    'docs/SKYENET_UPLOAD_URL_MODEL.md',
    'docs/SKYENET_PUBLIC_POSTING_GUIDE.md'
  ];
  const contents = {};
  for (const file of files) {
    contents[file] = await fs.readFile(path.join(repoRoot, file), 'utf8').catch(() => '');
  }
  const clientUrls = routes.map((route) => route.public_url).filter(Boolean);
  const clientUrlsInFounderCommand = clientUrls.every((url) => contents['metraiyux_0s_site/founder-command/app.js'].includes(url));
  const companyUrls = companyTargets.map((target) => target.live_url);
  const companyUrlsInRecords = companyUrls.every((url) =>
    contents['metraiyux_0s_site/founder-command/client-credentials/skyeroutex-logistics.json'].includes(url)
    || contents['metraiyux_0s_site/brain/live-surface-registry.json'].includes(url)
    || contents['metraiyux_0s_site/docs/SKYEROUTEX_LOGISTICS_OPERATING_MAP_2026-05-27.md'].includes(url)
  );
  return {
    ok: clientUrlsInFounderCommand && companyUrlsInRecords,
    files,
    client_route_index_count: clientUrls.length,
    client_urls_in_founder_command: clientUrlsInFounderCommand,
    company_platform_native_urls_in_records: companyUrlsInRecords,
    company_urls: companyUrls,
    note: 'Static scan covers Founder Command records, live surface registry, and SkyeNet URL model docs. Browser proof remains owner-handled.'
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const routeIndex = await readJson(routeIndexPath, {});
  const deployReceipt = await readJson(deployReceiptPath, {});
  const gateAuth = await resolveZeroOsGateAuth({ zeroOsBase });
  const receipt = {
    schema: 'phase4.skynet-valley.live-http-proof.v1',
    ok: false,
    generated_at: generatedAt,
    no_browser_proof_run: true,
    owner_manual_live_check: true,
    zero_os_base: zeroOsBase,
    skynet_base: skynetBase,
    login: {
      ok: Boolean(gateAuth.ok && gateAuth.token),
      status: gateAuth.response?.status || 0,
      credential_source: gateAuth.credential?.key || gateAuth.credential?.source || 'missing',
      token_received: Boolean(gateAuth.token)
    },
    url_policy: {
      client_app_shared_origin_routes_are_staging_or_examples: true,
      valley_verified_shared_origin_staging_intended: true,
      public_company_final_urls_require_platform_native_hosts: true,
      shared_origin_base: skynetBase,
      platform_native_company_hosts: companyTargets.map((target) => target.hostname)
    },
    client_public_http: null,
    valley_verified: null,
    company_host_routes: null,
    source_custody: null,
    static_cross_links: null,
    failures: []
  };

  receipt.client_public_http = await clientPublicHttpProof(routeIndex, generatedAt);
  receipt.valley_verified = await valleyProof(generatedAt);
  receipt.static_cross_links = await staticCrossLinkProof(routeIndex);

  if (gateAuth.token) {
    receipt.company_host_routes = await companyRouteProof(gateAuth.token);
    receipt.source_custody = await sourceCustodyProof(gateAuth.token, deployReceipt);
  } else {
    receipt.failures.push('Shared FS27/SkyGate bearer was not available for route/source custody checks.');
  }

  if (!receipt.client_public_http.ok) receipt.failures.push('One or more of the 15 SkyeNet client public HTTP routes failed.');
  if (receipt.valley_verified.manual.failed !== 0) receipt.failures.push('One or more Valley Verified manual landings failed live HTTP proof.');
  if (receipt.valley_verified.assets.broken?.length) receipt.failures.push('One or more Valley Verified live assets failed.');
  if (!receipt.company_host_routes?.ok) receipt.failures.push('Platform-native company host route records did not match expected records.');
  if (!receipt.source_custody?.ok) receipt.failures.push('Private source custody account-scope checks failed.');
  if (!receipt.static_cross_links?.ok) receipt.failures.push('Static route/cross-link records did not include expected proven SkyeNet URLs.');

  receipt.ok = receipt.failures.length === 0;
  await fs.mkdir(phase4Dir, { recursive: true });
  const dated = path.join(phase4Dir, `phase4-skynet-valley-live-http-${stamp(new Date(generatedAt))}.json`);
  await fs.writeFile(dated, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(phase4Latest, `${JSON.stringify({ ...receipt, stamped_receipt: rel(dated) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: rel(phase4Latest),
    stamped_receipt: rel(dated),
    client_routes: {
      ok: receipt.client_public_http.ok,
      count: receipt.client_public_http.count
    },
    valley: {
      pages: receipt.valley_verified.manual.total,
      passed: receipt.valley_verified.manual.passed,
      assets: receipt.valley_verified.assets.uniqueRefs,
      brokenAssets: receipt.valley_verified.assets.broken?.length || 0
    },
    company_host_routes: {
      ok: receipt.company_host_routes?.ok,
      public_http_ready: receipt.company_host_routes?.public_http_ready,
      blocker: receipt.company_host_routes?.blocker || ''
    },
    source_custody: {
      ok: receipt.source_custody?.ok,
      checked_count: receipt.source_custody?.checked_count || 0
    },
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(phase4Dir, { recursive: true });
  const failed = {
    schema: 'phase4.skynet-valley.live-http-proof.v1',
    ok: false,
    generated_at: new Date().toISOString(),
    error: error?.message || String(error),
    stack: error?.stack || '',
    no_browser_proof_run: true
  };
  await fs.writeFile(phase4Latest, `${JSON.stringify(failed, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
