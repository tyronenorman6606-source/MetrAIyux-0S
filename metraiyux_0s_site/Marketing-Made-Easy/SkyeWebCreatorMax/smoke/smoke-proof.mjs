#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STORE_PATH = path.join(ROOT, 'runtime', 'store.json');
const PORT = 4396;
const BASE = `http://127.0.0.1:${PORT}`;

function resetStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify({
    runtimeBoundary: {
      source: 'local-smoke-proof',
      liveTelemetry: false,
      liveCustomerVisibility: false,
      workerConfirmed: false,
      workerRuntimeEndpoint: '/api/marketing-made-easy/webcreator-runtime',
      note: 'Local smoke proof only; shared-gated 0S Worker confirmation is required before customer-visible delivery claims.',
    },
    deliveryPacks: [],
    audit: [],
  }, null, 2));
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('runtime did not become healthy');
}

resetStore();

const child = spawn('node', [path.join(ROOT, 'runtime', 'local-runtime.mjs')], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stderr = '';
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitForHealth();

  const createResponse = await fetch(`${BASE}/api/runtime/delivery-packs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      projectId: 'proof-webcreator-runtime',
      projectName: 'Runtime Proof Website',
      label: 'Founder rollout handoff',
      target: 'ae-commandhub',
      notes: 'Local smoke package; needs shared-gated Worker confirmation before AE/customer-visible use.',
      sourceSnapshot: {
        'index.html': '<main>contact proof gate</main>',
        'styles.css': 'body { color: white; }',
        'app.js': 'console.log("proof");',
        'README.md': '# Proof',
      },
      review: {
      owner: 'ae-operator',
      status: 'ready',
      checkpoint: 'ready for packaging',
      notes: 'Local smoke package; needs shared-gated Worker confirmation before AE/customer-visible use.',
    },
    }),
  }).then((response) => response.json());
  const packId = createResponse.item?.id;
  const reviewResponse = await fetch(`${BASE}/api/runtime/delivery-packs/${packId}/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      owner: 'ae-operator',
      status: 'approved',
      checkpoint: 'local review proof only',
      notes: 'Approved in the local review board only; awaiting shared-gated Worker confirmation.',
    }),
  }).then((response) => response.json());
  const executionResponse = await fetch(`${BASE}/api/runtime/delivery-packs/${packId}/execution`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      owner: 'delivery-operator',
      status: 'active',
      checkpoint: 'local execution proof only',
      notes: 'Local execution proof only; downstream launch handling is pending shared-gated Worker confirmation.',
      targets: ['AE-FlowPro', 'SkyeProofx'],
    }),
  }).then((response) => response.json());
  const dispatchResponse = await fetch(`${BASE}/api/runtime/delivery-packs/${packId}/dispatch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      owner: 'dispatch-operator',
      status: 'delivered',
      checkpoint: 'local dispatch proof only',
      notes: 'Local dispatch proof only; not delivered to a customer-visible Worker lane.',
      targets: ['AE-FlowPro', 'SkyeProofx'],
    }),
  }).then((response) => response.json());

  const status = await fetch(`${BASE}/api/runtime/status`).then((response) => response.json());
  const board = await fetch(`${BASE}/api/runtime/delivery-board`).then((response) => response.json());
  const executionBoard = await fetch(`${BASE}/api/runtime/execution-board`).then((response) => response.json());
  const dispatchBoard = await fetch(`${BASE}/api/runtime/dispatch-board`).then((response) => response.json());
  const workflowTimeline = await fetch(`${BASE}/api/runtime/workflow-timeline`).then((response) => response.json());
  const packs = await fetch(`${BASE}/api/runtime/delivery-packs`).then((response) => response.json());
  const detail = await fetch(`${BASE}/api/runtime/delivery-packs/${packId}`).then((response) => response.json());
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const runtimeJs = fs.readFileSync(path.join(ROOT, 'js', 'webcreator.js'), 'utf8');
  const first = packs.items?.[0];

  const passed = createResponse.ok === true
    && reviewResponse.ok === true
    && executionResponse.ok === true
    && dispatchResponse.ok === true
    && status.deliveryPacks >= 1
    && board.summary.dispatched >= 1
    && status.executionBoard.fulfilled >= 1
    && executionBoard.summary.fulfilled >= 1
    && status.dispatchBoard.delivered >= 1
    && dispatchBoard.summary.delivered >= 1
    && status.workflowTimeline.dispatch >= 1
    && workflowTimeline.workflowTimeline?.summary?.dispatch >= 1
    && first?.label === 'Founder rollout handoff'
    && first?.review?.owner === 'ae-operator'
    && first?.review?.status === 'dispatched'
    && first?.execution?.owner === 'delivery-operator'
    && first?.execution?.status === 'fulfilled'
    && first?.dispatch?.owner === 'dispatch-operator'
    && first?.dispatch?.status === 'delivered'
    && Array.isArray(first?.targets) && first.targets.length >= 1
    && detail.item?.workerConfirmed === false
    && detail.item?.customerVisible === false
    && detail.item?.review?.checkpoint === 'local review proof only'
    && detail.item?.review?.workerConfirmed === false
    && detail.item?.execution?.checkpoint === 'local execution proof only'
    && detail.item?.execution?.workerConfirmed === false
    && detail.item?.dispatch?.checkpoint === 'local dispatch proof only'
    && detail.item?.dispatch?.customerVisible === false
    && store.runtimeBoundary?.liveTelemetry === false
    && store.deliveryPacks.length >= 1
    && store.audit.some((entry) => entry.type === 'delivery_pack_created')
    && store.audit.some((entry) => entry.type === 'delivery_pack_reviewed')
    && store.audit.some((entry) => entry.type === 'delivery_pack_execution_updated')
    && store.audit.some((entry) => entry.type === 'delivery_pack_dispatched')
    && index.includes('id="runtimeState"')
    && index.includes('id="advanceLatestDelivery"')
    && index.includes('id="queueLatestExecution"')
    && index.includes('id="dispatchLatestDelivery"')
    && index.includes('id="executionCounts"')
    && index.includes('id="dispatchCounts"')
    && index.includes('id="workflowCounts"')
    && runtimeJs.includes('/api/runtime/delivery-packs')
    && runtimeJs.includes('refreshRuntimeBoard')
    && runtimeJs.includes('advanceLatestDelivery')
    && runtimeJs.includes('/api/runtime/delivery-packs/${latest.id}/execution')
    && runtimeJs.includes('/api/runtime/delivery-packs/${latest.id}/dispatch')
    && runtimeJs.includes('renderExecutionSummary')
    && runtimeJs.includes('renderDispatchSummary')
    && runtimeJs.includes('renderWorkflowSummary');

  console.log(JSON.stringify({
    passed,
    status,
    boardSummary: board.summary,
    executionSummary: executionBoard.summary,
    dispatchSummary: dispatchBoard.summary,
    workflowSummary: workflowTimeline.workflowTimeline?.summary,
    firstPack: first,
    detail: detail.item,
    uiWiring: {
      hasRuntimeState: index.includes('id="runtimeState"'),
      hasAdvanceButton: index.includes('id="advanceLatestDelivery"'),
      hasExecutionButton: index.includes('id="queueLatestExecution"'),
      hasDispatchButton: index.includes('id="dispatchLatestDelivery"'),
      hasExecutionCounts: index.includes('id="executionCounts"'),
      hasDispatchCounts: index.includes('id="dispatchCounts"'),
      hasWorkflowCounts: index.includes('id="workflowCounts"'),
      runtimePostsDeliveryPacks: runtimeJs.includes('/api/runtime/delivery-packs'),
      runtimeQueuesExecution: runtimeJs.includes('/api/runtime/delivery-packs/${latest.id}/execution'),
      runtimeDispatches: runtimeJs.includes('/api/runtime/delivery-packs/${latest.id}/dispatch'),
    },
    auditEvents: store.audit.map((entry) => entry.type),
  }, null, 2));
  if (!passed) process.exit(1);
} finally {
  child.kill('SIGTERM');
}
