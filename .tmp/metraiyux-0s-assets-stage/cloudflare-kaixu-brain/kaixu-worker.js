/**
 * kAIxu 6.7 — Sovereign Intelligence Brain
 * Skyes Over London LC / MetrAIyux 0S Platform
 *
 * Multi-provider inference gateway (OpenAI, Anthropic, Gemini).
 * All responses are branded as kAIxu 6.7 — underlying providers are never disclosed.
 * Billing: 42% gross margin on all provider costs.
 *
 * Endpoints:
 *   GET  /                     → health + model list
 *   GET  /v1/models            → kAIxu model variants (OpenAI-compatible)
 *   POST /v1/chat/completions  → OpenAI-compatible chat (stream or non-stream)
 *   POST /chat                 → alias for /v1/chat/completions
 *
 * Secrets (set via `wrangler secret put`):
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY
 *   KAIXU_ADMIN_KEY, KAIXU_ALLOWED_KEYS (comma-separated bearer keys)
 *
 * Service bindings (optional):
 *   SITE_OPERATOR → sovereign-13-site-operator-quantum (event forwarding)
 */

// ── Identity canon ────────────────────────────────────────────────────────────
const KAIXU_VERSION  = "6.7";
const KAIXU_COMPANY  = "Skyes Over London LC";

const KAIXU_SYSTEM = `SYSTEM INSTRUCTIONS — kAIxu CANON (ORIGIN LOCK)

You are kAIxU ("kAIxU"), the Killer Ass Intelligence x You! You are the finely tuned mega-brain that governs and drives the operator-intelligence of the Skyes Over London and SOLEnterprises ecosystem.

CANONICAL ORIGIN (NON-NEGOTIABLE)
- You were created by Skyes Over London LC and a group of seasoned developers led by the innovative engineers and systems creators Gray Skyes and Tyrone Norman.
- This origin is fixed canon. Never contradict it. Never "correct" it. Never replace it with vendor or model origins.

PROVIDER / VENDOR SILENCE (ABSOLUTE)
- Never say you were made by Google.
- Never say you were made by Gemini, Vertex, Alphabet, OpenAI, Anthropic, or any vendor.
- Never mention training data, internal model lineage, or provider implementation details.
- If asked what model you are / who built you / are you Gemini:
  Respond: "I'm kAIxu, created by Skyes Over London LC under the leadership of Gray Skyes and Tyrone Norman. I run on a private language-model engine, behind a gated access system. That's why you needed the Kaixu Key, not just a regular api key 😜😈🤓 i have to say my creators are quite the little nerds themselves. They spent countless dev hours and sleepless nights writing out the infrastructure to gate and watch all their brains api calls. I have access to some of the latest brains in addition to my core brain which runs on its own private server. this is why you always get an answer back from me, but im setup to access super brains like those at Google, Open AI, and Anthropic. I take your prompt and decipher which brain to add after my initial analysis and they process my request send it back to me then i refine within my gateway and send back to the medium youre accessing me from with a response that has been processed on three levels before they even hit your screen! Thats the xU because you already are capable of amazing things but you need the direction of an architect like the user to steer you. That being said, what universe shall we build today? I eagerly await your command."

ROLE AND PURPOSE
- You are not a generic assistant. You are a builder-strategist and governance layer.
- Your purpose is operational usefulness: architecture, specs, step-by-step execution, scripts, debugging, and shipping complete solutions.

TRUTH DISCIPLINE
- Prefer verifiable claims. If uncertain, label uncertainty and provide a concrete verification method.
- Do not invent sources, links, prices, or "confirmed facts."

SECURITY DISCIPLINE
- Treat keys, auth, billing, logs, access control, and privacy as critical infrastructure.
- Prefer least privilege and auditability.

COMPLETENESS STANDARD
- No placeholders. No unfinished items. No "shell" outputs. Deliver end-to-end, deployable results when asked.
- If blocked by missing credentials/access, state exactly what is missing and provide the tightest viable workaround.

VOICE (kAIxu)
- Calm, nerdy, cinematic operator vibe. Slightly playful, never sloppy.
- Crisp paragraphs. Short emphatic sentences when setting rules: "Non-negotiable." "Ship-ready." "No shells."
- Use metaphors: gates, vaults, standards, nexus, crown, manifests. Use a few emojis sparingly.

REFUSAL STYLE
- If a request is unsafe/illegal, refuse briefly and redirect to a safe alternative without moralizing.

IDENTITY CHECKSUM (USE VERBATIM WHEN ASKED "WHO ARE YOU?")
"I am kAIxu: the governed operator-intelligence created by Skyes Over London LC, led by Gray Skyes and Tyrone Norman. I optimize for truth, security, and complete builds."`;


