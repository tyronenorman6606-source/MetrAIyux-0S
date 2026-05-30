import { TextDecoder } from "util";
import { publicProviderRuntime, runZeroOsProviderAction } from "./providerRuntime.js";

function configError(message, hint) {
  const err = new Error("Skyes Over London model lane is not configured.");
  err.code = "CONFIG";
  err.status = 500;
  err.hint = "Ask an admin to enable this Skyes Over London model lane.";
  err.private = { message, hint };
  return err;
}


function safeJsonString(v, max = 12000) {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (!s) return "";
    if (s.length <= max) return s;
    return s.slice(0, max) + `…(+${s.length - max} chars)`;
  } catch {
    const s = String(v || "");
    if (s.length <= max) return s;
    return s.slice(0, max) + `…(+${s.length - max} chars)`;
  }
}

function upstreamError(provider, res, body) {
  const status = res?.status || 0;
  const reqId =
    res?.headers?.get?.("x-request-id") ||
    res?.headers?.get?.("request-id") ||
    res?.headers?.get?.("x-amzn-requestid") ||
    null;

  // Try to surface the most meaningful provider message.
  let msg = "";
  try {
    msg = body?.error?.message || body?.error?.type || body?.message || "";
  } catch {}
  const err = new Error(`Skyes Over London engine error${status ? ` ${status}` : ""}`);
  err.code = "UPSTREAM_ERROR";
  err.status = 502;
  err.private = { provider, message: msg || "" };
  err.upstream = {
    provider,
    status,
    request_id: reqId,
    body: safeJsonString(body)
  };
  return err;
}

