import { query } from './db.js';

const LIMIT_MAP = {
  users: { usage: 'user_count', label: 'members' },
  repos: { usage: 'repo_count', label: 'repositories' },
  privateRepos: { usage: 'private_repo_count', label: 'private repositories' },
  storageMb: { usage: 'storage_mb', label: 'storage MB' },
  ciMinutes: { usage: 'ci_minutes', label: 'CI minutes' },
  packageMb: { usage: 'package_mb', label: 'package MB' }
};

function normalizeLimit(value) {
  if (value === undefined || value === null || value === '' || String(value).toLowerCase() === 'custom' || String(value).toLowerCase() === 'unlimited') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestSnapshotDefaults(snapshot = {}) {
  const repoSizeKb = Number(snapshot.repo_size_kb || 0);
  const packageMb = Number(snapshot.package_count || 0);
  return {
    user_count: Number(snapshot.user_count || 0),
    repo_count: Number(snapshot.repo_count || 0),
    private_repo_count: Number(snapshot.private_repo_count || 0),
    storage_mb: Math.ceil(repoSizeKb / 1024),
    package_mb: packageMb,
    ci_minutes: Number(snapshot.ci_minutes || 0)
  };
}

export async function loadPlan(code) {
  const result = await query('SELECT * FROM plans WHERE code=$1', [code]);
  return result.rows[0] || null;
}

export async function loadLatestUsage(accountId) {
  const result = await query('SELECT * FROM usage_snapshots WHERE account_id=$1 ORDER BY measured_at DESC LIMIT 1', [accountId]);
  return result.rows[0] || null;
}

export async function evaluateEntitlements(account) {
  const plan = await loadPlan(account.plan_code);
  if (!plan) {
    return { ok: false, errors: [{ code: 'plan_missing', message: `Plan ${account.plan_code} does not exist.` }], plan: null, usage: {}, checks: [] };
  }
  const snapshot = await loadLatestUsage(account.id);
  const usage = latestSnapshotDefaults(snapshot);
  const limits = plan.limits_json || {};
  const checks = Object.entries(LIMIT_MAP).map(([limitKey, meta]) => {
    const limit = normalizeLimit(limits[limitKey]);
    const used = usage[meta.usage] || 0;
    const ok = limit === null || used <= limit;
    return { key: limitKey, label: meta.label, used, limit, ok, remaining: limit === null ? null : Math.max(limit - used, 0) };
  });
  const errors = checks.filter((check) => !check.ok).map((check) => ({ code: `limit_${check.key}_exceeded`, message: `${check.label} limit exceeded`, check }));
  return { ok: errors.length === 0, errors, plan, usage, checks, snapshot };
}

export async function assertEntitlement(account, key, requestedIncrement = 1) {
  const plan = await loadPlan(account.plan_code);
  if (!plan) {
    const error = new Error(`Plan ${account.plan_code} does not exist.`);
    error.status = 409;
    error.code = 'plan_missing';
    throw error;
  }
  const latest = await loadLatestUsage(account.id);
  const usage = latestSnapshotDefaults(latest);
  const limitValue = normalizeLimit((plan.limits_json || {})[key]);
  if (limitValue === null) return true;
  const meta = LIMIT_MAP[key];
  if (!meta) return true;
  const next = Number(usage[meta.usage] || 0) + Number(requestedIncrement || 0);
  if (next > limitValue) {
    const error = new Error(`${meta.label} limit exceeded for plan ${plan.code}`);
    error.status = 402;
    error.code = `limit_${key}_exceeded`;
    error.details = { key, used: usage[meta.usage], requestedIncrement, limit: limitValue, plan: plan.code };
    throw error;
  }
  return true;
}
