import express from 'express';
import crypto from 'node:crypto';
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import { createPool, query } from './db.mjs';
import { requireAdmin } from './auth.mjs';
import { appSlug, sqlIdent } from './sanitize.mjs';
import { availableProviders, aiEnabled, buildDebugContext, askOpenAI, askGemini } from './ai.mjs';
import { redactSecrets } from './redact.mjs';
import { generateAppPassword, buildDatabaseUrl, safeConnectionParts, testDatabaseUrl, sqlLiteral, normalizeConnectionHost } from './appConnection.mjs';
import { validateSqlForConsole, sqlPreview } from './sqlPolicy.mjs';
import { checkTeamQuota } from './platformQuota.mjs';
import { verifyStripeSignature, getEntitlement } from './commercial.mjs';
import { upstreamContext } from './platformAuth.mjs';
import { requireCommercialGate, recordUsage } from './liveGate.mjs';
import { protectedRoutes } from './protectedRoutes.mjs';
import { emitSkyGateEvent, skyGateStatus } from './skygateBridge.mjs';

const { Client } = pg;
const app = express();
const pool = createPool();

app.use(express.json({ limit: '1mb' }));


function asyncRoute(handler) {
  if (typeof handler !== 'function') return handler;
  if (handler.length >= 4) return handler;
  return function wrappedAsyncRoute(req, res, next) {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}

for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
  const original = app[method].bind(app);
  app[method] = (path, ...handlers) => original(path, ...handlers.map(asyncRoute));
}

app.use('/admin', requireAdmin, (req, _res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const metadata = {
    method: req.method,
    path: req.originalUrl || req.url,
    operator: req.operator || null,
    team: req.headers['x-citadel-team'] || null,
    account: req.headers['x-citadel-account'] || null
  };

  query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ($1, 'admin_mutation_request', $2, $3::jsonb)`,
    [req.operator?.id || 'token-operator', `${req.method} ${req.path}`, JSON.stringify(metadata)]
  ).catch(() => {});

  if (req.path !== '/skygate/proof-event') {
    emitSkyGateEvent({
      type: 'citadeldb.admin_mutation_request',
      actor: req.operator?.id || 'token-operator',
      orgId: req.operator?.tenant || req.headers['x-citadel-account'] || null,
      workspaceId: req.headers['x-citadel-team'] || null,
      meta: {
        method: req.method,
        path: req.originalUrl || req.url,
        operatorSource: req.operator?.source || null
      }
    }).catch(() => {});
  }

  next();
});


app.get('/health', async (_req, res) => {
  try {
    const result = await query(pool, 'SELECT now() AS server_time, current_database() AS database_name');
    res.json({
      ok: true,
      service: 'citadeldb-gateway',
      version: '3.0.1',
      mode: process.env.CITADEL_MODE || 'vps-postgres',
      database: result.rows[0].database_name,
      serverTime: result.rows[0].server_time
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/admin/apps', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT app_slug, database_name, role_name, engine, status, created_at
     FROM citadel.apps
     ORDER BY created_at DESC`
  );
  res.json({ ok: true, apps: result.rows });
});

app.get('/admin/skygate/status', requireAdmin, async (_req, res) => {
  res.json({ ok: true, skyGate: skyGateStatus() });
});

app.post('/admin/skygate/proof-event', requireAdmin, async (req, res) => {
  const body = z.object({
    type: z.string().min(2).max(160).optional(),
    meta: z.record(z.any()).optional().default({})
  }).parse(req.body || {});
  const event = await emitSkyGateEvent({
    type: body.type || 'citadeldb.skygate_bridge_proof',
    actor: req.operator?.id || 'token-operator',
    orgId: req.operator?.tenant || req.headers['x-citadel-account'] || null,
    workspaceId: req.headers['x-citadel-team'] || null,
    meta: {
      proof: true,
      operatorSource: req.operator?.source || null,
      ...body.meta
    }
  });
  res.status(event.ok ? 200 : 202).json({ ok: event.ok, event, skyGate: skyGateStatus() });
});

app.post('/admin/apps', requireAdmin, async (req, res) => {
  const body = z.object({
    app: z.string().min(2).max(80),
    engine: z.enum(['vps-postgres', 'cloudnativepg', 'supabase-pack', 'neon-lab']).optional()
  }).parse(req.body);

  const slug = appSlug(body.app);
  const engine = body.engine || process.env.CITADEL_MODE || 'vps-postgres';
  const dbName = `${process.env.APP_DB_NAME_PREFIX || 'app_'}${slug}`;
  const roleName = `${process.env.APP_DB_ROLE_PREFIX || 'app_'}${slug}_user`;
  const password = generateAppPassword();
  const client = await pool.connect();
  let txStarted = false;

  try {
    const roleExists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [roleName]);
    if (roleExists.rowCount === 0) {
      await client.query(`CREATE ROLE ${sqlIdent(roleName)} LOGIN PASSWORD ${sqlLiteral(password)} NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    }

    const dbExists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (dbExists.rowCount === 0) {
      // CREATE DATABASE cannot run inside a transaction block in Postgres.
      await client.query(`CREATE DATABASE ${sqlIdent(dbName)} OWNER ${sqlIdent(roleName)}`);
    }

    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${sqlIdent(dbName)} TO ${sqlIdent(roleName)}`);

    await client.query('BEGIN');
    txStarted = true;
    await client.query(
      `INSERT INTO citadel.apps (app_slug, database_name, role_name, engine)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (app_slug)
       DO UPDATE SET database_name = EXCLUDED.database_name,
                     role_name = EXCLUDED.role_name,
                     engine = EXCLUDED.engine,
                     status = 'active',
                     updated_at = now()`,
      [slug, dbName, roleName, engine]
    );

    await client.query(
      `INSERT INTO citadel.app_credentials (app_slug, role_name, secret_hint, metadata)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [slug, roleName, `generated-${new Date().toISOString()}`, JSON.stringify({ engine, database: dbName })]
    );

    const connectionParts = safeConnectionParts({ appSlug: slug, databaseName: dbName, roleName });
    const connectionHost = connectionParts.host;
    const connectionPort = connectionParts.port;
    const databaseUrl = buildDatabaseUrl({
      role: roleName,
      password,
      host: connectionHost,
      port: connectionPort,
      database: dbName
    });

    await client.query(
      `INSERT INTO citadel.app_environments
        (app_slug, environment, database_name, role_name, connection_host, connection_port, status)
       VALUES ($1, 'production', $2, $3, $4, $5, 'active')
       ON CONFLICT (app_slug, environment)
       DO UPDATE SET database_name = EXCLUDED.database_name,
                     role_name = EXCLUDED.role_name,
                     connection_host = EXCLUDED.connection_host,
                     connection_port = EXCLUDED.connection_port,
                     status = 'active'`,
      [
        slug,
        dbName,
        roleName,
        connectionHost,
        Number(connectionPort)
      ]
    );

    await client.query(
      `INSERT INTO citadel.audit_events (actor, action, target, metadata)
       VALUES ('gateway', 'create_app_db', $1, $2::jsonb)`,
      [slug, JSON.stringify({ database: dbName, role: roleName, engine })]
    );
    await client.query('COMMIT');
    txStarted = false;

    res.status(201).json({
      ok: true,
      app: slug,
      engine,
      database: dbName,
      role: roleName,
      databaseUrl,
      env: `DATABASE_PROVIDER=postgres\nDATABASE_URL=${databaseUrl}\nCITADEL_APP_SLUG=${slug}\n`,
      databaseUrlTemplate: `postgres://${roleName}:APP_PASSWORD@${connectionHost}:${connectionPort}/${dbName}`,
      warning: 'Store this password immediately. Plaintext credentials are not retained.'
    });
  } catch (error) {
    if (txStarted) await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ ok: false, error: error.message });
  } finally {
    client.release();
  }
});


app.get('/admin/backups', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT backup_kind, backup_path, database_name, size_bytes, checksum,
            created_at, restore_tested_at, restore_test_status, notes
     FROM citadel.backup_receipts
     ORDER BY created_at DESC
     LIMIT 100`
  );
  res.json({ ok: true, backups: result.rows });
});

app.post('/admin/backups/receipt', requireAdmin, async (req, res) => {
  const body = z.object({
    backupKind: z.string().min(2),
    backupPath: z.string().min(2),
    databaseName: z.string().min(1),
    sizeBytes: z.number().int().nonnegative().optional(),
    checksum: z.string().optional(),
    notes: z.string().optional()
  }).parse(req.body);

  const result = await query(
    pool,
    `INSERT INTO citadel.backup_receipts
      (backup_kind, backup_path, database_name, size_bytes, checksum, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [
      body.backupKind,
      body.backupPath,
      body.databaseName,
      body.sizeBytes || null,
      body.checksum || null,
      body.notes || null
    ]
  );

  res.status(201).json({ ok: true, receipt: result.rows[0] });
});

app.get('/admin/restores', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT backup_checksum, source_backup_path, target_database, started_at,
            finished_at, success, error, metadata
     FROM citadel.restore_receipts
     ORDER BY started_at DESC
     LIMIT 100`
  );
  res.json({ ok: true, restores: result.rows });
});

app.get('/admin/audit', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const result = await query(
    pool,
    `SELECT actor, action, target, metadata, created_at
     FROM citadel.audit_events
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json({ ok: true, events: result.rows });
});


app.get('/admin/capacity', requireAdmin, async (_req, res) => {
  const [dbSize, activity, connections] = await Promise.all([
    query(pool, `SELECT pg_database_size(current_database()) AS bytes`),
    query(pool, `SELECT count(*) FILTER (WHERE state = 'active') AS active,
                        count(*) FILTER (WHERE state = 'idle') AS idle,
                        count(*) AS total
                 FROM pg_stat_activity
                 WHERE datname = current_database()`),
    query(pool, `SHOW max_connections`)
  ]);

  res.json({
    ok: true,
    databaseBytes: Number(dbSize.rows[0].bytes),
    activity: activity.rows[0],
    maxConnections: connections.rows[0].max_connections
  });
});

app.get('/admin/readiness', requireAdmin, async (_req, res) => {
  const checks = [];

  const tables = await query(pool, `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'citadel'
    ORDER BY table_name
  `);
  checks.push({ name: 'citadel schema tables', ok: tables.rows.length >= 7, detail: tables.rows.map(r => r.table_name) });

  const backups = await query(pool, `SELECT count(*)::int AS count FROM citadel.backup_receipts`);
  checks.push({ name: 'backup receipts present', ok: backups.rows[0].count > 0, detail: backups.rows[0] });

  const restores = await query(pool, `SELECT count(*)::int AS count FROM citadel.restore_receipts WHERE success = true`);
  checks.push({ name: 'successful restore receipts present', ok: restores.rows[0].count > 0, detail: restores.rows[0] });

  const apps = await query(pool, `SELECT count(*)::int AS count FROM citadel.apps`);
  checks.push({ name: 'app database provisioned', ok: apps.rows[0].count > 0, detail: apps.rows[0] });

  res.json({ ok: checks.every(c => c.ok), checks });
});



