#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleClientAppFactoryGeneratedRoute, handleClientAppFactoryRoute } from "../../metraiyux_0s_site/cloudflare/client-app-factory-adapter.mjs";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "../..");
const siteRoot = path.join(repoRoot, "metraiyux_0s_site");
const port = Number(process.env.PORT || process.argv[2] || 4319);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

class MemoryKv {
  constructor() {
    this.store = new Map();
  }

  async get(key, options = {}) {
    if (!this.store.has(key)) return null;
    const value = this.store.get(key);
    if (options.type === "json") return JSON.parse(value);
    return value;
  }

  async put(key, value) {
    this.store.set(key, String(value));
  }

  async list({ limit = 100 } = {}) {
    return {
      keys: [...this.store.keys()].slice(0, limit).map((name) => ({ name }))
    };
  }
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleanPath = decoded === "/" ? "/index.html" : decoded;
  const target = path.resolve(siteRoot, `.${cleanPath}`);
  if (target !== siteRoot && !target.startsWith(`${siteRoot}${path.sep}`)) {
    throw new Error("Static path escaped site root.");
  }
  return target;
}

async function assetFetch(request) {
  const url = new URL(request.url);
  let filePath = safeStaticPath(url.pathname);
  let fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    fileStat = await stat(filePath).catch(() => null);
  }
  if (!fileStat?.isFile()) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const ext = path.extname(filePath).toLowerCase();
  const body = await readFile(filePath);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=60"
    }
  });
}

async function serveStatic(req, res) {
  let filePath = safeStaticPath(req.url || "/");
  let fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    fileStat = await stat(filePath).catch(() => null);
  }
  if (!fileStat?.isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": mimeTypes[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-store" : "public, max-age=60"
  });
  createReadStream(filePath).pipe(res);
}

async function toRequest(req) {
  const url = `http://${req.headers.host || "127.0.0.1"}${req.url || "/"}`;
  const body = ["GET", "HEAD"].includes(req.method || "GET") ? undefined : req;
  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body,
    duplex: body ? "half" : undefined
  });
}

async function sendResponse(res, response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length") return;
    headers[key] = value;
  });
  const body = Buffer.from(await response.arrayBuffer());
  res.writeHead(response.status, headers);
  res.end(body);
}

const memoryKv = new MemoryKv();
const env = {
  SITE_EVENTS_KV: memoryKv,
  ASSETS: { fetch: assetFetch }
};

const server = createServer(async (req, res) => {
  try {
    const request = await toRequest(req);
    const url = new URL(request.url);

    if (url.pathname === "/__adapter-health") {
      const health = await handleClientAppFactoryRoute(new Request(`${url.origin}/api/client-app-factory/health`), env, new URL(`${url.origin}/api/client-app-factory/health`));
      await sendResponse(res, health);
      return;
    }

    const generated = await handleClientAppFactoryGeneratedRoute(request, env, url);
    if (generated) {
      await sendResponse(res, generated);
      return;
    }

    const api = await handleClientAppFactoryRoute(request, env, url);
    if (api) {
      await sendResponse(res, api);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end(error?.stack || error?.message || String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`0S Client App Factory adapter server live at http://127.0.0.1:${port}/client-app-factory/`);
});
