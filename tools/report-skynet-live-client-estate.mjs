#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sharedOriginInventoryPath = path.join(repoRoot, 'test-artifacts', 'skyenet-route-inventory', 'skyenet-shared-origin-live-paths.json');
const clientRouteIndexPath = path.join(repoRoot, 'metraiyux_0s_site', 'data', 'skyenet-client-route-index.json');
const ownerBlastReportPath = path.join(repoRoot, 'test-artifacts', 'skyenet-client-app-report', 'skyenet-client-app-report-latest.json');
const bobRedirectReceiptPath = path.join(repoRoot, 'test-artifacts', 'bobs-skynet-deploy', 'bobs-0s-redirect-closure-latest.json');
const jsonOutPath = path.join(repoRoot, 'test-artifacts', 'skyenet-route-inventory', 'skyenet-live-client-estate-report.json');
const markdownOutPath = path.join(repoRoot, 'metraiyux_0s_site', 'docs', 'SKYENET_LIVE_CLIENT_ESTATE_REPORT.md');

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function routePathFromUrl(value = '') {
  try {
    return new URL(value).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return String(value || '').replace(/\/+$/, '') || '/';
  }
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^[a-z]$/i.test(part)) return part.toUpperCase();
      if (/^[a-z]\d/i.test(part)) return part.toUpperCase();
      return part.slice(0, 1).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function classifyInventoryRoute(route, indexedClientPaths) {
  const pathKey = routePathFromUrl(route.path || route.url);
  const title = String(route.title || '');
  if (/^\/skynet-parity-(proof|stress-\d+)$/i.test(pathKey) || /parity proof/i.test(title)) {
    return 'internal-proof-stress';
  }
  if (indexedClientPaths.has(pathKey)) return 'indexed-client-app';
  return 'customer-facing-live-path-not-in-current-index';
}

function ownerAppBySlug(ownerBlastReport) {
  const map = new Map();
  for (const app of ownerBlastReport?.apps || []) {
    if (app?.slug) map.set(app.slug, app);
  }
  return map;
}

