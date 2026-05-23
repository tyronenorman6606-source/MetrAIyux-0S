import { db } from "@/db";
import { 
  leads, 
  calls, 
  jobs, 
  auditLogs,
  vendorIntake,
  blockedCallers
} from "@/db/schema/schema";
import { eq, and, gte, sql, count, sum } from "drizzle-orm";
import { getRevenueIntelligence } from "./revenue";

export async function generateDailyDigest(tenantId: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Stats for the last 24 hours
  const [newLeads] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), gte(leads.createdAt, yesterday)));

  const [newJobs] = await db
    .select({ value: count() })
    .from(jobs)
    .where(and(eq(jobs.tenantId, tenantId), gte(jobs.createdAt, yesterday), eq(jobs.status, "completed")));

  const [revenue] = await db
    .select({ value: sum(jobs.totalAmount) })
    .from(jobs)
    .where(and(eq(jobs.tenantId, tenantId), gte(jobs.createdAt, yesterday), eq(jobs.status, "completed")));

  const [blocked] = await db
    .select({ value: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenantId), gte(auditLogs.timestamp, yesterday), eq(auditLogs.action, "block_caller")));

  return {
    date: new Date().toLocaleDateString(),
    newLeads: newLeads.value,
    completedJobs: newJobs.value,
    revenue: parseFloat(revenue.value || "0"),
    noiseFiltered: blocked.value,
  };
}

export async function generateWeeklyReport(tenantId: string) {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const stats = await getRevenueIntelligence(tenantId);
  
  // In a real app, this would be formatted into an email/PDF
  return {
    period: "Last 7 Days",
    totalRevenue: stats.revenueProtected,
    conversionRate: stats.conversionRate,
    leadsCaptured: stats.leadsCaptured,
    noiseBlocked: stats.coldCallsBlocked,
    topServices: stats.topRequestedServices,
  };
}
