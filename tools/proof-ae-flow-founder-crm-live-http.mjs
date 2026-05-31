#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const repoRoot = process.cwd();
const BASE_URL = String(process.env.ZERO_OS_LIVE_BASE || process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.join(repoRoot, 'test-artifacts', 'ae-flow-founder-crm-live-http');
const LATEST = path.join(OUT_DIR, 'ae-flow-founder-crm-live-http-latest.json');
const CREDENTIAL_KEYS = [
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'FS27_ADMIN_PASSWORD'
];

function unquote(value = '') {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

async function readEnvFile(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    const values = {};
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) values[match[1]] = unquote(match[2]);
    }
    return values;
  } catch {
    return {};
  }
}

async function liveCredential() {
  const envFiles = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    '.env',
    'env.txt'
  ].filter(Boolean);
  const merged = { ...process.env };
  for (const file of envFiles) Object.assign(merged, await readEnvFile(path.resolve(file)));
  for (const key of CREDENTIAL_KEYS) {
    if (merged[key]) return { key, value: merged[key] };
  }
  return { key: '', value: '' };
}

async function fetchJson(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, init);
  const elapsedMs = Number((performance.now() - started).toFixed(2));
  const text = await response.text().catch(() => '');
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { text: text.slice(0, 1200) };
  }
  return {
    status: response.status,
    ok: response.ok && body?.ok !== false,
    elapsedMs,
    body
  };
}

