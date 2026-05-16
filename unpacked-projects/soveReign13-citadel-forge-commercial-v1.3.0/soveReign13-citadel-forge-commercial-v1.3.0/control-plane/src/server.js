import crypto from 'node:crypto';
import express from 'express';
import { nanoid } from 'nanoid';
import { pool, query, runMigrations } from './db.js';
import { authenticate, optionalAuth, requireAdmin } from './auth.js';
import { checkForgejo, createOrganization, createOrgRepo, summarizeOrgUsage } from './forgejo.js';
import { assertEntitlement, evaluateEntitlements, loadPlan } from './limits.js';
import { createStripeCheckoutSession, stripePriceEnvForPlan, verifyStripeWebhook } from './stripe.js';

const app = express();
const port = Number(process.env.PORT || 8080);
const startedAt = new Date().toISOString();

app.disable('x-powered-by');

app.post('/api/billing/stripe/webhook', express.raw({ type: 'application/json', limit: '2mb' }), async (req, res, next) => {
  try {
    verifyStripeWebhook({ rawBody: req.body, signatureHeader: req.header('stripe-signature'), secret: process.env.STRIPE_WEBHOOK_SECRET });
    const event = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
    await recordBillingEvent({ provider: 'stripe', providerEventId: event.id, eventType: event.type, raw: event });
    await applyStripeEvent(event);
    res.json({ received: true });
  } catch (error) { next(error); }
});

app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.static(new URL('../public', import.meta.url).pathname));

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 39);
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function assertSlug(slug) {
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
    const error = new Error('Slug must be 3-40 chars using lowercase letters, numbers, and hyphens.');
    error.status = 400;
    throw error;
  }
}

function publicUrl(path) {
  const base = process.env.PUBLIC_CONTROL_URL || `https://${process.env.CONTROL_DOMAIN || 'app.example.com'}`;
  return `${String(base).replace(/\/$/, '')}${path}`;
}

