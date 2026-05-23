#!/usr/bin/env node

import assert from 'node:assert';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, '..');
const workerPath = path.join(mcpRoot, 'skye-design-lab', 'dist', '_worker.js');
const worker = await import(`${pathToFileURL(workerPath).href}?v=${Date.now()}`);

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

function toWebRequest(req, port) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Readable.toWeb(req);
    init.duplex = 'half';
  }
  return new Request(`http://127.0.0.1:${port}${req.url || '/'}`, init);
}

async function pipeWebResponse(webResponse, res) {
  res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
  if (!webResponse.body) {
    res.end();
    return;
  }
  Readable.fromWeb(webResponse.body).pipe(res);
}

const port = await getFreePort();
const waitUntilTasks = [];
const testToken = 'quantumskyes-worker-smoke-token';
const env = {
  MCP_HTTP_BEARER_TOKEN: testToken,
  ASSETS: {
    fetch: async () => new Response('asset-ok', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
};
const ctx = {
  waitUntil(task) {
    waitUntilTasks.push(Promise.resolve(task));
  }
};

const server = createServer(async (req, res) => {
  try {
    const response = await worker.default.fetch(toWebRequest(req, port), env, ctx);
    await pipeWebResponse(response, res);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(error instanceof Error ? error.stack : String(error));
  }
});

await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

let client;
try {
  const baseUrl = `http://127.0.0.1:${port}`;
  const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
  assert.equal(health.ok, true, 'Pages worker health did not return ok');
  assert.equal(health.endpoint, '/mcp', 'Pages worker health did not expose /mcp');
  assert.equal(health.sameDomain, true, 'Pages worker health did not mark same-domain deployment');
  assert.equal(health.gateOwned, true, 'Pages worker health did not mark the MCP gate-owned');
  assert.equal(health.emailRequired, true, 'Pages worker health did not mark email as required');
  assert.equal(health.auth, 'gate-bearer', 'Pages worker health did not report bearer-gated mode');

  const blocked = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'unauthenticated-smoke', version: '0.1.0' }
      }
    })
  });
  assert.equal(blocked.status, 401, 'Pages worker allowed unauthenticated MCP access');
  const blockedPayload = await blocked.json();
  assert.equal(blockedPayload.error?.data?.emailRequired, true, 'Gate response did not advertise required email capture');
  assert(blockedPayload.error?.data?.gateUrl, 'Gate response did not include the signup gate URL');

  client = new Client({
    name: 'quantumskyes-pages-worker-smoke',
    version: '0.1.0'
  });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${testToken}`
      }
    }
  }));
  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  assert(toolNames.includes('design_quality_gate'), 'Pages worker MCP missing design_quality_gate');
  assert(toolNames.includes('design_pattern_pack'), 'Pages worker MCP missing design_pattern_pack');

  const resources = await client.listResources();
  const resourceUris = resources.resources.map((resource) => resource.uri);
  assert(resourceUris.includes('quantumskyes://design/index'), 'Pages worker MCP missing design index');
  assert(resourceUris.includes('quantumskyes://production/ledger'), 'Pages worker MCP missing production ledger');

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    unauthenticatedBlocked: true,
    auth: health.auth,
    resources: resourceUris.length,
    tools: toolNames.length
  }, null, 2));
} finally {
  if (client) await client.close().catch(() => {});
  await Promise.allSettled(waitUntilTasks);
  await new Promise((resolve) => server.close(resolve));
}
