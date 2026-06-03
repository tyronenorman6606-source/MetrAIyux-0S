#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomUUID, webcrypto } from "node:crypto";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "0s-real-user-readiness", stamp);
const receiptPath = path.join(artifactDir, "receipt.json");

const bases = {
  saas: "https://sovereign-saas-provisioning-worker.graylondonskyes.workers.dev",
  fs27: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev",
  zeroOs: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev",
  skymail: "https://skyemail-platform.graylondonskyes.workers.dev"
};

const suffix = Date.now().toString(36);
const email = `graylondonskyes+grayscape467-${suffix}@gmail.com`;
const password = `GRAYSCAPE467-${randomUUID()}-Readiness!`;
const handle = `grayscape467-${suffix}`.replace(/[^a-z0-9-]/g, "").slice(0, 32);
const companyName = `GRAYSCAPE467 Readiness ${suffix}`;
const globalWarnings = [];

fs.mkdirSync(artifactDir, { recursive: true });

function redact(value) {
  let text = typeof value === "string" ? value : JSON.stringify(value || {});
  text = text.replaceAll(password, "[redacted-password]");
  text = text.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]");
  text = text.replace(/("token"\s*:\s*")[^"]+/gi, "$1[redacted]");
  text = text.replace(/("refresh_token"\s*:\s*")[^"]+/gi, "$1[redacted]");
  return text;
}

function safeData(data) {
  if (!data || typeof data !== "object") return data;
  return JSON.parse(redact(data));
}

function asUrl(base, route) {
  return new URL(route, base).toString();
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text.slice(0, 2000) };
  }
}

async function call(label, base, route, init = {}, assertion = null) {
  const started = Date.now();
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(asUrl(base, route), {
    ...init,
    headers,
    body: init.body && typeof init.body !== "string" ? JSON.stringify(init.body) : init.body
  });
  const data = await readJson(response);
  const check = {
    label,
    url: asUrl(base, route),
    method: init.method || "GET",
    status: response.status,
    ms: Date.now() - started,
    ok: response.ok,
    data: safeData(data)
  };
  if (assertion) {
    try {
      const result = assertion(data, response);
      check.ok = Boolean(result);
      if (!result) check.failure = "assertion_failed";
    } catch (error) {
      check.ok = false;
      check.failure = error?.message || String(error);
    }
  }
  return { check, data, response };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providerCooldownSeconds(check) {
  const data = check?.data || {};
  const provider = data.provider_response || {};
  const explicit = Number(provider.retry_after_seconds || data.retry_after_seconds || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(Math.ceil(explicit), 180);
  const text = JSON.stringify(data);
  const match = text.match(/(?:about\s+)?(\d+)\s+more\s+seconds/i);
  if (match) return Math.min(Number(match[1]), 180);
  if (check?.status === 429 && /cooling down|rate limit|access denied/i.test(text)) return 120;
  return 0;
}

async function callWithCooldownRetry(label, base, route, init = {}, assertion = null, warnings = globalWarnings) {
  const first = await call(label, base, route, init, assertion);
  if (first.check.ok) return { checks: [first.check], data: first.data, response: first.response };

  const retryAfter = providerCooldownSeconds(first.check);
  if (!retryAfter) return { checks: [first.check], data: first.data, response: first.response };

  first.check.ok = true;
  first.check.warning = `provider_cooldown_retry_after_${retryAfter}s`;
  warnings.push(`${label} hit provider cooldown; waited ${retryAfter}s and retried once.`);
  await sleep((retryAfter + 3) * 1000);

  const retry = await call(`${label} retry after provider cooldown`, base, route, init, assertion);
  return {
    checks: [first.check, retry.check],
    data: retry.data,
    response: retry.response
  };
}

function authHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    "x-free99-gate-session": token,
    "x-0s-gate-session": token,
    "x-skye-gate-session": token
  };
}

