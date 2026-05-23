import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcp4SourceWorldServer, MCP4_NAME, MERSER_DISPLAY_NAME } from "../mcp4-core.mjs";

const MCP_PATH = "/mcp";
const WORKSPACE_ID = "merser";
const DEFAULT_GATE_URL = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/index.html";
const DEFAULT_INTROSPECT = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skygate/auth-introspect";

function corsHeaders(env = {}) {
  return {
    "Access-Control-Allow-Origin": env.MCP_HTTP_ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, last-event-id, mcp-protocol-version, mcp-session-id",
    "Access-Control-Expose-Headers": "mcp-protocol-version, mcp-session-id",
    Vary: "Origin",
  };
}

function withCors(response, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(env))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(body, status = 200, env = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders(env), "Content-Type": "application/json; charset=utf-8" },
  });
}

function bearerToken(req) {
  const match = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function gateUrl(env) {
  const url = new URL(env.MCP_GATE_URL || DEFAULT_GATE_URL);
  if (!url.searchParams.has("workspace")) url.searchParams.set("workspace", WORKSPACE_ID);
  if (!url.searchParams.has("source")) url.searchParams.set("source", "merser");
  return url.toString();
}

async function introspect(token, env) {
  const endpoint = env.MCP_GATE_INTROSPECT_URL || DEFAULT_INTROSPECT;
  if (env.MCP_GATE_INTROSPECT_DISABLED === "1") return false;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token: `Bearer ${token}` }),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return Boolean(payload.active && (payload.email || ["admin", "owner", "deployer", "user"].includes(String(payload.role || "").toLowerCase())));
  } catch {
    return false;
  }
}

async function authorized(req, env) {
  if (env.MCP_PUBLIC_READONLY === "1") return true;
  const token = bearerToken(req);
  if (!token) return false;
  if (env.MCP_HTTP_BEARER_TOKEN && token === env.MCP_HTTP_BEARER_TOKEN) return true;
  return introspect(token, env);
}

function unauthorizedResponse(req, env) {
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders(env), Location: gateUrl(env), "Cache-Control": "no-store" },
    });
  }
  const response = json({
    jsonrpc: "2.0",
    error: {
      code: -32001,
      message: "Gate access required",
      data: { workspace: WORKSPACE_ID, gateUrl: gateUrl(env) },
    },
    id: null,
  }, 401, env);
  response.headers.set("WWW-Authenticate", `Bearer realm="${WORKSPACE_ID}", error="gate_required"`);
  response.headers.set("Location", gateUrl(env));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function handleMcp(req, env, ctx) {
  if (!(await authorized(req, env))) return unauthorizedResponse(req, env);
  const server = createMcp4SourceWorldServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(req);
    ctx.waitUntil(Promise.allSettled([transport.close(), server.close()]));
    return withCors(response, env);
  } catch (error) {
    ctx.waitUntil(Promise.allSettled([transport.close(), server.close()]));
    return json({
      jsonrpc: "2.0",
      error: { code: -32603, message: error instanceof Error ? error.message : "Internal server error" },
      id: null,
    }, 500, env);
  }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });

    if (url.pathname === "/health" || url.pathname === "/mcp/health") {
      return json({
        ok: true,
        name: MCP4_NAME,
        displayName: MERSER_DISPLAY_NAME,
        domain: url.hostname,
        endpoint: MCP_PATH,
        transport: "streamable-http",
        auth: env.MCP_PUBLIC_READONLY === "1" ? "public-readonly" : "gate",
        workspace: WORKSPACE_ID,
        gateUrl: gateUrl(env),
      }, 200, env);
    }

    if (url.pathname === MCP_PATH) return handleMcp(req, env, ctx);

    return env.ASSETS.fetch(req);
  },
};
