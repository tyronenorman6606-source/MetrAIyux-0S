import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.CONTROL_DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function runMigrations() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sqlDir = path.resolve(__dirname, '../sql');
  const files = (await fs.readdir(sqlDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(sqlDir, file), 'utf8');
    await pool.query(sql);
  }
}
