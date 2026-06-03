#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const BASE_URL = String(process.env.ZERO_OS_LIVE_BASE || process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.join(repoRoot, 'test-artifacts', 'founder-command-skyevault-drift');
const LATEST = path.join(OUT_DIR, 'founder-command-skyevault-drift-live-http-latest.json');
const timeoutMs = Number(process.env.FOUNDER_COMMAND_SKYEVAULT_PROOF_TIMEOUT_MS || 30000);

const localProofPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'skyevault-autosync-proof.json');
const localManifestPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'repo-vault-project-manifest.json');
const localChunkPath = path.join(repoRoot, 'metraiyux_0s_site', 'proof', 'repo-vault-project-manifest', 'entries-000.json');

const audioPath = process.env.FOUNDER_COMMAND_SKYEVAULT_AUDIO_PATH || '/founder-command/song-vault/audio/gray-skyes-catalog/always-try-to-breathe.mp3';
const audioSkyeNetPath = `/skyenet${audioPath}`;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function headers(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

async function timedFetch(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: init.redirect || 'manual' });
    const elapsedMs = Number((performance.now() - started).toFixed(2));
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text().catch(() => '');
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs,
      contentType,
      location: response.headers.get('location') || '',
      text,
      body
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: '',
      location: '',
      text: '',
      body: null,
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function binaryProbe(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: init.redirect || 'manual' });
    const bytes = new Uint8Array(await response.arrayBuffer().catch(() => new ArrayBuffer(0)));
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: response.headers.get('content-type') || '',
      contentLength: response.headers.get('content-length') || '',
      location: response.headers.get('location') || '',
      bytes: bytes.byteLength,
      firstBytes: Array.from(bytes.slice(0, 4))
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      contentType: '',
      contentLength: '',
      location: '',
      bytes: 0,
      firstBytes: [],
      error: error?.name === 'AbortError' ? `request timed out after ${timeoutMs}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timer);
  }
}

function safeDownloadSummary(body = {}) {
  let host = '';
  try { host = body.download_url ? new URL(body.download_url).host : ''; } catch {}
  return {
    status: body.status || null,
    ok: body.ok === true,
    receipt_id: body.receipt_id || '',
    file_name: body.file_name || '',
    artifact_bytes: body.artifact_bytes || null,
    artifact_sha256_prefix: body.artifact_sha256_prefix || '',
    expires_at: body.expires_at || '',
    vault_route: body.vault_route || '',
    vault_origin: body.vault_origin || '',
    has_download_url: Boolean(body.download_url),
    download_url_host: host,
    safety: body.safety || null
  };
}

function includesMp3Magic(firstBytes = []) {
  return firstBytes[0] === 0x49 && firstBytes[1] === 0x44 && firstBytes[2] === 0x33
    || firstBytes[0] === 0xff && (firstBytes[1] & 0xe0) === 0xe0;
}

function forbiddenLeakFindings(samples, token) {
  const checks = [
    ['owner-bearer-token', token ? new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : null],
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/i],
    ['openai-key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
    ['github-token', /\b(?:github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]{20,}\b/],
    ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
    ['google-api-key', /\bAIza[0-9A-Za-z_-]{25,}\b/],
    ['db-url-with-password', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@"]+:[^\s@"]+@/i],
    ['tax-ssn-field', /"(?:ssn|social_security_number|taxpayer_id|tin)"\s*:/i],
    ['payment-card-field', /"(?:card_number|cvv|cvc|routing_number|bank_account_number)"\s*:/i],
    ['raw-private-source-body', /"(?:raw_source|file_body|private_source|source_archive_base64)"\s*:/i]
  ].filter(([, regex]) => regex);
  const findings = [];
  for (const sample of samples) {
    const text = String(sample.text || '');
    for (const [label, regex] of checks) {
      if (regex.test(text)) findings.push({ sample: sample.label, label });
    }
  }
  return findings;
}

function addCheck(receipt, label, ok, details = {}) {
  receipt.checks.push({ label, ok: Boolean(ok), ...details });
}

async function main() {
  const [localProof, localManifest, localChunk] = await Promise.all([
    readJson(localProofPath),
    readJson(localManifestPath),
    readJson(localChunkPath)
  ]);
  const expectedReceiptId = process.env.FOUNDER_COMMAND_SKYEVAULT_EXPECTED_RECEIPT_ID
    || localManifest.encrypted_full_artifact?.receipt_id
    || localProof.latestUpload?.receiptId
    || '';

  const gateAuth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  const receipt = {
    ok: false,
    schema: 'founder-command.skyevault-drift-live-http-proof.v1',
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    localExpected: {
      proof: {
        path: path.relative(repoRoot, localProofPath),
        schema: localProof.schema,
        generatedAt: localProof.generatedAt,
        latestUploadReceiptId: localProof.latestUpload?.receiptId || '',
        currentStatusCheckedAt: localProof.currentStatus?.checkedAt || '',
        latestSuccessCompletedAt: localProof.latestSuccess?.completedAt || '',
        daemonWatchRunning: Boolean(localProof.daemon?.watchRunning),
        daemonActiveLockRunning: Boolean(localProof.daemon?.activeLock?.running)
      },
      manifest: {
        path: path.relative(repoRoot, localManifestPath),
        schema: localManifest.schema,
        generatedAt: localManifest.generatedAt,
        receiptId: expectedReceiptId,
        chunkCount: localManifest.chunks?.length || 0,
        safeBrowserEntryCount: localManifest.coverage?.safe_browser_entry_count || 0,
        privateEntryCount: localManifest.coverage?.private_entry_count || 0,
        skippedEntryCount: localManifest.coverage?.skipped_entry_count || 0
      },
      chunk: {
        path: path.relative(repoRoot, localChunkPath),
        schema: localChunk.schema,
        id: localChunk.id || 'entries-000',
        entryCount: Array.isArray(localChunk.entries) ? localChunk.entries.length : 0
      }
    },
    login: {
      ok: Boolean(gateAuth.ok && gateAuth.token),
      status: gateAuth.response?.status || 0,
      credentialSource: gateAuth.credential?.key || gateAuth.credential?.source || 'missing',
      tokenReceived: Boolean(gateAuth.token)
    },
    live: {},
    checks: [],
    leakFindings: []
  };

  if (!gateAuth.token) {
    addCheck(receipt, 'shared FS27/SkyGate owner bearer resolved', false, { status: gateAuth.response?.status || 0 });
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, LATEST), error: 'missing shared gate bearer' }, null, 2));
    process.exitCode = 1;
    return;
  }

  const token = gateAuth.token;
  const authHeaders = headers(token);
  const htmlHeaders = headers(token, { accept: 'text/html' });

  const [
    unauthHtml,
    unauthApi,
    unauthDownload,
    repo,
    chunk,
    proof,
    project,
    log,
    deniedFile,
    deniedChunk
  ] = await Promise.all([
    timedFetch(`${BASE_URL}/founder-command/?view=repo-vault`, { headers: { accept: 'text/html' } }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault`, { headers: { accept: 'application/json' } }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault/download`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: '{}'
    }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault`, { headers: authHeaders }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault?chunk=entries-000`, { headers: authHeaders }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault?file=autosync-proof`, { headers: authHeaders }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault?file=project-manifest`, { headers: authHeaders }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault?file=autosync-proof-log`, { headers: authHeaders }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault?file=env.txt`, { headers: authHeaders }),
    timedFetch(`${BASE_URL}/api/founder-command/repo-vault?chunk=../../env`, { headers: authHeaders })
  ]);

  const download = await timedFetch(`${BASE_URL}/api/founder-command/repo-vault/download`, {
    method: 'POST',
    headers: headers(token, { 'content-type': 'application/json' }),
    body: JSON.stringify({ proof: 'founder-command-skyevault-drift-live-http' })
  });
  const audioRedirect = await timedFetch(`${BASE_URL}${audioPath}`, { headers: htmlHeaders });
  const audio = await binaryProbe(`${BASE_URL}${audioSkyeNetPath}`, {
    headers: headers(token, { accept: 'audio/mpeg', range: 'bytes=0-63' })
  });

  const stressSamples = [];
  for (let i = 0; i < 10; i += 1) {
    stressSamples.push(await timedFetch(`${BASE_URL}/api/founder-command/repo-vault${i % 2 ? '?chunk=entries-000' : ''}`, { headers: authHeaders }));
  }
  const stressDurations = stressSamples.map((item) => item.elapsedMs).sort((a, b) => a - b);

  receipt.live = {
    unauthenticated: {
      htmlStatus: unauthHtml.status,
      htmlLocation: unauthHtml.location,
      apiStatus: unauthApi.status,
      apiGateHeader: unauthApi.body?.error || '',
      downloadStatus: unauthDownload.status
    },
    repoVault: {
      status: repo.status,
      ready: Boolean(repo.body?.ready),
      manifestSchema: repo.body?.project_manifest?.schema || '',
      manifestGeneratedAt: repo.body?.project_manifest?.generatedAt || '',
      receiptId: repo.body?.latest_upload?.receipt_id || repo.body?.project_manifest?.encrypted_full_artifact?.receipt_id || '',
      chunkIds: (repo.body?.project_manifest?.chunks || []).slice(0, 5).map((item) => item.id),
      streamFiles: (repo.body?.stream_files || []).map((item) => item.id),
      errors: repo.body?.errors || [],
      daemon: repo.body?.daemon || null,
      autosync: repo.body?.autosync || null,
      safety: repo.body?.safety || null
    },
    chunk: {
      status: chunk.status,
      schema: chunk.body?.data?.schema || '',
      id: chunk.body?.file?.id || '',
      entryCount: Array.isArray(chunk.body?.data?.entries) ? chunk.body.data.entries.length : 0,
      safety: chunk.body?.safety || null
    },
    proofFile: {
      status: proof.status,
      schema: proof.body?.data?.schema || '',
      generatedAt: proof.body?.data?.generatedAt || '',
      latestUploadReceiptId: proof.body?.data?.latestUpload?.receiptId || '',
      currentStatusCheckedAt: proof.body?.data?.currentStatus?.checkedAt || '',
      latestSuccessCompletedAt: proof.body?.data?.latestSuccess?.completedAt || '',
      daemonWatchRunning: Boolean(proof.body?.data?.daemon?.watchRunning),
      daemonActiveLockRunning: Boolean(proof.body?.data?.daemon?.activeLock?.running)
    },
    projectFile: {
      status: project.status,
      schema: project.body?.data?.schema || '',
      generatedAt: project.body?.data?.generatedAt || '',
      receiptId: project.body?.data?.encrypted_full_artifact?.receipt_id || '',
      chunkCount: project.body?.data?.chunks?.length || 0,
      safeBrowserEntryCount: project.body?.data?.coverage?.safe_browser_entry_count || 0
    },
    proofLog: {
      status: log.status,
      schema: log.body?.data?.schema || '',
      updatedAt: log.body?.data?.updatedAt || '',
      entryCount: Array.isArray(log.body?.data?.entries) ? log.body.data.entries.length : 0
    },
    denylist: {
      envFileStatus: deniedFile.status,
      envFileError: deniedFile.body?.error || '',
      traversalChunkStatus: deniedChunk.status,
      traversalChunkError: deniedChunk.body?.error || ''
    },
    sourceDownload: safeDownloadSummary(download.body || {}),
    audio: {
      originalPath: audioPath,
      redirectStatus: audioRedirect.status,
      redirectLocation: audioRedirect.location,
      skynetPath: audioSkyeNetPath,
      status: audio.status,
      contentType: audio.contentType,
      contentLength: audio.contentLength,
      bytesRead: audio.bytes,
      mp3Magic: includesMp3Magic(audio.firstBytes)
    },
    stress: {
      requests: stressSamples.length,
      ok: stressSamples.every((item) => item.status === 200 && item.body?.ok !== false),
      p95Ms: Number((stressDurations[Math.max(0, Math.ceil(stressDurations.length * 0.95) - 1)] || 0).toFixed(2)),
      maxMs: Number((stressDurations[stressDurations.length - 1] || 0).toFixed(2))
    }
  };

  const leakSamples = [
    ['repo-vault', repo],
    ['chunk', chunk],
    ['autosync-proof', proof],
    ['project-manifest', project],
    ['autosync-proof-log', log],
    ['denied-file', deniedFile],
    ['denied-chunk', deniedChunk]
  ].map(([label, item]) => ({ label, text: item.text }));
  receipt.leakFindings = forbiddenLeakFindings(leakSamples, token);

  addCheck(receipt, 'shared FS27/SkyGate owner bearer resolved', receipt.login.ok, { status: receipt.login.status });
  addCheck(receipt, 'unauthenticated Founder Command HTML redirects to shared owner login', unauthHtml.status === 302 && unauthHtml.location.includes('/admin/login.html?return='));
  addCheck(receipt, 'unauthenticated repo vault API is denied', unauthApi.status === 401);
  addCheck(receipt, 'unauthenticated repo vault download POST is denied', unauthDownload.status === 401);
  addCheck(receipt, 'repo vault API serves the local public-safe manifest', repo.status === 200
    && repo.body?.ready === true
    && repo.body?.project_manifest?.schema === localManifest.schema
    && repo.body?.project_manifest?.generatedAt === localManifest.generatedAt
    && (repo.body?.latest_upload?.receipt_id || repo.body?.project_manifest?.encrypted_full_artifact?.receipt_id) === expectedReceiptId
    && Array.isArray(repo.body?.project_manifest?.chunks)
    && repo.body.project_manifest.chunks.some((item) => item.id === 'entries-000')
    && Array.isArray(repo.body?.errors)
    && repo.body.errors.length === 0);
  addCheck(receipt, 'repo vault stream file list includes autosync proof and project manifest', ['autosync-proof', 'project-manifest'].every((id) => receipt.live.repoVault.streamFiles.includes(id)));
  addCheck(receipt, 'manifest chunk entries-000 streams 1000 public-safe entries', chunk.status === 200
    && chunk.body?.data?.schema === localChunk.schema
    && chunk.body?.file?.id === 'entries-000'
    && Array.isArray(chunk.body?.data?.entries)
    && chunk.body.data.entries.length === localChunk.entries.length);
  addCheck(receipt, 'autosync proof stream matches freshly generated local proof', proof.status === 200
    && proof.body?.data?.schema === localProof.schema
    && proof.body?.data?.generatedAt === localProof.generatedAt
    && proof.body?.data?.latestUpload?.receiptId === expectedReceiptId
    && proof.body?.data?.currentStatus?.checkedAt === localProof.currentStatus?.checkedAt);
  addCheck(receipt, 'daemon/report fields render from the autosync proof source', repo.body?.autosync?.proof_updated_at === localProof.generatedAt
    && repo.body?.daemon?.heartbeat === (localProof.daemon?.lastDaemonLine || '')
    && proof.body?.data?.daemon?.activeLock?.running === localProof.daemon?.activeLock?.running);
  addCheck(receipt, 'project manifest stream matches local generated manifest and receipt', project.status === 200
    && project.body?.data?.schema === localManifest.schema
    && project.body?.data?.generatedAt === localManifest.generatedAt
    && project.body?.data?.encrypted_full_artifact?.receipt_id === expectedReceiptId
    && project.body?.data?.chunks?.length === localManifest.chunks.length);
  addCheck(receipt, 'source download mints a signed link for the current full-repo receipt without persisting the URL', download.status === 200
    && download.body?.ok === true
    && download.body?.receipt_id === expectedReceiptId
    && Boolean(download.body?.download_url)
    && download.body?.safety?.signed_url_persisted === false);
  addCheck(receipt, 'repo vault file allowlist denies env file and chunk traversal', deniedFile.status === 404 && deniedChunk.status === 404);
  addCheck(receipt, 'public-safe JSON responses do not expose owner bearer, private keys, tax fields, payment fields, or raw private source bodies', receipt.leakFindings.length === 0, { findingCount: receipt.leakFindings.length });
  addCheck(receipt, 'Founder Command MP3 redirects through private SkyeNet and returns audio/mpeg', audioRedirect.status === 302
    && audioRedirect.location.includes(audioSkyeNetPath)
    && audio.status === 200
    && audio.contentType.split(';')[0] === 'audio/mpeg'
    && audio.bytes > 0
    && includesMp3Magic(audio.firstBytes));
  addCheck(receipt, 'repo vault smoke stress stayed green', receipt.live.stress.ok && receipt.live.stress.requests === 10);

  receipt.ok = receipt.checks.every((check) => check.ok);
  const dated = path.join(OUT_DIR, `${stamp()}-founder-command-skyevault-drift-live-http.json`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(dated, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, LATEST),
    datedReceipt: path.relative(repoRoot, dated),
    expectedReceiptId,
    checks: receipt.checks.map((check) => ({ label: check.label, ok: check.ok })),
    sourceDownload: receipt.live.sourceDownload,
    audio: receipt.live.audio
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const failed = {
    ok: false,
    schema: 'founder-command.skyevault-drift-live-http-proof.v1',
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    error: error?.message || String(error),
    stack: error?.stack || ''
  };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify(failed, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
});
