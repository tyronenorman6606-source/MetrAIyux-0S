export interface LeakageSignal {
  leadId: string;
  type: 'missed_call' | 'unbooked' | 'no_show' | 'abandoned_quote';
  value: number;
}

export async function detectLeakage(): Promise<LeakageSignal[]> {
  return [];
}

export async function calculateRevenueAtRisk(tenantId: string): Promise<number> {
  return 0;
}