app.post('/admin/migrations/receipt', requireAdmin, async (req, res) => {
  const body = z.object({
    appSlug: z.string().min(2),
    databaseName: z.string().min(1),
    migrationFile: z.string().min(1),
    checksum: z.string().min(8),
    success: z.boolean(),
    error: z.string().optional()
  }).parse(req.body);

  const result = await query(
    pool,
    `INSERT INTO citadel.migration_receipts
      (app_slug, database_name, migration_file, checksum, success, error)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, applied_at`,
    [
      body.appSlug,
      body.databaseName,
      body.migrationFile,
      body.checksum,
      body.success,
      body.error || null
    ]
  );

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'migration_receipt', $1, $2::jsonb)`,
    [body.appSlug, JSON.stringify({ migrationFile: body.migrationFile, success: body.success })]
  );

  res.status(201).json({ ok: true, receipt: result.rows[0] });
});

app.get('/admin/migrations', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT app_slug, database_name, migration_file, checksum, applied_at, success, error
     FROM citadel.migration_receipts
     ORDER BY applied_at DESC
     LIMIT 200`
  );
  res.json({ ok: true, migrations: result.rows });
});

app.post('/admin/restore/receipt', requireAdmin, async (req, res) => {
  const body = z.object({
    backupChecksum: z.string().optional(),
    sourceBackupPath: z.string().min(1),
    targetDatabase: z.string().min(1),
    success: z.boolean(),
    error: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).parse(req.body);

  const result = await query(
    pool,
    `INSERT INTO citadel.restore_receipts
      (backup_checksum, source_backup_path, target_database, finished_at, success, error, metadata)
     VALUES ($1, $2, $3, now(), $4, $5, $6::jsonb)
     RETURNING id, started_at, finished_at`,
    [
      body.backupChecksum || null,
      body.sourceBackupPath,
      body.targetDatabase,
      body.success,
      body.error || null,
      JSON.stringify(body.metadata || {})
    ]
  );

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'restore_receipt', $1, $2::jsonb)`,
    [body.targetDatabase, JSON.stringify({ success: body.success, sourceBackupPath: body.sourceBackupPath })]
  );

  res.status(201).json({ ok: true, receipt: result.rows[0] });
});

app.get('/admin/service-catalog', requireAdmin, async (_req, res) => {
  const apps = await query(
    pool,
    `SELECT app_slug, database_name, role_name, engine, status, created_at
     FROM citadel.apps
     ORDER BY app_slug ASC`
  );

  const backups = await query(
    pool,
    `SELECT database_name, max(created_at) AS last_backup_at,
            max(restore_tested_at) AS last_restore_test_at
     FROM citadel.backup_receipts
     GROUP BY database_name`
  );

  const backupMap = new Map(backups.rows.map(row => [row.database_name, row]));

  res.json({
    ok: true,
    services: apps.rows.map(app => ({
      ...app,
      backup: backupMap.get(app.database_name) || null
    }))
  });
});


const allowedJobTypes = new Set([
  'health',
  'backup-now',
  'backup-encrypted',
  'restore-test',
  'smoke-all',
  'object-backup-sync',
  'validate-env',
  'policy-check',
  'backup-manifest',
  'branch-clone',
  'app-write-smoke'
]);

app.post('/admin/jobs', requireAdmin, async (req, res) => {
  const body = z.object({
    jobType: z.string().min(2),
    payload: z.record(z.any()).optional(),
    requestedBy: z.string().optional(),
    maxAttempts: z.number().int().min(1).max(3).optional()
  }).parse(req.body);

  if (!allowedJobTypes.has(body.jobType)) {
    return res.status(400).json({
      ok: false,
      error: `Job type not allowed: ${body.jobType}`,
      allowedJobTypes: Array.from(allowedJobTypes)
    });
  }

  const result = await query(
    pool,
    `INSERT INTO citadel.operator_jobs (job_type, payload, requested_by, max_attempts)
     VALUES ($1, $2::jsonb, $3, $4)
     RETURNING id, job_type, status, requested_at`,
    [
      body.jobType,
      JSON.stringify(body.payload || {}),
      body.requestedBy || 'operator-dashboard',
      body.maxAttempts || 1
    ]
  );

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'enqueue_job', $1, $2::jsonb)`,
    [String(result.rows[0].id), JSON.stringify({ jobType: body.jobType })]
  );

  res.status(201).json({ ok: true, job: result.rows[0] });
});

app.get('/admin/jobs', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 300);
  const result = await query(
    pool,
    `SELECT id, job_type, status, payload, requested_by, requested_at, claimed_at,
            started_at, finished_at, attempts, max_attempts, receipt_path, output_tail, error
     FROM citadel.operator_jobs
     ORDER BY requested_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json({ ok: true, jobs: result.rows });
});

app.get('/admin/jobs/:id', requireAdmin, async (req, res) => {
  const result = await query(
    pool,
    `SELECT id, job_type, status, payload, requested_by, requested_at, claimed_at,
            started_at, finished_at, attempts, max_attempts, receipt_path, output_tail, error
     FROM citadel.operator_jobs
     WHERE id = $1`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ ok: false, error: 'Job not found' });
  }

  res.json({ ok: true, job: result.rows[0] });
});

app.post('/admin/jobs/claim', requireAdmin, async (req, res) => {
  const body = z.object({
    workerId: z.string().min(2)
  }).parse(req.body);

  const result = await query(
    pool,
    `WITH next_job AS (
       SELECT id FROM citadel.operator_jobs
       WHERE status = 'queued'
         AND attempts < max_attempts
       ORDER BY requested_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE citadel.operator_jobs j
     SET status = 'claimed',
         claimed_at = now(),
         attempts = attempts + 1,
         payload = j.payload || jsonb_build_object('workerId', $1)
     FROM next_job
     WHERE j.id = next_job.id
     RETURNING j.id, j.job_type, j.status, j.payload, j.attempts, j.max_attempts`,
    [body.workerId]
  );

  if (result.rowCount === 0) {
    return res.json({ ok: true, job: null });
  }

  res.json({ ok: true, job: result.rows[0] });
});

app.post('/admin/jobs/:id/start', requireAdmin, async (req, res) => {
  const result = await query(
    pool,
    `UPDATE citadel.operator_jobs
     SET status = 'running', started_at = now()
     WHERE id = $1 AND status IN ('claimed', 'queued')
     RETURNING id, job_type, status, started_at`,
    [req.params.id]
  );

  if (result.rowCount === 0) {
    return res.status(409).json({ ok: false, error: 'Job could not be started' });
  }

  res.json({ ok: true, job: result.rows[0] });
});

app.post('/admin/jobs/:id/finish', requireAdmin, async (req, res) => {
  const body = z.object({
    success: z.boolean(),
    receiptPath: z.string().optional(),
    outputTail: z.string().optional(),
    error: z.string().optional(),
    commandName: z.string().optional(),
    checksum: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).parse(req.body);

  const status = body.success ? 'succeeded' : 'failed';

  const result = await query(
    pool,
    `UPDATE citadel.operator_jobs
     SET status = $2,
         finished_at = now(),
         receipt_path = $3,
         output_tail = $4,
         error = $5
     WHERE id = $1
     RETURNING id, job_type, status, finished_at, receipt_path`,
    [
      req.params.id,
      status,
      body.receiptPath || null,
      body.outputTail || null,
      body.error || null
    ]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ ok: false, error: 'Job not found' });
  }

  if (body.receiptPath) {
    await query(
      pool,
      `INSERT INTO citadel.command_receipts
        (job_id, command_name, receipt_path, success, checksum, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        req.params.id,
        body.commandName || result.rows[0].job_type,
        body.receiptPath,
        body.success,
        body.checksum || null,
        JSON.stringify(body.metadata || {})
      ]
    );
  }

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'finish_job', $1, $2::jsonb)`,
    [String(req.params.id), JSON.stringify({ status, receiptPath: body.receiptPath || null })]
  );

  res.json({ ok: true, job: result.rows[0] });
});

app.get('/admin/command-receipts', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT id, job_id, command_name, receipt_path, success, checksum, created_at, metadata
     FROM citadel.command_receipts
     ORDER BY created_at DESC
     LIMIT 200`
  );
  res.json({ ok: true, receipts: result.rows });
});



app.get('/admin/policy-findings', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT policy_name, severity, status, target, detail, detected_at, resolved_at
     FROM citadel.policy_findings
     ORDER BY detected_at DESC
     LIMIT 200`
  );
  res.json({ ok: true, findings: result.rows });
});

app.get('/admin/tenants', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT tenant_slug, display_name, owner_contact, status, created_at, metadata
     FROM citadel.tenants
     ORDER BY tenant_slug ASC`
  );
  res.json({ ok: true, tenants: result.rows });
});

app.post('/admin/tenants', requireAdmin, async (req, res) => {
  const body = z.object({
    tenantSlug: z.string().min(2),
    displayName: z.string().min(1),
    ownerContact: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).parse(req.body);

  const slug = body.tenantSlug.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

  const result = await query(
    pool,
    `INSERT INTO citadel.tenants (tenant_slug, display_name, owner_contact, metadata)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (tenant_slug)
     DO UPDATE SET display_name = EXCLUDED.display_name,
                   owner_contact = EXCLUDED.owner_contact,
                   metadata = EXCLUDED.metadata
     RETURNING tenant_slug, display_name, owner_contact, status, created_at`,
    [slug, body.displayName, body.ownerContact || null, JSON.stringify(body.metadata || {})]
  );

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'upsert_tenant', $1, $2::jsonb)`,
    [slug, JSON.stringify({ displayName: body.displayName })]
  );

  res.status(201).json({ ok: true, tenant: result.rows[0] });
});



app.get('/admin/apps/:appSlug/connection', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const result = await query(
    pool,
    `SELECT app_slug, database_name, role_name, engine, status, created_at
     FROM citadel.apps
     WHERE app_slug = $1`,
    [slug]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ ok: false, error: 'App not found' });
  }

  const appRow = result.rows[0];
  const host = normalizeConnectionHost(process.env.CITADEL_DOMAIN || '127.0.0.1');
  const port = process.env.PGBOUNCER_PORT || 6432;

  res.json({
    ok: true,
    app: appRow,
    connection: {
      provider: 'postgres',
      host,
      port,
      database: appRow.database_name,
      username: appRow.role_name,
      password: 'shown only when first provisioned or after credential rotation',
      envTemplate: `DATABASE_PROVIDER=postgres\nDATABASE_URL=postgres://${appRow.role_name}:APP_PASSWORD@${host}:${port}/${appRow.database_name}\nCITADEL_APP_SLUG=${appRow.app_slug}\n`,
      plainEnglish: [
        `This app has its own database named ${appRow.database_name}.`,
        `This app should connect with the user ${appRow.role_name}.`,
        'Use the password generated when you provisioned the app, or rotate the credential to get a fresh one.',
        'Put the DATABASE_URL into the app you are connecting.'
      ]
    }
  });
});

