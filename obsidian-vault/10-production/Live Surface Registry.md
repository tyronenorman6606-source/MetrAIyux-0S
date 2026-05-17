---
title: Live Surface Registry
brain: true
tags:
  - live-surfaces
  - proof-router
  - production
---

# Live Surface Registry

The live surface registry is the map of buyer-facing proof, operator proof, and platform status routes. It should stay aligned with `metraiyux_0s_site/brain/live-surface-registry.json`.

## Sales Rule

Public sales claims should route buyers to proof surfaces that are live, safe to disclose, and appropriate to the audience. Admin-only setup, credentials, private customer data, and unfinished external-account gates should not be exposed in public sales material.

## Core Routes

- MetrAIyux 0S full system Worker.
- Live proof router.
- Public spectacle site.
- Logo rollout mirror.
- SkyeGateFS27 proof Worker.
- SkyeGateFS27 gate-map alias.
- Actual SkyeGate control plane linked from proof.

## Full Live Deployment Ledger

The CEO-facing deployment ledger now lives at `LIVE_DEPLOYMENT_LEDGER.md`, with a vault pointer at `obsidian-vault/10-production/CEO Live Deployment Ledger.md`.

Latest Cloudflare capture on 2026-05-16 found:

- 13 Cloudflare Pages production projects.
- 11 Cloudflare Workers production services.
- 36 live HTTP checks passing.
- New Skyes Over London Reviews production Pages project: `https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded`.

This expanded ledger captures live surfaces that were not fully listed in the older core-route summary, including SkyeMail, SkyeVault, Bob's Smoke Shop preview, SOL Staffing, Neon Rift, Skyes Over London Legal, Skyes Over London Reviews, Skye Design MCP, and the internal MetrAIyux service Workers.

## Review Wall And Intake Routes

- Public review wall: `https://skyes-over-london-reviews.pages.dev/skyes-over-london-reviews-expanded`.
- Client review intake: `https://skyes-over-london-reviews.pages.dev/submit-review.html`.
- 0S review QA queue: `https://skyes-over-london-reviews.pages.dev/operator-review-queue.html`.

Route prospects asking for reviews, testimonials, client proof, social proof, or customer experience to the public review wall. Route clients who want to leave feedback or talk about their experience to the review intake. Route approval, moderation, and production batching to the 0S QA queue.

Review publication rule: submissions are not public proof until they pass 0S QA and five approved unpublished reviews are ready for a production batch.

## Update Ritual

When a route changes, update the source registry JSON, this vault note, the production report, and any proof receipt that cites the old route.
