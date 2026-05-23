import { NextResponse } from "next/server";
import { createOnboarding, type ServiceLane } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lane = String(body.lane || "") as ServiceLane;
    if (!["shared_skyemail", "client_domain", "bulk_hosted", "child_org"].includes(lane)) {
      return NextResponse.json({ error: "Invalid lane" }, { status: 400 });
    }
    if (!body.companyName) return NextResponse.json({ error: "companyName is required" }, { status: 400 });

    const mailboxNames = Array.isArray(body.mailboxNames)
      ? body.mailboxNames
      : String(body.mailboxNames || "")
          .split(/[\n,]+/)
          .map((v) => v.trim())
          .filter(Boolean);

    const result = await createOnboarding({
      companyName: String(body.companyName),
      contactName: body.contactName ? String(body.contactName) : undefined,
      contactEmail: body.contactEmail ? String(body.contactEmail) : undefined,
      contactPhone: body.contactPhone ? String(body.contactPhone) : undefined,
      lane,
      desiredDomain: body.desiredDomain ? String(body.desiredDomain) : undefined,
      sharedDomainPrefix: body.sharedDomainPrefix ? String(body.sharedDomainPrefix) : undefined,
      mailboxCount: Number(body.mailboxCount || 1),
      mailboxNames,
      notes: body.notes ? String(body.notes) : undefined,
      externalOwnerId: request.headers.get("x-gate-user-id") || body.externalOwnerId || undefined
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