app.post('/admin/apps/:appSlug/write-smoke-job', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const result = await query(
    pool,
    `SELECT app_slug, database_name, role_name FROM citadel.apps WHERE app_slug = $1`,
    [slug]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ ok: false, error: 'App not found' });
  }

  const job = await query(
    pool,
    `INSERT INTO citadel.operator_jobs (job_type, payload, requested_by, max_attempts)
     VALUES ('app-write-smoke', $1::jsonb, 'operator-dashboard', 1)
     RETURNING id, job_type, status, requested_at`,
    [JSON.stringify({ appSlug: slug, databaseName: result.rows[0].database_name })]
  );

  res.status(201).json({ ok: true, job: job.rows[0] });
});

app.get('/admin/ai/status', requireAdmin, async (_req, res) => {
  res.json({ ok: true, providers: availableProviders() });
});

app.post('/admin/ai/debug', requireAdmin, async (req, res) => {
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'ai_debug' });
  if (!gate) return;
  const body = z.object({
    provider: z.enum(['openai', 'gemini']),
    question: z.string().min(4).max(4000),
    appSlug: z.string().optional()
  }).parse(req.body);

  if (!aiEnabled()) {
    return res.status(400).json({
      ok: false,
      error: 'AI_ASSISTANT_ENABLED is not true. Set it in .env before using AI debug.'
    });
  }

  let app = null;
  if (body.appSlug) {
    const slug = appSlug(body.appSlug);
    const appResult = await query(
      pool,
      `SELECT app_slug, database_name, role_name, engine, status, created_at
       FROM citadel.apps WHERE app_slug = $1`,
      [slug]
    );
    app = appResult.rows[0] || null;
  }

  const [readiness, capacity, recentJobs, recentBackups, recentRestores] = await Promise.all([
    query(pool, `SELECT 'readiness must be fetched through /admin/readiness' AS note`),
    query(pool, `SELECT pg_database_size(current_database()) AS database_bytes`),
    query(pool, `SELECT id, job_type, status, requested_at, finished_at, error FROM citadel.operator_jobs ORDER BY requested_at DESC LIMIT 20`),
    query(pool, `SELECT backup_kind, database_name, backup_path, created_at, restore_test_status FROM citadel.backup_receipts ORDER BY created_at DESC LIMIT 20`),
    query(pool, `SELECT target_database, success, started_at, finished_at, error FROM citadel.restore_receipts ORDER BY started_at DESC LIMIT 20`)
  ]);

  const context = buildDebugContext({
    question: redactSecrets(body.question),
    app,
    readiness: readiness.rows,
    capacity: capacity.rows,
    recentJobs: recentJobs.rows,
    recentBackups: recentBackups.rows,
    recentRestores: recentRestores.rows
  });

  try {
    const answer = body.provider === 'openai'
      ? await askOpenAI({ question: body.question, context })
      : await askGemini({ question: body.question, context });

    await query(
      pool,
      `INSERT INTO citadel.audit_events (actor, action, target, metadata)
       VALUES ('gateway', 'ai_debug_request', $1, $2::jsonb)`,
      [body.appSlug || 'citadeldb', JSON.stringify({ provider: body.provider, questionPreview: redactSecrets(body.question).slice(0, 180) })]
    );

    res.json({ ok: true, provider: body.provider, answer });
  } catch (error) {
    res.status(500).json({ ok: false, error: redactSecrets(error.message) });
  }
});


app.post('/admin/apps/:appSlug/rotate-credential', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.appSlug);
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'credential_rotation', projectSlug });
  if (!gate) return;
  const slug = appSlug(req.params.appSlug);
  const result = await query(pool, `SELECT app_slug, database_name, role_name, engine, status FROM citadel.apps WHERE app_slug = $1`, [slug]);
  if (result.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const appRow = result.rows[0];
  const password = generateAppPassword();
  await query(pool, `ALTER ROLE ${sqlIdent(appRow.role_name)} WITH PASSWORD ${sqlLiteral(password)}`);

  const parts = safeConnectionParts({ appSlug: appRow.app_slug, databaseName: appRow.database_name, roleName: appRow.role_name });
  const databaseUrl = buildDatabaseUrl({ role: appRow.role_name, password, host: parts.host, port: parts.port, database: appRow.database_name });

  await query(pool, `INSERT INTO citadel.audit_events (actor, action, target, metadata) VALUES ('gateway', 'app_credential_rotated', $1, $2::jsonb)`, [slug, JSON.stringify({ role: appRow.role_name, database: appRow.database_name })]);
  await query(pool, `INSERT INTO citadel.app_credentials (app_slug, role_name, rotated_by, metadata) VALUES ($1, $2, 'gateway', $3::jsonb)`, [slug, appRow.role_name, JSON.stringify({ database: appRow.database_name })]);

  res.json({
    ok: true,
    app: appRow,
    connection: {
      ...parts,
      password,
      databaseUrl,
      env: `DATABASE_PROVIDER=postgres\nDATABASE_URL=${databaseUrl}\nCITADEL_APP_SLUG=${appRow.app_slug}\n`
    },
    warning: 'This is the only time the new app password is returned. Store it in the app environment, not in public code.'
  });
});

app.post('/admin/database/test-url', requireAdmin, async (req, res) => {
  const body = z.object({
    databaseUrl: z.string().min(12).max(4000),
    write: z.boolean().optional().default(false),
    appSlug: z.string().min(2).max(80).optional()
  }).parse(req.body);
  const target = body.appSlug ? appSlug(body.appSlug) : 'database-url-test';
  const result = await testDatabaseUrl(body.databaseUrl, { write: body.write });

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', $1, $2, $3::jsonb)`,
    [
      body.write ? 'database_url_write_smoke' : 'database_url_connection_test',
      target,
      JSON.stringify({ ok: result.ok, elapsedMs: result.elapsedMs, write: body.write, appSlug: target })
    ]
  );

  res.json({ ok: result.ok, result, redactedDatabaseUrl: redactSecrets(body.databaseUrl) });
});

app.get('/admin/apps/:appSlug/setup-packet', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const result = await query(pool, `SELECT app_slug, database_name, role_name, engine, status, created_at FROM citadel.apps WHERE app_slug = $1`, [slug]);
  if (result.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const appRow = result.rows[0];
  const parts = safeConnectionParts({ appSlug: appRow.app_slug, databaseName: appRow.database_name, roleName: appRow.role_name });

  const markdown = `# ${appRow.app_slug} CitadelDB Setup Packet

## What this is

This app has a private database in CitadelDB.

## App database

- App: ${appRow.app_slug}
- Database: ${appRow.database_name}
- Username: ${appRow.role_name}
- Host: ${parts.host}
- Port: ${parts.port}

## Paste into the app

\`\`\`env
DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://${appRow.role_name}:APP_PASSWORD@${parts.host}:${parts.port}/${appRow.database_name}
CITADEL_APP_SLUG=${appRow.app_slug}
\`\`\`

Replace APP_PASSWORD with the password shown during creation or credential rotation.

## After paste

1. Restart the app.
2. Run a connection test.
3. Run a write-smoke test.
4. Run CitadelDB backup.
5. Run CitadelDB restore-test.

## Rule

Do not use the CitadelDB admin password inside this app.
`;

  res.json({ ok: true, app: appRow, packet: markdown });
});

app.get('/admin/apps/:appSlug/owner-dashboard', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const [appResult, envs, backups, restores, migrations, jobs, audits] = await Promise.all([
    query(pool, `SELECT app_slug, database_name, role_name, engine, status, created_at, updated_at FROM citadel.apps WHERE app_slug = $1`, [slug]),
    query(pool, `SELECT environment, database_name, role_name, connection_host, connection_port, status, created_at FROM citadel.app_environments WHERE app_slug = $1 ORDER BY environment`, [slug]),
    query(pool, `SELECT backup_kind, backup_path, database_name, size_bytes, checksum, created_at, restore_tested_at, restore_test_status FROM citadel.backup_receipts WHERE database_name ILIKE $1 OR metadata::text ILIKE $2 ORDER BY created_at DESC LIMIT 20`, [`%${slug}%`, `%${slug}%`]),
    query(pool, `SELECT backup_checksum, source_backup_path, target_database, started_at, finished_at, success, error FROM citadel.restore_receipts WHERE target_database ILIKE $1 OR metadata::text ILIKE $2 ORDER BY started_at DESC LIMIT 20`, [`%${slug}%`, `%${slug}%`]),
    query(pool, `SELECT migration_file, checksum, applied_at, success, error FROM citadel.migration_receipts WHERE app_slug = $1 ORDER BY applied_at DESC LIMIT 20`, [slug]),
    query(pool, `SELECT id, job_type, status, requested_at, started_at, finished_at, receipt_path, error FROM citadel.operator_jobs WHERE payload::text ILIKE $1 ORDER BY requested_at DESC LIMIT 20`, [`%${slug}%`]),
    query(pool, `SELECT actor, action, target, metadata, created_at FROM citadel.audit_events WHERE target ILIKE $1 OR metadata::text ILIKE $1 ORDER BY created_at DESC LIMIT 30`, [`%${slug}%`])
  ]);

  if (appResult.rowCount === 0) {
    return res.status(404).json({ ok: false, error: 'App not found' });
  }

  const appRow = appResult.rows[0];
  const parts = safeConnectionParts({ appSlug: appRow.app_slug, databaseName: appRow.database_name, roleName: appRow.role_name });
  const acceptance = {
    provisioned: true,
    environmentRegistered: envs.rows.length > 0,
    connectionTested: audits.rows.some(row => row.action === 'database_url_connection_test'),
    writeSmokePassed: audits.rows.some(row => row.action === 'database_url_write_smoke'),
    backupReceiptPresent: backups.rows.length > 0,
    restoreTestPassed: restores.rows.some(row => row.success === true)
  };

  const handoff = `# ${appRow.app_slug} Owner Handoff

## Connection

DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://${appRow.role_name}:APP_PASSWORD@${parts.host}:${parts.port}/${appRow.database_name}
CITADEL_APP_SLUG=${appRow.app_slug}

## Owner Checklist

1. Store the generated app password in the app's secret manager.
2. Restart the app after setting DATABASE_URL.
3. Run a connection test.
4. Run a write-smoke test.
5. Ask Gray for the latest backup and restore-test proof before launch.

## Current Acceptance

- Provisioned: ${acceptance.provisioned ? 'yes' : 'no'}
- Connection tested: ${acceptance.connectionTested ? 'yes' : 'no'}
- Write-smoke passed: ${acceptance.writeSmokePassed ? 'yes' : 'no'}
- Backup receipt present: ${acceptance.backupReceiptPresent ? 'yes' : 'no'}
- Restore-test passed: ${acceptance.restoreTestPassed ? 'yes' : 'no'}
`;

  res.json({
    ok: true,
    app: appRow,
    connection: {
      ...parts,
      password: 'shown only on initial provisioning or credential rotation',
      envTemplate: `DATABASE_PROVIDER=postgres\nDATABASE_URL=postgres://${appRow.role_name}:APP_PASSWORD@${parts.host}:${parts.port}/${appRow.database_name}\nCITADEL_APP_SLUG=${appRow.app_slug}\n`
    },
    environments: envs.rows,
    backups: backups.rows,
    restores: restores.rows,
    migrations: migrations.rows,
    jobs: jobs.rows,
    audit: audits.rows,
    acceptance,
    acceptedForOwnerHandoff: Object.values(acceptance).every(Boolean),
    handoff
  });
});