async function audit(req, action, targetType, targetId, metadata = {}) {
  await query(
    `INSERT INTO audit_events(actor_email, action, target_type, target_id, ip, user_agent, metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [req.user?.email || null, action, targetType || null, targetId || null, req.ip, req.header('user-agent') || null, metadata]
  );
}

function ownedAccountWhere(req) {
  if (req.user?.isAdmin) return { clause: 'true', values: [] };
  if (req.user?.accountId) return { clause: 'id = $1', values: [req.user.accountId] };
  return { clause: 'id IN (SELECT account_id FROM account_members WHERE lower(email) = lower($1))', values: [req.user.email] };
}

function requireApiScope(req, scope) {
  if (req.user?.authMethod !== 'api-key' || req.user?.isAdmin) return;
  const scopes = Array.isArray(req.user?.scopes) ? req.user.scopes : [];
  if (scopes.includes(scope) || scopes.includes('*')) return;
  const error = new Error(`API key scope required: ${scope}`);
  error.status = 403;
  error.code = 'scope_required';
  error.details = { scope };
  throw error;
}

function assertAccountWritable(account) {
  if (!account) return;
  if (account.suspended_at) {
    const error = new Error(`Account is suspended: ${account.suspension_reason || 'manual suspension'}`);
    error.status = 403;
    error.code = 'account_suspended';
    throw error;
  }
}

function repoNameFromInput(value) {
  const name = slugify(value).slice(0, 100);
  if (!/^[a-z0-9][a-z0-9-]{1,98}[a-z0-9]$/.test(name)) {
    const error = new Error('Repository name must be 3-100 chars using lowercase letters, numbers, and hyphens.');
    error.status = 400;
    error.code = 'repo_name_invalid';
    throw error;
  }
  return name;
}

async function recordBillingEvent({ provider, providerEventId, eventType, raw }) {
  await query(
    `INSERT INTO billing_events(provider, provider_event_id, event_type, raw_json)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (provider_event_id) DO NOTHING`,
    [provider, providerEventId, eventType, raw]
  );
}

async function applyStripeEvent(event) {
  const type = String(event.type || '');
  const object = event.data?.object || {};
  const accountId = object.metadata?.account_id || object.client_reference_id || object.subscription_details?.metadata?.account_id;
  const planCode = object.metadata?.plan_code || object.subscription_details?.metadata?.plan_code;

  if (type === 'checkout.session.completed' && accountId && planCode) {
    await query(
      `UPDATE checkout_sessions SET status='completed', provider_session_id=COALESCE(provider_session_id,$1), raw_json=$2, updated_at=now()
       WHERE account_id=$3 AND plan_code=$4 AND status IN ('pending','open')`,
      [object.id || null, object, accountId, planCode]
    );
    await query(
      `UPDATE accounts SET plan_code=$1, billing_status='active', stripe_customer_id=COALESCE($2, stripe_customer_id), updated_at=now()
       WHERE id=$3`,
      [planCode, object.customer || null, accountId]
    );
  }

  if ((type === 'customer.subscription.created' || type === 'customer.subscription.updated') && object.id) {
    const subscriptionAccountId = object.metadata?.account_id || accountId;
    const subscriptionPlanCode = object.metadata?.plan_code || planCode;
    if (subscriptionAccountId) {
      await query(
        `INSERT INTO billing_subscriptions(account_id, provider, provider_subscription_id, provider_customer_id, plan_code, status, current_period_start, current_period_end, raw_json)
         VALUES($1,'stripe',$2,$3,$4,$5,to_timestamp($6),to_timestamp($7),$8)
         ON CONFLICT (provider_subscription_id) DO UPDATE SET
           status=EXCLUDED.status,
           provider_customer_id=EXCLUDED.provider_customer_id,
           plan_code=COALESCE(EXCLUDED.plan_code, billing_subscriptions.plan_code),
           current_period_start=EXCLUDED.current_period_start,
           current_period_end=EXCLUDED.current_period_end,
           raw_json=EXCLUDED.raw_json,
           updated_at=now()`,
        [subscriptionAccountId, object.id, object.customer || null, subscriptionPlanCode || null, object.status || 'unknown', object.current_period_start || null, object.current_period_end || null, object]
      );
      if (subscriptionPlanCode) {
        await query('UPDATE accounts SET plan_code=$1, billing_status=$2, stripe_customer_id=COALESCE($3, stripe_customer_id), updated_at=now() WHERE id=$4', [subscriptionPlanCode, object.status || 'active', object.customer || null, subscriptionAccountId]);
      }
    }
  }

  if (type === 'customer.subscription.deleted' && object.id) {
    await query('UPDATE billing_subscriptions SET status=$1, raw_json=$2, updated_at=now() WHERE provider_subscription_id=$3', ['canceled', object, object.id]);
    const result = await query('SELECT account_id FROM billing_subscriptions WHERE provider_subscription_id=$1', [object.id]);
    const subscriptionAccountId = result.rows[0]?.account_id;
    if (subscriptionAccountId) await query('UPDATE accounts SET billing_status=$1, updated_at=now() WHERE id=$2', ['canceled', subscriptionAccountId]);
  }
}

app.get('/health', async (_req, res) => {
  const db = await pool.query('SELECT 1 AS ok');
  let forgejo = { ok: false, skipped: true };
  try { forgejo = await checkForgejo(); } catch (error) { forgejo = { ok: false, error: error.message }; }
  res.json({ ok: true, service: 'soveReign13-control-plane', version: process.env.SOVEREIGN_VERSION || '1.3.0', startedAt, db: db.rows[0], forgejo });
});

app.get('/api/config', optionalAuth, async (_req, res) => {
  res.json({
    appName: process.env.SOVEREIGN_APP_NAME || 'SoveReign13 Citadel Forge',
    operator: process.env.SOVEREIGN_OPERATOR || 'Skyes Over London',
    forgeUrl: process.env.PUBLIC_FORGE_URL || `https://${process.env.FORGE_DOMAIN || 'forge.example.com'}`,
    controlUrl: process.env.PUBLIC_CONTROL_URL || `https://${process.env.CONTROL_DOMAIN || 'app.example.com'}`,
    portalUrl: process.env.PUBLIC_PORTAL_URL || `https://${process.env.PORTAL_DOMAIN || 'code.example.com'}`,
    supportEmail: process.env.SOVEREIGN_SUPPORT_EMAIL || 'admin@example.com',
    authMode: process.env.AUTH_MODE || (process.env.AUTH_JWKS_URL ? 'jwt' : 'trusted-header'),
    billingProviders: {
      stripeCheckoutConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      manualWebhookConfigured: Boolean(process.env.BILLING_WEBHOOK_SECRET)
    }
  });
});

