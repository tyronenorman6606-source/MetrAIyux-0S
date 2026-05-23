import { NextResponse } from "next/server";
import { getMultiLocationGrid } from "@/lib/intelligence";
import { ownedTenantId, tenantGuardResponse } from "@/lib/tenant-guard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const parentTenantId = ownedTenantId(request, searchParams.get("parentTenantId"));
    const grid = await getMultiLocationGrid(parentTenantId);
    return NextResponse.json(grid);
  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error("Failed to fetch location grid:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
