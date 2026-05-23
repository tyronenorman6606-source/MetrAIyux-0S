#!/usr/bin/env node

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, '..');
const parent = path.dirname(mcpRoot);
const repoRoot = path.basename(parent) === 'mcp_design_reference'
  ? path.resolve(mcpRoot, '..', '..')
  : path.resolve(mcpRoot, '..');

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth(baseUrl, output) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return await response.json();
    } catch {
      // Keep waiting; the child process may still be binding the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for HTTP MCP health. Child output:\n${output()}`);
}

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
let childOutput = '';
const child = spawn(process.execPath, [path.join(mcpRoot, 'http-server.mjs')], {
  cwd: mcpRoot,
  env: {
    ...process.env,
    REPO_ROOT: repoRoot,
    MCP_HTTP_HOST: '127.0.0.1',
    MCP_HTTP_PORT: String(port)
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', (chunk) => {
  childOutput += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  childOutput += chunk.toString();
});

let client;
try {
  const health = await waitForHealth(baseUrl, () => childOutput);
  assert.equal(health.ok, true, 'health check did not return ok');
  assert.equal(health.transport, 'streamable-http', 'health check did not expose streamable HTTP');

  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
  client = new Client({
    name: 'quantumskyes-http-smoke',
    version: '0.1.0'
  });
  await client.connect(transport);

  const resources = await client.listResources();
  const resourceUris = resources.resources.map((resource) => resource.uri);
  assert(resourceUris.includes('quantumskyes://workspace/overview'), 'workspace overview resource missing over HTTP');
  assert(resourceUris.includes('quantumskyes://design/open-source-stack'), 'open-source stack resource missing over HTTP');
  assert(resourceUris.includes('quantumskyes://production/ledger'), 'production ledger resource missing over HTTP');

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  assert(toolNames.includes('design_pattern_pack'), 'design_pattern_pack missing over HTTP');
  assert(toolNames.includes('design_quality_gate'), 'design_quality_gate missing over HTTP');
  assert(toolNames.includes('production_ledger'), 'production_ledger missing over HTTP');

  const qualityGate = await client.callTool({
    name: 'design_quality_gate',
    arguments: {
      surface: 'QuantumSkyes remote MCP smoke'
    }
  });
  const qualityGateText = qualityGate.content.map((item) => item.text || '').join('\n');
  assert(qualityGateText.includes('1440x1000'), 'quality gate should return browser QA requirements');

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    endpoint: `${baseUrl}/mcp`,
    resources: resourceUris.length,
    tools: toolNames.length
  }, null, 2));
} finally {
  if (client) await client.close().catch(() => {});
  child.kill('SIGTERM');
}
