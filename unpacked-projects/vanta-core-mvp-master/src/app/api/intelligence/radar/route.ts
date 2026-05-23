import { NextResponse } from "next/server";
import { getCompetitorResponseRadar } from "@/lib/intelligence";
import { ownedTenantId, tenantGuardResponse } from "@/lib/tenant-guard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const tenantId = ownedTenantId(request, searchParams.get("tenantId"));
    const radar = await getCompetitorResponseRadar(tenantId);
    return NextResponse.json(radar);
  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error("Failed to fetch competitor radar:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
