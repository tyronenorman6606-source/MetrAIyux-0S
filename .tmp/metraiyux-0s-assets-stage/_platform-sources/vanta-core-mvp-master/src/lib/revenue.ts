import { db } from "@/db";
import { 
  leads, 
  calls, 
  jobs, 
  appointments, 
  reviewRequests, 
  auditLogs,
  blockedCallers,
  vendorIntake
} from "@/db/schema/schema";
import { eq, and, sql, count, sum } from "drizzle-orm";

export async function getRevenueIntelligence(tenantId: string) {
  // 1. Leads captured
  const [leadsCaptured] = await db
    .select({ value: count() })
    .from(leads)
    .where(eq(leads.tenantId, tenantId));

  // 2. Leads booked (Leads that have an associated job or appointment)
  const [leadsBooked] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), eq(leads.status, "booked")));

  // 3. Calls answered
  const [callsAnswered] = await db
    .select({ value: count() })
    .from(calls)
    .where(and(eq(calls.tenantId, tenantId), eq(calls.status, "completed")));

  // 4. Cold calls blocked
  const [blockedCount] = await db
    .select({ value: count() })
    .from(blockedCallers)
    .where(eq(blockedCallers.tenantId, tenantId));
  
  const [vendorCount] = await db
    .select({ value: count() })
    .from(vendorIntake)
    .where(eq(vendorIntake.tenantId, tenantId));

  // 5. Missed calls recovered (Audit logs with action 'missed_call_recovery_sent')
  const [recoveredCount] = await db
    .select({ value: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.action, "missed_call_recovery_sent")));

  // 6. Reviews requested
  const [reviewsRequested] = await db
    .select({ value: count() })
    .from(reviewRequests)
    .where(eq(reviewRequests.tenantId, tenantId));

  // 7. Estimated revenue protected (Sum of totalAmount from completed jobs)
  const [revenueProtected] = await db
    .select({ value: sum(jobs.totalAmount) })
    .from(jobs)
    .where(and(eq(jobs.tenantId, tenantId), eq(jobs.status, "completed")));

  // 8. Conversion rate (Booked leads / Total leads)
  const totalLeads = leadsCaptured.value || 0;
  const bookedLeads = leadsBooked.value || 0;
  const conversionRate = totalLeads > 0 ? (bookedLeads / totalLeads) * 100 : 0;

  return {
    leadsCaptured: totalLeads,
    leadsBooked: bookedLeads,
    callsAnswered: callsAnswered.value || 0,
    coldCallsBlocked: (blockedCount.value || 0) + (vendorCount.value || 0),
    missedCallsRecovered: recoveredCount.value || 0,
    reviewsRequested: reviewsRequested.value || 0,
    revenueProtected: parseFloat(revenueProtected.value || "0"),
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    // These would require more complex queries or historical data tracking
    averageResponseTime: "12m", // Mock for now
    sourcePerformance: [],
    topRequestedServices: []
  };
}

export async function completeJob({
  tenantId,
  jobId,
  amount,
}: {
  tenantId: string;
  jobId: string;
  amount: number;
}) {
  try {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) throw new Error("Job not found");

    // 1. Update job status and amount
    await db.update(jobs)
      .set({ 
        status: "completed", 
        totalAmount: amount.toString(),
        updatedAt: new Date()
      })
      .where(eq(jobs.id, jobId));

    // 2. Log the action
    await logAudit({
      tenantId,
      actor: "user",
      action: "complete_job",
      entityType: "job",
      entityId: jobId,
      input: { amount },
      result: "Job marked as completed",
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to complete job:", error);
    throw error;
  }
}

async function logAudit(params: any) {
  // Proxy to the real logAudit to avoid circular imports if needed, 
  // but we can just import it.
  const { logAudit: realLogAudit } = await import("./audit");
  return realLogAudit(params);
}
