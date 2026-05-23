import { db } from '@/db';
import { appointments, jobs, auditLogs, services, contacts, leads } from '@/db/schema/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { logAudit } from './audit';
import { addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { enrollInSequence, DEFAULT_SEQUENCES } from './followups';
import { createDepositIntent, confirmDepositPayment } from './payments';

export interface AvailabilityRule {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export async function checkAvailability(
  tenantId: string,
  startTime: Date,
  durationMinutes: number
) {
  const endTime = addMinutes(startTime, durationMinutes);

  // 1. Check existing appointments for overlap
  const overlapping = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.tenantId, tenantId),
      or(
        and(
          gte(appointments.startTime, startTime),
          lte(appointments.startTime, endTime)
        ),
        and(
          gte(appointments.endTime, startTime),
          lte(appointments.endTime, endTime)
        )
      ),
      eq(appointments.status, 'confirmed')
    ),
  });

  if (overlapping) {
    return false;
  }

  // 2. Check business hours/rules (mocked for now, could be in tenantSettings)
  // Default: 9 AM - 5 PM, Mon-Fri
  const day = startTime.getDay();
  const hour = startTime.getHours();
  
  if (day === 0 || day === 6) return false; // Weekend
  if (hour < 9 || hour >= 17) return false; // Outside 9-5

  return true;
}

export async function createBooking({
  tenantId,
  contactId,
  serviceId,
  startTime,
  metadata,
  requireDeposit = false,
  depositAmount = 0,
  leadId,
}: {
  tenantId: string;
  contactId: string;
  serviceId?: string;
  startTime: Date;
  metadata?: any;
  requireDeposit?: boolean;
  depositAmount?: number;
  leadId?: string;
}) {
  try {
    // Get service duration
    let duration = 60; // default
    if (serviceId) {
      const service = await db.query.services.findFirst({
        where: eq(services.id, serviceId),
      });
      if (service?.duration) {
        duration = service.duration;
      }
    }

    const endTime = addMinutes(startTime, duration);

    // Check availability
    const isAvailable = await checkAvailability(tenantId, startTime, duration);
    if (!isAvailable) {
      throw new Error('Requested time slot is not available');
    }

    // Create Job if not exists (or link to existing)
    // For now, create a new job per booking if not provided
    const jobData: any = {
      tenantId,
      contactId,
      status: 'scheduled',
    };
    if (leadId) {
      jobData.leadId = leadId;
    }
    const [job] = await db.insert(jobs).values(jobData).returning();

    // Create Appointment
    const appointmentData: any = {
      tenantId,
      jobId: job.id,
      contactId,
      serviceId,
      startTime,
      endTime,
      status: requireDeposit ? 'pending_deposit' : 'confirmed',
    };

    if (requireDeposit && depositAmount > 0) {
      appointmentData.depositAmount = depositAmount.toFixed(2);
      appointmentData.depositStatus = 'pending';
    }

    const [appointment] = await db.insert(appointments).values(appointmentData).returning();

    // If deposit required, create payment intent but keep status pending
    let depositIntent = null;
    if (requireDeposit && depositAmount > 0) {
      depositIntent = await createDepositIntent({
        tenantId,
        appointmentId: appointment.id,
        amount: depositAmount,
      });
    }

    // Log Audit
    await logAudit({
      tenantId,
      actor: 'system',
      action: 'create_booking',
      entityType: 'appointment',
      entityId: appointment.id,
      input: { startTime, serviceId, contactId, requireDeposit, depositAmount },
      result: 'success',
    });

    return { appointment, depositIntent };
  } catch (error) {
    console.error('Booking creation error:', error);
    throw error;
  }
}

export async function confirmBookingDeposit(
  tenantId: string,
  appointmentId: string,
  paymentIntentId: string
) {
  const appointment = await confirmDepositPayment(tenantId, paymentIntentId);
  
  if (!appointment) {
    throw new Error('Appointment not found for payment intent');
  }

  // Update appointment status to confirmed
  await db.update(appointments)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)));

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'confirm_booking_deposit',
    entityType: 'appointment',
    entityId: appointmentId,
    input: { paymentIntentId },
    result: 'confirmed',
  });

  return appointment;
}