app.get('/admin/guided/setup-checklist', requireAdmin, async (_req, res) => {
  const checks = [];
  const has = (name) => Boolean(process.env[name]);

  checks.push({ key: 'postgres_password', label: 'Postgres admin password configured', ok: has('POSTGRES_PASSWORD'), why: 'Required to control the CitadelDB database server.' });
  checks.push({ key: 'gateway_token', label: 'Gateway admin token configured', ok: has('GATEWAY_ADMIN_TOKEN'), why: 'Required to protect the command API.' });
  checks.push({ key: 'backup_password', label: 'Backup encryption password configured', ok: has('BACKUP_ENCRYPTION_PASSWORD'), why: 'Required for encrypted backups.' });
  checks.push({ key: 'ai_enabled', label: 'AI assistant enabled only if wanted', ok: process.env.AI_ASSISTANT_ENABLED === 'true' ? Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) : true, why: 'AI debug needs at least one provider key if enabled.' });
  checks.push({ key: 'private_ports', label: 'Private dashboard/database doctrine documented', ok: true, why: 'Dashboard/Postgres should remain private or upstream-auth protected.' });

  const [apps, backups, restores, jobs] = await Promise.all([
    query(pool, `SELECT count(*)::int AS count FROM citadel.apps`),
    query(pool, `SELECT count(*)::int AS count FROM citadel.backup_receipts`),
    query(pool, `SELECT count(*)::int AS count FROM citadel.restore_receipts`),
    query(pool, `SELECT count(*)::int AS count FROM citadel.operator_jobs`)
  ]);

  checks.push({ key: 'apps_exist', label: 'At least one app database created', ok: apps.rows[0].count > 0, why: 'Create app databases from Database Launchpad.' });
  checks.push({ key: 'backup_receipts', label: 'At least one backup receipt exists', ok: backups.rows[0].count > 0, why: 'Run backup proof before trusting a database.' });
  checks.push({ key: 'restore_receipts', label: 'At least one restore-test receipt exists', ok: restores.rows[0].count > 0, why: 'Backups are not trusted until restore-test passes.' });

  const complete = checks.filter(c => c.ok).length;
  res.json({
    ok: true,
    mode: process.env.CITADEL_OPERATOR_MODE || 'guided',
    complete,
    total: checks.length,
    percent: Math.round((complete / checks.length) * 100),
    counts: {
      apps: apps.rows[0].count,
      backups: backups.rows[0].count,
      restores: restores.rows[0].count,
      jobs: jobs.rows[0].count
    },
    checks
  });
});

app.post('/admin/guided/proof-action', requireAdmin, async (req, res) => {
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'guided_proof_action' });
  if (!gate) return;

  const body = z.object({
    action: z.enum(['backup-now', 'restore-test', 'policy-check', 'backup-manifest', 'object-backup-sync', 'validate-env'])
  }).parse(req.body);

  const job = await query(
    pool,
    `INSERT INTO citadel.operator_jobs (job_type, payload, requested_by, max_attempts)
     VALUES ($1, '{}'::jsonb, 'guided-ops-dashboard', 1)
     RETURNING id, job_type, status, requested_at`,
    [body.action]
  );

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'guided_proof_action_enqueued', $1, $2::jsonb)`,
    [body.action, JSON.stringify({ jobId: job.rows[0].id })]
  );

  res.status(201).json({ ok: true, job: job.rows[0] });
});

app.get('/admin/guided/diagnostic-bundle', requireAdmin, async (_req, res) => {
  const limit = Math.min(Number(process.env.DIAGNOSTIC_BUNDLE_MAX_EVENTS || 50), 200);
  const [apps, jobs, backups, restores, audits, policy] = await Promise.all([
    query(pool, `SELECT app_slug, database_name, role_name, engine, status, created_at FROM citadel.apps ORDER BY created_at DESC LIMIT $1`, [limit]),
    query(pool, `SELECT id, job_type, status, attempts, requested_at, started_at, finished_at, error FROM citadel.operator_jobs ORDER BY requested_at DESC LIMIT $1`, [limit]),
    query(pool, `SELECT backup_kind, database_name, backup_path, created_at, restore_test_status FROM citadel.backup_receipts ORDER BY created_at DESC LIMIT $1`, [limit]),
    query(pool, `SELECT target_database, success, started_at, finished_at, error FROM citadel.restore_receipts ORDER BY started_at DESC LIMIT $1`, [limit]),
    query(pool, `SELECT actor, action, target, metadata, created_at FROM citadel.audit_events ORDER BY created_at DESC LIMIT $1`, [limit]),
    query(pool, `SELECT severity, subject, finding, status, created_at FROM citadel.policy_findings ORDER BY created_at DESC LIMIT $1`, [limit]).catch(() => ({ rows: [] }))
  ]);

  const bundle = {
    generatedAt: new Date().toISOString(),
    product: 'CitadelDB Ultimate',
    version: '3.0.1',
    mode: process.env.CITADEL_OPERATOR_MODE || 'guided',
    apps: apps.rows,
    jobs: jobs.rows,
    backups: backups.rows,
    restores: restores.rows,
    audits: audits.rows,
    policyFindings: policy.rows
  };

  res.json({ ok: true, bundle: JSON.parse(redactSecrets(JSON.stringify(bundle))) });
});


app.get('/admin/setup/env-readiness', requireAdmin, async (_req, res) => {
  const required = [
    { key: 'POSTGRES_PASSWORD', label: 'Database admin password', why: 'Controls the CitadelDB Postgres admin role.' },
    { key: 'GATEWAY_ADMIN_TOKEN', label: 'Gateway admin token', why: 'Protects the CitadelDB command API.' },
    { key: 'BACKUP_ENCRYPTION_PASSWORD', label: 'Backup encryption password', why: 'Encrypts backup archives.' }
  ];

  const optional = [
    { key: 'OPENAI_API_KEY', label: 'OpenAI key', why: 'Enables OpenAI debug assistant.' },
    { key: 'GEMINI_API_KEY', label: 'Gemini key', why: 'Enables Gemini debug assistant.' },
    { key: 'GOOGLE_API_KEY', label: 'Google API key', why: 'Alternative Gemini API key env.' },
    { key: 'S3_ACCESS_KEY_ID', label: 'Object storage access key', why: 'Needed for offsite backup sync.' },
    { key: 'S3_SECRET_ACCESS_KEY', label: 'Object storage secret key', why: 'Needed for offsite backup sync.' }
  ];

  const mark = (item) => ({ ...item, present: Boolean(process.env[item.key]), value: process.env[item.key] ? 'configured' : 'missing' });
  const requiredMarked = required.map(mark);
  const optionalMarked = optional.map(mark);

  res.json({
    ok: true,
    required: requiredMarked,
    optional: optionalMarked,
    ready: requiredMarked.every(i => i.present),
    missingRequired: requiredMarked.filter(i => !i.present).map(i => i.key)
  });
});

app.post('/admin/setup/generate-secrets', requireAdmin, async (req, res) => {
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'setup_generate_secrets' });
  if (!gate) return;
  const secrets = {
    POSTGRES_PASSWORD: crypto.randomBytes(48).toString('base64url'),
    GATEWAY_ADMIN_TOKEN: crypto.randomBytes(48).toString('hex'),
    BACKUP_ENCRYPTION_PASSWORD: crypto.randomBytes(64).toString('base64url')
  };

  const envBlock = Object.entries(secrets).map(([key, value]) => `${key}=${value}`).join('\n');

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'setup_secrets_generated', 'setup-wizard', $1::jsonb)`,
    [JSON.stringify({ keys: Object.keys(secrets) })]
  );

  res.json({
    ok: true,
    secrets,
    envBlock,
    warning: 'Generated secrets are returned once for operator convenience. Paste them into .env and store them in a secure password manager.'
  });
});

app.get('/admin/setup/plan', requireAdmin, async (_req, res) => {
  const readiness = {
    postgresPassword: Boolean(process.env.POSTGRES_PASSWORD),
    gatewayToken: Boolean(process.env.GATEWAY_ADMIN_TOKEN),
    backupPassword: Boolean(process.env.BACKUP_ENCRYPTION_PASSWORD),
    aiConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    objectBackupConfigured: Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_BUCKET)
  };

  const plan = `# CitadelDB Setup Plan

## 1. Configure required secrets

Required:

- POSTGRES_PASSWORD: ${readiness.postgresPassword ? 'configured' : 'missing'}
- GATEWAY_ADMIN_TOKEN: ${readiness.gatewayToken ? 'configured' : 'missing'}
- BACKUP_ENCRYPTION_PASSWORD: ${readiness.backupPassword ? 'configured' : 'missing'}

## 2. Start stack

\`\`\`bash
make prod-up
\`\`\`

## 3. First proof pass

\`\`\`bash
./scripts/first-production-pass.sh
\`\`\`

## 4. Create first app database

Dashboard:

\`\`\`text
Database Launchpad → Create database
\`\`\`

## 5. Test app connection

Dashboard:

\`\`\`text
Database Launchpad → Test DATABASE_URL → Also run write-smoke
\`\`\`

## 6. Backup and restore-test

Dashboard:

\`\`\`text
Guided Ops → backup-now
Guided Ops → restore-test
\`\`\`

## 7. Optional AI debug

AI configured: ${readiness.aiConfigured ? 'yes' : 'no'}

## 8. Optional offsite backup

Object backup configured: ${readiness.objectBackupConfigured ? 'yes' : 'no'}
`;

  res.json({ ok: true, readiness, plan });
});


app.get('/admin/apps/:appSlug/onboarding-packet', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const framework = String(req.query.framework || 'node-express');
  const result = await query(
    pool,
    `SELECT app_slug, database_name, role_name, engine, status, created_at
     FROM citadel.apps WHERE app_slug = $1`,
    [slug]
  );

  if (result.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const appRow = result.rows[0];
  const parts = safeConnectionParts({ appSlug: appRow.app_slug, databaseName: appRow.database_name, roleName: appRow.role_name });
  let frameworkDoc = 'Framework template not found.';
  const templatePath = new URL(`../../../templates/app-frameworks/${framework}.md`, import.meta.url);
  try {
    if (existsSync(templatePath)) frameworkDoc = readFileSync(templatePath, 'utf8');
  } catch {}

  const packet = `# ${appRow.app_slug} App Onboarding Packet

## App database

- App: ${appRow.app_slug}
- Database: ${appRow.database_name}
- Username: ${appRow.role_name}
- Host: ${parts.host}
- Port: ${parts.port}
- Framework: ${framework}

## Environment template

\`\`\`env
DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://${appRow.role_name}:APP_PASSWORD@${parts.host}:${parts.port}/${appRow.database_name}
CITADEL_APP_SLUG=${appRow.app_slug}
\`\`\`

## Framework instructions

${frameworkDoc}

## Migration checklist

☐ paste DATABASE_URL into app env  
☐ restart app  
☐ run app migrations  
☐ run Launchpad DATABASE_URL connection test  
☐ run Launchpad write-smoke test  
☐ run CitadelDB backup-now  
☐ run CitadelDB restore-test  
☐ save proof receipts  

## Acceptance

This app is not considered accepted on CitadelDB until connection test, write-smoke, backup, and restore-test receipts exist.
`;

  res.json({ ok: true, app: appRow, framework, packet });
});

