import { NextRequest, NextResponse } from 'next/server';
import { matchBuyers } from '@/lib/trade';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const exchangeId = searchParams.get('exchangeId');

  if (!exchangeId) {
    return NextResponse.json(
      { error: 'exchangeId is required' },
      { status: 400 }
    );
  }

  try {
    const buyers = await matchBuyers(exchangeId);
    return NextResponse.json(buyers);
  } catch (error: any) {
    console.error('Trade Match Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to match buyers' },
      { status: 500 }
    );
  }
}
