import { db } from "@/db";
import { auditLogs } from "@/db/schema/schema";
import { desc, eq, and, sql, gte } from "drizzle-orm";
import { mirrorFs27Event } from "@/lib/fs27-events";

export type AuditActor = "system" | "ai" | "user" | "firewall";

export type AuditLogRecord = {
  id: string;
  tenantId: string | null;
  userId: string | null;
  resellerId: string | null;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  input: any;
  result: string | null;
  error: string | null;
  integrityHash: string | null;
  timestamp: Date;
  createdAt: Date;
};

export async function logAudit({
  tenantId,
  userId,
  resellerId,
  actor,
  action,
  entityType,
  entityId,
  input,
  result,
  error,
}: {
  tenantId?: string;
  userId?: string;
  resellerId?: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string;
  input?: any;
  result?: string;
  error?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      resellerId,
      actor,
      action,
      entityType,
      entityId,
      input,
      result,
      error,
    });
    await mirrorFs27Event({ tenantId, actor, action, entityType, entityId, input, result, error });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function queryAuditLogs({
  tenantId,
  actor,
  action,
  entityType,
  limit = 50,
}: {
  tenantId?: string;
  actor?: string;
  action?: string;
  entityType?: string;
  limit?: number;
}): Promise<AuditLogRecord[]> {
  const conditions = [];
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));
  if (actor) conditions.push(eq(auditLogs.actor, actor));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));

  const logs = await db
    .select()
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);

  return logs as AuditLogRecord[];
}

export async function getAuditStats(tenantId?: string): Promise<{
  total: number;
  verifiedEntries: number;
}> {
  const conditions = [];
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const [{ verified }] = await db
    .select({ verified: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      conditions.length > 0
        ? and(...conditions, sql`${auditLogs.integrityHash} IS NOT NULL`)
        : sql`${auditLogs.integrityHash} IS NOT NULL`
    );

  return { total: count || 0, verifiedEntries: verified || 0 };
}
