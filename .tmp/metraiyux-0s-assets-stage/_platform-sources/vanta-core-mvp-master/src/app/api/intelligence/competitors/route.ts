import { NextResponse } from "next/server";
import {
  createCompetitorMonitor,
  getCompetitorMonitors,
  createCompetitorAlert,
  getCompetitorAlerts,
} from "@/lib/intelligence";
import { ownedTenantId, tenantGuardResponse } from "@/lib/tenant-guard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const tenantId = ownedTenantId(request, searchParams.get("tenantId"));
    const monitors = await getCompetitorMonitors(tenantId);
    const alerts = await getCompetitorAlerts(tenantId);
    return NextResponse.json({ monitors, alerts });
  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error("Failed to fetch competitors:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenantId: requestedTenantId, competitorName, url, type, action } = body;
    const tenantId = ownedTenantId(request, requestedTenantId);

    if (!tenantId || !competitorName || !type) {
      return NextResponse.json(
        { error: "tenantId, competitorName, and type are required" },
        { status: 400 }
      );
    }

    if (action === "alert") {
      const { monitorId, changeSummary, severity } = body;
      if (!monitorId || !changeSummary || !severity) {
        return NextResponse.json(
          { error: "monitorId, changeSummary, and severity are required for alerts" },
          { status: 400 }
        );
      }
      const alert = await createCompetitorAlert({ tenantId, monitorId, changeSummary, severity });
      return NextResponse.json(alert);
    }

    const monitor = await createCompetitorMonitor({ tenantId, competitorName, url, type });
    return NextResponse.json(monitor);
  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error("Failed to create competitor monitor:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
