import { db } from "@/db";
import {
  tenants,
  leads,
  jobs,
  calls,
  conversations,
  messages,
  businessProfiles,
  auditLogs,
  competitorMonitors,
  competitorAlerts,
} from "@/db/schema/schema";
import { eq, and, sql, count, sum, inArray, desc } from "drizzle-orm";
import { createOwnerAlert } from "./owner-alerts";
import { logAudit } from "./audit";

/* ------------------------------------------------------------------ */
/*  Response-Time Helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Calculate average first-response time (minutes) for a single tenant.
 * Uses raw SQL with sub-queries for accuracy; falls back to JS
 * computation over loaded rows if the driver rejects the query.
 */
async function getTenantResponseTime(tenantId: string): Promise<number | null> {
  try {
    const result = await db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (r.created_at - q.created_at)) / 60)::float as "avgMins"
      FROM ${conversations} c
      JOIN (
        SELECT m.conversation_id, MIN(m.created_at) as created_at
        FROM ${messages} m
        WHERE m.sender_type = 'contact'
        GROUP BY m.conversation_id
      ) q ON q.conversation_id = c.id
      JOIN (
        SELECT m.conversation_id, MIN(m.created_at) as created_at
        FROM ${messages} m
        WHERE m.sender_type IN ('ai','user')
        GROUP BY m.conversation_id
      ) r ON r.conversation_id = c.id AND r.created_at > q.created_at
      WHERE c.tenant_id = ${tenantId}
    `);
    const row = (result as unknown as any[])[0];
    return row?.avgMins ? Math.round(row.avgMins) : null;
  } catch (err) {
    console.error("[intelligence] tenant response-time SQL failed, falling back:", err);
    return getTenantResponseTimeFallback(tenantId);
  }
}

async function getTenantResponseTimeFallback(tenantId: string): Promise<number | null> {
  const convs = await db.query.conversations.findMany({
    where: eq(conversations.tenantId, tenantId),
    with: {
      messages: { orderBy: [sql`${messages.createdAt} asc`] },
    },
  });
  let total = 0;
  let n = 0;
  for (const conv of convs) {
    const contactMsg = conv.messages.find((m) => m.senderType === "contact");
    const respMsg = conv.messages.find(
      (m) =>
        (m.senderType === "ai" || m.senderType === "user") &&
        new Date(m.createdAt) > new Date(contactMsg?.createdAt || 0)
    );
    if (contactMsg && respMsg) {
      total +=
        (new Date(respMsg.createdAt).getTime() - new Date(contactMsg.createdAt).getTime()) /
        (1000 * 60);
      n++;
    }
  }
  return n > 0 ? Math.round(total / n) : null;
}

/**
 * Industry-wide average first-response time.
 */
async function getIndustryResponseTime(industry: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (r.created_at - q.created_at)) / 60)::float as "avgMins"
      FROM ${conversations} c
      JOIN ${businessProfiles} bp ON bp.tenant_id = c.tenant_id
      JOIN (
        SELECT m.conversation_id, MIN(m.created_at) as created_at
        FROM ${messages} m
        WHERE m.sender_type = 'contact'
        GROUP BY m.conversation_id
      ) q ON q.conversation_id = c.id
      JOIN (
        SELECT m.conversation_id, MIN(m.created_at) as created_at
        FROM ${messages} m
        WHERE m.sender_type IN ('ai','user')
        GROUP BY m.conversation_id
      ) r ON r.conversation_id = c.id AND r.created_at > q.created_at
      WHERE bp.industry = ${industry}
    `);
    const row = (result as unknown as any[])[0];
    if (row?.avgMins) return Math.round(row.avgMins);
  } catch (err) {
    console.error("[intelligence] industry response-time SQL failed:", err);
  }
  return 8; // fallback benchmark
}

/* ------------------------------------------------------------------ */
/*  1. Multi-Location Command Grid                                    */
/* ------------------------------------------------------------------ */

export interface LocationMetric {
  tenantId: string;
  name: string;
  industry: string;
  status: string;
  leads: number;
  bookedLeads: number;
  revenue: number;
  callsAnswered: number;
  missedCallsRecovered: number;
  coldCallsBlocked: number;
  responseTimeMins: number;
  responseTimeLabel: string;
  conversionRate: number;
  isLagging: boolean;
  lagReasons: string[];
}

export interface GridBenchmarks {
  avgLeads: number;
  avgRevenue: number;
  avgConversion: number;
  avgResponseTime: number;
  avgCallsAnswered: number;
  avgColdCallsBlocked: number;
}

