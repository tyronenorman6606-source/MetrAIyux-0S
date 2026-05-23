#!/usr/bin/env node
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcp4SourceWorldServer, MCP4_NAME, MERSER_DISPLAY_NAME } from "./mcp4-core.mjs";

const host = process.env.MCP_HTTP_HOST || process.env.HOST || "127.0.0.1";
const port = Number(process.env.MCP_HTTP_PORT || process.env.PORT || 8789);
const mcpPath = process.env.MCP_HTTP_PATH || "/mcp";
const bearerToken = process.env.MCP_HTTP_BEARER_TOKEN || "";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.MCP_HTTP_ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, last-event-id, mcp-protocol-version, mcp-session-id",
    "Access-Control-Expose-Headers": "mcp-protocol-version, mcp-session-id",
    Vary: "Origin",
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function hasAccess(req) {
  if (!bearerToken) return true;
  return req.headers.authorization === `Bearer ${bearerToken}`;
}

function toWebRequest(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const requestHost = req.headers.host || `${host}:${port}`;
  const url = new URL(req.url || "/", `${proto}://${requestHost}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  return new Request(url, init);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${host}:${port}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      name: MCP4_NAME,
      displayName: MERSER_DISPLAY_NAME,
      endpoint: mcpPath,
      transport: "streamable-http",
      auth: bearerToken ? "bearer" : "public-local",
      docs: `http://${host}:${port}/`,
    });
    return;
  }

  if (url.pathname === mcpPath) {
    if (!hasAccess(req)) {
      sendJson(res, 401, { error: "Unauthorized", message: "Bearer token required." });
      return;
    }
    const mcpServer = createMcp4SourceWorldServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await mcpServer.connect(transport);
      const webReq = toWebRequest(req);
      const webRes = await transport.handleRequest(webReq);
      res.writeHead(webRes.status, { ...corsHeaders(), ...Object.fromEntries(webRes.headers) });
      const buffer = await webRes.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : "Internal server error" });
    } finally {
      await Promise.allSettled([transport.close(), mcpServer.close()]);
    }
    return;
  }

  sendJson(res, 404, { error: "Not found", endpoints: [mcpPath, "/health"] });
});

server.listen(port, host, () => {
  process.stderr.write(`${MERSER_DISPLAY_NAME} HTTP server listening at http://${host}:${port}${mcpPath}\n`);
});