app.get('/api/auth/diagnostics', optionalAuth, async (req, res) => {
  res.json({
    authenticated: Boolean(req.user),
    user: req.user || null,
    expectedTrustedHeaders: {
      email: process.env.AUTH_EMAIL_HEADER || 'x-s13-user-email',
      subject: process.env.AUTH_SUBJECT_HEADER || 'x-s13-user-id',
      username: process.env.AUTH_USERNAME_HEADER || 'x-s13-user-name',
      displayName: process.env.AUTH_DISPLAY_NAME_HEADER || 'x-s13-user-display-name',
      roles: process.env.AUTH_ROLES_HEADER || 'x-s13-user-roles'
    },
    jwtConfigured: Boolean(process.env.AUTH_JWKS_URL),
    apiKeysAccepted: true
  });
});

app.get('/api/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/deployment/readiness', authenticate, requireAdmin, async (_req, res) => {
  const env = {
    domainsConfigured: !['code.example.com','forge.example.com','app.example.com'].includes(process.env.PORTAL_DOMAIN) && !['code.example.com','forge.example.com','app.example.com'].includes(process.env.FORGE_DOMAIN) && !['code.example.com','forge.example.com','app.example.com'].includes(process.env.CONTROL_DOMAIN),
    adminEmailsConfigured: Boolean(process.env.ADMIN_EMAILS && !String(process.env.ADMIN_EMAILS).includes('admin@example.com')),
    forgejoAdminTokenConfigured: Boolean(process.env.FORGEJO_ADMIN_TOKEN && !String(process.env.FORGEJO_ADMIN_TOKEN).startsWith('PASTE_')),
    authJwtConfigured: Boolean(process.env.AUTH_JWKS_URL),
    trustedHeaderConfigured: String(process.env.TRUSTED_HEADER_AUTH || '').toLowerCase() === 'true' && Boolean(process.env.TRUSTED_HEADER_AUTH_SECRET && !String(process.env.TRUSTED_HEADER_AUTH_SECRET).startsWith('CHANGE_ME')),
    devAuthEnabled: String(process.env.AUTH_MODE || '').toLowerCase() === 'dev',
    stripeCheckoutConfigured: Boolean(process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_STUDIO || process.env.STRIPE_PRICE_AGENCY)),
    stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    billingWebhookConfigured: Boolean(process.env.BILLING_WEBHOOK_SECRET),
    smtpConfigured: Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY),
    backupRetentionConfigured: Boolean(process.env.BACKUP_RETENTION_DAYS)
  };
  let dbOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; } catch { dbOk = false; }
  let forgejo = { ok: false, skipped: true };
  try { forgejo = await checkForgejo(); } catch (error) { forgejo = { ok: false, error: error.message }; }
  const blockers = [];
  if (!env.domainsConfigured) blockers.push('domains_still_example_values');
  if (!env.adminEmailsConfigured) blockers.push('admin_emails_not_changed');
  if (env.devAuthEnabled) blockers.push('dev_auth_enabled');
  if (!env.authJwtConfigured && !env.trustedHeaderConfigured) blockers.push('production_auth_not_configured');
  if (!env.forgejoAdminTokenConfigured) blockers.push('forgejo_admin_token_missing');
  if (!dbOk) blockers.push('control_db_unavailable');
  res.json({ ok: blockers.length === 0 && dbOk, version: process.env.SOVEREIGN_VERSION || '1.3.0', env, dbOk, forgejo, blockers, note: 'Readiness checks deployment blockers. Billing and SMTP can remain inactive for private alpha, but do not advertise those lanes until configured.' });
});


