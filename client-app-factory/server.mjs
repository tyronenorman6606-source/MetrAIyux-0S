#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  catalogAsset,
  createIntake,
  ensureStorage,
  generateApp,
  linkSkyePay,
  listRecords,
  readLedger,
  readRecord,
  recordProof,
  runFactoryPass,
  runScanner
} from "./scripts/factory-engine.mjs";

const __filename = fileURLToPath(import.meta.url);
const factoryRoot = path.resolve(path.dirname(__filename));
const port = Number(process.env.PORT || process.argv[2] || 4199);
const host = process.env.HOST || "0.0.0.0";
const jsonLimit = 18 * 1024 * 1024;

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
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".toml": "text/plain; charset=utf-8"
};

function sendJson(res, status, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendError(res, status, error) {
  sendJson(res, status, {
    ok: false,
    error: error?.message || String(error)
  });
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleanPath = decoded === "/" ? "/index.html" : decoded;
  const target = path.resolve(factoryRoot, `.${cleanPath}`);
  if (target !== factoryRoot && !target.startsWith(`${factoryRoot}${path.sep}`)) {
    throw new Error("Static path escaped factory root.");
  }
  return target;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > jsonLimit) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res) {
  let filePath = safeStaticPath(req.url || "/");
  let fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    fileStat = await stat(filePath).catch(() => null);
  }
  if (!fileStat || !fileStat.isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
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

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    await ensureStorage();
    return sendJson(res, 200, {
      ok: true,
      service: "client-app-factory",
      storage: "ready",
      records: (await listRecords()).length,
      checkedAt: new Date().toISOString()
    });
  }

  if (req.method === "GET" && pathname === "/api/factory/records") {
    return sendJson(res, 200, {
      ok: true,
      records: await listRecords()
    });
  }

  const recordMatch = pathname.match(/^\/api\/factory\/records\/([^/]+)$/);
  if (req.method === "GET" && recordMatch) {
    return sendJson(res, 200, {
      ok: true,
      record: await readRecord(recordMatch[1])
    });
  }

  if (req.method === "GET" && pathname === "/api/factory/proof-ledger") {
    return sendJson(res, 200, {
      ok: true,
      ledger: await readLedger()
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/intake") {
    return sendJson(res, 200, {
      ok: true,
      record: await createIntake(await readBody(req))
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/assets") {
    return sendJson(res, 200, {
      ok: true,
      record: await catalogAsset(await readBody(req))
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/scan") {
    return sendJson(res, 200, {
      ok: true,
      ...(await runScanner((await readBody(req)).clientId || "empire-pallets"))
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/generate") {
    return sendJson(res, 200, {
      ok: true,
      ...(await generateApp(await readBody(req)))
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/workspace") {
    return sendJson(res, 200, {
      ok: true,
      record: await linkWorkspace(await readBody(req))
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/skyepay") {
    return sendJson(res, 200, {
      ok: true,
      record: await linkSkyePay(await readBody(req))
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/proof") {
    return sendJson(res, 200, {
      ok: true,
      record: await recordProof(await readBody(req))
    });
  }

  if (req.method === "POST" && pathname === "/api/factory/run") {
    return sendJson(res, 200, await runFactoryPass(await readBody(req)));
  }

  return sendError(res, 404, new Error(`Unknown API route: ${req.method} ${pathname}`));
}

async function linkWorkspace(payload) {
  const { provisionWorkspace } = await import("./scripts/factory-engine.mjs");
  return provisionWorkspace(payload);
}

await ensureStorage();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendError(res, 405, new Error("Method not allowed."));
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendError(res, 500, error);
  }
});

server.listen(port, host, () => {
  console.log(`Client App Factory service running at http://${host}:${port}`);
});
