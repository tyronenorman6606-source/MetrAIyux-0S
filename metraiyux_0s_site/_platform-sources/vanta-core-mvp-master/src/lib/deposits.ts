import { db } from '@/db';
import { appointments, jobs, auditLogs } from '@/db/schema/schema';
import { eq, and } from 'drizzle-orm';
import { logAudit } from './audit';
import { createDepositIntent, confirmDepositPayment } from './payments';
import { createBooking } from './bookings';

export async function requireDeposit({
  tenantId,
  appointmentId,
  amount,
}: {
  tenantId: string;
  appointmentId: string;
  amount: number;
}) {
  const intent = await createDepositIntent({ tenantId, appointmentId, amount });

  await db.update(appointments)
    .set({ depositAmount: amount.toFixed(2), depositStatus: 'pending', status: 'pending_deposit', updatedAt: new Date() })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)));

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'require_deposit',
    entityType: 'appointment',
    entityId: appointmentId,
    input: { amount },
    result: 'pending',
  });

  return intent;
}

export async function confirmDeposit({
  tenantId,
  appointmentId,
  paymentIntentId,
}: {
  tenantId: string;
  appointmentId: string;
  paymentIntentId: string;
}) {
  await confirmDepositPayment(tenantId, paymentIntentId);

  await db.update(appointments)
    .set({ depositStatus: 'paid', status: 'confirmed', updatedAt: new Date() })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)));

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'confirm_deposit',
    entityType: 'appointment',
    entityId: appointmentId,
    input: { paymentIntentId },
    result: 'confirmed',
  });

  return { success: true };
}

export async function rebookWithDeposit({
  tenantId,
  originalAppointmentId,
  newStartTime,
}: {
  tenantId: string;
  originalAppointmentId: string;
  newStartTime: Date;
}) {
  const original = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.id, originalAppointmentId),
      eq(appointments.tenantId, tenantId)
    ),
    with: { job: true },
  });

  if (!original) throw new Error('Original appointment not found');
  if (original.status !== 'no-show' && original.status !== 'cancelled') {
    throw new Error('Only no-show or cancelled appointments can be rebooked');
  }

  const { appointment: newAppointment } = await createBooking({
    tenantId,
    contactId: original.contactId,
    serviceId: original.serviceId || undefined,
    startTime: newStartTime,
    metadata: { source: 'rebooking', originalAppointmentId },
    leadId: original.job?.leadId || undefined,
  });

  if (original.depositStatus === 'paid' && original.depositAmount) {
    await db.update(appointments)
      .set({
        depositAmount: original.depositAmount,
        depositStatus: 'paid',
        stripePaymentIntentId: original.stripePaymentIntentId,
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, newAppointment.id));
  }

  await db.update(appointments)
    .set({ status: 'rebooked', updatedAt: new Date() })
    .where(eq(appointments.id, originalAppointmentId));

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'rebook_appointment',
    entityType: 'appointment',
    entityId: newAppointment.id,
    input: { originalAppointmentId, newStartTime },
    result: 'success',
  });

  const finalAppointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, newAppointment.id),
  });

  return { newAppointment: finalAppointment || newAppointment };
}

export async function refundDeposit({
  tenantId,
  appointmentId,
}: {
  tenantId: string;
  appointmentId: string;
}) {
  await db.update(appointments)
    .set({ depositStatus: 'refunded', updatedAt: new Date() })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)));

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'refund_deposit',
    entityType: 'appointment',
    entityId: appointmentId,
    result: 'refunded',
  });

  return { success: true };
}
