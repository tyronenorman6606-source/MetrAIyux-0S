import crypto from 'node:crypto';

export function verifyStripeSignature({ payload, signature, secret }) {
  if (!secret) return { ok: false, error: 'STRIPE_WEBHOOK_SECRET is not configured' };
  if (!signature) return { ok: false, error: 'Missing Stripe-Signature header' };

  // Minimal Stripe-style signature verification: t=timestamp,v1=signature
  const parts = Object.fromEntries(String(signature).split(',').map(part => {
    const [k, v] = part.split('=');
    return [k, v];
  }));
  if (!parts.t || !parts.v1) return { ok: false, error: 'Malformed Stripe-Signature header' };

  const signedPayload = `${parts.t}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  return ok ? { ok: true, timestamp: parts.t } : { ok: false, error: 'Invalid Stripe signature' };
}

export function activeSubscriptionStatuses() {
  return new Set(['active', 'trialing']);
}

export async function getEntitlement({ pool, query, teamSlug }) {
  const sub = await query(
    pool,
    `SELECT s.team_slug, s.plan_slug, s.status, s.current_period_end, p.plan_name, p.max_projects, p.max_databases, p.max_query_executions_month, p.max_storage_mb
     FROM commercial.subscriptions s
     JOIN platform.plans p ON p.plan_slug = s.plan_slug
     WHERE s.team_slug = $1
     ORDER BY s.updated_at DESC, s.created_at DESC
     LIMIT 1`,
    [teamSlug]
  );

  const requireActive = String(process.env.REQUIRE_ACTIVE_SUBSCRIPTION || 'false') === 'true';

  if (sub.rowCount === 0) {
    const allowed = !requireActive;
    return { allowed, reason: allowed ? 'No subscription found; active subscription not required in current env.' : 'No active subscription found.', subscription: null };
  }

  const subscription = sub.rows[0];
  const active = activeSubscriptionStatuses().has(subscription.status);
  const allowed = requireActive ? active : true;

  return {
    allowed,
    reason: allowed ? 'Entitled' : `Subscription status ${subscription.status} is not entitled.`,
    subscription
  };
}
