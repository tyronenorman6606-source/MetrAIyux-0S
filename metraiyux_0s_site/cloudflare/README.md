# Cloudflare Worker Deployment Kit — Site Operator Brain

This package includes an optional Cloudflare Worker for the 15th brain: the **Site Operator Brain**.

## What it does

The Worker can:

- serve the static website through a Worker asset binding;
- expose `/api/site-operator/status`;
- route inbound messages through `/api/site-operator/route`;
- accept site/business events through `/api/site-operator/event`;
- create task receipts through `/api/site-operator/task`;
- store event/task receipts in KV when `SITE_EVENTS_KV` is configured;
- publish tasks to a Queue when `SITE_TASK_QUEUE` is configured.

## Minimal local test

```bash
npm create cloudflare@latest -- --help
npx wrangler dev
```

Then open:

```text
http://localhost:8787/api/site-operator/status
```

## Deploy

From the root of this website package:

```bash
npx wrangler deploy
```

## Add KV when ready

```bash
npx wrangler kv namespace create SITE_EVENTS_KV
```

Copy the namespace id into `wrangler.toml`, then redeploy.

## Add Queue when ready

```bash
npx wrangler queues create sovereign-13-site-tasks
```

Uncomment the queue producer in `wrangler.toml`, then redeploy.

## Production truth boundary

This brain can route, log, recommend, and create task receipts. It does not replace human approval for filings, contracts, legal review, hiring/firing decisions, payroll, banking, or public claims that need proof.
