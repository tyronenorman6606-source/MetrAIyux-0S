import { db } from "../src/db";
import { appointments, contacts, followupEvents, leads, services, tenants } from "../src/db/schema/schema";
import { markNoShow, rebookAppointment, createBooking, confirmBookingDeposit } from "../src/lib/bookings";
import { processIntake } from "../src/lib/leads";
import { generateQuote, acceptQuote } from "../src/lib/quotes";
import { MockVanta13Adapter } from "../src/lib/vanta13/adapter";
import { eq, sql } from "drizzle-orm";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function amount(value: unknown) {
  return Number.parseFloat(String(value));
}

function futureWeekday(daysFromNow: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

async function cleanupTenant(tenantId: string) {
  await db.execute(sql`
    delete from escrow_ledger
    where tenant_id = ${tenantId}
       or transaction_id in (
        select ltt.id
        from lead_trade_transactions ltt
        join lead_exchange le on le.id = ltt.exchange_id
        where ltt.buyer_tenant_id = ${tenantId} or le.tenant_id = ${tenantId}
      )
  `);
  await db.execute(sql`
    delete from lead_trade_transactions
    where buyer_tenant_id = ${tenantId}
       or exchange_id in (select id from lead_exchange where tenant_id = ${tenantId})
  `);
  await db.execute(sql`delete from lead_exchange where tenant_id = ${tenantId}`);
  await db.execute(sql`
    delete from competitor_alerts
    where tenant_id = ${tenantId}
       or monitor_id in (select id from competitor_monitors where tenant_id = ${tenantId})
  `);
  await db.execute(sql`delete from competitor_monitors where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from proof_ledger where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from audit_logs where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from invoices where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from billing_subscriptions where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from billing_customers where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from webhook_events where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from integrations where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from opt_outs where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from consent_events where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from content_ideas where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from review_requests where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from owner_alerts where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from ai_actions where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from automation_runs where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from vendor_intake where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from blocked_callers where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from followup_events where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from followup_sequences where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from tasks where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from appointments where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from jobs where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from lead_scores where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from quotes where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from leads where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from call_transcripts where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from calls where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from messages where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from conversations where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from contacts where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from service_areas where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from services where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from business_packs where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from business_profiles where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from user_roles where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from users where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from tenant_branding where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from tenant_settings where tenant_id = ${tenantId}`);
  await db.execute(sql`delete from tenants where id = ${tenantId}`);
}

async function testDashboardApi(baseUrl: string, tenantId: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/dashboard/summary?tenantId=${tenantId}`);
  const body = await response.text();
  assert(response.ok, `Dashboard API returned ${response.status}: ${body.slice(0, 180)}`);
  const dashboard = JSON.parse(body);
  assert(dashboard.quotesGenerated >= 2, `Dashboard quotes count too low: ${dashboard.quotesGenerated}`);
  assert(dashboard.noShows >= 1, `Dashboard no-shows count too low: ${dashboard.noShows}`);
  console.log(`OK dashboard API summary: ${dashboard.quotesGenerated} quotes, ${dashboard.noShows} no-shows`);
}

async function testFlows() {
  console.log("Starting VantaCore conversion flow test");
  const runId = Date.now();
  let tenantId: string | undefined;

  try {
    const [tenant] = await db.insert(tenants).values({
      name: "VantaCore Flow Test",
      slug: `vantacore-flow-test-${runId}`,
    }).returning();
    tenantId = tenant.id;
    console.log(`OK created isolated tenant ${tenant.id}`);

    const [service] = await db.insert(services).values({
      tenantId: tenant.id,
      name: "General Plumbing",
      price: "150.00",
      duration: 60,
    }).returning();

    const [contact] = await db.insert(contacts).values({
      tenantId: tenant.id,
      name: "John Doe",
      phone: `555-${String(runId).slice(-4)}`,
    }).returning();

    const [lead] = await db.insert(leads).values({
      tenantId: tenant.id,
      contactId: contact.id,
      serviceId: service.id,
      status: "new",
    }).returning();

    const quote = await generateQuote({
      tenantId: tenant.id,
      leadId: lead.id,
      units: 2,
    });
    assert(amount(quote.amount) === 300, `Quote calculation incorrect: expected 300, got ${quote.amount}`);
    console.log(`OK quote generated at ${quote.amount}`);

    const accepted = await acceptQuote({
      tenantId: tenant.id,
      quoteId: quote.id,
      startTime: futureWeekday(1, 10),
      requireDeposit: true,
      depositAmount: 50,
    });
    assert(accepted.appointment.status === "pending_deposit", `Expected pending_deposit, got ${accepted.appointment.status}`);
    assert(accepted.depositIntent, "Deposit intent missing after quote acceptance");

    const paymentIntentId = accepted.depositIntent.clientSecret.split("_secret_")[0];
    await confirmBookingDeposit(tenant.id, accepted.appointment.id, paymentIntentId);
    const confirmedAppointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, accepted.appointment.id),
    });
    assert(confirmedAppointment?.depositStatus === "paid", "Deposit was not marked paid");
    assert(confirmedAppointment?.status === "confirmed", `Paid appointment status stayed ${confirmedAppointment?.status}`);
    console.log("OK quote acceptance, deposit, and booking confirmation");

    const noShowBooking = await createBooking({
      tenantId: tenant.id,
      contactId: contact.id,
      serviceId: service.id,
      startTime: futureWeekday(2, 10),
      requireDeposit: true,
      depositAmount: 75,
      leadId: lead.id,
    });
    assert(noShowBooking.depositIntent, "No-show booking deposit intent missing");
    const noShowPaymentIntentId = noShowBooking.depositIntent.clientSecret.split("_secret_")[0];
    await confirmBookingDeposit(tenant.id, noShowBooking.appointment.id, noShowPaymentIntentId);
    await markNoShow(tenant.id, noShowBooking.appointment.id);

    const rebooking = await rebookAppointment({
      tenantId: tenant.id,
      originalAppointmentId: noShowBooking.appointment.id,
      newStartTime: futureWeekday(7, 14),
      applyPreviousDeposit: true,
    });
    assert(rebooking.newAppointment.status === "confirmed", `Expected rebooking confirmed, got ${rebooking.newAppointment.status}`);
    assert(rebooking.newAppointment.depositStatus === "paid", "Previous deposit was not transferred to rebooking");

    const events = await db.query.followupEvents.findMany({
      where: eq(followupEvents.leadId, lead.id),
    });
    assert(events.length > 0, "No follow-up events created for no-show rebooking");
    console.log(`OK no-show rebooking created ${events.length} follow-up event(s)`);

    const adapter = new MockVanta13Adapter();
    const decision = await adapter.classify({ text: "What is the cost to fix 2 bathroom fixtures?" });
    const intakeResult = await processIntake({
      tenantId: tenant.id,
      channel: "chat",
      from: `555-${String(runId + 1).slice(-4)}`,
      content: "What is the cost to fix 2 bathroom fixtures?",
      decision,
      metadata: { units: 2 },
    });
    assert(intakeResult.quote, "No auto-quote generated from request_quote intent");
    console.log(`OK intake produced auto quote ${intakeResult.quote.id}`);

    const baseUrl = process.env.CONVERSION_BASE_URL || process.env.SMOKE_BASE_URL;
    if (baseUrl) {
      await testDashboardApi(baseUrl, tenant.id);
    } else {
      console.log("SKIP dashboard HTTP assertion because CONVERSION_BASE_URL/SMOKE_BASE_URL is not set");
    }

    console.log("VantaCore conversion flow test passed");
  } finally {
    if (tenantId) {
      await cleanupTenant(tenantId);
      console.log(`OK cleaned isolated tenant ${tenantId}`);
    }
  }
}

testFlows().catch((error) => {
  console.error("Conversion flow test failed:", error);
  process.exit(1);
});