function buildRouteRows({ sharedOriginInventory, clientRouteIndex, ownerBlastReport }) {
  const indexedClientPaths = new Set((clientRouteIndex?.routes || []).map((route) => routePathFromUrl(route.mount_path || route.public_url)));
  const ownersBySlug = ownerAppBySlug(ownerBlastReport);
  return (sharedOriginInventory?.results || []).map((route) => {
    const pathKey = routePathFromUrl(route.path || route.url);
    const slug = pathKey.replace(/^\//, '');
    const clientIndexRecord = (clientRouteIndex?.routes || []).find((record) => routePathFromUrl(record.mount_path || record.public_url) === pathKey) || null;
    const ownerApp = ownersBySlug.get(slug) || null;
    return {
      path: pathKey,
      url: route.url,
      status: route.status ?? null,
      ok: Boolean(route.ok),
      title: route.title || '',
      bytes: route.bytes ?? null,
      elapsed_ms: route.elapsed_ms ?? null,
      classification: classifyInventoryRoute(route, indexedClientPaths),
      client_id: clientIndexRecord?.client_id || ownerApp?.slug || (pathKey === '/bobs-smoke-shop' ? 'bobs-smoke-shop' : null),
      business_name: ownerApp?.business_name || (pathKey === '/bobs-smoke-shop' ? "Bob's Smoke Shop" : null),
      owner_blast_available: Boolean(ownerApp?.owner_blast_message),
      owner_blast_message: ownerApp?.owner_blast_message || null,
      route_index_recorded: Boolean(clientIndexRecord),
      deployment_id: clientIndexRecord?.deployment_id || null,
      source_download_api: clientIndexRecord?.source_download_api || null,
      legacy_route_policy: clientIndexRecord?.legacy_route_policy || null
    };
  });
}

function redirectBlocker({ clientRouteIndex, bobRedirectReceipt }) {
  const indexedRedirectPolicies = (clientRouteIndex?.routes || []).filter((route) => route.legacy_route_policy === 'redirect-to-standalone-skynet');
  const bobOk = Boolean(bobRedirectReceipt?.ok);
  const bobFailures = Array.isArray(bobRedirectReceipt?.failures) ? bobRedirectReceipt.failures : [];
  const pendingIndexedRedirectProof = indexedRedirectPolicies.length > 0;

  if (!bobOk || bobFailures.length) {
    return {
      present: true,
      status: 'blocker',
      summary: 'Bob 0S-to-standalone SkyeNet redirect closure receipt is missing or failing.',
      details: bobFailures.length ? bobFailures : ['No passing Bob redirect closure receipt found.'],
      receipt: existsSync(bobRedirectReceiptPath) ? rel(bobRedirectReceiptPath) : null
    };
  }

  if (pendingIndexedRedirectProof) {
    return {
      present: true,
      status: 'pending-proof',
      summary: `${indexedRedirectPolicies.length} indexed client routes declare legacy 0S redirect policy, but this estate report only found a passing Bob redirect closure receipt. Treat client-app legacy redirect deploy/proof as pending unless covered by a newer receipt outside these inputs.`,
      details: indexedRedirectPolicies.map((route) => ({
        client_id: route.client_id,
        legacy_path_prefixes: route.legacy_path_prefixes || []
      })),
      receipt: existsSync(bobRedirectReceiptPath) ? rel(bobRedirectReceiptPath) : null
    };
  }

  return {
    present: false,
    status: 'clear',
    summary: 'No missing or pending 0S redirect blocker was detected from the supplied estate inputs.',
    details: [],
    receipt: existsSync(bobRedirectReceiptPath) ? rel(bobRedirectReceiptPath) : null
  };
}

function buildPayload({ sharedOriginInventory, clientRouteIndex, ownerBlastReport, bobRedirectReceipt }) {
  const routes = buildRouteRows({ sharedOriginInventory, clientRouteIndex, ownerBlastReport });
  const publicRoutes = routes.filter((route) => route.ok && route.status >= 200 && route.status < 400);
  const internalProofStressRoutes = publicRoutes.filter((route) => route.classification === 'internal-proof-stress');
  const indexedClientRoutes = publicRoutes.filter((route) => route.classification === 'indexed-client-app');
  const extraCustomerPaths = publicRoutes.filter((route) => route.classification === 'customer-facing-live-path-not-in-current-index');
  const ownerBlastApps = ownerBlastReport?.apps || [];

  return {
    schema: 'skyenet.live-client-estate-report.v1',
    generated_at: new Date().toISOString(),
    source_inputs: {
      shared_origin_inventory: rel(sharedOriginInventoryPath),
      client_route_index: rel(clientRouteIndexPath),
      owner_blast_report: existsSync(ownerBlastReportPath) ? rel(ownerBlastReportPath) : null,
      bob_redirect_receipt: existsSync(bobRedirectReceiptPath) ? rel(bobRedirectReceiptPath) : null
    },
    browser_proof: {
      status: 'owner-handled',
      note: 'No Codex-run browser proof was performed for this estate report. Live browser verification is owner-handled under the repo policy.'
    },
    positioning: 'We build business apps on our own sovereign SkyeNet infrastructure, not just websites. The current estate evidence shows live public routes, source-custody-aware client records, owner-facing handoff copy, and non-browser HTTP proof; it does not claim official adoption by the named businesses until an owner approves, updates, or transfers the app.',
    counts: {
      total_public_skynet_routes: publicRoutes.length,
      total_shared_origin_candidates: sharedOriginInventory?.candidate_count ?? routes.length,
      shared_origin_public_ok_count: sharedOriginInventory?.public_ok_count ?? publicRoutes.length,
      indexed_customer_client_apps: indexedClientRoutes.length,
      owner_blast_client_apps: ownerBlastApps.length,
      additional_customer_facing_live_paths_not_in_current_index: extraCustomerPaths.length,
      customer_facing_client_apps_total: indexedClientRoutes.length + extraCustomerPaths.length,
      internal_proof_stress_routes: internalProofStressRoutes.length,
      route_index_records: clientRouteIndex?.route_count ?? (clientRouteIndex?.routes || []).length
    },
    redirect_status: redirectBlocker({ clientRouteIndex, bobRedirectReceipt }),
    route_groups: {
      customer_facing_client_apps: [...indexedClientRoutes, ...extraCustomerPaths],
      internal_proof_stress_routes: internalProofStressRoutes
    },
    routes
  };
}

function renderMarkdown(payload) {
  const lines = [
    '# SkyeNet Live Client Estate Report',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    '## Positioning',
    '',
    payload.positioning,
    '',
    `Browser proof: ${payload.browser_proof.note}`,
    '',
    '## Estate Counts',
    '',
    `- Total public SkyeNet shared-origin routes: ${payload.counts.total_public_skynet_routes}`,
    `- Customer-facing client apps total: ${payload.counts.customer_facing_client_apps_total}`,
    `- Indexed customer client apps: ${payload.counts.indexed_customer_client_apps}`,
    `- Owner-blast client apps: ${payload.counts.owner_blast_client_apps}`,
    `- Additional customer-facing live paths not in current index: ${payload.counts.additional_customer_facing_live_paths_not_in_current_index}`,
    `- Internal proof/stress routes: ${payload.counts.internal_proof_stress_routes}`,
    '',
    '## Redirect Status',
    '',
    `- Status: \`${payload.redirect_status.status}\``,
    `- Summary: ${payload.redirect_status.summary}`,
    payload.redirect_status.receipt ? `- Receipt: \`${payload.redirect_status.receipt}\`` : '- Receipt: not found',
    '',
    '## Customer-Facing Client Apps',
    '',
    '| Business | Client ID | URL | Route index | Owner blast | Status |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const route of payload.route_groups.customer_facing_client_apps) {
    lines.push(`| ${markdownEscape(route.business_name || titleFromSlug(route.client_id || route.path))} | \`${markdownEscape(route.client_id || '')}\` | ${markdownEscape(route.url)} | ${route.route_index_recorded ? 'yes' : 'no'} | ${route.owner_blast_available ? 'yes' : 'no'} | ${route.status} |`);
  }

  lines.push(
    '',
    '## Internal Proof And Stress Routes',
    '',
    '| Path | URL | Title | Status |',
    '| --- | --- | --- | --- |'
  );

  for (const route of payload.route_groups.internal_proof_stress_routes) {
    lines.push(`| \`${markdownEscape(route.path)}\` | ${markdownEscape(route.url)} | ${markdownEscape(route.title)} | ${route.status} |`);
  }

  lines.push(
    '',
    '## Sources',
    '',
    `- Shared-origin inventory: \`${payload.source_inputs.shared_origin_inventory}\``,
    `- Client route index: \`${payload.source_inputs.client_route_index}\``,
    `- Owner blast data: \`${payload.source_inputs.owner_blast_report || 'not found'}\``,
    `- Redirect receipt: \`${payload.source_inputs.bob_redirect_receipt || 'not found'}\``,
    ''
  );

  return `${lines.join('\n')}\n`;
}

async function main() {
  const sharedOriginInventory = await readJson(sharedOriginInventoryPath);
  const clientRouteIndex = await readJson(clientRouteIndexPath);
  const ownerBlastReport = await readJson(ownerBlastReportPath, { apps: [] });
  const bobRedirectReceipt = await readJson(bobRedirectReceiptPath, null);

  if (!sharedOriginInventory) throw new Error(`Missing or invalid ${rel(sharedOriginInventoryPath)}`);
  if (!clientRouteIndex) throw new Error(`Missing or invalid ${rel(clientRouteIndexPath)}`);

  const payload = buildPayload({ sharedOriginInventory, clientRouteIndex, ownerBlastReport, bobRedirectReceipt });
  await fs.mkdir(path.dirname(jsonOutPath), { recursive: true });
  await fs.mkdir(path.dirname(markdownOutPath), { recursive: true });
  await fs.writeFile(jsonOutPath, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(markdownOutPath, renderMarkdown(payload));

  console.log(JSON.stringify({
    ok: true,
    total_public_skynet_routes: payload.counts.total_public_skynet_routes,
    customer_facing_client_apps_total: payload.counts.customer_facing_client_apps_total,
    internal_proof_stress_routes: payload.counts.internal_proof_stress_routes,
    redirect_status: payload.redirect_status.status,
    markdown_report: rel(markdownOutPath),
    json_report: rel(jsonOutPath)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
