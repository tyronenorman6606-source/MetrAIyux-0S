#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = '/workspaces/MetrAIyux-0S';
const baseUrl = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const apiPrefix = '/api/0s/company-knowledge';
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'company-knowledge-stress');
const publicProofPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'live-company-knowledge-stress-latest.json');

const WRITE_COUNT = Number(process.env.CK_STRESS_WRITES || 32);
const VAULT_INGEST_COUNT = Number(process.env.CK_STRESS_VAULT_INGESTS || 8);
const CONTEXT_COUNT = Number(process.env.CK_STRESS_CONTEXTS || 20);
const LIST_COUNT = Number(process.env.CK_STRESS_LISTS || 24);
const GET_COUNT = Number(process.env.CK_STRESS_GETS || 10);
const DELETE_COUNT = Number(process.env.CK_STRESS_DELETES || 4);
const STATUS_COUNT = Number(process.env.CK_STRESS_STATUS || 8);
const CONCURRENCY = Number(process.env.CK_STRESS_CONCURRENCY || 8);

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function resolveSharedGateToken() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: baseUrl });
  const token = String(auth.token || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth.ok || !token) throw new Error('Could not obtain shared 0S gate bearer.');
  return token;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
}

async function inPool(items, limit, worker) {
  const results = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function redactReceipt(receipt) {
  return {
    ok: receipt.ok,
    generatedAt: receipt.generatedAt,
    productionUrl: receipt.productionUrl,
    publicSurfaceUrl: `${baseUrl}/live/company-knowledge-layer-proof.html`,
    version: receipt.version,
    scope: receipt.scope,
    storage: receipt.storage,
    requestSummary: receipt.requestSummary,
    latencyMs: receipt.latencyMs,
    checks: receipt.checks,
    sampleItems: receipt.sampleItems,
    failures: receipt.failures,
    artifact: {
      localReceipt: receipt.artifact.localReceipt,
      publicJsonPath: '/proof/live-company-knowledge-stress-latest.json'
    },
    boundary: 'No private customer knowledge, bearer tokens, cookies, or root env values are included in this public proof.'
  };
}

async function main() {
  const runId = stamp();
  const artifactDir = path.join(artifactRoot, runId);
  fs.mkdirSync(artifactDir, { recursive: true });
  const token = await resolveSharedGateToken();
  const stressToken = `ck-stress-${runId.toLowerCase()}`;
  const startedAt = Date.now();
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    productionUrl: baseUrl,
    version: 'company-knowledge-production-stress-v1',
    scope: {
      baseId: 'metraiyux-0s',
      ownerType: 'platform',
      concurrency: CONCURRENCY,
      writes: WRITE_COUNT,
      vaultIngests: VAULT_INGEST_COUNT,
      contexts: CONTEXT_COUNT,
      lists: LIST_COUNT,
      itemGets: GET_COUNT,
      deletes: DELETE_COUNT,
      statusReads: STATUS_COUNT,
      queryToken: stressToken
    },
    storage: {},
    requestSummary: {},
    latencyMs: {},
    checks: [],
    sampleItems: [],
    failures: [],
    requests: [],
    artifact: {
      localReceipt: path.join(artifactDir, 'receipt.json'),
      latestReceipt: path.join(artifactRoot, 'latest.json'),
      publicJsonPath: publicProofPath
    }
  };

  async function call(label, method, route, { body, tokenOverride = token, expect = [200, 201] } = {}) {
    const url = `${baseUrl}${apiPrefix}${route}`;
    const headers = {};
    if (body) headers['content-type'] = 'application/json';
    if (tokenOverride) {
      headers.Authorization = `Bearer ${tokenOverride}`;
      headers['x-skye-gate-session'] = tokenOverride;
      headers['x-free99-gate-session'] = tokenOverride;
    }
    const t0 = Date.now();
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual'
    }).catch((error) => ({ error }));
    const ms = Date.now() - t0;
    if (response.error) {
      const entry = { label, method, route, status: 0, ms, ok: false, error: response.error.message };
      receipt.requests.push(entry);
      return { entry, data: {} };
    }
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 400) }; }
    const ok = expect.includes(response.status);
    const entry = {
      label,
      method,
      route,
      status: response.status,
      ms,
      ok,
      error: ok ? '' : [data.error, data.message].filter(Boolean).join(': ') || text.slice(0, 180)
    };
    receipt.requests.push(entry);
    return { entry, data };
  }

  const unauth = await call('unauth-status-denied', 'GET', '/status', { tokenOverride: '', expect: [401, 403] });
  receipt.checks.push({
    id: 'shared-gate-denies-unauthenticated-api',
    ok: [401, 403].includes(unauth.entry.status),
    status: unauth.entry.status
  });

  const statusReads = await inPool(Array.from({ length: STATUS_COUNT }), CONCURRENCY, (_, index) =>
    call(`status-read-${index}`, 'GET', '/status')
  );
  const status = statusReads.find((item) => item.data?.ok)?.data || {};
  receipt.storage = status.storage || {};
  receipt.checks.push({
    id: 'cloudflare-r2-and-kv-configured',
    ok: status.storage?.r2 === true && status.storage?.kv === true,
    storage: status.storage || null
  });

  const baseUpsert = await call('platform-base-upsert', 'POST', '/bases', {
    body: {
      ownerType: 'platform',
      knowledgeBaseId: 'metraiyux-0s',
      displayName: 'MetrAIyux 0S Company Knowledge',
      description: 'Founder-owned company knowledge base backed by Cloudflare R2 object storage and KV metadata.'
    }
  });
  receipt.checks.push({
    id: 'platform-base-upserted-through-shared-gate',
    ok: baseUpsert.entry.status === 201 && baseUpsert.data?.base?.id === 'metraiyux-0s',
    status: baseUpsert.entry.status
  });

  const writes = await inPool(Array.from({ length: WRITE_COUNT }), CONCURRENCY, (_, index) => {
    const itemId = `${stressToken}-item-${String(index).padStart(2, '0')}`;
    return call(`write-${index}`, 'POST', '/items', {
      body: {
        id: itemId,
        ownerType: 'platform',
        knowledgeBaseId: 'metraiyux-0s',
        title: `Company Knowledge Stress Proof ${index}`,
        content: [
          `Public-safe stress proof item ${index} for ${stressToken}.`,
          'This verifies concurrent writes into the MetrAIyux 0S company knowledge layer.',
          'Expected storage: Cloudflare R2 for object bodies and Cloudflare KV for searchable metadata.',
          'Boundary: this is synthetic proof content, not private customer knowledge.'
        ].join(' '),
        tags: ['stress-proof', 'company-knowledge', 'cloudflare-r2', stressToken],
        source: { kind: 'manual_drop', path: `stress/${stressToken}/${index}.txt` }
      }
    });
  });
  const writeItems = writes.map((item) => item.data?.item).filter(Boolean);
  receipt.checks.push({
    id: 'concurrent-r2-writes-created',
    ok: writeItems.length === WRITE_COUNT && writeItems.every((item) => item.storage === 'cloudflare_r2' && item.objectKey),
    expected: WRITE_COUNT,
    actual: writeItems.length
  });

  const vaultIngests = await inPool(Array.from({ length: VAULT_INGEST_COUNT }), CONCURRENCY, (_, index) =>
    call(`vault-ingest-${index}`, 'POST', '/vault-ingest', {
      body: {
        id: `${stressToken}-vault-${String(index).padStart(2, '0')}`,
        ownerType: 'platform',
        knowledgeBaseId: 'metraiyux-0s',
        title: `Vault receipt stress reference ${index}`,
        summary: `Public-safe vault receipt reference for ${stressToken} ingest ${index}.`,
        vaultReceiptId: `public-stress-receipt-${runId}-${index}`,
        vaultObjectKey: `company-knowledge-stress/${runId}/${index}.json`,
        tags: ['stress-proof', 'vault-ingest', stressToken]
      }
    })
  );
  const vaultItems = vaultIngests.map((item) => item.data?.item).filter(Boolean);
  receipt.checks.push({
    id: 'vault-ingest-route-created-references',
    ok: vaultItems.length === VAULT_INGEST_COUNT && vaultItems.every((item) => item.source?.kind === 'skyevault_receipt'),
    expected: VAULT_INGEST_COUNT,
    actual: vaultItems.length
  });

  const lists = await inPool(Array.from({ length: LIST_COUNT }), CONCURRENCY, (_, index) =>
    call(`list-${index}`, 'GET', `/items?knowledgeBaseId=metraiyux-0s&limit=80`)
  );
  receipt.checks.push({
    id: 'concurrent-list-reads-returned-items',
    ok: lists.every((item) => item.entry.ok && Number(item.data?.count || 0) > 0),
    expected: LIST_COUNT,
    actualOk: lists.filter((item) => item.entry.ok).length
  });

  const contexts = await inPool(Array.from({ length: CONTEXT_COUNT }), CONCURRENCY, (_, index) =>
    call(`context-${index}`, 'POST', '/context', {
      body: {
        ownerType: 'platform',
        knowledgeBaseId: 'metraiyux-0s',
        query: `${stressToken} Cloudflare R2 KV context proof ${index}`,
        limit: 8
      }
    })
  );
  const contextHits = contexts.map((item) => item.data?.hits || []);
  receipt.checks.push({
    id: 'context-search-finds-stress-knowledge',
    ok: contextHits.every((hits) => hits.some((hit) => String(hit.title || hit.snippet || '').toLowerCase().includes('stress proof') || (hit.tags || []).includes(stressToken))),
    contexts: CONTEXT_COUNT,
    minHits: Math.min(...contextHits.map((hits) => hits.length))
  });

  const samples = [...writeItems, ...vaultItems].slice(0, GET_COUNT);
  const gets = await inPool(samples, CONCURRENCY, (item, index) =>
    call(`get-${index}`, 'GET', `/items/${encodeURIComponent(item.id)}`)
  );
  receipt.checks.push({
    id: 'item-content-readback-works',
    ok: gets.every((item) => item.entry.ok && /stress proof|vault receipt/i.test(String(item.data?.content || item.data?.item?.title || ''))),
    expected: samples.length,
    actualOk: gets.filter((item) => item.entry.ok).length
  });

  const deleteItems = writeItems.slice(-DELETE_COUNT);
  const deletes = await inPool(deleteItems, CONCURRENCY, (item, index) =>
    call(`delete-${index}`, 'DELETE', `/items/${encodeURIComponent(item.id)}`)
  );
  receipt.checks.push({
    id: 'cleanup-delete-route-works',
    ok: deletes.length === DELETE_COUNT && deletes.every((item) => item.entry.ok && item.data?.deleted === true),
    expected: DELETE_COUNT,
    actualOk: deletes.filter((item) => item.entry.ok && item.data?.deleted === true).length
  });

  receipt.sampleItems = [...writeItems.slice(0, 6), ...vaultItems.slice(0, 4)].map((item) => ({
    id: item.id,
    baseId: item.baseId,
    title: item.title,
    storage: item.storage,
    objectKey: item.objectKey,
    sourceKind: item.source?.kind || '',
    sha256Prefix: String(item.sha256 || '').slice(0, 12)
  }));

  const statuses = {};
  for (const request of receipt.requests) statuses[request.status] = (statuses[request.status] || 0) + 1;
  const latencies = receipt.requests.map((request) => request.ms).filter(Number.isFinite);
  receipt.requestSummary = {
    total: receipt.requests.length,
    ok: receipt.requests.filter((request) => request.ok).length,
    failed: receipt.requests.filter((request) => !request.ok).length,
    statuses
  };
  receipt.latencyMs = {
    min: Math.min(...latencies),
    max: Math.max(...latencies),
    p50: percentile(latencies, 50),
    p90: percentile(latencies, 90),
    p95: percentile(latencies, 95),
    duration: Date.now() - startedAt
  };

  for (const request of receipt.requests) {
    if (!request.ok) receipt.failures.push(`${request.label} ${request.method} ${request.route} returned ${request.status}: ${request.error}`);
  }
  for (const check of receipt.checks) {
    if (!check.ok) receipt.failures.push(`check_failed:${check.id}`);
  }
  if (receipt.latencyMs.p95 > 20000) receipt.failures.push(`p95_latency_too_high:${receipt.latencyMs.p95}`);
  receipt.ok = receipt.failures.length === 0;

  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.writeFileSync(receipt.artifact.localReceipt, JSON.stringify(receipt, null, 2));
  fs.writeFileSync(receipt.artifact.latestReceipt, JSON.stringify(receipt, null, 2));
  fs.mkdirSync(path.dirname(publicProofPath), { recursive: true });
  fs.writeFileSync(publicProofPath, JSON.stringify(redactReceipt(receipt), null, 2));

  console.log(JSON.stringify({
    ok: receipt.ok,
    receiptPath: receipt.artifact.localReceipt,
    publicProofPath,
    requests: receipt.requestSummary,
    latencyMs: receipt.latencyMs,
    checks: receipt.checks.map((check) => ({ id: check.id, ok: check.ok })),
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
