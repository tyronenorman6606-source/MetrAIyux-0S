export async function getTeamPlan({ pool, query, teamSlug }) {
  const result = await query(
    pool,
    `SELECT t.team_slug, t.team_name, t.plan_slug, p.*
     FROM platform.teams t
     JOIN platform.plans p ON p.plan_slug = t.plan_slug
     WHERE t.team_slug = $1`,
    [teamSlug]
  );
  return result.rows[0] || null;
}

export async function checkTeamQuota({ pool, query, teamSlug, quotaKey, currentValue }) {
  const plan = await getTeamPlan({ pool, query, teamSlug });
  if (!plan) return { allowed: false, error: 'Team not found', quotaKey };

  const map = {
    projects: 'max_projects',
    databases: 'max_databases',
    query_executions_month: 'max_query_executions_month',
    storage_mb: 'max_storage_mb',
    team_members: 'max_team_members'
  };
  const limitKey = map[quotaKey];
  if (!limitKey) return { allowed: false, error: 'Unknown quota key', quotaKey };

  const limit = Number(plan[limitKey]);
  const allowed = Number(currentValue) < limit;

  await query(
    pool,
    `INSERT INTO platform.quota_events (team_slug, event_kind, quota_key, current_value, limit_value, allowed)
     VALUES ($1, 'quota_check', $2, $3, $4, $5)`,
    [teamSlug, quotaKey, Number(currentValue), limit, allowed]
  );

  return { allowed, quotaKey, currentValue: Number(currentValue), limit, planSlug: plan.plan_slug };
}
