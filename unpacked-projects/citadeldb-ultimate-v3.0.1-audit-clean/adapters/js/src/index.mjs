import pg from 'pg';

const { Pool } = pg;

export function createCitadelDb(options = {}) {
  const provider = options.provider || process.env.DATABASE_PROVIDER || 'postgres';

  if (provider !== 'postgres') {
    throw new Error(`Provider "${provider}" is declared but not implemented in this JS adapter yet.`);
  }

  const connectionString = options.connectionString || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString,
    max: Number(options.poolMax || process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(options.idleTimeoutMillis || 30_000),
    connectionTimeoutMillis: Number(options.connectionTimeoutMillis || 10_000)
  });

  return {
    provider,

    async query(text, params = []) {
      const result = await pool.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount };
    },

    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx = {
          query: async (text, params = []) => {
            const result = await client.query(text, params);
            return { rows: result.rows, rowCount: result.rowCount };
          }
        };
        const value = await fn(tx);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },

    async health() {
      const result = await pool.query('SELECT now() AS server_time, current_database() AS database_name');
      return {
        ok: true,
        provider,
        database: result.rows[0].database_name,
        serverTime: result.rows[0].server_time
      };
    },

    async close() {
      await pool.end();
    }
  };
}
