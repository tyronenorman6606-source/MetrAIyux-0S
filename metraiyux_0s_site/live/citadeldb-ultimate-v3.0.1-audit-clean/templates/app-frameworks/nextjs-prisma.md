# Next.js / Prisma CitadelDB Setup

## Environment

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:6432/DATABASE
```

## Install

```bash
npm install prisma @prisma/client && npx prisma init
```

## Connection snippet

```text
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Then run:
npx prisma migrate deploy

```

## Proof

After configuring the app, run a real write-smoke test from the CitadelDB Dashboard Database Launchpad.
