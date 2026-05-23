import { NextRequest, NextResponse } from 'next/server';
import { getMarketStats } from '@/lib/trade';

export async function GET(_req: NextRequest) {
  try {
    const stats = await getMarketStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Trade Stats Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch market stats' },
      { status: 500 }
    );
  }
}