function headers(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-admin-token': token,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

function compactCall(call) {
  return {
    status: call.status,
    ok: Boolean(call.ok),
    elapsedMs: call.elapsedMs,
    error: call.body?.error || ''
  };
}

function check(label, ok, details = {}) {
  return { label, ok: Boolean(ok), ...details };
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

async function writeReceipt(receipt) {
  const stamp = receipt.generatedAt.replace(/[:.]/g, '-');
  const stamped = path.join(OUT_DIR, stamp, 'receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify({ ...receipt, stampedReceipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  return { stamped, latest: LATEST };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const runId = `ae-flow-founder-crm-${generatedAt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
  const aeId = `ae_contact_${runId}`;
  const aeEmail = `${runId}@metraiyux.local`;
  const workflowId = `workflow_${runId}`;
  const executionId = `execution_${runId}`;
  const dispatchId = `dispatch_${runId}`;
  const journalId = `journal_${runId}`;
  const snapshotId = `snapshot_${runId}`;
  const activationPackId = `activation_pack_${runId}`;
  const receipt = {
    ok: false,
    generatedAt,
    lane: 'ae-flow-founder-crm-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: '',
    login: null,
    calls: {},
    checks: [],
    stress: null,
    failures: []
  };

  const credential = await liveCredential();
  receipt.credentialSource = credential.key || 'missing';
  if (!credential.value) {
    receipt.failures.push('No owner credential found in process env, .env, or env.txt.');
    const paths = await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), failures: receipt.failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  const login = await fetchJson(`${BASE_URL}/api/owner/admin-login`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  receipt.login = { ...compactCall(login), tokenReceived: Boolean(token) };
  if (!token) receipt.failures.push(login.body?.error || 'Founder Command shared-gate login did not return a bearer.');

  if (token) {
    const h = headers(token);
    const jsonHeaders = headers(token, { 'content-type': 'application/json' });
    const statusBefore = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/status`, { headers: h });
    const products = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/products`, { headers: h });
    const capture = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/capture`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        id: aeId,
        source: 'music-nexus-paperwork',
        source_id: `paperwork:${runId}`,
        collection: 'signed-paperwork',
        kind: 'account-exec',
        status: 'paperwork_signed_active',
        name: 'AEFlow Founder CRM Proof AE',
        company: 'Skyes Over London LC / Music Nexus',
        email: aeEmail,
        phone: '555-010-0S0S',
        route: 'founder-command-ae-roster',
        city: 'Phoenix',
        state: 'AZ',
        tags: ['music-nexus-paperwork', 'founder-command', 'ae-roster', 'commission-proof'],
        notes: 'Non-browser live proof that Founder Command can capture an Account Exec from signed Music Nexus paperwork into the private AEFlow CRM lane.',
        paperwork: {
          signed: true,
          signed_at: generatedAt,
          source: 'music-nexus',
          document_type: 'account-exec-paperwork'
        },
        assignment: {
          client_ids: ['founder-client:bobs-smoke-shop', 'valley-verified'],
          assigned_by: 'founder-command'
        },
        commission: {
          plan: 'founder-proof-no-payout',
          status: 'tracked_without_external_payout'
        }
      })
    });

    const importBatch = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/import-batch`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        source: 'founder-ae-crm-api-proof',
        records: [
          {
            source: 'music-nexus-paperwork',
            source_id: `paperwork:${runId}:signed`,
            collection: 'paperwork',
            kind: 'account-exec',
            status: 'paperwork_signed_active',
            name: 'AEFlow Founder CRM Proof AE',
            company: 'Skyes Over London LC / Music Nexus',
            email: aeEmail,
            tags: ['signed-paperwork', 'account-exec']
          },
          {
            source: 'founder-client-assignment',
            source_id: `assignment:${runId}:bobs-smoke-shop`,
            collection: 'accounts',
            kind: 'client_assignment',
            status: 'assigned_for_founder_review',
            name: "Bob's Smoke Shop",
            company: "Bob's Smoke Shop",
            email: 'bobsmokeshopaz@gmail.com',
            tags: ['client-assignment', 'ae-work-order']
          },
          {
            source: 'ae-commission-ledger',
            source_id: `commission:${runId}`,
            collection: 'deals',
            kind: 'commission',
            status: 'tracked_no_external_payout',
            name: 'Founder proof commission ledger item',
            company: 'Skyes Over London LC',
            email: aeEmail,
            tags: ['commission', 'proof-no-payout']
          },
          {
            source: 'ae-task-handoff',
            source_id: `task:${runId}:closeout`,
            collection: 'handoff_log',
            kind: 'task',
            status: 'queued_for_founder_closeout',
            name: 'AEFlow Founder CRM closeout task',
            company: 'MetrAIyux 0S',
            email: aeEmail,
            tags: ['task', 'founder-command']
          }
        ]
      })
    });

    const journal = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/journal`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        id: journalId,
        type: 'ae_founder_crm_closeout',
        title: 'Founder Command AEFlow roster, paperwork, assignment, commission, and task proof',
        aeId,
        paperworkSigned: true,
        assignedClientIds: ['founder-client:bobs-smoke-shop', 'valley-verified'],
        commissionStatus: 'tracked_no_external_payout',
        taskStatus: 'queued_for_founder_closeout',
        runId
      })
    });
    const snapshot = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/snapshots`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        id: snapshotId,
        runId,
        roster: [{ aeId, name: 'AEFlow Founder CRM Proof AE', email: aeEmail, paperwork: 'signed', status: 'active' }],
        assignments: [{ aeId, clientAccountId: 'founder-client:bobs-smoke-shop', role: 'account-exec', status: 'assigned_for_founder_review' }],
        commissions: [{ aeId, basis: 'proof-ledger', status: 'tracked_no_external_payout' }],
        tasks: [{ aeId, task: 'Review Bob account and Valley Verified roster from Founder Command', status: 'queued' }]
      })
    });
    const activationPack = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/activation-packs`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        id: activationPackId,
        runId,
        aeId,
        clients: ['founder-client:bobs-smoke-shop', 'valley-verified'],
        paperwork: ['music-nexus-ae-paperwork'],
        systems: ['aeflow', 'routex', 'nexus', 'founder-command', 'command-bridge']
      })
    });
    const workflow = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/activation-workflows`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        id: workflowId,
        runId,
        activationPackId,
        aeId,
        stages: ['paperwork-readback', 'client-assignment', 'commission-ledger', 'task-dispatch', 'founder-review'],
        status: 'ready_for_execution_board'
      })
    });
    const execution = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/activation-workflows/${encodeURIComponent(workflowId)}/execution`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        id: executionId,
        runId,
        aeId,
        task: 'Founder Command AE roster and client assignment closeout',
        status: 'queued_for_founder_review',
        noExternalPayout: true
      })
    });
    const dispatch = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/execution-board/${encodeURIComponent(executionId)}/dispatch`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        id: dispatchId,
        runId,
        channel: 'founder-command',
        target: 'ae-flow-owner-roster-readback',
        status: 'recorded_no_external_send',
        noExternalSend: true
      })
    });
    const statusAfter = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/status`, { headers: h });
    const contacts = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/contacts?limit=100&detail=1`, { headers: h });
    const journalRead = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/journal?limit=100`, { headers: h });
    const snapshotRead = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/runtime/snapshots?limit=100`, { headers: h });

    receipt.calls = {
      statusBefore: compactCall(statusBefore),
      products: { ...compactCall(products), count: products.body?.products?.length || 0 },
      capture: { ...compactCall(capture), contactId: capture.body?.captured?.contact_id || '' },
      importBatch: { ...compactCall(importBatch), accepted: importBatch.body?.imported?.accepted || 0, skipped: importBatch.body?.imported?.skipped || 0 },
      journal: { ...compactCall(journal), id: journal.body?.entry?.id || '' },
      snapshot: { ...compactCall(snapshot), id: snapshot.body?.snapshot?.id || '' },
      activationPack: { ...compactCall(activationPack), id: activationPack.body?.activationPack?.id || '' },
      workflow: { ...compactCall(workflow), id: workflow.body?.activationWorkflow?.id || '' },
      execution: { ...compactCall(execution), id: execution.body?.executionItem?.id || '' },
      dispatch: { ...compactCall(dispatch), id: dispatch.body?.dispatch?.id || '' },
      statusAfter: {
        ...compactCall(statusAfter),
        journalTotal: statusAfter.body?.journal?.total || 0,
        snapshotTotal: statusAfter.body?.snapshots?.total || 0,
        activationPackTotal: statusAfter.body?.activationPacks?.total || 0,
        activationWorkflowTotal: statusAfter.body?.activationWorkflows?.total || 0,
        executionBoardTotal: statusAfter.body?.executionBoard?.total || 0,
        dispatchBoardTotal: statusAfter.body?.dispatchBoard?.total || 0
      },
      contacts: { ...compactCall(contacts), count: contacts.body?.count || 0 },
      journalRead: { ...compactCall(journalRead), count: journalRead.body?.count || 0 },
      snapshotRead: { ...compactCall(snapshotRead), count: snapshotRead.body?.count || 0 }
    };

    const contactRows = Array.isArray(contacts.body?.contacts) ? contacts.body.contacts : [];
    const journalRows = Array.isArray(journalRead.body?.journal) ? journalRead.body.journal : [];
    const snapshotRows = Array.isArray(snapshotRead.body?.snapshots) ? snapshotRead.body.snapshots : [];
    receipt.checks.push(
      check('AEFlow status route is shared-gate owner reachable', statusBefore.ok && statusBefore.body?.founder_only === true, { status: statusBefore.status }),
      check('AEFlow products read back', products.ok && Number(products.body?.products?.length || 0) > 0, { count: products.body?.products?.length || 0 }),
      check('Signed Music Nexus AE paperwork captured to CRM contact', capture.status === 201 && capture.ok && capture.body?.captured?.contact_id === aeId, { status: capture.status, contactId: capture.body?.captured?.contact_id || '' }),
      check('AE import batch accepted roster, assignment, commission, and task records', importBatch.status === 201 && Number(importBatch.body?.imported?.accepted || 0) >= 4, { accepted: importBatch.body?.imported?.accepted || 0 }),
      check('Runtime journal write returned receipt payload', journal.status === 201 && journal.body?.entry?.id === journalId, { id: journal.body?.entry?.id || '' }),
      check('Runtime snapshot write returned receipt payload', snapshot.status === 201 && snapshot.body?.snapshot?.id === snapshotId, { id: snapshot.body?.snapshot?.id || '' }),
      check('Activation pack, workflow, execution, and dispatch writes succeeded', [activationPack, workflow, execution, dispatch].every((call) => call.status === 201 && call.ok), { statuses: [activationPack.status, workflow.status, execution.status, dispatch.status] }),
      check('Contact roster reads back proof AE', contactRows.some((row) => row.id === aeId || row.email === aeEmail), { count: contactRows.length }),
      check('Journal readback includes proof entry', journalRows.some((row) => row.id === journalId), { count: journalRows.length }),
      check('Snapshot readback includes proof entry', snapshotRows.some((row) => row.id === snapshotId), { count: snapshotRows.length }),
      check('Runtime status counts include written queues', statusAfter.ok && Number(statusAfter.body?.journal?.total || 0) > 0 && Number(statusAfter.body?.executionBoard?.total || 0) > 0, { status: statusAfter.status })
    );

    const samples = [];
    const routes = [
      '/api/founder-command/ae-flow/status',
      '/api/founder-command/ae-flow/products',
      '/api/founder-command/ae-flow/contacts?limit=25',
      '/api/founder-command/ae-flow/runtime/status',
      '/api/founder-command/ae-flow/runtime/journal?limit=25',
      '/api/founder-command/ae-flow/runtime/snapshots?limit=25'
    ];
    for (let index = 0; index < 18; index += 1) {
      samples.push(await fetchJson(`${BASE_URL}${routes[index % routes.length]}`, { headers: h }));
    }
    const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.ok),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...durations).toFixed(2))
    };
  }

  for (const item of receipt.checks) {
    if (!item.ok) receipt.failures.push(`Check failed: ${item.label}`);
  }
  if (receipt.stress && !receipt.stress.ok) receipt.failures.push('AEFlow API stress failed.');
  receipt.ok = Boolean(receipt.login?.tokenReceived && receipt.checks.length > 0 && receipt.checks.every((item) => item.ok) && receipt.stress?.ok && receipt.failures.length === 0);
  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, paths.latest),
    stampedReceipt: path.relative(repoRoot, paths.stamped),
    checks: receipt.checks.map((item) => ({ label: item.label, ok: item.ok })),
    stress: receipt.stress,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'ae-flow-founder-crm-live-http',
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    fatal: error?.stack || error?.message || String(error)
  };
  const paths = await writeReceipt(receipt);
  console.error(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), fatal: receipt.fatal }, null, 2));
  process.exitCode = 1;
});
