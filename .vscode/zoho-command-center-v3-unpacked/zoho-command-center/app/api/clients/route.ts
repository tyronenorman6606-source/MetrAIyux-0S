import { NextResponse } from "next/server";
import { getClients } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json({ ok: true, clients });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
