import crypto from "crypto";
import { q } from "./db.js";
import { hashOpaqueToken, hashPassword, randomOpaqueToken, verifyPassword } from "./passwords.js";

const PIN_MIN = 4;
const PIN_MAX = 12;
const GATE_ID_DIGITS = 10;
const RECOVERY_CODE_COUNT = 10;

export function normalizeGateId(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizePin(value) {
  return String(value || "").replace(/\s+/g, "");
}

export function normalizeRecoveryCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function assertValidPin(pin) {
  const value = normalizePin(pin);
  if (!/^\d+$/.test(value) || value.length < PIN_MIN || value.length > PIN_MAX) {
    const err = new Error(`PIN must be ${PIN_MIN}-${PIN_MAX} digits`);
    err.status = 400;
    err.code = "INVALID_PIN";
    throw err;
  }
  return value;
}

async function generateUniqueGateId() {
  for (let i = 0; i < 20; i += 1) {
    const gateId = Array.from({ length: GATE_ID_DIGITS }, () => crypto.randomInt(0, 10)).join("");
    const found = await q(`select 1 from user_pin_credentials where gate_id=$1 limit 1`, [gateId]);
    if (!found.rowCount) return gateId;
  }
  throw new Error("Could not allocate a unique gate id");
}

function pinSecret(gateId, pin) {
  return `skygate-pin:${normalizeGateId(gateId)}:${normalizePin(pin)}`;
}

function formatRecoveryCode(raw) {
  return raw.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

function recoveryRaw() {
  return formatRecoveryCode(randomOpaqueToken(9).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12).padEnd(12, "7"));
}

export async function createPinCredential({ user, pin, label = "Primary PIN gate" }) {
  const cleanPin = assertValidPin(pin);
  const gateId = await generateUniqueGateId();
  const credentialId = crypto.randomUUID();
  const pinHash = await hashPassword(pinSecret(gateId, cleanPin));
  await q(
    `insert into user_pin_credentials(id, user_id, gate_id, pin_hash, label)
     values ($1,$2,$3,$4,$5)`,
    [credentialId, user.id, gateId, pinHash, String(label || "Primary PIN gate").slice(0, 120)]
  );
  const codes = await rotateRecoveryCodes({ credentialId, userId: user.id });
  return { credential_id: credentialId, gate_id: gateId, recovery_codes: codes };
}

export async function rotateRecoveryCodes({ credentialId, userId }) {
  await q(`delete from user_recovery_codes where credential_id=$1`, [credentialId]);
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, recoveryRaw);
  for (let i = 0; i < codes.length; i += 1) {
    await q(
      `insert into user_recovery_codes(id, credential_id, user_id, code_hash, code_label, sent_at)
       values ($1,$2,$3,$4,$5,now())`,
      [crypto.randomUUID(), credentialId, userId, hashOpaqueToken(normalizeRecoveryCode(codes[i])), `recovery-${String(i + 1).padStart(2, "0")}`]
    );
  }
  await q(`update user_pin_credentials set recovery_sent_at=now(), updated_at=now() where id=$1`, [credentialId]);
  return codes;
}

export async function listPinCredentials(userId) {
  const res = await q(
    `select id, gate_id, label, status, recovery_sent_at, last_used_at, created_at, updated_at
     from user_pin_credentials
     where user_id=$1
     order by created_at desc`,
    [userId]
  );
  return res.rows || [];
}

export async function verifyPinCredential({ gateId, pin }) {
  const normalizedGateId = normalizeGateId(gateId);
  const cleanPin = assertValidPin(pin);
  const res = await q(
    `select c.*, u.email, u.email_normalized, u.display_name, u.primary_customer_id, u.role, u.email_verified_at, u.is_active, u.profile
     from user_pin_credentials c
     join users u on u.id = c.user_id
     where c.gate_id=$1 and c.status='active'
     limit 1`,
    [normalizedGateId]
  );
  if (!res.rowCount) return null;
  const row = res.rows[0];
  const ok = await verifyPassword(pinSecret(normalizedGateId, cleanPin), row.pin_hash);
  if (!ok) return null;
  await q(`update user_pin_credentials set last_used_at=now(), updated_at=now() where id=$1`, [row.id]);
  return {
    credential: {
      id: row.id,
      gate_id: row.gate_id,
      label: row.label,
      status: row.status,
      recovery_sent_at: row.recovery_sent_at,
      last_used_at: row.last_used_at
    },
    user: {
      id: row.user_id,
      email: row.email,
      email_normalized: row.email_normalized,
      display_name: row.display_name,
      primary_customer_id: row.primary_customer_id,
      role: row.role,
      email_verified_at: row.email_verified_at,
      is_active: row.is_active,
      profile: row.profile
    }
  };
}

export async function consumeRecoveryCredential({ gateId, recoveryCode }) {
  const normalizedGateId = normalizeGateId(gateId);
  const cleanCode = normalizeRecoveryCode(recoveryCode);
  if (!normalizedGateId || cleanCode.length < 8) return null;
  const res = await q(
    `update user_recovery_codes rc
     set used_at = coalesce(used_at, now())
     from user_pin_credentials c
     join users u on u.id = c.user_id
     where rc.credential_id = c.id
       and c.gate_id=$1
       and c.status='active'
       and rc.code_hash=$2
       and rc.used_at is null
       and (rc.expires_at is null or rc.expires_at > now())
     returning rc.*, c.gate_id, c.label, u.id as user_id, u.email, u.email_normalized, u.display_name, u.primary_customer_id, u.role, u.email_verified_at, u.is_active, u.profile`,
    [normalizedGateId, hashOpaqueToken(cleanCode)]
  );
  if (!res.rowCount) return null;
  const row = res.rows[0];
  return {
    credential: { id: row.credential_id, gate_id: row.gate_id, label: row.label },
    user: {
      id: row.user_id,
      email: row.email,
      email_normalized: row.email_normalized,
      display_name: row.display_name,
      primary_customer_id: row.primary_customer_id,
      role: row.role,
      email_verified_at: row.email_verified_at,
      is_active: row.is_active,
      profile: row.profile
    }
  };
}
