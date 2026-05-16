import { runMigrations, pool } from './db.js';
await runMigrations();
await pool.end();
console.log('Control plane migrations complete.');
