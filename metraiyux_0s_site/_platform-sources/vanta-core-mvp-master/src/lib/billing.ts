import { db } from "@/db";
import { billingSubscriptions } from "@/db/schema/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "./audit";

export type PlanId = 'lead-defense' | 'business-operator' | 'autonomous-growth';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  'lead-defense': {
    id: 'lead-defense',
    name: 'Lead Defense',
    price: 97,
    features: [
      'missed-call-text-back',
      'lead-inbox',
      'basic-cold-call-filter',
      'basic-follow-up',
      'dashboard',
      'manual-booking-link',
      'review-request-link'
    ]
  },
  'business-operator': {
    id: 'business-operator',
    name: 'Business Operator',
    price: 197,
    features: [
      'missed-call-text-back',
      'lead-inbox',
      'basic-cold-call-filter',
      'basic-follow-up',
      'dashboard',
      'manual-booking-link',
      'review-request-link',
      'ai-intake',
      'lead-qualification',
      'booking-automation',
      'business-pack-setup',
      'review-automation',
      'owner-alerts',
      'customer-memory'
    ]
  },
  'autonomous-growth': {
    id: 'autonomous-growth',
    name: 'Autonomous Growth Operator',
    price: 297,
    features: [
      'missed-call-text-back',
      'lead-inbox',
      'basic-cold-call-filter',
      'basic-follow-up',
      'dashboard',
      'manual-booking-link',
      'review-request-link',
      'ai-intake',
      'lead-qualification',
      'booking-automation',
      'business-pack-setup',
      'review-automation',
      'owner-alerts',
      'customer-memory',
      'advanced-automations',
      'reactivation-campaigns',
      'content-ideas',
      'revenue-intelligence',
      'vendor-trap-inbox',
      'advanced-routing'
    ]
  }
};

export async function getTenantSubscription(tenantId: string) {
  const [sub] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.tenantId, tenantId))
    .limit(1);
  return sub;
}

export async function checkFeatureAccess(tenantId: string, feature: string): Promise<boolean> {
  const sub = await getTenantSubscription(tenantId);
  
  if (!sub || sub.status !== 'active') {
    // Audit gate failure
    await logAudit({
      tenantId,
      actor: 'system',
      action: 'gate_failure',
      entityType: 'subscription',
      input: { feature, subStatus: sub?.status || 'none' },
      result: 'Access denied: No active subscription'
    });
    return false;
  }

  const plan = PLANS[sub.planId as PlanId];
  if (!plan) return false;

  const hasAccess = plan.features.includes(feature);

  if (!hasAccess) {
    await logAudit({
      tenantId,
      actor: 'system',
      action: 'gate_failure',
      entityType: 'subscription',
      input: { feature, planId: sub.planId },
      result: `Access denied: Feature not in plan ${sub.planId}`
    });
  }

  return hasAccess;
}

export async function getPlanForTenant(tenantId: string): Promise<Plan | null> {
  const sub = await getTenantSubscription(tenantId);
  if (!sub) return null;
  return PLANS[sub.planId as PlanId] || null;
}