app.get('/api/plans', async (_req, res) => {
  const result = await query('SELECT code, name, monthly_price_cents, limits_json, is_public FROM plans WHERE is_public = true ORDER BY monthly_price_cents ASC');
  res.json({ plans: result.rows });
});

app.post('/api/leads', async (req, res, next) => {
  try {
    const email = cleanEmail(req.body.email);
    if (!email.includes('@')) return res.status(400).json({ error: 'valid_email_required' });
    const created = await query(
      `INSERT INTO sales_leads(email, name, company, plan_interest, message, source, metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, status, created_at`,
      [email, req.body.name || null, req.body.company || null, req.body.planInterest || req.body.plan_interest || null, req.body.message || null, req.body.source || 'portal', req.body.metadata || {}]
    );
    res.status(201).json({ lead: created.rows[0], note: 'Lead captured. SMTP follow-up is not sent until email provider env vars are configured.' });
  } catch (error) { next(error); }
});

app.get('/api/accounts', authenticate, async (req, res) => {
  const where = ownedAccountWhere(req);
  const result = await query(
    `SELECT id, slug, display_name, plan_code, billing_status, forgejo_org, owner_email, status, provision_error, lifecycle_stage, suspended_at, suspension_reason, created_at, updated_at
     FROM accounts WHERE ${where.clause} ORDER BY created_at DESC`,
    where.values
  );
  res.json({ accounts: result.rows });
});

app.post('/api/accounts', authenticate, async (req, res, next) => {
  try {
    requireApiScope(req, 'account:create');
    const displayName = String(req.body.displayName || req.body.display_name || '').trim();
    const planCode = String(req.body.planCode || req.body.plan_code || 'free').trim().toLowerCase();
    const slug = slugify(req.body.slug || displayName || req.user.username);
    if (!displayName) return res.status(400).json({ error: 'display_name_required' });
    assertSlug(slug);

    const plan = await loadPlan(planCode);
    if (!plan) return res.status(400).json({ error: 'invalid_plan' });

    const client = await pool.connect();
    let account;
    try {
      await client.query('BEGIN');
      const created = await client.query(
        `INSERT INTO accounts(slug, display_name, plan_code, owner_email, owner_username, upstream_subject, forgejo_org, status, lifecycle_stage)
         VALUES($1,$2,$3,$4,$5,$6,$7,'pending','customer')
         RETURNING *`,
        [slug, displayName, planCode, req.user.email, req.user.username, req.user.sub, slug]
      );
      account = created.rows[0];
      await client.query(
        `INSERT INTO account_members(account_id, email, username, role, upstream_subject, forgejo_username)
         VALUES($1,$2,$3,'owner',$4,$5)`,
        [account.id, req.user.email, req.user.username, req.user.sub, req.user.username]
      );
      await client.query(
        `INSERT INTO usage_snapshots(account_id, user_count, repo_count, private_repo_count, repo_size_kb, package_count, ci_minutes, raw_json)
         VALUES($1,1,0,0,0,0,0,$2)`,
        [account.id, { seed: 'account-created' }]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (String(process.env.PROVISION_ON_CREATE || 'true').toLowerCase() === 'true') {
      try {
        await createOrganization({ slug, displayName });
        const updated = await query('UPDATE accounts SET status = $1, provision_error = NULL, updated_at = now() WHERE id = $2 RETURNING *', ['active', account.id]);
        account = updated.rows[0];
        await audit(req, 'account.provisioned', 'account', account.id, { forgejo_org: slug });
      } catch (error) {
        const updated = await query('UPDATE accounts SET status = $1, provision_error = $2, updated_at = now() WHERE id = $3 RETURNING *', ['provision_failed', error.message, account.id]);
        account = updated.rows[0];
        await audit(req, 'account.provision_failed', 'account', account.id, { error: error.message });
      }
    }

    await audit(req, 'account.created', 'account', account.id, { planCode, slug });
    res.status(201).json({ account });
  } catch (error) { next(error); }
});

app.post('/api/accounts/:id/provision', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'account:write');
    assertAccountWritable(account);
    try {
      await createOrganization({ slug: account.forgejo_org || account.slug, displayName: account.display_name });
      const updated = await query('UPDATE accounts SET status=$1, provision_error=NULL, updated_at=now() WHERE id=$2 RETURNING *', ['active', account.id]);
      await audit(req, 'account.provisioned', 'account', account.id);
      res.json({ account: updated.rows[0] });
    } catch (error) {
      const updated = await query('UPDATE accounts SET status=$1, provision_error=$2, updated_at=now() WHERE id=$3 RETURNING *', ['provision_failed', error.message, account.id]);
      await audit(req, 'account.provision_failed', 'account', account.id, { error: error.message });
      res.status(502).json({ error: 'forgejo_provision_failed', message: error.message, account: updated.rows[0] });
    }
  } catch (error) { next(error); }
});

