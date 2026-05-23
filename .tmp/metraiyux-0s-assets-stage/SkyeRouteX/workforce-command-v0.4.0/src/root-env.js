import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTROL_KEYS = new Set(['NODE_ENV', 'PORT']);

function parseEnv(source) {
  const parsed = {};
  for (const rawLine of String(source || '').split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quoted = value.length >= 2 && (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    );
    if (quoted) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    parsed[key] = value;
  }
  return parsed;
}

function findRootEnv(start = __dirname) {
  let current = path.resolve(start);
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(current, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function firstPresent(env, keys) {
  for (const key of keys) {
    if (String(env[key] || '').trim()) return env[key];
  }
  return '';
}

function setIfMissing(env, key, value, applied) {
  if (!String(value || '').trim()) return false;
  if (String(env[key] || '').trim()) return false;
  env[key] = String(value);
  applied.push(key);
  return true;
}

function applyDerivedAliases(env, initialKeys, applied) {
  const databaseUrl = firstPresent(env, ['DATABASE_URL', 'NETLIFY_DATABASE_URL', 'NEON_DATABASE_URL', 'PHC_NEON_DATABASE_URL', 'POSTGRES_URL']);
  setIfMissing(env, 'DATABASE_URL', databaseUrl, applied);
  if (databaseUrl) setIfMissing(env, 'DATABASE_DRIVER', 'postgres', applied);

  if (!initialKeys.has('STRIPE_SECRET_KEY') && String(env.STRIPE_SECRET_KEY_LIVE || '').trim()) {
    env.STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY_LIVE;
    applied.push('STRIPE_SECRET_KEY');
  }
  if (String(env.STRIPE_SECRET_KEY || '').trim()) setIfMissing(env, 'PAYMENT_PROVIDER', 'stripe', applied);

  const r2AccountId = firstPresent(env, ['CLOUDFLARE_R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID']);
  if (String(r2AccountId || '').trim()) {
    setIfMissing(env, 'STORAGE_ENDPOINT', `https://${r2AccountId}.r2.cloudflarestorage.com`, applied);
  }
  setIfMissing(env, 'STORAGE_BUCKET', firstPresent(env, ['CLOUDFLARE_R2_BUCKET', 'R2_BUCKET', 'S3_BUCKET']), applied);
  if (String(env.STORAGE_ENDPOINT || '').trim()) setIfMissing(env, 'STORAGE_BUCKET', 'skyeroutex-proof', applied);
  setIfMissing(env, 'STORAGE_REGION', firstPresent(env, ['R2_REGION', 'S3_REGION', 'AWS_REGION']) || 'auto', applied);
  setIfMissing(env, 'STORAGE_ACCESS_KEY_ID', firstPresent(env, ['CLOUDFLARE_R2_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'S3_ACCESS_KEY']), applied);
  setIfMissing(env, 'STORAGE_SECRET_ACCESS_KEY', firstPresent(env, ['CLOUDFLARE_R2_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY', 'S3_SECRET_KEY']), applied);
  if (
    String(env.STORAGE_ENDPOINT || '').trim() &&
    String(env.STORAGE_BUCKET || '').trim() &&
    String(env.STORAGE_ACCESS_KEY_ID || '').trim() &&
    String(env.STORAGE_SECRET_ACCESS_KEY || '').trim()
  ) {
    setIfMissing(env, 'STORAGE_DRIVER', 'r2', applied);
  }

  setIfMissing(env, 'TWILIO_FROM_NUMBER', env.TWILIO_PHONE_NUMBER, applied);
  setIfMissing(env, 'TWILIO_DEFAULT_TO', env.TWILIO_PHONE_NUMBER, applied);
  if (
    String(env.TWILIO_ACCOUNT_SID || '').trim() &&
    String(env.TWILIO_AUTH_TOKEN || '').trim() &&
    String(env.TWILIO_FROM_NUMBER || '').trim() &&
    String(env.TWILIO_DEFAULT_TO || '').trim()
  ) {
    setIfMissing(env, 'NOTIFICATION_PROVIDER', 'twilio', applied);
  }

  setIfMissing(env, 'MAPBOX_ACCESS_TOKEN', firstPresent(env, ['mapbox_api_key', 'MAPBOX_API_KEY', 'SKYEROUTEX_MAPBOX_ACCESS_TOKEN']), applied);
  if (String(env.MAPBOX_ACCESS_TOKEN || '').trim()) setIfMissing(env, 'ROUTE_INTELLIGENCE_PROVIDER', 'mapbox', applied);
  if (String(env.CHECKR_API_KEY || '').trim() && String(env.CHECKR_PACKAGE || '').trim()) {
    setIfMissing(env, 'IDENTITY_COMPLIANCE_PROVIDER', 'checkr', applied);
  } else if (String(env.COMPLIANCE_WEBHOOK_ENDPOINT || '').trim() && String(env.COMPLIANCE_WEBHOOK_SIGNING_SECRET || '').trim()) {
    setIfMissing(env, 'IDENTITY_COMPLIANCE_PROVIDER', 'compliance-webhook', applied);
  } else {
    setIfMissing(env, 'IDENTITY_COMPLIANCE_PROVIDER', 'manual-government-check', applied);
  }
  setIfMissing(env, 'COMPLIANCE_OPERATING_STATE', 'AZ', applied);
  setIfMissing(env, 'COMPLIANCE_BUSINESS_MODE', 'az_llc_admin_assist', applied);
}

export function loadRootEnv({ env = process.env, envPath = findRootEnv(), disabled = env.SKYEROUTEX_DISABLE_ROOT_ENV === '1' } = {}) {
  const applied = [];
  const skipped = [];
  if (disabled) return { loaded: false, envPath: envPath || null, applied, skipped, reason: 'disabled' };
  if (!envPath || !fs.existsSync(envPath)) return { loaded: false, envPath: envPath || null, applied, skipped, reason: 'not_found' };

  const initialKeys = new Set(Object.keys(env).filter((key) => String(env[key] || '').trim()));
  const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (CONTROL_KEYS.has(key)) {
      skipped.push(key);
      continue;
    }
    setIfMissing(env, key, value, applied);
  }
  applyDerivedAliases(env, initialKeys, applied);

  return { loaded: true, envPath, applied, skipped };
}

export function summarizeLiveEnv(env = process.env) {
  const databaseConfigured = !!firstPresent(env, ['DATABASE_URL', 'NETLIFY_DATABASE_URL', 'NEON_DATABASE_URL', 'PHC_NEON_DATABASE_URL', 'POSTGRES_URL']);
  const storageConfigured = ['STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_REGION', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY']
    .every((key) => String(env[key] || '').trim());
  const stripeSecret = !!String(env.STRIPE_SECRET_KEY || '').trim();
  const stripeWebhook = !!String(env.STRIPE_WEBHOOK_SECRET || '').trim();
  const twilioConfigured = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'TWILIO_DEFAULT_TO']
    .every((key) => String(env[key] || '').trim());
  const mapboxConfigured = !!String(firstPresent(env, ['MAPBOX_ACCESS_TOKEN', 'mapbox_api_key', 'MAPBOX_API_KEY', 'SKYEROUTEX_MAPBOX_ACCESS_TOKEN']) || '').trim();
  const checkrConfigured = !!String(env.CHECKR_API_KEY || '').trim() && !!String(env.CHECKR_PACKAGE || '').trim();
  const complianceProvider = env.IDENTITY_COMPLIANCE_PROVIDER || 'manual-government-check';
  const complianceWebhookConfigured = complianceProvider === 'compliance-webhook' &&
    !!String(env.COMPLIANCE_WEBHOOK_ENDPOINT || '').trim() &&
    !!String(env.COMPLIANCE_WEBHOOK_SIGNING_SECRET || '').trim();
  const manualComplianceConfigured = complianceProvider === 'manual-government-check';

  return {
    database: { configured: databaseConfigured, driver: env.DATABASE_DRIVER || null },
    storage: { configured: storageConfigured, driver: env.STORAGE_DRIVER || null },
    stripe: { configured: stripeSecret, webhook_configured: stripeWebhook, provider: env.PAYMENT_PROVIDER || null },
    twilio: { configured: twilioConfigured, provider: env.NOTIFICATION_PROVIDER || null },
    route_intelligence: { configured: mapboxConfigured, provider: env.ROUTE_INTELLIGENCE_PROVIDER || null },
    identity_compliance: {
      configured: checkrConfigured || complianceWebhookConfigured || manualComplianceConfigured,
      provider: complianceProvider,
      mode: manualComplianceConfigured ? (env.COMPLIANCE_BUSINESS_MODE || 'az_llc_admin_assist') : null,
      operating_state: env.COMPLIANCE_OPERATING_STATE || null
    },
    skyehands_runtime: { provider: env.SKYEHANDS_RUNTIME_PROVIDER || 'skyehands-runtime-bus' }
  };
}

export const ROOT_ENV_LOAD_RESULT = loadRootEnv();
