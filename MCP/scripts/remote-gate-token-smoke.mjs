#!/usr/bin/env node

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const endpoint = process.env.QUANTUMSKYES_MCP_URL || 'https://skye-design-mcp.pages.dev/mcp';
const fs27Origin = process.env.FS27_GATE_ORIGIN || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
const gateIntrospectionUrl = process.env.MCP_GATE_INTROSPECT_URL
  || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect';
const tokenFromEnv = process.env.QUANTUMSKYES_MCP_TOKEN
  || process.env.MCP_GATE_SESSION
  || process.env.NORTHSTAR_SESSION_TOKEN
  || process.env.MCP_HTTP_BEARER_TOKEN
  || '';
const allowLiveSignup = process.env.MCP_LIVE_SIGNUP_SMOKE === '1';
const runnerTarget = process.env.MCP_RUNNER_TARGET || '';
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skye-design-mcp-gate-owned-live');
const timestampSlug = new Date().toISOString().replace(/[:.]/g, '-');
const latestArtifact = path.join(artifactDir, 'remote-gate-token-smoke.json');
const timestampArtifact = path.join(artifactDir, `remote-gate-token-smoke-${timestampSlug}.json`);

function redactedText(value, token) {
  return String(value || '').replaceAll(token || '___no_token___', '[redacted-token]');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return { response, payload };
}