app.post('/api/accounts/:id/invitations', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'account:write');
    assertAccountWritable(account);
    await assertEntitlement(account, 'users', 1);
    if (req.user?.authMethod === 'api-key' && !req.user?.isAdmin && !(req.user.scopes || []).includes('account:write')) return res.status(403).json({ error: 'interactive_or_account_write_required' });
    const email = cleanEmail(req.body.email || '');
    const role = String(req.body.role || 'developer').trim().toLowerCase();
    if (!email.includes('@')) return res.status(400).json({ error: 'valid_email_required' });
    const created = await query(
      `INSERT INTO invitations(account_id, email, role, invited_by_email) VALUES($1,$2,$3,$4) RETURNING *`,
      [account.id, email, role, req.user.email]
    );
    await audit(req, 'invitation.created', 'account', account.id, { email, role });
    res.status(201).json({ invitation: created.rows[0], note: 'Email sending is intentionally not enabled until SMTP/provider env vars are supplied.' });
  } catch (error) { next(error); }
});

app.post('/api/accounts/:id/repos', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'repo:write');
    assertAccountWritable(account);
    const name = repoNameFromInput(req.body.name || req.body.repoName || req.body.repo_name);
    const isPrivate = req.body.private !== false;
    await assertEntitlement(account, 'repos', 1);
    if (isPrivate) await assertEntitlement(account, 'privateRepos', 1);
    const repo = await createOrgRepo(account.forgejo_org || account.slug, { name, description: req.body.description || '', isPrivate });
    await audit(req, 'repo.created', 'account', account.id, { repo: name, private: isPrivate });
    res.status(201).json({ repo, note: 'Repository created through the control-plane entitlement path.' });
  } catch (error) { next(error); }
});

app.get('/api/accounts/:id/usage', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'account:read');
    const result = await query('SELECT * FROM usage_snapshots WHERE account_id=$1 ORDER BY measured_at DESC LIMIT 25', [account.id]);
    const plan = await loadPlan(account.plan_code);
    res.json({ account, plan, snapshots: result.rows });
  } catch (error) { next(error); }
});

app.get('/api/accounts/:id/entitlements', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'account:read');
    const entitlements = await evaluateEntitlements(account);
    res.json({ account: { id: account.id, slug: account.slug, plan_code: account.plan_code, billing_status: account.billing_status }, entitlements });
  } catch (error) { next(error); }
});

