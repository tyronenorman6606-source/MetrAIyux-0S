import { getEntitlement } from './commercial.mjs';
import { upstreamContext } from './platformAuth.mjs';

export async function requireCommercialGate({ req, res, pool, query, routeKey, projectSlug = null }) {
  const ctx = upstreamContext(req);
  const enforceTeam = String(process.env.ENFORCE_UPSTREAM_TEAM_CONTEXT || 'false') === 'true';
  const enforceEntitlements = String(process.env.ENFORCE_ENTITLEMENTS_ON_SELF_SERVICE || process.env.REQUIRE_ACTIVE_SUBSCRIPTION || 'false') === 'true';

  if (enforceTeam && !ctx.teamSlug) {
    await recordGate({ pool, query, routeKey, teamSlug: null, accountRef: ctx.accountRef, allowed: false, reason: 'Missing team context', metadata: { projectSlug } });
    res.status(403).json({ ok: false, error: 'Missing upstream team context' });
    return null;
  }

  if (!ctx.teamSlug) {
    await recordGate({ pool, query, routeKey, teamSlug: null, accountRef: ctx.accountRef, allowed: true, reason: 'Team context not enforced in this env', metadata: { projectSlug } });
    return { ...ctx, entitlement: null };
  }

  const entitlement = await getEntitlement({ pool, query, teamSlug: ctx.teamSlug });
  if (enforceEntitlements && !entitlement.allowed) {
    await recordGate({ pool, query, routeKey, teamSlug: ctx.teamSlug, accountRef: ctx.accountRef, allowed: false, reason: entitlement.reason, metadata: { projectSlug } });
    res.status(402).json({ ok: false, error: entitlement.reason, entitlement });
    return null;
  }

  await recordGate({ pool, query, routeKey, teamSlug: ctx.teamSlug, accountRef: ctx.accountRef, allowed: true, reason: entitlement.reason || 'Allowed', metadata: { projectSlug } });
  return { ...ctx, entitlement };
}

export async function recordGate({ pool, query, routeKey, teamSlug, accountRef, allowed, reason, metadata = {} }) {
  await query(
    pool,
    `INSERT INTO live_gate.route_gate_events (route_key, team_slug, account_ref, allowed, reason, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [routeKey, teamSlug || null, accountRef || null, allowed, reason, JSON.stringify(metadata)]
  );
}

export async function recordUsage({ pool, query, teamSlug = null, projectSlug = null, appSlug = null, metricKey, metricValue = 1, metadata = {} }) {
  if (String(process.env.USAGE_METERING_ENABLED || 'true') !== 'true') return null;
  const result = await query(
    pool,
    `INSERT INTO live_gate.usage_events (team_slug, project_slug, app_slug, metric_key, metric_value, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, created_at`,
    [teamSlug, projectSlug, appSlug, metricKey, metricValue, JSON.stringify(metadata)]
  );
  return result.rows[0] || null;
}
