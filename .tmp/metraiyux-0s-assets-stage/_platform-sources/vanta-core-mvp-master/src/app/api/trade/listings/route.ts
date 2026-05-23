import { NextRequest, NextResponse } from 'next/server';
import { getExchangeListings } from '@/lib/trade';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'available';
  const excludeMine = searchParams.get('excludeMine');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const tenantId = searchParams.get('tenantId') ? ownedTenantId(req, searchParams.get('tenantId')) : undefined;
    const ownTenantId = ownedTenantId(req, tenantId);
    const listings = await getExchangeListings({
      tenantId: tenantId || undefined,
      status,
      limit,
      excludeTenantId: excludeMine === 'true' ? ownTenantId : undefined,
    });
    return NextResponse.json(listings);
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Trade Listings Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
