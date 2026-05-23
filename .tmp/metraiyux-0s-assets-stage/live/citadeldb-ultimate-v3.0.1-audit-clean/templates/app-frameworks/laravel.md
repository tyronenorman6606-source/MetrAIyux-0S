# Laravel CitadelDB Setup

## Environment

```env
DB_CONNECTION=pgsql
DATABASE_URL=postgres://USER:PASSWORD@HOST:6432/DATABASE
```

## Install

```bash
composer require
```

## Connection snippet

```text
# .env
DB_CONNECTION=pgsql
DATABASE_URL=postgres://USER:PASSWORD@HOST:6432/DATABASE

# Then run:
php artisan migrate --force

```

## Proof

After configuring the app, run a real write-smoke test from the CitadelDB Dashboard Database Launchpad.
