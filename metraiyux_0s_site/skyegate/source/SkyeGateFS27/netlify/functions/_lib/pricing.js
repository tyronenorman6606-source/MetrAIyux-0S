import fs from "fs";
import path from "path";

let cache = null;

const WORKER_PRICING_FALLBACK = Object.freeze({
  anthropic: {
    "claude-3-5-sonnet-20241022": {
      input_per_1m_usd: 4.3478,
      output_per_1m_usd: 21.7391
    },
    "claude-opus-4-6": {
      input_per_1m_usd: 7.2464,
      output_per_1m_usd: 36.2319
    }
  },
  gemini: {
    "gemini-2.5-flash": {
      input_per_1m_usd: 0.4348,
      output_per_1m_usd: 3.6232
    },
    "gemini-embedding-001": {
      input_per_1m_usd: 0.2174,
      output_per_1m_usd: 0
    }
  },
  openai: {
    "gpt-4.1-mini": {
      input_per_1m_usd: 0.5797,
      output_per_1m_usd: 2.3189,
      upstream_input_per_1m_usd: 0.4,
      upstream_output_per_1m_usd: 1.6,
      markup_multiplier: 1.4493,
      gross_margin_pct: 31,
      source: "https://openai.com/api/pricing",
      source_checked_at: "2026-05-27",
      source_status: "configured_fs27_openai_lane"
    },
    "gpt-4o": {
      input_per_1m_usd: 3.6232,
      output_per_1m_usd: 14.4928
    },
    "gpt-4o-mini": {
      input_per_1m_usd: 0.2174,
      output_per_1m_usd: 0.8696
    }
  }
});

function loadPricing() {
  if (cache) return cache;
  try {
    const p = path.join(process.cwd(), "pricing", "pricing.json");
    const raw = fs.readFileSync(p, "utf8");
    cache = JSON.parse(raw);
  } catch {
    cache = WORKER_PRICING_FALLBACK;
  }
  return cache;
}

export function getPricingCatalog() {
  return loadPricing();
}

function unpricedError(provider, model) {
  const err = new Error("Requested Skyes Over London model is not enabled for billing.");
  err.code = "UNPRICED_MODEL";
  err.private = { provider, model };
  // 409 communicates "your request is valid JSON but conflicts with server policy/config"
  err.status = 409;
  err.hint = "Ask an admin to enable this Skyes Over London model lane for billing.";
  return err;
}

export function costCents(provider, model, inputTokens, outputTokens) {
  const pricing = loadPricing();
  const entry = pricing?.[provider]?.[model];
  if (!entry) throw unpricedError(provider, model);

  const inRate = Number(entry.input_per_1m_usd);
  const outRate = Number(entry.output_per_1m_usd);

  // Treat missing/NaN as misconfiguration.
  if (!Number.isFinite(inRate) || !Number.isFinite(outRate)) throw unpricedError(provider, model);

  const inUsd = (Number(inputTokens || 0) / 1_000_000) * inRate;
  const outUsd = (Number(outputTokens || 0) / 1_000_000) * outRate;
  const totalUsd = inUsd + outUsd;

  return Math.max(0, Math.round(totalUsd * 100));
}
