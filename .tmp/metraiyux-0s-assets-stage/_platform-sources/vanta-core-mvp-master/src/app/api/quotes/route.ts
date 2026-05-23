import { NextRequest, NextResponse } from 'next/server';
import { generateQuote } from '@/lib/quotes';
import { db } from '@/db';
import { quotes } from '@/db/schema/schema';
import { eq, and } from 'drizzle-orm';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: requestedTenantId, leadId, units } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId || !leadId) {
      return NextResponse.json({ error: 'Missing tenantId or leadId' }, { status: 400 });
    }

    const quote = await generateQuote({ tenantId, leadId, units });
    return NextResponse.json(quote);
  } catch (error: unknown) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Quote generation failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let tenantId: string;
  const leadId = searchParams.get('leadId');

  try {
    tenantId = ownedTenantId(req, searchParams.get('tenantId'));
  } catch (error) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    throw error;
  }

  let query = db.select().from(quotes).where(eq(quotes.tenantId, tenantId));

  if (leadId) {
    query = db.select().from(quotes).where(
      and(
        eq(quotes.tenantId, tenantId),
        eq(quotes.leadId, leadId)
      )
    );
  }

  const results = await query;
  return NextResponse.json(results);
}
