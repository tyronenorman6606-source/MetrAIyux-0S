# Framework Database Guide

CitadelDB works like normal Postgres from the app's perspective.

The app usually only needs:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:6432/DATABASE
```

## Node / Express

Use `pg`.

## Next.js / Prisma

Use `DATABASE_URL` in `prisma/schema.prisma`.

## Python / SQLAlchemy

Use `postgresql+psycopg://` or the driver URL your stack expects.

## Django

Use `dj-database-url` or standard `DATABASES` settings.

## Rails

Use `DATABASE_URL` in production.

## Laravel

Use `DB_CONNECTION=pgsql` and `DATABASE_URL`.
