import { db } from "@/db";
import { resellers, tenants, users, auditLogs, leads, calls } from "@/db/schema/schema";
import { eq, and, sql, count, gte } from "drizzle-orm";
import { logAudit } from "./audit";

export async function createReseller({
  name,
  slug,
  logoUrl,
  branding,
}: {
  name: string;
  slug: string;
  logoUrl?: string;
  branding?: any;
}) {
  try {
    const [reseller] = await db.insert(resellers).values({
      name,
      slug,
      logoUrl,
      branding,
    }).returning();

    await logAudit({
      resellerId: reseller.id,
      actor: "system",
      action: "create_reseller",
      entityType: "reseller",
      entityId: reseller.id,
      input: { name, slug },
      result: "Reseller account created",
    });

    return reseller;
  } catch (error: any) {
    console.error("Failed to create reseller:", error);
    throw error;
  }
}

export async function getResellerBySlug(slug: string) {
  return await db.query.resellers.findFirst({
    where: eq(resellers.slug, slug),
    with: {
      tenants: true,
    }
  });
}

export async function addTenantToReseller(tenantId: string, resellerId: string) {
  await db.update(tenants)
    .set({ resellerId, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));
  
  await logAudit({
    resellerId,
    tenantId,
    actor: "user",
    action: "add_tenant_to_reseller",
    entityType: "tenant",
    entityId: tenantId,
    input: { resellerId },
    result: "Tenant linked to reseller",
  });
}

export async function getResellerClients(resellerId: string) {
  const clients = await db.query.tenants.findMany({
    where: eq(tenants.resellerId, resellerId),
    with: {
      leads: true,
      contacts: true,
    }
  });

  return clients.map(client => ({
    ...client,
    metrics: {
      leads: client.leads.length,
      contacts: client.contacts.length,
    }
  }));
}

export async function getResellerUsageStats(resellerId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // aggregate leads across all tenants of this reseller
  const [leadStats] = await db
    .select({ count: count() })
    .from(leads)
    .innerJoin(tenants, eq(leads.tenantId, tenants.id))
    .where(and(eq(tenants.resellerId, resellerId), gte(leads.createdAt, thirtyDaysAgo)));

  const [callStats] = await db
    .select({ count: count() })
    .from(calls)
    .innerJoin(tenants, eq(calls.tenantId, tenants.id))
    .where(and(eq(tenants.resellerId, resellerId), gte(calls.createdAt, thirtyDaysAgo)));

  return {
    period: "Last 30 Days",
    totalLeads: leadStats.count,
    totalCalls: callStats.count,
  };
}

export async function updateTenantStatus({
  tenantId,
  resellerId,
  status,
}: {
  tenantId: string;
  resellerId: string;
  status: "active" | "suspended";
}) {
  await db.update(tenants)
    .set({ status, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await logAudit({
    resellerId,
    tenantId,
    actor: "user",
    action: "update_tenant_status",
    entityType: "tenant",
    entityId: tenantId,
    input: { status },
    result: `Tenant status updated to ${status}`,
  });
}

export async function transferTenant({
  tenantId,
  oldResellerId,
  newResellerId,
}: {
  tenantId: string;
  oldResellerId: string;
  newResellerId: string;
}) {
  await db.update(tenants)
    .set({ resellerId: newResellerId, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId));

  await logAudit({
    resellerId: newResellerId,
    tenantId,
    actor: "user",
    action: "transfer_tenant",
    entityType: "tenant",
    entityId: tenantId,
    input: { from: oldResellerId, to: newResellerId },
    result: "Tenant transferred between resellers",
  });
}

export async function exportTenantData(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    with: {
      contacts: true,
      leads: true,
    }
  });

  return {
    exportedAt: new Date(),
    data: tenant,
  };
}
