import { NextResponse } from "next/server";
import { createVanta13Adapter } from "@/lib/vanta13/adapter";
import { logAudit } from "@/lib/audit";
import { ownedTenantId, tenantGuardResponse } from "@/lib/tenant-guard";

export async function POST(req: Request) {
  try {
    const { text, tenantId: requestedTenantId } = await req.json();
    const tenantId = requestedTenantId ? ownedTenantId(req, requestedTenantId) : undefined;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const adapter = createVanta13Adapter();
    const decision = await adapter.classify({ text });

    // Log the action
    await logAudit({
      tenantId,
      actor: "ai",
      action: "classify_intent",
      entityType: "message",
      input: { text },
      result: JSON.stringify(decision),
    });

    return NextResponse.json(decision);
  } catch (error) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error("Classification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