export async function cancelBooking(tenantId: string, appointmentId: string, reason?: string) {
  await db.update(appointments)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)));

  await logAudit({
    tenantId,
    actor: 'system',
    action: 'cancel_booking',
    entityType: 'appointment',
    entityId: appointmentId,
    input: { reason },
    result: 'cancelled',
  });
}

export async function markNoShow(tenantId: string, appointmentId: string) {
  const [appointment] = await db.update(appointments)
    .set({ status: 'no-show', updatedAt: new Date() })
    .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
    .returning();

  if (appointment) {
    await logAudit({
      tenantId,
      actor: 'system',
      action: 'mark_no_show',
      entityType: 'appointment',
      entityId: appointmentId,
      result: 'no-show',
    });

    // Trigger Smart Rebooking Follow-up
    await triggerNoShowFollowup(tenantId, appointment);
  }

  return appointment;
}

async function triggerNoShowFollowup(tenantId: string, appointment: any) {
  try {
    // 1. Get the job and lead
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, appointment.jobId),
    });

    if (job?.leadId) {
      // Enroll in rebooking sequence
      await enrollInSequence(tenantId, job.leadId, DEFAULT_SEQUENCES.NO_SHOW_REBOOKING);

      await logAudit({
        tenantId,
        actor: 'system',
        action: 'trigger_rebooking',
        entityType: 'followup',
        entityId: appointment.id,
        input: { contactId: appointment.contactId, leadId: job.leadId },
        result: 'enrolled',
      });
    } else {
      console.warn(`No leadId found for job ${appointment.jobId}, cannot trigger rebooking sequence.`);
    }
  } catch (error) {
    console.error('Error triggering no-show follow-up:', error);
  }
}

export async function rebookAppointment({
  tenantId,
  originalAppointmentId,
  newStartTime,
  applyPreviousDeposit = false,
}: {
  tenantId: string;
  originalAppointmentId: string;
  newStartTime: Date;
  applyPreviousDeposit?: boolean;
}) {
  // 1. Get original appointment
  const original = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.id, originalAppointmentId),
      eq(appointments.tenantId, tenantId)
    ),
    with: {
      job: true,
    },
  });

  if (!original) {
    throw new Error('Original appointment not found');
  }

  if (original.status !== 'no-show' && original.status !== 'cancelled') {
    throw new Error('Only no-show or cancelled appointments can be rebooked');
  }

  // 2. Create new booking
  const { appointment: newAppointment, depositIntent } = await createBooking({
    tenantId,
    contactId: original.contactId,
    serviceId: original.serviceId || undefined,
    startTime: newStartTime,
    metadata: { 
      source: 'rebooking', 
      originalAppointmentId,
      previousDepositApplied: applyPreviousDeposit,
    },
  });

  // 3. Apply previous deposit if applicable
  if (applyPreviousDeposit && original.depositStatus === 'paid' && original.depositAmount) {
    // Transfer deposit to new appointment
    await db.update(appointments)
      .set({
        depositAmount: original.depositAmount,
        depositStatus: 'paid',
        stripePaymentIntentId: original.stripePaymentIntentId,
        status: 'confirmed', // Auto-confirm since deposit already paid
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, newAppointment.id));
  }

  // 4. Update original appointment to mark as rebooked
  await db.update(appointments)
    .set({ status: 'rebooked', updatedAt: new Date() })
    .where(eq(appointments.id, originalAppointmentId));

  // 5. Log audit
  await logAudit({
    tenantId,
    actor: 'system',
    action: 'rebook_appointment',
    entityType: 'appointment',
    entityId: newAppointment.id,
    input: { originalAppointmentId, newStartTime, applyPreviousDeposit },
    result: 'success',
  });

  // Re-fetch the updated appointment for accurate return
  const finalAppointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, newAppointment.id),
  });

  return { newAppointment: finalAppointment || newAppointment, depositIntent };
}
