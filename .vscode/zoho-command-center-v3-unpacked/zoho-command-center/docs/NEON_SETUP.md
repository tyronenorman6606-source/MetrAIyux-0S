# Neon/Postgres Setup

This app uses Neon/Postgres for client onboarding, mailbox orders, billing items, license inventory, and provisioning tasks.

## Step 1: Create Neon project

Create a project in Neon.

## Step 2: Copy the connection string

In Neon, find the connection string for your database.

Use the pooled connection string when possible. It usually looks like:

```text
postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

Put it in `.env.local`:

```bash
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
```

## Step 3: Push the schema

Run:

```bash
npm run db:push
```

This applies:

```text
migrations/001_skyemail_core.sql
```

## Step 4: What gets created

The migration creates tables for:

- clients
- service plans
- email service orders
- client domains
- mailbox requests
- aliases
- provisioning tasks
- billing items
- mailbox inventory
- audit events

It also seeds:

- the three service lanes
- the 131-license pool at $200/month

## Step 5: Reset warning

Do not blindly drop tables in production. The migration is meant to initialize the database, not wipe client records.