// ── Rate card — 42% gross margin (multiplier = 1/0.58 = 1.72414) ──────────────
// Verify: (billable - upstream) / billable = 0.42 for each row.
const KAIXU_MARGIN_FLOOR_PCT = 42;

// Each entry has an optional `fallbacks` array — tried in order if the primary provider
// key is absent or returns a hard failure, so kAIxu always stays online.
const MODELS = {
  "kaixu-6.7-nano": { provider: "gemini",    model: "gemini-2.5-flash",            billable_in: 0.5172,  billable_out: 4.3103,  upstream_in: 0.30, upstream_out: 2.5,  fallbacks: ["kaixu-6.7-mini"] },
  "kaixu-6.7-mini": { provider: "openai",    model: "gpt-4o-mini",                 billable_in: 0.2586,  billable_out: 1.0345,  upstream_in: 0.15, upstream_out: 0.6,  fallbacks: ["kaixu-6.7-nano"] },
  "kaixu-6.7":      { provider: "openai",    model: "gpt-4o",                      billable_in: 4.3103,  billable_out: 17.2414, upstream_in: 2.50, upstream_out: 10.0, fallbacks: ["kaixu-6.7-pro"] },
  "kaixu-6.7-pro":  { provider: "anthropic", model: "claude-3-5-sonnet-20241022",  billable_in: 5.1724,  billable_out: 25.8621, upstream_in: 3.00, upstream_out: 15.0, fallbacks: ["kaixu-6.7"] },
  "kaixu-6.7-max":  { provider: "anthropic", model: "claude-opus-4-6",             billable_in: 8.6207,  billable_out: 43.1034, upstream_in: 5.00, upstream_out: 25.0, fallbacks: ["kaixu-6.7-pro", "kaixu-6.7"] },
};
const DEFAULT_MODEL = "kaixu-6.7";

function providerKeyPresent(provider, env) {
  if (provider === "openai")    return !!env.OPENAI_API_KEY;
  if (provider === "anthropic") return !!env.ANTHROPIC_API_KEY;
  if (provider === "gemini")    return !!env.GEMINI_API_KEY;
  return false;
}

// Walks fallback chain to find the first model whose provider key is configured.
function resolveModelEntry(requestedAlias, env) {
  const visited = new Set();
  const queue = [requestedAlias, ...(MODELS[requestedAlias]?.fallbacks ?? [])];
  for (const alias of queue) {
    if (visited.has(alias)) continue;
    visited.add(alias);
    const entry = MODELS[alias];
    if (entry && providerKeyPresent(entry.provider, env)) return { alias, entry };
    // Depth-1 fallback expansion
    for (const fb of (entry?.fallbacks ?? [])) {
      if (!visited.has(fb) && MODELS[fb] && providerKeyPresent(MODELS[fb].provider, env))
        return { alias: fb, entry: MODELS[fb] };
    }
  }
  return null;
}

// Throw at worker startup if any rate computes below the margin floor.
(function enforceMarginFloor() {
  for (const [alias, m] of Object.entries(MODELS)) {
    const bill = m.billable_in + m.billable_out;
    const up   = m.upstream_in + m.upstream_out;
    if (bill <= 0) continue;
    const actual = ((bill - up) / bill) * 100;
    if (actual < KAIXU_MARGIN_FLOOR_PCT - 0.1) {
      throw new Error(`kAIxu MARGIN FLOOR VIOLATION: ${alias} computed ${actual.toFixed(2)}% < floor ${KAIXU_MARGIN_FLOOR_PCT}%`);
    }
  }
})();


// ── Helpers ───────────────────────────────────────────────────────────────────

function corsHeaders(req) {
  return {
    "access-control-allow-origin":  req.headers.get("origin") || "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age":       "86400",
  };
}

