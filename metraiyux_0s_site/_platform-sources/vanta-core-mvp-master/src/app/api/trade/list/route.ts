import { NextRequest, NextResponse } from 'next/server';
import { listLeadOnExchange } from '@/lib/trade';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId: requestedTenantId, leadId, basePrice, reservePrice } = body;
    const tenantId = ownedTenantId(req, requestedTenantId);

    if (!tenantId || !leadId || typeof basePrice !== 'number') {
      return NextResponse.json(
        { error: 'tenantId, leadId, and basePrice are required' },
        { status: 400 }
      );
    }

    const record = await listLeadOnExchange(tenantId, leadId, basePrice, reservePrice);
    return NextResponse.json(record);
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Trade List Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list lead on exchange' },
      { status: 500 }
    );
  }
}
