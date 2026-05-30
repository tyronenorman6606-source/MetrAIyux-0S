import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin.js";
import { q } from "./_lib/db.js";
import { getDailyKeyCalls } from "./_lib/usageGates.js";

// Maps provider+model → kAIxu variant — same table as admin-pricing-catalog.
const KAIXU_MODEL_MAP = {
  "openai::gpt-4o-mini":                   "kaixu-6.7-mini",
  "openai::gpt-4o":                        "kaixu-6.7",
  "gemini::gemini-2.5-flash":              "kaixu-6.7-nano",
  "gemini::gemini-embedding-001":          "kaixu-6.7-embed",
  "anthropic::claude-3-5-sonnet-20241022": "kaixu-6.7-pro",
  "anthropic::claude-opus-4-6":            "kaixu-6.7-max",
};

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const admin = requireAdmin(req);
  if (!admin) return json(401, { error: "Unauthorized" }, cors);

  if (req.method !== "GET") return json(405, { error: "Method not allowed" }, cors);

  const url = new URL(req.url);
  const customer_id = url.searchParams.get("customer_id") ? parseInt(url.searchParams.get("customer_id"), 10) : null;
  if (!customer_id) return badRequest("Missing customer_id", cors);

  const month = (url.searchParams.get("month") || new Date().toISOString().slice(0, 7)).toString().slice(0, 7);

  const capRes = await q(
    `select monthly_cap_cents, email, plan_name, default_rpm_limit, default_rpd_limit,
            max_devices_per_key, require_install_id, vault_storage_mb, vault_file_limit,
            vault_workspace_limit, allowed_providers, allowed_models
     from customers where id=$1`,
    [customer_id]
  );
  if (capRes.rowCount === 0) return json(404, { error: "Customer not found" }, cors);

  const roll = await q(
    `select spent_cents, extra_cents, input_tokens, output_tokens, updated_at
     from monthly_usage where customer_id=$1 and month=$2`,
    [customer_id, month]
  );

  const events = await q(
    `select id, provider, model, input_tokens, output_tokens, cost_cents, platform_id, usage_lane, created_at
     from usage_events
     where customer_id=$1 and to_char(created_at at time zone 'UTC','YYYY-MM')=$2
     order by created_at desc
     limit 200`,
    [customer_id, month]
  );

  const perKey = await q(
    `select m.api_key_id as id, k.key_last4, k.label,
            m.spent_cents, m.input_tokens, m.output_tokens, m.calls, m.updated_at,
            k.rpm_limit, k.rpd_limit, k.max_devices, k.require_install_id
     from monthly_key_usage m
     join api_keys k on k.id = m.api_key_id
     where m.customer_id=$1 and m.month=$2
     order by m.spent_cents desc`,
    [customer_id, month]
  );
  const perKeyRows = await Promise.all(perKey.rows.map(async (row) => ({
    ...row,
    daily_calls_used: await getDailyKeyCalls(row.id),
    daily_call_limit: row.rpd_limit ?? capRes.rows[0].default_rpd_limit ?? null,
    rpm_limit: row.rpm_limit ?? capRes.rows[0].default_rpm_limit ?? null
  })));

  const perPlatform = await q(
    `select coalesce(platform_id, 'metraiyux-0s') as platform_id,
            coalesce(usage_lane, 'ai') as usage_lane,
            count(*)::int as calls,
            coalesce(sum(cost_cents),0)::int as cost_cents,
            coalesce(sum(input_tokens),0)::int as input_tokens,
            coalesce(sum(output_tokens),0)::int as output_tokens
     from usage_events
     where customer_id=$1 and to_char(created_at at time zone 'UTC','YYYY-MM')=$2
     group by coalesce(platform_id, 'metraiyux-0s'), coalesce(usage_lane, 'ai')
     order by cost_cents desc`,
    [customer_id, month]
  );

  const providerEvents = await q(
    `select id, source_app, workspace_id, customer_ref, client_ref, provider_id, action,
            usage_lane, quantity, estimated_cost_cents, billable, chargeback_ready,
            provider_call_made, receipt_id, event_ts, created_at
     from provider_usage_events
     where (gate_customer_id=$1 or customer_ref=$1::text)
       and to_char(created_at at time zone 'UTC','YYYY-MM')=$2
     order by created_at desc
     limit 200`,
    [customer_id, month]
  );

  const providerPlatform = await q(
    `select source_app, provider_id, usage_lane,
            count(*)::int as calls,
            coalesce(sum(quantity),0)::int as quantity,
            coalesce(sum(estimated_cost_cents),0)::int as estimated_cost_cents,
            bool_or(chargeback_ready) as chargeback_ready
     from provider_usage_events
     where (gate_customer_id=$1 or customer_ref=$1::text)
       and billable = true
       and to_char(created_at at time zone 'UTC','YYYY-MM')=$2
     group by source_app, provider_id, usage_lane
     order by estimated_cost_cents desc, calls desc`,
    [customer_id, month]
  );

  // Build kAIxu-branded event list (no provider names — safe to share with customer).
  const kaixuEvents = events.rows.map(e => ({
    id: e.id,
    kaixu_model: KAIXU_MODEL_MAP[`${e.provider}::${e.model}`] || "kaixu-gateway",
    input_tokens: e.input_tokens,
    output_tokens: e.output_tokens,
    cost_cents: e.cost_cents,
    created_at: e.created_at
  }));

  // Roll up kAIxu events by variant for a clean customer summary.
  const kaixuSummaryMap = new Map();
  for (const e of kaixuEvents) {
    const cur = kaixuSummaryMap.get(e.kaixu_model) || { kaixu_model: e.kaixu_model, calls: 0, input_tokens: 0, output_tokens: 0, cost_cents: 0 };
    cur.calls++;
    cur.input_tokens += e.input_tokens || 0;
    cur.output_tokens += e.output_tokens || 0;
    cur.cost_cents += e.cost_cents || 0;
    kaixuSummaryMap.set(e.kaixu_model, cur);
  }
  const kaixuSummary = [...kaixuSummaryMap.values()].sort((a, b) => b.cost_cents - a.cost_cents);

  return json(200, {
    customer: { id: customer_id, ...capRes.rows[0] },
    month,
    rollup: roll.rowCount ? roll.rows[0] : { spent_cents: 0, extra_cents: 0, input_tokens: 0, output_tokens: 0, updated_at: null },
    per_key: perKeyRows,
    per_platform: perPlatform.rows,
    provider_usage: {
      events: providerEvents.rows,
      per_platform: providerPlatform.rows,
      estimated_cost_cents: providerPlatform.rows.reduce((sum, row) => sum + Number(row.estimated_cost_cents || 0), 0)
    },
    // Admin-only: raw events with real provider+model for routing analysis
    events: events.rows,
    // Customer-safe: kAIxu branded breakdown (safe to forward to customer)
    kaixu_events: kaixuEvents,
    kaixu_summary: kaixuSummary
  }, cors);
});