app.get('/admin/apps/:appSlug/proof-packet', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const [appResult, jobs, backups, restores, audits] = await Promise.all([
    query(pool, `SELECT app_slug, database_name, role_name, engine, status, created_at FROM citadel.apps WHERE app_slug = $1`, [slug]),
    query(pool, `SELECT id, job_type, status, requested_at, finished_at, error FROM citadel.operator_jobs WHERE payload::text ILIKE $1 ORDER BY requested_at DESC LIMIT 30`, [`%${slug}%`]),
    query(pool, `SELECT backup_kind, database_name, backup_path, created_at, restore_test_status FROM citadel.backup_receipts WHERE database_name ILIKE $1 ORDER BY created_at DESC LIMIT 30`, [`%${slug}%`]),
    query(pool, `SELECT target_database, success, started_at, finished_at, error FROM citadel.restore_receipts WHERE target_database ILIKE $1 ORDER BY started_at DESC LIMIT 30`, [`%${slug}%`]),
    query(pool, `SELECT actor, action, target, metadata, created_at FROM citadel.audit_events WHERE target ILIKE $1 OR metadata::text ILIKE $1 ORDER BY created_at DESC LIMIT 30`, [`%${slug}%`])
  ]);

  if (appResult.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const packet = {
    generatedAt: new Date().toISOString(),
    app: appResult.rows[0],
    jobs: jobs.rows,
    backups: backups.rows,
    restores: restores.rows,
    audits: audits.rows,
    acceptance: {
      connectionTest: audits.rows.some(a => a.action === 'database_url_connection_test'),
      writeSmoke: audits.rows.some(a => a.action === 'database_url_write_smoke'),
      backup: backups.rows.length > 0,
      restoreTest: restores.rows.some(r => r.success === true)
    }
  };
  packet.accepted = packet.acceptance.connectionTest && packet.acceptance.writeSmoke && packet.acceptance.backup && packet.acceptance.restoreTest;

  res.json({ ok: true, packet: JSON.parse(redactSecrets(JSON.stringify(packet))) });
});


app.get('/admin/apps/:appSlug/migration-plan', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const framework = String(req.query.framework || 'node-express');
  const source = String(req.query.source || 'existing DATABASE_URL');
  const result = await query(pool, `SELECT app_slug, database_name, role_name, engine, status, created_at FROM citadel.apps WHERE app_slug = $1`, [slug]);
  if (result.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const appRow = result.rows[0];
  const parts = safeConnectionParts({ appSlug: appRow.app_slug, databaseName: appRow.database_name, roleName: appRow.role_name });
  const steps = [
    { order: 1, label: 'Freeze risky writes or schedule maintenance window', proof: 'operator note / release window' },
    { order: 2, label: `Export data from ${source}`, proof: 'source export file or dump receipt' },
    { order: 3, label: `Import into ${appRow.database_name}`, proof: 'migration/import receipt' },
    { order: 4, label: 'Run app migrations against CitadelDB DATABASE_URL', proof: 'migration command output' },
    { order: 5, label: 'Run dashboard connection test', proof: 'database_url_connection_test audit event' },
    { order: 6, label: 'Run dashboard write-smoke test', proof: 'database_url_write_smoke audit event' },
    { order: 7, label: 'Run app-level smoke checks', proof: 'app smoke receipt' },
    { order: 8, label: 'Run backup-now', proof: 'backup receipt' },
    { order: 9, label: 'Run restore-test', proof: 'restore receipt' },
    { order: 10, label: 'Switch production app env to CitadelDB DATABASE_URL', proof: 'deployment receipt' },
    { order: 11, label: 'Monitor jobs/audits/errors', proof: 'diagnostic bundle' },
    { order: 12, label: 'Archive rollback plan', proof: 'rollback packet' }
  ];

  res.json({
    ok: true,
    app: appRow,
    framework,
    source,
    target: {
      host: parts.host,
      port: parts.port,
      database: appRow.database_name,
      username: appRow.role_name
    },
    steps,
    acceptance: ['connection test', 'write-smoke', 'backup receipt', 'restore-test receipt', 'deployment receipt']
  });
});

app.post('/admin/apps/:appSlug/lifecycle-action', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'app_lifecycle_action', projectSlug: slug });
  if (!gate) return;

  const body = z.object({
    action: z.enum(['migration-rehearsal', 'app-backup-now', 'app-restore-test', 'app-diagnostic-bundle', 'app-cutover-note'])
  }).parse(req.body);

  const result = await query(pool, `SELECT app_slug, database_name, role_name FROM citadel.apps WHERE app_slug = $1`, [slug]);
  if (result.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const appRow = result.rows[0];
  const jobTypeMap = {
    'migration-rehearsal': 'validate-env',
    'app-backup-now': 'backup-now',
    'app-restore-test': 'restore-test',
    'app-diagnostic-bundle': 'policy-check',
    'app-cutover-note': 'validate-env'
  };
  const jobType = jobTypeMap[body.action];

  const job = await query(
    pool,
    `INSERT INTO citadel.operator_jobs (job_type, payload, requested_by, max_attempts)
     VALUES ($1, $2::jsonb, 'app-lifecycle-dashboard', 1)
     RETURNING id, job_type, payload, status, requested_at`,
    [jobType, JSON.stringify({ appSlug: slug, databaseName: appRow.database_name, lifecycleAction: body.action })]
  );

  await query(
    pool,
    `INSERT INTO citadel.audit_events (actor, action, target, metadata)
     VALUES ('gateway', 'app_lifecycle_action_enqueued', $1, $2::jsonb)`,
    [slug, JSON.stringify({ action: body.action, jobType, jobId: job.rows[0].id })]
  );

  res.status(201).json({ ok: true, action: body.action, job: job.rows[0] });
});

app.get('/admin/apps/:appSlug/rollback-packet', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const result = await query(pool, `SELECT app_slug, database_name, role_name, engine, status, created_at FROM citadel.apps WHERE app_slug = $1`, [slug]);
  if (result.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const appRow = result.rows[0];
  const packet = `# ${appRow.app_slug} Rollback Packet

## Purpose

This packet exists so the operator can reverse a bad app database cutover.

## App

- App: ${appRow.app_slug}
- CitadelDB database: ${appRow.database_name}
- CitadelDB role: ${appRow.role_name}

## Rollback triggers

☐ app cannot connect  
☐ app can connect but cannot write  
☐ migrations failed  
☐ critical production behavior broke  
☐ backup/restore proof missing  
☐ data mismatch found  

## Rollback steps

1. Stop new deploy or disable traffic if needed.
2. Restore previous app environment variables.
3. Point app back to previous DATABASE_URL.
4. Restart app.
5. Run app health check.
6. Run app write check against previous database.
7. Preserve CitadelDB failed cutover diagnostic bundle.
8. Open incident note in SkyLedger/audit.
9. Do not retry cutover until cause is fixed.

## Required rollback evidence

☐ previous DATABASE_URL restored  
☐ app health passed  
☐ app write test passed  
☐ incident/audit note created  
☐ failed CitadelDB diagnostic bundle archived  

## Rule

Rollback is not failure. Unproven success is failure.
`;

  res.json({ ok: true, app: appRow, packet });
});

app.get('/admin/apps/:appSlug/lifecycle-packet', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.appSlug);
  const framework = String(req.query.framework || 'node-express');
  const source = String(req.query.source || 'existing DATABASE_URL');

  const [appResult, jobs, backups, restores, audits] = await Promise.all([
    query(pool, `SELECT app_slug, database_name, role_name, engine, status, created_at FROM citadel.apps WHERE app_slug = $1`, [slug]),
    query(pool, `SELECT id, job_type, status, payload, requested_at, finished_at, error FROM citadel.operator_jobs WHERE payload::text ILIKE $1 ORDER BY requested_at DESC LIMIT 30`, [`%${slug}%`]),
    query(pool, `SELECT backup_kind, database_name, backup_path, checksum, created_at, restore_test_status FROM citadel.backup_receipts WHERE database_name ILIKE $1 ORDER BY created_at DESC LIMIT 30`, [`%${slug}%`]),
    query(pool, `SELECT target_database, source_backup_path, success, started_at, finished_at, error FROM citadel.restore_receipts WHERE target_database ILIKE $1 ORDER BY started_at DESC LIMIT 30`, [`%${slug}%`]),
    query(pool, `SELECT actor, action, target, metadata, created_at FROM citadel.audit_events WHERE target ILIKE $1 OR metadata::text ILIKE $1 ORDER BY created_at DESC LIMIT 30`, [`%${slug}%`])
  ]);

  if (appResult.rowCount === 0) return res.status(404).json({ ok: false, error: 'App not found' });

  const appRow = appResult.rows[0];
  const parts = safeConnectionParts({ appSlug: appRow.app_slug, databaseName: appRow.database_name, roleName: appRow.role_name });

  const migrationPlan = {
    generatedAt: new Date().toISOString(),
    app: appRow,
    framework,
    source,
    target: {
      provider: 'postgres',
      host: parts.host,
      port: parts.port,
      database: appRow.database_name,
      username: appRow.role_name
    },
    steps: [
      { order: 1, label: 'Freeze risky writes or schedule maintenance window', proof: 'operator note / release window' },
      { order: 2, label: `Export data from ${source}`, proof: 'source export file or dump receipt' },
      { order: 3, label: `Import into ${appRow.database_name}`, proof: 'migration/import receipt' },
      { order: 4, label: 'Run app migrations against CitadelDB DATABASE_URL', proof: 'migration command output' },
      { order: 5, label: 'Run dashboard connection test', proof: 'database_url_connection_test audit event' },
      { order: 6, label: 'Run dashboard write-smoke test', proof: 'database_url_write_smoke audit event' },
      { order: 7, label: 'Run app-level smoke checks', proof: 'app smoke receipt' },
      { order: 8, label: 'Run backup and restore-test after cutover', proof: 'backup + restore receipts' }
    ],
    acceptance: ['connection test', 'write-smoke', 'backup receipt', 'restore-test receipt', 'deployment receipt']
  };

  const proofPacket = {
    generatedAt: new Date().toISOString(),
    app: appRow,
    jobs: jobs.rows,
    backups: backups.rows,
    restores: restores.rows,
    audits: audits.rows,
    acceptance: {
      connectionTest: audits.rows.some(a => a.action === 'database_url_connection_test'),
      writeSmoke: audits.rows.some(a => a.action === 'database_url_write_smoke'),
      backup: backups.rows.length > 0,
      restoreTest: restores.rows.some(r => r.success === true)
    }
  };
  proofPacket.accepted = proofPacket.acceptance.connectionTest && proofPacket.acceptance.writeSmoke && proofPacket.acceptance.backup && proofPacket.acceptance.restoreTest;

  const rollbackPacket = {
    generatedAt: new Date().toISOString(),
    app: appRow,
    triggers: [
      'app cannot connect',
      'app can connect but cannot write',
      'migrations failed',
      'critical production behavior broke',
      'backup/restore proof missing',
      'data mismatch found'
    ],
    steps: [
      'Stop new deploy or disable traffic if needed.',
      'Restore previous app environment variables.',
      'Point app back to previous DATABASE_URL.',
      'Restart app.',
      'Run app health check.',
      'Run app write check against previous database.',
      'Preserve CitadelDB failed cutover diagnostic bundle.',
      'Open incident note in SkyLedger/audit.',
      'Do not retry cutover until cause is fixed.'
    ],
    evidenceRequired: [
      'previous DATABASE_URL restored',
      'app health passed',
      'app write test passed',
      'incident/audit note created',
      'failed CitadelDB diagnostic bundle archived'
    ],
    rule: 'Rollback is not failure. Unproven success is failure.'
  };

  res.json({
    ok: true,
    packet: JSON.parse(redactSecrets(JSON.stringify({
      generatedAt: new Date().toISOString(),
      appSlug: slug,
      migrationPlan,
      proofPacket,
      rollbackPacket,
      accepted: proofPacket.accepted
    })))
  });
});

