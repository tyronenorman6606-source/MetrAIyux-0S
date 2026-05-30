#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const inventoryPath = path.join(
  repoRoot,
  'test-artifacts',
  'skyenet-client-app-migration-inventory',
  'skyenet-client-app-migration-inventory-latest.json'
);
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyenet-73-client-app-closure');
const jsonOutPath = path.join(artifactDir, 'skyenet-73-client-app-closure-latest.json');
const markdownOutPath = path.join(repoRoot, 'metraiyux_0s_site', 'docs', 'SKYENET_73_CLIENT_APP_CLOSURE_LEDGER.md');
const sharedSkynetOrigin = 'https://skyenet.graylondonskyes.workers.dev';
const sharedSkynetHost = new URL(sharedSkynetOrigin).hostname;

const validStatuses = [
  'live-public-skynet',
  'deployable-pending',
  'deployed-pages-not-skynet',
  'template-held',
  'gated-review-held',
  'proof-held',
  'blocked-missing-root',
  'blocked-http'
];

function rel(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/');
}

function asRepoPath(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return path.isAbsolute(text) ? rel(text) : text.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

function normalizePath(value) {
  return asRepoPath(value).replace(/\/+$/, '');
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

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function firstString(...values) {
  return values.map((value) => String(value || '').trim()).find(Boolean) || '';
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function urlHostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function publicUrlFromDeployTarget(deployTarget) {
  return firstString(
    deployTarget?.publicUrl,
    deployTarget?.liveUrl,
    deployTarget?.url,
    deployTarget?.primary?.url,
    deployTarget?.qr?.target
  );
}

function deployTargetHost(deployTarget) {
  return firstString(
    deployTarget?.host,
    deployTarget?.hostname,
    deployTarget?.primary?.host,
    urlHostname(publicUrlFromDeployTarget(deployTarget))
  );
}

function deployTargetSmoke(deployTarget) {
  return deployTarget?.lastSmoke?.hostHeader || deployTarget?.lastSmoke?.route || null;
}

function publicHttpSmoke(deployTarget) {
  return deployTargetSmoke(deployTarget)?.public_http || null;
}

function isSkynetDeployTarget(deployTarget) {
  const haystack = [
    deployTarget?.schema,
    deployTarget?.deployHost,
    deployTarget?.provider,
    deployTargetHost(deployTarget),
    publicUrlFromDeployTarget(deployTarget),
    deployTarget?.sourceCustody?.sourceDownloadApi
  ].filter(Boolean).join(' ');
  return /(^|\b)skyenet\b|skyenet\.|\/api\/skyenet|standalone-skynet/i.test(haystack);
}

function isSharedOriginUrl(value) {
  return urlHostname(value) === sharedSkynetHost;
}

function isPagesOrLegacyDeployTarget(deployTarget) {
  const haystack = [
    deployTarget?.primary?.host,
    deployTarget?.fallback?.host,
    publicUrlFromDeployTarget(deployTarget),
    deployTarget?.fallback?.url,
    deployTarget?.deployHost,
    deployTarget?.provider
  ].filter(Boolean).join(' ');
  return /(pages\.dev|netlify\.app|cloudflare|netlify|metraiyux-0s-full-system)/i.test(haystack) && !isSkynetDeployTarget(deployTarget);
}

function summarizeDeployTarget(file, deployTarget, source = 'disk') {
  const publicUrl = publicUrlFromDeployTarget(deployTarget);
  const host = deployTargetHost(deployTarget);
  const smoke = deployTargetSmoke(deployTarget);
  const publicHttp = publicHttpSmoke(deployTarget);
  return {
    source,
    path: file ? rel(file) : null,
    schema: deployTarget?.schema || null,
    project_id: deployTarget?.projectId || deployTarget?.project_id || null,
    workspace_id: deployTarget?.workspaceId || deployTarget?.workspace_id || null,
    deployment_id: deployTarget?.deploymentId || deployTarget?.deployment_id || null,
    public_url: publicUrl || null,
    host: host || null,
    mount_path: deployTarget?.mountPath || deployTarget?.mount_path || null,
    url_mode: deployTarget?.urlMode || deployTarget?.url_mode || null,
    public_access: typeof deployTarget?.publicAccess === 'boolean'
      ? deployTarget.publicAccess
      : typeof deployTarget?.public_access === 'boolean'
        ? deployTarget.public_access
        : null,
    source_root: deployTarget?.sourceRoot || deployTarget?.source_root || null,
    public_build_dir: deployTarget?.publicBuildDir || deployTarget?.public_build_dir || null,
    source_custody: deployTarget?.sourceCustody ? {
      private_source_package: Boolean(deployTarget.sourceCustody.privateSourcePackage),
      auth: deployTarget.sourceCustody.auth || 'Shared FS27/SkyGate/Free99 bearer session required'
    } : null,
    is_skynet: isSkynetDeployTarget(deployTarget),
    is_shared_origin: Boolean(publicUrl && isSharedOriginUrl(publicUrl)),
    is_pages_or_legacy: isPagesOrLegacyDeployTarget(deployTarget),
    recorded_smoke: smoke ? {
      ok: Boolean(smoke.ok),
      route_record_ok: smoke.route_record?.ok ?? null,
      dashboard_ok: smoke.dashboard?.ok ?? null,
      public_http_ok: publicHttp?.ok ?? null,
      public_http_status: publicHttp?.status ?? null,
      public_http_error: publicHttp?.error || publicHttp?.blocker || ''
    } : null
  };
}

function deployTargetSort(a, b) {
  const aShared = Number(Boolean(a.summary.is_shared_origin));
  const bShared = Number(Boolean(b.summary.is_shared_origin));
  if (aShared !== bShared) return bShared - aShared;
  const aSkynet = Number(Boolean(a.summary.is_skynet));
  const bSkynet = Number(Boolean(b.summary.is_skynet));
  if (aSkynet !== bSkynet) return bSkynet - aSkynet;
  const aUpdated = Date.parse(a.raw?.updatedAt || a.raw?.updated_at || '') || 0;
  const bUpdated = Date.parse(b.raw?.updatedAt || b.raw?.updated_at || '') || 0;
  return bUpdated - aUpdated;
}

function directDeployTargetPaths(candidate) {
  const roots = [
    candidate.public_build_dir,
    candidate.build_root,
    candidate.source_root
  ].map(normalizePath).filter(Boolean);
  return [...new Set(roots)].map((root) => `${root}/deploy-target.json`);
}

function resolveDeployTarget(candidate, deployTargetsByPath) {
  const directPaths = directDeployTargetPaths(candidate);
  const directMatches = directPaths.map((file) => deployTargetsByPath.get(file)).filter(Boolean);
  if (directMatches.length) return directMatches.sort(deployTargetSort)[0];

  if (candidate.deploy_target) {
    const summary = summarizeDeployTarget(null, candidate.deploy_target, 'inventory-embedded');
    return {
      path: null,
      raw: candidate.deploy_target,
      summary
    };
  }

  return null;
}

async function httpHeadGet(url) {
  const head = await httpRequest(url, 'HEAD');
  if (head.ok || !shouldTryGet(head)) return { ...head, attempted_methods: ['HEAD'] };
  const get = await httpRequest(url, 'GET');
  return { ...get, attempted_methods: ['HEAD', 'GET'], head_status: head.status, head_error: head.error || '' };
}

function shouldTryGet(result) {
  return result.status === 0 || result.status === 405 || result.status >= 400;
}

async function httpRequest(url, method) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'manual',
      headers: { accept: 'text/html,application/xhtml+xml,application/json,text/plain,*/*' },
      signal: controller.signal
    });
    let bytes = Number(response.headers.get('content-length') || 0) || 0;
    let title = '';
    if (method === 'GET') {
      const body = await response.text().catch(() => '');
      bytes = bytes || Buffer.byteLength(body);
      title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    }
    return {
      url,
      method,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      content_type: response.headers.get('content-type') || '',
      location: response.headers.get('location') || '',
      bytes,
      title,
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      error: ''
    };
  } catch (error) {
    return {
      url,
      method,
      status: 0,
      ok: false,
      content_type: '',
      location: '',
      bytes: 0,
      title: '',
      elapsed_ms: Number((performance.now() - started).toFixed(2)),
      error: error?.name === 'AbortError' ? 'request timed out after 15000ms' : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function candidateReceiptPaths(candidate) {
  return [...new Set((candidate.receipts || []).map(asRepoPath).filter(Boolean))];
}

function summarizeReceipts(candidate) {
  return candidateReceiptPaths(candidate).slice(0, 12).map((receiptPath) => {
    const skynetRelated = /skyenet|skynet|route:v1|live-proof|deploy|deployment/i.test(receiptPath);
    const blocked = /blocked|blocker|failed/i.test(receiptPath);
    const kind = blocked
      ? 'blocked'
      : /deploy|deployment/i.test(receiptPath)
        ? 'deploy'
        : /proof|smoke|stress/i.test(receiptPath)
          ? 'proof'
          : 'artifact';
    return {
      path: receiptPath,
      checked: false,
      source: 'inventory-reference-only',
      kind,
      skynet_related: skynetRelated,
      ok: null,
      live_url: null,
      deployment_id: null
    };
  });
}

function hasSkynetProofReceipt(receipts) {
  return receipts.some((receipt) =>
    receipt.source === 'inventory-reference-only'
    && receipt.skynet_related
    && receipt.kind !== 'artifact'
    && receipt.kind !== 'blocked'
    && receipt.ok !== false
  );
}

function classifyCandidate({ candidate, deployTarget, httpVerification, receiptEvidence }) {
  const id = String(candidate.id || candidate.slug || '');
  const deploySummary = deployTarget?.summary || null;
  const sourceExists = candidate.source_exists !== false;
  const buildExists = candidate.build_exists !== false;

  if (!sourceExists || !buildExists) {
    return {
      status: 'blocked-missing-root',
      reason: 'Inventory says the source root or public build root is missing.'
    };
  }

  if (/template/i.test(id) || /template/i.test(candidate.name || '')) {
    return {
      status: 'template-held',
      reason: 'Template candidate is intentionally held as a reusable starter, not a public client closure.'
    };
  }

  if (candidate.lane === 'free99-mounted-app-review' || candidate.priority === 'REVIEW' || candidate.target?.public_access === false) {
    return {
      status: 'gated-review-held',
      reason: 'Free99/0S mounted app remains under shared FS27/Gate review; do not create app-specific auth or public handoff by default.'
    };
  }

  if (candidate.lane === 'musicnexus-generated-proof-storefront' || candidate.priority === 'HOLD') {
    return {
      status: 'proof-held',
      reason: 'Generated proof storefront is held until owner cleanup/approval makes it canonical.'
    };
  }

  if (deploySummary?.is_pages_or_legacy) {
    return {
      status: 'deployed-pages-not-skynet',
      reason: `Deploy target points at non-SkyeNet hosting (${deploySummary.public_url || deploySummary.host || 'unknown'}).`
    };
  }

  if (deploySummary?.is_skynet) {
    if (deploySummary.is_shared_origin) {
      if (httpVerification?.ok) {
        return {
          status: 'live-public-skynet',
          reason: 'SkyeNet shared-origin deploy target exists and the public URL passed non-browser HTTP verification.'
        };
      }
      return {
        status: 'blocked-http',
        reason: 'SkyeNet shared-origin deploy target exists, but HEAD/GET verification did not return a public 2xx/3xx response.'
      };
    }

    const recordedPublicOk = deploySummary.recorded_smoke?.public_http_ok === true;
    const recordedRouteOk = deploySummary.recorded_smoke?.route_record_ok === true || deploySummary.recorded_smoke?.dashboard_ok === true;
    if (recordedPublicOk) {
      return {
        status: 'live-public-skynet',
        reason: 'SkyeNet deploy target has recorded passing public HTTP smoke; live shared-origin verification was not applicable.'
      };
    }
    if (recordedRouteOk) {
      return {
        status: 'proof-held',
        reason: 'SkyeNet route metadata exists, but public HTTP proof is not currently a passing shared-origin check.'
      };
    }
    return {
      status: 'blocked-http',
      reason: 'SkyeNet deploy target exists without passing public HTTP evidence.'
    };
  }

  if (hasSkynetProofReceipt(receiptEvidence)) {
    return {
      status: 'proof-held',
      reason: 'SkyeNet proof/deploy receipt exists, but no current deploy-target.json closure record is matched.'
    };
  }

  return {
    status: 'deployable-pending',
    reason: 'Source and build roots exist; no current SkyeNet deploy-target closure record is matched.'
  };
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

async function loadDeployTargets(inventory) {
  const files = [];
  for (const candidate of inventory.candidates || []) {
    for (const directPath of directDeployTargetPaths(candidate)) {
      const abs = path.join(repoRoot, directPath);
      if (existsSync(abs)) files.push(abs);
    }
  }
  const records = [];
  for (const file of [...new Set(files)].sort()) {
    const raw = await readJson(file);
    if (!raw) continue;
    const summary = summarizeDeployTarget(file, raw, 'disk');
    records.push({ path: rel(file), abs_path: file, raw, summary });
  }
  const byPath = new Map(records.map((record) => [record.path, record]));
  return { records, byPath };
}

function candidateRow({ candidate, deployTarget, httpVerification, receiptEvidence, classification }) {
  const targetUrl = firstString(
    deployTarget?.summary?.public_url,
    candidate.target?.live_url,
    (candidate.current_routes || []).find((route) => isSharedOriginUrl(route)),
    (candidate.current_routes || [])[0]
  );
  return {
    id: candidate.id,
    slug: candidate.slug || candidate.id,
    name: candidate.name || titleFromSlug(candidate.id),
    lane: candidate.lane,
    priority: candidate.priority || null,
    build_root: candidate.public_build_dir || candidate.build_root || null,
    source_root: candidate.source_root || null,
    source_exists: candidate.source_exists ?? null,
    build_exists: candidate.build_exists ?? null,
    target_url: targetUrl || null,
    target: candidate.target || null,
    current_routes: candidate.current_routes || [],
    current_status: classification.status,
    status_reason: classification.reason,
    deploy_target: deployTarget?.summary || null,
    http_verification: httpVerification || {
      attempted: false,
      reason: deployTarget?.summary?.is_skynet
        ? 'Skipped because the matched SkyeNet deploy target is not a shared-origin URL.'
        : 'Skipped because no SkyeNet deploy target exists for this candidate.'
    },
    receipt_evidence: receiptEvidence,
    notes: candidate.notes || []
  };
}

function renderMarkdown(payload) {
  const lines = [
    '# SkyeNet 73 Client App Closure Ledger',
    '',
    `Generated: ${payload.generated_at}`,
    '',
    '## Guardrails',
    '',
    '- Browser proof: owner-handled; this report did not launch a browser.',
    '- Auth: no credentials, owner codes, bearer tokens, or source-download auth calls were read or printed.',
    `- HTTP verification: HEAD with GET fallback, only for SkyeNet deploy targets whose public URL is on \`${sharedSkynetOrigin}\`.`,
    '',
    '## Counts',
    '',
    `- Candidates classified: ${payload.counts.total_candidates}`,
    `- Candidates with matched deploy-target evidence: ${payload.counts.candidates_with_matched_deploy_target}`,
    `- Candidate-root deploy-target files found: ${payload.counts.candidate_root_deploy_target_files_found}`,
    `- Shared-origin HTTP checks attempted: ${payload.counts.http_verified_count}`,
    `- Shared-origin HTTP checks passing: ${payload.counts.http_ok_count}`,
    ''
  ];

  for (const status of validStatuses) {
    lines.push(`- ${status}: ${payload.counts.by_status[status] || 0}`);
  }

  lines.push(
    '',
    '## Lane Counts',
    ''
  );
  for (const [lane, count] of Object.entries(payload.counts.by_lane)) {
    lines.push(`- ${lane}: ${count}`);
  }

  lines.push(
    '',
    '## Candidate Ledger',
    '',
    '| # | Status | Lane | Candidate | Build root | Source root | URL / target | Evidence |',
    '| ---: | --- | --- | --- | --- | --- | --- | --- |'
  );

  payload.candidates.forEach((candidate, index) => {
    const deploy = candidate.deploy_target?.path ? `deploy-target: \`${candidate.deploy_target.path}\`` : 'deploy-target: none';
    const http = candidate.http_verification?.attempted
      ? `HTTP ${candidate.http_verification.status || 0} via ${(candidate.http_verification.attempted_methods || [candidate.http_verification.method]).filter(Boolean).join('/')}`
      : 'HTTP skipped';
    const receiptCount = candidate.receipt_evidence.length;
    const evidence = `${deploy}; ${http}; receipts: ${receiptCount}`;
    lines.push(`| ${index + 1} | \`${candidate.current_status}\` | \`${markdownEscape(candidate.lane)}\` | \`${markdownEscape(candidate.id)}\`<br>${markdownEscape(candidate.name)} | \`${markdownEscape(candidate.build_root || '')}\` | \`${markdownEscape(candidate.source_root || '')}\` | ${markdownEscape(candidate.target_url || '')} | ${markdownEscape(evidence)} |`);
  });

  lines.push(
    '',
    '## Status Notes',
    ''
  );
  for (const status of validStatuses) {
    const rows = payload.candidates.filter((candidate) => candidate.current_status === status);
    if (!rows.length) continue;
    lines.push(`### ${status}`);
    for (const row of rows) {
      lines.push(`- \`${row.id}\`: ${row.status_reason}`);
    }
    lines.push('');
  }

  lines.push(
    '## Sources',
    '',
    `- Inventory: \`${payload.source_inputs.inventory}\``,
    `- JSON receipt: \`${payload.outputs.json_receipt}\``,
    `- Deploy-target scope: ${payload.source_inputs.deploy_target_scope}`,
    ''
  );

  return `${lines.join('\n')}\n`;
}

async function buildPayload() {
  const inventory = await readJson(inventoryPath);
  if (!inventory || !Array.isArray(inventory.candidates)) {
    throw new Error(`Missing or invalid inventory: ${rel(inventoryPath)}`);
  }
  const { records: deployTargets, byPath: deployTargetsByPath } = await loadDeployTargets(inventory);

  const candidates = [];
  const matchedDeployTargetPaths = new Set();
  let candidatesWithMatchedDeployTarget = 0;
  let httpVerifiedCount = 0;
  let httpOkCount = 0;

  for (const candidate of inventory.candidates) {
    const deployTarget = resolveDeployTarget(candidate, deployTargetsByPath);
    if (deployTarget) candidatesWithMatchedDeployTarget += 1;
    if (deployTarget?.path) matchedDeployTargetPaths.add(deployTarget.path);

    let httpVerification = null;
    if (deployTarget?.summary?.is_skynet && deployTarget.summary.is_shared_origin && deployTarget.summary.public_url) {
      httpVerification = {
        attempted: true,
        ...(await httpHeadGet(deployTarget.summary.public_url))
      };
      httpVerifiedCount += 1;
      if (httpVerification.ok) httpOkCount += 1;
    }

    const receiptEvidence = await summarizeReceipts(candidate);
    const classification = classifyCandidate({ candidate, deployTarget, httpVerification, receiptEvidence });
    candidates.push(candidateRow({ candidate, deployTarget, httpVerification, receiptEvidence, classification }));
  }

  const byStatus = { ...Object.fromEntries(validStatuses.map((status) => [status, 0])), ...countBy(candidates, (candidate) => candidate.current_status) };
  return {
    schema: 'skyenet.73-client-app-closure-ledger.v1',
    ok: candidates.length === 73 && candidates.every((candidate) => validStatuses.includes(candidate.current_status)),
    generated_at: new Date().toISOString(),
    source_inputs: {
      inventory: rel(inventoryPath),
      inventory_generated_at: inventory.generated_at || null,
      deploy_target_scope: 'candidate public_build_dir/build_root/source_root only',
      shared_skynet_origin: sharedSkynetOrigin,
      browser_proof: 'owner-handled; no browser proof was run'
    },
    outputs: {
      markdown_ledger: rel(markdownOutPath),
      json_receipt: rel(jsonOutPath)
    },
    rules: {
      valid_statuses: validStatuses,
      auth: 'No secrets or shared gate bearer tokens are read or emitted by this report.',
      http_verification: 'Shared-origin SkyeNet public URLs from matched deploy-target.json files are verified with HTTP HEAD and GET fallback only.'
    },
    counts: {
      total_candidates: candidates.length,
      by_status: byStatus,
      by_lane: countBy(candidates, (candidate) => candidate.lane),
      candidate_root_deploy_target_files_found: deployTargets.length,
      candidates_with_matched_deploy_target: candidatesWithMatchedDeployTarget,
      candidate_deploy_target_files_used: matchedDeployTargetPaths.size,
      duplicate_or_alternate_candidate_deploy_target_files: deployTargets.length - matchedDeployTargetPaths.size,
      http_verified_count: httpVerifiedCount,
      http_ok_count: httpOkCount,
      http_blocked_count: httpVerifiedCount - httpOkCount
    },
    candidates,
    unmatched_deploy_targets: []
  };
}

const payload = await buildPayload();
await fs.mkdir(artifactDir, { recursive: true });
await fs.mkdir(path.dirname(markdownOutPath), { recursive: true });
await fs.writeFile(jsonOutPath, `${JSON.stringify(payload, null, 2)}\n`);
await fs.writeFile(markdownOutPath, renderMarkdown(payload));

console.log(JSON.stringify({
  ok: payload.ok,
  markdown: rel(markdownOutPath),
  receipt: rel(jsonOutPath),
  counts: payload.counts
}, null, 2));
