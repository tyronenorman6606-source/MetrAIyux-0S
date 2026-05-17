import { createCitadelDb } from '../../adapters/js/src/index.mjs';

const db = createCitadelDb();

const health = await db.health();
console.log('DB health:', health);

await db.query(`
  CREATE TABLE IF NOT EXISTS app_write_smoke (
    id BIGSERIAL PRIMARY KEY,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

await db.query('INSERT INTO app_write_smoke(note) VALUES($1)', ['citadeldb app write smoke']);
const result = await db.query('SELECT count(*)::int AS count FROM app_write_smoke');

console.log('Write smoke count:', result.rows[0].count);

await db.close();
