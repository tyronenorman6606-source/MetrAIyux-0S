import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  pinAuth: read("netlify/functions/_lib/pinAuth.js"),
  emailAuth: read("netlify/functions/_lib/emailAuth.js"),
  db: read("netlify/functions/_lib/db.js"),
  setup: read("netlify/functions/auth-pin-setup.js"),
  login: read("netlify/functions/auth-pin-login.js"),
  recoveryLogin: read("netlify/functions/auth-recovery-login.js"),
  recoveryRotate: read("netlify/functions/auth-recovery-rotate.js"),
  redirects: read("netlify.toml"),
  pinGate: read("pin-gate.html"),
  catalog: read("netlify/functions/admin-platform-control.js"),
  migration: read("sql/migrate_v7_to_v8_pin_recovery.sql")
};

function assertIncludes(fileKey, token, message) {
  if (!files[fileKey].includes(token)) {
    throw new Error(`${fileKey}: ${message || `missing ${token}`}`);
  }
}

for (const token of [
  "user_pin_credentials",
  "user_recovery_codes",
  "hashPassword(pinSecret",
  "hashOpaqueToken(normalizeRecoveryCode",
  "rc.used_at is null",
  "set used_at = coalesce(used_at, now())",
  "GATE_ID_DIGITS = 10",
  "RECOVERY_CODE_COUNT = 10"
]) {
  assertIncludes("pinAuth", token);
}

for (const token of [
  "sendRecoveryCodesEmail",
  "AUTH_EMAIL_WEBHOOK_URL",
  "recovery_codes"
]) {
  assertIncludes("emailAuth", token);
}

for (const token of [
  "create table if not exists user_pin_credentials",
  "create table if not exists user_recovery_codes"
]) {
  assertIncludes("db", token);
  assertIncludes("migration", token);
}

for (const [fileKey, endpoint] of [
  ["setup", "auth-pin-setup"],
  ["login", "auth-pin-login"],
  ["recoveryLogin", "auth-recovery-login"],
  ["recoveryRotate", "auth-recovery-rotate"]
]) {
  assertIncludes("redirects", endpoint, `${endpoint} redirect missing`);
  assertIncludes(fileKey, "audit(", `${fileKey} audit missing`);
}

for (const endpoint of [
  "/auth/pin/setup",
  "/auth/pin/login",
  "/auth/recovery/login",
  "/auth/recovery/rotate"
]) {
  assertIncludes("pinGate", endpoint);
}

for (const token of ["metraiyux-houseoperations", "skyebox-authenticator", "PIN Gate"]) {
  assertIncludes("catalog", token);
}

console.log("pin-auth-source-proof: ok");
