import { q } from "./db.js";
import {
  customerCapCents,
  effectiveRpdLimit,
  getKeyMonthRollup,
  getMonthRollup,
  hasPlatformUsageBucket,
  keyCapCents,
  normalizePlatformId,
  platformIdFromKeyRow,
  platformUsageBucket
} from "./authz.js";
import { monthKeyUTC } from "./http.js";

function utcDayBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function getDailyKeyCalls(apiKeyId, date = new Date(), platformId = null) {
  const { start, end } = utcDayBounds(date);
  const platform = normalizePlatformId(platformId, "");
  const wherePlatform = platform ? ` and platform_id=$4` : "";
  const params = platform
    ? [apiKeyId, start.toISOString(), end.toISOString(), platform]
    : [apiKeyId, start.toISOString(), end.toISOString()];
  const res = await q(
    `select count(*)::int as calls
     from usage_events
     where api_key_id=$1 and created_at >= $2 and created_at < $3${wherePlatform}`,
    params
  );
  return Number(res.rows?.[0]?.calls || 0);
}

export async function getDailyCustomerSpend(customerId, date = new Date(), platformId = null) {
  const { start, end } = utcDayBounds(date);
  const platform = normalizePlatformId(platformId, "");
  const wherePlatform = platform ? ` and platform_id=$4` : "";
  const params = platform
    ? [customerId, start.toISOString(), end.toISOString(), platform]
    : [customerId, start.toISOString(), end.toISOString()];
  const res = await q(
    `select coalesce(sum(cost_cents),0)::int as spent_cents
     from usage_events
     where customer_id=$1 and created_at >= $2 and created_at < $3${wherePlatform}`,
    params
  );
  return Number(res.rows?.[0]?.spent_cents || 0);
}

export async function getMonthPlatformUsage(customerId, apiKeyId, month = monthKeyUTC(), platformId = null) {
  const platform = normalizePlatformId(platformId, "");
  if (!platform) return { spent_cents: 0, input_tokens: 0, output_tokens: 0, calls: 0 };
  const res = await q(
    `select coalesce(sum(cost_cents),0)::int as spent_cents,
            coalesce(sum(input_tokens),0)::int as input_tokens,
            coalesce(sum(output_tokens),0)::int as output_tokens,
            count(*)::int as calls
     from usage_events
     where customer_id=$1
       and api_key_id=$2
       and platform_id=$3
       and to_char(created_at at time zone 'UTC','YYYY-MM')=$4`,
    [customerId, apiKeyId, platform, month]
  );
  return res.rows?.[0] || { spent_cents: 0, input_tokens: 0, output_tokens: 0, calls: 0 };
}

