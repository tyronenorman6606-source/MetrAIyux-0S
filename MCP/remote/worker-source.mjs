import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createQuantumSkyesMcpServer } from '../stdio-server.mjs';

const MCP_PATH = '/mcp';
const ACCESS_DOC_PATH = '/use-mcp.html';
const WORKSPACE_ID = 'quantumskyes-mcp';
const DEFAULT_GATE_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html';
const DEFAULT_GATE_INTROSPECT_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.MCP_HTTP_ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, last-event-id, mcp-protocol-version, mcp-session-id',
    'Access-Control-Expose-Headers': 'mcp-protocol-version, mcp-session-id',
    Vary: 'Origin'
  };
}

function withCors(response, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(env))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(body, status = 200, env = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders(env),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function accessDocUrl(request, env) {
  if (env.MCP_ACCESS_DOC_URL) return env.MCP_ACCESS_DOC_URL;
  const url = new URL(request.url);
  return `${url.origin}${ACCESS_DOC_PATH}`;
}

function gateUrl(request, env) {
  const url = new URL(env.MCP_GATE_URL || DEFAULT_GATE_URL);
  if (!url.searchParams.has('workspace')) url.searchParams.set('workspace', WORKSPACE_ID);
  if (!url.searchParams.has('source')) url.searchParams.set('source', 'skye-design-mcp');
  if (!url.searchParams.has('return')) url.searchParams.set('return', accessDocUrl(request, env));
  return url.toString();
}

function authMode(env) {
  if (env.MCP_PUBLIC_READONLY === '1') return 'public-read';
  if (env.MCP_HTTP_BEARER_TOKEN) return 'gate-bearer';
  return 'gate-introspection';
}

function bearerToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

async function introspectGateToken(token, env) {
  const endpoint = env.MCP_GATE_INTROSPECT_URL || DEFAULT_GATE_INTROSPECT_URL;
  if (!endpoint || env.MCP_GATE_INTROSPECT_DISABLED === '1') return false;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ token: `Bearer ${token}` })
    });
    if (!response.ok) return false;
    const payload = await response.json();
    const email = payload.email || payload.gate_card?.email || (String(payload.username || '').includes('@') ? payload.username : '');
    const allowedRole = ['admin', 'owner', 'deployer', 'user'].includes(String(payload.role || '').toLowerCase());
    return Boolean(payload.active && (email || allowedRole));
  } catch {
    return false;
  }
}

async function authorized(request, env) {
  if (env.MCP_PUBLIC_READONLY === '1') return true;
  const token = bearerToken(request);
  if (!token) return false;
  if (env.MCP_HTTP_BEARER_TOKEN && token === env.MCP_HTTP_BEARER_TOKEN) return true;
  return introspectGateToken(token, env);
}

function unauthorizedResponse(request, env) {
  const accept = request.headers.get('accept') || '';
  const shouldRedirect = request.method === 'GET'
    && !accept.includes('text/event-stream')
    && !request.headers.has('mcp-protocol-version');

  if (shouldRedirect) {
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders(env),
        Location: gateUrl(request, env),
        'Cache-Control': 'no-store'
      }
    });
  }

  const response = json({
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message: 'Gate access required',
      data: {
        workspace: WORKSPACE_ID,
        emailRequired: true,
        gateOwned: true,
        gateUrl: gateUrl(request, env),
        accessUrl: accessDocUrl(request, env),
        acceptedBearer: [
          '0S or FS27 gate session token',
          'NorthStar access/session token',
          'owner-issued MCP bearer token'
        ]
      }
    },
    id: null
  }, 401, env);
  response.headers.set('WWW-Authenticate', `Bearer realm="${WORKSPACE_ID}", error="gate_required"`);
  response.headers.set('Location', gateUrl(request, env));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

async function handleMcp(request, env, ctx) {
  if (!(await authorized(request, env))) {
    return unauthorizedResponse(request, env);
  }

  const server = createQuantumSkyesMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    ctx.waitUntil(Promise.allSettled([transport.close(), server.close()]));
    return withCors(response, env);
  } catch (error) {
    ctx.waitUntil(Promise.allSettled([transport.close(), server.close()]));
    return json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      id: null
    }, 500, env);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env)
      });
    }

    if (url.pathname === '/health' || url.pathname === '/mcp/health') {
      return json({
        ok: true,
        name: 'quantumskyes-design-mcp',
        domain: url.hostname,
        surface: '/',
        endpoint: MCP_PATH,
        transport: 'streamable-http',
        sameDomain: true,
        auth: authMode(env),
        gateOwned: env.MCP_PUBLIC_READONLY !== '1',
        emailRequired: env.MCP_PUBLIC_READONLY !== '1',
        workspace: WORKSPACE_ID,
        gateUrl: gateUrl(request, env),
        accessUrl: accessDocUrl(request, env),
        gateIntrospectionUrl: env.MCP_GATE_INTROSPECT_URL || DEFAULT_GATE_INTROSPECT_URL
      }, 200, env);
    }

    if (url.pathname === MCP_PATH) {
      return handleMcp(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};
