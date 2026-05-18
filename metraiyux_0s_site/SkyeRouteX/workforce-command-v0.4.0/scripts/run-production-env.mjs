import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const envFile = path.resolve(root, args.find(arg => !arg.startsWith('--')) || '.env.production');

function parseEnvFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing production env file: ${file}`);
  }
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim().replace(/^export\s+/, '');
    if (!key || /\s/.test(key) || key.startsWith('if ')) continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function setDefaultFrom(target, ...sources) {
  if (process.env[target]) return;
  for (const source of sources) {
    if (process.env[source]) {
      process.env[target] = process.env[source];
      return;
    }
  }
}

function firstCsv(value) {
  return String(value || '').split(',')[0].trim();
}

function applyAliases() {
  setDefaultFrom('DATABASE_URL', 'NETLIFY_DATABASE_URL', 'NEON_DATABASE_URL', 'SKYGATEFS13_DATABASE_URL', 'SKYGATEFS13_BACKUP_DATABASE_URL');
  if (!process.env.DATABASE_DRIVER && process.env.DATABASE_URL) process.env.DATABASE_DRIVER = 'postgres';

  setDefaultFrom('STORAGE_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'S3_ACCESS_KEY');
  setDefaultFrom('STORAGE_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY', 'S3_SECRET_KEY');
  setDefaultFrom('STORAGE_BUCKET', 'CLOUDFLARE_R2_BUCKET', 'R2_BUCKET', 'S3_BUCKET');
  setDefaultFrom('STORAGE_REGION', 'R2_REGION', 'S3_REGION', 'AWS_REGION');
  if (!process.env.STORAGE_ENDPOINT) {
    const account = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
    if (account) process.env.STORAGE_ENDPOINT = `https://${account}.r2.cloudflarestorage.com`;
  }
  if (!process.env.STORAGE_REGION && process.env.STORAGE_ENDPOINT) process.env.STORAGE_REGION = 'auto';
  if (!process.env.STORAGE_BUCKET && process.env.STORAGE_ENDPOINT) process.env.STORAGE_BUCKET = 'skyeroutex-proof';
  if (!process.env.STORAGE_DRIVER && process.env.STORAGE_ENDPOINT && process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY) {
    process.env.STORAGE_DRIVER = 'r2';
  }

  if (!process.env.SKYE_ADMIN_EMAIL) {
    process.env.SKYE_ADMIN_EMAIL = firstCsv(process.env.METRAIYUX_0S_SKYGATE_ADMIN_EMAILS || process.env.ADMIN_EMAILS || process.env.LEGAL_REVIEW_ADMIN_EMAIL);
  }
  setDefaultFrom('SKYE_ADMIN_PASSWORD', 'SKYGATEFS13_ADMIN_PASSWORD', 'ADMIN_PASSWORD', 'QA_ADMIN_PASSWORD');

  process.env.NODE_ENV ||= 'production';
  process.env.SKYE_REQUIRE_CSRF ||= '1';
  process.env.COOKIE_SECURE ||= '1';
  process.env.SKYE_ALLOW_LOCAL_PROOF_SERVICES ||= '0';

  setDefaultFrom('STRIPE_SECRET_KEY', 'STRIPE_SECRET_KEY_LIVE', 'SKYGATEFS13_STRIPE_SECRET_KEY');
  setDefaultFrom('STRIPE_WEBHOOK_SECRET', 'SKYGATEFS13_STRIPE_WEBHOOK_SECRET');
  if (!process.env.PAYMENT_PROVIDER && process.env.STRIPE_SECRET_KEY) process.env.PAYMENT_PROVIDER = 'stripe';

  setDefaultFrom('TWILIO_ACCOUNT_SID', 'SKYGATEFS13_TWILIO_ACCOUNT_SID');
  setDefaultFrom('TWILIO_AUTH_TOKEN', 'SKYGATEFS13_TWILIO_AUTH_TOKEN');
  setDefaultFrom('TWILIO_FROM_NUMBER', 'TWILIO_PHONE_NUMBER', 'SKYGATEFS13_TWILIO_PHONE_NUMBER');
  setDefaultFrom('TWILIO_DEFAULT_TO', 'TWILIO_TO_NUMBER', 'TWILIO_PHONE_NUMBER', 'SKYGATEFS13_TWILIO_PHONE_NUMBER');
  if (!process.env.NOTIFICATION_PROVIDER && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    process.env.NOTIFICATION_PROVIDER = 'twilio';
  }

  setDefaultFrom('MAPBOX_ACCESS_TOKEN', 'mapbox_api_key', 'MAPBOX_API_KEY', 'SKYEROUTEX_MAPBOX_ACCESS_TOKEN');
  if (!process.env.ROUTE_INTELLIGENCE_PROVIDER && process.env.MAPBOX_ACCESS_TOKEN) {
    process.env.ROUTE_INTELLIGENCE_PROVIDER = 'mapbox';
  }

  if (!process.env.IDENTITY_COMPLIANCE_PROVIDER && process.env.CHECKR_API_KEY && process.env.CHECKR_PACKAGE) {
    process.env.IDENTITY_COMPLIANCE_PROVIDER = 'checkr';
  }
  if (!process.env.IDENTITY_COMPLIANCE_PROVIDER) {
    setDefaultFrom('COMPLIANCE_WEBHOOK_ENDPOINT', 'METRAIYUX_0S_SKYGATE_FS27_EVENT_ENDPOINT', 'METRAIYUX_0S_SKYGATE_BROWSER_EVENT_ENDPOINT');
    setDefaultFrom('COMPLIANCE_WEBHOOK_SIGNING_SECRET', 'SKYGATEFS27_EVENT_MIRROR_SECRET', 'SKYGATE_EVENT_MIRROR_SECRET', 'PLATFORM_EVENT_MIRROR_SECRET');
    if (process.env.COMPLIANCE_WEBHOOK_ENDPOINT && process.env.COMPLIANCE_WEBHOOK_SIGNING_SECRET) {
      process.env.IDENTITY_COMPLIANCE_PROVIDER = 'compliance-webhook';
    }
  }
  if (!process.env.IDENTITY_COMPLIANCE_PROVIDER) {
    process.env.IDENTITY_COMPLIANCE_PROVIDER = 'manual-government-check';
  }
  process.env.COMPLIANCE_OPERATING_STATE ||= 'AZ';
  process.env.COMPLIANCE_BUSINESS_MODE ||= 'az_llc_admin_assist';

  process.env.SKYEHANDS_RUNTIME_PROVIDER ||= 'skyehands-runtime-bus';
  process.env.SKYEHANDS_RUNTIME_BUS_DIR ||= '../../../skyehands_runtime_control/.skyequanta';
  process.env.SKYEHANDS_RUNTIME_SOURCE_PLATFORM ||= 'skyeroutex-workforce-command';
  process.env.SKYEHANDS_RUNTIME_WORKSPACE_ID ||= 'skyeroutex-workforce-command';
}

