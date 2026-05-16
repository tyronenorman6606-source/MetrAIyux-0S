# MetrAIyux 0S Rebrand Upgrade Manifest

Generated: 2026-05-15T11:31:56+00:00

## What changed

- Locked the official product name to **MetrAIyux 0S**.
- Updated homepage metadata, hero copy, CTA hierarchy, and stats.
- Added `brand/metraiyux-0s.html` as the official brand system page.
- Rewrote the naming lab so prior names are retired candidates, not recommendations.
- Added `docs/METRAIYUX_0S_PLATFORM_IDENTITY.md`.
- Added `docs/METRAIYUX_0S_REBRAND_MANIFEST.md`.
- Added admin tutorial lesson 28: MetrAIyux 0S Brand Lock.
- Updated valuation language and package docs.
- Updated the brain registry platform metadata.
- Added MetrAIyux 0S brand documents into the local brain knowledge base.

## Current architecture

- Product name: **MetrAIyux 0S**
- Owner/admin orchestrator: Main Automation Brain
- Security/QA assistant: 0meg4kAI
- Customer layer: tenant-isolated SaaS workspaces
- Operating model: 13-cabinet company workflow
- Brain count: 16 lightweight brains
- Backend path: Cloudflare Workers, D1, KV, Queues, Resend approval email notifications

## Smoke results

- HTML files: 520
- Local brain chunks: 722
- Registered brains: 16
- Broken internal links: 0

## Remaining production gates

- Deploy Cloudflare Workers.
- Bind D1/KV/Queues.
- Protect `/admin` behind auth or Cloudflare Access.
- Configure Resend secrets.
- Wire payment/auth/provider connectors.
- Run live Worker smoke tests.
- Keep customer workspaces isolated from owner/admin credentials and production social connectors.