export interface MultiLocationGrid {
  locations: LocationMetric[];
  benchmarks: GridBenchmarks;
  totalLocations: number;
  activeLocations: number;
  laggingLocations: number;
  aggregateStats: {
    totalLeads: number;
    totalRevenue: number;
    totalCallsAnswered: number;
    totalColdCallsBlocked: number;
  };
}

/**
 * Aggregates performance data across a parent tenant and all its child
 * locations (tenants where parentId = the given tenantId).
 */
export async function getMultiLocationGrid(parentTenantId: string): Promise<MultiLocationGrid> {
  // 1. Resolve parent + children
  const allTenants = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      status: tenants.status,
      industry: businessProfiles.industry,
    })
    .from(tenants)
    .leftJoin(businessProfiles, eq(tenants.id, businessProfiles.tenantId))
    .where(eq(tenants.parentId, parentTenantId));

  if (allTenants.length === 0) {
    return {
      locations: [],
      benchmarks: {
        avgLeads: 0,
        avgRevenue: 0,
        avgConversion: 0,
        avgResponseTime: 0,
        avgCallsAnswered: 0,
        avgColdCallsBlocked: 0,
      },
      totalLocations: 0,
      activeLocations: 0,
      laggingLocations: 0,
      aggregateStats: { totalLeads: 0, totalRevenue: 0, totalCallsAnswered: 0, totalColdCallsBlocked: 0 },
    };
  }

  const tenantIds = allTenants.map((t) => t.id);

  // 2. Bulk aggregates
  const leadCounts = await db
    .select({ tenantId: leads.tenantId, count: count() })
    .from(leads)
    .where(inArray(leads.tenantId, tenantIds))
    .groupBy(leads.tenantId);

  const bookedLeads = await db
    .select({ tenantId: leads.tenantId, count: count() })
    .from(leads)
    .where(and(inArray(leads.tenantId, tenantIds), eq(leads.status, "booked")))
    .groupBy(leads.tenantId);

  const revenuePerTenant = await db
    .select({ tenantId: jobs.tenantId, total: sum(jobs.totalAmount) })
    .from(jobs)
    .where(and(inArray(jobs.tenantId, tenantIds), eq(jobs.status, "completed")))
    .groupBy(jobs.tenantId);

  const callsAnswered = await db
    .select({ tenantId: calls.tenantId, count: count() })
    .from(calls)
    .where(and(inArray(calls.tenantId, tenantIds), eq(calls.status, "completed")))
    .groupBy(calls.tenantId);

  const missedRecovered = await db
    .select({ tenantId: auditLogs.tenantId, count: count() })
    .from(auditLogs)
    .where(
      and(
        inArray(auditLogs.tenantId, tenantIds),
        eq(auditLogs.action, "missed_call_recovery_sent")
      )
    )
    .groupBy(auditLogs.tenantId);

  const coldBlocked = await db
    .select({ tenantId: auditLogs.tenantId, count: count() })
    .from(auditLogs)
    .where(and(inArray(auditLogs.tenantId, tenantIds), eq(auditLogs.action, "block_caller")))
    .groupBy(auditLogs.tenantId);

  // 3. Response times
  const responseTimeMap = new Map<string, number>();
  for (const id of tenantIds) {
    const rt = await getTenantResponseTime(id);
    responseTimeMap.set(id, rt ?? 8);
  }

  // 4. Build metrics map
  const metricsMap = new Map<string, LocationMetric>();
  for (const t of allTenants) {
    metricsMap.set(t.id, {
      tenantId: t.id,
      name: t.name,
      industry: t.industry || "General",
      status: t.status,
      leads: 0,
      bookedLeads: 0,
      revenue: 0,
      callsAnswered: 0,
      missedCallsRecovered: 0,
      coldCallsBlocked: 0,
      responseTimeMins: responseTimeMap.get(t.id) ?? 8,
      responseTimeLabel: "",
      conversionRate: 0,
      isLagging: false,
      lagReasons: [],
    });
  }

  for (const lc of leadCounts) {
    const m = metricsMap.get(lc.tenantId);
    if (m) m.leads = lc.count;
  }
  for (const bl of bookedLeads) {
    const m = metricsMap.get(bl.tenantId);
    if (m) m.bookedLeads = bl.count;
  }
  for (const rev of revenuePerTenant) {
    const m = metricsMap.get(rev.tenantId);
    if (m) m.revenue = parseFloat(rev.total || "0");
  }
  for (const ca of callsAnswered) {
    const m = metricsMap.get(ca.tenantId);
    if (m) m.callsAnswered = ca.count;
  }
  for (const mr of missedRecovered) {
    if (!mr.tenantId) continue;
    const m = metricsMap.get(mr.tenantId);
    if (m) m.missedCallsRecovered = mr.count;
  }
  for (const cb of coldBlocked) {
    if (!cb.tenantId) continue;
    const m = metricsMap.get(cb.tenantId);
    if (m) m.coldCallsBlocked = cb.count;
  }

  const locationMetrics = Array.from(metricsMap.values()).map((m) => ({
    ...m,
    responseTimeLabel: `${m.responseTimeMins}m`,
    conversionRate: m.leads > 0 ? parseFloat(((m.bookedLeads / m.leads) * 100).toFixed(2)) : 0,
  }));

  // 5. Benchmarks (active locations only)
  const activeLocations = locationMetrics.filter((m) => m.status === "active");
  const n = activeLocations.length || 1;
  const totalLeads = activeLocations.reduce((s, m) => s + m.leads, 0);
  const totalRevenue = activeLocations.reduce((s, m) => s + m.revenue, 0);
  const totalCallsAnswered = activeLocations.reduce((s, m) => s + m.callsAnswered, 0);
  const totalColdCallsBlocked = activeLocations.reduce((s, m) => s + m.coldCallsBlocked, 0);

  const benchmarks: GridBenchmarks = {
    avgLeads: parseFloat((totalLeads / n).toFixed(2)),
    avgRevenue: parseFloat((totalRevenue / n).toFixed(2)),
    avgConversion:
      activeLocations.length > 0
        ? parseFloat(
            (activeLocations.reduce((s, m) => s + m.conversionRate, 0) / activeLocations.length).toFixed(2)
          )
        : 0,
    avgResponseTime:
      activeLocations.length > 0
        ? Math.round(activeLocations.reduce((s, m) => s + m.responseTimeMins, 0) / activeLocations.length)
        : 8,
    avgCallsAnswered: parseFloat((totalCallsAnswered / n).toFixed(2)),
    avgColdCallsBlocked: parseFloat((totalColdCallsBlocked / n).toFixed(2)),
  };

  // 6. Lagging detection
  const laggingThresholdResponse = benchmarks.avgResponseTime * 1.2;
  const laggingThresholdConversion = benchmarks.avgConversion * 0.8;
  let laggingCount = 0;

  for (const loc of locationMetrics) {
    const reasons: string[] = [];
    if (loc.responseTimeMins > laggingThresholdResponse) {
      reasons.push(
        `Response time ${loc.responseTimeMins}m exceeds benchmark ${Math.round(laggingThresholdResponse)}m`
      );
    }
    if (loc.conversionRate < laggingThresholdConversion && loc.leads > 5) {
      reasons.push(
        `Conversion ${loc.conversionRate}% below benchmark ${laggingThresholdConversion.toFixed(1)}%`
      );
    }
    if (reasons.length > 0) {
      loc.isLagging = true;
      loc.lagReasons = reasons;
      laggingCount++;
      try {
        await createOwnerAlert({
          tenantId: loc.tenantId,
          type: "lagging_location",
          message: `Location ${loc.name} is lagging: ${reasons.join("; ")}`,
        });
      } catch (e) {
        console.error("Failed to create lagging location alert:", e);
      }
    }
  }

  // 7. Audit
  await logAudit({
    tenantId: parentTenantId,
    actor: "system",
    action: "multi_location_grid_generated",
    entityType: "intelligence",
    entityId: parentTenantId,
    input: { totalLocations: locationMetrics.length },
    result: `Grid generated. ${laggingCount} lagging locations detected.`,
  });

  return {
    locations: locationMetrics,
    benchmarks,
    totalLocations: locationMetrics.length,
    activeLocations: activeLocations.length,
    laggingLocations: laggingCount,
    aggregateStats: {
      totalLeads,
      totalRevenue,
      totalCallsAnswered,
      totalColdCallsBlocked,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  2. Competitor Response Radar                                      */
/* ------------------------------------------------------------------ */

export interface LagIntelligence {
  tenantResponseTime: number;
  industryBenchmark: number;
  status: "healthy" | "warning" | "critical";
  gap: number;
  sampleSize: number;
}

export interface CompetitorRadar {
  industry: string;
  lagIntelligence: LagIntelligence;
  marketComparison: {
    percentile: string;
    competitiveRisk: "High" | "Medium" | "Low";
  };
  recommendations: string[];
  auditId?: string;
}

export async function getCompetitorResponseRadar(tenantId: string): Promise<CompetitorRadar> {
  const profile = await db.query.businessProfiles.findFirst({
    where: eq(businessProfiles.tenantId, tenantId),
  });
  const industry = profile?.industry || "General";

  const industryBenchmarkMins = await getIndustryResponseTime(industry);
  const targetMins = await getTenantResponseTime(tenantId);
  const effectiveTarget = targetMins ?? Math.round(industryBenchmarkMins * 0.9);

  const gap = effectiveTarget - industryBenchmarkMins;
  let status: "healthy" | "warning" | "critical" = "healthy";
  if (effectiveTarget > industryBenchmarkMins * 1.5) status = "critical";
  else if (effectiveTarget > industryBenchmarkMins) status = "warning";

  const lagIntelligence: LagIntelligence = {
    tenantResponseTime: effectiveTarget,
    industryBenchmark: industryBenchmarkMins,
    status,
    gap,
    sampleSize: targetMins ? 1 : 0,
  };

  // Alerts
  if (status === "critical") {
    await createOwnerAlert({
      tenantId,
      type: "lag_spike",
      message: `Competitor Radar Alert: Your response time (${effectiveTarget}m) is significantly slower than the industry benchmark (${industryBenchmarkMins}m).`,
    });
  } else if (status === "warning") {
    await createOwnerAlert({
      tenantId,
      type: "lag_warning",
      message: `Competitor Radar Warning: Your response time (${effectiveTarget}m) is behind the industry benchmark (${industryBenchmarkMins}m).`,
    });
  }

  // Audit
  const auditId = await logAudit({
    tenantId,
    actor: "system",
    action: "competitor_radar_scan",
    entityType: "intelligence",
    entityId: tenantId,
    input: { industry, tenantResponseTime: effectiveTarget, industryBenchmark: industryBenchmarkMins },
    result: `Status: ${status}. Gap: ${gap}m.`,
  });

  const recommendations =
    status !== "healthy"
      ? [
          "Enable instant AI auto-reply for after-hours leads",
          "Check SMS notification settings for staff",
          "Review response patterns during peak hours",
          "Consider tightening follow-up sequence intervals",
        ]
      : [
          "Maintain current response speed to dominate market",
          "Focus on conversion rate optimization",
          "Leverage fast response in marketing copy",
        ];

  return {
    industry,
    lagIntelligence,
    marketComparison: {
      percentile: gap <= 0 ? "Top 25%" : gap <= 5 ? "Average" : "Below Average",
      competitiveRisk: status === "critical" ? "High" : status === "warning" ? "Medium" : "Low",
    },
    recommendations,
    auditId: auditId ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  3. Competitor Monitor CRUD                                        */
/* ------------------------------------------------------------------ */

export async function createCompetitorMonitor({
  tenantId,
  competitorName,
  url,
  type,
}: {
  tenantId: string;
  competitorName: string;
  url?: string;
  type: "pricing" | "services" | "reviews";
}) {
  const [monitor] = await db
    .insert(competitorMonitors)
    .values({ tenantId, competitorName, url, type })
    .returning();

  await logAudit({
    tenantId,
    actor: "user",
    action: "create_competitor_monitor",
    entityType: "competitor_monitor",
    entityId: monitor.id,
    input: { competitorName, url, type },
    result: "Monitor created",
  });

  return monitor;
}

export async function getCompetitorMonitors(tenantId: string) {
  return db.select().from(competitorMonitors).where(eq(competitorMonitors.tenantId, tenantId));
}

export async function createCompetitorAlert({
  tenantId,
  monitorId,
  changeSummary,
  severity,
}: {
  tenantId: string;
  monitorId: string;
  changeSummary: string;
  severity: "info" | "warning" | "critical";
}) {
  const [alert] = await db
    .insert(competitorAlerts)
    .values({ tenantId, monitorId, changeSummary, severity })
    .returning();

  if (severity === "critical") {
    await createOwnerAlert({
      tenantId,
      type: "competitor_change",
      message: `Competitor Alert: ${changeSummary}`,
    });
  }

  await logAudit({
    tenantId,
    actor: "system",
    action: "create_competitor_alert",
    entityType: "competitor_alert",
    entityId: alert.id,
    input: { monitorId, changeSummary, severity },
    result: `Alert severity: ${severity}`,
  });

  return alert;
}

export async function getCompetitorAlerts(tenantId: string) {
  return db
    .select()
    .from(competitorAlerts)
    .where(eq(competitorAlerts.tenantId, tenantId))
    .orderBy(desc(competitorAlerts.createdAt))
    .limit(50);
}
