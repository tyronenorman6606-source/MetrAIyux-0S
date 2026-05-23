import fs from "node:fs";
import path from "node:path";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  const [, key, rawValue] = match;
  let value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

function truthyEnv(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "y" || normalized === "on";
}

function looksUnresolved(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  return (
    /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(raw) ||
    /^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-[\s\S]*)?\}$/.test(raw)
  );
}

function resolveEnvReference(value, depth = 0) {
  if (depth > 8) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const plainMatch = raw.match(/^\$([A-Za-z_][A-Za-z0-9_]*)$/);
  if (plainMatch) {
    const next = process.env[plainMatch[1]];
    if (next == null || next === "" || next === raw) return next || "";
    return resolveEnvReference(next, depth + 1);
  }

  const bracedMatch = raw.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-(.*))?\}$/);
  if (bracedMatch) {
    const [, key, fallback = ""] = bracedMatch;
    const next = process.env[key];
    if (next == null || next === "") return fallback;
    if (next === raw) return fallback;
    return resolveEnvReference(next, depth + 1);
  }

  return raw;
}

export function loadLocalEnv({ root, repoRoot = path.resolve(root, "..") }) {
  const files = [
    path.join(repoRoot, ".env"),
    path.join(root, ".env"),
    path.join(root, ".env.local")
  ];
  const loaded = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    let count = 0;
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      if (process.env[key] == null || process.env[key] === "" || looksUnresolved(process.env[key])) {
        process.env[key] = value;
        count += 1;
      }
    }
    loaded.push({ file, count });
  }
  const firstPresent = (...keys) =>
    keys
      .map((key) => resolveEnvReference(process.env[key]))
      .find((value) => value != null && value !== "");
  const setIfMissing = (key, value) => {
    if ((process.env[key] == null || process.env[key] === "") && value) process.env[key] = value;
  };

  const primaryDbUrl = firstPresent(
    "NETLIFY_DATABASE_URL",
    "DATABASE_URL",
    "PHC_NEON_DATABASE_URL",
    "NEON_DATABASE_URL",
    "SKYGATEFS13_NETLIFY_DATABASE_URL",
    "SKYGATEFS13_DATABASE_URL"
  );
  const backupDbUrl = firstPresent(
    "BACKUP_DATABASE_URL",
    "NEON_BACKUP_DATABASE_URL",
    "SKYGATEFS13_BACKUP_DATABASE_URL"
  );
  const useBackupDb =
    truthyEnv(resolveEnvReference(process.env.SKYGATE_USE_BACKUP_DATABASE)) ||
    truthyEnv(resolveEnvReference(process.env.SKYGATEFS13_USE_BACKUP_DATABASE_URL));
  const dbUrl = useBackupDb && backupDbUrl ? backupDbUrl : (primaryDbUrl || backupDbUrl);
  setIfMissing("NETLIFY_DATABASE_URL", dbUrl);
  setIfMissing("DATABASE_URL", dbUrl);

  const stripeSecret = firstPresent(
    "STRIPE_SECRET_KEY",
    "STRIPE_SECRET_KEY_LIVE",
    "stripe_key",
    "stripe_agent_key",
    "SKYGATEFS13_STRIPE_SECRET_KEY"
  );
  setIfMissing("STRIPE_SECRET_KEY", stripeSecret);

  const stripeWebhook = firstPresent(
    "STRIPE_WEBHOOK_SECRET",
    "stripe_webhook_secret",
    "PHC_STRIPE_WEBHOOK_SECRET",
    "SKYGATEFS13_STRIPE_WEBHOOK_SECRET"
  );
  setIfMissing("STRIPE_WEBHOOK_SECRET", stripeWebhook);

  const resendKey = firstPresent("RESEND_API_KEY", "SKYGATEFS13_RESEND_API_KEY");
  setIfMissing("RESEND_API_KEY", resendKey);

  const resendFrom = firstPresent("RESEND_FROM", "RESEND_FROM_EMAIL", "SKYEMAIL_FROM");
  setIfMissing("RESEND_FROM", resendFrom);

  const jwtSecret = firstPresent("JWT_SECRET", "SKYGATEFS13_JWT_SECRET");
  setIfMissing("JWT_SECRET", jwtSecret);

  const dbEncryptionKey = firstPresent("DB_ENCRYPTION_KEY", "SKYGATEFS13_DB_ENCRYPTION_KEY");
  setIfMissing("DB_ENCRYPTION_KEY", dbEncryptionKey);

  const adminPassword = firstPresent(
    "ADMIN_PASSWORD",
    "FS27_ADMIN_PASSWORD",
    "SKYGATEFS27_ADMIN_PASSWORD",
    "SKYGATEFS13_ADMIN_PASSWORD",
    "QA_ADMIN_PASSWORD",
    "PHC_OPERATOR_PASSWORD"
  );
  setIfMissing("ADMIN_PASSWORD", adminPassword);
  setIfMissing("FS27_ADMIN_PASSWORD", adminPassword);
  setIfMissing("SKYGATEFS27_ADMIN_PASSWORD", adminPassword);
  setIfMissing("SKYGATE_ADMIN_PASSWORD", adminPassword);
  setIfMissing("SKYEGATE_ADMIN_PASSWORD", adminPassword);

  const adminBearer = firstPresent(
    "ADMIN_BEARER_TOKEN",
    "SKYGATE_ADMIN_TOKEN",
    "SKYEGATE_ADMIN_TOKEN",
    "SKYGATE_ADMIN_JWT",
    "SKYEGATE_ADMIN_JWT",
    "SKYGATEFS13_WORKER_ADMIN_TOKEN"
  );
  setIfMissing("ADMIN_BEARER_TOKEN", adminBearer);
  setIfMissing("SKYGATE_ADMIN_TOKEN", adminBearer);
  setIfMissing("SKYEGATE_ADMIN_TOKEN", adminBearer);

  const skygateBaseUrl = firstPresent(
    "SKYGATE_BASE_URL",
    "SKYEGATE_BASE_URL",
    "SKYGATEFS27_ORIGIN",
    "SKYGATEFS27_WORKER_ORIGIN",
    "SKYEGATE_FS27_URL",
    "METRAIYUX_0S_SKYGATE_ORIGIN"
  );
  setIfMissing("SKYGATE_BASE_URL", skygateBaseUrl);
  setIfMissing("SKYEGATE_BASE_URL", skygateBaseUrl);

  const skysecureWriteSecret = firstPresent("SKYESECURE_WRITE_SECRET", "FS27_SKYESECURE_WRITE_SECRET");
  setIfMissing("SKYESECURE_WRITE_SECRET", skysecureWriteSecret);
  setIfMissing("FS27_SKYESECURE_WRITE_SECRET", skysecureWriteSecret);

  const skysecureProofPassphrase = firstPresent("SKYESECURE_LIVE_PROOF_PASSPHRASE");
  setIfMissing("SKYESECURE_LIVE_PROOF_PASSPHRASE", skysecureProofPassphrase);

  const skyeVaultPortalKey = firstPresent("SKYEVAULT_PORTAL_KEY", "CLIENT_PORTAL_KEY");
  setIfMissing("SKYEVAULT_PORTAL_KEY", skyeVaultPortalKey);
  setIfMissing("CLIENT_PORTAL_KEY", skyeVaultPortalKey);

  const fs27LiveBase = firstPresent("FS27_LIVE_BASE", "SKYGATEFS27_ORIGIN", "SKYGATEFS27_WORKER_ORIGIN", "SKYEGATE_FS27_URL", "SKYGATE_BASE_URL");
  setIfMissing("FS27_LIVE_BASE", fs27LiveBase);

  const metraiyux0sLiveBase = firstPresent("METRAIYUX_0S_LIVE_BASE", "METRAIYUX_0S_FULL_SYSTEM_URL");
  setIfMissing("METRAIYUX_0S_LIVE_BASE", metraiyux0sLiveBase);

  return loaded;
}
