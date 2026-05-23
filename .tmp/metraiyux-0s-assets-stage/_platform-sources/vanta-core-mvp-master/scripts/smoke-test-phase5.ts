import { db } from "../src/db";
import { tenants, contacts, leads, services, followupEvents, auditLogs } from "../src/db/schema/schema";
import { createBooking } from "../src/lib/bookings";
import { enrollInSequence, processFollowups } from "../src/lib/followups";
import { eq } from "drizzle-orm";

async function smokeTestPhase5() {
  console.log("🚀 Starting VantaCore Phase 5 Smoke Test...");

  // 1. Get default tenant
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "skyes-over-london"),
  });

  if (!tenant) {
    console.error("❌ Default tenant not found. Please run seed first.");
    return;
  }

  console.log(`Using tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create a contact and lead
  console.log("\n--- Creating Test Contact & Lead ---");
  const [contact] = await db.insert(contacts).values({
    tenantId: tenant.id,
    name: "John Doe",
    phone: "+15550001111",
    source: "smoke-test",
  }).returning();

  const [lead] = await db.insert(leads).values({
    tenantId: tenant.id,
    contactId: contact.id,
    status: "new",
    urgency: "normal",
  }).returning();
  console.log(`Created lead: ${lead.id} for John Doe`);

  // 3. Test Booking Flow
  console.log("\n--- Testing Booking Flow ---");
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 24); // Tomorrow
  startTime.setMinutes(0, 0, 0);

  try {
    const appointment = await createBooking({
      tenantId: tenant.id,
      contactId: contact.id,
      startTime,
    });
    console.log(`✅ Appointment created: ${appointment.id} at ${appointment.startTime}`);
  } catch (error: any) {
    console.error(`❌ Booking failed: ${error.message}`);
  }

  // 4. Test Follow-up Enrollment
  console.log("\n--- Testing Follow-up Enrollment ---");
  await enrollInSequence(tenant.id, lead.id, "smoke-test-sequence");
  console.log(`✅ Enrolled lead ${lead.id} in sequence`);

  // 5. Test Follow-up Execution
  console.log("\n--- Testing Follow-up Execution ---");
  // Force an event to be due
  const now = new Date();
  await db.update(followupEvents)
    .set({ scheduledAt: new Date(now.getTime() - 1000) })
    .where(eq(followupEvents.leadId, lead.id));
  
  await processFollowups();
  console.log("✅ Follow-ups processed");

  // 6. Verify Audit Logs
  console.log("\n--- Verifying Audit Logs ---");
  const logs = await db.query.auditLogs.findMany({
    where: eq(auditLogs.tenantId, tenant.id),
    orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
    limit: 5,
  });

  console.log(`Found ${logs.length} audit logs. Recent actions:`);
  logs.forEach(log => console.log(`- ${log.action} (${log.entityType})`));

  console.log("\n✅ Phase 5 Smoke test complete!");
}

smokeTestPhase5().catch(console.error);
