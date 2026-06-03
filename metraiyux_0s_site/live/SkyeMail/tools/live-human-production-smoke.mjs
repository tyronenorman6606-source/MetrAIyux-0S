#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveZeroOsGateAuth } from "../../../../tools/lib/zero-os-gate-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skymailRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(skymailRoot, "../../..");
const stamp = new Date().toISOString();
const safeStamp = stamp.replace(/[:.]/g, "-");
const base = String(process.env.SKYEMAIL_LIVE_BASE || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
const zeroOsBase = String(process.env.ZERO_OS_LIVE_BASE || process.env.ZERO_OS_BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
const outDir = path.join(repoRoot, "test-artifacts", "skyemail-human-production-smoke", safeStamp);
const latestPath = path.join(repoRoot, "test-artifacts", "skyemail-human-production-smoke-latest.json");
const preferredMailbox = String(process.env.SKYEMAIL_SMOKE_MAILBOX || "darthom-intelligence@solenterprises.org").trim().toLowerCase();
const fallbackMailbox = String(process.env.SKYEMAIL_SMOKE_FALLBACK_MAILBOX || "metraiyux-0s@solenterprises.org").trim().toLowerCase();

const receipt = {
  ok: false,
  generated_at: stamp,
  base,
  selected_mailbox: null,
  provisioned_mailboxes: [],
  checks: [],
  artifacts: {
    latest: latestPath,
    directory: outDir,
  },
};

function clean(value = "", max = 800) {
  return String(value || "").trim().slice(0, max);
}

function publicErrorBody(body) {
  if (!body || typeof body !== "object") return body == null ? null : clean(body, 1000);
  const out = {};
  for (const key of ["ok", "error", "message", "code", "status", "payment_status", "approval_status", "provider_warning", "provider_fallback"]) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function record(name, result = {}) {
  const item = {
    name,
    ok: result.ok !== false,
    status: result.status || 0,
    ms: result.ms || 0,
    detail: result.detail || null,
  };
  receipt.checks.push(item);
  console.error(`[skyemail-smoke] ${item.ok ? "ok" : "fail"} ${name} status=${item.status} ms=${item.ms}`);
  return item;
}

async function timedFetch(url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, init);
  const ms = Math.round(performance.now() - started);
  const contentType = response.headers.get("content-type") || "";
  let body = null;
  if (contentType.includes("json")) body = await response.json().catch(() => null);
  else if (contentType.startsWith("text/") || contentType.includes("html")) body = await response.text().catch(() => "");
  else body = await response.arrayBuffer().catch(() => null);
  return { response, ms, contentType, body };
}

function makeApi(token, mailboxRef) {
  return async function api(pathname, options = {}) {
    const url = pathname.startsWith("http") ? pathname : `${base}${pathname}`;
    const headers = {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "x-skymail-mailbox-email": mailboxRef.current || "",
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    };
    const { response, ms, contentType, body } = await timedFetch(url, {
      method: options.method || (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const ok = response.ok || (options.allowStatuses || []).includes(response.status);
    record(options.name || pathname, {
      ok,
      status: response.status,
      ms,
      detail: ok ? null : publicErrorBody(body),
    });
    if (!ok && options.expectOk !== false) {
      const message = typeof body?.error === "string" ? body.error : `HTTP ${response.status} for ${pathname}`;
      throw Object.assign(new Error(message), { status: response.status, body });
    }
    return { status: response.status, ok, contentType, body, ms };
  };
}

async function publicPage(pathname, required = []) {
  const url = `${base}${pathname}`;
  const { response, ms, body } = await timedFetch(url, { headers: { accept: "text/html,*/*;q=0.8" } });
  const html = String(body || "");
  const forbidden = [
    "kAIxu" + "Gateway" + "13",
    "Gateway" + "13",
    "AI " + "Assistant " + "(",
    "kaixu" + "gateway" + "13ee.netlify.app",
    "Private implementation source is not public",
  ];
  const missing = required.filter((needle) => !html.includes(needle));
  const foundForbidden = forbidden.filter((needle) => html.includes(needle));
  const ok = response.ok && !missing.length && !foundForbidden.length;
  record(`public ${pathname}`, {
    ok,
    status: response.status,
    ms,
    detail: ok ? null : { missing, forbidden: foundForbidden },
  });
  assert.equal(ok, true, `${pathname} public surface failed`);
  return html;
}

function chooseMailbox(mailboxes = []) {
  const active = mailboxes.filter((item) => !["released", "offboarded", "disabled"].includes(String(item.status || "").toLowerCase()));
  const byEmail = new Map(active.map((item) => [String(item.mailbox_email || "").toLowerCase(), item]));
  return byEmail.get(preferredMailbox)
    || byEmail.get(fallbackMailbox)
    || active.find((item) => String(item.provider || "").toLowerCase() === "zoho")
    || active[0]
    || null;
}

function pngOneByOneB64() {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForMessage(api, subject) {
  let lastList = null;
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const sync = await api("/mail-sync", { name: `mail sync poll ${attempt}`, method: "POST", body: { limit: 50 } });
    assertNoProviderFallback(sync.body, `mail sync poll ${attempt}`);
    const list = await api(`/gmail-list?label=INBOX&max=10&q=${encodeURIComponent(subject)}`, { name: `inbox search poll ${attempt}` });
    lastList = list.body;
    assertNoProviderFallback(lastList, `inbox search poll ${attempt}`);
    const matches = (lastList?.items || []).filter((message) => String(message.subject || "").includes(subject));
    const providerMatch = matches.find((message) => String(message.id || "").startsWith("zoho:"));
    const item = providerMatch || matches[0];
    if (item?.id) return item;
    await delay(lastList?.provider_fallback ? 15000 : 10000);
  }
  throw Object.assign(new Error(`Live inbound message was not found for subject: ${subject}`), { lastList });
}

function messageText(message = {}) {
  return [
    message.snippet,
    message.body?.text,
    message.body?.html,
    message.headers?.subject,
  ].map((item) => String(item || "")).join("\n");
}

function assertNoProviderFallback(body = {}, label = "provider check") {
  assert.notEqual(body?.provider_fallback, true, `${label} used cached provider fallback instead of live provider data.`);
}

function findMessage(items = [], target = {}) {
  const subject = String(target.subject || "");
  const id = String(target.id || "");
  return items.find((item) => (id && String(item.id || "") === id) || (subject && String(item.subject || "").includes(subject))) || null;
}

async function pollListState(api, pathname, { name, target, shouldExist, attempts = 8, delayMs = 3500 } = {}) {
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await api(pathname, { name: attempt === 1 ? name : `${name} retry ${attempt}` });
    last = result.body;
    assertNoProviderFallback(last, `${name} retry ${attempt}`);
    const exists = Boolean(findMessage(last?.items || [], target));
    if (exists === shouldExist) return result;
    await delay(delayMs);
  }
  throw Object.assign(new Error(`${name} did not reach expected message state.`), { last });
}

async function zeroOsRouteProof(gate, pathname, name) {
  const url = `${zeroOsBase}${pathname}`;
  const { response, ms, contentType, body } = await timedFetch(url, {
    redirect: "manual",
    headers: {
      accept: "application/json,text/html,*/*;q=0.8",
      authorization: `Bearer ${gate.token}`,
      "x-admin-token": gate.token,
      "x-free99-gate-session": gate.token,
      "x-skye-gate-session": gate.token,
      "x-skygate-session": gate.token,
      "x-skye-platform": "skymail",
      "x-skye-usage-lane": "skyemail-human-production-smoke",
    },
  });
  const bodyText = typeof body === "string" ? body : JSON.stringify(body || {});
  const ok = response.status >= 200 && response.status < 300 && bodyText.length > 20 && !/not found|unauthorized|forbidden|method not allowed/i.test(bodyText.slice(0, 500));
  record(name, {
    ok,
    status: response.status,
    ms,
    detail: ok ? { content_type: contentType, bytes: bodyText.length } : { content_type: contentType, body: clean(bodyText, 300) },
  });
  assert.equal(ok, true, `${name} failed`);
}

async function zeroOsApi(gate, pathname, { name, method = "GET", body = undefined, allowStatuses = [] } = {}) {
  const url = `${zeroOsBase}${pathname}`;
  const { response, ms, body: data } = await timedFetch(url, {
    method,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${gate.token}`,
      "x-admin-token": gate.token,
      "x-free99-gate-session": gate.token,
      "x-skye-gate-session": gate.token,
      "x-skygate-session": gate.token,
      "x-skye-platform": "skymail",
      "x-skye-usage-lane": "skyemail-human-production-smoke",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const ok = response.ok || allowStatuses.includes(response.status);
  record(name || pathname, {
    ok,
    status: response.status,
    ms,
    detail: ok ? null : publicErrorBody(data),
  });
  if (!ok) throw Object.assign(new Error(`${name || pathname} failed`), { status: response.status, body: data });
  return { status: response.status, ok, body: data, ms };
}

await fs.mkdir(outDir, { recursive: true });

try {
  await publicPage("/", ["SkyeMail Brain ready"]);
  await publicPage("/brain.html", ["SkyeMail Brain", "FS27 metered Brain"]);
  await publicPage("/ai.html", ["SkyeMail Brain"]);
  await publicPage("/sent.html");
  await publicPage("/monitoring.html", ["API Telemetry"]);
  await publicPage("/keys.html", ["SkyeMail Key"]);
  await publicPage("/send.html");
  await publicPage("/pricing.html", ["FS27 Brain"]);

  const gate = await resolveZeroOsGateAuth({ envFiles: [path.join(repoRoot, ".env"), path.join(skymailRoot, ".env")] });
  record("shared gate token resolved", { ok: gate.ok, status: gate.ok ? 200 : 401, detail: { source: gate.credential?.source || "missing", key: gate.credential?.key || "" } });
  assert.equal(gate.ok, true, "No shared SkyeGate FS27 bearer could be resolved.");

  const mailboxRef = { current: "" };
  const api = makeApi(gate.token, mailboxRef);

  const firstAuth = await api("/auth-fs27-session", { name: "bind FS27 session", method: "POST", body: {} });
  const selected = chooseMailbox(firstAuth.body?.mailboxes || []);
  assert.ok(selected?.mailbox_email, "No provisioned SkyeMail mailbox is available for this gate session.");
  mailboxRef.current = selected.mailbox_email;
  receipt.selected_mailbox = selected.mailbox_email;
  receipt.provisioned_mailboxes = (firstAuth.body?.mailboxes || []).map((item) => ({
    mailbox_email: item.mailbox_email,
    provider: item.provider,
    status: item.status,
    provisioning_status: item.provisioning_status,
    selected: String(item.mailbox_email || "").toLowerCase() === String(selected.mailbox_email || "").toLowerCase(),
  }));
  if (preferredMailbox && preferredMailbox !== String(selected.mailbox_email || "").toLowerCase()) {
    record("preferred mailbox availability", {
      ok: false,
      status: 404,
      detail: { preferred_mailbox: preferredMailbox, selected_mailbox: selected.mailbox_email },
    });
    throw new Error(`Preferred mailbox ${preferredMailbox} is not selectable in this gate session.`);
  }
  await api("/auth-fs27-session", { name: "bind selected mailbox", method: "POST", body: { mailbox_email: selected.mailbox_email } });
  const smokeId = safeStamp.replace(/[^0-9A-Za-z-]/g, "");
  const marker = `SKYEMAIL_HUMAN_SMOKE_${smokeId}`;

  const me = await api("/auth-me", { name: "auth me route" });
  assert.ok(me.body?.handle, "Auth me did not return a SkyeMail handle.");
  const vaultPack = await api("/vault-export", { name: "vault export route" });
  assert.equal(vaultPack.body?.schema, "SMV_VAULT_PACK_V1", "Vault export did not return the expected pack schema.");
  if ((me.body?.keys || []).some((key) => key.is_active)) {
    const publicKey = await api(`/public-key?handle=${encodeURIComponent(me.body.handle)}`, { name: "public key route" });
    assert.ok(String(publicKey.body?.rsa_public_key_pem || "").includes("BEGIN PUBLIC KEY"), "Public key route did not expose an active public key.");
  }
  const gmailWatch = await api("/gmail-watch", { name: "gmail watch compatibility route", method: "POST" });
  assert.equal(gmailWatch.body?.provider, "skyemail", "Gmail watch compatibility route should report the SkyeMail production lane.");
  const googleStart = await api("/google-oauth-start?mode=json&next=dashboard.html", { name: "google oauth compatibility route", allowStatuses: [410], expectOk: false });
  assert.equal(googleStart.status, 410, "Google OAuth compatibility route should be disabled on the SkyeMail production phase.");

  const domains = await api("/mailbox-domains", { name: "mailbox provider domains" });
  assert.equal(domains.body?.provider, "skyemail", "SkyeMail live mailbox provider must present SkyeMail publicly.");
  assert.equal(Boolean(domains.body?.provider_configured?.mail_api_ready || domains.body?.provider_configured?.configured), true, "SkyeMail mail API is not ready.");

  const mailboxes = await api("/mailboxes-list", { name: "mailboxes list" });
  assert.ok((mailboxes.body?.mailboxes || mailboxes.body?.items || []).length > 0, "No mailbox list returned.");

  const savedContactEmail = `skyemail-smoke-${smokeId.toLowerCase()}@example.com`;
  const savedContact = await api("/contacts-save", {
    name: "save contact and sync to 0S",
    method: "POST",
    body: {
      email: savedContactEmail,
      full_name: "SkyeMail Smoke Contact",
      company: "SkyeMail Production Smoke",
      notes: `Live smoke contact ${marker}`,
      favorite: true,
    },
  });
  assert.equal(savedContact.body?.ok, true, "Contact save failed.");
  assert.equal(savedContact.body?.downstream?.crm?.ok, true, "Contact did not sync to AE FlowPro CRM.");
  assert.equal(savedContact.body?.downstream?.saas?.ok, true, "Contact did not sync to SaaS action telemetry.");

  const gameEvent = await api("/mail-game-event", {
    name: "SkyeMail game ledger event",
    method: "POST",
    body: {
      action: "proof_loop",
      event_key: `live-smoke:${smokeId}`,
      xp: 7,
      badge_ids: ["proof-runner"],
      mailbox: mailboxRef.current,
      meta: {
        receipt_backed: true,
        receiptId: smokeId,
        surfaceId: "skyemail-live-smoke",
        marker,
      },
    },
  });
  assert.equal(gameEvent.body?.ok, true, "SkyeMail game ledger event was not accepted.");
  const gameSummary = await api("/mail-game-summary?limit=5", { name: "SkyeMail game ledger summary" });
  assert.equal(gameSummary.body?.ok, true, "SkyeMail game ledger summary failed.");
  assert.ok(Number(gameSummary.body?.summary?.total_events || 0) >= 1, "SkyeMail game ledger summary did not include stored events.");

  const brain = await api("/mail-brain", { name: "brain status" });
  assert.equal(brain.body?.model_mode, "fs27_metered_v1", "Brain status is not advertising FS27 metered mode.");
  assert.equal(brain.body?.ai?.direct_provider_fallback_enabled, false, "Brain direct-provider fallback must be disabled.");
  assert.equal(brain.body?.ai?.fs27_brain?.runtime_owner, "fs27_skygate", "Brain runtime must be owned by SkyeGate FS27.");
  assert.equal(brain.body?.ai?.fs27_brain?.skyemail_runtime_catalog, false, "SkyeMail must not expose its own AI runtime catalog.");

  const plans = await api("/mail-brain-plans", { name: "brain plans" });
  const planIds = new Set((plans.body?.plans || []).map((plan) => plan.id));
  for (const id of ["skyemail-ai-response-starter", "skyemail-ai-response-plus", "skyemail-managed-ai-inbox"]) {
    assert.ok(planIds.has(id), `Missing Brain plan ${id}`);
  }
  assert.equal([...planIds].some((id) => String(id).startsWith("relay13-")), false, "Legacy relay13 plan id exposed in SkyEmail plan catalog.");

  const aiRun = await api("/mail-brain", {
    name: "brain FS27 metered call",
    method: "POST",
    body: {
      action: "ask_brain",
      source: "skyemail-human-production-smoke",
      model_mode: "fs27_metered_v1",
      prompt: "Return one concise readiness sentence for this SkyeMail mailbox smoke test.",
    },
  });
  assert.equal(aiRun.body?.model_mode, "fs27_metered_v1", "Brain metered call did not return FS27 metered mode.");
  assert.equal(aiRun.body?.ai?.latest?.provider, "fs27_skygate_brain", "Brain call did not return SkyeGate FS27 provider.");
  assert.equal(aiRun.body?.ai?.latest?.provider_path, "fs27-gateway-chat", "Brain call did not route through FS27 gateway-chat.");
  assert.ok(clean(aiRun.body?.output?.summary), "Brain call returned no summary.");

  const autoBrain = await api("/mail-brain", {
    name: "brain paid automation send-and-monitor",
    method: "POST",
    body: {
      action: "send_and_monitor",
      source: "skyemail-human-production-smoke",
      model_mode: "fs27_metered_v1",
      automation_consent: true,
      to: selected.mailbox_email,
      subject: `SkyeMail managed automation smoke ${safeStamp}`,
      prompt: "Routine smoke confirmation. Reply in one short professional paragraph that the SkyeMail managed automation lane is live and monitoring replies.",
    },
  });
  assert.equal(autoBrain.body?.send_result?.provider, "zoho", "Paid automation Send + Monitor did not send through SkyeMail production mail.");
  assert.ok(autoBrain.body?.send_result?.message_id, "Paid automation Send + Monitor did not return a sent message id.");
  assert.equal(autoBrain.body?.output?.automation?.sent_mode, "paid_auto_send", "Paid automation did not use the auto-send entitlement lane.");
  assert.ok(autoBrain.body?.monitor?.id, "Paid automation Send + Monitor did not create a reply monitor.");

  const checkout = await api("/mail-brain-checkout", {
    name: "SkyePay live checkout",
    method: "POST",
    body: {
      plan_id: "skyemail-ai-response-starter",
      customer_email: selected.mailbox_email,
      customer_name: "SkyeMail Smoke",
      company_name: "SkyeMail Production Smoke",
      acceptance_surface: "skyemail-human-production-smoke",
      success_url: `${base}/brain.html?smoke=success`,
      cancel_url: `${base}/brain.html?smoke=cancel`,
    },
  });
  const checkoutId = checkout.body?.checkout?.id || checkout.body?.id;
  const checkoutUrl = checkout.body?.checkout?.url || checkout.body?.url || "";
  const runtime = checkout.body?.checkout?.provider_runtime || checkout.body?.provider_runtime || {};
  assert.match(checkoutId || "", /^cs_live_/, "SkyePay did not return a live Stripe checkout session id.");
  assert.match(checkoutUrl, /^https:\/\/checkout\.stripe\.com\//, "SkyePay checkout URL is not Stripe Checkout.");
  assert.equal(runtime.provider_id, "stripe", "SkyePay checkout did not use Stripe provider runtime.");
  assert.equal(runtime.executed, true, "SkyePay checkout provider runtime did not execute.");
  assert.equal(runtime.provider_call_made, true, "SkyePay checkout did not make a provider call.");

  const subject = `SkyeMail human smoke ${smokeId}`;
  const send = await api("/mail-send", {
    name: "send self mail with image attachment",
    method: "POST",
    body: {
      from_alias: selected.mailbox_email,
      to: selected.mailbox_email,
      subject,
      message: `This is the live SkyeMail human smoke marker ${marker}.`,
      html: `<p>This is the live SkyeMail human smoke marker <strong>${marker}</strong>.</p>`,
      attachments: [
        {
          filename: "skyemail-smoke-pixel.png",
          mime_type: "image/png",
          content_type: "image/png",
          data_b64: pngOneByOneB64(),
        },
      ],
    },
  });
  assert.equal(String(send.body?.provider || ""), "zoho", "Self-send must prove SkyeMail inbox parity for the selected mailbox.");
  assert.ok(send.body?.message_id, "Self-send did not return a SkyeMail message id.");

  const found = await pollForMessage(api, subject);
  let detail = null;
  let attachments = [];
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    detail = await api(`/gmail-get?id=${encodeURIComponent(found.id)}`, { name: attempt === 1 ? "open received message" : `open received message attachment retry ${attempt}` });
    attachments = detail.body?.message?.attachments || [];
    if (messageText(detail.body?.message).includes(marker) && attachments.length >= 1) break;
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  assert.ok(messageText(detail.body?.message).includes(marker), "Received message body did not contain the smoke marker.");
  assert.ok(attachments.length >= 1, "Received message did not expose attachments.");
  const imageAttachment = attachments.find((item) => /^image\//i.test(item.mime_type || "") || /\.png$/i.test(item.filename || "")) || attachments[0];
  assert.ok(imageAttachment?.url, "Received attachment did not expose a fetch URL.");
  const attachmentUrl = imageAttachment.url.startsWith("http") ? imageAttachment.url : `${base}${imageAttachment.url}`;
  const attachmentFetch = await timedFetch(attachmentUrl, {
    headers: {
      authorization: `Bearer ${gate.token}`,
      "x-skymail-mailbox-email": mailboxRef.current,
    },
  });
  record("fetch received attachment", {
    ok: attachmentFetch.response.ok,
    status: attachmentFetch.response.status,
    ms: attachmentFetch.ms,
    detail: { content_type: attachmentFetch.contentType, bytes: attachmentFetch.body?.byteLength || 0 },
  });
  assert.equal(attachmentFetch.response.ok, true, "Attachment fetch failed.");
  assert.ok((attachmentFetch.body?.byteLength || 0) > 0, "Attachment fetch returned an empty body.");
  const attachmentBytes = new Uint8Array(attachmentFetch.body || new ArrayBuffer(0));
  assert.ok(attachmentBytes.length >= 8, "Attachment body is too small to be a valid image.");
  if (/png/i.test(imageAttachment.filename || imageAttachment.mime_type || attachmentFetch.contentType)) {
    assert.deepEqual([...attachmentBytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "Fetched image attachment is not a PNG payload.");
  }

  const thread = await api(`/gmail-thread-get?id=${encodeURIComponent(found.thread_id || found.id)}`, { name: "open received thread" });
  const threadMessages = thread.body?.thread?.messages || [];
  assert.ok(threadMessages.length >= 1, "Thread open returned no messages.");
  assert.ok(threadMessages.some((message) => messageText(message).includes(marker) || String(message.subject || message.headers?.subject || "").includes(subject)), "Thread open did not include the expected smoke message.");

  await api("/gmail-modify", { name: "star message", method: "POST", body: { ids: [found.id], addLabelIds: ["STARRED"] } });
  await pollListState(api, `/gmail-list?label=STARRED&max=10&q=${encodeURIComponent(subject)}`, {
    name: "verify starred message readback",
    target: { id: found.id, subject },
    shouldExist: true,
  });
  await api("/gmail-modify", { name: "unstar message", method: "POST", body: { ids: [found.id], removeLabelIds: ["STARRED"] } });
  await pollListState(api, `/gmail-list?label=STARRED&max=10&q=${encodeURIComponent(subject)}`, {
    name: "verify unstarred message readback",
    target: { id: found.id, subject },
    shouldExist: false,
    attempts: 10,
    delayMs: 5000,
  });
  await api("/gmail-message-trash", { name: "trash message", method: "POST", body: { ids: [found.id], action: "trash" } });
  await pollListState(api, `/gmail-list?label=TRASH&max=50`, {
    name: "verify trashed message readback",
    target: { id: found.id, subject },
    shouldExist: true,
    attempts: 10,
    delayMs: 5000,
  });
  await api("/gmail-message-trash", { name: "restore message", method: "POST", body: { ids: [found.id], action: "untrash" } });
  await pollListState(api, `/gmail-list?label=INBOX&max=50`, {
    name: "verify restored message readback",
    target: { id: found.id, subject },
    shouldExist: true,
    attempts: 10,
    delayMs: 5000,
  });

  const draftSubject = `SkyeMail draft smoke ${smokeId}`;
  const draft = await api("/gmail-draft-save", {
    name: "save SkyeMail native draft",
    method: "POST",
    body: {
      from_alias: selected.mailbox_email,
      to: selected.mailbox_email,
      subject: draftSubject,
      text: `Draft smoke ${marker}`,
      html: `<p>Draft smoke ${marker}</p>`,
    },
  });
  assert.equal(draft.body?.provider_native, true, "Draft save was not provider-native.");
  const draftId = draft.body?.draft?.id || draft.body?.draft?.draft_id;
  assert.ok(draftId, "Draft save did not return a draft id.");
  const gotDraft = await api(`/gmail-draft-get?id=${encodeURIComponent(draftId)}`, { name: "get SkyeMail native draft" });
  assert.equal(gotDraft.body?.provider, "zoho", "Draft get was not SkyeMail production.");
  assert.equal(gotDraft.body?.draft?.subject, draftSubject, "Draft get subject did not match saved draft.");
  assert.ok(messageText(gotDraft.body?.draft).includes(marker), "Draft get body did not include the saved smoke marker.");
  await api("/gmail-draft-delete", { name: "delete SkyeMail native draft", method: "POST", body: { ids: [draftId] } });
  const deletedDraft = await api(`/gmail-draft-get?id=${encodeURIComponent(draftId)}`, { name: "verify SkyeMail native draft deleted", allowStatuses: [404], expectOk: false });
  assert.equal(deletedDraft.status, 404, "Deleted draft was still readable after deletion.");

  const actions = await api("/mail-os-actions", { name: "0S actions catalog" });
  assert.ok(Number(actions.body?.counts?.total || 0) > 0, "0S actions catalog is empty.");
  assert.ok((actions.body?.actions || []).some((action) => action.id === "skydocxmax-editor"), "SkyeDocxMax action is missing from SkyeMail 0S actions.");
  const health = await api("/mail-os-health", { name: "0S action health", allowStatuses: [207] });
  assert.equal(health.body?.ok, true, "0S action health has failed routes.");
  await zeroOsRouteProof(gate, "/founder-command/apps/0s-calendar/", "0S live calendar app route");
  await zeroOsRouteProof(gate, "/api/founder-command/calendar", "0S live calendar API route");
  await zeroOsRouteProof(gate, "/api/founder-command/actions", "0S live command API route");
  await zeroOsRouteProof(gate, "/Marketing-Made-Easy/SkyeDocxMax/editor", "0S live SkyeDocxMax route");
  await zeroOsRouteProof(gate, "/Free99/apps/sovereigndocs/packet-builder/", "0S live SovereignDocs route");
  const handoff = await api("/mail-os-handoff", {
    name: "0S SkyeDocxMax handoff",
    method: "POST",
    body: {
      action_id: "skydocxmax-editor",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(handoff.body?.ok, true, "0S handoff did not create a packet.");
  assert.ok(handoff.body?.mailHandoffPacket?.packetId, "0S handoff did not return packet id.");
  const docxDirect = handoff.body?.mailHandoffPacket?.summary?.directApi;
  assert.equal(docxDirect?.ok, true, "SkyeDocxMax handoff did not create a persisted SovereignDocs editor session.");
  const docxHandoffId = docxDirect?.result?.handoff?.id;
  assert.ok(docxHandoffId, "SkyeDocxMax direct handoff did not return a SovereignDocs handoff id.");
  const docxReturn = await zeroOsApi(gate, "/api/sovereigndocs/editor/skye-docx-max/return", {
    name: "0S SkyeDocxMax return into SovereignDocs vault",
    method: "POST",
    body: {
      handoffId: docxHandoffId,
      title: `Returned ${subject}`,
      html: `<h1>Returned ${subject}</h1><p>${marker}</p>`,
      text: `Returned ${subject}\n\n${marker}`,
      metadata: {
        source: "skyemail-human-production-smoke",
        mailbox: selected.mailbox_email,
        message_id: found.id,
      },
    },
  });
  assert.equal(docxReturn.body?.ok, true, "SkyeDocxMax return did not persist.");
  assert.ok(docxReturn.body?.document?.id, "SkyeDocxMax return did not create a SovereignDocs document.");
  assert.ok(docxReturn.body?.vaultRecord?.id, "SkyeDocxMax return did not create a SovereignDocs vault record.");

  const calendarHandoff = await api("/mail-os-handoff", {
    name: "0S Calendar direct handoff",
    method: "POST",
    body: {
      action_id: "founder-calendar",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `Calendar follow-up ${subject}`,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(calendarHandoff.body?.ok, true, "Calendar handoff did not create a packet.");
  assert.equal(calendarHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "Calendar handoff did not execute the Founder Calendar API.");
  assert.match(calendarHandoff.body?.mailHandoffPacket?.summary?.directApi?.result?.record?.id || "", /^foundercal/, "Calendar handoff did not return a Founder Calendar record.");

  const crmHandoff = await api("/mail-os-handoff", {
    name: "0S CRM direct command bridge handoff",
    method: "POST",
    body: {
      action_id: "crm-pipeline",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `CRM intake ${subject}`,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(crmHandoff.body?.ok, true, "CRM handoff did not create a packet.");
  assert.equal(crmHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "CRM handoff did not execute Command Bridge event recording.");
  assert.equal(crmHandoff.body?.mailHandoffPacket?.summary?.directApi?.result?.receipt?.status, "executed", "CRM direct Command Bridge receipt was not executed.");

  const aeContactHandoff = await api("/mail-os-handoff", {
    name: "0S AE Flow contact capture handoff",
    method: "POST",
    body: {
      action_id: "ae-flow-contact-capture",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `AE Flow contact ${subject}`,
        from: found.from || savedContactEmail,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(aeContactHandoff.body?.ok, true, "AE Flow contact handoff did not create a packet.");
  assert.equal(aeContactHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "AE Flow contact handoff did not execute direct CRM capture.");
  assert.ok(aeContactHandoff.body?.mailHandoffPacket?.summary?.directApi?.result?.captured?.contact_id, "AE Flow contact handoff did not return a contact id.");

  const aeJournalHandoff = await api("/mail-os-handoff", {
    name: "0S AE Flow journal handoff",
    method: "POST",
    body: {
      action_id: "ae-flow-workflow-journal",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `AE Flow journal ${subject}`,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(aeJournalHandoff.body?.ok, true, "AE Flow journal handoff did not create a packet.");
  assert.equal(aeJournalHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "AE Flow journal handoff did not execute direct journal write.");

  const saasHandoff = await api("/mail-os-handoff", {
    name: "0S SaaS action-event handoff",
    method: "POST",
    body: {
      action_id: "saas-customer-command",
      context: {
        mailbox: selected.mailbox_email,
        workspace_id: "metraiyux-0s",
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `SaaS command ${subject}`,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(saasHandoff.body?.ok, true, "SaaS handoff did not create a packet.");
  assert.equal(saasHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "SaaS handoff did not execute action-event.");
  assert.equal(saasHandoff.body?.mailHandoffPacket?.summary?.directApi?.result?.stored, true, "SaaS handoff did not store an event.");

  const commerceOrdersHandoff = await api("/mail-os-handoff", {
    name: "0S SkyeCommerce orders handoff",
    method: "POST",
    body: {
      action_id: "skyecommerce-orders",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `Commerce orders ${subject}`,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(commerceOrdersHandoff.body?.ok, true, "SkyeCommerce orders handoff did not create a packet.");
  assert.equal(commerceOrdersHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "SkyeCommerce orders handoff did not execute direct API.");
  assert.equal(commerceOrdersHandoff.body?.mailHandoffPacket?.summary?.directApi?.result?.event?.stored, true, "SkyeCommerce orders handoff did not persist the SkyeMail commerce event.");

  const commerceAnalyticsHandoff = await api("/mail-os-handoff", {
    name: "0S SkyeCommerce analytics handoff",
    method: "POST",
    body: {
      action_id: "skyecommerce-analytics",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `Commerce analytics ${subject}`,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(commerceAnalyticsHandoff.body?.ok, true, "SkyeCommerce analytics handoff did not create a packet.");
  assert.equal(commerceAnalyticsHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "SkyeCommerce analytics handoff did not execute direct API.");

  const pwaHandoff = await api("/mail-os-handoff", {
    name: "0S PWA Factory direct handoff",
    method: "POST",
    body: {
      action_id: "pwa-factory",
      context: {
        mailbox: selected.mailbox_email,
        message_id: found.id,
        thread_id: found.thread_id || found.id,
        subject: `PWA launch ${subject}`,
        from: found.from,
        to: selected.mailbox_email,
        snippet: found.snippet || marker,
      },
    },
  });
  assert.equal(pwaHandoff.body?.ok, true, "PWA handoff did not create a packet.");
  assert.equal(pwaHandoff.body?.mailHandoffPacket?.summary?.directApi?.ok, true, "PWA handoff did not execute the PWA Factory API.");
  assert.ok(pwaHandoff.body?.mailHandoffPacket?.summary?.directApi?.result?.manifest?.name, "PWA Factory direct handoff did not return a manifest.");

  const telemetry = await api("/telemetry-summary?days=7&limit=80", { name: "SkyeMail API telemetry summary" });
  assert.ok(Number(telemetry.body?.summary?.total_events || 0) > 0, "Telemetry summary did not report API events.");
  assert.ok((telemetry.body?.recent || []).some((event) => ["mail-brain", "mail-os-handoff", "gmail-get", "mail-send"].includes(event.route)), "Telemetry summary did not include expected route coverage.");

  receipt.ok = true;
} catch (error) {
  receipt.ok = false;
  receipt.error = {
    message: error?.message || String(error),
    status: error?.status || null,
    body: publicErrorBody(error?.body),
  };
  process.exitCode = 1;
} finally {
  receipt.completed_at = new Date().toISOString();
  await fs.writeFile(path.join(outDir, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    base: receipt.base,
    selected_mailbox: receipt.selected_mailbox,
    provisioned_mailbox_count: receipt.provisioned_mailboxes.length,
    passed_checks: receipt.checks.filter((item) => item.ok).length,
    failed_checks: receipt.checks.filter((item) => !item.ok).length,
    receipt: path.join(outDir, "receipt.json"),
    error: receipt.error?.message || null,
  }, null, 2));
}