app.get('/admin/self-service/projects', requireAdmin, async (_req, res) => {
  const result = await query(pool, `SELECT project_slug, project_name, owner_ref, status, max_databases, max_query_ms, created_at FROM self_service.projects ORDER BY created_at DESC`);
  res.json({ ok: true, projects: result.rows });
});

app.post('/admin/self-service/projects', requireAdmin, async (req, res) => {
  const body = z.object({
    projectSlug: z.string().min(2).max(60),
    projectName: z.string().min(2).max(120),
    ownerRef: z.string().min(1).max(120).optional(),
    maxDatabases: z.number().int().min(1).max(100).optional()
  }).parse(req.body);

  const slug = appSlug(body.projectSlug);
  const result = await query(
    pool,
    `INSERT INTO self_service.projects (project_slug, project_name, owner_ref, max_databases)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (project_slug) DO UPDATE SET project_name = EXCLUDED.project_name
     RETURNING project_slug, project_name, owner_ref, status, max_databases, max_query_ms, created_at`,
    [slug, body.projectName, body.ownerRef || 'operator', body.maxDatabases || 5]
  );

  res.status(201).json({ ok: true, project: result.rows[0] });
});

app.get('/admin/self-service/projects/:projectSlug', requireAdmin, async (req, res) => {
  const slug = appSlug(req.params.projectSlug);
  const [project, dbs, history] = await Promise.all([
    query(pool, `SELECT project_slug, project_name, owner_ref, status, max_databases, max_query_ms, created_at FROM self_service.projects WHERE project_slug = $1`, [slug]),
    query(pool, `SELECT project_slug, app_slug, database_name, role_name, status, created_at FROM self_service.project_databases WHERE project_slug = $1 ORDER BY created_at DESC`, [slug]),
    query(pool, `SELECT id, app_slug, database_name, sql_preview, statement_kind, success, row_count, elapsed_ms, error, created_at FROM self_service.query_history WHERE project_slug = $1 ORDER BY created_at DESC LIMIT 50`, [slug])
  ]);

  if (project.rowCount === 0) return res.status(404).json({ ok: false, error: 'Project not found' });

  res.json({ ok: true, project: project.rows[0], databases: dbs.rows, queryHistory: history.rows });
});

app.post('/admin/self-service/projects/:projectSlug/databases', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const body = z.object({
    appSlug: z.string().min(2).max(60),
    engine: z.string().optional().default('vps-postgres')
  }).parse(req.body);

  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'self_service_database_provision', projectSlug });
  if (!gate) return;

  const project = await query(pool, `SELECT project_slug, max_databases FROM self_service.projects WHERE project_slug = $1`, [projectSlug]);
  if (project.rowCount === 0) return res.status(404).json({ ok: false, error: 'Project not found' });

  const count = await query(pool, `SELECT count(*)::int AS count FROM self_service.project_databases WHERE project_slug = $1`, [projectSlug]);
  if (count.rows[0].count >= project.rows[0].max_databases) {
    return res.status(400).json({ ok: false, error: 'Project database quota reached' });
  }

  const app = appSlug(`${projectSlug}-${body.appSlug}`);
  const databaseName = `app_${app}`.slice(0, 60);
  const roleName = `app_${app}_user`.slice(0, 60);
  const password = generateAppPassword();

  const roleExists = await query(pool, 'SELECT 1 FROM pg_roles WHERE rolname = $1', [roleName]);
  if (roleExists.rowCount === 0) {
    await query(pool, `CREATE ROLE ${sqlIdent(roleName)} WITH LOGIN PASSWORD ${sqlLiteral(password)} NOSUPERUSER NOCREATEDB NOCREATEROLE`);
  }

  const dbExists = await query(pool, 'SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (dbExists.rowCount === 0) {
    // CREATE DATABASE cannot run inside a transaction block in Postgres.
    await query(pool, `CREATE DATABASE ${sqlIdent(databaseName)} OWNER ${sqlIdent(roleName)}`);
  }

  await query(pool, `GRANT ALL PRIVILEGES ON DATABASE ${sqlIdent(databaseName)} TO ${sqlIdent(roleName)}`);

  await query(
    pool,
    `INSERT INTO citadel.apps (app_slug, database_name, role_name, engine, status)
     VALUES ($1, $2, $3, $4, 'active')
     ON CONFLICT (app_slug) DO UPDATE SET status = 'active'
     RETURNING app_slug, database_name, role_name, engine, status, created_at`,
    [app, databaseName, roleName, body.engine || 'vps-postgres']
  );

  const projectDb = await query(
    pool,
    `INSERT INTO self_service.project_databases (project_slug, app_slug, database_name, role_name)
     VALUES ($1, $2, $3, $4)
     RETURNING project_slug, app_slug, database_name, role_name, status, created_at`,
    [projectSlug, app, databaseName, roleName]
  );

  const parts = safeConnectionParts({ appSlug: app, databaseName, roleName });
  const databaseUrl = buildDatabaseUrl({ role: roleName, password, host: parts.host, port: parts.port, database: databaseName });

  await query(pool, `INSERT INTO self_service.connection_events (project_slug, app_slug, event_kind, metadata) VALUES ($1, $2, 'database_created', $3::jsonb)`, [projectSlug, app, JSON.stringify({ databaseName, roleName })]);

  res.status(201).json({
    ok: true,
    database: projectDb.rows[0],
    connection: {
      databaseUrl,
      env: `DATABASE_PROVIDER=postgres\nDATABASE_URL=${databaseUrl}\nCITADEL_PROJECT_SLUG=${projectSlug}\nCITADEL_APP_SLUG=${app}\n`
    },
    warning: 'This is the only time the generated database password is shown unless you rotate credentials.'
  });
});

