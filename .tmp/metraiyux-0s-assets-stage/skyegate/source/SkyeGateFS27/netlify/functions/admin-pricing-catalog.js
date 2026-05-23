import { wrap } from "./_lib/wrap.js";
import { buildCors, json, monthKeyUTC } from "./_lib/http.js";
import { requireAdmin } from "./_lib/admin.js";
import { q } from "./_lib/db.js";
import { getPricingCatalog } from "./_lib/pricing.js";

function rate(entry, key, fallback = 0) {
  const value = Number(entry?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function costCentsForRates(inputTokens, outputTokens, inputRate, outputRate) {
  const inUsd = (Number(inputTokens || 0) / 1_000_000) * Number(inputRate || 0);
  const outUsd = (Number(outputTokens || 0) / 1_000_000) * Number(outputRate || 0);
  return Math.max(0, Math.round((inUsd + outUsd) * 100));
}

const MIN_MARGIN_PCT = 31;

// Maps provider+model → kAIxu branded variant name.
// Used to label usage events with the kAIxu model name for customer-facing breakdowns.
const KAIXU_MODEL_MAP = {
  "openai::gpt-4o-mini":                "kaixu-6.7-mini",
  "openai::gpt-4o":                     "kaixu-6.7",
  "gemini::gemini-2.5-flash":           "kaixu-6.7-nano",
  "gemini::gemini-embedding-001":       "kaixu-6.7-embed",
  "anthropic::claude-3-5-sonnet-20241022": "kaixu-6.7-pro",
  "anthropic::claude-opus-4-6":         "kaixu-6.7-max",
};

function toKaixuVariant(provider, model) {
  return KAIXU_MODEL_MAP[`${provider}::${model}`] || `kaixu-gateway`;
}

function marginPct(billInput, billOutput, upstreamInput, upstreamOutput) {
  const bill = Number(billInput || 0) + Number(billOutput || 0);
  const upstream = Number(upstreamInput || 0) + Number(upstreamOutput || 0);
  if (!bill) return 0;
  return Math.round(((bill - upstream) / bill) * 1000) / 10;
}

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const admin = requireAdmin(req);
  if (!admin) return json(401, { error: "Unauthorized" }, cors);
  if (req.method !== "GET") return json(405, { error: "Method not allowed" }, cors);

  const url = new URL(req.url);
  const month = (url.searchParams.get("month") || monthKeyUTC()).toString().slice(0, 7);
  const pricing = getPricingCatalog();

  const usage = await q(
    `select provider,
            model,
            count(*)::int as calls,
            coalesce(sum(cost_cents),0)::int as cost_cents,
            coalesce(sum(input_tokens),0)::int as input_tokens,
            coalesce(sum(output_tokens),0)::int as output_tokens
     from usage_events
     where to_char(created_at at time zone 'UTC','YYYY-MM')=$1
     group by provider, model
     order by cost_cents desc, calls desc`,
    [month]
  );

  const usageMap = new Map();
  for (const row of usage.rows) {
    usageMap.set(`${row.provider}::${row.model}`, row);
  }

  const catalog = [];
  for (const [provider, models] of Object.entries(pricing || {})) {
    for (const [model, entry] of Object.entries(models || {})) {
      const key = `${provider}::${model}`;
      const used = usageMap.get(key) || null;
      const billInput = rate(entry, "input_per_1m_usd");
      const billOutput = rate(entry, "output_per_1m_usd");
      const upstreamInput = rate(entry, "upstream_input_per_1m_usd", billInput);
      const upstreamOutput = rate(entry, "upstream_output_per_1m_usd", billOutput);
      const upstreamCost = used
        ? costCentsForRates(used.input_tokens, used.output_tokens, upstreamInput, upstreamOutput)
        : 0;
      const billCost = Number(used?.cost_cents || 0);
      const computedMargin = marginPct(billInput, billOutput, upstreamInput, upstreamOutput);
      catalog.push({
        provider,
        model,
        kaixu_variant: toKaixuVariant(provider, model),
        input_per_1m_usd: billInput,
        output_per_1m_usd: billOutput,
        upstream_input_per_1m_usd: upstreamInput,
        upstream_output_per_1m_usd: upstreamOutput,
        markup_multiplier: rate(entry, "markup_multiplier", 0),
        gross_margin_pct: rate(entry, "gross_margin_pct", computedMargin),
        computed_gross_margin_pct: computedMargin,
        below_margin_floor: computedMargin < MIN_MARGIN_PCT,
        source: entry?.source || null,
        source_checked_at: entry?.source_checked_at || null,
        source_status: entry?.source_status || "unlabeled",
        pricing_note: entry?.pricing_note || "",
        used_this_month: !!used,
        calls_this_month: used?.calls || 0,
        cost_cents_this_month: billCost,
        upstream_cost_cents_this_month: upstreamCost,
        gross_margin_cents_this_month: billCost - upstreamCost,
        input_tokens_this_month: used?.input_tokens || 0,
        output_tokens_this_month: used?.output_tokens || 0
      });
    }
  }

  const unpricedUsage = usage.rows.filter((row) => !(pricing?.[row.provider]?.[row.model]));
  const billedCents = catalog.reduce((sum, row) => sum + Number(row.cost_cents_this_month || 0), 0);
  const upstreamCents = catalog.reduce((sum, row) => sum + Number(row.upstream_cost_cents_this_month || 0), 0);

  // kAIxu aggregate — rolls up all provider usage under branded variant names.
  // Admin-only view. Customer-facing breakdown is served from admin-usage with provider stripped.
  const kaixuAggMap = new Map();
  for (const row of catalog.filter(r => r.used_this_month)) {
    const variant = row.kaixu_variant;
    const cur = kaixuAggMap.get(variant) || { kaixu_variant: variant, calls: 0, cost_cents: 0, upstream_cost_cents: 0, input_tokens: 0, output_tokens: 0, providers: [] };
    cur.calls += row.calls_this_month || 0;
    cur.cost_cents += row.cost_cents_this_month || 0;
    cur.upstream_cost_cents += row.upstream_cost_cents_this_month || 0;
    cur.input_tokens += row.input_tokens_this_month || 0;
    cur.output_tokens += row.output_tokens_this_month || 0;
    cur.providers.push(`${row.provider}/${row.model}`);
    kaixuAggMap.set(variant, cur);
  }
  const kaixuAggregate = [...kaixuAggMap.values()].sort((a, b) => b.cost_cents - a.cost_cents);

  return json(200, {
    pricing_source: "pricing/pricing.json",
    month,
    margin_floor_pct: MIN_MARGIN_PCT,
    summary: {
      provider_count: Object.keys(pricing || {}).length,
      model_count: catalog.length,
      models_below_margin_floor: catalog.filter((row) => row.below_margin_floor).length,
      used_catalog_models_this_month: catalog.filter((row) => row.used_this_month).length,
      unpriced_usage_rows: unpricedUsage.length,
      billed_cents_this_month: billedCents,
      upstream_cost_cents_this_month: upstreamCents,
      gross_margin_cents_this_month: billedCents - upstreamCents
    },
    catalog,
    kaixu_aggregate: kaixuAggregate,
    unpriced_usage: unpricedUsage
  }, cors);
});
