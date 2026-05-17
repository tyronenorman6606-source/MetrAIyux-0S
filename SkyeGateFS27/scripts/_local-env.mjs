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
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = value;
        count += 1;
      }
    }
    loaded.push({ file, count });
  }
  const firstPresent = (...keys) => keys.map((key) => process.env[key]).find((value) => value != null && value !== "");
  const setIfMissing = (key, value) => {
    if ((process.env[key] == null || process.env[key] === "") && value) process.env[key] = value;
  };

  const dbUrl = firstPresent(
    "NETLIFY_DATABASE_URL",
    "DATABASE_URL",
    "PHC_NEON_DATABASE_URL",
    "NEON_DATABASE_URL",
    "SKYGATEFS13_NETLIFY_DATABASE_URL",
    "SKYGATEFS13_DATABASE_URL"
  );
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
  return loaded;
}
