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

async function pollForMessage(api, subject) {
  let lastList = null;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    await api("/mail-sync", { name: `mail sync poll ${attempt}`, method: "POST", body: { limit: 50 } }).catch(() => null);
    const list = await api(`/gmail-list?label=INBOX&max=10&q=${encodeURIComponent(subject)}`, { name: `inbox search poll ${attempt}` });
    lastList = list.body;
    if (lastList?.provider_fallback) {
      throw new Error(`Inbox search fell back to cache during live-mail poll: ${lastList.provider_warning || "provider_fallback"}`);
    }
    const item = (lastList?.items || []).find((message) => String(message.subject || "").includes(subject));
    if (item?.id) return item;
    await new Promise((resolve) => setTimeout(resolve, 10000));
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

await fs.mkdir(outDir, { recursive: true });

try {
  await publicPage("/", ["SkyEmail Brain ready"]);
  await publicPage("/brain.html", ["SkyeMail Brain", "FS27 metered Brain"]);
  await publicPage("/ai.html", ["SkyEmail Brain"]);
  await publicPage("/sent.html");
  await publicPage("/pricing.html", ["FS27 Brain"]);

  const gate = await resolveZeroOsGateAuth({ envFiles: [path.join(skymailRoot, ".env")] });
  record("shared gate token resolved", { ok: gate.ok, status: gate.ok ? 200 : 401, detail: { source: gate.credential?.source || "missing", key: gate.credential?.key || "" } });
  assert.equal(gate.ok, true, "No shared FS27/SkyGate bearer could be resolved.");

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

  const domains = await api("/mailbox-domains", { name: "mailbox provider domains" });
  assert.equal(domains.body?.provider, "zoho", "SkyEmail live mailbox provider must be Zoho for this phase.");
  assert.equal(Boolean(domains.body?.provider_configured?.zohoApiReady || domains.body?.zohoApiReady), true, "Zoho API is not ready.");

  const mailboxes = await api("/mailboxes-list", { name: "mailboxes list" });
  assert.ok((mailboxes.body?.mailboxes || mailboxes.body?.items || []).length > 0, "No mailbox list returned.");

  const brain = await api("/mail-brain", { name: "brain status" });
  assert.equal(brain.body?.model_mode, "fs27_metered_v1", "Brain status is not advertising FS27 metered mode.");
  assert.equal(brain.body?.ai?.direct_provider_fallback_enabled, false, "Brain direct-provider fallback must be disabled.");
  assert.ok((brain.body?.ai?.models || []).includes("skyemail-brain-fast"), "SkyEmail Brain model catalog missing fast model.");

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
      model: "skyemail-brain-fast",
      prompt: "Return one concise readiness sentence for this SkyEmail mailbox smoke test.",
    },
  });
  assert.equal(aiRun.body?.model_mode, "fs27_metered_v1", "Brain metered call did not return FS27 metered mode.");
  assert.equal(aiRun.body?.ai?.latest?.provider, "fs27_skygate_brain", "Brain call did not return FS27/SkyGate provider.");
  assert.equal(aiRun.body?.ai?.latest?.provider_path, "fs27-gateway-chat", "Brain call did not route through FS27 gateway-chat.");
  assert.ok(clean(aiRun.body?.output?.summary), "Brain call returned no summary.");

  const checkout = await api("/mail-brain-checkout", {
    name: "SkyPay live checkout",
    method: "POST",
    body: {
      plan_id: "skyemail-ai-response-starter",
      customer_email: selected.mailbox_email,
      customer_name: "SkyEmail Smoke",
      company_name: "SkyEmail Production Smoke",
      acceptance_surface: "skyemail-human-production-smoke",
      success_url: `${base}/brain.html?smoke=success`,
      cancel_url: `${base}/brain.html?smoke=cancel`,
    },
  });
  const checkoutId = checkout.body?.checkout?.id || checkout.body?.id;
  const checkoutUrl = checkout.body?.checkout?.url || checkout.body?.url || "";
  const runtime = checkout.body?.checkout?.provider_runtime || checkout.body?.provider_runtime || {};
  assert.match(checkoutId || "", /^cs_live_/, "SkyPay did not return a live Stripe checkout session id.");
  assert.match(checkoutUrl, /^https:\/\/checkout\.stripe\.com\//, "SkyPay checkout URL is not Stripe Checkout.");
  assert.equal(runtime.provider_id, "stripe", "SkyPay checkout did not use Stripe provider runtime.");
  assert.equal(runtime.executed, true, "SkyPay checkout provider runtime did not execute.");
  assert.equal(runtime.provider_call_made, true, "SkyPay checkout did not make a provider call.");

  const smokeId = safeStamp.replace(/[^0-9A-Za-z-]/g, "");
  const subject = `SkyEmail human smoke ${smokeId}`;
  const marker = `SKYEMAIL_HUMAN_SMOKE_${smokeId}`;
  const send = await api("/mail-send", {
    name: "send self mail with image attachment",
    method: "POST",
    body: {
      from_alias: selected.mailbox_email,
      to: selected.mailbox_email,
      subject,
      message: `This is the live SkyEmail human smoke marker ${marker}.`,
      html: `<p>This is the live SkyEmail human smoke marker <strong>${marker}</strong>.</p><p><img src="cid:skyemail-smoke-pixel"></p>`,
      attachments: [
        {
          filename: "skyemail-smoke-pixel.png",
          mime_type: "image/png",
          content_type: "image/png",
          data_b64: pngOneByOneB64(),
        },
        {
          filename: "skyemail-smoke-readme.txt",
          mime_type: "text/plain",
          content_type: "text/plain",
          data_b64: Buffer.from(`SkyEmail live smoke ${marker}\n`, "utf8").toString("base64"),
        },
      ],
    },
  });
  assert.equal(send.body?.provider, "zoho", "Self-send did not use Zoho provider.");
  assert.ok(send.body?.message_id, "Self-send did not return a SkyeMail message id.");

  const found = await pollForMessage(api, subject);
  const detail = await api(`/gmail-get?id=${encodeURIComponent(found.id)}`, { name: "open received message" });
  assert.ok(messageText(detail.body?.message).includes(marker), "Received message body did not contain the smoke marker.");
  const attachments = detail.body?.message?.attachments || [];
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
    detail: { content_type: attachmentFetch.contentType },
  });
  assert.equal(attachmentFetch.response.ok, true, "Attachment fetch failed.");

  const thread = await api(`/gmail-thread-get?id=${encodeURIComponent(found.thread_id || found.id)}`, { name: "open received thread" });
  assert.ok((thread.body?.thread?.messages || []).length >= 1, "Thread open returned no messages.");

  await api("/gmail-modify", { name: "star message", method: "POST", body: { ids: [found.id], addLabelIds: ["STARRED"] } });
  await api("/gmail-modify", { name: "unstar message", method: "POST", body: { ids: [found.id], removeLabelIds: ["STARRED"] } });
  await api("/gmail-message-trash", { name: "trash message", method: "POST", body: { ids: [found.id], action: "trash" } });
  await api("/gmail-message-trash", { name: "restore message", method: "POST", body: { ids: [found.id], action: "untrash" } });

  const draftSubject = `SkyEmail draft smoke ${smokeId}`;
  const draft = await api("/gmail-draft-save", {
    name: "save Zoho draft",
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
  const gotDraft = await api(`/gmail-draft-get?id=${encodeURIComponent(draftId)}`, { name: "get Zoho draft" });
  assert.equal(gotDraft.body?.provider, "zoho", "Draft get was not Zoho-backed.");
  await api("/gmail-draft-delete", { name: "delete Zoho draft", method: "POST", body: { ids: [draftId] } });

  const actions = await api("/mail-os-actions", { name: "0S actions catalog" });
  assert.ok(Number(actions.body?.counts?.total || 0) > 0, "0S actions catalog is empty.");
  assert.ok((actions.body?.actions || []).some((action) => action.id === "skydocxmax-editor"), "SkyeDocxMax action is missing from SkyEmail 0S actions.");
  const health = await api("/mail-os-health", { name: "0S action health", allowStatuses: [207] });
  assert.equal(health.body?.ok, true, "0S action health has failed routes.");
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