app.post('/admin/self-service/projects/:projectSlug/databases/:appSlug/sql', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const app = appSlug(req.params.appSlug);
  const body = z.object({
    databaseUrl: z.string().min(12).max(4000),
    sql: z.string().min(1).max(20000)
  }).parse(req.body);

  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'self_service_sql_execute', projectSlug });
  if (!gate) return;

  const policy = validateSqlForConsole(body.sql);
  if (!policy.ok) {
    await query(
      pool,
      `INSERT INTO self_service.query_history (project_slug, app_slug, database_name, sql_preview, statement_kind, success, error)
       VALUES ($1, $2, 'unknown', $3, 'BLOCKED', false, $4)`,
      [projectSlug, app, sqlPreview(body.sql), policy.error]
    );
    return res.status(400).json({ ok: false, error: policy.error });
  }

  const started = Date.now();
  const client = new Client({ connectionString: body.databaseUrl, statement_timeout: 8000, connectionTimeoutMillis: 8000 });

  try {
    await client.connect();
    const dbInfo = await client.query('select current_database() as database, current_user as user');
    const result = await client.query(body.sql);
    const elapsedMs = Date.now() - started;
    const databaseName = dbInfo.rows[0]?.database || 'unknown';

    await query(
      pool,
      `INSERT INTO self_service.query_history (project_slug, app_slug, database_name, sql_preview, statement_kind, success, row_count, elapsed_ms)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
      [projectSlug, app, databaseName, sqlPreview(body.sql), policy.statementKind, result.rowCount ?? result.rows?.length ?? 0, elapsedMs]
    );

    const gateCtx = upstreamContext(req);
    await recordUsage({
      pool,
      query,
      teamSlug: gateCtx.teamSlug,
      projectSlug,
      appSlug: app,
      metricKey: 'query_execution',
      metricValue: 1,
      metadata: { statementKind: policy.statementKind, elapsedMs, rowCount: result.rowCount ?? result.rows?.length ?? 0 }
    });

    res.json({
      ok: true,
      elapsedMs,
      fields: result.fields?.map(f => f.name) || [],
      rowCount: result.rowCount,
      rows: result.rows?.slice(0, 250) || [],
      notice: result.rows?.length > 250 ? 'Result truncated to 250 rows.' : null
    });
  } catch (error) {
    const elapsedMs = Date.now() - started;
    await query(
      pool,
      `INSERT INTO self_service.query_history (project_slug, app_slug, database_name, sql_preview, statement_kind, success, elapsed_ms, error)
       VALUES ($1, $2, 'unknown', $3, $4, false, $5, $6)`,
      [projectSlug, app, sqlPreview(body.sql), policy.statementKind, elapsedMs, redactSecrets(error.message)]
    );
    res.status(500).json({ ok: false, elapsedMs, error: redactSecrets(error.message) });
  } finally {
    try { await client.end(); } catch {}
  }
});


app.get('/admin/platform/plans', requireAdmin, async (_req, res) => {
  const result = await query(pool, `SELECT plan_slug, plan_name, monthly_price_cents, max_projects, max_databases, max_query_executions_month, max_storage_mb, max_team_members FROM platform.plans ORDER BY monthly_price_cents ASC`);
  res.json({ ok: true, plans: result.rows });
});

app.post('/admin/platform/accounts', requireAdmin, async (req, res) => {
  const body = z.object({
    accountRef: z.string().min(2).max(120),
    displayName: z.string().min(2).max(160),
    email: z.string().email().optional(),
    upstreamSubject: z.string().optional()
  }).parse(req.body);

  const result = await query(
    pool,
    `INSERT INTO platform.accounts (account_ref, display_name, email, upstream_subject)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (account_ref) DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email
     RETURNING account_ref, display_name, email, status, upstream_subject, created_at`,
    [body.accountRef, body.displayName, body.email || null, body.upstreamSubject || null]
  );

  res.status(201).json({ ok: true, account: result.rows[0] });
});

app.post('/admin/platform/teams', requireAdmin, async (req, res) => {
  const body = z.object({
    teamSlug: z.string().min(2).max(80),
    teamName: z.string().min(2).max(160),
    ownerAccountRef: z.string().min(2).max(120),
    planSlug: z.string().optional().default('starter')
  }).parse(req.body);

  const slug = appSlug(body.teamSlug);
  const result = await query(
    pool,
    `INSERT INTO platform.teams (team_slug, team_name, owner_account_ref, plan_slug)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (team_slug) DO UPDATE SET team_name = EXCLUDED.team_name, plan_slug = EXCLUDED.plan_slug
     RETURNING team_slug, team_name, owner_account_ref, plan_slug, status, created_at`,
    [slug, body.teamName, body.ownerAccountRef, body.planSlug]
  );

  await query(
    pool,
    `INSERT INTO platform.team_members (team_slug, account_ref, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (team_slug, account_ref) DO UPDATE SET role = 'owner'`,
    [slug, body.ownerAccountRef]
  );

  res.status(201).json({ ok: true, team: result.rows[0] });
});

app.get('/admin/platform/teams', requireAdmin, async (_req, res) => {
  const result = await query(
    pool,
    `SELECT t.team_slug, t.team_name, t.owner_account_ref, t.plan_slug, t.status, t.created_at,
            p.plan_name, p.max_projects, p.max_databases, p.max_query_executions_month, p.max_storage_mb
     FROM platform.teams t
     JOIN platform.plans p ON p.plan_slug = t.plan_slug
     ORDER BY t.created_at DESC`
  );
  res.json({ ok: true, teams: result.rows });
});

app.get('/admin/platform/teams/:teamSlug/usage', requireAdmin, async (req, res) => {
  const teamSlug = appSlug(req.params.teamSlug);
  const [team, projects, dbs, queries] = await Promise.all([
    query(pool, `SELECT t.*, p.plan_name, p.max_projects, p.max_databases, p.max_query_executions_month, p.max_storage_mb FROM platform.teams t JOIN platform.plans p ON p.plan_slug = t.plan_slug WHERE t.team_slug = $1`, [teamSlug]),
    query(pool, `SELECT count(*)::int AS count FROM platform.project_ownership WHERE team_slug = $1`, [teamSlug]),
    query(pool, `SELECT count(*)::int AS count FROM self_service.project_databases d JOIN platform.project_ownership o ON o.project_slug = d.project_slug WHERE o.team_slug = $1`, [teamSlug]),
    query(pool, `SELECT count(*)::int AS count FROM self_service.query_history h JOIN platform.project_ownership o ON o.project_slug = h.project_slug WHERE o.team_slug = $1 AND h.created_at >= date_trunc('month', now())`, [teamSlug])
  ]);

  if (team.rowCount === 0) return res.status(404).json({ ok: false, error: 'Team not found' });

  const usage = {
    projects: projects.rows[0].count,
    databases: dbs.rows[0].count,
    queryExecutionsMonth: queries.rows[0].count,
    estimatedStorageMb: 0
  };

  res.json({ ok: true, team: team.rows[0], usage });
});

app.post('/admin/platform/teams/:teamSlug/projects/:projectSlug/attach', requireAdmin, async (req, res) => {
  const teamSlug = appSlug(req.params.teamSlug);
  const projectSlug = appSlug(req.params.projectSlug);
  const current = await query(pool, `SELECT count(*)::int AS count FROM platform.project_ownership WHERE team_slug = $1`, [teamSlug]);
  const quota = await checkTeamQuota({ pool, query, teamSlug, quotaKey: 'projects', currentValue: current.rows[0].count });
  if (!quota.allowed) return res.status(400).json({ ok: false, error: 'Project quota reached', quota });

  const result = await query(
    pool,
    `INSERT INTO platform.project_ownership (team_slug, project_slug)
     VALUES ($1, $2)
     ON CONFLICT (team_slug, project_slug) DO NOTHING
     RETURNING team_slug, project_slug, created_at`,
    [teamSlug, projectSlug]
  );

  res.status(201).json({ ok: true, attachment: result.rows[0] || { team_slug: teamSlug, project_slug: projectSlug, existing: true }, quota });
});

app.get('/admin/self-service/projects/:projectSlug/databases/:appSlug/schema', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const app = appSlug(req.params.appSlug);
  const result = await query(pool, `SELECT database_name FROM self_service.project_databases WHERE project_slug = $1 AND app_slug = $2`, [projectSlug, app]);
  if (result.rowCount === 0) return res.status(404).json({ ok: false, error: 'Database not found' });

  res.json({
    ok: true,
    projectSlug,
    appSlug: app,
    note: 'Schema introspection requires a user DATABASE_URL so CitadelDB can connect as the app role. Use /tables with databaseUrl POST in dashboard.'
  });
});

app.post('/admin/self-service/projects/:projectSlug/databases/:appSlug/tables', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'table_browser_list', projectSlug });
  if (!gate) return;
  const body = z.object({ databaseUrl: z.string().min(12).max(4000) }).parse(req.body);
  const client = new Client({ connectionString: body.databaseUrl, statement_timeout: 8000, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY table_schema, table_name
      LIMIT 250
    `);
    res.json({ ok: true, tables: tables.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: redactSecrets(error.message) });
  } finally {
    try { await client.end(); } catch {}
  }
});

app.post('/admin/self-service/projects/:projectSlug/databases/:appSlug/table-preview', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'table_browser_preview', projectSlug });
  if (!gate) return;
  const body = z.object({
    databaseUrl: z.string().min(12).max(4000),
    schema: z.string().min(1).max(80).default('public'),
    table: z.string().min(1).max(120),
    limit: z.number().int().min(1).max(100).optional().default(50)
  }).parse(req.body);

  const client = new Client({ connectionString: body.databaseUrl, statement_timeout: 8000, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const rows = await client.query(`SELECT * FROM ${sqlIdent(body.schema)}.${sqlIdent(body.table)} LIMIT ${Number(body.limit)}`);
    res.json({ ok: true, fields: rows.fields?.map(f => f.name) || [], rows: rows.rows, rowCount: rows.rowCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: redactSecrets(error.message) });
  } finally {
    try { await client.end(); } catch {}
  }
});


