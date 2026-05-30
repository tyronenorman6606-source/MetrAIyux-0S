// netlify/functions/blob-store-pack.js
// P13.1 — Optional: store generated ZIP/PDF server-side using Netlify Blobs.
// This endpoint is OPTIONAL and will only work in environments where `@netlify/blobs` is available.
//
// Env:
//  - BLOBS_STORE (optional; default "blkaz-packs")
//
// Payload (JSON):
//  {
//    key: "string",              // required
//    content_type: "application/zip" | "application/pdf",
//    data_base64: "....",        // required (base64 payload)
//    meta: { ... }               // optional metadata
//  }

function mkHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type,authorization,x-skye-gate-session,x-skygate-session,x-free99-gate-session,x-kaixu-app,x-kaixu-build",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
}

function json(statusCode, body) {
  return { statusCode, headers: mkHeaders(), body: JSON.stringify(body) };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: mkHeaders(), body: "" };
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method Not Allowed" });
  const gate = await requireSharedGate(event);
  if (!gate.ok) return json(gate.statusCode, gate.body);

  let payload = {};
  try { payload = event.body ? JSON.parse(event.body) : {}; }
  catch { return json(400, { ok:false, error:"Invalid JSON body" }); }

  const key = String(payload.key || "").trim();
  const contentType = String(payload.content_type || "application/octet-stream");
  const b64 = String(payload.data_base64 || "");
  const meta = payload.meta || {};

  if (!key || !b64) return json(400, { ok:false, error:"Missing key or data_base64" });

  let getStore;
  try {
    ({ getStore } = await import("@netlify/blobs"));
  } catch (err) {
    return json(500, {
      ok: false,
      error: "Missing @netlify/blobs dependency. Deploy via Git/CLI where dependencies can be installed/bundled.",
      detail: String(err && err.message ? err.message : err)
    });
  }

  try {
    const storeName = process.env.BLOBS_STORE || "blkaz-packs";
    const store = getStore(storeName);

    const buf = Buffer.from(b64, "base64");
    await store.set(key, buf, { metadata: { contentType, ...meta } });

    return json(200, { ok:true, store: storeName, key, bytes: buf.length });
  } catch (err) {
    return json(500, { ok:false, error: String(err && err.message ? err.message : err) });
  }
}

function bearer(event) {
  const headers = event.headers || {};
  const raw = headers.authorization || headers.Authorization || headers["x-skye-gate-session"] || headers["x-skygate-session"] || headers["x-free99-gate-session"] || "";
  return String(raw || "").replace(/^Bearer(?:\s+|$)/i, "").trim();
}

async function requireSharedGate(event) {
  const token = bearer(event);
  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      body: {
        ok: false,
        error: "shared_gate_required",
        message: "BusinessLaunchGo artifact storage requires the shared 0S Gate session."
      }
    };
  }
  const origin = String(process.env.SKYGATEFS27_ORIGIN || process.env.SKYGATE_ORIGIN || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, "");
  const response = await fetch(`${origin}/auth-introspect`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ token })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.active !== true) {
    return {
      ok: false,
      statusCode: response.status || 401,
      body: {
        ok: false,
        error: "shared_gate_invalid",
        message: "The supplied 0S Gate session is not active.",
        skygate: data && typeof data === "object" ? { active: data.active === true, source: data.source || data.iss || null } : null
      }
    };
  }
  return { ok: true, data };
}
