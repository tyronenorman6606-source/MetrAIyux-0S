import { db } from "@/db";
import { contacts, jobs, followupEvents, followupSequences } from "@/db/schema/schema";
import { eq, and, sql, lt, not, exists, gte } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

/**
 * Reactivation Engine
 * Identifies dormant customers (no completed jobs in 90 days)
 * and enrolls them in reactivation sequences.
 */

export interface ReactivationResult {
  dormantCustomers: number;
  enrolled: number;
  details: string[];
}

export async function runReactivationCampaigns(ctx?: { tenantId?: string; isDryRun?: boolean }): Promise<ReactivationResult> {
  const result: ReactivationResult = { dormantCustomers: 0, enrolled: 0, details: [] };
  const dryRun = ctx?.isDryRun ?? false;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Find reactivation sequence
  const [reactivationSequence] = await db
    .select()
    .from(followupSequences)
    .where(eq(followupSequences.name, "reactivation"))
    .limit(1);

  if (!reactivationSequence) {
    result.details.push("No 'reactivation' follow-up sequence found. Skipping enrollment.");
    return result;
  }

  // Dormant customers: no completed jobs in last 90 days
  const dormantCustomers = await db
    .select({ id: contacts.id, tenantId: contacts.tenantId })
    .from(contacts)
    .where(
      and(
        ctx?.tenantId ? eq(contacts.tenantId, ctx.tenantId) : sql`TRUE`,
        not(
          exists(
            db.select({ id: jobs.id }).from(jobs).where(
              and(
                eq(jobs.contactId, contacts.id),
                eq(jobs.status, "completed"),
                gte(jobs.updatedAt, ninetyDaysAgo)
              )
            )
          )
        ),
        // Ensure they had at least one job historically
        exists(
          db.select({ id: jobs.id }).from(jobs).where(eq(jobs.contactId, contacts.id))
        )
      )
    );

  result.dormantCustomers = dormantCustomers.length;
  result.details.push(`Found ${dormantCustomers.length} dormant customers (no jobs in 90 days).`);

  if (!dryRun) {
    for (const customer of dormantCustomers) {
      try {
        await db.insert(followupEvents).values({
          tenantId: customer.tenantId,
          sequenceId: reactivationSequence.id,
          contactId: customer.id,
          status: "pending",
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        });
        result.enrolled++;
      } catch (e: any) {
        result.details.push(`Failed to enroll contact ${customer.id}: ${e.message}`);
      }
    }

    await logAudit({
      tenantId: ctx?.tenantId,
      actor: "system",
      action: "reactivation_run",
      entityType: "automation",
      input: { dryRun, dormantCustomers: dormantCustomers.length },
      result: `Enrolled ${result.enrolled} customers in reactivation sequence`,
    });
  } else {
    result.details.push(`Dry run: would enroll ${dormantCustomers.length} customers.`);
  }

  return result;
}
