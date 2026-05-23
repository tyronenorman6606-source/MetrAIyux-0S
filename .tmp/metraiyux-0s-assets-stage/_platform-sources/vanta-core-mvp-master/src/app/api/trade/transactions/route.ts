import { NextRequest, NextResponse } from 'next/server';
import { getTenantTradeTransactions } from '@/lib/trade';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const tenantId = ownedTenantId(req, searchParams.get('tenantId'));
    const data = await getTenantTradeTransactions(tenantId, { limit });
    return NextResponse.json(data);
  } catch (error: any) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Trade Transactions Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
