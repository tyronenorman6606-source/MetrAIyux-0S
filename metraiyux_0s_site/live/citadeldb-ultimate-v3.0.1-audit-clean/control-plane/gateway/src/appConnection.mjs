import crypto from 'node:crypto';
import pg from 'pg';
import { redactSecrets } from './redact.mjs';

const { Client } = pg;

export function generateAppPassword() {
  const bytes = Number(process.env.CITADEL_APP_PASSWORD_BYTES || 32);
  return crypto.randomBytes(bytes).toString('base64url');
}

export function buildDatabaseUrl({ role, password, host, port, database }) {
  return `postgres://${encodeURIComponent(role)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

export function normalizeConnectionHost(value) {
  const raw = String(value || '').trim();
  if (!raw) return '127.0.0.1';

  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
      return new URL(raw).hostname || '127.0.0.1';
    }
  } catch {
    return raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split('/')[0].split(':')[0] || '127.0.0.1';
  }

  return raw.split('/')[0].replace(/:\d+$/, '') || '127.0.0.1';
}

export function safeConnectionParts({ appSlug, databaseName, roleName }) {
  const host = normalizeConnectionHost(process.env.CITADEL_DOMAIN || '127.0.0.1');
  const port = process.env.CITADEL_APP_CONNECTION_PORT || process.env.POSTGRES_PORT || 5432;
  return { appSlug, provider: 'postgres', host, port, database: databaseName, username: roleName };
}

export async function testDatabaseUrl(databaseUrl, { write = false } = {}) {
  const timeoutMs = Number(process.env.APP_WRITE_SMOKE_TIMEOUT_MS || 8000);
  const started = Date.now();
  const internalHost = process.env.CITADEL_INTERNAL_APP_DB_HOST || 'postgres';
  const internalPort = process.env.CITADEL_INTERNAL_APP_DB_PORT || '5432';

  async function runCheck(connectionString, usedFallback = false) {
    const client = new Client({ connectionString, connectionTimeoutMillis: timeoutMs });

    await client.connect();
    await client.query(`SET statement_timeout = ${Number(timeoutMs)}`);
    const version = await client.query('select current_database() as database, current_user as user, now() as checked_at');
    let writeResult = null;

    if (write) {
      await client.query(`create table if not exists citadel_app_smoke_receipts (id bigserial primary key, smoke_key text not null, created_at timestamptz not null default now())`);
      const smokeKey = `citadel-smoke-${crypto.randomUUID()}`;
      const insert = await client.query(`insert into citadel_app_smoke_receipts (smoke_key) values ($1) returning id, smoke_key, created_at`, [smokeKey]);
      const verify = await client.query(`select id, smoke_key, created_at from citadel_app_smoke_receipts where smoke_key = $1`, [smokeKey]);
      writeResult = { inserted: insert.rowCount === 1, verified: verify.rowCount === 1, row: verify.rows[0] || null };
    }

    try { await client.end(); } catch {}
    return { ok: true, elapsedMs: Date.now() - started, connection: version.rows[0], write: writeResult, usedInternalFallback: usedFallback };
  }

  try {
    return await runCheck(databaseUrl);
  } catch (error) {
    const message = String(error.message || '');
    try {
      const parsed = new URL(databaseUrl);
      if (['127.0.0.1', 'localhost'].includes(parsed.hostname) && /ECONNREFUSED|ENOTFOUND/.test(message)) {
        parsed.hostname = internalHost;
        parsed.port = internalPort;
        return await runCheck(parsed.toString(), true);
      }
    } catch {}

    return { ok: false, elapsedMs: Date.now() - started, error: redactSecrets(message) };
  }
}


export function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
