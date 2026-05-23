import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadLocalEnv } from "./_local-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
loadLocalEnv({ root });
const port = parseInt(process.env.SKYPAY_DEV_PORT || "4197", 10);

const functionRoutes = {
  "/skyepay/offers": "skyepay-offers.js",
  "/skyepay/checkout": "skyepay-checkout.js",
  "/skyepay/status": "skyepay-status.js",
  "/.netlify/functions/skyepay-offers": "skyepay-offers.js",
  "/.netlify/functions/skyepay-checkout": "skyepay-checkout.js",
  "/.netlify/functions/skyepay-status": "skyepay-status.js"
};

const assetAliases = {
  "/pay": "/skyepay.html",
  "/store": "/skyepay-store.html",
  "/gateway/skyepay": "/skyepay.html",
  "/skyepay/store": "/skyepay-store.html",
  "/skyepay/api": "/skyepay-api.html",
  "/skyepay/api.json": "/skyepay-api.json"
};

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js") || file.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function handleFunction(req, res, pathname, origin) {
  const mod = await import(pathToFileURL(path.join(root, "netlify/functions", functionRoutes[pathname])).href);
  const body = await readBody(req);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(","));
    else if (value != null) headers.set(key, value);
  }
  const request = new Request(`${origin}${req.url}`, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : body
  });
  const response = await mod.default(request, {});
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}

const server = http.createServer(async (req, res) => {
  const origin = `http://${req.headers.host || `127.0.0.1:${port}`}`;
  process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = "true";
  process.env.SKYPAY_PUBLIC_ORIGIN = origin;
  process.env.SKYGATE_SKIP_SCHEMA_BOOTSTRAP = "true";

  try {
    const url = new URL(req.url || "/", origin);
    if (functionRoutes[url.pathname]) return await handleFunction(req, res, url.pathname, origin);

    const normalizedPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const assetPath = assetAliases[normalizedPath] || url.pathname;
    let filePath = path.join(root, decodeURIComponent(assetPath));
    if (assetPath === "/") filePath = path.join(root, "skyepay.html");
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "content-type": contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(error?.stack || String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`SkyePay dev server: http://127.0.0.1:${port}/skyepay.html?client=bobs-smoke-shop&dry_run=1`);
});
