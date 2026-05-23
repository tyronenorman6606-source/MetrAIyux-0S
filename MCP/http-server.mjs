#!/usr/bin/env node

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createQuantumSkyesMcpServer } from './stdio-server.mjs';

const host = process.env.MCP_HTTP_HOST || process.env.HOST || '127.0.0.1';
const port = Number(process.env.MCP_HTTP_PORT || process.env.PORT || 8787);
const mcpPath = process.env.MCP_HTTP_PATH || '/mcp';
const bearerToken = process.env.MCP_HTTP_BEARER_TOKEN || '';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.MCP_HTTP_ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, last-event-id, mcp-protocol-version, mcp-session-id',
    'Access-Control-Expose-Headers': 'mcp-protocol-version, mcp-session-id',
    'Vary': 'Origin'
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    ...corsHeaders(),
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(body, null, 2));
}

function hasAccess(req) {
  if (!bearerToken) return true;
  return req.headers.authorization === `Bearer ${bearerToken}`;
}

function toWebRequest(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const hostHeader = req.headers.host || `${host}:${port}`;
  const url = new URL(req.url || '/', `${protocol}://${hostHeader}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const init = {
    method: req.method,
    headers
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Readable.toWeb(req);
    init.duplex = 'half';
  }

  return new Request(url, init);
}

async function pipeWebResponse(webResponse, res) {
  res.writeHead(webResponse.status, {
    ...Object.fromEntries(webResponse.headers.entries()),
    ...corsHeaders()
  });

  if (!webResponse.body) {
    res.end();
    return;
  }

  Readable.fromWeb(webResponse.body).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      name: 'quantumskyes-design-mcp',
      transport: 'streamable-http',
      endpoint: mcpPath,
      auth: bearerToken ? 'bearer' : 'development-open'
    });
    return;
  }

  if (url.pathname !== mcpPath) {
    sendJson(res, 404, {
      ok: false,
      message: `Use ${mcpPath} for MCP or /health for status.`
    });
    return;
  }

  if (!hasAccess(req)) {
    res.writeHead(401, {
      ...corsHeaders(),
      'WWW-Authenticate': 'Bearer realm="quantumskyes-mcp"',
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized'
      },
      id: null
    }));
    return;
  }

  const mcpServer = createQuantumSkyesMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: process.env.MCP_HTTP_JSON_RESPONSE === '1'
  });

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await transport.close().catch(() => {});
    await mcpServer.close().catch(() => {});
  };

  try {
    await mcpServer.connect(transport);
    const webResponse = await transport.handleRequest(toWebRequest(req));
    res.once('finish', close);
    res.once('close', close);
    await pipeWebResponse(webResponse, res);
  } catch (error) {
    await close();
    if (!res.headersSent) {
      sendJson(res, 500, {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal server error'
        },
        id: null
      });
    } else {
      res.destroy(error);
    }
  }
});

server.listen(port, host, () => {
  console.error(`QuantumSkyes MCP HTTP server listening on http://${host}:${port}${mcpPath}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
