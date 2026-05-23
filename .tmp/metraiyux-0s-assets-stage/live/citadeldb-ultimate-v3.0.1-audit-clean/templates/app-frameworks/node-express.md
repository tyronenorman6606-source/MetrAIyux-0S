# Node / Express CitadelDB Setup

## Environment

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:6432/DATABASE
```

## Install

```bash
npm install pg
```

## Connection snippet

```text
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const result = await pool.query('select now() as connected_at');
console.log(result.rows[0]);

```

## Proof

After configuring the app, run a real write-smoke test from the CitadelDB Dashboard Database Launchpad.
