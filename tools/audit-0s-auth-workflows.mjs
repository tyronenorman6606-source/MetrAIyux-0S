#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactRoot = path.join(repoRoot, "test-artifacts", "0s-auth-workflows");
const artifactDir = path.join(artifactRoot, stamp);
const latestPath = path.join(artifactRoot, "auth-workflows-latest.json");

const config = {
  zeroOsBase: String(process.env.ZERO_OS_LIVE_BASE || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, ""),
  skyemailBase: String(process.env.SKYEMAIL_LIVE_BASE || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, ""),
  skygateBase: String(process.env.SKYGATE_LIVE_BASE || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, ""),
  host: process.env.SKYENET_AUDIT_HOST || "metraiyux-0s-full-system.graylondonskyes.workers.dev",
};

function readMaybe(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function envValue(names) {
  const text = [readMaybe(path.join(repoRoot, ".env")), readMaybe(path.join(repoRoot, "env.txt"))].join("\n");
  for (const name of names) {
    const re = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?${name}\\s*=\\s*([\\s\\S]*?)(?=\\n[A-Z0-9_]+\\s*=|\\nexport\\s+[A-Z0-9_]+\\s*=|$)`, "m");
    const match = text.match(re);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
  }
  return "";
}

function redact(value) {
  const text = String(value || "");
  if (!text) return "";
  return `${text.slice(0, 10)}...${text.slice(-6)}`;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { text: text.slice(0, 1000) };
  }
}

async function call(label, url, options = {}, expect = {}) {
  const started = performance.now();
  const response = await fetch(url, {
    redirect: options.redirect || "manual",
    ...options,
    headers: {
      accept: "application/json,text/html,text/plain;q=0.9,*/*;q=0.8",
      ...(options.body && typeof options.body !== "string" && !(options.body instanceof Uint8Array) ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body && typeof options.body !== "string" && !(options.body instanceof Uint8Array) ? JSON.stringify(options.body) : options.body,
  });
  const data = await readJson(response);
  const result = {
    label,
    url,
    method: options.method || "GET",
    status: response.status,
    ok: response.ok,
    ms: Math.round(performance.now() - started),
    location: response.headers.get("location") || null,
    data,
  };
  const statuses = expect.statuses || [200];
  const failures = [];
  if (!statuses.includes(response.status)) failures.push(`status ${response.status} not in ${statuses.join(",")}`);
  if (expect.assert && expect.assert(data, response) !== true) failures.push(expect.message || "contract assertion failed");
  if (failures.length) result.failures = failures;
  return result;
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "x-skye-gate-session": token,
    "x-free99-gate-session": token,
  };
}

async function main() {
  const adminCode = envValue(["FREE99_ADMIN_CODE", "OWNER_ADMIN_CODE", "METRAIYUX_ADMIN_CODE", "ADMIN_UNLOCK_CODE", "FS27_ADMIN_CODE"]);
  if (!adminCode) throw new Error("No shared 0S/Free99 admin credential found in .env or env.txt.");

  const results = [];
  const login = await call("0S owner admin login issues shared sessions", `${config.zeroOsBase}/api/owner/admin-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { code: adminCode },
  }, {
    assert: (data) => Boolean(data.token && (data.gateToken || data.gateBearerToken)),
    message: "login did not return both 0S owner token and FS27 gate bearer",
  });
  results.push({ ...login, data: { ok: login.data.ok, has_owner_token: Boolean(login.data.token), has_gate_token: Boolean(login.data.gateToken || login.data.gateBearerToken), owner_token: redact(login.data.token), gate_token: redact(login.data.gateToken || login.data.gateBearerToken) } });
  if (login.failures) throw new Error(`Admin login failed: ${login.failures.join("; ")}`);

  const ownerToken = login.data.token;
  const gateToken = login.data.gateToken || login.data.gateBearerToken;

  results.push(await call("0S gate introspects owner token", `${config.zeroOsBase}/api/skygate/auth-introspect`, {
    method: "POST",
    headers: { ...authHeaders(ownerToken), "content-type": "application/json" },
    body: {},
  }, { assert: (data) => data.active === true || data.ok === true, message: "owner token was not active" }));

  results.push(await call("FS27 gate introspects gate bearer", `${config.skygateBase}/auth-introspect`, {
    method: "POST",
    headers: { authorization: `Bearer ${gateToken}`, "content-type": "application/json" },
    body: { token: gateToken },
  }, { assert: (data) => data.active === true || data.ok === true, message: "gate bearer was not active" }));

  results.push(await call("SkyeNet status blocks anonymous request", `${config.zeroOsBase}/api/skyenet/status`, {}, { statuses: [401, 403, 302] }));
  results.push(await call("SkyeNet status accepts shared owner gate", `${config.zeroOsBase}/api/skyenet/status`, {
    headers: authHeaders(ownerToken),
  }, { assert: (data) => data.ok === true && data.skynet?.status === "ready", message: "SkyeNet did not report ready" }));

  const projectId = `auth-audit-${stamp.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/g, "")}`;
  const deploymentId = `dep-${Date.now()}`;
  const workspaceId = "0s-auth-workflow-audit";
  const mountPath = `/skyenet/audit/${projectId}`;
  const marker = `0S auth workflow audit ${stamp}`;

  results.push(await call("SkyeNet workspace upsert accepts shared gate", `${config.zeroOsBase}/api/skyenet/workspace`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: { workspace_id: workspaceId, plan_name: "admin-unlocked", display_name: "0S Auth Workflow Audit" },
  }, { assert: (data) => data.ok === true, message: "workspace upsert failed" }));

  results.push(await call("SkyeNet deploy init accepts shared gate", `${config.zeroOsBase}/api/skyenet/deploy/init`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: { workspace_id: workspaceId, plan_name: "admin-unlocked", project_id: projectId, deployment_id: deploymentId, title: "0S Auth Workflow Audit" },
  }, { assert: (data) => data.ok === true && Boolean(data.skynet?.asset_prefix), message: "deploy init failed" }));

  const params = new URLSearchParams({ workspaceId, projectId, deploymentId, path: "index.html" });
  results.push(await call("SkyeNet upload accepts dropped HTML", `${config.zeroOsBase}/api/skyenet/deploy/upload?${params}`, {
    method: "PUT",
    headers: { ...authHeaders(ownerToken), "content-type": "text/html; charset=utf-8" },
    body: `<!doctype html><meta charset="utf-8"><title>0S Auth Audit</title><h1>${marker}</h1>`,
  }, { assert: (data) => data.ok === true && data.skynet?.path === "index.html", message: "upload failed" }));

  results.push(await call("SkyeNet deploy complete writes receipt", `${config.zeroOsBase}/api/skyenet/deploy/complete`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: { workspace_id: workspaceId, plan_name: "admin-unlocked", project_id: projectId, deployment_id: deploymentId, files: ["index.html"] },
  }, { assert: (data) => data.ok === true && data.skynet?.files >= 1, message: "deploy complete failed" }));

  const route = await call("SkyeNet route register returns live URL", `${config.zeroOsBase}/api/skyenet/deploy/route`, {
    method: "POST",
    headers: authHeaders(ownerToken),
    body: {
      workspace_id: workspaceId,
      plan_name: "admin-unlocked",
      hostname: config.host,
      mount_path: mountPath,
      project_id: projectId,
      deployment_id: deploymentId,
      public_access: true,
      default_auth: "public",
    },
  }, { assert: (data) => data.ok === true && Boolean(data.skynet?.live_url), message: "route registration failed" });
  results.push(route);

  const liveUrl = route.data.skynet?.live_url || `${config.zeroOsBase}${mountPath}`;
  results.push(await call("SkyeNet live URL serves uploaded surface", liveUrl, {}, {
    assert: (data) => String(data.text || JSON.stringify(data)).includes(marker),
    message: "live SkyeNet URL did not serve the uploaded marker",
  }));

  const skyemailSession = await call("SkyeMail imports shared FS27 gate session", `${config.skyemailBase}/auth-fs27-session`, {
    method: "POST",
    headers: { authorization: `Bearer ${gateToken}`, "content-type": "application/json" },
    body: {},
  }, { assert: (data) => data.ok === true && data.auth_provider === "skygatefs27" && Boolean(data.token), message: "SkyeMail did not issue a session from FS27 gate" });
  const skymailToken = skyemailSession.data.token;
  results.push({ ...skyemailSession, data: { ok: skyemailSession.data.ok, auth_provider: skyemailSession.data.auth_provider, has_token: Boolean(skymailToken), email: skyemailSession.data.user?.email || null } });

  results.push(await call("SkyeMail accepts issued session on mail-status", `${config.skyemailBase}/mail-status`, {
    headers: { authorization: `Bearer ${skymailToken}` },
  }, { assert: (data) => data.ok === true || data.configured === true, message: "SkyeMail issued token did not work" }));

  const failures = results.flatMap((result) => (result.failures || []).map((failure) => ({ label: result.label, failure })));
  const receipt = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    config,
    live_skyenet_url: liveUrl,
    results,
    failures,
  };
  await fsp.mkdir(artifactDir, { recursive: true });
  await fsp.writeFile(path.join(artifactDir, "auth-workflows.json"), JSON.stringify(receipt, null, 2));
  await fsp.mkdir(artifactRoot, { recursive: true });
  await fsp.writeFile(latestPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ ok: receipt.ok, checks: results.length, failures: failures.length, live_skyenet_url: liveUrl, receipt: latestPath }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
