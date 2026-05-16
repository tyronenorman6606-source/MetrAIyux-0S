# Client Command Deck White-Label System

This is the reusable client version of the original operating-system pattern. It is built to be copied for a client, branded to that company, deployed as their public website or command layer, and handed over with admin login, approval gates, customer workspace flow, local brains, proof receipts, and Cloudflare-backed persistence.

The positioning is simple: anyone can sell a website. This folder lets you sell the infrastructure behind the website.

## Start Here

- `client-config.json` controls the default white-label display values.
- `client-intake.example.json` is the per-client intake file.
- `.env.client.example` lists the client deployment variables and secrets you need.
- `docs/WHITE_LABEL_CLIENT_DEPLOYMENT.md` explains the deployment flow.
- `docs/CLIENT_RUNTIME_COST_MODEL.md` estimates the monthly cost to run one client seriously.
- `docs/WHITE_LABEL_CONVERSION_REPORT.md` records what was converted and what still needs client-specific review.

## Prepare A Client Copy

```bash
node scripts/prepare-client-deck.mjs ./client-intake.example.json
```

Then replace the generated placeholder values in the Wrangler config with that client's Cloudflare KV, D1, and Queue IDs.

## What Is Included

- Public website pages
- Admin command deck
- Main Automation Brain chat surface
- Approval inbox and approval email path
- Customer signup, onboarding, and portal pages
- Local brain JSON knowledge base
- Cabinet/persona operating roles
- Proof vault and launch receipts
- Cloudflare Worker kits for admin, SaaS, security review, site operator, Nexus, Sentinel, and Crown layers
- D1 migrations, KV/Queue bindings, and deployment docs

## Production Rule

Never deploy a client using your own production resource IDs, Worker origins, admin token, email sender, or API keys unless you intentionally operate the client under your managed account. This template now uses client-safe placeholders so each company can receive its own isolated deployment.

## Client Handoff

After launch, give the client:

- Public site URL
- Admin URL
- Admin login/token delivery path
- First-run operating instructions
- What the system can and cannot automate
- Their monthly managed platform terms
- Their policy for approval-gated actions