async function createSyntheticGateSession() {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `quantumskyes-mcp-smoke-${stamp}@example.com`;
  const password = `QuantumSkyes-MCP-${stamp}!`;
  const { response, payload } = await fetchJson(`${fs27Origin}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      display_name: 'QuantumSkyes MCP Smoke',
      plan_name: 'quantumskyes-mcp-free-gate',
      profile: {
        source_app: 'skye-design-mcp',
        workspace: 'quantumskyes-mcp',
        smoke: true
      }
    })
  });
  assert.equal(response.status, 200, `FS27 signup failed with HTTP ${response.status}`);
  const token = payload.session?.token || payload.token || payload.sessionToken || '';
  assert(token, 'FS27 signup did not return a session token');
  return {
    token,
    signup: {
      status: response.status,
      emailCaptured: email,
      customerId: String(payload.customer?.id || payload.user?.id || payload.customer_id || ''),
      sessionId: String(payload.session?.id || payload.session_id || ''),
      gateCardId: String(payload.gate_card?.id || payload.card?.gate_card?.id || ''),
      verificationRequired: Boolean(payload.verification_required ?? payload.verificationRequired ?? true)
    }
  };
}

async function introspectGateToken(token) {
  const { response, payload } = await fetchJson(gateIntrospectionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  return {
    url: gateIntrospectionUrl,
    status: response.status,
    active: Boolean(payload.active),
    email: payload.email || payload.user?.email || '',
    emailVerified: Boolean(payload.email_verified || payload.emailVerified),
    role: payload.role || payload.user?.role || '',
    sessionId: String(payload.session_id || payload.sessionId || payload.session?.id || ''),
    gateCardId: String(payload.gate_card_id || payload.gateCardId || payload.gate_card?.id || '')
  };
}

async function checkRemoteHealth() {
  const endpointUrl = new URL(endpoint);
  const healthUrl = new URL('/health', endpointUrl.origin);
  const { response, payload } = await fetchJson(healthUrl);
  assert.equal(response.status, 200, 'remote health did not return HTTP 200');
  assert.equal(payload.ok, true, 'remote health did not return ok:true');
  assert.equal(payload.gateOwned, true, 'remote health is not gate-owned');
  assert.equal(payload.emailRequired, true, 'remote health does not require email');
  return {
    url: healthUrl.toString(),
    auth: payload.auth,
    gateOwned: payload.gateOwned,
    emailRequired: payload.emailRequired,
    gateUrl: payload.gateUrl,
    accessUrl: payload.accessUrl
  };
}

async function checkUnauthenticatedBlocked() {
  const { response, payload } = await fetchJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'quantumskyes-remote-gate-token-smoke-unauthenticated', version: '0.1.0' }
      }
    })
  });
  assert.equal(response.status, 401, 'remote MCP allowed unauthenticated protocol access');
  assert.equal(payload.error?.data?.emailRequired, true, 'remote MCP unauth response did not require email');
  return {
    status: response.status,
    emailRequired: Boolean(payload.error?.data?.emailRequired),
    gateUrl: payload.error?.data?.gateUrl || ''
  };
}

async function checkMcpWithToken(token) {
  const client = new Client({
    name: 'quantumskyes-remote-gate-token-smoke',
    version: '0.1.0'
  });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }));
    const resources = await client.listResources();
    const tools = await client.listTools();
    const resourceUris = resources.resources.map((resource) => resource.uri);
    const toolNames = tools.tools.map((tool) => tool.name);
    assert(resourceUris.includes('quantumskyes://design/index'), 'remote MCP missing design index');
    assert(resourceUris.includes('quantumskyes://production/ledger'), 'remote MCP missing production ledger');
    assert(toolNames.includes('design_quality_gate'), 'remote MCP missing design_quality_gate');
    assert(toolNames.includes('design_pattern_pack'), 'remote MCP missing design_pattern_pack');
    return {
      endpoint,
      resources: resourceUris.length,
      tools: toolNames.length,
      hasDesignIndex: true,
      hasProductionLedger: true,
      hasQualityGate: true,
      hasPatternPack: true
    };
  } finally {
    await client.close().catch(() => {});
  }
}

function runRepoMcpRunner(token) {
  if (!runnerTarget) return null;
  const child = spawnSync(process.execPath, [path.join(repoRoot, 'tools', 'use-my-mcp.mjs'), runnerTarget], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MCP_APPLY: '0',
      MCP_TRANSPORT: 'remote',
      QUANTUMSKYES_MCP_TOKEN: token
    },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  let parsed = null;
  try {
    parsed = JSON.parse(child.stdout || '{}');
  } catch {
    parsed = null;
  }
  assert.equal(child.status, 0, `repo MCP runner failed: ${redactedText(child.stderr || child.stdout, token).slice(0, 800)}`);
  assert.equal(parsed?.ok, true, 'repo MCP runner did not return ok:true');
  return {
    target: runnerTarget,
    status: child.status,
    ok: true,
    siteReceiptPath: parsed.siteReceiptPath,
    artifactPath: parsed.artifactPath,
    resourceReadCount: parsed.resourceReadCount,
    listedToolCount: parsed.listedToolCount,
    toolCallCount: parsed.toolCallCount
  };
}

let token = tokenFromEnv;
let signup = null;
if (!token) {
  if (!allowLiveSignup) {
    throw new Error('Set QUANTUMSKYES_MCP_TOKEN/MCP_GATE_SESSION, or run with MCP_LIVE_SIGNUP_SMOKE=1 to create a synthetic gate-owned proof session.');
  }
  const created = await createSyntheticGateSession();
  token = created.token;
  signup = created.signup;
}

const [health, unauthenticated] = await Promise.all([
  checkRemoteHealth(),
  checkUnauthenticatedBlocked()
]);
const introspection = await introspectGateToken(token);
if (signup) {
  assert.equal(introspection.status, 200, 'synthetic gate token did not introspect with HTTP 200');
  assert.equal(introspection.active, true, 'synthetic gate token is not active');
  assert.equal(introspection.email, signup.emailCaptured, 'introspection did not preserve the captured signup email');
}
const mcp = await checkMcpWithToken(token);
const repoRunner = runRepoMcpRunner(token);

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  endpoint,
  health,
  unauthenticated,
  tokenSource: signup ? 'synthetic-fs27-gate-signup' : 'provided-environment-token',
  signup,
  introspection,
  mcp,
  repoRunner,
  tokenRedacted: true
};

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(latestArtifact, JSON.stringify(report, null, 2));
fs.writeFileSync(timestampArtifact, JSON.stringify(report, null, 2));
if (signup) {
  fs.writeFileSync(path.join(artifactDir, 'live-gate-token-mcp-proof.json'), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({
  ok: true,
  endpoint,
  tokenSource: report.tokenSource,
  emailCaptured: signup?.emailCaptured || introspection.email || null,
  introspectionActive: introspection.active,
  resources: mcp.resources,
  tools: mcp.tools,
  repoRunner,
  latestArtifact,
  timestampArtifact,
  tokenRedacted: true
}, null, 2));
