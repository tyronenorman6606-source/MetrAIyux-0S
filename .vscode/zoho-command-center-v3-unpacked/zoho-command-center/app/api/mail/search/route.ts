import { NextResponse } from "next/server";
import { getMessages, searchMessages } from "@/lib/zoho";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const folderId = searchParams.get("folderId") || undefined;
    const limit = Number(searchParams.get("limit") || 25);
    const messages = q ? await searchMessages(q, { limit }) : await getMessages({ folderId, limit });
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
