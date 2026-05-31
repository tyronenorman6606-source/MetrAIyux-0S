#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const musicRoot = path.resolve(path.dirname(__filename), "..");
const siteRoot = path.resolve(musicRoot, "..");
const require = createRequire(import.meta.url);

process.env.MUSIC_NEXUS_DATA_DIR ||= path.join(os.tmpdir(), "skye-musicnexus-local-dev");

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webm", "video/webm"],
  [".wav", "audio/wav"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".m4a", "audio/mp4"],
  [".aac", "audio/aac"],
  [".flac", "audio/flac"],
]);

const functionNames = new Set([
  "music-analytics",
  "music-artists",
  "music-assets",
  "music-brain",
  "music-gamify",
  "music-drops",
  "music-exchange",
  "music-payments",
  "music-provider-hooks",
  "music-releases",
  "music-social",
  "music-studio",
  "music-store",
  "skygate-session",
]);

function headersObject(headers) {
  const result = {};
  for (const [key, value] of Object.entries(headers || {})) {
    result[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value || "");
  }
  return result;
}

function queryObject(url) {
  const result = {};
  for (const [key, value] of url.searchParams.entries()) result[key] = value;
  return result;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res, statusCode, headers, body, isBase64Encoded = false) {
  res.writeHead(statusCode, {
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
    "cross-origin-resource-policy": "cross-origin",
    "permissions-policy": "cross-origin-isolated=(self)",
    ...headers,
  });
  res.end(isBase64Encoded ? Buffer.from(body || "", "base64") : body || "");
}

function redirect(res, location) {
  res.writeHead(302, {
    "cache-control": "no-store",
    "location": location,
  });
  res.end("");
}

function serveBrowserReset(res) {
  const target = "/SkyeMusicNexus/public/drops.html?skyeFresh=1";
  send(
    res,
    200,
    {
      "content-type": "text/html; charset=utf-8",
      "clear-site-data": '"cache", "storage", "executionContexts"',
      "x-skye-surface": "SkyeMusicNexus Browser Cache Reset",
    },
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SkyeMusicNexus - Resetting Local Browser Cache</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050711;color:#f6f7fb;font-family:Inter,system-ui,sans-serif}
    main{width:min(680px,calc(100vw - 32px));border:1px solid rgba(88,245,255,.32);border-radius:24px;padding:28px;background:rgba(16,18,36,.88);box-shadow:0 30px 90px rgba(0,0,0,.36)}
    h1{margin:0 0 10px;font-size:clamp(30px,7vw,54px);line-height:1;letter-spacing:0}
    p{color:#b9c3d7;line-height:1.5}
    a{color:#58f5ff;font-weight:800}
  </style>
</head>
<body>
  <main>
    <h1>Resetting MusicNexus</h1>
    <p>Clearing stale service workers, local caches, and old preview shells for this local origin. You will be redirected to the Drop Room.</p>
    <p><a href="${target}">Open Drop Room now</a></p>
  </main>
  <script>
    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }
        try { localStorage.removeItem("skye:active-client-preview"); } catch {}
        try { sessionStorage.clear(); } catch {}
      } catch (error) {
        console.warn("SkyeMusicNexus reset warning:", error);
      } finally {
        window.location.replace("${target}");
      }
    })();
  </script>
</body>
</html>`
  );
}

async function serveFunction(req, res, url) {
  if (req.method === "OPTIONS") {
    send(res, 204, {}, "");
    return;
  }
  const name = url.pathname.split("/").pop();
  if (!functionNames.has(name)) {
    send(res, 404, { "content-type": "application/json" }, JSON.stringify({ ok: false, error: "Unknown MusicNexus function." }));
    return;
  }
  try {
    const fn = require(path.join(musicRoot, "netlify", "functions", `${name}.js`));
    const response = await fn.handler({
      httpMethod: req.method || "GET",
      path: url.pathname,
      queryStringParameters: queryObject(url),
      headers: headersObject(req.headers),
      body: await readRequestBody(req),
      isBase64Encoded: false,
    });
    send(
      res,
      response.statusCode || 200,
      response.headers || { "content-type": "application/json" },
      response.body || "",
      response.isBase64Encoded === true
    );
  } catch (error) {
    send(res, error.statusCode || 500, { "content-type": "application/json" }, JSON.stringify({ ok: false, error: error.message || "Function failed." }));
  }
}

async function serveStatic(res, pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html";
  let filePath = path.resolve(siteRoot, clean);
  if (!filePath.startsWith(siteRoot)) {
    send(res, 403, { "content-type": "text/plain; charset=utf-8" }, "forbidden");
    return;
  }
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, "index.html");
    const body = await readFile(filePath);
    const extraHeaders = clean === "SkyeMusicNexus/public/drops.html"
      ? {
          "clear-site-data": '"cache"',
          "x-skye-surface": "SkyeMusicNexus Drop Room",
        }
      : {};
    send(res, 200, { "content-type": types.get(path.extname(filePath)) || "application/octet-stream", ...extraHeaders }, body);
  } catch {
    send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const dropShortcuts = new Set([
    "/drops",
    "/drops/",
    "/music-drops",
    "/music-drops/",
    "/SkyeMusicNexus/drops",
    "/SkyeMusicNexus/drops/",
  ]);
  if (dropShortcuts.has(url.pathname)) {
    redirect(res, "/SkyeMusicNexus/public/drops.html");
    return;
  }
  if (url.pathname === "/__skye-reset" || url.pathname === "/SkyeMusicNexus/__reset") {
    serveBrowserReset(res);
    return;
  }
  if (url.pathname.startsWith("/.netlify/functions/")) {
    await serveFunction(req, res, url);
    return;
  }
  await serveStatic(res, url.pathname);
});

function listen(port) {
  server.removeAllListeners("error");
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`SkyeMusicNexus local platform server: ${baseUrl}`);
    console.log(`Dashboard: ${baseUrl}/SkyeMusicNexus/public/index.html`);
    console.log(`DAW Room: ${baseUrl}/SkyeMusicNexus/public/daw.html`);
    console.log(`Discover: ${baseUrl}/SkyeMusicNexus/public/discover.html`);
    console.log(`Feed: ${baseUrl}/SkyeMusicNexus/public/feed.html`);
    console.log(`Store: ${baseUrl}/SkyeMusicNexus/public/store.html`);
    console.log(`Artist Brain: ${baseUrl}/SkyeMusicNexus/public/brain.html`);
    console.log(`Drops: ${baseUrl}/SkyeMusicNexus/public/drops.html`);
    console.log(`Upload Studio: ${baseUrl}/SkyeMusicNexus/public/upload.html`);
    console.log(`Music Player: ${baseUrl}/SkyeMusicNexus/public/player.html`);
    console.log(`Local data: ${process.env.MUSIC_NEXUS_DATA_DIR}`);
  });
}

listen(Number(process.env.PORT || process.argv[2] || 4179));
