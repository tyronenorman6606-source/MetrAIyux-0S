import { db } from '@/db';
import { blockedCallers, vendorIntake, auditLogs } from '@/db/schema/schema';
import { logAudit } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';
import { Vanta13Decision } from './vanta13/adapter';

export interface FirewallResult {
  allowed: boolean;
  reason?: string;
  isVendor: boolean;
  isSpam: boolean;
}

export async function runFirewall(
  tenantId: string,
  from: string,
  decision: Vanta13Decision,
  contactId: string
): Promise<FirewallResult> {
  // 1. Check Manual Blocklist
  const blocked = await db.query.blockedCallers.findFirst({
    where: and(
      eq(blockedCallers.tenantId, tenantId),
      eq(blockedCallers.phone, from)
    ),
  });

  if (blocked) {
    await logAudit({
      tenantId,
      actor: 'firewall',
      action: 'blocked_caller_intercepted',
      entityType: 'contact',
      entityId: contactId,
      input: { from },
      result: 'Contact is in manual blocklist',
    });
    return { allowed: false, reason: 'Manual blocklist', isVendor: false, isSpam: true };
  }

  // 2. Handle AI Spam Detection
  if (decision.shouldBlock || decision.callerType === 'spam' || decision.intent === 'spam') {
    await logAudit({
      tenantId,
      actor: 'firewall',
      action: 'spam_intercepted',
      entityType: 'contact',
      entityId: contactId,
      input: { from, decision },
      result: 'AI classified as spam/robocall',
    });
    return { allowed: false, reason: 'AI spam detection', isVendor: false, isSpam: true };
  }

  // 3. Handle Vendor Trap Routing
  if (decision.shouldRouteToVendor || decision.callerType === 'vendor' || decision.intent === 'vendor_pitch') {
    await db.insert(vendorIntake).values({
      tenantId,
      phone: from,
      pitch: decision.summary,
      status: 'new',
    });

    await logAudit({
      tenantId,
      actor: 'firewall',
      action: 'vendor_deflected',
      entityType: 'contact',
      entityId: contactId,
      input: { from, decision },
      result: 'Vendor routed to trap inbox',
    });
    return { allowed: false, reason: 'Vendor deflection', isVendor: true, isSpam: false };
  }

  // 4. Out-of-area check
  if (decision.serviceAreaMatch === false) {
    await logAudit({
      tenantId,
      actor: 'firewall',
      action: 'out_of_area_intercepted',
      entityType: 'contact',
      entityId: contactId,
      input: { from, decision },
      result: 'Request outside of service area',
    });
    return { allowed: false, reason: 'Out of area', isVendor: false, isSpam: false };
  }

  // 5. Repeat Nuisance Check
  // Count spam/unknown events in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAudits = await db.query.auditLogs.findMany({
    where: and(
      eq(auditLogs.tenantId, tenantId),
      eq(auditLogs.entityId, contactId),
      eq(auditLogs.action, 'process_intake')
    ),
  });

  const spamCount = recentAudits.filter(a => {
    try {
      const res = JSON.parse(a.result || '{}');
      return res.callerType === 'spam' || res.intent === 'unknown';
    } catch {
      return false;
    }
  }).length;

  if (spamCount > 5) {
    // Auto-block after 5 nuisance attempts
    await db.insert(blockedCallers).values({
      tenantId,
      phone: from,
      reason: 'Auto-blocked: Repeat nuisance',
    });

    await logAudit({
      tenantId,
      actor: 'firewall',
      action: 'auto_blocked_nuisance',
      entityType: 'contact',
      entityId: contactId,
      input: { from, spamCount },
      result: 'Repeated unknown/spam attempts triggered auto-block',
    });
    return { allowed: false, reason: 'Repeat nuisance', isVendor: false, isSpam: true };
  }

  return { allowed: true, isVendor: false, isSpam: false };
}
