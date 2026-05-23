import { NextRequest, NextResponse } from 'next/server';
import { purchaseLead } from '@/lib/trade';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exchangeId, buyerTenantId: requestedBuyerTenantId } = body;
    const buyerTenantId = ownedTenantId(req, requestedBuyerTenantId);

    if (!exchangeId || !buyerTenantId) {
      return NextResponse.json(
        { error: 'exchangeId and buyerTenantId are required' },
        { status: 400 }
      );
    }

    const transaction = await purchaseLead({ exchangeId, buyerTenantId });
    return NextResponse.json(transaction);
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Trade Purchase Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to purchase lead' },
      { status: 500 }
    );
  }
}