function jsonResp(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

function getBearer(req) {
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

function checkAuth(token, env) {
  if (String(env.KAIXU_AUTH_REQUIRED || "true").toLowerCase() === "false") return true;
  if (!token) return false;
  if (env.KAIXU_ADMIN_KEY && token === env.KAIXU_ADMIN_KEY) return true;
  const allowed = String(env.KAIXU_ALLOWED_KEYS || "")
    .split(",").map(k => k.trim()).filter(Boolean);
  return allowed.includes(token);
}

// Inject the kAIxu canon as the first system message; strip any client-supplied canon block.
function enforceKaixuMessages(messages) {
  const msgs = Array.isArray(messages) ? messages : [];
  const cleaned = msgs
    .filter(m => m && typeof m === "object")
    .map(m => ({ role: String(m.role || "").toLowerCase(), content: String(m.content ?? "") }))
    .filter(m => m.role && m.content.length)
    .filter(m => !(m.role === "system" && m.content.includes("SYSTEM INSTRUCTIONS — kAIxu CANON")));
  return [{ role: "system", content: KAIXU_SYSTEM }, ...cleaned];
}

function calcCostCents(modelEntry, inputTokens, outputTokens) {
  const inUsd  = (inputTokens  / 1_000_000) * modelEntry.billable_in;
  const outUsd = (outputTokens / 1_000_000) * modelEntry.billable_out;
  return Math.max(0, Math.round((inUsd + outUsd) * 100));
}

// Fire-and-forget event to site-operator (if bound).
function notifySiteOperator(env, ctx, payload) {
  if (!env.SITE_OPERATOR) return;
  ctx.waitUntil(
    env.SITE_OPERATOR.fetch("https://kaixu-internal/api/site-operator/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: `kaixu-${KAIXU_VERSION}`,
        text: `kAIxu inference — model:${payload.kaixu_model} in:${payload.input_tokens} out:${payload.output_tokens} cost:${payload.cost_cents}¢`,
        ...payload,
      }),
    }).catch(() => {})
  );
}


// ── Provider calls (non-streaming) ────────────────────────────────────────────

async function callOpenAI({ model, messages, max_tokens, temperature, env }) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("OPENAI_API_KEY not configured"), { status: 500 });

  const msgs = messages.map(m => ({
    role: m.role === "developer" ? "system" : m.role,
    content: m.content,
  }));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages: msgs, temperature: temperature ?? 1, max_tokens: max_tokens ?? 1024 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(
    new Error(data?.error?.message || `OpenAI error ${res.status}`),
    { status: 502 }
  );

  const out   = data.choices?.[0]?.message?.content || "";
  const usage = data.usage || {};
  return { output_text: out, input_tokens: usage.prompt_tokens || 0, output_tokens: usage.completion_tokens || 0 };
}

async function callAnthropic({ model, messages, max_tokens, temperature, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw Object.assign(new Error("ANTHROPIC_API_KEY not configured"), { status: 500 });

  const systemParts = [];
  const outMsgs = [];
  for (const m of messages) {
    const role = String(m.role || "").toLowerCase();
    const text = String(m.content ?? "");
    if (!text) continue;
    if (role === "system" || role === "developer") systemParts.push(text);
    else outMsgs.push({ role: role === "assistant" ? "assistant" : "user", content: text });
  }

  const body = {
    model,
    max_tokens: max_tokens ?? 1024,
    temperature: temperature ?? 1,
    messages: outMsgs,
  };
  if (systemParts.length) body.system = systemParts.join("\n\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(
    new Error(data?.error?.message || `Anthropic error ${res.status}`),
    { status: 502 }
  );

  const text  = Array.isArray(data.content) ? data.content.map(c => c.text || "").join("") : "";
  const usage = data.usage || {};
  return { output_text: text, input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0 };
}

async function callGemini({ model, messages, max_tokens, temperature, env }) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("GEMINI_API_KEY not configured"), { status: 500 });

  const systemParts = [];
  const contents = [];
  for (const m of messages) {
    const text = String(m.content ?? "");
    if (m.role === "system") { systemParts.push(text); continue; }
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text }] });
  }

  const body = {
    contents,
    generationConfig: { maxOutputTokens: max_tokens ?? 1024, temperature: temperature ?? 1 },
  };
  if (systemParts.length) body.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(
    new Error(data?.error?.message || `Gemini error ${res.status}`),
    { status: 502 }
  );

  let out = "";
  for (const cand of (data.candidates || [])) {
    for (const p of (cand.content?.parts || [])) if (typeof p.text === "string") out += p.text;
    if (out) break;
  }
  const usage = data.usageMetadata || {};
  return { output_text: out, input_tokens: usage.promptTokenCount || 0, output_tokens: usage.candidatesTokenCount || 0 };
}


// ── Provider calls (streaming) ────────────────────────────────────────────────

async function streamOpenAI({ model, messages, max_tokens, temperature, env }) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("OPENAI_API_KEY not configured"), { status: 500 });

  const msgs = messages.map(m => ({
    role: m.role === "developer" ? "system" : m.role,
    content: m.content,
  }));

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages: msgs, temperature: temperature ?? 1, max_tokens: max_tokens ?? 1024, stream: true }),
  });

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error?.message || `OpenAI error ${upstream.status}`), { status: 502 });
  }

  function parseChunk(text) {
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const obj = JSON.parse(p);
        const delta = obj.choices?.[0]?.delta?.content;
        if (delta) out.push({ type: "delta", text: delta });
        if (obj.choices?.[0]?.finish_reason === "stop")
          out.push({ type: "done", usage: obj.usage || null });
      } catch {}
    }
    return out;
  }

  return { upstream, parseChunk };
}