function bucketMonthlyCap(bucket) {
  const value = bucket?.monthly_cap_cents ?? bucket?.cap_cents;
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildUsageSnapshot({
  keyRow,
  month,
  customerRoll,
  keyRoll,
  dailyCalls = 0,
  dailySpendCents = 0,
  platformId = null,
  dedicatedPlatformId = null,
  platformRoll = null
}) {
  const customerCap = customerCapCents(keyRow, customerRoll);
  const keyCap = keyCapCents(keyRow, customerRoll);
  const platformKey = normalizePlatformId(platformId, "");
  const dedicatedKey = normalizePlatformId(dedicatedPlatformId, "");
  const platformBucket = platformKey ? platformUsageBucket(keyRow, platformKey) : {};
  const platformCap = bucketMonthlyCap(platformBucket);
  const dailyLimit = effectiveRpdLimit(keyRow, null, dedicatedKey || null);
  // Daily spend guard: cap daily spend at monthly_cap / 20 (~1.5x even daily rate over 30 days)
  const dailySpendLimit = platformCap ? Math.ceil(platformCap / 20) : (customerCap > 0 ? Math.ceil(customerCap / 20) : null);
  return {
    plan_name: keyRow.customer_plan_name || "",
    month,
    platform: platformKey ? {
      platform_id: platformKey,
      dedicated_bucket: !!dedicatedKey,
      usage_bucket_status: platformBucket?.status || null,
      billable: platformBucket?.billable === false ? false : true,
      monthly_cap_cents: platformCap,
      monthly_spent_cents: Number(platformRoll?.spent_cents || 0),
      monthly_calls: Number(platformRoll?.calls || 0)
    } : null,
    customer_cap_cents: customerCap,
    customer_spent_cents: Number(customerRoll.spent_cents || 0),
    key_cap_cents: keyCap,
    key_spent_cents: Number(keyRoll.spent_cents || 0),
    daily_call_limit: Number.isFinite(dailyLimit) ? dailyLimit : null,
    daily_calls_used: Number(dailyCalls || 0),
    daily_spend_limit_cents: dailySpendLimit,
    daily_spend_cents: Number(dailySpendCents || 0),
    customer_extra_cents: Number(customerRoll.extra_cents || 0)
  };
}

export async function enforceUsagePreflight({ keyRow, month = monthKeyUTC(), platformId = null }) {
  const resolvedPlatformId = normalizePlatformId(platformId, platformIdFromKeyRow(keyRow, "metraiyux-0s"));
  const dedicatedPlatformId = hasPlatformUsageBucket(keyRow, resolvedPlatformId) ? resolvedPlatformId : null;
  const [customerRoll, keyRoll, dailyCalls, dailySpendCents, platformRoll] = await Promise.all([
    getMonthRollup(keyRow.customer_id, month),
    getKeyMonthRollup(keyRow.api_key_id, month),
    getDailyKeyCalls(keyRow.api_key_id, new Date(), dedicatedPlatformId),
    getDailyCustomerSpend(keyRow.customer_id, new Date(), dedicatedPlatformId),
    getMonthPlatformUsage(keyRow.customer_id, keyRow.api_key_id, month, dedicatedPlatformId)
  ]);

  const snapshot = buildUsageSnapshot({
    keyRow,
    month,
    customerRoll,
    keyRoll,
    dailyCalls,
    dailySpendCents,
    platformId: resolvedPlatformId,
    dedicatedPlatformId,
    platformRoll
  });

  if (snapshot.customer_spent_cents >= snapshot.customer_cap_cents) {
    return {
      ok: false,
      status: 402,
      payload: {
        error: "Monthly cap reached",
        scope: "customer",
        month: {
          month,
          cap_cents: snapshot.customer_cap_cents,
          spent_cents: snapshot.customer_spent_cents,
          ...snapshot
        }
      }
    };
  }

  if (snapshot.key_spent_cents >= snapshot.key_cap_cents) {
    return {
      ok: false,
      status: 402,
      payload: {
        error: "Monthly cap reached",
        scope: "key",
        month: {
          month,
          cap_cents: snapshot.customer_cap_cents,
          spent_cents: snapshot.customer_spent_cents,
          ...snapshot
        }
      }
    };
  }

  if (dedicatedPlatformId && platformUsageBucket(keyRow, resolvedPlatformId)?.enabled === false) {
    return {
      ok: false,
      status: 403,
      payload: {
        error: "Platform lane is not active for this customer",
        scope: "platform",
        platform: snapshot.platform,
        hint: "Activate the paid platform offer or owner-approved add-on before routing usage to this platform_id."
      }
    };
  }

  if (snapshot.platform?.monthly_cap_cents && snapshot.platform.monthly_spent_cents >= snapshot.platform.monthly_cap_cents) {
    return {
      ok: false,
      status: 402,
      payload: {
        error: "Platform monthly cap reached",
        scope: "platform",
        platform: snapshot.platform,
        usage_limits: snapshot
      }
    };
  }

  if (snapshot.daily_call_limit && snapshot.daily_calls_used >= snapshot.daily_call_limit) {
    return {
      ok: false,
      status: 429,
      payload: {
        error: "Daily request limit reached",
        scope: "key",
        usage_limits: snapshot
      }
    };
  }

  // Daily spend guard — prevents a rogue script from draining the monthly cap in one day.
  // Threshold: monthly_cap / 20 (~1.5x the even daily rate over 30 days).
  if (snapshot.daily_spend_limit_cents && snapshot.daily_spend_cents >= snapshot.daily_spend_limit_cents) {
    return {
      ok: false,
      status: 429,
      payload: {
        error: "Daily spend limit reached. Usage will resume tomorrow.",
        scope: "customer",
        daily: {
          spent_cents: snapshot.daily_spend_cents,
          limit_cents: snapshot.daily_spend_limit_cents
        },
        usage_limits: snapshot
      }
    };
  }

  return { ok: true, month, customerRoll, keyRoll, platformRoll, snapshot };
}
