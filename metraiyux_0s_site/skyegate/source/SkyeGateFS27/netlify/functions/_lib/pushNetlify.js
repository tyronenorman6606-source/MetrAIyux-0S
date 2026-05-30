import { sleep } from "./http.js";
import { publicProviderRuntime, runZeroOsProviderAction } from "./providerRuntime.js";

function netlifyEnvOverrides(netlify_token) {
  const token = (netlify_token || "").toString().trim();
  return token ? { NETLIFY_AUTH_TOKEN: token } : {};
}

function bufferToBase64(body) {
  if (body == null) return "";
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) return body.toString("base64");
  if (body instanceof Uint8Array) return Buffer.from(body).toString("base64");
  if (body instanceof ArrayBuffer) return Buffer.from(body).toString("base64");
  if (typeof body === "string") return Buffer.from(body).toString("base64");
  const err = new Error("Netlify provider runtime upload requires replayable bytes");
  err.code = "NETLIFY_PROVIDER_RUNTIME_BODY";
  err.status = 400;
  throw err;
}

function resultFromRuntime(runtime) {
  const result = runtime?.receipt?.provider_result || {};
  return {
    ...result,
    provider_runtime: publicProviderRuntime(runtime?.receipt)
  };
}

function throwRuntimeError(runtime, message = "Netlify provider runtime failed") {
  const receipt = runtime?.receipt || null;
  const err = new Error(receipt?.error || message);
  err.code = "NETLIFY_PROVIDER_RUNTIME";
  err.status = runtime?.status || receipt?.http_status || 502;
  err.detail = {
    error: receipt?.error || message,
    provider_runtime: publicProviderRuntime(receipt)
  };
  throw err;
}

function retryableStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function runNetlifyProvider({ action, payload, usage_lane, netlify_token = null, retry = false }) {
  const maxAttempts = retry ? 5 : 1;
  let lastRuntime = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const runtime = await runZeroOsProviderAction({
      provider_id: "netlify",
      action,
      app_id: "skygatefs27-push",
      workspace_id: payload?.site_id || payload?.siteId || "",
      customer_id: payload?.customer_id || "",
      usage_lane: usage_lane || action,
      payload,
      env_overrides: netlifyEnvOverrides(netlify_token)
    });
    if (runtime.ok) return resultFromRuntime(runtime);
    lastRuntime = runtime;
    if (!retry || attempt >= maxAttempts || !retryableStatus(runtime.status)) break;
    const backoff = Math.min(15000, 300 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200));
    await sleep(backoff);
  }
  throwRuntimeError(lastRuntime);
}

export async function createDigestDeploy({ site_id, branch, title, files, netlify_token = null }) {
  const cleanFiles = {};
  for (const [p, sha] of Object.entries(files || {})) {
    const k = (p && p[0] === "/") ? p.slice(1) : String(p || "");
    if (k) cleanFiles[k] = sha;
  }
  const filesForNetlify = cleanFiles;
  return runNetlifyProvider({
    action: "netlify.deploy.create",
    usage_lane: "fs27.push.deploy_init",
    netlify_token,
    payload: { site_id, branch, title, async: true, draft: false, files: filesForNetlify }
  });
}

export async function getSiteDeploy({ site_id, deploy_id, netlify_token = null }) {
  return runNetlifyProvider({
    action: "netlify.deploy.get",
    usage_lane: "fs27.push.deploy_status",
    netlify_token,
    retry: true,
    payload: { site_id, deploy_id }
  });
}

export async function getDeploy({ deploy_id, netlify_token = null }) {
  return runNetlifyProvider({
    action: "netlify.deploy.get",
    usage_lane: "fs27.push.deploy_status",
    netlify_token,
    retry: true,
    payload: { deploy_id }
  });
}

export async function putDeployFile({ deploy_id, deploy_path, body, netlify_token = null }) {
  return runNetlifyProvider({
    action: "netlify.deploy.file.upload",
    usage_lane: "fs27.push.file_upload",
    netlify_token,
    retry: true,
    payload: {
      deploy_id,
      path: deploy_path,
      content_base64: bufferToBase64(body),
      content_type: "application/octet-stream"
    }
  });
}

export async function pollDeployUntil({ site_id, deploy_id, timeout_ms = 60000, netlify_token = null }) {
  const start = Date.now();
  let d = await getSiteDeploy({ site_id, deploy_id, netlify_token });
  while (Date.now() - start < timeout_ms) {
    const st = d?.state || "";
    const hasReq = Array.isArray(d?.required) && d.required.length > 0;
    if (st === "ready" || st === "error" || hasReq || (st && st !== "preparing")) return d;
    await sleep(1200);
    d = await getSiteDeploy({ site_id, deploy_id, netlify_token });
  }
  return d;
}
