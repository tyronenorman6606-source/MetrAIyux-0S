#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "../..");
const siteRoot = path.join(repoRoot, "metraiyux_0s_site");
const port = Number(process.env.PORT || process.argv[2] || 4319);
const backendOrigin = (process.env.CLIENT_APP_FACTORY_BACKEND || process.argv[3] || "http://127.0.0.1:4199").replace(/\/+$/, "");
const apiBase = "/api/client-app-factory";

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
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function sendText(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  res.end(body);
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

async function serveStatic(req, res) {
  let filePath = safeStaticPath(req.url || "/");
  let fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    fileStat = await stat(filePath).catch(() => null);
  }
  if (!fileStat || !fileStat.isFile()) {
    sendText(res, 404, "Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "content-type": mimeTypes[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-store" : "public, max-age=60"
  });
  createReadStream(filePath).pipe(res);
}

async function proxyFactoryApi(req, res, url) {
  const suffix = url.pathname === apiBase ? "" : url.pathname.slice(apiBase.length);
  const target = new URL(`${backendOrigin}/api${suffix || ""}${url.search}`);
  const upstream = await fetch(target, {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
    duplex: req.method === "GET" || req.method === "HEAD" ? undefined : "half"
  });
  const buffer = Buffer.from(await upstream.arrayBuffer());
  const headers = {};
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length") return;
    headers[key] = value;
  });
  res.writeHead(upstream.status, headers);
  res.end(buffer);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname === "/__mounted-health") {
      const backend = await fetch(`${backendOrigin}/api/health`).then((r) => r.json()).catch(() => null);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(`${JSON.stringify({ ok: true, siteRoot, backendOrigin, backend }, null, 2)}\n`);
      return;
    }
    if (url.pathname === apiBase || url.pathname.startsWith(`${apiBase}/`)) {
      await proxyFactoryApi(req, res, url);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendText(res, 500, error?.stack || error?.message || String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mounted 0S proof server live at http://127.0.0.1:${port}`);
});
