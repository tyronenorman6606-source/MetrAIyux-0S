import { wrap } from "./_lib/wrap.js";
import { json, buildCors } from "./_lib/http.js";
import { q } from "./_lib/db.js";
import { BUILD_ID, SCHEMA_VERSION, KAIXU_SYSTEM_HASH } from "./_lib/kaixu.js";
import { PUBLIC_PROVIDER_NAME } from "./_lib/publicLabels.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const out = {
    ok: true,
    ts: new Date().toISOString(),
    build: { id: BUILD_ID, schema: SCHEMA_VERSION, kaixu_system_hash: KAIXU_SYSTEM_HASH },
    gate: {
      provider: PUBLIC_PROVIDER_NAME,
      model_lanes_ready: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY),
      identity_ready: !!process.env.JWT_SECRET,
      mirror_ready: !!(process.env.SKYGATE_EVENT_MIRROR_SECRET || process.env.SKYGATEFS27_EVENT_MIRROR_SECRET)
    },
    db: { ok: false }
  };

  try {
    const r = await q("select now() as now");
    out.db = { ok: true, now: r.rows?.[0]?.now || null };
  } catch (e) {
    out.db = { ok: false, error: "Gate database check unavailable" };
  }

  return json(200, out, cors);
});
