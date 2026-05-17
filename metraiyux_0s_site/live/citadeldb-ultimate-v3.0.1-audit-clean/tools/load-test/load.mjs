import pg from 'pg';
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL required'); process.exit(1); }

const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
const iterations = Number(process.env.LOAD_ITERATIONS || 100);
const pool = new Pool({ connectionString, max: concurrency });

await pool.query(`CREATE TABLE IF NOT EXISTS citadeldb_load_test (id BIGSERIAL PRIMARY KEY, worker INT NOT NULL, note TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);

let ok = 0, fail = 0;
const latencies = [];

async function worker(id) {
  for (let i = 0; i < iterations; i++) {
    const started = Date.now();
    try {
      await pool.query('INSERT INTO citadeldb_load_test(worker, note) VALUES($1, $2)', [id, `iteration-${i}`]);
      await pool.query('SELECT count(*) FROM citadeldb_load_test WHERE worker = $1', [id]);
      latencies.push(Date.now() - started); ok++;
    } catch (error) { fail++; console.error(`worker ${id} failed:`, error.message); }
  }
}
await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i + 1)));
latencies.sort((a,b)=>a-b);
const pick = p => latencies[Math.floor(latencies.length * p)] || 0;
console.log(JSON.stringify({ ok, fail, concurrency, iterations, p50: pick(.5), p95: pick(.95), p99: pick(.99) }, null, 2));
await pool.end();
