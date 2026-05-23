import { db } from '@/db';
import { sql } from 'drizzle-orm';

export interface ReportPayload {
  tenantId: string;
  type: 'weekly' | 'monthly' | 'daily';
  data: Record<string, unknown>;
}

export async function deliverReport(payload: ReportPayload): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