app.get('/admin/commercial/entitlements/:teamSlug', requireAdmin, async (req, res) => {
  const teamSlug = appSlug(req.params.teamSlug);
  const entitlement = await getEntitlement({ pool, query, teamSlug });

  await query(
    pool,
    `INSERT INTO commercial.entitlement_checks (team_slug, allowed, reason, plan_slug, subscription_status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      teamSlug,
      entitlement.allowed,
      entitlement.reason,
      entitlement.subscription?.plan_slug || null,
      entitlement.subscription?.status || null,
      JSON.stringify({ source: 'admin_entitlement_check' })
    ]
  );

  res.json({ ok: true, entitlement });
});

app.post('/admin/commercial/subscriptions', requireAdmin, async (req, res) => {
  const body = z.object({
    teamSlug: z.string().min(2).max(80),
    planSlug: z.string().min(2).max(80),
    status: z.string().min(2).max(80).default('active'),
    providerSubscriptionId: z.string().optional()
  }).parse(req.body);

  const teamSlug = appSlug(body.teamSlug);
  const result = await query(
    pool,
    `INSERT INTO commercial.subscriptions (team_slug, provider, provider_subscription_id, plan_slug, status, current_period_start, current_period_end, raw_event)
     VALUES ($1, 'manual', $2, $3, $4, now(), now() + interval '30 days', '{}'::jsonb)
     ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET status = EXCLUDED.status, plan_slug = EXCLUDED.plan_slug, updated_at = now()
     RETURNING team_slug, provider, provider_subscription_id, plan_slug, status, current_period_start, current_period_end, updated_at`,
    [teamSlug, body.providerSubscriptionId || `manual_${teamSlug}`, body.planSlug, body.status]
  );

  await query(pool, `UPDATE platform.teams SET plan_slug = $1 WHERE team_slug = $2`, [body.planSlug, teamSlug]);

  res.status(201).json({ ok: true, subscription: result.rows[0] });
});

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const payload = req.rawBody || (req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body || {}));
  const signature = req.headers['stripe-signature'];
  const verification = verifyStripeSignature({ payload, signature, secret: process.env.STRIPE_WEBHOOK_SECRET });

  if (!verification.ok) return res.status(400).json({ ok: false, error: verification.error });

  let event;
  try { event = JSON.parse(payload); } catch { return res.status(400).json({ ok: false, error: 'Invalid JSON payload' }); }

  const eventId = event.id || `evt_${Date.now()}`;
  const eventType = event.type || 'unknown';
  const obj = event.data?.object || {};
  const teamSlug = obj.metadata?.teamSlug || obj.metadata?.team_slug || null;
  const accountRef = obj.metadata?.accountRef || obj.metadata?.account_ref || null;

  await query(
    pool,
    `INSERT INTO commercial.payment_events (provider, provider_event_id, event_type, team_slug, account_ref, processed, raw_event)
     VALUES ('stripe', $1, $2, $3, $4, false, $5::jsonb)
     ON CONFLICT (provider, provider_event_id) DO NOTHING`,
    [eventId, eventType, teamSlug, accountRef, JSON.stringify(event)]
  );

  if (teamSlug && (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated')) {
    const planSlug = obj.metadata?.planSlug || obj.metadata?.plan_slug || 'starter';
    await query(
      pool,
      `INSERT INTO commercial.subscriptions (team_slug, provider, provider_subscription_id, plan_slug, status, current_period_start, current_period_end, raw_event)
       VALUES ($1, 'stripe', $2, $3, $4, to_timestamp($5), to_timestamp($6), $7::jsonb)
       ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET plan_slug = EXCLUDED.plan_slug, status = EXCLUDED.status, current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end, raw_event = EXCLUDED.raw_event, updated_at = now()`,
      [teamSlug, obj.id, planSlug, obj.status || 'unknown', obj.current_period_start || Math.floor(Date.now()/1000), obj.current_period_end || Math.floor(Date.now()/1000), JSON.stringify(event)]
    );
    await query(pool, `UPDATE platform.teams SET plan_slug = $1 WHERE team_slug = $2`, [planSlug, teamSlug]);
  }

  await query(pool, `UPDATE commercial.payment_events SET processed = true WHERE provider = 'stripe' AND provider_event_id = $1`, [eventId]);
  res.json({ ok: true, received: true });
});

app.get('/admin/commercial/events', requireAdmin, async (_req, res) => {
  const result = await query(pool, `SELECT provider_event_id, event_type, team_slug, account_ref, processed, created_at FROM commercial.payment_events ORDER BY created_at DESC LIMIT 100`);
  res.json({ ok: true, events: result.rows });
});

app.post('/admin/self-service/projects/:projectSlug/databases/:appSlug/branch-request', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const gate = await requireCommercialGate({ req, res, pool, query, routeKey: 'branch_request', projectSlug });
  if (!gate) return;
  const parentApp = appSlug(req.params.appSlug);
  const body = z.object({
    branchSlug: z.string().min(2).max(80),
    sourceKind: z.enum(['snapshot', 'pitr', 'logical_dump']).optional().default('snapshot'),
    sourceReference: z.string().optional()
  }).parse(req.body);

  const branchSlug = appSlug(body.branchSlug);
  const targetDatabaseName = `branch_${projectSlug}_${branchSlug}`.slice(0, 60);
  const ctx = upstreamContext(req);

  const result = await query(
    pool,
    `INSERT INTO platform.database_branches (project_slug, parent_app_slug, branch_slug, target_database_name, source_kind, source_reference, requested_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING project_slug, parent_app_slug, branch_slug, target_database_name, source_kind, source_reference, status, requested_by, created_at`,
    [projectSlug, parentApp, branchSlug, targetDatabaseName, body.sourceKind, body.sourceReference || null, ctx.accountRef]
  );

  await query(
    pool,
    `INSERT INTO platform.branch_events (project_slug, branch_slug, event_kind, metadata)
     VALUES ($1, $2, 'branch_requested', $3::jsonb)`,
    [projectSlug, branchSlug, JSON.stringify({ parentApp, sourceKind: body.sourceKind, sourceReference: body.sourceReference || null })]
  );

  res.status(201).json({
    ok: true,
    branch: result.rows[0],
    note: 'Branch request recorded. Live branching requires PITR/snapshot worker proof before claiming branch created.'
  });
});

app.get('/admin/self-service/projects/:projectSlug/branches', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const result = await query(pool, `SELECT project_slug, parent_app_slug, branch_slug, target_database_name, source_kind, source_reference, status, requested_by, created_at, completed_at, error FROM platform.database_branches WHERE project_slug = $1 ORDER BY created_at DESC`, [projectSlug]);
  res.json({ ok: true, branches: result.rows });
});

app.get('/admin/commercial/readiness', requireAdmin, async (_req, res) => {
  const checks = [
    { key: 'stripe_secret', ok: Boolean(process.env.STRIPE_SECRET_KEY), label: 'Stripe secret key configured' },
    { key: 'stripe_webhook_secret', ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET), label: 'Stripe webhook secret configured' },
    { key: 'active_subscription_required', ok: String(process.env.REQUIRE_ACTIVE_SUBSCRIPTION || 'false') === 'true', label: 'Active subscription enforcement enabled' },
    { key: 'upstream_account_header', ok: Boolean(process.env.UPSTREAM_ACCOUNT_HEADER || 'x-citadel-account'), label: 'Upstream account header configured' },
    { key: 'upstream_team_header', ok: Boolean(process.env.UPSTREAM_TEAM_HEADER || 'x-citadel-team'), label: 'Upstream team header configured' }
  ];
  res.json({ ok: true, complete: checks.filter(c => c.ok).length, total: checks.length, checks });
});



app.get('/admin/live-gates/protected-routes', requireAdmin, async (_req, res) => {
  res.json({
    ok: true,
    protectedRoutes,
    guarded: protectedRoutes.filter(r => r.status === 'guarded').length,
    needsPolicyReview: protectedRoutes.filter(r => r.status === 'needs-policy-review').length
  });
});

app.get('/admin/live-gates/status', requireAdmin, async (_req, res) => {
  const [routeEvents, usageEvents, branches, checks] = await Promise.all([
    query(pool, `SELECT route_key, allowed, reason, team_slug, account_ref, created_at FROM live_gate.route_gate_events ORDER BY created_at DESC LIMIT 50`),
    query(pool, `SELECT team_slug, project_slug, app_slug, metric_key, metric_value, created_at FROM live_gate.usage_events ORDER BY created_at DESC LIMIT 50`),
    query(pool, `SELECT project_slug, branch_slug, parent_app_slug, target_database_name, source_kind, status, created_at, completed_at, error FROM live_gate.branch_receipts ORDER BY created_at DESC LIMIT 50`),
    query(pool, `SELECT gate_key, status, evidence, created_at FROM live_gate.live_gate_checks ORDER BY created_at DESC LIMIT 50`)
  ]);

  res.json({
    ok: true,
    config: {
      enforceEntitlementsOnSelfService: String(process.env.ENFORCE_ENTITLEMENTS_ON_SELF_SERVICE || 'false') === 'true',
      enforceUpstreamTeamContext: String(process.env.ENFORCE_UPSTREAM_TEAM_CONTEXT || 'false') === 'true',
      usageMeteringEnabled: String(process.env.USAGE_METERING_ENABLED || 'true') === 'true',
      branchWorkerEnabled: String(process.env.BRANCH_WORKER_ENABLED || 'false') === 'true'
    },
    routeEvents: routeEvents.rows,
    usageEvents: usageEvents.rows,
    branchReceipts: branches.rows,
    checks: checks.rows
  });
});

app.post('/admin/live-gates/check', requireAdmin, async (req, res) => {
  const checks = [
    { gateKey: 'subscription_enforcement_config', status: String(process.env.ENFORCE_ENTITLEMENTS_ON_SELF_SERVICE || 'false') === 'true' ? 'pass' : 'open', evidence: 'ENFORCE_ENTITLEMENTS_ON_SELF_SERVICE' },
    { gateKey: 'upstream_team_context_config', status: String(process.env.ENFORCE_UPSTREAM_TEAM_CONTEXT || 'false') === 'true' ? 'pass' : 'open', evidence: 'ENFORCE_UPSTREAM_TEAM_CONTEXT' },
    { gateKey: 'stripe_webhook_secret', status: process.env.STRIPE_WEBHOOK_SECRET ? 'pass' : 'open', evidence: 'STRIPE_WEBHOOK_SECRET' },
    { gateKey: 'usage_metering_config', status: String(process.env.USAGE_METERING_ENABLED || 'true') === 'true' ? 'pass' : 'open', evidence: 'USAGE_METERING_ENABLED' },
    { gateKey: 'branch_worker_config', status: String(process.env.BRANCH_WORKER_ENABLED || 'false') === 'true' ? 'pass' : 'open', evidence: 'BRANCH_WORKER_ENABLED' }
  ];

  for (const c of checks) {
    await query(
      pool,
      `INSERT INTO live_gate.live_gate_checks (gate_key, status, evidence)
       VALUES ($1, $2, $3)`,
      [c.gateKey, c.status, c.evidence]
    );
  }

  res.json({ ok: true, checks });
});

app.get('/admin/self-service/projects/:projectSlug/branches/:branchSlug/proof-packet', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const branchSlug = appSlug(req.params.branchSlug);
  const [branch, receipts, events] = await Promise.all([
    query(pool, `SELECT project_slug, parent_app_slug, branch_slug, target_database_name, source_kind, source_reference, status, requested_by, created_at, completed_at, error FROM platform.database_branches WHERE project_slug = $1 AND branch_slug = $2`, [projectSlug, branchSlug]),
    query(pool, `SELECT project_slug, branch_slug, parent_app_slug, target_database_name, source_kind, source_reference, status, receipt_kind, proof, created_at, completed_at, error FROM live_gate.branch_receipts WHERE project_slug = $1 AND branch_slug = $2 ORDER BY created_at DESC`, [projectSlug, branchSlug]),
    query(pool, `SELECT project_slug, branch_slug, event_kind, metadata, created_at FROM platform.branch_events WHERE project_slug = $1 AND branch_slug = $2 ORDER BY created_at DESC`, [projectSlug, branchSlug])
  ]);

  if (branch.rowCount === 0) return res.status(404).json({ ok: false, error: 'Branch not found' });

  const accepted = receipts.rows.some(r => r.receipt_kind === 'branch_write_smoke' && r.status === 'passed')
    && receipts.rows.some(r => r.receipt_kind === 'branch_restore' && r.status === 'passed')
    && branch.rows[0].status === 'active';

  res.json({
    ok: true,
    packet: {
      generatedAt: new Date().toISOString(),
      branch: branch.rows[0],
      receipts: receipts.rows,
      events: events.rows,
      accepted,
      requiredReceipts: ['branch_source_snapshot_or_pitr', 'branch_restore', 'branch_connection_test', 'branch_write_smoke']
    }
  });
});

app.post('/admin/self-service/projects/:projectSlug/databases/:appSlug/branch-request/:branchSlug/record-receipt', requireAdmin, async (req, res) => {
  const projectSlug = appSlug(req.params.projectSlug);
  const app = appSlug(req.params.appSlug);
  const branchSlug = appSlug(req.params.branchSlug);
  const body = z.object({
    receiptKind: z.enum(['branch_source_snapshot_or_pitr', 'branch_restore', 'branch_connection_test', 'branch_write_smoke']),
    status: z.enum(['passed', 'failed', 'open']).default('open'),
    proof: z.record(z.any()).optional().default({})
  }).parse(req.body);

  const branch = await query(pool, `SELECT target_database_name, source_kind, source_reference FROM platform.database_branches WHERE project_slug = $1 AND branch_slug = $2`, [projectSlug, branchSlug]);
  if (branch.rowCount === 0) return res.status(404).json({ ok: false, error: 'Branch not found' });

  const receipt = await query(
    pool,
    `INSERT INTO live_gate.branch_receipts (project_slug, branch_slug, parent_app_slug, target_database_name, source_kind, source_reference, status, receipt_kind, proof, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, CASE WHEN $7 IN ('passed','failed') THEN now() ELSE null END)
     RETURNING project_slug, branch_slug, receipt_kind, status, proof, created_at, completed_at`,
    [projectSlug, branchSlug, app, branch.rows[0].target_database_name, branch.rows[0].source_kind, branch.rows[0].source_reference, body.status, body.receiptKind, JSON.stringify(body.proof || {})]
  );

  await query(pool, `INSERT INTO platform.branch_events (project_slug, branch_slug, event_kind, metadata) VALUES ($1, $2, 'branch_receipt_recorded', $3::jsonb)`, [projectSlug, branchSlug, JSON.stringify({ receiptKind: body.receiptKind, status: body.status })]);

  res.status(201).json({ ok: true, receipt: receipt.rows[0] });
});

app.use((error, _req, res, _next) => {
  const status = error?.name === 'ZodError' ? 400 : 500;
  const payload = {
    ok: false,
    error: status === 400 ? 'Invalid request body' : redactSecrets(error?.message || 'Internal server error')
  };

  if (error?.name === 'ZodError') {
    payload.issues = (error.issues || error.errors || []).map(issue => ({
      path: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || ''),
      message: issue.message
    }));
  }

  res.status(status).json(payload);
});

const port = Number(process.env.GATEWAY_PORT || 7313);
const host = process.env.GATEWAY_BIND_HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`CitadelDB Gateway v3.0.1 Audit Clean Closure listening on ${host}:${port}`);
});

// v2.5 protected route keys: setup_generate_secrets guided_proof_action app_lifecycle_action credential_rotation ai_debug
