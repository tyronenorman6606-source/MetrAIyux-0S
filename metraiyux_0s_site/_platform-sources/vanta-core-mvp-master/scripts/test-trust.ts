import { db } from "@/db";
import { tenants, proofLedger } from "@/db/schema/schema";
import { createProof, verifyChain, exportCompliancePacket } from "@/lib/trust";
import { eq } from "drizzle-orm";

async function getOrCreateTestTenant() {
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "trust-test"),
  });
  if (existing) return existing;
  const rows = await db.insert(tenants).values({
    name: "Trust Test Tenant",
    slug: "trust-test",
  }).returning();
  return (rows as any[])[0] as typeof tenants.$inferSelect;
}

async function run() {
  console.log("=== Trust Layer Smoke Test ===\n");

  // 1. Ensure a test tenant exists
  const tenant = await getOrCreateTestTenant();
  console.log("Tenant:", tenant.id, "\n");

  // 2. Clean old proofs for idempotency
  await db.delete(proofLedger).where(eq(proofLedger.tenantId, tenant.id));
  console.log("Cleared old proofs for tenant\n");

  // 3. Create genesis proof (audit log snapshot)
  const p1 = await createProof({
    tenantId: tenant.id,
    proofType: "audit",
    entityType: "audit_log",
    entityId: "00000000-0000-0000-0000-000000000000",
    data: { action: "system_boot", actor: "system", timestamp: new Date().toISOString() },
    metadata: { version: "1.0.0" },
  });
  console.log("Proof 1 (genesis) created:", p1.proofHash, "previous:", p1.previousHash);

  // 4. Create second proof (consent event)
  const p2 = await createProof({
    tenantId: tenant.id,
    proofType: "consent",
    entityType: "consent_event",
    entityId: "00000000-0000-0000-0000-000000000001",
    data: { contactId: "c-1", channel: "sms", status: "granted" },
  });
  console.log("Proof 2 created:", p2.proofHash, "previous:", p2.previousHash);

  // 5. Create third proof (transaction)
  const p3 = await createProof({
    tenantId: tenant.id,
    proofType: "transaction",
    entityType: "job",
    entityId: "00000000-0000-0000-0000-000000000002",
    data: { jobId: "j-1", amount: 199.99, currency: "USD" },
  });
  console.log("Proof 3 created:", p3.proofHash, "previous:", p3.previousHash);

  // 6. Verify chain
  const chainOk = await verifyChain(tenant.id);
  console.log("\nChain verification:", chainOk.valid ? "PASS" : "FAIL");
  console.log("Proofs checked:", chainOk.proofsChecked);
  if (!chainOk.valid) {
    console.error("Details:", chainOk.details);
  }

  // 7. Tamper simulation: mutate a hash and expect failure
  console.log("\n--- Tamper Simulation ---");
  await db
    .update(proofLedger)
    .set({ proofHash: "deadbeef00000000000000000000000000000000000000000000000000000000" })
    .where(eq(proofLedger.id, p2.id));

  const tampered = await verifyChain(tenant.id);
  console.log("Tampered chain verification:", tampered.valid ? "PASS (unexpected)" : "FAIL (expected)");
  if (!tampered.valid) {
    console.log("Tamper caught at proof ID:", tampered.firstInvalidId);
  }

  // Restore for clean state
  await db
    .update(proofLedger)
    .set({ proofHash: p2.proofHash })
    .where(eq(proofLedger.id, p2.id));
  console.log("Restored tampered proof to original hash\n");

  // 8. Export compliance packet
  const packet = await exportCompliancePacket(tenant.id);
  console.log("--- Compliance Packet ---");
  console.log("Tenant:", packet.tenantId);
  console.log("Exported at:", packet.exportedAt);
  console.log("Chain valid:", packet.chainValid);
  console.log("Integrity hash:", packet.integrityHash);
  console.log("Proof count:", packet.proofs.length);

  console.log("\n=== Trust Layer Smoke Test Complete ===");
}

run().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
