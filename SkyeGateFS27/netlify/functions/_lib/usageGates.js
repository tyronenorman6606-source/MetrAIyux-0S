import { q } from "./db.js";
import {
  customerCapCents,
  effectiveRpdLimit,
  getKeyMonthRollup,
  getMonthRollup,
  keyCapCents
} from "./authz.js";
import { monthKeyUTC } from "./http.js";

function utcDayBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function getDailyKeyCalls(apiKeyId, date = new Date()) {
  const { start, end } = utcDayBounds(date);
  const res = await q(
    `select count(*)::int as calls
     from usage_events
     where api_key_id=$1 and created_at >= $2 and created_at < $3`,
    [apiKeyId, start.toISOString(), end.toISOString()]
  );
  return Number(res.rows?.[0]?.calls || 0);
}

export async function getDailyCustomerSpend(customerId, date = new Date()) {
  const { start, end } = utcDayBounds(date);
  const res = await q(
    `select coalesce(sum(cost_cents),0)::int as spent_cents
     from usage_events
     where customer_id=$1 and created_at >= $2 and created_at < $3`,
    [customerId, start.toISOString(), end.toISOString()]
  );
  return Number(res.rows?.[0]?.spent_cents || 0);
}

export function buildUsageSnapshot({ keyRow, month, customerRoll, keyRoll, dailyCalls = 0, dailySpendCents = 0 }) {
  const customerCap = customerCapCents(keyRow, customerRoll);
  const keyCap = keyCapCents(keyRow, customerRoll);
  const dailyLimit = effectiveRpdLimit(keyRow);
  // Daily spend guard: cap daily spend at monthly_cap / 20 (~1.5x even daily rate over 30 days)
  const dailySpendLimit = customerCap > 0 ? Math.ceil(customerCap / 20) : null;
  return {
    plan_name: keyRow.customer_plan_name || "",
    month,
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

export async function enforceUsagePreflight({ keyRow, month = monthKeyUTC() }) {
  const [customerRoll, keyRoll, dailyCalls, dailySpendCents] = await Promise.all([
    getMonthRollup(keyRow.customer_id, month),
    getKeyMonthRollup(keyRow.api_key_id, month),
    getDailyKeyCalls(keyRow.api_key_id),
    getDailyCustomerSpend(keyRow.customer_id)
  ]);

  const snapshot = buildUsageSnapshot({ keyRow, month, customerRoll, keyRoll, dailyCalls, dailySpendCents });

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

  return { ok: true, month, customerRoll, keyRoll, snapshot };
}