app.post('/api/accounts/:id/usage/refresh', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'usage:write');
    assertAccountWritable(account);
    const usage = await summarizeOrgUsage(account.forgejo_org || account.slug);
    const members = await query('SELECT count(*)::int AS count FROM account_members WHERE account_id=$1', [account.id]);
    const pendingInvites = await query("SELECT count(*)::int AS count FROM invitations WHERE account_id=$1 AND status='pending'", [account.id]);
    const ci = await query(`SELECT COALESCE(sum(quantity),0)::int AS minutes FROM meter_events WHERE account_id=$1 AND event_type='ci.minutes'`, [account.id]);
    const packages = await query(`SELECT COALESCE(sum(quantity),0)::int AS mb FROM meter_events WHERE account_id=$1 AND event_type='package.mb'`, [account.id]);
    const inserted = await query(
      `INSERT INTO usage_snapshots(account_id, user_count, repo_count, private_repo_count, repo_size_kb, package_count, ci_minutes, raw_json)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [account.id, members.rows[0].count + pendingInvites.rows[0].count, usage.repo_count, usage.private_repo_count, usage.repo_size_kb, packages.rows[0].mb, ci.rows[0].minutes, usage.raw]
    );
    await audit(req, 'usage.refreshed', 'account', account.id);
    const entitlements = await evaluateEntitlements(account);
    res.json({ snapshot: inserted.rows[0], entitlements });
  } catch (error) { next(error); }
});

app.post('/api/accounts/:id/meter-events', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'meter:write');
    assertAccountWritable(account);
    const eventType = String(req.body.eventType || req.body.event_type || '').trim();
    if (!eventType) return res.status(400).json({ error: 'event_type_required' });
    const quantity = Number(req.body.quantity || 1);
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantity_must_be_positive' });
    if (eventType === 'ci.minutes') await assertEntitlement(account, 'ciMinutes', quantity);
    if (eventType === 'package.mb') await assertEntitlement(account, 'packageMb', quantity);
    const created = await query(
      `INSERT INTO meter_events(account_id, event_type, quantity, unit, source, idempotency_key, metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [account.id, eventType, quantity, String(req.body.unit || 'count'), String(req.body.source || 'api'), req.body.idempotencyKey || req.body.idempotency_key || null, req.body.metadata || {}]
    );
    await audit(req, 'meter_event.recorded', 'account', account.id, { eventType, quantity });
    res.status(created.rowCount ? 201 : 200).json({ meterEvent: created.rows[0] || null, deduplicated: created.rowCount === 0 });
  } catch (error) { next(error); }
});

