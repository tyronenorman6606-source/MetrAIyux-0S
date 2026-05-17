import pg from 'pg';

const { Pool } = pg;

export function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
}

export async function query(pool, text, params = []) {
  const started = Date.now();
  const result = await pool.query(text, params);
  return {
    rows: result.rows,
    rowCount: result.rowCount,
    durationMs: Date.now() - started
  };
}