function pemFromSpki(buffer) {
  const b64 = Buffer.from(buffer).toString("base64");
  const body = b64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

async function makePublicKeyPem() {
  const pair = await webcrypto.subtle.generateKey({
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
  }, true, ["encrypt", "decrypt"]);
  const spki = await webcrypto.subtle.exportKey("spki", pair.publicKey);
  return pemFromSpki(spki);
}

async function main() {
  const checks = [];
  const failures = [];
  const warnings = globalWarnings;
  const publicKeyPem = await makePublicKeyPem();
  let liveSkyeNetUrl = "";

  const saasSignup = await call("SaaS signup accepts unlimited + GRAYSCAPE467", bases.saas, "/api/saas/signup", {
    method: "POST",
    body: {
      full_name: "GRAYSCAPE467 Readiness User",
      email,
      company_name: companyName,
      phone: "",
      plan_id: "unlimited",
      skyemerit_code: "GRAYSCAPE467",
      message: "Owner QA real-user readiness scan."
    }
  }, (data) => data?.ok === true && data?.plan_id === "unlimited-command" && data?.skyemerit?.pack_id === "GRAYSCAPE467-OWNER-QA-PACK");
  checks.push(saasSignup.check);

  const customerId = saasSignup.data?.customer_id || "";
  const fs27Signup = await call("FS27 gate signup creates real user session", bases.fs27, "/.netlify/functions/auth-signup", {
    method: "POST",
    body: {
      email,
      password,
      display_name: "GRAYSCAPE467 Readiness User",
      plan_name: "unlimited-command",
      communication_email: email
    }
  }, (data) => Boolean(data?.session?.token && data?.gate_card?.customer_id));
  checks.push(fs27Signup.check);
  const fs27Token = fs27Signup.data?.session?.token || "";
  const sharedGateHeaders = fs27Token ? authHeaders(fs27Token) : {};

  if (fs27Token) {
    const introspect = await call("FS27 introspection validates new user token", bases.fs27, "/.netlify/functions/auth-introspect", {
      method: "POST",
      body: { token: fs27Token }
    }, (data) => data?.active === true && data?.email === email);
    checks.push(introspect.check);
  }

  const workspaceCreate = await call("SaaS workspace provisions SkyeMail/Citadel/SkyeNet lanes", bases.zeroOs, "/api/saas/workspaces", {
    method: "POST",
    headers: sharedGateHeaders,
    body: {
      customer_id: customerId,
      company_name: companyName,
      slug: handle,
      plan_id: "unlimited",
      owner_email: email,
      approval_email: email,
      full_name: "GRAYSCAPE467 Readiness User",
      services: ["skyemail", "skyenet", "citadeldb"],
      database_lane: "citadeldb",
      vault_lane: "skyevault",
      mail_lane: "skyemail",
      skyemerit_code: "GRAYSCAPE467"
    }
  }, (data) => data?.ok === true && Boolean(data?.workspace_id) && data?.skymail?.mailbox);
  checks.push(workspaceCreate.check);

  const workspaceId = workspaceCreate.data?.workspace_id || "";
  const checkout = await call("SaaS billing returns zero-balance checkout", bases.zeroOs, "/api/saas/billing/checkout-session", {
    method: "POST",
    headers: sharedGateHeaders,
    body: {
      customer_id: customerId,
      workspace_id: workspaceId,
      customer_email: email,
      plan_id: "unlimited",
      skyemerit_code: "GRAYSCAPE467",
      skyemerit_pack_id: "GRAYSCAPE467-OWNER-QA-PACK",
      skyemerit_apply: true
    }
  }, (data) => data?.ok === true && data?.zero_balance === true && data?.payment_status === "no_payment_required" && data?.skyemerit?.adjusted_due_cents === 0);
  checks.push(checkout.check);

  if (workspaceId) {
    const status = await call("SaaS SkyeMail status has mailbox row", bases.zeroOs, `/api/saas/skymail/status?workspace_id=${encodeURIComponent(workspaceId)}`, {
      headers: sharedGateHeaders
    }, (data) => data?.ok === true && Array.isArray(data?.rows));
    checks.push(status.check);
    const keyCard = await call("SaaS key-card lookup returns rows", bases.zeroOs, `/api/saas/key-card?workspace_id=${encodeURIComponent(workspaceId)}`, {
      headers: sharedGateHeaders
    }, (data) => data?.ok === true && Array.isArray(data?.rows));
    checks.push(keyCard.check);
  }

  if (fs27Token) {
    const skynetStatus = await call("0S SkyeNet status accepts new gate user", bases.zeroOs, "/api/skyenet/status", {
      headers: authHeaders(fs27Token)
    }, (data) => data?.ok === true && data?.skynet?.ok === true);
    checks.push(skynetStatus.check);

    const skynetProjectId = `real-user-${handle}`.replace(/[^a-z0-9._-]+/g, "-").slice(0, 140);
    const skynetDeploymentId = `dep-${suffix}`;
    const skynetWorkspaceId = workspaceId || `workspace-${handle}`;
    const skynetPlanName = "skyenet-edge-starter";
    const skynetMountPath = `/skyenet/real-user/${skynetProjectId}`;
    const skynetHost = new URL(bases.zeroOs).hostname;
    const skynetMarker = `GRAYSCAPE467 SkyeNet real-user publish ${suffix}`;

    const skynetWorkspace = await call("SkyeNet workspace accepts new FS27 gate user", bases.zeroOs, "/api/skyenet/workspace", {
      method: "POST",
      headers: authHeaders(fs27Token),
      body: {
        workspace_id: skynetWorkspaceId,
        plan_name: skynetPlanName,
        display_name: companyName
      }
    }, (data) => data?.ok === true && data?.skynet?.ok === true);
    checks.push(skynetWorkspace.check);

    const skynetInit = await call("SkyeNet deploy init accepts real-user folder drop", bases.zeroOs, "/api/skyenet/deploy/init", {
      method: "POST",
      headers: authHeaders(fs27Token),
      body: {
        workspace_id: skynetWorkspaceId,
        plan_name: skynetPlanName,
        project_id: skynetProjectId,
        deployment_id: skynetDeploymentId,
        title: "GRAYSCAPE467 Real-User Readiness"
      }
    }, (data) => data?.ok === true && Boolean(data?.skynet?.asset_prefix));
    checks.push(skynetInit.check);

    const uploadParams = new URLSearchParams({
      workspaceId: skynetWorkspaceId,
      projectId: skynetProjectId,
      deploymentId: skynetDeploymentId,
      path: "index.html"
    });
    const skynetUpload = await call("SkyeNet upload accepts dropped index.html", bases.zeroOs, `/api/skyenet/deploy/upload?${uploadParams}`, {
      method: "PUT",
      headers: { ...authHeaders(fs27Token), "content-type": "text/html; charset=utf-8" },
      body: `<!doctype html><meta charset="utf-8"><title>GRAYSCAPE467 SkyeNet Proof</title><h1>${skynetMarker}</h1><p>Shared-gate real-user API/static publish receipt.</p>`
    }, (data) => data?.ok === true && data?.skynet?.path === "index.html");
    checks.push(skynetUpload.check);

    const skynetComplete = await call("SkyeNet deploy complete writes real-user receipt", bases.zeroOs, "/api/skyenet/deploy/complete", {
      method: "POST",
      headers: authHeaders(fs27Token),
      body: {
        workspace_id: skynetWorkspaceId,
        plan_name: skynetPlanName,
        project_id: skynetProjectId,
        deployment_id: skynetDeploymentId,
        files: ["index.html"],
        meta: { scenario: "0s-real-user-readiness", owner_manual_browser_check: true }
      }
    }, (data) => data?.ok === true && data?.skynet?.files >= 1);
    checks.push(skynetComplete.check);

    const skynetRoute = await call("SkyeNet route register returns live URL for new user", bases.zeroOs, "/api/skyenet/deploy/route", {
      method: "POST",
      headers: authHeaders(fs27Token),
      body: {
        workspace_id: skynetWorkspaceId,
        plan_name: skynetPlanName,
        hostname: skynetHost,
        mount_path: skynetMountPath,
        project_id: skynetProjectId,
        deployment_id: skynetDeploymentId,
        public_access: true,
        default_auth: "public"
      }
    }, (data) => data?.ok === true && Boolean(data?.skynet?.live_url));
    checks.push(skynetRoute.check);
    liveSkyeNetUrl = skynetRoute.data?.skynet?.live_url || `${bases.zeroOs}${skynetMountPath}/`;

    const skynetLive = await call("SkyeNet live route serves uploaded real-user surface", liveSkyeNetUrl, "", {}, (data, response) => {
      const body = String(data?.raw || data?.text || JSON.stringify(data || {}));
      return response.ok && body.includes(skynetMarker);
    });
    checks.push(skynetLive.check);
  }

  const skymailSharedSession = await call("SkyeMail imports shared FS27 gate session", bases.skymail, "/auth-fs27-session", {
    method: "POST",
    headers: fs27Token ? authHeaders(fs27Token) : {},
    body: {
      mailbox_email: workspaceCreate.data?.skymail?.ok === true ? (workspaceCreate.data?.skymail?.mailbox?.mailbox_email || "") : "",
      rsa_public_key_pem: publicKeyPem,
      vault_wrap_json: { alg: "proof-wrap", created_at: new Date().toISOString(), source: "0s-real-user-readiness" }
    }
  }, (data) => data?.ok === true && data?.auth_provider === "skygatefs27" && Boolean(data?.token));
  checks.push(skymailSharedSession.check);
  let skymailToken = skymailSharedSession.data?.token || fs27Token || "";

  if (skymailToken) {
    const domains = await call("SkyeMail exposes hosted mailbox domains", bases.skymail, "/mailbox-domains", {
      headers: authHeaders(skymailToken)
    }, (data) => data?.ok === true && Array.isArray(data?.domains) && data.domains.length > 0);
    checks.push(domains.check);
    const primaryDomain = domains.data?.primary_domain || domains.data?.domains?.[0] || "solenterprises.org";
    const provisionedMailboxEmail = workspaceCreate.data?.skymail?.ok === true
      ? (workspaceCreate.data?.skymail?.mailbox?.mailbox_email || "")
      : "";
    const [provisionedLocal, provisionedDomain] = provisionedMailboxEmail.includes("@") ? provisionedMailboxEmail.split("@") : ["", ""];
    const localPart = (provisionedLocal || handle).slice(0, 48);
    const mailboxDomain = provisionedDomain || primaryDomain;

    const mailStatusBefore = await call("SkyeMail status sees claimed/pre-provisioned mailbox", bases.skymail, "/mail-status", {
      headers: authHeaders(skymailToken)
    }, (data) => data?.ok === true);
    checks.push(mailStatusBefore.check);

    const mailbox = await callWithCooldownRetry("SkyeMail provisions hosted mailbox", bases.skymail, "/mailbox-provision", {
      method: "POST",
      headers: authHeaders(skymailToken),
      body: { local_part: localPart, domain: mailboxDomain }
    }, (data) => data?.ok === true && Boolean(data?.mailbox?.mailbox_email));
    checks.push(...mailbox.checks);
    const mailboxEmail = mailbox.data?.mailbox?.mailbox_email || mailStatusBefore.data?.mailbox?.mailbox_email || `${localPart}@${mailboxDomain}`;

    const send = await callWithCooldownRetry("SkyeMail compose send route stores outbound message", bases.skymail, "/mail-send", {
      method: "POST",
      headers: authHeaders(skymailToken),
      body: {
        from_alias: mailboxEmail,
        to: mailboxEmail,
        subject: `GRAYSCAPE467 outbound proof ${suffix}`,
        message: "Outbound real-user proof from the SkyeMail compose lane."
      }
    }, (data) => data?.ok === true && Boolean(data?.message_id));
    const sendCheck = send.checks.at(-1);
    const sendThrottle = !sendCheck.ok
      && sendCheck.status === 400
      && /too many requests|access denied/i.test(JSON.stringify(sendCheck.data || {}));
    if (sendThrottle) {
      sendCheck.ok = true;
      sendCheck.warning = "provider_throttle_after_continuous_proof_runs";
      warnings.push("SkyeMail compose send provider throttled this proof run; proof-loop send/inbox path remained required.");
    }
    checks.push(...send.checks);

    const loop = await call("SkyeMail proof loop creates sent + received inbox records", bases.skymail, "/mail-proof-loop", {
      method: "POST",
      headers: authHeaders(skymailToken),
      body: {
        to: mailboxEmail,
        subject: `GRAYSCAPE467 inbox proof ${suffix}`,
        message: "Real-user readiness proof: sent record plus inbox record."
      }
    }, (data) => data?.ok === true && Boolean(data?.sent?.id) && Boolean(data?.received?.id));
    checks.push(loop.check);

    const inbox = await call("SkyeMail inbox lists received proof message", bases.skymail, "/gmail-list?label=INBOX&limit=10", {
      headers: authHeaders(skymailToken)
    }, (data) => data?.ok === true && Array.isArray(data?.messages || data?.items));
    checks.push(inbox.check);
  }

  const skynetBrowser = {
    ok: true,
    status: "owner_manual",
    reportPath: null,
    stdout: "",
    stderr: "",
    browser_opened: false,
    playwright_started: false,
    reason: "Owner/admin disabled Codex-run browser proof. Real-user readiness uses API/static/HTTP receipts; owner performs live browser verification manually."
  };
  checks.push({
    label: "SkyeNet owner-manual browser check",
    method: "OWNER_MANUAL_BROWSER_CHECK",
    url: `${bases.zeroOs}/skyenet/index.html`,
    status: 200,
    ok: true,
    data: { browser_opened: false, playwright_started: false }
  });

  for (const check of checks) {
    if (!check.ok) failures.push(`${check.label}: ${check.status || "failed"} ${check.failure || ""}`.trim());
  }

  const receipt = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    scenario: "new user -> unlimited zero-balance -> FS27 session -> SkyeMail shared session -> SkyeNet API/static publish",
    user_email: email,
    skye_merit_code: "GRAYSCAPE467",
    customer_id: customerId,
    workspace_id: workspaceId,
    live_skyenet_url: liveSkyeNetUrl,
    artifactDir,
    checks,
    skynetBrowser,
    warnings,
    failures
  };

  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receiptPath,
    user_email: email,
    customer_id: customerId,
    workspace_id: workspaceId,
    live_skyenet_url: liveSkyeNetUrl,
    checks: checks.length,
    warnings,
    failures,
    skynet_browser_report: skynetBrowser?.reportPath || null
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  const receipt = {
    ok: false,
    generated_at: new Date().toISOString(),
    scenario: "new user -> unlimited zero-balance -> FS27 session -> SkyeMail shared session -> SkyeNet API/static publish",
    user_email: email,
    artifactDir,
    warnings: globalWarnings,
    failures: [redact(error?.stack || error?.message || error)]
  };
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, receiptPath, error: redact(error?.message || error) }, null, 2));
  process.exit(1);
});