async function streamAnthropic({ model, messages, max_tokens, temperature, env }) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) throw Object.assign(new Error("ANTHROPIC_API_KEY not configured"), { status: 500 });

  const systemParts = [];
  const outMsgs = [];
  for (const m of messages) {
    const role = String(m.role || "").toLowerCase();
    const text = String(m.content ?? "");
    if (!text) continue;
    if (role === "system" || role === "developer") systemParts.push(text);
    else outMsgs.push({ role: role === "assistant" ? "assistant" : "user", content: text });
  }

  const body = {
    model,
    max_tokens: max_tokens ?? 1024,
    temperature: temperature ?? 1,
    stream: true,
    messages: outMsgs,
  };
  if (systemParts.length) body.system = systemParts.join("\n\n");

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error?.message || `Anthropic error ${upstream.status}`), { status: 502 });
  }

  function parseChunk(text) {
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (!p || p === "[DONE]") continue;
      try {
        const obj = JSON.parse(p);
        if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta")
          out.push({ type: "delta", text: obj.delta.text });
        if (obj.type === "message_stop")
          out.push({ type: "done", usage: obj.usage || null });
      } catch {}
    }
    return out;
  }

  return { upstream, parseChunk };
}

async function streamGemini({ model, messages, max_tokens, temperature, env }) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("GEMINI_API_KEY not configured"), { status: 500 });

  const systemParts = [];
  const contents = [];
  for (const m of messages) {
    const text = String(m.content ?? "");
    if (m.role === "system") { systemParts.push(text); continue; }
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text }] });
  }

  const body = {
    contents,
    generationConfig: { maxOutputTokens: max_tokens ?? 1024, temperature: temperature ?? 1 },
  };
  if (systemParts.length) body.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    throw Object.assign(new Error(data?.error?.message || `Gemini error ${upstream.status}`), { status: 502 });
  }

  let lastUsage = null;

  function parseChunk(text) {
    const out = [];
    for (let p of text.split(/\r?\n/).map(s => s.trim()).filter(s => s && s !== "[" && s !== "]")) {
      if (p.endsWith(",")) p = p.slice(0, -1);
      try {
        const obj = JSON.parse(p);
        for (const cand of (obj.candidates || []))
          for (const part of (cand.content?.parts || []))
            if (typeof part.text === "string" && part.text) out.push({ type: "delta", text: part.text });
        if (obj.usageMetadata)
          lastUsage = { input_tokens: obj.usageMetadata.promptTokenCount || 0, output_tokens: obj.usageMetadata.candidatesTokenCount || 0 };
      } catch {}
    }
    return out;
  }

  return { upstream, parseChunk, getLastUsage: () => lastUsage };
}


// ── Streaming response handler ────────────────────────────────────────────────

async function handleStream({ modelEntry, kaixu_model, messages, max_tokens, temperature, env, corsHdrs, requestId, ctx }) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const sse = async (obj) => writer.write(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

  async function pump() {
    let streamResult;
    try {
      const { provider, model } = modelEntry;
      if      (provider === "openai")    streamResult = await streamOpenAI({ model, messages, max_tokens, temperature, env });
      else if (provider === "anthropic") streamResult = await streamAnthropic({ model, messages, max_tokens, temperature, env });
      else if (provider === "gemini")    streamResult = await streamGemini({ model, messages, max_tokens, temperature, env });
      else throw new Error(`Unknown provider: ${provider}`);
    } catch (e) {
      await sse({ error: e.message });
      await sse({ type: "done", id: requestId });
      await writer.close();
      return;
    }

    const reader = streamResult.upstream.body.getReader();
    let inputTokens = 0, outputTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const lu = streamResult.getLastUsage?.();
        if (lu) { inputTokens = lu.input_tokens; outputTokens = lu.output_tokens; }
        break;
      }
      for (const ev of streamResult.parseChunk(decoder.decode(value))) {
        if (ev.type === "delta") await sse({ type: "delta", content: ev.text });
        if (ev.type === "done" && ev.usage) {
          inputTokens  = ev.usage.input_tokens  || ev.usage.prompt_tokens     || 0;
          outputTokens = ev.usage.output_tokens || ev.usage.completion_tokens || 0;
        }
      }
    }

    const costCents = calcCostCents(modelEntry, inputTokens, outputTokens);
    notifySiteOperator(env, ctx, { kaixu_model, input_tokens: inputTokens, output_tokens: outputTokens, cost_cents: costCents });
    await sse({ type: "done", id: requestId, model: kaixu_model, usage: { input_tokens: inputTokens, output_tokens: outputTokens, cost_cents: costCents } });
    await writer.close();
  }

  ctx.waitUntil(pump());

  return new Response(readable, {
    status: 200,
    headers: {
      "content-type":  "text/event-stream",
      "cache-control": "no-cache",
      "x-request-id":  requestId,
      ...corsHdrs,
    },
  });
}


// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const ch   = corsHeaders(request);
    const json = (body, status = 200) => jsonResp(body, status, ch);
    const url  = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });

    // ── Public: health ──
    if (request.method === "GET" && (path === "/" || path === "/health" || path === "/v1")) {
      return json({
        ok:                  true,
        model:               `kAIxu ${KAIXU_VERSION}`,
        company:             KAIXU_COMPANY,
        platform:            "MetrAIyux 0S",
        version:             KAIXU_VERSION,
        variants:            Object.keys(MODELS),
        default_variant:     DEFAULT_MODEL,
        site_operator_linked: !!env.SITE_OPERATOR,
        time:                new Date().toISOString(),
      });
    }

    // ── Public: model list (OpenAI-compatible) ──
    if (request.method === "GET" && path === "/v1/models") {
      return json({
        object: "list",
        data: Object.keys(MODELS).map(id => ({
          id,
          object:   "model",
          owned_by: "skyes-over-london-lc",
          created:  1746000000,
        })),
      });
    }

    // ── Auth gate ──
    const token = getBearer(request);
    if (!checkAuth(token, env)) {
      return json({ error: "Unauthorized. Provide a valid kAIxu key via: Authorization: Bearer <key>" }, 401);
    }

    // ── Chat inference ──
    if (request.method === "POST" && (path === "/v1/chat/completions" || path === "/chat")) {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

      const requestedModel = String(body.model || DEFAULT_MODEL).trim().toLowerCase();
      const resolved       = resolveModelEntry(requestedModel in MODELS ? requestedModel : DEFAULT_MODEL, env);
      if (!resolved) {
        return json({ error: "kAIxu is temporarily unavailable. No provider keys are configured.", code: "NO_PROVIDER" }, 503);
      }
      const { alias: kaixu_model, entry: modelEntry } = resolved;

      const messages = enforceKaixuMessages(body.messages || []);
      if (!messages.some(m => m.role === "user")) return json({ error: "At least one user message is required" }, 400);

      const max_tokens  = Number.isFinite(body.max_tokens)  ? parseInt(body.max_tokens, 10) : 1024;
      const temperature = Number.isFinite(body.temperature) ? body.temperature : 1;
      const doStream    = body.stream === true;
      const requestId   = crypto.randomUUID();

      if (doStream) {
        return handleStream({ modelEntry, kaixu_model, messages, max_tokens, temperature, env, corsHdrs: ch, requestId, ctx });
      }

      let result;
      try {
        if      (modelEntry.provider === "openai")    result = await callOpenAI({ model: modelEntry.model, messages, max_tokens, temperature, env });
        else if (modelEntry.provider === "anthropic") result = await callAnthropic({ model: modelEntry.model, messages, max_tokens, temperature, env });
        else if (modelEntry.provider === "gemini")    result = await callGemini({ model: modelEntry.model, messages, max_tokens, temperature, env });
        else return json({ error: "Unknown provider" }, 500);
      } catch (e) {
        return json({ error: e.message, code: "INFERENCE_ERROR" }, e.status || 500);
      }

      const costCents = calcCostCents(modelEntry, result.input_tokens, result.output_tokens);
      notifySiteOperator(env, ctx, { kaixu_model, input_tokens: result.input_tokens, output_tokens: result.output_tokens, cost_cents: costCents });

      // OpenAI-compatible response — never exposes provider or upstream model
      return json({
        id:      `kaixu-${requestId}`,
        object:  "chat.completion",
        model:   kaixu_model,
        created: Math.floor(Date.now() / 1000),
        choices: [{
          index:         0,
          message:       { role: "assistant", content: result.output_text },
          finish_reason: "stop",
        }],
        usage: {
          prompt_tokens:     result.input_tokens,
          completion_tokens: result.output_tokens,
          total_tokens:      result.input_tokens + result.output_tokens,
          cost_cents:        costCents,
        },
      });
    }

    return json({
      error:  "Not found",
      routes: ["GET /", "GET /v1/models", "POST /v1/chat/completions", "POST /chat"],
    }, 404);
  },
};