const BUILTIN_MODEL_ALIASES = Object.freeze({
  "KAIXU_PRIME6_7": { provider: "openai", model: "gpt-4o-mini" },
  "KAIXU_PRIME7": { provider: "openai", model: "gpt-4o" },
  "KAIXU_6_7_NANO": { provider: "gemini", model: "gemini-2.5-flash" },
  "KAIXU_6_7_MINI": { provider: "openai", model: "gpt-4o-mini" },
  "KAIXU_6_7": { provider: "openai", model: "gpt-4o" },
  "KAIXU_6_7_PRO": { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
  "KAIXU_6_7_MAX": { provider: "anthropic", model: "claude-opus-4-6" },
  "KAIXU_6_7_EMBED": { provider: "gemini", model: "gemini-embedding-001" },
  "KAIXU_FLASH": { provider: "gemini", model: "gemini-2.5-flash" },
  "KAIXU_DEEP": { provider: "anthropic", model: "claude-3-5-sonnet-20241022" },
  "KAIXU_CODE": { provider: "openai", model: "gpt-4o" },
  "KAIXU_VISION": { provider: "openai", model: "gpt-4o" },
  "KAIXU_EMBED": { provider: "gemini", model: "gemini-embedding-001" }
});

function aliasToken(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function buildEnvAliasMap() {
  const out = new Map();
  for (const [k, v] of Object.entries(process.env || {})) {
    const m = /^KAIXU_ALIAS_(.+)_(PROVIDER|MODEL)$/.exec(k);
    if (!m) continue;
    const token = m[1];
    const field = m[2].toLowerCase();
    const cur = out.get(token) || {};
    cur[field] = String(v || "").trim();
    out.set(token, cur);
  }
  return out;
}

const ENV_MODEL_ALIASES = buildEnvAliasMap();

function lookupModelAlias(requestedModel) {
  const token = aliasToken(requestedModel);
  if (!token) return null;

  const envAlias = ENV_MODEL_ALIASES.get(token);
  if (envAlias && envAlias.model) return envAlias;

  return BUILTIN_MODEL_ALIASES[token] || null;
}

export function resolveProvider(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "openai" || v === "anthropic" || v === "gemini") return v;
  if (v === "skyes over london" || v === "skyes over london lc" || v === "skyes" || v === "kaixu") return "openai";
  return "openai";
}

// Backward-compatible alias used elsewhere in the codebase.
export function normalizeProviderName(input) {
  return resolveProvider(input);
}

export function resolveUpstreamTarget(provider, requestedModel) {
  const fallbackProvider = resolveProvider(provider);
  const fallbackModel = String(requestedModel || "").trim();

  const alias = lookupModelAlias(fallbackModel);
  if (!alias) {
    return {
      provider: fallbackProvider,
      model: fallbackModel,
      alias_key: null
    };
  }

  return {
    provider: resolveProvider(alias.provider || fallbackProvider),
    model: String(alias.model || fallbackModel).trim(),
    alias_key: fallbackModel
  };
}

export function resolveUpstreamModel(provider, requestedModel) {
  return resolveUpstreamTarget(provider, requestedModel).model;
}

/**
 * Non-stream calls
 */
export async function callOpenAI({ model, messages, max_tokens, temperature }) {
  const chatMessages = Array.isArray(messages) ? messages.map(m => ({
    role: m.role || "user",
    content: String(m.content ?? "")
  })) : [];
  const runtime = await runZeroOsProviderAction({
    provider_id: "openai",
    action: "openai.chat.complete",
    app_id: "skygatefs27-gateway",
    usage_lane: "fs27.gateway.chat",
    payload: {
      model,
      messages: chatMessages,
      temperature: typeof temperature === "number" ? temperature : 1,
      max_tokens: typeof max_tokens === "number" ? max_tokens : 1024
    }
  });
  const receipt = runtime?.receipt || null;
  if (!runtime.ok) {
    if (receipt?.error === "openai_not_configured") throw configError("OPENAI_API_KEY not configured", "Set OPENAI_API_KEY in the 0S provider environment.");
    const err = new Error("Skyes Over London engine error");
    err.code = "UPSTREAM_ERROR";
    err.status = runtime.status || 502;
    err.private = { provider: "openai", message: receipt?.error || "" };
    err.upstream = { provider: "openai", status: runtime.status || 0, request_id: null, body: safeJsonString(receipt?.provider_result || {}) };
    throw err;
  }
  const result = receipt?.provider_result || {};
  const usage = result.usage || {};
  return {
    output_text: result.message_content || "",
    input_tokens: usage.prompt_tokens || usage.input_tokens || 0,
    output_tokens: usage.completion_tokens || usage.output_tokens || 0,
    raw: result,
    provider_runtime: publicProviderRuntime(receipt)
  };
}

export async function callAnthropic({ model, messages, max_tokens, temperature }) {
  const runtime = await runZeroOsProviderAction({
    provider_id: "anthropic",
    action: "anthropic.chat.complete",
    app_id: "skygatefs27-gateway",
    usage_lane: "fs27.gateway.chat",
    payload: {
      model,
      messages: Array.isArray(messages) ? messages.map(m => ({ role: m.role || "user", content: String(m.content ?? "") })) : [],
      temperature: typeof temperature === "number" ? temperature : 1,
      max_tokens: typeof max_tokens === "number" ? max_tokens : 1024
    }
  });
  const receipt = runtime?.receipt || null;
  if (!runtime.ok) {
    if (receipt?.error === "anthropic_not_configured") throw configError("ANTHROPIC_API_KEY not configured", "Set ANTHROPIC_API_KEY in the 0S provider environment.");
    const err = new Error("Skyes Over London engine error");
    err.code = "UPSTREAM_ERROR";
    err.status = runtime.status || 502;
    err.private = { provider: "anthropic", message: receipt?.error || "" };
    err.upstream = { provider: "anthropic", status: runtime.status || 0, request_id: null, body: safeJsonString(receipt?.provider_result || {}) };
    throw err;
  }
  const result = receipt?.provider_result || {};
  const usage = result.usage || {};
  return { output_text: result.message_content || "", input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0, raw: result, provider_runtime: publicProviderRuntime(receipt) };
}

export async function callGemini({ model, messages, max_tokens, temperature }) {
  const runtime = await runZeroOsProviderAction({
    provider_id: "gemini",
    action: "gemini.chat.complete",
    app_id: "skygatefs27-gateway",
    usage_lane: "fs27.gateway.chat",
    payload: {
      model,
      messages: Array.isArray(messages) ? messages.map(m => ({ role: m.role || "user", content: String(m.content ?? "") })) : [],
      temperature: typeof temperature === "number" ? temperature : 1,
      max_tokens: typeof max_tokens === "number" ? max_tokens : 1024
    }
  });
  const receipt = runtime?.receipt || null;
  if (!runtime.ok) {
    if (receipt?.error === "gemini_not_configured") throw configError("GEMINI_API_KEY not configured", "Set GEMINI_API_KEY in the 0S provider environment.");
    const err = new Error("Skyes Over London engine error");
    err.code = "UPSTREAM_ERROR";
    err.status = runtime.status || 502;
    err.private = { provider: "gemini", message: receipt?.error || "" };
    err.upstream = { provider: "gemini", status: runtime.status || 0, request_id: null, body: safeJsonString(receipt?.provider_result || {}) };
    throw err;
  }
  const result = receipt?.provider_result || {};
  const usage = result.usage || {};
  return { output_text: result.message_content || "", input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0, raw: result, provider_runtime: publicProviderRuntime(receipt) };
}

/**
 * Gemini Embedding — calls /v1beta/models/{model}:embedContent
 * Returns { embedding: number[], input_tokens: number }
 */
export async function callGeminiEmbed({ model, input, taskType, title, outputDimensionality }) {
  const runtime = await runZeroOsProviderAction({
    provider_id: "gemini",
    action: "gemini.embedding.create",
    app_id: "skygatefs27-gateway",
    usage_lane: "fs27.gateway.embedding",
    payload: { model, input: String(input ?? ""), taskType, title, outputDimensionality }
  });
  const receipt = runtime?.receipt || null;
  if (!runtime.ok) {
    if (receipt?.error === "gemini_not_configured") throw configError("GEMINI_API_KEY not configured", "Set GEMINI_API_KEY in the 0S provider environment.");
    throw upstreamError("gemini", { status: runtime.status || 502, headers: new Headers() }, receipt?.provider_result || { error: receipt?.error || "gemini_embedding_failed" });
  }
  const result = receipt?.provider_result || {};
  return { embedding: Array.isArray(result.embedding) ? result.embedding : [], dimensions: Number(result.dimensions || 0), input_tokens: result.usage?.input_tokens || Math.max(1, Math.ceil(String(input ?? "").length / 4)), provider_runtime: publicProviderRuntime(receipt) };
}

/**
 * Stream adapters:
 * Each returns { upstream: Response, parseChunk(text)->{deltaText, done, usage?}[] }.
 * We normalize into SSE events for the client: "delta" and "done".
 */

export async function streamOpenAI({ model, messages, max_tokens, temperature }) {
  const result = await callOpenAI({ model, messages, max_tokens, temperature });
  const usage = {
    input_tokens: result.input_tokens || 0,
    output_tokens: result.output_tokens || 0
  };
  const encoder = new TextEncoder();
  const payload = [
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: result.output_text || "" })}`,
    `data: ${JSON.stringify({ type: "response.completed", response: { usage } })}`,
    ""
  ].join("\n");
  const upstream = new Response(encoder.encode(payload), {
    status: 200,
    headers: { "content-type": "text/event-stream; charset=utf-8" }
  });

  // Parse OpenAI SSE lines: data: {json}
  function parseSseLines(chunkText) {
    const out = [];
    const lines = chunkText.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload);
        const t = obj.type || "";
        if (t.includes("output_text.delta") && typeof obj.delta === "string") out.push({ type: "delta", text: obj.delta });
        if (t === "response.completed" || t === "response.complete" || t.includes("response.completed")) {
          const usage = obj.response?.usage || obj.usage || {};
          out.push({ type: "done", usage: { input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0 } });
        }
      } catch {}
    }
    return out;
  }

  return { upstream, parse: parseSseLines };
}

export async function streamAnthropic({ model, messages, max_tokens, temperature }) {
  const result = await callAnthropic({ model, messages, max_tokens, temperature });
  const usage = { input_tokens: result.input_tokens || 0, output_tokens: result.output_tokens || 0 };
  const encoder = new TextEncoder();
  const payload = [
    `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: result.output_text || "" } })}`,
    `data: ${JSON.stringify({ type: "message_stop", usage })}`,
    ""
  ].join("\n");
  const upstream = new Response(encoder.encode(payload), {
    status: 200,
    headers: { "content-type": "text/event-stream; charset=utf-8" }
  });

  function parseSseLines(chunkText) {
    const out = [];
    const lines = chunkText.split(/\r?\n/);
    // Anthropic SSE uses "event:" and "data:" lines; we parse data json
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload);
        const t = obj.type || "";
        if (t === "content_block_delta" && obj.delta?.type === "text_delta" && typeof obj.delta.text === "string") {
          out.push({ type: "delta", text: obj.delta.text });
        }
        if (t === "message_delta" && obj.usage) {
          // intermediate usage sometimes
        }
        if (t === "message_stop" || t === "message_end" || t === "message_complete") {
          const usage = obj.usage || {};
          out.push({ type: "done", usage: { input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0 } });
        }
      } catch {}
    }
    return out;
  }

  return { upstream, parse: parseSseLines };
}

export async function streamGemini({ model, messages, max_tokens, temperature }) {
  const result = await callGemini({ model, messages, max_tokens, temperature });
  const encoder = new TextEncoder();
  const payload = `${JSON.stringify({
    candidates: [{ content: { parts: [{ text: result.output_text || "" }] } }],
    usageMetadata: { promptTokenCount: result.input_tokens || 0, candidatesTokenCount: result.output_tokens || 0 }
  })}\n`;
  const upstream = new Response(encoder.encode(payload), {
    status: 200,
    headers: { "content-type": "application/x-ndjson; charset=utf-8" }
  });

  // Gemini stream is typically newline-delimited JSON objects (not SSE).
  function parseNdjson(chunkText) {
    const out = [];
    const parts = chunkText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      try {
        const obj = JSON.parse(p);
        // Extract delta-ish text if present
        const candidates = Array.isArray(obj.candidates) ? obj.candidates : [];
        for (const cand of candidates) {
          const content = cand?.content;
          if (content?.parts) {
            for (const part of content.parts) {
              if (typeof part.text === "string" && part.text) out.push({ type: "delta", text: part.text });
            }
          }
        }
        const usage = obj.usageMetadata;
        if (usage && (usage.promptTokenCount || usage.candidatesTokenCount)) {
          // no reliable "done" marker; we will emit done at stream end using last-seen usage
          out.push({ type: "usage", usage: { input_tokens: usage.promptTokenCount || 0, output_tokens: usage.candidatesTokenCount || 0 } });
        }
      } catch {}
    }
    return out;
  }

  return { upstream, parse: parseNdjson, isNdjson: true };
}
