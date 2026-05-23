import { createHash } from "crypto";
import { db } from "@/db";
import { proofLedger } from "@/db/schema/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { logAudit } from "./audit";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ProofType = "audit" | "consent" | "transaction" | "compliance_snapshot" | "custom";

export interface ProofPayload {
  tenantId: string;
  proofType: ProofType;
  entityType?: string | null;
  entityId?: string | null;
  data: any;
  metadata?: any;
}

export interface ProofEntry {
  id: string;
  tenantId: string;
  proofType: string;
  entityType: string | null;
  entityId: string | null;
  dataHash: string;
  previousHash: string | null;
  proofHash: string;
  metadata: any;
  createdAt: Date;
}

export interface CompliancePacket {
  tenantId: string;
  exportedAt: string;
  rangeStart?: string;
  rangeEnd?: string;
  chainValid: boolean;
  proofs: ProofEntry[];
  integrityHash: string;
  verificationDetails: string[];
}

/* ------------------------------------------------------------------ */
/*  Canonicalization & Hashing                                        */
/* ------------------------------------------------------------------ */

/**
 * Deterministic JSON canonicalization.
 * Sorts object keys recursively to ensure identical payloads always
 * produce the same string regardless of insertion order.
 */
function canonicalize(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`);
  return "{" + entries.join(",") + "}";
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

async function getLastProof(tenantId: string): Promise<ProofEntry | null> {
  const rows = await db
    .select()
    .from(proofLedger)
    .where(eq(proofLedger.tenantId, tenantId))
    .orderBy(desc(proofLedger.createdAt))
    .limit(1);

  return (rows[0] as ProofEntry | undefined) ?? null;
}

function computeProofHash(payload: {
  tenantId: string;
  proofType: string;
  entityType: string | null;
  entityId: string | null;
  dataHash: string;
  previousHash: string | null;
  metadata: any;
}): string {
  return sha256(canonicalize(payload));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Append a new immutable proof to the tenant's ledger.
 * Automatically chains to the previous proof via `previousHash`.
 */
export async function createProof({
  tenantId,
  proofType,
  entityType,
  entityId,
  data,
  metadata,
}: ProofPayload): Promise<ProofEntry> {
  const dataHash = sha256(canonicalize(data));
  const lastProof = await getLastProof(tenantId);
  const previousHash = lastProof?.proofHash ?? null;

  const proofPayload = {
    tenantId,
    proofType,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    dataHash,
    previousHash,
    metadata: metadata ?? null,
  };

  const proofHash = computeProofHash(proofPayload);

  const [entry] = await db
    .insert(proofLedger)
    .values({
      tenantId,
      proofType,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      dataHash,
      previousHash,
      proofHash,
      metadata,
    })
    .returning();

  await logAudit({
    tenantId,
    actor: "system",
    action: "create_proof",
    entityType: "proof_ledger",
    entityId: entry.id,
    input: { proofType, entityType, entityId, dataHash },
    result: proofHash,
  });

  return entry as ProofEntry;
}

/**
 * Verify the integrity of the entire proof chain for a tenant.
 * Re-computes every proofHash and validates previousHash linkage.
 */
export async function verifyChain(tenantId: string): Promise<{
  valid: boolean;
  proofsChecked: number;
  firstInvalidId?: string;
  details: string[];
}> {
  const proofs = await db
    .select()
    .from(proofLedger)
    .where(eq(proofLedger.tenantId, tenantId))
    .orderBy(asc(proofLedger.createdAt));

  const details: string[] = [];
  let valid = true;
  const hashSet = new Set<string>();

  for (let i = 0; i < proofs.length; i++) {
    const p = proofs[i];

    if (hashSet.has(p.proofHash)) {
      valid = false;
      details.push(`Duplicate proofHash at index ${i} (id ${p.id})`);
    }
    hashSet.add(p.proofHash);

    const recompute = computeProofHash({
      tenantId: p.tenantId,
      proofType: p.proofType,
      entityType: p.entityType,
      entityId: p.entityId,
      dataHash: p.dataHash,
      previousHash: p.previousHash,
      metadata: p.metadata,
    });

    if (recompute !== p.proofHash) {
      valid = false;
      details.push(
        `Hash mismatch at index ${i} (id ${p.id}): stored ${p.proofHash}, recomputed ${recompute}`
      );
    }

    if (i === 0) {
      if (p.previousHash !== null) {
        valid = false;
        details.push(`Genesis proof (id ${p.id}) has non-null previousHash`);
      }
    } else {
      const prev = proofs[i - 1];
      if (p.previousHash !== prev.proofHash) {
        valid = false;
        details.push(
          `Chain break at index ${i} (id ${p.id}): previousHash ${p.previousHash} does not match previous proofHash ${prev.proofHash}`
        );
      }
    }
  }

  const firstInvalid = details.find((d) => d.includes("id"));
  const firstInvalidId = firstInvalid
    ? firstInvalid.match(/id ([a-f0-9-]+)/)?.[1]
    : undefined;

  return {
    valid,
    proofsChecked: proofs.length,
    firstInvalidId: valid ? undefined : firstInvalidId,
    details,
  };
}

/**
 * Fetch all proofs associated with a specific entity.
 */
export async function getProofsForEntity(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<ProofEntry[]> {
  return db
    .select()
    .from(proofLedger)
    .where(
      and(
        eq(proofLedger.tenantId, tenantId),
        eq(proofLedger.entityType, entityType),
        eq(proofLedger.entityId, entityId)
      )
    )
    .orderBy(asc(proofLedger.createdAt)) as Promise<ProofEntry[]>;
}

/**
 * Export a compliance packet for a tenant.
 * Contains a slice of the ledger (optionally date-bounded),
 * chain verification results, and an overall integrity hash.
 */
export async function exportCompliancePacket(
  tenantId: string,
  options?: { startDate?: Date; endDate?: Date }
): Promise<CompliancePacket> {
  const conditions = [eq(proofLedger.tenantId, tenantId)];

  if (options?.startDate) {
    conditions.push(gte(proofLedger.createdAt, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte(proofLedger.createdAt, options.endDate));
  }

  const proofs = await db
    .select()
    .from(proofLedger)
    .where(and(...conditions))
    .orderBy(asc(proofLedger.createdAt));

  const chainResult = await verifyChain(tenantId);
  const integrityHash = sha256(canonicalize(proofs.map((p) => p.proofHash)));

  return {
    tenantId,
    exportedAt: new Date().toISOString(),
    rangeStart: options?.startDate?.toISOString(),
    rangeEnd: options?.endDate?.toISOString(),
    chainValid: chainResult.valid,
    proofs: proofs as ProofEntry[],
    integrityHash,
    verificationDetails: chainResult.details,
  };
}
