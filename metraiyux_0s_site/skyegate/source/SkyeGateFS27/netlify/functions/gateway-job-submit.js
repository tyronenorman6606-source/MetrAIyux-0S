import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest, getBearer, monthKeyUTC, getInstallId, getClientIp, getUserAgent } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { enforceKaixuMessages, KAIXU_SYSTEM_HASH, SCHEMA_VERSION, BUILD_ID } from "./_lib/kaixu.js";
import { resolveAuth, effectiveRpmLimit } from "./_lib/authz.js";
import { enforceRpm } from "./_lib/ratelimit.js";
import { resolveProvider, resolveUpstreamTarget } from "./_lib/providers.js";
import { randomUUID } from "crypto";
import { hmacSha256Hex } from "./_lib/crypto.js";
import { enforceDevice } from "./_lib/devices.js";
import { assertAllowed } from "./_lib/allowlist.js";
import { enforceUsagePreflight } from "./_lib/usageGates.js";
import { resolvePlatformUsageContext } from "./_lib/platformUsage.js";
import { PUBLIC_PROVIDER_NAME, publicModelName } from "./_lib/publicLabels.js";

function siteOrigin(req) {
  const urlEnv = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
  if (urlEnv) return urlEnv.replace(/\/$/, "");
  try { return new URL(req.url).origin; } catch { return ""; }
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const key = getBearer(req);
  if (!key) return json(401, { error: "Missing Authorization: Bearer <virtual_key>" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const requested_provider = (body.provider || "").toString().trim();
  const requested_model = (body.model || "").toString().trim();
  const base_provider = resolveProvider(requested_provider);
  const target = resolveUpstreamTarget(base_provider, requested_model);
  const provider = target.provider;
  const model = target.model;
  const public_provider = PUBLIC_PROVIDER_NAME;
  const public_model = publicModelName(provider, requested_model || model);
  const messages_in = body.messages;
  const max_tokens = Number.isFinite(body.max_tokens) ? parseInt(body.max_tokens, 10) : 4096;
  const temperature = Number.isFinite(body.temperature) ? body.temperature : 1;

  if (!requested_provider) return badRequest("Missing Skyes Over London origin label", cors);
  if (!requested_model) return badRequest("Missing kAIxU model", cors);
  if (!Array.isArray(messages_in) || messages_in.length === 0) return badRequest("Missing messages[]", cors);

  const messages = enforceKaixuMessages(messages_in);

  const keyRow = await resolveAuth(key);
  if (!keyRow) return json(401, { error: "Invalid or revoked key" }, cors);
  if (!keyRow.is_active) return json(403, { error: "Customer disabled" }, cors);

  const install_id = getInstallId(req);
  const ua = getUserAgent(req);
  const ip = getClientIp(req);
  const ip_hash = ip ? hmacSha256Hex(process.env.KEY_PEPPER || process.env.JWT_SECRET || "kaixu", ip) : null;

  const allow = assertAllowed({ provider, model, keyRow });
  if (!allow.ok) return json(allow.status || 403, { error: allow.error }, cors);

  const dev = await enforceDevice({ keyRow, install_id, ua, actor: 'job_submit' });
  if (!dev.ok) return json(dev.status || 403, { error: dev.error }, cors);

  const platformUsage = resolvePlatformUsageContext({ req, body, keyRow, defaultLane: "ai-job" });

  // Light rate-limit on submit (prevents enqueue spam)
  const inheritedRpm = effectiveRpmLimit(keyRow, 60, platformUsage.dedicatedPlatformId);
  const rl = await enforceRpm({
    customerId: keyRow.customer_id,
    apiKeyId: keyRow.api_key_id,
    rpmOverride: Math.min(inheritedRpm || 60, 60),
    platformId: platformUsage.dedicatedPlatformId,
    usageLane: platformUsage.usageLane
  });
  if (!rl.ok) {
    return json(429, { error: "Rate limit exceeded", ratelimit: { remaining: rl.remaining, reset: rl.reset } }, cors);
  }

  // Cap gate (we don't know job cost yet, but if you're already capped, don't enqueue)
  const month = monthKeyUTC();
  const preflight = await enforceUsagePreflight({ keyRow, month, platformId: platformUsage.platformId });
  if (!preflight.ok) return json(preflight.status, preflight.payload, cors);

  const job_id = randomUUID();
  const request = {
    requested_provider,
    requested_model,
    provider,
    model,
    messages,
    max_tokens,
    temperature,
    platform_id: platformUsage.platformId,
    usage_lane: platformUsage.usageLane
  };

  await q(
    `insert into async_jobs(id, customer_id, api_key_id, provider, model, request, status, meta)
     values ($1,$2,$3,$4,$5,$6::jsonb,'queued',$7::jsonb)`,
    [
      job_id,
      keyRow.customer_id,
      keyRow.api_key_id,
      provider,
      model,
      JSON.stringify(request),
      JSON.stringify({
        kaixu_system_hash: KAIXU_SYSTEM_HASH,
        telemetry: { install_id: install_id || null, ip_hash: ip_hash || null, ua: ua || null },
        platform: {
          platform_id: platformUsage.platformId,
          usage_lane: platformUsage.usageLane,
          dedicated_bucket: platformUsage.dedicatedBucket
        },
        client: {
          app_id: (req.headers.get("x-kaixu-app") || "").toString().slice(0, 120) || null,
          build_id: (req.headers.get("x-kaixu-build") || "").toString().slice(0, 120) || null
        }
      })
    ]
  );

  // Kick off the background worker from server-side (browser can't invoke background functions directly).
  const base = new URL(req.url);
  const workerUrl = new URL("/.netlify/functions/gateway-job-run-background", base);
  const secret = (process.env.JOB_WORKER_SECRET || "").trim();

  // Fire-and-forget; even if this fetch fails, the job is queued and can be re-kicked by calling /status?kick=1.
  try {
    await fetch(workerUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { "x-kaixu-job-secret": secret } : { "authorization": `Bearer ${key}` })
      },
      body: JSON.stringify({ id: job_id })
    });
  } catch (e) {
    console.warn("Job worker invoke failed:", e?.message || e);
  }

  const origin = siteOrigin(req);
  const status_url = `${origin}/.netlify/functions/gateway-job-status?id=${encodeURIComponent(job_id)}`;
  const result_url = `${origin}/.netlify/functions/gateway-job-result?id=${encodeURIComponent(job_id)}`;

  return json(202, {
    job_id,
    provider: public_provider,
    model: public_model,
    requested_provider: public_provider,
    requested_model: public_model,
    status_url,
    result_url,
    platform: {
      platform_id: platformUsage.platformId,
      usage_lane: platformUsage.usageLane
    },
    build: { id: BUILD_ID, schema: SCHEMA_VERSION, kaixu_system_hash: KAIXU_SYSTEM_HASH },
    note: "Job accepted. Poll status_url until status==='succeeded', then GET result_url."
  }, cors);
});
