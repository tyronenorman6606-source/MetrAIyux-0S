import { db } from "@/db";
import {
  leads,
  contacts,
  calls,
  followupEvents,
  followupSequences,
  conversations,
  messages,
} from "@/db/schema/schema";
import { eq, and, sql, isNull, lt } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

/**
 * Revenue Rescue Engine
 * Identifies missed opportunities (new leads with no follow-up activity,
 * missed calls with no recovery) and enrolls them in rescue sequences.
 */

export interface RescueResult {
  rescuedLeads: number;
  rescuedCalls: number;
  enrolled: number;
  details: string[];
}

export async function runRevenueRescue(ctx?: { tenantId?: string; isDryRun?: boolean }): Promise<RescueResult> {
  const result: RescueResult = { rescuedLeads: 0, rescuedCalls: 0, enrolled: 0, details: [] };
  const dryRun = ctx?.isDryRun ?? false;

  // Find rescue sequence or create reference
  const [rescueSequence] = await db
    .select()
    .from(followupSequences)
    .where(eq(followupSequences.name, "revenue-rescue"))
    .limit(1);

  if (!rescueSequence) {
    result.details.push("No 'revenue-rescue' follow-up sequence found. Skipping enrollment.");
    return result;
  }

  // --- 1. Stale leads: created > 2 hours ago, status=new, no messages ---
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const staleLeads = await db
    .select({ id: leads.id, tenantId: leads.tenantId, contactId: leads.contactId })
    .from(leads)
    .leftJoin(conversations, eq(conversations.contactId, leads.contactId))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      and(
        ctx?.tenantId ? eq(leads.tenantId, ctx.tenantId) : sql`TRUE`,
        eq(leads.status, "new"),
        lt(leads.createdAt, twoHoursAgo),
        isNull(messages.id)
      )
    )
    .groupBy(leads.id);

  result.rescuedLeads = staleLeads.length;
  result.details.push(`Found ${staleLeads.length} stale leads with no activity.`);

  // --- 2. Missed calls: status=missed, no follow-up message ---
  const missedCalls = await db
    .select({ id: calls.id, tenantId: calls.tenantId, contactId: calls.contactId })
    .from(calls)
    .leftJoin(conversations, eq(conversations.contactId, calls.contactId))
    .leftJoin(messages, and(eq(messages.conversationId, conversations.id), eq(messages.senderType, "ai")))
    .where(
      and(
        ctx?.tenantId ? eq(calls.tenantId, ctx.tenantId) : sql`TRUE`,
        eq(calls.status, "missed"),
        isNull(messages.id)
      )
    )
    .groupBy(calls.id);

  result.rescuedCalls = missedCalls.length;
  result.details.push(`Found ${missedCalls.length} missed calls without recovery SMS.`);

  // --- 3. Enroll in rescue sequence ---
  type Target = { tenantId: string; contactId: string; leadId?: string | null };
  const allTargets: Target[] = [
    ...staleLeads.map((l) => ({ tenantId: l.tenantId, contactId: l.contactId, leadId: l.id })),
    ...missedCalls.map((c) => ({ tenantId: c.tenantId, contactId: c.contactId, leadId: null })),
  ];

  if (!dryRun) {
    for (const target of allTargets) {
      try {
        await db.insert(followupEvents).values({
          tenantId: target.tenantId,
          sequenceId: rescueSequence.id,
          leadId: target.leadId ?? null,
          contactId: target.contactId,
          status: "pending",
          scheduledAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        });
        result.enrolled++;
      } catch (e: any) {
        result.details.push(`Failed to enroll contact ${target.contactId}: ${e.message}`);
      }
    }

    await logAudit({
      tenantId: ctx?.tenantId,
      actor: "system",
      action: "revenue_rescue_run",
      entityType: "automation",
      input: { dryRun, staleLeads: staleLeads.length, missedCalls: missedCalls.length },
      result: `Enrolled ${result.enrolled} targets in rescue sequence`,
    });
  } else {
    result.details.push(`Dry run: would enroll ${allTargets.length} targets.`);
  }

  return result;
}
