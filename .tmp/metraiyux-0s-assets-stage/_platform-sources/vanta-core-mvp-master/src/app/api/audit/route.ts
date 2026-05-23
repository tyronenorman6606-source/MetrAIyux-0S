import { NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs } from '@/db/schema/schema';
import { desc, eq } from 'drizzle-orm';
import { ownedTenantId, tenantGuardResponse } from '@/lib/tenant-guard';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const tenantId = ownedTenantId(req, searchParams.get('tenantId'));
    const logs = await db.query.auditLogs.findMany({
      where: eq(auditLogs.tenantId, tenantId),
      orderBy: [desc(auditLogs.timestamp)],
      limit: 20,
    });

    return NextResponse.json(logs);
  } catch (error) {
    const guarded = tenantGuardResponse(error);
    if (guarded) return guarded;
    console.error('Audit Fetch Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
