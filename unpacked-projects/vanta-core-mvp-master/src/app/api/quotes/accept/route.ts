import { NextRequest, NextResponse } from 'next/server';
import { acceptQuote } from '@/lib/quotes';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: requestedTenantId, quoteId, startTime, requireDeposit, depositAmount } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId || !quoteId || !startTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await acceptQuote({
      tenantId,
      quoteId,
      startTime: new Date(startTime),
      requireDeposit: requireDeposit || false,
      depositAmount: depositAmount || 0,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