app.post('/api/accounts/:id/api-keys', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.params.id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'account:write');
    assertAccountWritable(account);
    if (req.user?.authMethod === 'api-key' && !req.user?.isAdmin && !(req.user.scopes || []).includes('account:write')) return res.status(403).json({ error: 'interactive_or_account_write_required' });
    const raw = `s13_${nanoid(32)}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prefix = raw.slice(0, 10);
    const scopes = Array.isArray(req.body.scopes) && req.body.scopes.length ? req.body.scopes : ['account:read', 'meter:write'];
    const created = await query(
      `INSERT INTO api_keys(account_id, name, prefix, key_hash, scopes, created_by_email)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id, account_id, name, prefix, scopes, created_at`,
      [account.id, String(req.body.name || `${account.slug}-automation-key`), prefix, hash, scopes, req.user.email]
    );
    await audit(req, 'account_api_key.created', 'account', account.id, { prefix, scopes });
    res.status(201).json({ apiKey: created.rows[0], secret: raw, warning: 'Store this secret now; only the hash is persisted.' });
  } catch (error) { next(error); }
});

app.post('/api/billing/checkout', authenticate, async (req, res, next) => {
  try {
    const account = await getAccessibleAccount(req, req.body.accountId || req.body.account_id);
    if (!account) return res.status(404).json({ error: 'not_found' });
    requireApiScope(req, 'billing:write');
    assertAccountWritable(account);
    const planCode = String(req.body.planCode || req.body.plan_code || '').trim().toLowerCase();
    const plan = await loadPlan(planCode);
    if (!plan || !plan.is_public || plan.monthly_price_cents <= 0) return res.status(400).json({ error: 'invalid_paid_plan' });

    const successUrl = req.body.successUrl || req.body.success_url || publicUrl(`/billing-success.html?account=${encodeURIComponent(account.id)}&plan=${encodeURIComponent(plan.code)}`);
    const cancelUrl = req.body.cancelUrl || req.body.cancel_url || publicUrl(`/billing-cancel.html?account=${encodeURIComponent(account.id)}`);
    try {
      const session = await createStripeCheckoutSession({ account, plan, successUrl, cancelUrl });
      const created = await query(
        `INSERT INTO checkout_sessions(account_id, plan_code, provider, provider_session_id, checkout_url, status, requested_by_email, raw_json)
         VALUES($1,$2,'stripe',$3,$4,$5,$6,$7) RETURNING *`,
        [account.id, plan.code, session.id, session.url, session.status || 'open', req.user.email, session]
      );
      await audit(req, 'billing.checkout.created', 'account', account.id, { provider: 'stripe', planCode: plan.code });
      res.status(201).json({ checkout: created.rows[0], checkoutUrl: session.url });
    } catch (error) {
      const created = await query(
        `INSERT INTO checkout_sessions(account_id, plan_code, provider, status, requested_by_email, raw_json)
         VALUES($1,$2,'manual','configuration_required',$3,$4) RETURNING *`,
        [account.id, plan.code, req.user.email, { error: error.message, code: error.code || null, requiredPriceEnv: stripePriceEnvForPlan(plan.code) }]
      );
      await audit(req, 'billing.checkout.configuration_required', 'account', account.id, { planCode: plan.code, error: error.message });
      res.status(error.status || 409).json({ error: error.code || 'checkout_configuration_required', message: error.message, checkout: created.rows[0] });
    }
  } catch (error) { next(error); }
});

app.post('/api/billing/webhook', async (req, res, next) => {
  try {
    const expected = process.env.BILLING_WEBHOOK_SECRET;
    if (expected && req.header('x-s13-billing-secret') !== expected) return res.status(401).json({ error: 'invalid_webhook_secret' });
    const provider = String(req.body.provider || 'manual');
    const providerEventId = req.body.id || req.body.provider_event_id || `manual_${nanoid(16)}`;
    const eventType = String(req.body.type || req.body.event_type || 'unknown');
    await recordBillingEvent({ provider, providerEventId, eventType, raw: req.body });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/admin/platform-metrics', authenticate, requireAdmin, async (_req, res) => {
  const accounts = await query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='active')::int AS active, count(*) FILTER (WHERE suspended_at IS NOT NULL)::int AS suspended FROM accounts`);
  const revenue = await query(`SELECT COALESCE(sum(monthly_price_cents),0)::int AS mrr_cents FROM accounts a JOIN plans p ON p.code=a.plan_code WHERE a.billing_status IN ('active','manual','trialing')`);
  const usage = await query(
    `SELECT COALESCE(sum(user_count),0)::int AS users, COALESCE(sum(repo_count),0)::int AS repos, COALESCE(sum(private_repo_count),0)::int AS private_repos, COALESCE(sum(repo_size_kb),0)::bigint AS repo_size_kb, COALESCE(sum(ci_minutes),0)::int AS ci_minutes
     FROM (SELECT DISTINCT ON (account_id) * FROM usage_snapshots ORDER BY account_id, measured_at DESC) latest`
  );
  const leads = await query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='new')::int AS new FROM sales_leads`);
  res.json({ accounts: accounts.rows[0], revenue: revenue.rows[0], usage: usage.rows[0], leads: leads.rows[0] });
});

app.get('/api/admin/accounts', authenticate, requireAdmin, async (_req, res) => {
  const result = await query(
    `SELECT a.*, p.name AS plan_name,
      (SELECT row_to_json(s) FROM usage_snapshots s WHERE s.account_id=a.id ORDER BY measured_at DESC LIMIT 1) AS latest_usage
     FROM accounts a JOIN plans p ON p.code=a.plan_code ORDER BY a.created_at DESC LIMIT 250`
  );
  res.json({ accounts: result.rows });
});

app.post('/api/admin/accounts/:id/plan', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const planCode = String(req.body.planCode || req.body.plan_code || '').trim().toLowerCase();
    const plan = await loadPlan(planCode);
    if (!plan) return res.status(400).json({ error: 'invalid_plan' });
    const billingStatus = String(req.body.billingStatus || req.body.billing_status || 'manual');
    const updated = await query('UPDATE accounts SET plan_code=$1, billing_status=$2, updated_at=now() WHERE id=$3 RETURNING *', [plan.code, billingStatus, req.params.id]);
    if (!updated.rowCount) return res.status(404).json({ error: 'not_found' });
    await audit(req, 'admin.account.plan_changed', 'account', req.params.id, { planCode: plan.code, billingStatus });
    res.json({ account: updated.rows[0] });
  } catch (error) { next(error); }
});

app.post('/api/admin/accounts/:id/suspend', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const reason = String(req.body.reason || 'manual_admin_suspend').slice(0, 500);
    const updated = await query('UPDATE accounts SET suspended_at=now(), suspension_reason=$1, updated_at=now() WHERE id=$2 RETURNING *', [reason, req.params.id]);
    if (!updated.rowCount) return res.status(404).json({ error: 'not_found' });
    await query('INSERT INTO account_locks(account_id, lock_type, reason, created_by_email) VALUES($1,$2,$3,$4)', [req.params.id, 'suspension', reason, req.user.email]);
    await audit(req, 'admin.account.suspended', 'account', req.params.id, { reason });
    res.json({ account: updated.rows[0] });
  } catch (error) { next(error); }
});

app.post('/api/admin/accounts/:id/unsuspend', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const updated = await query('UPDATE accounts SET suspended_at=NULL, suspension_reason=NULL, updated_at=now() WHERE id=$1 RETURNING *', [req.params.id]);
    if (!updated.rowCount) return res.status(404).json({ error: 'not_found' });
    await query("UPDATE account_locks SET cleared_at=now() WHERE account_id=$1 AND lock_type='suspension' AND cleared_at IS NULL", [req.params.id]);
    await audit(req, 'admin.account.unsuspended', 'account', req.params.id);
    res.json({ account: updated.rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/admin/audit-events', authenticate, requireAdmin, async (_req, res) => {
  const result = await query('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 250');
  res.json({ events: result.rows });
});

app.get('/api/admin/billing-events', authenticate, requireAdmin, async (_req, res) => {
  const result = await query('SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 250');
  res.json({ events: result.rows });
});

app.get('/api/admin/checkout-sessions', authenticate, requireAdmin, async (_req, res) => {
  const result = await query('SELECT * FROM checkout_sessions ORDER BY created_at DESC LIMIT 250');
  res.json({ sessions: result.rows });
});

app.get('/api/admin/leads', authenticate, requireAdmin, async (_req, res) => {
  const result = await query('SELECT * FROM sales_leads ORDER BY created_at DESC LIMIT 250');
  res.json({ leads: result.rows });
});

app.post('/api/admin/api-keys', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const raw = `s13_${nanoid(32)}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prefix = raw.slice(0, 10);
    const created = await query(
      `INSERT INTO api_keys(name, prefix, key_hash, scopes, created_by_email)
       VALUES($1,$2,$3,$4,$5) RETURNING id, name, prefix, scopes, created_at`,
      [String(req.body.name || 'operator-key'), prefix, hash, req.body.scopes || ['admin'], req.user.email]
    );
    await audit(req, 'api_key.created', 'api_key', created.rows[0].id, { prefix });
    res.status(201).json({ apiKey: created.rows[0], secret: raw, warning: 'Store this secret now; only the hash is persisted.' });
  } catch (error) { next(error); }
});

async function getAccessibleAccount(req, id) {
  if (!id) return null;
  const where = ownedAccountWhere(req);
  const values = [...where.values, id];
  const result = await query(`SELECT * FROM accounts WHERE ${where.clause} AND id = $${values.length}`, values);
  return result.rows[0] || null;
}

app.use((error, _req, res, _next) => {
  const status = error.status || (error.code === '23505' ? 409 : 500);
  res.status(status).json({ error: error.code || 'server_error', message: error.message, details: error.details || undefined });
});

if (String(process.env.RUN_MIGRATIONS || 'true').toLowerCase() === 'true') {
  await runMigrations();
}

app.listen(port, () => {
  console.log(`SoveReign13 control plane listening on ${port}`);
});