function status(key) {
  return process.env[key] ? 'set' : 'missing';
}

function requiredReport() {
  const effectiveRouteProvider = process.env.ROUTE_INTELLIGENCE_PROVIDER || 'mapbox';
  const required = [
    'DATABASE_DRIVER',
    'DATABASE_URL',
    'STORAGE_DRIVER',
    'STORAGE_ENDPOINT',
    'STORAGE_BUCKET',
    'STORAGE_REGION',
    'STORAGE_ACCESS_KEY_ID',
    'STORAGE_SECRET_ACCESS_KEY',
    'SKYE_ADMIN_EMAIL',
    'SKYE_ADMIN_PASSWORD',
    'PAYMENT_PROVIDER',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NOTIFICATION_PROVIDER',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER',
    'TWILIO_DEFAULT_TO',
    'IDENTITY_COMPLIANCE_PROVIDER',
    'SKYEHANDS_RUNTIME_PROVIDER'
  ];
  if (effectiveRouteProvider === 'mapbox') required.push('MAPBOX_ACCESS_TOKEN');
  const report = Object.fromEntries(required.map(key => [key, status(key)]));
  report.ROUTE_INTELLIGENCE_PROVIDER = process.env.ROUTE_INTELLIGENCE_PROVIDER ? 'set' : 'default_mapbox_missing_explicit';
  return report;
}

Object.assign(process.env, parseEnvFile(envFile));
applyAliases();

if (checkOnly) {
  const report = requiredReport();
  const missing = Object.entries(report).filter(([, value]) => value !== 'set');
  console.log(JSON.stringify({ ok: missing.length === 0, envFile, report, missing: missing.map(([key, value]) => ({ key, state: value })) }, null, 2));
  process.exit(missing.length ? 1 : 0);
}

const { startServer } = await import('../src/server.js');
await startServer(Number(process.env.PORT || 4177));
