#!/usr/bin/env node

import assert from 'node:assert';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = process.env.QUANTUMSKYES_MCP_URL || 'https://skye-design-mcp.pages.dev/mcp';
const token = process.env.QUANTUMSKYES_MCP_TOKEN || process.env.MCP_HTTP_BEARER_TOKEN || '';
const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
const endpointUrl = new URL(endpoint);
const healthUrl = new URL('/health', endpointUrl.origin);

const health = await fetch(healthUrl).then(async (response) => {
  assert.equal(response.status, 200, 'remote health did not return 200');
  return response.json();
});

assert.equal(health.ok, true, 'remote health did not return ok');
assert.equal(health.endpoint, '/mcp', 'remote health did not expose /mcp');
assert.equal(health.sameDomain, true, 'remote health did not mark same-domain deployment');
assert.notEqual(health.auth, 'public-read', 'remote MCP is still public-read');
assert.equal(health.gateOwned, true, 'remote MCP is not marked gate-owned');
assert.equal(health.emailRequired, true, 'remote MCP is not marked email-required');
assert(health.gateUrl, 'remote health did not include the gate URL');
assert(health.accessUrl, 'remote health did not include the access documentation URL');

const blocked = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'quantumskyes-remote-production-smoke-unauthenticated', version: '0.1.0' }
    }
  })
});
assert.equal(blocked.status, 401, 'remote MCP allowed unauthenticated access');
const blockedPayload = await blocked.json();
assert.equal(blockedPayload.error?.data?.emailRequired, true, 'remote gate response did not require email capture');
assert(blockedPayload.error?.data?.gateUrl, 'remote gate response did not include the gate URL');

if (!token) {
  console.log(JSON.stringify({
    ok: true,
    endpoint,
    healthUrl: healthUrl.toString(),
    auth: health.auth,
    gateOwned: true,
    emailRequired: true,
    unauthenticatedBlocked: true,
    tokenClientChecked: false
  }, null, 2));
  process.exit(0);
}

const client = new Client({
  name: 'quantumskyes-remote-production-smoke',
  version: '0.1.0'
});

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers }
  }));
  const resources = await client.listResources();
  const tools = await client.listTools();
  const resourceUris = resources.resources.map((resource) => resource.uri);
  const toolNames = tools.tools.map((tool) => tool.name);

  assert(resourceUris.includes('quantumskyes://design/index'), 'remote MCP missing design index');
  assert(resourceUris.includes('quantumskyes://production/ledger'), 'remote MCP missing production ledger');
  assert(toolNames.includes('design_quality_gate'), 'remote MCP missing design_quality_gate');
  assert(toolNames.includes('design_pattern_pack'), 'remote MCP missing design_pattern_pack');
  console.log(JSON.stringify({
    ok: true,
    endpoint,
    healthUrl: healthUrl.toString(),
    resources: resourceUris.length,
    tools: toolNames.length,
    auth: health.auth,
    gateOwned: true,
    emailRequired: true,
    unauthenticatedBlocked: true,
    tokenClientChecked: true
  }, null, 2));
} finally {
  await client.close().catch(() => {});
}
